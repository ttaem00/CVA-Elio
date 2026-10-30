"""One canonical story-shape contract shared by every Elio meaning stage."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


DEFAULT_EVENT_LIMIT = 40
EDITORIAL_POLICY_SCHEMA = "elio.editorial-policy.v1"


def editorial_event_limit(source=None, *, work_id=None, unit_id=None) -> int:
    """Read operator approval from the source receipt, never a model's story."""
    if source is None or "editorial_policy" not in source:
        return DEFAULT_EVENT_LIMIT
    policy = source["editorial_policy"]
    fields = {"schema_version", "work_id", "unit_id", "max_events", "approval_ref"}
    if not isinstance(policy, dict) or set(policy) != fields:
        raise ValueError("Editorial event policy needs its exact approval fields")
    if policy["schema_version"] != EDITORIAL_POLICY_SCHEMA:
        raise ValueError("Unknown editorial event policy")
    if (not isinstance(work_id, str) or not work_id
            or not isinstance(unit_id, str) or not unit_id
            or (policy["work_id"], policy["unit_id"]) != (work_id, unit_id)):
        raise ValueError("Editorial event policy belongs to another work/unit")
    limit = policy["max_events"]
    if type(limit) is not int or limit <= DEFAULT_EVENT_LIMIT:
        raise ValueError("Editorial event policy needs an explicit expanded integer limit")
    approval = policy["approval_ref"]
    if not isinstance(approval, str) or not approval.strip() or len(approval) > 500:
        raise ValueError("Editorial event policy needs the manager's approval reference")
    return limit


def validate_event_count(events, *, source=None, work_id=None, unit_id=None) -> None:
    """Share the same bounded array contract across drafting and rendering."""
    limit = editorial_event_limit(source, work_id=work_id, unit_id=unit_id)
    if not isinstance(events, list) or not 1 <= len(events) <= limit:
        raise ValueError(f"Expected 1 to {limit} events")


STORY_TOP_FIELDS = frozenset({
    "title", "intro", "tags", "story_thesis", "glossary_terms", "events",
    "reader_guides",
})
STORY_OPTIONAL_FIELDS = frozenset({"story_topology", "phases", "reader_presentation"})
EVENT_OPTIONAL_FIELDS = frozenset({"phase_id"})
GLOSSARY_OPTIONAL_FIELDS = frozenset({"reveal_after_event_id"})
GUIDE_ITEM_OPTIONAL_FIELDS = frozenset({"related_event_id"})
PERSPECTIVE_ITEM_OPTIONAL_FIELDS = frozenset({
    "id",
    "image_event_id", "image_url", "image_source_url", "image_alt", "image_caption",
    "image_asset_path", "image_content_hash",
})
PERSPECTIVE_GUIDE_OPTIONAL_FIELDS = frozenset({"story_topology", "time_map"})
EVENT_FIELDS = frozenset({
    "id", "title", "summary", "location", "source_id", "source_lines",
    "source_quote", "source_quote_kind", "source_quote_speaker",
    "source_cue_hash", "narrative_role", "causal_turn", "why_watch",
    "highlight_kind", "image_queries",
})
GLOSSARY_FIELDS = frozenset({
    "term", "aliases", "term_type", "source_id", "source_lines", "context",
})
READER_GUIDE_FIELDS = frozenset({
    "id", "kind", "title", "summary", "after_event_id", "items", "source_ids",
})
READER_GUIDE_KINDS = frozenset({
    "conclusion", "relationships", "contrast", "questions", "clues",
    "perspective",
})
BASE_GUIDE_ITEM_FIELDS = frozenset({"label", "title", "summary"})
PERSPECTIVE_ITEM_FIELDS = BASE_GUIDE_ITEM_FIELDS | frozenset({"evidence_state"})
PERSPECTIVE_EVIDENCE_STATES = frozenset({
    "confirmed", "in_world_legend", "corrected_record", "interpretation",
})
RELATIONSHIP_ITEM_FIELDS = frozenset({
    "subject", "relation", "object", "summary",
})
CLUE_ITEM_FIELDS = frozenset({
    "label", "title", "summary", "confidence", "reference",
})
CLUE_CONFIDENCE = frozenset({
    "observed", "supported_inference", "unverified",
})
CLUE_REFERENCE_FIELDS = frozenset({"source_id", "label"})
NARRATIVE_ROLES = frozenset({
    "setup", "discovery", "character_reveal", "confrontation", "reversal",
    "sacrifice", "resolution", "transition",
})
HIGHLIGHT_KINDS = frozenset({
    "none", "story_turn", "emotional_peak", "reveal", "confrontation",
    "spectacle", "resolution",
})
QUOTE_KINDS = frozenset({"dialogue", "narration", "none"})
TERM_TYPES = frozenset({
    "person_or_identity", "place", "organization", "object", "lore_concept",
})


def canonical_story_schema() -> dict[str, Any]:
    """Return the prompt/validator contract without duplicating prose variants."""
    return {
        "top_fields": sorted(STORY_TOP_FIELDS),
        "optional_top_fields": sorted(STORY_OPTIONAL_FIELDS),
        "optional_top_field_rules": {
            "story_topology": "Optional elio.story-topology.v2 editorial overlay grounded in acquired story evidence. Prefer a perspective guide for alternate chronology; preserve main disclosure order. Never infer branches or story time from replay clocks.",
            "phases": "Optional ordered reading sections: id, label, summary. Labels/summaries must not reveal hidden plot. Assign every event a phase_id in contiguous section order; these are not story-time assertions.",
            "reader_presentation": "Optional validated labels, transition notes, and cross-view links. It may explain existing events and guides but never add story facts or replay times.",
        },
        "event_fields": sorted(EVENT_FIELDS),
        "optional_event_fields": sorted(EVENT_OPTIONAL_FIELDS),
        "glossary_fields": sorted(GLOSSARY_FIELDS),
        "optional_glossary_fields": sorted(GLOSSARY_OPTIONAL_FIELDS),
        "glossary_reveal_rule": "reveal_after_event_id is the existing scene after which the full definition is safe. Omit to protect it until the final scene; never infer it from source line numbers.",
        "optional_guide_item_fields": sorted(GUIDE_ITEM_OPTIONAL_FIELDS),
        "optional_perspective_item_fields": sorted(PERSPECTIVE_ITEM_OPTIONAL_FIELDS),
        "optional_perspective_guide_fields": sorted(PERSPECTIVE_GUIDE_OPTIONAL_FIELDS),
        "reader_guide_fields": sorted(READER_GUIDE_FIELDS),
        "reader_guide_kinds": sorted(READER_GUIDE_KINDS),
        "guide_item_fields": {
            "conclusion": [],
            "relationships": sorted(RELATIONSHIP_ITEM_FIELDS),
            "contrast": sorted(BASE_GUIDE_ITEM_FIELDS),
            "questions": sorted(BASE_GUIDE_ITEM_FIELDS),
            "clues": sorted(CLUE_ITEM_FIELDS),
            "perspective": sorted(PERSPECTIVE_ITEM_FIELDS),
        },
        "perspective_evidence_states": sorted(PERSPECTIVE_EVIDENCE_STATES),
        "clue_confidence": sorted(CLUE_CONFIDENCE),
        "clue_reference_fields": sorted(CLUE_REFERENCE_FIELDS),
        "clue_reference_rules": {
            "source_id": "must occur in the containing guide source_ids",
            "label": "must be nonblank and occur verbatim in the item title or summary",
        },
        "narrative_roles": sorted(NARRATIVE_ROLES),
        "highlight_kinds": sorted(HIGHLIGHT_KINDS),
        "quote_kinds": sorted(QUOTE_KINDS),
        "term_types": sorted(TERM_TYPES),
    }


READING_VIEWS_PROMPT = (Path(__file__).parent / "authoring_templates" / "reading-views.md").read_text(encoding="utf-8")
# Early acquisition needs the same editorial policy, without the unrelated
# rendering/output instructions that only apply after sources are acquired.
REFERENCE_RESEARCH_PROMPT = READING_VIEWS_PROMPT.split(
    "## Research names and references; earn the deeper reading\n", 1,
)[1].split("\n## Answer the reader with concrete evidence", 1)[0].strip()

CANONICAL_STORY_SCHEMA_PROMPT = (
    "Canonical story schema (the same contract is enforced in draft, review, "
    "repair and validation):\n"
    + json.dumps(canonical_story_schema(), ensure_ascii=False, separators=(",", ":"))
)


def normalize_story_contract(value: Any) -> Any:
    """Repair format-only drift without changing story meaning or evidence.

    This deliberately does not add/remove events, alter prose, invent evidence,
    or guess a missing field. It only canonicalizes aliases and renderer-owned
    placement, and removes clue-only transport fields from non-clue items.
    """
    if not isinstance(value, dict):
        return value
    story = dict(value)
    if STORY_TOP_FIELDS.issubset(story):
        allowed = STORY_TOP_FIELDS | STORY_OPTIONAL_FIELDS
        story = {key: story[key] for key in allowed if key in story}
    tags = story.get("tags")
    if isinstance(tags, list):
        # Tags are renderer-owned labels, not story evidence. Models sometimes
        # return a readable Korean phrase even when asked for a compact hashtag.
        # Canonicalize that harmless format drift locally instead of spending a
        # repair call or discarding an otherwise validated story.
        story["tags"] = [
            "".join(tag.strip().lstrip("#").split())
            if isinstance(tag, str) and "://" not in tag else tag
            for tag in tags
        ]
    events = story.get("events")
    if isinstance(events, list):
        story["events"] = [
            {key: row[key] for key in EVENT_FIELDS | EVENT_OPTIONAL_FIELDS if key in row}
            if isinstance(row, dict) and EVENT_FIELDS.issubset(row) else row
            for row in events
        ]
    glossary = story.get("glossary_terms")
    if isinstance(glossary, list):
        normalized_glossary = []
        for row in glossary:
            if not isinstance(row, dict):
                normalized_glossary.append(row)
                continue
            normalized = dict(row)
            if normalized.get("term_type") in {"group", "faction"}:
                normalized["term_type"] = "organization"
            if GLOSSARY_FIELDS.issubset(normalized):
                normalized = {key: normalized[key] for key in GLOSSARY_FIELDS | GLOSSARY_OPTIONAL_FIELDS if key in normalized}
            normalized_glossary.append(normalized)
        story["glossary_terms"] = normalized_glossary
    guides = story.get("reader_guides")
    if isinstance(guides, list):
        normalized_guides = []
        for guide in guides:
            if not isinstance(guide, dict):
                normalized_guides.append(guide)
                continue
            normalized = dict(guide, after_event_id=None)
            if normalized.get("kind") == "relationships":
                items = normalized.get("items")
                if isinstance(items, list):
                    normalized["items"] = [
                        {key: item[key] for key in RELATIONSHIP_ITEM_FIELDS | GUIDE_ITEM_OPTIONAL_FIELDS if key in item}
                        if isinstance(item, dict) else item
                        for item in items
                    ]
            if normalized.get("kind") in {"contrast", "questions"}:
                items = normalized.get("items")
                if isinstance(items, list):
                    normalized["items"] = [
                        {key: item[key] for key in BASE_GUIDE_ITEM_FIELDS | GUIDE_ITEM_OPTIONAL_FIELDS if key in item}
                        if isinstance(item, dict) else item
                        for item in items
                    ]
            if normalized.get("kind") == "perspective":
                items = normalized.get("items")
                if isinstance(items, list):
                    normalized["items"] = [
                        {key: item[key] for key in (
                            PERSPECTIVE_ITEM_FIELDS
                            | GUIDE_ITEM_OPTIONAL_FIELDS
                            | PERSPECTIVE_ITEM_OPTIONAL_FIELDS
                        ) if key in item}
                        if isinstance(item, dict) else item
                        for item in items
                    ]
            if READER_GUIDE_FIELDS.issubset(normalized):
                allowed = set(READER_GUIDE_FIELDS)
                if normalized.get("kind") == "perspective":
                    allowed.update(PERSPECTIVE_GUIDE_OPTIONAL_FIELDS)
                normalized = {key: normalized[key] for key in allowed if key in normalized}
            normalized_guides.append(normalized)
        story["reader_guides"] = normalized_guides
    return story
