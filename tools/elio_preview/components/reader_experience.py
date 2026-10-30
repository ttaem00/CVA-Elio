"""Registered reader motifs: loading, first entry and replay travel are separate.

Source-owned renderers retain their own art, cameras and media provenance. Story
JSON selects known modules; it cannot inject executable code or remote assets.
"""
from __future__ import annotations

from copy import deepcopy

MEMORY_UNIT = "wutheringwaves/ch3-act5"
MOON_UNIT = "wutheringwaves/ch3-side-story-edge-dream"
_MODULES = {
    "loading": {
        "none": {"label": "준비 문구만"},
        "cassette_reels": {"label": "카세트 · 두 개의 릴"},
        "signal_orbit": {"label": "신호 · 공전하는 점"},
    },
    "entry": {
        "reader": {"label": "본문부터 읽기"},
        "memory_tape": {"label": "건네받은 기억 · 3D 테이프", "units": {MEMORY_UNIT}},
        "moon_memory": {"label": "달의 기억 · 엣지 드림", "units": {MOON_UNIT}},
    },
    "link": {
        "standard": {"label": "기본 영상 전환"},
        "none": {"label": "바로 새 탭에서 열기"},
        "memory_tape": {"label": "테이프의 빛 속으로", "units": {MEMORY_UNIT}},
    },
}
_PLAIN = {"loading": "none", "entry": "reader", "link": "standard"}
_MEMORY = {"loading": "cassette_reels", "entry": "memory_tape", "link": "memory_tape"}


def validate_experience(value, *, identity=None):
    if not isinstance(value, dict) or set(value) != set(_MODULES):
        raise ValueError("Reader experience needs loading, entry and link modules")
    for slot, module in value.items():
        if not isinstance(module, str) or module not in _MODULES[slot]:
            raise ValueError(f"Unknown reader experience {slot} module")
        allowed = _MODULES[slot][module].get("units")
        if identity is not None and allowed and identity not in allowed:
            raise ValueError("Reader experience motif is not registered for this story")
    if value['entry'] == 'moon_memory' and value['loading'] != 'none':
        raise ValueError('Moon presentation uses its own scene preparation')
    if "memory_tape" not in (value["entry"], value["link"]) and value["loading"] != "none":
        raise ValueError("A loading motif requires an interactive scene module")
    return dict(value)


def resolve_experience(story):
    identity = f'{story.get("work_id", "")}/{story.get("unit_id", "")}'
    presentation = story.get("reader_presentation")
    if presentation is None:
        presentation = {}
    if not isinstance(presentation, dict):
        raise ValueError("Reader presentation must be an object")
    if "experience" in presentation:
        return validate_experience(presentation["experience"], identity=identity)
    # Old readers keep their exact opt-in. No other story adopts this scene.
    return dict(_MEMORY if identity == MEMORY_UNIT and presentation.get("entry_scene") == "memory_tape" else _PLAIN)


def experience_options(work_id, unit_id):
    identity = f"{work_id}/{unit_id}"
    result = {slot: [{"id": key, "label": row["label"]}
                     for key, row in modules.items()
                     if not row.get("units") or identity in row["units"]]
              for slot, modules in _MODULES.items()}
    if identity != MEMORY_UNIT:
        result["loading"] = [row for row in result["loading"] if row["id"] == "none"]
    return result


def loading_markup(module):
    """Small source-owned vector modules; no additional downloads or canvas."""
    if module not in _MODULES["loading"]:
        raise ValueError("Unknown reader loading motif")
    if module == "none":
        return ""
    if module == "signal_orbit":
        return ('<svg viewBox="0 0 100 64" fill="none"><ellipse cx="50" cy="32" rx="32" ry="20"/>'
                '<circle cx="50" cy="32" r="4"/><g class="elio-memory__reel">'
                '<circle cx="50" cy="12" r="3"/><path d="M21 43l8-2m42-18 8-2"/></g></svg>')
    return ('<svg viewBox="0 0 100 64"><rect x="2" y="2" width="96" height="60" rx="7"/>'
            '<path d="M22 62l6-15h44l6 15M32 54h36M38 41h24"/>'
            '<g class="elio-memory__reel"><circle cx="28" cy="25" r="12"/><circle cx="28" cy="25" r="3"/>'
            '<path d="M28 13v6m0 12v6M16 25h6m12 0h6"/></g>'
            '<g class="elio-memory__reel"><circle cx="72" cy="25" r="12"/><circle cx="72" cy="25" r="3"/>'
            '<path d="M72 13v6m0 12v6M60 25h6m12 0h6"/></g></svg>')


def compose_reader_experience(page, story, source, connections, *, public=True, runtime_root=None):
    """Normal builder entrypoint; add a new source-owned driver here once."""
    profile = resolve_experience(story)
    from .memory_tape import compose_unit_memory, unwrap_memory_presentation
    from .moon_memory import compose_unit_moon, unwrap_moon_presentation
    page = unwrap_moon_presentation(page)
    marker = '<script id="elio-link-policy">document.documentElement.dataset.elioLinkEffects="off";</script>'
    if profile['entry'] == 'moon_memory':
        result, files = compose_unit_moon(unwrap_memory_presentation(page).replace(marker, ''), story,
                                          public=public, runtime_root=runtime_root)
        if profile['link'] == 'none':
            result = result.replace('</head>', marker + '</head>', 1)
        return result, files
    if "memory_tape" in (profile["entry"], profile["link"]):
        selected = deepcopy(story)
        selected.setdefault("reader_presentation", {})["entry_scene"] = "memory_tape"
        result, files = compose_unit_memory(page, selected, source, connections,
                                          public=public, runtime_root=runtime_root)
        return result, {"assets/memory-tape/" + key: raw for key, raw in files.items()}
    result = unwrap_memory_presentation(page)
    result = result.replace(marker, "")
    if profile["link"] == "none":
        result = result.replace("</head>", marker + "</head>", 1)
    return result, {}


def preserve_reader_experience(page, original):
    """Reattach only existing source-owned presentation, never an older body."""
    from .memory_tape import _PREFIX as memory_prefix, restore_memory_presentation
    from .moon_memory import PREFIX as moon_prefix, restore_moon_presentation

    if memory_prefix in original and moon_prefix in original:
        raise ValueError("A reader cannot contain two entry presentations")
    if moon_prefix in original:
        return restore_moon_presentation(page, original)
    return restore_memory_presentation(page, original)
