"""Qualitative story contracts shared by Elio research and rendering."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from .components.editorial_cues import validate_editorial_cues
from .components.story_layout import validate_story_layout
from .components.time_map import validate_time_map
from .components.story_topology import validate_story_topology
from .reader_copy import validate_reader_copy
from .story_contract import (
    CLUE_CONFIDENCE,
    GLOSSARY_FIELDS,
    GLOSSARY_OPTIONAL_FIELDS,
    GUIDE_ITEM_OPTIONAL_FIELDS,
    HIGHLIGHT_KINDS,
    NARRATIVE_ROLES,
    PERSPECTIVE_EVIDENCE_STATES,
    PERSPECTIVE_GUIDE_OPTIONAL_FIELDS,
    PERSPECTIVE_ITEM_FIELDS,
    PERSPECTIVE_ITEM_OPTIONAL_FIELDS,
    QUOTE_KINDS,
    READER_GUIDE_KINDS,
    RELATIONSHIP_ITEM_FIELDS,
    TERM_TYPES,
)


SEMANTIC_CONTRACT = "elio.story-semantic.v4"
SEMANTIC_CONTRACTS = {"elio.story-semantic.v3", SEMANTIC_CONTRACT}
SEMANTIC_REVIEW_CHECKS = {
    "source_coverage", "context_and_causality", "event_selection", "quote_integrity",
    "highlight_value", "terminology",
}
GLOSSARY_TERM_TYPES = TERM_TYPES


def is_semantic_story_contract(value: Any) -> bool:
    return value in SEMANTIC_CONTRACTS

_PAIRED_QUOTES = {
    '"': '"', "'": "'", "“": "”", "‘": "’", "「": "」", "『": "』",
}
_TERMINAL_RE = re.compile(r"[.!?…](?:[\"'”’」』)\]]*)$")


def _required_text(value: Any, field: str, limit: int) -> str:
    text = str(value or "").strip()
    if not text or len(text) > limit:
        raise ValueError(f"Semantic event {field} is empty or too long")
    return text


def is_complete_source_quote(
    value: Any, *, source_text: str = "", cue: dict[str, Any] | None = None,
) -> bool:
    """Reject obvious fragments while allowing a structurally bounded utterance."""
    if not isinstance(value, str) or not value.strip():
        return False
    quote = value.strip()
    normalized = re.sub(r"\s+", " ", quote)
    if cue:
        cue_text = str(cue.get("text") or "")
        units = [re.sub(r"\s+", " ", row).strip()
                 for row in cue_text.splitlines() if row.strip()]
        if normalized == re.sub(r"\s+", " ", cue_text).strip() or normalized in units:
            return True
    source_units = [re.sub(r"\s+", " ", row).strip()
                    for row in source_text.splitlines() if row.strip()]
    if len(normalized) >= 8 and normalized in source_units:
        return True
    closer = _PAIRED_QUOTES.get(quote[0])
    if closer and len(quote) > 4 and quote.endswith(closer):
        return True
    return len(normalized) >= 8 and bool(_TERMINAL_RE.search(quote))


def validate_semantic_event(
    event: dict[str, Any], source_text: str, editorial_cues: dict[str, Any] | None = None,
) -> None:
    """Validate qualitative meaning fields and exact, complete quote evidence."""
    if event.get("narrative_role") not in NARRATIVE_ROLES:
        raise ValueError("Unknown narrative role")
    if event.get("highlight_kind") not in HIGHLIGHT_KINDS:
        raise ValueError("Unknown highlight kind")
    _required_text(event.get("causal_turn"), "causal_turn", 500)
    _required_text(event.get("why_watch"), "why_watch", 500)
    quote_kind = event.get("source_quote_kind")
    quote = event.get("source_quote")
    speaker = event.get("source_quote_speaker")
    cue_hash = event.get("source_cue_hash")
    if quote_kind not in QUOTE_KINDS:
        raise ValueError("Unknown source quote kind")
    if quote_kind == "none":
        if quote is not None or speaker is not None or cue_hash is not None:
            raise ValueError("Quote, speaker and cue must be null when quote kind is none")
        return
    cue = None
    if cue_hash is not None:
        blocks = (editorial_cues or {}).get("blocks", [])
        cue = next((row for row in blocks if row.get("cue_hash") == cue_hash), None)
        if cue is None:
            raise ValueError("Source quote references an unknown editorial cue")
    if not is_complete_source_quote(quote, source_text=source_text, cue=cue):
        raise ValueError("Source quote must be a complete sentence or complete dialogue")
    # HTML extraction may insert line breaks on both sides of one inline
    # element (for example an emphasized name immediately before punctuation).
    # The research contract explicitly allows one utterance to span adjacent
    # numbered lines, so compare the exact non-whitespace character sequence.
    # Completeness is still checked above; changed words or punctuation fail.
    normalized_quote = re.sub(r"\s+", "", str(quote))
    normalized_source = re.sub(r"\s+", "", source_text)
    if normalized_quote not in normalized_source:
        raise ValueError("Source quote is absent from its source span")
    if quote_kind == "dialogue":
        _required_text(speaker, "source_quote_speaker", 80)
    elif speaker is not None:
        raise ValueError("Narration quotes cannot claim a speaker")


def _story_sources(source: dict[str, Any]) -> dict[str, dict[str, Any]]:
    primary_content = str(source.get("content_text") or "")
    if source.get("editorial_cues") is not None:
        validate_editorial_cues(source["editorial_cues"], primary_content)
    rows = {"primary": source}
    for row in source.get("research_sources", []):
        if not isinstance(row, dict):
            raise ValueError("Story research source is invalid")
        source_id = str(row.get("source_id") or "").strip()
        if not source_id or source_id in rows:
            raise ValueError("Story research source id is invalid or duplicated")
        if row.get("schema_version") != "argus.read.v1" or row.get(
            "retrieval_status"
        ) not in {"body_acquired", "section_body_verified"}:
            raise ValueError("Story research source was not acquired")
        content = str(row.get("content_text") or "")
        if not content or row.get("content_hash") != hashlib.sha256(content.encode()).hexdigest():
            raise ValueError("Story research source hash is invalid")
        if row.get("editorial_cues") is not None:
            validate_editorial_cues(row["editorial_cues"], content)
        if row.get("evidence_role") not in {"continuation", "crosscheck"}:
            raise ValueError("Story research source role is invalid")
        rows[source_id] = row
    return rows


def research_bundle_hash(source: dict[str, Any]) -> str:
    """Bind a semantic story to every acquired source without hashing volatile paths."""
    rows = _story_sources(source)
    basis = [{
        "source_id": source_id,
        "content_hash": row.get("content_hash"),
        "requested_url": row.get("requested_url"),
        "requested_section": row.get("requested_section"),
        "evidence_role": "primary" if source_id == "primary" else row.get("evidence_role"),
    } for source_id, row in rows.items()]
    return hashlib.sha256(json.dumps(
        basis, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode()).hexdigest()


def validate_story_glossary_terms(
    terms: Any, sources: dict[str, dict[str, Any]],
) -> None:
    """Require semantic term proposals to stay concise and source-bound."""
    if not isinstance(terms, list) or len(terms) > 40:
        raise ValueError("Semantic glossary term list is invalid")
    seen: set[str] = set()
    for row in terms:
        if (not isinstance(row, dict) or not GLOSSARY_FIELDS.issubset(row)
                or set(row) - (GLOSSARY_FIELDS | GLOSSARY_OPTIONAL_FIELDS)):
            raise ValueError("Unexpected semantic glossary term fields")
        term = _required_text(row.get("term"), "glossary term", 80)
        identity = term.casefold()
        if identity in seen or "://" in term or "\n" in term:
            raise ValueError("Semantic glossary term is duplicated or unsafe")
        seen.add(identity)
        aliases = row.get("aliases")
        if not isinstance(aliases, list) or len(aliases) > 8 or any(
            not isinstance(alias, str) or not alias.strip() or len(alias) > 80
            for alias in aliases
        ):
            raise ValueError("Semantic glossary aliases are invalid")
        if row.get("term_type") not in GLOSSARY_TERM_TYPES:
            raise ValueError("Semantic glossary term type is invalid")
        source_id = str(row.get("source_id") or "")
        if source_id not in sources or sources[source_id].get("evidence_role") == "crosscheck":
            raise ValueError("Semantic glossary term needs a primary or continuation source")
        lines = str(sources[source_id].get("content_text") or "").splitlines()
        span = row.get("source_lines")
        if (
            not isinstance(span, list) or len(span) != 2
            or any(not isinstance(value, int) or isinstance(value, bool) for value in span)
            or not 1 <= span[0] <= span[1] <= len(lines)
        ):
            raise ValueError("Semantic glossary source span is invalid")
        bounded_source = "\n".join(lines[span[0] - 1:span[1]])
        if term not in bounded_source and not any(alias in bounded_source for alias in aliases):
            raise ValueError("Semantic glossary term is absent from its source span")
        _required_text(row.get("context"), "glossary context", 300)


def validate_semantic_reader_guides(
    guides: Any, sources: dict[str, dict[str, Any]],
) -> None:
    """Require researched interpretation blocks to cite acquired public bodies."""
    # Match the renderer's limit so new notes can preserve existing guides.
    if not isinstance(guides, list) or not 1 <= len(guides) <= 8:
        raise ValueError("Semantic story needs 1 to 8 reader guides")
    seen: set[str] = set()
    for guide in guides:
        required_guide_fields = {
            "id", "kind", "title", "summary", "after_event_id", "items", "source_ids",
        }
        allowed_guide_fields = set(required_guide_fields)
        if isinstance(guide, dict) and guide.get("kind") == "perspective":
            allowed_guide_fields.update(PERSPECTIVE_GUIDE_OPTIONAL_FIELDS)
        if (
            not isinstance(guide, dict)
            or not required_guide_fields.issubset(guide)
            or set(guide) - allowed_guide_fields
        ):
            raise ValueError("Unexpected semantic reader-guide fields")
        guide_id = _required_text(guide.get("id"), "reader guide id", 80)
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", guide_id) or guide_id in seen:
            raise ValueError("Semantic reader-guide ids must be unique stable ids")
        seen.add(guide_id)
        kind = guide.get("kind")
        if kind not in READER_GUIDE_KINDS:
            raise ValueError("Unknown semantic reader-guide kind")
        _required_text(guide.get("title"), "reader guide title", 160)
        _required_text(guide.get("summary"), "reader guide summary", 1200)
        if guide.get("after_event_id") is not None:
            raise ValueError("Researched interpretation guides belong after the full timeline")
        source_ids = guide.get("source_ids")
        if (
            not isinstance(source_ids, list) or not 1 <= len(source_ids) <= 4
            or len(set(source_ids)) != len(source_ids)
            or any(not isinstance(source_id, str) or source_id not in sources for source_id in source_ids)
        ):
            raise ValueError("Semantic reader guide must cite acquired source ids")
        items = guide.get("items")
        if kind == "conclusion":
            if items != []:
                raise ValueError("Conclusion reader guide cannot contain contrast items")
        else:
            item_minimum = 1 if kind == "relationships" else 2
            item_maximum = 13 if kind == "perspective" else (8 if kind in {"relationships", "clues"} else 4)
            if not isinstance(items, list) or not item_minimum <= len(items) <= item_maximum:
                raise ValueError("Reader-guide item count is outside its information contract")
            if guide.get("time_map") is not None:
                validate_time_map(guide["time_map"], {item.get("id") for item in items if isinstance(item, dict)})
            # A contrast claims competing public readings and therefore needs
            # an acquired independent body. Questions and clues may instead
            # separate confirmed canon from an explicitly open inference using
            # the primary story alone; requiring a crosscheck there caused
            # honest unresolved hooks to be dropped or over-researched.
            if (
                kind == "contrast"
                and not any(
                    sources[source_id].get("evidence_role") == "crosscheck"
                    for source_id in source_ids
                )
            ):
                raise ValueError("Interpretation reader guide needs an acquired crosscheck source")
            for item in items:
                expected_fields = (
                    set(RELATIONSHIP_ITEM_FIELDS)
                    if kind == "relationships" else {"label", "title", "summary"}
                )
                if kind == "clues":
                    expected_fields.update({"confidence", "reference"})
                elif kind == "perspective":
                    expected_fields = set(PERSPECTIVE_ITEM_FIELDS)
                optional_fields = set(GUIDE_ITEM_OPTIONAL_FIELDS)
                if kind == "perspective":
                    optional_fields.update(PERSPECTIVE_ITEM_OPTIONAL_FIELDS)
                    # Added only by the static-site builder after the source
                    # contract has already been validated.
                    optional_fields.add("image_site_asset")
                if (not isinstance(item, dict) or not expected_fields.issubset(item)
                        or set(item) - (expected_fields | optional_fields)):
                    raise ValueError("Unexpected semantic interpretation item fields")
                if kind == "relationships":
                    _required_text(item.get("subject"), "relationship subject", 80)
                    _required_text(item.get("relation"), "relationship relation", 80)
                    _required_text(item.get("object"), "relationship object", 80)
                    _required_text(item.get("summary"), "relationship summary", 600)
                else:
                    _required_text(item.get("label"), "contrast label", 40)
                    _required_text(item.get("title"), "contrast title", 120)
                    _required_text(item.get("summary"), "contrast summary", 600)
                if kind == "clues" and item.get("confidence") not in CLUE_CONFIDENCE:
                    raise ValueError("Semantic clue needs an explicit confidence state")
                if (
                    kind == "perspective"
                    and item.get("evidence_state") not in PERSPECTIVE_EVIDENCE_STATES
                ):
                    raise ValueError("Perspective item needs an explicit evidence state")
                if kind == "perspective":
                    common_image_fields = {"image_alt", "image_caption"}
                    external_image_fields = common_image_fields | {"image_url", "image_source_url"}
                    managed_image_fields = common_image_fields | {
                        "image_asset_path", "image_content_hash",
                    }
                    has_external = "image_url" in item
                    has_managed = bool({"image_asset_path", "image_content_hash"}.intersection(item))
                    if has_external and has_managed:
                        raise ValueError("Perspective image must use one asset mode")
                    expected_image_fields = (
                        external_image_fields if has_external else managed_image_fields
                    )
                    if (has_external or has_managed) and not expected_image_fields.issubset(item):
                        raise ValueError("Perspective image metadata must be complete")
                    if has_managed and not re.fullmatch(
                        r"[a-f0-9]{64}", str(item.get("image_content_hash") or "")
                    ):
                        raise ValueError("Perspective managed image needs a SHA-256 hash")
                    if "image_event_id" in item:
                        _required_text(item.get("image_event_id"), "perspective image event id", 80)
                    for field in ("image_alt", "image_caption"):
                        if field in item:
                            _required_text(item.get(field), f"perspective {field}", 240)
                if kind == "clues":
                    reference = item.get("reference")
                    if not isinstance(reference, dict) or set(reference) != {"source_id", "label"}:
                        raise ValueError("Semantic clue needs one acquired reference link")
                    reference_source_id = reference.get("source_id")
                    if (
                        not isinstance(reference_source_id, str)
                        or reference_source_id not in source_ids
                        or reference_source_id not in sources
                    ):
                        raise ValueError("Semantic clue reference must cite its acquired guide source")
                    reference_label = _required_text(
                        reference.get("label"), "clue reference label", 80,
                    )
                    if reference_label not in item["title"] and reference_label not in item["summary"]:
                        raise ValueError("Clue reference label must appear in its title or summary")
            if kind == "perspective" and guide.get("story_topology") is not None:
                item_ids = [item.get("id") for item in items]
                if (
                    any(not isinstance(item_id, str) for item_id in item_ids)
                    or len(set(item_ids)) != len(item_ids)
                ):
                    raise ValueError(
                        "Perspective topology requires unique stable ids on every item"
                    )
                validate_story_layout(guide["story_topology"], item_ids)


def validate_semantic_story(data: dict[str, Any], source: dict[str, Any]) -> None:
    """Apply the live contract while keeping approved legacy stories readable."""
    validate_reader_copy(data)
    if data.get("story_topology") is not None:
        validate_story_topology(
            data["story_topology"],
            [event.get("id") if isinstance(event, dict) else None
             for event in data.get("events", [])],
        )
    if data.get("research_contract") != SEMANTIC_CONTRACT:
        return
    _required_text(data.get("story_thesis"), "story_thesis", 800)
    sources = _story_sources(source)
    if not any(
        source_id != "primary"
        and row.get("discovery_origin") in {
            "web_search", "agent_web_search", "public_video_search",
        }
        and row.get("independent_from_start") is True
        for source_id, row in sources.items()
    ):
        raise ValueError(
            "Semantic story needs an independently acquired public-web body"
        )
    if data.get("research_bundle_hash") != research_bundle_hash(source):
        raise ValueError("Semantic story is detached from its research source bundle")
    validate_story_glossary_terms(data.get("glossary_terms"), sources)
    validate_semantic_reader_guides(data.get("reader_guides"), sources)
    events = data.get("events")
    if not isinstance(events, list) or not events:
        raise ValueError("Semantic story needs events")
    highlighted = False
    for event in events:
        source_id = str(event.get("source_id") or "")
        if source_id not in sources or sources[source_id].get("evidence_role") == "crosscheck":
            raise ValueError("Semantic event needs a primary or continuation source")
        source_row = sources[source_id]
        lines = str(source_row.get("content_text") or "").splitlines()
        start, end = event["source_lines"]
        validate_semantic_event(
            event, "\n".join(lines[start - 1:end]), source_row.get("editorial_cues"),
        )
        highlighted = highlighted or event.get("highlight_kind") != "none"
    if not highlighted:
        raise ValueError("Semantic story must identify at least one worthwhile highlight")
