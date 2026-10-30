"""A clearly labelled fictional input for the reusable Elio reader contracts."""
from __future__ import annotations

import hashlib


EXAMPLE_SOURCE_URL = "https://ttaem.com/storytimeline/templates/source.json"
ILLUSTRATIONS = "/storytimeline/templates/assets/scenes.svg"


def build_demo() -> tuple[dict, dict, dict]:
    scenes = [
        ("arrival", "문턱에서 처음 만난 보호자", "여행자는 낯선 문턱에서 보호자의 도움을 받는다.", "첫 만남", "parallel"),
        ("memory", "호수에서 구해진 어린아이", "오래전 어린 보호자가 호수에서 구조되었다는 기억을 만난다.", "어린 시절의 기억", "choice-a"),
        ("threshold", "서로 다른 시간이 같은 공간에 모인다", "문턱에서는 과거의 마을과 첫 만남, 마지막 작별의 장면이 함께 보인다.", "시간이 만나는 문턱", "uncertain"),
        ("farewell", "과거의 마을을 지키러 떠난다", "보호자는 과거의 마을을 지키려 문턱을 넘는다. 지켜낸 마을이 두 사람의 첫 만남을 가능하게 했다.", "마지막 작별", "convergence"),
        ("rescue", "여행자가 기억 속 구조자가 된다", "여행자는 문턱을 따라가 호수에 빠진 어린 보호자를 구한다.", "어린 시절로 돌아감", "choice-b"),
        ("promise", "남겨진 편지를 따라 다시 만날 길을 찾는다", "지금의 마을로 돌아온 여행자는 편지를 단서로 다시 만날 길을 찾는다.", "지금", "alternate-a"),
    ]
    letter = "편지에는 ‘문턱을 건너 다시 만나요’와 ‘당신이 지킨 봄에’라는 문장이 남아 있다."
    body = "\n".join(row[2] for row in scenes) + "\n" + letter + "\n"
    digest = hashlib.sha256(body.encode()).hexdigest()
    events = [dict(id=ident, title=title, summary=summary, location=location,
                   source_lines=[index, index], vod_links=[],
                   image_site_asset=f"{ILLUSTRATIONS}#{art}",
                   image_alt=f"{title} · 창작 예제의 상징 일러스트",
                   image_caption="장면의 관계를 표현한 창작 일러스트")
              for index, (ident, title, summary, location, art) in enumerate(scenes, 1)]
    ids = [event["id"] for event in events]
    nodes = [dict(event_id=ident, track_id="reading", track_label="공개 순서",
                  condition="", lane_index=0, lane_count=1, lead=0, time=None)
             for ident in ids]
    layout = dict(schema_version="elio.story-topology.v2", title="만남을 완성하는 순환",
                  summary="처음 읽는 순서는 그대로 두고, 나중에 밝혀진 연결로 앞의 장면을 다시 읽는다.",
                  nodes=nodes,
                  edges=[dict(zip(("from", "to"), pair)) for pair in zip(ids, ids[1:])]
                  + [dict(**{"from": "rescue", "to": "memory"}, relation="return"),
                     dict(**{"from": "memory", "to": "memory"}, relation="return")],
                  alignments=[])
    items = [
        dict(id="origin", label="먼 과거", title="마을을 지킨 보호자",
             summary="보호자가 지킨 마을에서 두 사람의 만남이 가능해진다.", related_event_id="farewell", image_event_id="farewell", evidence_state="confirmed"),
        dict(id="lake", label="어린 시절", title="어린 보호자와 돌아온 여행자의 구조",
             summary="나중에 문턱을 넘은 여행자가 어린 보호자를 구한다.", related_event_id="rescue", image_event_id="memory", evidence_state="confirmed"),
        dict(id="encounter", label="첫 만남", title="보호자가 여행자를 돕는다",
             summary="두 사람의 첫 만남은 서로 다른 시간의 여행이 맞닿는 장면이다.", related_event_id="arrival", image_event_id="arrival", evidence_state="confirmed"),
        dict(id="leave", label="마지막 작별", title="보호자는 과거의 마을로 떠난다",
             summary="문턱을 건너는 보호자의 여행은 마을의 시작으로 이어진다.", related_event_id="farewell", image_event_id="farewell", evidence_state="confirmed"),
        dict(id="seek", label="지금", title="여행자는 남겨진 편지를 따라간다",
             summary="같은 문턱 너머에서 다시 만날 길을 찾는다.", related_event_id="promise", image_event_id="promise", evidence_state="confirmed"),
    ]
    map_nodes = [
        dict(id="origin", item_id="origin", era=0, lane=0, label="보호자\n마을을 지킴"),
        dict(id="lake", item_id="lake", era=1, lane=0, lane_span=2, label="어린 보호자 · 여행자\n호수에서 구조"),
        dict(id="encounter", item_id="encounter", era=2, lane=0, lane_span=2, label="보호자 · 여행자\n첫 만남"),
        dict(id="leave", item_id="leave", era=3, lane=0, label="보호자\n마지막 작별"),
        dict(id="seek", item_id="seek", era=4, lane=1, label="여행자\n다시 만날 길"),
    ]
    def edge(first, second, kind, label, via=None):
        return {"from": first, "to": second, "kind": kind, "label": label, "via": via or []}
    time_map = dict(title="서로 다른 시간이 같은 만남에 닿는다",
                    summary="보호자의 귀환과 여행자의 구조를 각자의 시간에서 따라간다.",
                    eras=["먼 과거", "어린 시절", "첫 만남", "마지막 작별", "지금"],
                    lanes=["보호자", "여행자"], nodes=map_nodes,
                    edges=[edge("origin", "lake", "world", "지켜낸 마을에서 성장"),
                           edge("lake", "encounter", "life", "구조 이후의 만남"),
                           edge("encounter", "leave", "life", "함께한 여행"),
                           edge("leave", "origin", "actor-a", "과거로 돌아가 마을을 지킴", [[3,-.35],[0,-.35]]),
                           edge("seek", "lake", "actor-b", "문턱을 따라 어린 시절로", [[4,1.45],[1,1.45]])],
                    shared_space=dict(title="여러 시간이 만나는 문턱",
                                      summary="과거의 마을, 첫 만남, 마지막 작별이 하나의 공간에서 이어진다.",
                                      node_ids=["origin", "encounter", "leave"]))
    story = dict(schema_version="elio.preview.v1", work_id="template-example", unit_id="temporal-loop",
                 work_title="시간의 문턱 · 창작 예제", unit_label="순환과 교차하는 시간",
                 title="만남이 시작되는 곳", intro="시간선의 표현을 살펴보는 창작 예제입니다. 실제 작품이나 방송 기록이 아닙니다.",
                 tags=["창작예제", "시간선", "순환"], source_hash=digest, events=events, story_topology=layout,
                 reader_guides=[
                     dict(id="times", kind="perspective", title="두 사람의 시간선으로 보기",
                          summary="같은 사건을 두 사람의 경험과 마을의 시간에 나누어 읽는다.", after_event_id=None,
                          source_ids=["primary"], items=items, time_map=time_map),
                     dict(id="letter", kind="clues", title="이야기를 더 깊게 읽기 · 편지에 남은 봄",
                          summary="짧은 문장이 시간의 여행과 다시 만날 약속을 잇는다.", after_event_id=None,
                          source_ids=["primary"], items=[
                              dict(label="편지와 순환", title="편지의 문턱은 만남의 시작이기도 하다",
                                   summary="편지의 문턱은 작별의 장소이면서 앞선 만남을 성립시키는 길이다. 여행이 끝난 자리에서 처음의 장면을 다시 읽게 된다.",
                                   confidence="supported_inference", reference={"source_id":"primary","label":"편지"}, related_event_id="threshold"),
                              dict(label="편지와 계절", title="편지의 봄은 지켜낸 마을의 일상이다",
                                   summary="편지에 남은 봄을 마을의 일상과 겹쳐 읽으면, 보호자가 지키려던 삶이 보인다.",
                                   confidence="supported_inference", reference={"source_id":"primary","label":"편지"}, related_event_id="promise"),
                          ]),
                 ])
    source = dict(schema_version="argus.read.v1", retrieval_status="section_body_verified",
                  content_text=body, content_hash=digest, requested_url=EXAMPLE_SOURCE_URL,
                  site_name="Elio 창작 예제", retrieved_at="2026-10-13T00:00:00Z",
                  evidence_role="primary", material_type="authored_design_fiction")
    connections = dict(schema_version="elio.connections.v3", work_id=story["work_id"], unit_id=story["unit_id"],
                       publication_status="manager_review", publish_approved=False, streams=[], links=[],
                       replay_policy={"mode":"capture_only","reason":"창작 예제에는 실제 방송 다시보기를 연결하지 않는다."},
                       moments=[dict(moment_id="promise-highlight", after_event_id="farewell", kind="watch_highlight",
                                     title="문턱을 건너 다시 만나요", summary="작별의 말은 다시 만날 약속을 남긴다.",
                                     verification="unresolved", evidence_ref="이 저장소가 작성한 창작 예제의 편지")],
                       pending_replays=[dict(moment_id="promise-highlight", streamer_name="예제 시청자",
                                            clocks=["00:00:10","00:00:30"],
                                            evidence_ref="입력 형식용 창작 시각이며 실제 방송 시각이 아님")],
                       official_videos=[])
    return story, source, connections
