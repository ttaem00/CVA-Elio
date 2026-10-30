"""Attach the approved Memory Tape shell after reader languages are installed.

Only the candidate is written. Original reader bytes are kept between reversible
markers so translation preparation sees its original DOM paths on the next run.
"""
from __future__ import annotations

import base64
from copy import deepcopy
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import posixpath
import re

from bs4 import BeautifulSoup


EXPERIMENT = Path(__file__).parents[1] / "experiments" / "memory_tape"
UNIT = "wutheringwaves/ch3-act5"
_PREFIX = "ELIO_MEMORY_PUBLIC_"
_HEAD_START = f"<!--{_PREFIX}HEAD_BEGIN-->"
_HEAD_END = f"<!--{_PREFIX}HEAD_END-->"
_BODY_START = f'<!--{_PREFIX}READER_BEGIN--><div id="elio-memory-reader">'
_BODY_END = f'</div><!--{_PREFIX}READER_END-->'
_SHELL_START = f"<!--{_PREFIX}SHELL_BEGIN-->"
_SHELL_END = f"<!--{_PREFIX}SHELL_END-->"
_REFERRER = re.compile(r"<!--ELIO_MEMORY_PUBLIC_REFERRER:([A-Za-z0-9+/=]+)-->")
_IDENTITY = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*/[a-z0-9]+(?:-[a-z0-9]+)*\Z")
_RUNTIME_FILES = (
    "cassette-transition.js", "entry-presentation.js", "overlay.css", "overlay.html",
    "overlay.js", "replay-url.js", "startup.css", "startup.js", "locale-ui.js",
    "scene/assets.js", "scene/boot.js", "scene/cassette-outline.js",
    "scene/cassette-registration.js", "scene/image-sequence.js", "scene/image-viewer.js",
    "scene/memory-idle-orbit.js", "scene/motion-track.js", "scene/navigation.js",
    "scene/render-policy.js", "scene/scene.css", "scene/scene.html", "scene/viewer.js",
    "scene/SOURCE-ATTRIBUTION.txt", "scene/THIRD_PARTY_NOTICES.txt",
    "scene/image-sequence.json", "scene/image-sequence-1080.json",
)


def _digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _version_asset_references(assets: dict[str, bytes]) -> dict[str, bytes]:
    """Bind only registered local dependencies to their final exported bytes.

    Parent hashes include rewritten child URLs, so a leaf-module change also
    invalidates a cached parent and the HTML bootstrap that imports it.
    """
    reference = re.compile(r"(?P<quote>['\"])(?P<path>(?:\.{1,2}/)?[A-Za-z0-9_./-]+\.(?:js|css|json|html))(?P=quote)")
    versioned, visiting = {}, set()

    def visit(name):
        if name in versioned:
            return versioned[name]
        if name in visiting:
            raise ValueError("Cyclic Memory runtime asset reference")
        visiting.add(name)
        raw = assets[name]
        if Path(name).suffix in {".js", ".css", ".html", ".json"}:
            def replace(match):
                target = posixpath.normpath(posixpath.join(posixpath.dirname(name), match["path"]))
                if target not in assets:
                    return match[0]
                return f'{match["quote"]}{match["path"]}?v={_digest(visit(target))[:12]}{match["quote"]}'
            raw = reference.sub(replace, raw.decode("utf-8")).encode("utf-8")
        visiting.remove(name)
        versioned[name] = raw
        return raw

    for name in assets:
        visit(name)
    return versioned


class _DocumentSpans(HTMLParser):
    """Locate real document tags without matching strings inside scripts."""
    def __init__(self, page: str):
        super().__init__(convert_charrefs=False)
        self.page = page
        self.lines = [0]
        self.lines.extend(match.end() for match in re.finditer("\n", page))
        self.head = False
        self.insert_at = self.body_at = self.body_end = None
        self.referrers = []
        self.feed(page)

    def position(self):
        line, column = self.getpos()
        return self.lines[line - 1] + column

    def handle_starttag(self, tag, attrs):
        start = self.position()
        end = start + len(self.get_starttag_text())
        attributes = dict(attrs)
        if tag == "head":
            self.head = True
            self.insert_at = end
        elif tag == "body":
            self.body_at = end
        elif self.head and tag == "meta":
            if "charset" in attributes:
                self.insert_at = end
            if attributes.get("name", "").lower() == "referrer":
                self.referrers.append((start, end))

    handle_startendtag = handle_starttag

    def handle_endtag(self, tag):
        if tag == "head":
            self.head = False
        elif tag == "body":
            self.body_end = self.position()


def unwrap_memory_presentation(page: str) -> str:
    """Return the exact pre-composition reader; ordinary readers are unchanged."""
    if _HEAD_START not in page:
        if _PREFIX in page:
            raise ValueError("Incomplete public Memory Tape markers")
        return page
    result = page
    for start, end in ((_HEAD_START, _HEAD_END), (_SHELL_START, _SHELL_END)):
        if result.count(start) != 1 or result.count(end) != 1:
            raise ValueError("Invalid public Memory Tape markers")
        first, last = result.index(start), result.index(end)
        if first >= last:
            raise ValueError("Invalid public Memory Tape marker order")
        result = result[:first] + result[last + len(end):]
    if result.count(_BODY_START) != 1 or result.count(_BODY_END) != 1:
        raise ValueError("Invalid public Memory Tape reader markers")
    result = result.replace(_BODY_START, "", 1).replace(_BODY_END, "", 1)
    result = _REFERRER.sub(lambda match: base64.b64decode(match[1], validate=True).decode("utf-8"), result)
    if _PREFIX in result:
        raise ValueError("Unrecognized public Memory Tape marker")
    return result


def _wrap_memory_reader(page: str, head: str, shell: str) -> str:
    spans = _DocumentSpans(page)
    if None in (spans.insert_at, spans.body_at, spans.body_end):
        raise ValueError("Expected explicit reader head and body tags")
    changes = [(spans.insert_at, spans.insert_at, _HEAD_START + head + _HEAD_END),
               (spans.body_at, spans.body_at, _BODY_START),
               (spans.body_end, spans.body_end, _BODY_END + _SHELL_START + shell + _SHELL_END)]
    for first, last in spans.referrers:
        encoded = base64.b64encode(page[first:last].encode()).decode("ascii")
        changes.append((first, last, f"<!--{_PREFIX}REFERRER:{encoded}-->"))
    result = page
    for first, last, replacement in sorted(changes, reverse=True):
        result = result[:first] + replacement + result[last:]
    if unwrap_memory_presentation(result) != page:
        raise ValueError("Memory overlay altered the original reader")
    return result


def restore_memory_presentation(page: str, original: str) -> str:
    """Retain the frozen shell while replacing only the transformed reader."""
    if _PREFIX not in original:
        return page
    unwrap_memory_presentation(original)
    head = original[original.index(_HEAD_START) + len(_HEAD_START):original.index(_HEAD_END)]
    shell = original[original.index(_SHELL_START) + len(_SHELL_START):original.index(_SHELL_END)]
    return _wrap_memory_reader(unwrap_memory_presentation(page), head, shell)


def compose_memory_reader(page: str, *, asset_base: str, moment_quotes: dict | None = None,
                          poster_url: str | None = None, canonical_url: str,
                          experiment: Path = EXPERIMENT, experience: dict | None = None) -> str:
    """Compose an indexable public shell without reserializing reader content."""
    from ..examples.compatibility_preview import semantic_signature

    soup = BeautifulSoup(page, "html.parser")
    if not soup.head or not soup.body or not soup.select_one("#story article.item"):
        raise ValueError("Expected the existing rendered Elio reader")
    if soup.select_one("#elio-memory-reader") or _PREFIX in page:
        raise ValueError("Memory variant cannot be used as its own baseline")
    if not re.fullmatch(r"/storytimeline/[a-z0-9]+(?:-[a-z0-9]+)*/[a-z0-9]+(?:-[a-z0-9]+)*/assets/memory-tape/", asset_base):
        raise ValueError("Public Memory assets must be unit owned")
    overlay = BeautifulSoup((experiment / "overlay.html").read_text(encoding="utf-8").replace(
        "__MEMORY_ASSET_BASE__", asset_base), "html.parser")
    from .reader_experience import validate_experience, loading_markup
    profile = validate_experience(experience if experience is not None else {"loading": "cassette_reels", "entry": "memory_tape", "link": "memory_tape"})
    overlay.select_one("#elio-memory")["data-loading-motif"] = profile["loading"]
    loader = overlay.select_one(".elio-memory__loader")
    loader.clear()
    loader.append(BeautifulSoup(loading_markup(profile["loading"]), "html.parser"))
    exported, _ = _public_assets(experiment=experiment)
    css, js = exported["overlay.css"], exported["overlay.js"]
    head = BeautifulSoup("", "html.parser")
    for name, identifier in (("startup.css", "elio-memory-startup-style"),
                             ("startup.js", "elio-memory-startup")):
        if profile["entry"] == "reader":
            continue
        tag = head.new_tag("style" if name.endswith("css") else "script", id=identifier)
        tag.string = (experiment / name).read_text(encoding="utf-8")
        head.append(tag)
    head.append(head.new_tag("meta", attrs={"name": "referrer", "content": "origin"}))
    head.append(head.new_tag("link", rel="stylesheet", href=f"{asset_base}overlay.css?v={_digest(css)[:12]}"))
    if poster_url:
        poster = overlay.new_tag("img", id="elio-memory-poster", src=poster_url,
            attrs={"class": "elio-memory__poster", "alt": "", "aria-hidden": "true",
                   "fetchpriority": "high", "decoding": "async"})
        overlay.select_one("#elio-memory-scene").insert_after(poster)
        head.append(head.new_tag("link", rel="preload", href=poster_url,
            attrs={"as": "image", "fetchpriority": "high"}))
    config = overlay.new_tag("script")
    config.string = "window.ELIO_MEMORY_CONFIG=" + json.dumps({
        "sceneUrl": asset_base + "scene/scene.html?v=" + _digest(exported["scene/scene.html"])[:12], "canonicalUrl": canonical_url,
        "unitTitle": "어젯밤의 뭇별들", "momentQuotes": moment_quotes or {},
        "pageIdentity": canonical_url.removeprefix("/storytimeline/").strip("/"),
        "experience": profile,
    }, ensure_ascii=False).replace("<", "\\u003c") + ";"
    overlay.append(config)
    overlay.append(overlay.new_tag("script", type="module",
        src=f"{asset_base}overlay.js?v={_digest(js)[:12]}", attrs={"data-memory-controller": "true"}))
    result = _wrap_memory_reader(page, str(head), str(overlay))
    if unwrap_memory_presentation(result) != page or semantic_signature(result) != semantic_signature(page):
        raise ValueError("Memory overlay altered the original reader")
    return result


def _public_assets(*, experiment: Path | None = None) -> tuple[dict[str, bytes], dict]:
    """Export runtime dependencies and active image/GPU assets, never study data."""
    root = EXPERIMENT if experiment is None else experiment
    assets = {name: (root / name).read_bytes() for name in _RUNTIME_FILES}
    assets["link-effects.js"] = Path(__file__).with_name("link_effects.js").read_bytes()
    manifest = json.loads((root / "scene/assets.json").read_bytes())
    if manifest.get("schema") != "elio-memory-assets.v1" or manifest.get("deliveryBase") != "https://ttaem.com/media/elio":
        raise ValueError("Unexpected Memory asset delivery manifest")
    active = {"gaussian", "cassette"}
    for name in ("scene/image-sequence.json", "scene/image-sequence-1080.json"):
        sequence = json.loads(assets[name])
        active.update(frame["asset"] for frames in sequence["frames"].values() for frame in frames)
        sequence.pop("provenance", None)
        assets[name] = (json.dumps(sequence, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    selected = {key: manifest["files"][key] for key in sorted(active)}
    for asset in selected.values():
        if (not re.fullmatch(r"[0-9a-f]{64}", asset["sha256"])
                or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*\.(spz|glb|avif)", asset["filename"])
                or type(asset["bytes"]) is not int or asset["bytes"] <= 0):
            raise ValueError("Invalid active Memory asset")
    public = {"schema": manifest["schema"], "deliveryBase": manifest["deliveryBase"], "files": selected}
    assets["scene/assets.json"] = (json.dumps(public, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    boot = assets["scene/boot.js"].decode()
    needle = "const selection=new URLSearchParams(location.search).get('render');"
    branch = "selection==='film'?'./film-viewer.js':"
    if needle not in boot or branch not in boot:
        raise ValueError("Review public Memory renderer selection before export")
    boot = boot.replace(needle, "const requested=new URLSearchParams(location.search).get('render');\n  const selection=requested==='film'?null:requested;", 1)
    assets["scene/boot.js"] = boot.replace(branch, "", 1).encode()
    return _version_asset_references(assets), public


def compose_unit_memory(page: str, story: dict, source: dict, connections: dict, *,
                        public: bool = True, runtime_root=None) -> tuple[str, dict[str, bytes]]:
    """Plan the same public shell for normal builders without writing a stage.

    Asset keys are relative to the unit's ``assets/memory-tape/`` directory.
    Non-Act5 readers and readers without the explicit opt-in remain untouched.
    """
    from ..examples.memory_tape_preview import compose_reader, verified_moment_quotes
    from .reader_experience import resolve_experience

    if (story.get("work_id"), story.get("unit_id")) != tuple(UNIT.split("/")):
        return page, {}
    presentation = story.get("reader_presentation")
    if presentation is None:
        return page, {}
    if not isinstance(presentation, dict):
        raise ValueError("Reader presentation must be an object")
    if "entry_scene" not in presentation:
        return page, {}
    if presentation["entry_scene"] != "memory_tape":
        raise ValueError("Unknown or unapproved Memory entry scene")
    assets, active_manifest = _public_assets()
    base = f"/storytimeline/{UNIT}/assets/memory-tape/"
    poster = active_manifest["files"]["approach_0000"]
    poster_url = f'{active_manifest["deliveryBase"]}/memory-tape/{poster["sha256"]}/{poster["filename"]}'
    if not public:
        if runtime_root is None:
            raise ValueError("Local Memory preview requires its managed runtime root")
        from ..asset_library import delivery_snapshot, local_asset_path
        runtime = Path(runtime_root).resolve()
        managed = delivery_snapshot(runtime)["assets"]
        mirror = runtime / "work/elio-preview-site/assets/elio/previews/ch3-act5/media"
        for row in active_manifest["files"].values():
            key = f'memory-tape/{row["sha256"]}/{row["filename"]}'
            asset_id = row["sha256"]
            path = (local_asset_path(runtime, asset_id) if asset_id in managed
                    else mirror / key)
            raw = path.read_bytes()
            if len(raw) != row["bytes"] or _digest(raw) != row["sha256"]:
                raise ValueError("Local Memory asset differs from the approved manifest")
            assets["media/" + key] = raw
        poster_url = f'{base}media/memory-tape/{poster["sha256"]}/{poster["filename"]}'
    composed = compose_reader(unwrap_memory_presentation(page), asset_base=base,
        moment_quotes=verified_moment_quotes(story, source, connections or {}), poster_url=poster_url,
        public=True, canonical_url=f"/storytimeline/{UNIT}/", experience=resolve_experience(story))
    return composed, assets


def apply_memory_presentation(candidate_site, data_root, unit_ids) -> dict:
    """Apply opted-in presentation after translations; update only candidate rows."""
    from ..translation_preparation import _read_manifest, _replace_bytes, _verified_page

    site, data = Path(candidate_site).resolve(), Path(data_root).resolve()
    if not isinstance(unit_ids, (list, tuple)) or any(not isinstance(x, str) or not _IDENTITY.fullmatch(x) for x in unit_ids):
        raise ValueError("Memory presentation needs safe unit identities")
    if len(set(unit_ids)) != len(unit_ids):
        raise ValueError("Memory presentation scope contains duplicate units")
    manifest_raw, manifest, rows = _read_manifest(site)
    row_map = {f'{row["work_id"]}/{row["unit_id"]}': row for row in rows}
    planned, protected, asset_plans = [], {}, {}
    for identity in unit_ids:
        if identity not in row_map:
            raise ValueError("Memory presentation unit is absent from public candidate")
        # This approved scene belongs to Act5. Retained public chapters are not
        # rebuilt or inspected through their newer canonical drafts here.
        if identity != UNIT:
            continue
        unit = data / identity
        if not unit.resolve().is_relative_to(data):
            raise ValueError("Memory source escapes storytimeline data")
        story_path = unit / "story.json"
        story_raw = story_path.read_bytes()
        story = json.loads(story_raw)
        presentation = story.get("reader_presentation")
        if presentation is None:
            presentation = {}
        if not isinstance(presentation, dict):
            raise ValueError("Reader presentation must be an object")
        if "entry_scene" not in presentation and "experience" not in presentation:
            continue
        entry = presentation.get("entry_scene")
        if entry is not None and entry != "memory_tape":
            raise ValueError("Unknown or unapproved Memory entry scene")
        path, page = _verified_page(site, row_map[identity])
        raw = page.encode("utf-8")
        source_path, connections_path = unit / "source.json", unit / "connections.json"
        source_raw, connections_raw = source_path.read_bytes(), connections_path.read_bytes()
        protected.update({story_path: story_raw, source_path: source_raw, connections_path: connections_raw})
        source, connections = json.loads(source_raw), json.loads(connections_raw)
        from .reader_experience import compose_reader_experience
        composed, assets = compose_reader_experience(page, story, source, connections)
        planned.append((identity, path, raw, composed.encode("utf-8")))
        for name, payload in assets.items():
            target = path.parent / name
            if target.is_symlink() or not target.resolve().is_relative_to(site):
                raise ValueError("Memory asset escapes candidate")
            asset_plans[target] = (target.read_bytes() if target.is_file() else None, payload)
    if not planned:
        return {"status": "unchanged", "unit_count": 0, "units": [], "rows": [], "assets": []}
    if any(path.read_bytes() != raw for path, raw in protected.items()):
        raise ValueError("Memory presentation source changed during preparation")
    if (site / "storytimelines.json").read_bytes() != manifest_raw or any(path.read_bytes() != raw for _, path, raw, _ in planned):
        raise ValueError("Memory candidate changed during preparation")
    updated = deepcopy(manifest)
    updated_rows = {f'{row["work_id"]}/{row["unit_id"]}': row for row in updated["units"]}
    for path, (expected, payload) in asset_plans.items():
        _replace_bytes(path, payload, expected)
    for identity, path, raw, payload in planned:
        _replace_bytes(path, payload, raw)
        updated_rows[identity]["html_hash"] = _digest(payload)
    _replace_bytes(site / "storytimelines.json", (json.dumps(updated, ensure_ascii=False, indent=2) + "\n").encode(), manifest_raw)
    return {"status": "applied_to_candidate", "unit_count": len(planned),
            "units": [identity for identity, *_ in planned],
            "rows": [updated_rows[identity] for identity, *_ in planned],
            "assets": sorted(path.relative_to(site).as_posix() for path in asset_plans)}
