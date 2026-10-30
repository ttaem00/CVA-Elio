"""Build a private, fictional Elio example with continuing and nested branches."""

from __future__ import annotations

import argparse
import hashlib
import shutil
from pathlib import Path

from tools.elio_preview.__main__ import render


FICTION_NOTICE = "이 페이지는 구조 검토용 창작 예시이며 실제 작품·방송 기록이 아닙니다."
SCENES = (
    ("first-signal", "유리성에 구조 신호가 울린다", "유리성에 첫 구조 신호가 울리고 주민들이 광장으로 모인다.", "유리성 · 공통 이야기", "parallel"),
    ("departing-square", "구조대가 두 길로 나뉜다", "광장에서 강변 구조대와 지붕 정찰대가 서로 다른 임무를 맡아 출발한다.", "중앙 광장 · 두 시점의 출발", "convergence"),
    ("river-entry", "강변에서 수문을 찾는다", "가상의 유리력 축제일, 강변 구조대는 물에 잠긴 수문을 찾아 내려간다.", "강변 · 구조대 시점", "convergence"),
    ("roof-entry", "지붕 위에서 불빛을 찾는다", "지붕 정찰대는 끊어진 다리를 우회한다. 강변 진입과의 정확한 시각 관계는 기록되지 않았다.", "지붕길 · 정찰대 시점", "convergence"),
    ("river-lock", "수문에서 잠금장치를 푼다", "첫 신호 2분 후, 강변 구조대가 잠금장치를 푸는 순간 지붕의 봉화도 켜진다.", "수문 · 명시된 동시 사건", "parallel"),
    ("roof-beacon", "지붕의 봉화를 밝힌다", "첫 신호 2분 후, 정찰대는 수문이 열리는 바로 그 순간 봉화를 밝히고 거울의 회랑으로 향한다.", "지붕길 · 명시된 동시 사건", "parallel"),
    ("three-gates", "수문 안에서 다시 세 길로 갈라진다", "수문을 통과한 구조대는 서문길, 내문길, 봉인실로 나뉜다. 지붕 정찰대의 경로는 계속 이어진다.", "수문 안쪽 · 중첩 갈림점", "choice"),
    ("west-gate", "서문길에서 주민을 구한다", "서문길의 첫 번째 기록에는 주민을 구해 안뜰로 향했다고 적혀 있다. 다른 두 길과의 시각 관계는 알 수 없다.", "서문길 · 첫 번째 기록", "convergence"),
    ("inner-gate", "내문길에서 통로를 연다", "내문길의 첫 번째 기록에는 막힌 통로를 열어 안뜰로 향했다고 적혀 있다. 서문길과 같은 시각이라는 뜻은 아니다.", "내문길 · 첫 번째 기록", "convergence"),
    ("sealed-room", "봉인실의 문을 닫고 남는다", "봉인실로 향한 대원은 균열을 막기 위해 안에 남는다. 이 경로의 이야기는 여기서 끝나며 안뜰에 합류하지 않는다.", "봉인실 · 이 경로의 끝", "uncertain"),
    ("courtyard-reunion", "두 구조대가 안뜰에서 만난다", "서문길과 내문길을 지난 두 구조대가 안뜰에서 다시 만나 거울의 회랑으로 이동한다.", "안뜰 · 두 경로의 재합류", "convergence"),
    ("mirror-decision", "모두 만난 회랑에서 왕관을 마주한다", "안뜰의 구조대와 지붕 정찰대가 회랑에서 만난다. 왕관을 받는 선택과 부수는 선택은 서로 배타적인 세계로 이어진다.", "거울의 회랑 · 두 세계의 갈림점", "choice"),
    ("crown-first-year", "왕관을 받아 도시를 재건한다", "왕관을 받은 세계는 독자적인 즉위력 원년을 시작한다. 주인공은 도시 재건을 맡으며 이 세계의 이야기는 계속된다.", "왕관 세계 · 즉위력 원년", "choice-a"),
    ("exile-first-year", "왕관을 부수고 성문을 나선다", "왕관을 부순 세계는 별개의 유랑력 원년을 시작한다. 주인공은 성문을 나서며 왕관 세계로 합쳐지지 않는다.", "유랑 세계 · 유랑력 원년", "choice-b"),
    ("crown-second-year", "새 의회에 도시를 맡긴다", "왕관 세계의 즉위력 2년, 주인공은 복구된 도시를 의회에 맡긴다. 이 세계의 이번 이야기는 여기서 마무리된다.", "왕관 세계 · 즉위력 2년", "alternate-a"),
    ("exile-second-year", "길 위에서 새로운 마을을 세운다", "유랑 세계의 유랑력 2년, 주인공은 떠돌던 사람들과 마을을 세운다. 이 결말은 왕관 세계의 다음 사건이 아니다.", "유랑 세계 · 유랑력 2년", "alternate-b"),
)


def _time(kind: str, domain: str, label: str, value: float | None) -> dict:
    return {"kind": kind, "domain": domain, "label": label, "value": value}


def _node(
    event_id: str, track_id: str, track_label: str, lane_index: int = 0,
    lane_count: int = 1, *, condition: str = "", lead: int = 0,
    time: dict | None = None,
) -> dict:
    return {
        "event_id": event_id,
        "track_id": track_id,
        "track_label": track_label,
        "condition": condition,
        "lane_index": lane_index,
        "lane_count": lane_count,
        "lead": lead,
        "time": time,
    }


def build_demo() -> tuple[dict, dict]:
    """Return fresh canonical story/source data; no acquisition or publication."""
    source_text = FICTION_NOTICE + "\n" + "\n".join(row[2] for row in SCENES) + "\n"
    digest = hashlib.sha256(source_text.encode("utf-8")).hexdigest()
    events = [
        {
            "id": event_id,
            "title": title,
            "summary": summary,
            "location": location,
            "source_lines": [line, line],
            "source_quote": summary if event_id == "three-gates" else None,
            "image_site_asset": f"/assets/elio-examples/multiverse-scenes.svg#{art}",
            "image_alt": f"{title}을 상징하는 창작 예시 일러스트",
            "image_caption": location,
            "vod_links": [],
        }
        for line, (event_id, title, summary, location, art) in enumerate(SCENES, 2)
    ]
    nodes = [
        _node("first-signal", "common", "공통 이야기", time=_time("order", "opening-record", "첫 번째 기록", 1)),
        _node("departing-square", "common", "공통 이야기", time=_time("order", "opening-record", "두 번째 기록", 2)),
        _node("river-entry", "river", "강변 구조대", 0, 2, time=_time("date", "glass-calendar", "유리력 축제일", None)),
        # lead is a visual gap, never an elapsed story duration.
        _node("roof-entry", "roof", "지붕 정찰대", 1, 2, lead=3),
        _node("river-lock", "river", "강변 구조대", 0, 2, time=_time("time", "first-signal-elapsed", "첫 신호 2분 후", 120)),
        _node("roof-beacon", "roof", "지붕 정찰대", 1, 2, time=_time("time", "first-signal-elapsed", "첫 신호 2분 후", 120)),
        _node("three-gates", "river", "강변 구조대", 0, 2),
        _node("west-gate", "west", "서문길", 0, 3, time=_time("order", "west-route-record", "첫 번째 기록", 1)),
        _node("inner-gate", "inner", "내문길", 1, 3, time=_time("order", "inner-route-record", "첫 번째 기록", 1)),
        _node("sealed-room", "sealed", "봉인실", 2, 3),
        _node("courtyard-reunion", "rejoined", "안뜰의 구조대"),
        _node("mirror-decision", "mirror", "회랑의 일행"),
        # These calendars belong to exclusive worlds; their numeric values
        # compare only within their declared domains, with no date parsing.
        _node("crown-first-year", "crown", "왕관 세계", 0, 2, condition="왕관을 받았을 때", time=_time("date", "crown-calendar", "즉위력 원년", 1)),
        _node("exile-first-year", "exile", "유랑 세계", 1, 2, condition="왕관을 부쉈을 때", time=_time("date", "exile-calendar", "유랑력 원년", 1)),
        _node("crown-second-year", "crown", "왕관 세계", 0, 2, condition="왕관을 받았을 때", time=_time("date", "crown-calendar", "즉위력 2년", 2)),
        _node("exile-second-year", "exile", "유랑 세계", 1, 2, condition="왕관을 부쉈을 때", time=_time("date", "exile-calendar", "유랑력 2년", 2)),
    ]
    edges = [
        ("first-signal", "departing-square"),
        ("departing-square", "river-entry"), ("departing-square", "roof-entry"),
        ("river-entry", "river-lock"), ("roof-entry", "roof-beacon"),
        ("river-lock", "three-gates"),
        ("three-gates", "west-gate"), ("three-gates", "inner-gate"), ("three-gates", "sealed-room"),
        ("west-gate", "courtyard-reunion"), ("inner-gate", "courtyard-reunion"),
        ("courtyard-reunion", "mirror-decision"), ("roof-beacon", "mirror-decision"),
        ("mirror-decision", "crown-first-year"), ("mirror-decision", "exile-first-year"),
        ("crown-first-year", "crown-second-year"), ("exile-first-year", "exile-second-year"),
    ]
    data = {
        "schema_version": "elio.preview.v1",
        "work_id": "glass-city-fiction",
        "unit_id": "continuing-branches",
        "work_title": "유리성 연대기 · 창작 예시",
        "title": "갈라진 길 너머의 이야기 · 창작 예시",
        "unit_label": "갈라진 길 너머의 이야기",
        "intro": FICTION_NOTICE + " 두 구조대의 여정 안에서 다시 갈라지는 길과, 선택 뒤에도 계속되는 두 세계를 따라갑니다.",
        "tags": ["창작예시", "중첩분기", "동시시점", "재합류", "배타적세계"],
        "source_hash": digest,
        "events": events,
        "story_topology": {
            "schema_version": "elio.story-topology.v2",
            "title": "어디서 갈라지고, 어디로 이어지는가",
            "summary": "공통 이야기에서 갈라지는 구조대의 경로와 선택 후의 두 세계를 따라갑니다.",
            "nodes": nodes,
            "edges": [{"from": start, "to": end} for start, end in edges],
            "alignments": [
                {
                    "id": "signal-simultaneous",
                    "kind": "simultaneous",
                    "label": "수문 개방과 봉화 점등",
                    "event_ids": ["river-lock", "roof-beacon"],
                },
                {
                    "id": "three-path-layout",
                    "kind": "layout",
                    "label": "세 갈래를 나란히 배치 · 서로의 시각 관계는 미확정",
                    "event_ids": ["west-gate", "inner-gate", "sealed-room"],
                },
                {
                    "id": "exclusive-world-layout",
                    "kind": "layout",
                    "label": "배타적인 두 세계의 시작 · 같은 높이가 같은 날짜를 뜻하지 않음",
                    "event_ids": ["crown-first-year", "exile-first-year"],
                },
            ],
        },
    }
    source = {
        "schema_version": "argus.read.v1",
        "retrieval_status": "section_body_verified",
        "content_text": source_text,
        "content_hash": digest,
        "requested_url": "https://example.org/elio-branching-design-fiction",
        "site_name": "Elio 구조 검토용 창작 원문",
        "retrieved_at": "2026-09-15T00:00:00Z",
    }
    return data, source


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    data, source = build_demo()
    page = render(data, source, publication_status="manager_review")
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "index.html").write_text(page, encoding="utf-8", newline="")
    asset_dir = args.output / "assets" / "elio-examples"
    asset_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(Path(__file__).with_name("assets") / "multiverse-scenes.svg", asset_dir)
    print(args.output.resolve())


if __name__ == "__main__":
    main()
