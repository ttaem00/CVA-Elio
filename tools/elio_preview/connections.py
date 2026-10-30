"""Validate multi-stream event connections without changing story or media data."""

from __future__ import annotations

import hashlib
import copy
import html
import ipaddress
import math
import re
from collections.abc import Iterable, Mapping
from urllib.parse import parse_qs, urlencode, urlsplit

from .reader_copy import validate_reader_copy


_ID_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
_VIDEO_ID_RE = re.compile(r"[A-Za-z0-9_-]+")
_CHANNEL_ID_RE = re.compile(r"[A-Za-z0-9_@.-]+")
_HASH_RE = re.compile(r"[a-f0-9]{64}")
_CLASSIFICATIONS = {"verified", "absent", "unresolved"}
_MOMENT_KINDS = {"cutscene", "streamer_reaction", "watch_highlight"}
_OFFICIAL_VIDEO_KINDS = {
    "version_trailer",
    "resonator_showcase",
    "music_video",
    "short_animation",
    "special_video",
    "story_trailer",
    "character_pv", "story_cutscene", "theme_song", "radio", "song", "animation",
}
_STREAM_PROVIDERS = {"chzzk", "youtube", "soop"}
_CONNECTION_SCHEMAS = {"elio.connections.v2", "elio.connections.v3"}
_PROVIDER_POLICY_STATUSES = {"active", "hold"}
PROFILE_IMAGE_UNAVAILABLE = "unavailable"


def provider_policies(document: dict) -> dict[str, dict]:
    """Validate provider-level manager holds without discarding audit evidence."""
    raw = document.get("provider_policies", {})
    if not isinstance(raw, dict) or any(key not in _STREAM_PROVIDERS for key in raw):
        raise ValueError("Connection provider_policies must name known providers")
    result: dict[str, dict] = {}
    for provider, policy in raw.items():
        if not isinstance(policy, dict) or set(policy) != {"status", "reason"}:
            raise ValueError("Each provider policy needs exactly status and reason")
        if policy.get("status") not in _PROVIDER_POLICY_STATUSES:
            raise ValueError("Unknown connection provider policy status")
        reason = policy.get("reason")
        if not isinstance(reason, str) or not reason.strip() or len(reason) > 500:
            raise ValueError("Connection provider policy needs a concise reason")
        result[provider] = dict(policy)
    return result


def active_stream_ids(document: dict) -> set[str]:
    """Return streams whose provider has not been put on manager hold."""
    replay_policy(document)
    policies = provider_policies(document)
    return {
        str(stream.get("stream_id"))
        for stream in document.get("streams", [])
        if isinstance(stream, dict)
        and policies.get(str(stream.get("provider")), {}).get("status", "active") == "active"
    }


def replay_policy(document: dict) -> dict[str, str]:
    """Validate an explicit editorial decision about replay coverage.

    Partial coverage retains verified replay links; capture-only publication
    cannot coexist with active replay streams. Neither policy changes the
    original evidence, link validation, or the separate publication approval.
    """
    if "replay_policy" not in document:
        return {"mode": "required"}
    policy = document["replay_policy"]
    if not isinstance(policy, dict) or set(policy) != {"mode", "reason"}:
        raise ValueError("Connection replay_policy needs exactly mode and reason")
    if not isinstance(policy.get("mode"), str) or policy["mode"] not in {"required", "partial", "capture_only"}:
        raise ValueError("Unknown connection replay_policy mode")
    reason = policy.get("reason")
    if not isinstance(reason, str) or not reason.strip() or len(reason) > 500:
        raise ValueError("Connection replay_policy needs a concise reason")
    if policy["mode"] == "capture_only":
        policies = provider_policies(document)
        if any(
            isinstance(stream, dict)
            and policies.get(str(stream.get("provider")), {}).get("status", "active") != "hold"
            for stream in document.get("streams", [])
        ):
            raise ValueError("Capture-only replay_policy cannot include active replay streams")
    return dict(policy)


def expected_event_stream_pairs(
    streams: Iterable[Mapping], event_ids: Iterable[str],
) -> set[tuple[str, str]]:
    """Return editorial replay coverage, not claims that other scenes are absent.

    Omitting ``event_ids`` keeps the legacy whole-story scope. Explicit scope
    only controls event links; independently placed editorial moments are not
    constrained by it.
    """
    known = set(event_ids)
    pairs: set[tuple[str, str]] = set()
    for stream in streams:
        stream_id = str(stream.get("stream_id"))
        scope = stream.get("event_ids") if "event_ids" in stream else known
        if "event_ids" in stream:
            if not isinstance(scope, list) or not scope:
                raise ValueError(f"Stream {stream_id} event_ids must be a non-empty list")
            if any(not isinstance(event_id, str) or event_id not in known for event_id in scope):
                raise ValueError(f"Stream {stream_id} event_ids must name known story event IDs")
            if len(scope) != len(set(scope)):
                raise ValueError(f"Stream {stream_id} event_ids must be unique")
        pairs.update((event_id, stream_id) for event_id in scope)
    return pairs


def numbered_event_streams(
    document: Mapping, streams: Iterable[Mapping],
) -> list[Mapping]:
    """Return streams that participate in the numbered-event replay matrix.

    A stream used only by ``moments`` is intentionally highlight-only unless it
    explicitly declares ``event_ids``. This keeps a mixed document from
    inventing numbered-scene classifications for editorial highlight sources.
    """
    link_stream_ids = {
        str(row.get("stream_id"))
        for row in document.get("links", [])
        if isinstance(row, Mapping)
    }
    moment_stream_ids = {
        str(moment.get("stream_id"))
        for moment in document.get("moments", [])
        if isinstance(moment, Mapping)
    }
    if not link_stream_ids and moment_stream_ids:
        return []
    return [
        stream
        for stream in streams
        if "event_ids" in stream
        or str(stream.get("stream_id")) in link_stream_ids
        or str(stream.get("stream_id")) not in moment_stream_ids
    ]


def _safe_link_url(value: str, *, manager_review: bool = False) -> str:
    parsed = urlsplit(value)
    hostname = (parsed.hostname or "").lower()
    local_hostname = hostname == "localhost" or hostname.endswith(".localhost")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        local_address = False
    else:
        local_address = not address.is_global
    https = parsed.scheme == "https" and hostname and not local_hostname and not local_address
    local_review = (
        manager_review
        and parsed.scheme == "http"
        and (local_hostname or (hostname in {"127.0.0.1", "::1"}))
    )
    if (not https and not local_review) or parsed.username or parsed.password:
        raise ValueError("Connection links must be HTTPS; manager review may use loopback HTTP")
    return html.escape(value, quote=True)


def _safe_image_src(image: dict) -> str:
    kind = image.get("kind")
    value = image.get("url")
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Profile image needs a non-empty URL")
    if kind == "remote":
        return _safe_link_url(value)
    if kind == "site_asset":
        parsed = urlsplit(value)
        if (
            not value.startswith("/")
            or value.startswith("//")
            or parsed.scheme
            or parsed.netloc
            or ".." in parsed.path.split("/")
        ):
            raise ValueError("Site profile images must use a root-relative asset path")
        if not _HASH_RE.fullmatch(str(image.get("content_hash") or "")):
            raise ValueError("Site profile images require a SHA-256 content hash")
        return html.escape(value, quote=True)
    raise ValueError("Profile image kind must be remote or site_asset")


def _seconds(value, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{field} must be a finite number")
    value = int(value)
    if value < 0:
        raise ValueError(f"{field} must be zero or greater")
    return value


def validate_moment_image_crop(crop: dict) -> dict:
    """Keep a selected sprite tile inside its inspected source dimensions."""
    keys = {"x", "y", "width", "height", "full_width", "full_height"}
    if not isinstance(crop, dict) or set(crop) != keys:
        raise ValueError("Moment image crop needs complete source dimensions")
    if any(type(value) not in (int, float) or not math.isfinite(value) for value in crop.values()):
        raise ValueError("Moment image crop must be finite")
    if (not 0 <= crop["x"] < crop["full_width"] <= 8192
            or not 0 <= crop["y"] < crop["full_height"] <= 8192
            or not 0 < crop["width"] <= crop["full_width"] - crop["x"]
            or not 0 < crop["height"] <= crop["full_height"] - crop["y"]):
        raise ValueError("Moment image crop is outside the verified source")
    return dict(crop)


def chzzk_seek_url(video_id: str, start_seconds: int) -> str:
    return "https://chzzk.naver.com/video/" + video_id + "?" + urlencode(
        {"currentTime": start_seconds}
    )


def youtube_seek_url(video_id: str, start_seconds: int) -> str:
    return "https://www.youtube.com/watch?" + urlencode(
        {"v": video_id, "t": f"{start_seconds}s"}
    )


def parse_soop_vod_input(value: str) -> str:
    """Read one public SOOP VOD identity; never pass supplied URLs through."""
    text = str(value or "").strip()
    if re.fullmatch(r"[0-9]+", text):
        return text
    parsed = urlsplit(text)
    match = re.fullmatch(r"/(?:player|PLAYER/STATION)/([0-9]+)/?", parsed.path)
    query = parse_qs(parsed.query, keep_blank_values=True)
    if (
        parsed.scheme not in {"http", "https"}
        or parsed.hostname != "vod.sooplive.com"
        or parsed.username is not None or parsed.password is not None or parsed.port is not None
        or match is None
        or (query and (set(query) != {"change_second"}
                      or len(query["change_second"]) != 1
                      or not re.fullmatch(r"[0-9]+", query["change_second"][0])))
    ):
        raise ValueError("Expected one public SOOP replay URL or numeric video id")
    return match.group(1)


def stream_watch_url(provider: str, video_id: str) -> str:
    if provider == "chzzk":
        return "https://chzzk.naver.com/video/" + video_id
    if provider == "youtube":
        return "https://www.youtube.com/watch?" + urlencode({"v": video_id})
    if provider == "soop":
        if not re.fullmatch(r"[0-9]+", video_id):
            raise ValueError("SOOP video ids must be numeric")
        return "https://vod.sooplive.com/player/" + video_id
    raise ValueError("Unknown replay provider")


def validate_official_videos(document: dict, story: dict) -> list[dict]:
    """Validate spoiler-bounded official videos shown after the story."""
    if document.get("schema_version") not in _CONNECTION_SCHEMAS:
        raise ValueError("Unknown Elio connection schema")
    if document.get("work_id") != story.get("work_id") or document.get("unit_id") != story.get("unit_id"):
        raise ValueError("Connection work/unit identity does not match story")
    rows = document.get("official_videos", [])
    if not isinstance(rows, list) or len(rows) > 8:
        raise ValueError("official_videos must be a list with at most 8 entries")
    event_ids = [event["id"] for event in story.get("events", [])]
    final_event_id = event_ids[-1] if event_ids else None
    seen_video_ids: set[str] = set()
    result = []
    required = {
        "provider", "video_id", "title", "summary", "channel_name",
        "channel_id", "kind", "safe_after_event_id", "evidence_ref",
    }
    for raw in rows:
        if not isinstance(raw, dict) or set(raw) != required:
            raise ValueError("Each official video must use the exact official-video fields")
        video_id = raw.get("video_id")
        if raw.get("provider") != "youtube":
            raise ValueError("Official videos currently support YouTube only")
        if (
            not isinstance(video_id, str)
            or not _VIDEO_ID_RE.fullmatch(video_id)
            or len(video_id) != 11
            or video_id in seen_video_ids
        ):
            raise ValueError("Official videos need unique 11-character YouTube ids")
        seen_video_ids.add(video_id)
        if raw.get("kind") not in _OFFICIAL_VIDEO_KINDS:
            raise ValueError("Unknown official video kind")
        if raw.get("safe_after_event_id") != final_event_id:
            raise ValueError("Official videos must be safe only after the final story event")
        for field, limit in (("title", 140), ("summary", 360), ("channel_name", 80)):
            value = raw.get(field)
            if not isinstance(value, str) or not value.strip() or len(value) > limit:
                raise ValueError(f"Official video {field} must be concise non-empty text")
        channel_id = raw.get("channel_id")
        if not isinstance(channel_id, str) or not _CHANNEL_ID_RE.fullmatch(channel_id):
            raise ValueError("Official videos need a safe channel id")
        evidence_ref = raw.get("evidence_ref")
        if not isinstance(evidence_ref, str) or len(evidence_ref) > 700:
            raise ValueError("Official videos need a concise evidence_ref URL")
        _safe_link_url(evidence_ref)
        row = dict(raw)
        row["watch_url"] = stream_watch_url("youtube", video_id)
        result.append(row)
    return result


def stream_seek_url(provider: str, video_id: str, start_seconds: int) -> str:
    if provider == "chzzk":
        return chzzk_seek_url(video_id, start_seconds)
    if provider == "youtube":
        return youtube_seek_url(video_id, start_seconds)
    if provider == "soop":
        return stream_watch_url(provider, video_id) + "?" + urlencode({"change_second": start_seconds})
    raise ValueError("Unknown replay provider")


def format_clock(seconds: int) -> str:
    hours, remainder = divmod(int(seconds), 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02}:{minutes:02}:{seconds:02}"


def validate_pending_replays(document: dict, story: dict) -> list[dict]:
    """Keep manager-supplied clocks as display evidence until a real VOD arrives."""
    rows = document.get("pending_replays", [])
    if not isinstance(rows, list):
        raise ValueError("pending_replays must be a list")
    if rows and not (
        document.get("schema_version") == "elio.connections.v3"
        and document.get("publication_status") == "manager_review"
    ):
        raise ValueError("Pending replays require v3 manager_review data")
    targets = {
        "event_id": {row["id"] for row in story["events"]},
        "moment_id": {row.get("moment_id") for row in document.get("moments", []) if isinstance(row, dict)},
    }
    seen = set()
    result = []
    for raw in rows:
        if not isinstance(raw, dict) or set(raw) - {
            "event_id", "moment_id", "streamer_name", "clocks", "evidence_ref", "profile_image",
        }:
            raise ValueError("Pending replays cannot carry stream, video or playback fields")
        target_fields = [field for field in targets if field in raw]
        if (
            len(target_fields) != 1
            or not isinstance(raw[target_fields[0]], str)
            or raw[target_fields[0]] not in targets[target_fields[0]]
        ):
            raise ValueError("Pending replay must target exactly one known event or moment")
        name = raw.get("streamer_name")
        if not isinstance(name, str) or not name.strip() or len(name) > 80:
            raise ValueError("Pending replay needs a short streamer_name")
        key = (target_fields[0], raw[target_fields[0]], name)
        if key in seen:
            raise ValueError("Pending replay target and streamer must be unique")
        seen.add(key)
        clocks = raw.get("clocks")
        if not isinstance(clocks, list) or not clocks or any(
            not isinstance(clock, str) or not re.fullmatch(r"[0-9]{2,}:[0-5][0-9]:[0-5][0-9]", clock)
            for clock in clocks
        ) or len(clocks) != len(set(clocks)):
            raise ValueError("Pending replay clocks must be distinct HH:MM:SS strings")
        evidence = raw.get("evidence_ref")
        if not isinstance(evidence, str) or not evidence.strip() or len(evidence) > 700:
            raise ValueError("Pending replay needs concise evidence_ref")
        profile = raw.get("profile_image")
        if profile is not None:
            if not isinstance(profile, dict):
                raise ValueError("Pending replay profile_image must be an object")
            _safe_image_src(profile)
            if not isinstance(profile.get("evidence_ref"), str) or not profile["evidence_ref"].strip():
                raise ValueError("Pending replay profile_image needs evidence_ref")
            if profile.get("source_url"):
                _safe_link_url(profile["source_url"])
        result.append(dict(raw))
    return result


def stable_stream_id(provider: str, video_id: str) -> str:
    """Derive a stable Elio slug without treating a provider id as a slug."""
    provider = str(provider or "").strip().lower()
    video_id = str(video_id or "").strip()
    if provider not in _STREAM_PROVIDERS:
        raise ValueError("Unknown replay provider")
    if not _VIDEO_ID_RE.fullmatch(video_id):
        raise ValueError("Replay video id needs URL-safe characters")
    if provider == "soop" and not re.fullmatch(r"[0-9]+", video_id):
        raise ValueError("SOOP video ids must be numeric")
    legacy = f"{provider}-{video_id.lower()}"
    if _ID_RE.fullmatch(legacy):
        return legacy
    readable = re.sub(r"[^a-z0-9]+", "-", video_id.lower()).strip("-") or "video"
    digest = hashlib.sha256(f"{provider}\0{video_id}".encode("utf-8")).hexdigest()[:12]
    return f"{provider}-{readable}-{digest}"


def bind_pending_replays(document: dict, story: dict, stream: dict, *,
                         pending_rows: list[dict] | None = None) -> dict:
    """Bind selected manager clocks to an inspected replay without publishing.

    Caller-owned metadata supplies the real channel, profile and duration.
    Explicit selection can bind previously unnamed clocks; automatic selection
    requires the supplied streamer's name. Other streams and source images survive.
    """
    result = copy.deepcopy(document)
    result.update(publication_status="manager_review", publish_approved=False)
    selected = copy.deepcopy(pending_rows if pending_rows is not None
                             else result.get("pending_replays", []))
    validate_pending_replays({**result, "pending_replays": selected}, story)
    if not selected:
        raise ValueError("Select pending clock rows before binding a replay")
    if pending_rows is None and any(row["streamer_name"] != stream.get("streamer_name") for row in selected):
        raise ValueError("Different or unnamed streamer clocks need an explicit selection")
    duration = _seconds(stream.get("duration_seconds"), "stream duration_seconds")
    if not duration:
        raise ValueError("A replay needs an inspected positive duration")
    supplied_stream = copy.deepcopy(stream)
    sid = supplied_stream.get("stream_id")
    if any(row.get("stream_id") == sid for row in result.get("streams", [])):
        raise ValueError("Edit an existing replay through its current bindings")
    scoped_ids = [row["event_id"] for row in selected if "event_id" in row]
    if scoped_ids:
        supplied_stream["event_ids"] = list(dict.fromkeys(scoped_ids))
    result.setdefault("streams", []).append(supplied_stream)
    if provider_policies(result).get(str(stream.get("provider")), {}).get("status", "active") == "active":
        result.pop("replay_policy", None)
    _validate_streams(result, manager_review=True)
    current_moments = {row["moment_id"]: row for row in result.get("moments", [])}
    links = result.setdefault("links", [])
    removed_moments, additions = set(), []
    occupied_ids = set(current_moments)
    for pending in selected:
        base = current_moments.get(pending.get("moment_id"))
        if base is not None and "stream_id" in base:
            raise ValueError("Pending moments must name their streamless editorial draft")
        for index, clock in enumerate(pending["clocks"]):
            hours, minutes, seconds = map(int, clock.split(":"))
            start = hours * 3600 + minutes * 60 + seconds
            if start >= duration:
                raise ValueError("Pending clock lies outside the replay duration")
            common = dict(stream_id=sid, verification="verified", start_seconds=start,
                          label=clock, evidence_ref=pending["evidence_ref"])
            if "event_id" in pending:
                links.append(dict(common, event_id=pending["event_id"], primary=index == 0))
                continue
            ident = pending["moment_id"]
            removed_moments.add(ident)
            moment = {**copy.deepcopy(base), **common}
            moment["moment_group_id"] = base.get("moment_group_id") or ident
            if index:
                candidate = f"{ident}-{sid}-{start}"
                if candidate in occupied_ids:
                    raise ValueError("A binding would overwrite an existing moment")
                moment["moment_id"] = candidate
                occupied_ids.add(candidate)
            if len(pending["clocks"]) > 1:
                moment["label"] = ("처음 보기 · " if index == 0 else "다시 보기 · ") + clock
            additions.append(moment)
    result["moments"] = [row for row in result.get("moments", [])
                         if row["moment_id"] not in removed_moments] + additions
    result["pending_replays"] = [row for row in result.get("pending_replays", []) if row not in selected]
    validate_connections(result, story)
    validate_moments(result, story)
    return result


def _validate_streams(document: dict, *, manager_review: bool) -> dict[str, dict]:
    provider_policies(document)
    streams = document.get("streams")
    streamless_v3 = (manager_review or replay_policy(document)["mode"] == "capture_only") and document.get("schema_version") == "elio.connections.v3"
    if not isinstance(streams, list) or (not streams and not streamless_v3):
        raise ValueError("Connection streams must be a non-empty list")
    result: dict[str, dict] = {}
    stream_sources: set[tuple[str, str]] = set()
    for order, raw in enumerate(streams):
        if not isinstance(raw, dict):
            raise ValueError("Each stream must be an object")
        stream_id = raw.get("stream_id")
        if not isinstance(stream_id, str) or not _ID_RE.fullmatch(stream_id) or stream_id in result:
            raise ValueError("Stream ids must be unique stable ids")
        provider = raw.get("provider")
        video_id = raw.get("video_id")
        if provider not in _STREAM_PROVIDERS:
            raise ValueError("Replay provider must be chzzk, youtube or soop")
        if document.get("schema_version") == "elio.connections.v2" and provider != "chzzk":
            raise ValueError("Elio connection v2 supports CHZZK streams only")
        if not isinstance(video_id, str) or not _VIDEO_ID_RE.fullmatch(video_id):
            raise ValueError("Each stream needs a safe provider video id")
        if provider == "youtube" and len(video_id) != 11:
            raise ValueError("YouTube video ids must be 11 characters")
        if provider == "soop" and not re.fullmatch(r"[0-9]+", video_id):
            raise ValueError("SOOP video ids must be numeric")
        stream_source = (provider, video_id)
        if stream_source in stream_sources:
            raise ValueError("A provider video may appear only once in streams")
        stream_sources.add(stream_source)
        channel_id = raw.get("channel_id")
        if not isinstance(channel_id, str) or not _CHANNEL_ID_RE.fullmatch(channel_id):
            raise ValueError("Each stream needs a safe channel id")
        name = raw.get("streamer_name")
        if not isinstance(name, str) or not name.strip() or len(name) > 80:
            raise ValueError("Each stream needs a short streamer display name")
        summary_url = raw.get("summary_url")
        if summary_url:
            _safe_link_url(summary_url, manager_review=manager_review)
        profile = raw.get("profile_image")
        profile_status = raw.get("profile_image_status")
        if profile_status is not None and profile_status != PROFILE_IMAGE_UNAVAILABLE:
            raise ValueError("Unknown profile_image_status")
        if profile is not None and profile_status is not None:
            raise ValueError("A stream cannot have both profile_image and profile_image_status")
        if profile is not None:
            if not isinstance(profile, dict):
                raise ValueError("profile_image must be an object")
            _safe_image_src(profile)
            if not isinstance(profile.get("evidence_ref"), str) or not profile["evidence_ref"].strip():
                raise ValueError("Profile images need evidence_ref")
            if len(profile["evidence_ref"]) > 500:
                raise ValueError("Profile image evidence_ref is too long")
            source_url = profile.get("source_url")
            if source_url:
                _safe_link_url(source_url)
        if (
            provider == "chzzk"
            and document.get("publication_status") == "publishable"
            and profile is None
            and profile_status != PROFILE_IMAGE_UNAVAILABLE
        ):
            raise ValueError(
                "Publishable CHZZK streams need profile_image or explicit unavailable status"
            )
        stream = dict(raw)
        if raw.get("channel_audience") is not None:
            from .components.channel_audience import validate_channel_audience
            validate_channel_audience(raw["channel_audience"])
        stream["order"] = order
        stream["watch_url"] = stream_watch_url(provider, video_id)
        result[stream_id] = stream
    from .components.channel_audience import creator_rank_map
    ranks = creator_rank_map(result.values())
    for stream_id, stream in result.items():
        stream["order"] = ranks[stream_id]
    return result


def _validate_moments(
    document: dict,
    *,
    streams: dict[str, dict],
    event_ids: list[str],
    manager_review: bool,
) -> dict[str, list[dict]]:
    """Validate optional editorial moments placed between core story events."""
    moments = document.get("moments", [])
    if not isinstance(moments, list):
        raise ValueError("Connection moments must be a list")
    known_events = set(event_ids)
    result: dict[str, list[dict]] = {event_id: [] for event_id in event_ids}
    seen_ids: set[str] = set()
    group_common: dict[str, tuple] = {}
    group_streams: dict[tuple[str, str | None], set[int | None]] = {}
    for raw in moments:
        if not isinstance(raw, dict):
            raise ValueError("Each moment must be an object")
        moment_id = raw.get("moment_id")
        if (
            not isinstance(moment_id, str)
            or not _ID_RE.fullmatch(moment_id)
            or moment_id in seen_ids
        ):
            raise ValueError("Moment ids must be unique stable ids")
        seen_ids.add(moment_id)
        group_id = raw.get("moment_group_id") or moment_id
        if not isinstance(group_id, str) or not _ID_RE.fullmatch(group_id):
            raise ValueError("Moment group ids must be safe stable ids")
        after_event_id = raw.get("after_event_id")
        if after_event_id not in known_events:
            raise ValueError("Moment points to an unknown story event")
        stream_id = raw.get("stream_id")
        editorial_draft = "stream_id" not in raw
        if editorial_draft:
            capture_only = replay_policy(document)["mode"] == "capture_only"
            editorial_timeline = raw.get("kind") in {"watch_highlight", "cutscene"} and raw.get("placement", "timeline") == "timeline"
            editorial_review = capture_only and raw.get("kind") == "streamer_reaction" and raw.get("placement") == "streamer_review"
            if not (
                (manager_review or capture_only)
                and document.get("schema_version") == "elio.connections.v3"
                and raw.get("verification") == "unresolved"
                and (editorial_timeline or editorial_review)
            ):
                raise ValueError("Streamless editorial moments require unresolved v3 timeline review or explicit capture-only editorial data")
            if any(field in raw for field in ("stream", "watch_url")):
                raise ValueError("Streamless editorial moments cannot carry derived replay fields")
        elif stream_id not in streams:
            raise ValueError("Moment points to an unknown stream id")
        group_stream = (group_id, stream_id)
        group_start = _seconds(raw.get("start_seconds"), "moment start_seconds") if raw.get("verification") == "verified" else None
        group_times = group_streams.setdefault(group_stream, set())
        if group_times and (group_start is None or None in group_times or group_start in group_times):
            raise ValueError("A moment group may link each stream only once per playback time")
        group_times.add(group_start)
        if raw.get("kind") not in _MOMENT_KINDS:
            raise ValueError("Unknown moment kind")
        placement = raw.get("placement", "timeline")
        if placement not in {"timeline", "streamer_review", "watch_gallery"}:
            raise ValueError("Unknown moment placement")
        reviewer = raw.get("reviewer_name")
        if placement == "streamer_review":
            if raw.get("kind") != "streamer_reaction" or after_event_id != event_ids[-1]:
                raise ValueError("Streamer reviews must follow the final story event")
            if not isinstance(reviewer, str) or not reviewer.strip() or len(reviewer) > 80:
                raise ValueError("Streamer reviews need a short reviewer_name")
        elif reviewer is not None:
            raise ValueError("reviewer_name is only valid for streamer reviews")
        if placement == "watch_gallery" and (
            document.get("schema_version") != "elio.connections.v3"
            or raw.get("kind") != "streamer_reaction"
            or after_event_id != event_ids[-1]
            or editorial_draft
            or raw.get("verification") != "verified"
        ):
            raise ValueError("Watch gallery videos require a verified stream after the final story event")
        for field, limit in (("title", 120), ("summary", 500), ("evidence_ref", 700)):
            value = raw.get(field)
            if not isinstance(value, str) or not value.strip() or len(value) > limit:
                raise ValueError(f"Moment {field} must be non-empty and at most {limit} characters")
        transition_text = raw.get("transition_text")
        if transition_text is not None and (
            not isinstance(transition_text, str)
            or not transition_text.strip()
            or len(transition_text) > 160
        ):
            raise ValueError(
                "Moment transition_text must be non-empty and at most 160 characters"
            )
        common = (
            placement,
            reviewer,
            after_event_id,
            raw.get("kind"),
            raw.get("title"),
            raw.get("summary"),
            transition_text,
            editorial_draft,
        )
        if group_id in group_common and group_common[group_id] != common:
            raise ValueError("Every stream binding in a moment group must share its story content")
        group_common[group_id] = common
        status = raw.get("verification")
        if status not in {"verified", "unresolved"}:
            raise ValueError("Moment verification must be verified or unresolved")
        moment = dict(raw)
        if not editorial_draft:
            moment["stream"] = streams[stream_id]
        if status == "verified":
            start = _seconds(raw.get("start_seconds"), "moment start_seconds")
            end = raw.get("end_seconds")
            if end is not None and _seconds(end, "moment end_seconds") <= start:
                raise ValueError("Moment end_seconds must be later than start_seconds")
            label = raw.get("label")
            if label is not None and (
                not isinstance(label, str) or not label.strip() or len(label) > 40
            ):
                raise ValueError("Moment label must be a short non-empty string")
            moment["start_seconds"] = start
            stream = streams[stream_id]
            moment["watch_url"] = stream_seek_url(
                stream["provider"], stream["video_id"], start
            )
        elif any(field in raw for field in ("start_seconds", "end_seconds", "label")):
            raise ValueError("Unresolved moments cannot carry playable fields")
        thumbnail = raw.get("thumbnail")
        if thumbnail is not None:
            if not isinstance(thumbnail, dict):
                raise ValueError("Moment thumbnail must be an object")
            _safe_image_src(thumbnail)
            if "crop" in thumbnail:
                validate_moment_image_crop(thumbnail["crop"])
            if "origin" in thumbnail:
                origin = thumbnail["origin"]
                if (not isinstance(origin, dict) or origin.get("provider") != "youtube"
                        or not re.fullmatch(r"[A-Za-z0-9_-]{11}", str(origin.get("video_id") or ""))):
                    raise ValueError("Moment image origin needs an exact source video identity")
                clock = origin.get("source_seconds")
                if type(clock) not in (int, float) or not math.isfinite(clock) or clock < 0:
                    raise ValueError("Moment image origin needs its independent source clock")
            alt = thumbnail.get("alt")
            if not isinstance(alt, str) or not alt.strip() or len(alt) > 160:
                raise ValueError("Moment thumbnail needs short alt text")
            evidence_ref = thumbnail.get("evidence_ref")
            if not isinstance(evidence_ref, str) or not evidence_ref.strip():
                raise ValueError("Moment thumbnail needs evidence_ref")
            source_url = thumbnail.get("source_url")
            if source_url:
                _safe_link_url(source_url, manager_review=manager_review)
        result[after_event_id].append(moment)
    return result


def validate_moments(document: dict, story: dict) -> dict[str, list[dict]]:
    """Return optional cutscene/reaction moments indexed by their preceding event."""
    validate_reader_copy(document, path="connections")
    if document.get("schema_version") not in _CONNECTION_SCHEMAS:
        raise ValueError("Unknown Elio connection schema")
    if document.get("work_id") != story.get("work_id") or document.get("unit_id") != story.get("unit_id"):
        raise ValueError("Connection work/unit identity does not match story")
    review = document.get("publication_status") == "manager_review"
    if document.get("publication_status") not in {"manager_review", "publishable"}:
        raise ValueError("Connection publication_status must be manager_review or publishable")
    streams = _validate_streams(document, manager_review=review)
    event_ids = [event["id"] for event in story["events"]]
    expected_event_stream_pairs(streams.values(), event_ids)
    result = _validate_moments(
        document,
        streams=streams,
        event_ids=event_ids,
        manager_review=review,
    )
    active = active_stream_ids(document)
    return {
        event_id: [row for row in rows if "stream_id" not in row or row.get("stream_id") in active]
        for event_id, rows in result.items()
    }


def validate_connections(document: dict, story: dict) -> dict[str, list[dict]]:
    """Return every event/stream classification indexed by stable event id.

    ``streams`` stores VOD and streamer presentation once. ``links`` normally
    forms a complete matrix within each stream's optional ``event_ids`` scope,
    defaulting to all story events. Scope is editorial coverage, not an absence
    classification for other events. A v3 cutscene-only document may instead
    use ``moments`` with an empty link matrix; this keeps editorial cutscene cards
    from emitting a redundant "해당 장면 없음" status on every story event.
    Only verified rows receive derived playback URLs.
    """
    validate_reader_copy(document, path="connections")
    if document.get("schema_version") not in _CONNECTION_SCHEMAS:
        raise ValueError("Unknown Elio connection schema")
    if document.get("work_id") != story.get("work_id") or document.get("unit_id") != story.get("unit_id"):
        raise ValueError("Connection work/unit identity does not match story")
    review = document.get("publication_status") == "manager_review"
    if document.get("publication_status") not in {"manager_review", "publishable"}:
        raise ValueError("Connection publication_status must be manager_review or publishable")
    streams = _validate_streams(document, manager_review=review)
    validate_official_videos(document, story)

    event_ids = [event["id"] for event in story["events"]]
    _validate_moments(
        document,
        streams=streams,
        event_ids=event_ids,
        manager_review=review,
    )
    pending = validate_pending_replays(document, story)
    known = set(event_ids)
    rows = document.get("links")
    if not isinstance(rows, list):
        raise ValueError("Connection links must be a non-empty list")

    classified: dict[str, list[dict]] = {event_id: [] for event_id in event_ids}
    if not rows:
        if document.get("schema_version") == "elio.connections.v3" and (
            document.get("moments") or pending or (review and not streams)
        ):
            return classified
        raise ValueError("Connection links must be a non-empty list")

    expected_pairs = expected_event_stream_pairs(
        numbered_event_streams(document, streams.values()), event_ids,
    )
    seen: dict[tuple[str, str], set[str]] = {
        key: set() for key in sorted(expected_pairs)
    }
    seen_starts: dict[tuple[str, str], set[int]] = {
        key: set() for key in expected_pairs
    }
    unverified_rows: set[tuple[str, str]] = set()
    primary: set[tuple[str, str]] = set()
    for raw in rows:
        if not isinstance(raw, dict):
            raise ValueError("Each connection row must be an object")
        event_id = raw.get("event_id")
        stream_id = raw.get("stream_id")
        if event_id not in known or not _ID_RE.fullmatch(str(event_id)):
            raise ValueError("Connection points to an unknown event id")
        if stream_id not in streams:
            raise ValueError("Connection points to an unknown stream id")
        status = raw.get("verification")
        if status not in _CLASSIFICATIONS:
            raise ValueError("Unknown connection verification classification")
        key = (event_id, stream_id)
        if key not in expected_pairs:
            raise ValueError(f"Connection is outside declared event_ids scope: {event_id} x {stream_id}")
        seen[key].add(status)
        if not isinstance(raw.get("evidence_ref"), str) or not raw["evidence_ref"].strip():
            raise ValueError("Every connection classification needs evidence_ref")
        if len(raw["evidence_ref"]) > 500:
            raise ValueError("Connection evidence_ref is too long")
        link = dict(raw)
        link["stream"] = streams[stream_id]
        if status != "verified":
            if key in unverified_rows:
                raise ValueError(
                    f"Only one unverified classification is allowed for {event_id} x {stream_id}"
                )
            unverified_rows.add(key)
            forbidden = {"start_seconds", "end_seconds", "label", "primary"}
            if any(field in raw for field in forbidden):
                raise ValueError("Unverified classifications cannot carry playable fields")
            classified[event_id].append(link)
            continue

        start = _seconds(raw.get("start_seconds"), "start_seconds")
        if start in seen_starts[key]:
            raise ValueError(
                f"Duplicate playback time is not allowed for {event_id} x {stream_id}"
            )
        seen_starts[key].add(start)
        if raw.get("label") is not None and (
            not isinstance(raw["label"], str) or not raw["label"].strip() or len(raw["label"]) > 40
        ):
            raise ValueError("Connection label must be a short non-empty string")
        end = raw.get("end_seconds")
        if end is not None and _seconds(end, "end_seconds") <= start:
            raise ValueError("end_seconds must be later than start_seconds")
        link["start_seconds"] = start
        stream = streams[stream_id]
        link["watch_url"] = stream_seek_url(
            stream["provider"], stream["video_id"], start
        )
        if raw.get("primary", False):
            if key in primary:
                raise ValueError("Only one primary link is allowed per event and stream")
            primary.add(key)
        classified[event_id].append(link)

    for key, statuses in seen.items():
        if not statuses:
            raise ValueError(f"Missing connection classification for {key[0]} x {key[1]}")
        if "verified" in statuses and len(statuses) != 1:
            raise ValueError(f"Verified and unverified classifications cannot be mixed for {key[0]} x {key[1]}")
        if statuses == {"absent", "unresolved"}:
            raise ValueError(f"Connection cannot be both absent and unresolved for {key[0]} x {key[1]}")
    active = active_stream_ids(document)
    return {
        event_id: [row for row in event_rows if row.get("stream_id") in active]
        for event_id, event_rows in classified.items()
    }


def safe_rendered_connection_url(value: str, document: dict) -> str:
    return _safe_link_url(
        value,
        manager_review=document.get("publication_status") == "manager_review",
    )


def safe_rendered_profile_image(profile: dict) -> str:
    return _safe_image_src(profile)
