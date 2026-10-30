"""Reject authoring instructions in prose that the story reader will see.

Evidence and review records are not authored reader copy; displayed quotations
are checked alongside the prose. This bounded check complements editorial review;
it is not a language
classifier and does not ban negative dialogue or unresolved story questions.
"""

from __future__ import annotations

import re
from collections.abc import Iterator, Mapping


_TEXT_FIELDS = frozenset({
    "title", "intro", "story_thesis", "summary", "location", "causal_turn",
    "image_alt", "image_caption", "context", "term", "aliases",
    "subject", "relation", "object", "label", "eyebrow", "item_label", "route",
    "track_label", "condition", "spoiler_label", "transition_text", "alt",
    "streamer_name", "reviewer_name", "channel_name", "work_title", "unit_label", "tags",
    "source_quote", "source_quote_speaker", "eras", "lanes",
})
_CONTAINERS = frozenset({
    "events", "phases", "reader_guides", "items", "glossary_terms",
    "story_topology", "nodes", "edges", "alignments", "time", "reference",
    "reader_presentation", "main_view", "perspective_views", "legend", "time_map",
    "entries", "transitions", "scene_links", "quote_labels", "text_only_scenes", "shared_space",
    "moments", "streams", "links", "thumbnail", "official_videos", "pending_replays",
})
_LABEL_MAPS = frozenset({"quote_labels", "text_only_scenes"})

# Require editorial context as well as a process verb. A bare "하지 않는다"
# can be character dialogue, a canon fact or a useful limit on interpretation.
_EXPLICIT_MEMO = re.compile(
    r"(?:편집자?|검증|검토|확인|작성자?|구현|코드\s*수정)\s*(?:메모|지침|체크리스트)"
    r"|내부\s*(?:메모|검토용\s*문구)"
    r"|(?:편집|코드\s*편집)\s*과정|수정\s*(?:사유|이유)\s*[:：]"
    r"|\b(?:TODO|FIXME|editorial\s+note|authoring\s+note)\s*[:：]",
    re.IGNORECASE,
)
_EDITORIAL_PROCESS = re.compile(
    r"(?:하이라이트\s*제목|제목|본문|요약|독자용\s*문구|인용문?|독백|발화|대사|나레이션|캡션|노드|카드)"
    r"[^.!?\n]{0,100}?"
    r"(?:묶(?:었다|는다|어|었)|합(?:쳤|친|치)|배치(?:했|한다|하지|해야)|"
    r"(?:옮기|넣|표시하|노출하|작성하|추가하|삭제하|붙이)"
    r"(?:지\s*않|면\s*안|지\s*말|도록|해야|기로|했다|였))"
)
_AUTHOR_DIRECTIVE = re.compile(
    r"(?:원문|근거|인용|대사|사실관계|공개\s*시점)[^.!?\n]{0,100}?"
    r"(?:확인|검증|검토|보존|구분|수정|반영)(?:해야|한다|할\s*것|하도록)"
)


def _texts(value, path: str, *, label_map: bool = False,
           view_map: bool = False) -> Iterator[tuple[str, str]]:
    if isinstance(value, Mapping):
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            if label_map or key in _TEXT_FIELDS:
                if isinstance(child, str):
                    yield child_path, child
                elif isinstance(child, list):
                    for index, text in enumerate(child):
                        if isinstance(text, str):
                            yield f"{child_path}[{index}]", text
            elif view_map or key in _CONTAINERS:
                yield from _texts(child, child_path, label_map=key in _LABEL_MAPS,
                                  view_map=key == "perspective_views")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from _texts(child, f"{path}[{index}]")


def validate_reader_copy(document: Mapping, *, path: str = "story") -> None:
    """Fail before save/render; never silently filter or mutate the draft."""
    for field, text in _texts(document, path):
        normalized = re.sub(r"[\t\r\n ]+", " ", text)
        if any(pattern.search(normalized) for pattern in (
            _EXPLICIT_MEMO, _EDITORIAL_PROCESS, _AUTHOR_DIRECTIVE,
        )):
            raise ValueError(
                f"Reader copy contains an editorial instruction or process note at {field}; "
                "write the scene and its meaning here, and keep editing notes in the review record"
            )
