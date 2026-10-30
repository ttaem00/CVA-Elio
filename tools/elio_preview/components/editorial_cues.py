"""Pure editorial-cue provenance validation shared by acquisition and rendering."""
import hashlib
import json

from .public_urls import validate_public_url


EDITORIAL_CUES_SCHEMA = "argus.editorial-cues.v1"


def validate_editorial_cues(cues: dict, content_text: str) -> None:
    if cues.get("schema_version") != EDITORIAL_CUES_SCHEMA:
        raise ValueError("Unknown source editorial-cue schema")
    if cues.get("source_content_hash") != hashlib.sha256(content_text.encode()).hexdigest():
        raise ValueError("Editorial cues are detached from source content")
    if cues.get("authority") != "candidate_evidence_not_editorial_decision":
        raise ValueError("Editorial cues cannot claim an editorial decision")
    blocks = cues.get("blocks")
    if not isinstance(blocks, list) or len(blocks) > 80:
        raise ValueError("Editorial cue block list is invalid")
    line_count = len(content_text.splitlines())
    for block in blocks:
        if not isinstance(block, dict) or block.get("kind") not in {
            "candidate_quote", "callout", "table_quote", "heading_card",
        }:
            raise ValueError("Editorial cue block kind is invalid")
        if not isinstance(block.get("text"), str) or not 8 <= len(block["text"]) <= 4000:
            raise ValueError("Editorial cue text is invalid")
        span = block.get("source_lines")
        locator = block.get("locator")
        if span is not None and (
            not isinstance(span, list) or len(span) != 2
            or any(not isinstance(value, int) or isinstance(value, bool) for value in span)
            or not 1 <= span[0] <= span[1] <= line_count
        ):
            raise ValueError("Editorial cue source span is invalid")
        if span is None and (not isinstance(locator, str) or not locator.strip()):
            raise ValueError("Editorial cue needs a source span or locator")
        for link in block.get("linked_terms", []):
            if not isinstance(link, dict) or not str(link.get("label") or "").strip():
                raise ValueError("Editorial cue linked term is invalid")
            validate_public_url(str(link.get("url") or ""))
        supplied = block.get("cue_hash")
        raw = {key: value for key, value in block.items() if key != "cue_hash"}
        expected = hashlib.sha256(
            json.dumps(raw, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        if supplied != expected:
            raise ValueError("Editorial cue provenance hash mismatch")
