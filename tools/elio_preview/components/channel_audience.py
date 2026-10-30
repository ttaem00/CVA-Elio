"""Pure channel evidence validation and stable creator ordering for Elio readers."""
from __future__ import annotations

from datetime import datetime
import re
from typing import Any, Mapping, Sequence

from .public_urls import validate_public_media_url


_KINDS = {"youtube": "subscribers", "chzzk": "followers"}
_FIELDS = {"youtube": "youtube_subscribers", "chzzk": "chzzk_followers"}
_STATUSES = {"available", "not_exposed", "unavailable", "identity_mismatch",
             "invalid_identity", "unsupported_identity", "request_failed", "budget_exhausted"}
_TTAEM_CHANNEL = "a7e175625fdea5a7d98428302b7aa57f"


def _valid_count(value) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 2**53 - 1


def _channel_id(provider: str, value: Any) -> str:
    if not isinstance(provider, str) or provider not in _KINDS:
        raise ValueError("Public channel provider is invalid")
    if not isinstance(value, str):
        raise ValueError("Public channel identity must be text")
    text = str(value or "").strip()
    pattern = r"[a-f0-9]{32}" if provider == "chzzk" else r"[A-Za-z0-9_@.-]{1,120}"
    if not re.fullmatch(pattern, text):
        raise ValueError("Public channel identity is invalid")
    return text


def _deduplicated_sources(sources: Sequence[Mapping[str, Any]]) -> list[dict]:
    """A repeated VOD cannot multiply the audience of its channel."""
    chosen: dict[tuple[str, str], dict] = {}
    for raw in sources:
        row = dict(raw)
        key = (row["provider"], row["channel_id"])
        previous = chosen.get(key)
        stamp = datetime.fromisoformat(row["retrieved_at"].replace("Z", "+00:00"))
        previous_stamp = (datetime.fromisoformat(previous["retrieved_at"].replace("Z", "+00:00"))
                          if previous else None)
        if previous is None or stamp > previous_stamp:
            chosen[key] = row
        elif stamp == previous_stamp and row["count"] != previous["count"]:
            chosen[key] = {**previous, "count": None, "status": "unavailable"}
    return list(chosen.values())


def _audience(sources: Sequence[Mapping[str, Any]]) -> dict:
    sources = _deduplicated_sources(sources)
    result = {"sources": sources, "source_kind": "public_channel_audience"}
    for provider, field in _FIELDS.items():
        values = [row["count"] for row in sources if row["provider"] == provider and row["count"] is not None]
        result[field] = sum(values) if values else None
    known = sum(row["count"] is not None for row in sources)
    result["status"] = "available" if sources and known == len(sources) else "partial" if known else "unavailable"
    return result


def validate_channel_audience(value: Mapping[str, Any]) -> dict:
    """Validate optional stream.channel_audience, including source provenance."""
    if not isinstance(value, Mapping) or not isinstance(value.get("sources"), list) or len(value["sources"]) > 16:
        raise ValueError("channel_audience needs a bounded source list")
    for field in _FIELDS.values():
        if value.get(field) is not None and not _valid_count(value[field]):
            raise ValueError("Channel audience counts must be nullable non-negative integers")
    sources = []
    for raw in value["sources"]:
        if not isinstance(raw, Mapping):
            raise ValueError("Channel audience sources must be objects")
        row = dict(raw)
        provider = row.get("provider")
        if row.get("status") == "unsupported_identity":
            # Stored legacy CHZZK IDs use the connections safe-text contract;
            # they do not become eligible for a public API lookup.
            if (not isinstance(provider, str) or provider not in _KINDS
                    or not isinstance(row.get("channel_id"), str)
                    or not re.fullmatch(r"[A-Za-z0-9_@.-]+", row["channel_id"])):
                raise ValueError("Public channel identity is invalid")
        else:
            row["channel_id"] = _channel_id(provider, row.get("channel_id"))
        if row.get("count_kind") != _KINDS[provider] or row.get("status") not in _STATUSES:
            raise ValueError("Channel audience source kind/status is invalid")
        if row.get("count") is not None and not _valid_count(row["count"]):
            raise ValueError("Channel audience source count is invalid")
        if (row.get("status") == "available") != (row.get("count") is not None):
            raise ValueError("Channel audience source status conflicts with its count")
        validate_public_media_url(str(row.get("url") or ""))
        try:
            stamp = datetime.fromisoformat(str(row["retrieved_at"]).replace("Z", "+00:00"))
            if stamp.tzinfo is None:
                raise ValueError
        except (KeyError, ValueError):
            raise ValueError("Channel audience source needs a timezone-aware retrieved_at") from None
        if not isinstance(row.get("source_kind"), str) or not row["source_kind"].strip():
            raise ValueError("Channel audience source needs source_kind")
        if row.get("identity_source_url"):
            validate_public_media_url(row["identity_source_url"])
        sources.append(row)
    normalized = _audience(sources)
    if any(value.get(field) != normalized[field] for field in _FIELDS.values()):
        raise ValueError("Channel audience totals do not match unique channel sources")
    if value.get("status", normalized["status"]) != normalized["status"]:
        raise ValueError("Channel audience status conflicts with known sources")
    return normalized


def creator_rank_map(streams: Sequence[Mapping[str, Any]]) -> dict[str, int]:
    """Rank creators once, then give every VOD/platform in that creator one rank."""
    creators: dict[str, list] = {}
    for index, stream in enumerate(streams):
        name = str(stream.get("streamer_name") or stream.get("stream_id") or index)
        creators.setdefault(name, []).append((index, stream))
    ranked = []
    for name, rows in creators.items():
        sources = []
        pinned = name == "탬탬버린"
        for _index, stream in rows:
            pinned |= stream.get("provider") == "chzzk" and stream.get("channel_id") == _TTAEM_CHANNEL
            if stream.get("channel_audience") is not None:
                sources.extend(validate_channel_audience(stream["channel_audience"])["sources"])
        unique = _deduplicated_sources(sources)
        pinned |= any(r["provider"] == "chzzk" and r["channel_id"] == _TTAEM_CHANNEL for r in unique)
        values = [r["count"] for r in unique if r["count"] is not None]
        total = sum(values) if values else None
        ranked.append(((not pinned, total is None, -(total or 0), rows[0][0]), rows))
    result = {}
    for rank, (_key, rows) in enumerate(sorted(ranked, key=lambda item: item[0])):
        for _index, stream in rows:
            result[str(stream["stream_id"])] = rank
    return result


def ordered_streams(streams: Sequence[Mapping[str, Any]]) -> list[dict]:
    """Stable creator order for chips/footer; preserve each creator's VOD order."""
    ranks = creator_rank_map(streams)
    return sorted(streams, key=lambda stream: ranks[str(stream["stream_id"])])
