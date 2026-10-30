# Elio 원본 템플릿과 현재 연결 범위

이 목록의 기준은 기존 `tools/elio_preview/`의 실제 renderer·컴포넌트·연출 registry다.
새 CVA 모듈의 수나 Elio 색상을 선택할 수 있다는 사실로 원본 포함 여부를 대신하지 않는다.
`examples/templates/index.html`은 같은 원본 renderer가 만든 창작 예제의 입구다.
각 예제 옆에 이야기·원문·필요한 연결 JSON을 함께 보관한다. 생성 HTML을 고쳐 원본인 것처럼
관리하지 않는다. 동일한 편집 입력을 `scripts/render_story.py`에 전달해 새 HTML로 재생성한다.

`scripts/template_gallery.py::outputs()`는 아래 예제를 실제 렌더해 파일 사전을 반환한다.
패키지의 기존 생성·검증 writer가 이를 채택해야 배포 산출물에 포함된다. 목록에 경로가
적혀 있는 것만으로 패키지 생성·브라우저 동작·원래 입력의 의미 검증이 끝난 것은 아니다.

## 기본 읽기와 장면 구성

| 원본 템플릿·기능 | 기존 구현과 입력 | 창작 예제·확인 지점 |
| --- | --- | --- |
| 선형 타임라인·회색 중앙 축·원형 이미지·교차 본문 | `template.html`, `style.css`, `__main__.py`; `events` | `linear.html?view=cards`; 실제 본문·원형 이미지가 같은 장면에 속한다. |
| 장면 카드 읽기 | `story_tree_reader.js/css`; `events`, `story_topology` | `complete.html?view=cards` |
| 사진 흐름·장면 펼치기·이전/다음·초점 복귀 | 같은 `story_tree_reader.js/css` | `complete.html?view=photos`; 새 카드나 범용 dialog로 대체하지 않는다. |
| 계속 이어지는 가지·중첩 분기·선택·합류·합류하지 않는 결말 | `story_layout.py/js/css`, `story_topology.py/html/css`; 원래 v2 노드·edge·alignment | `branches.html?view=photos`; 강변·지붕·세 갈래·서로 다른 결말을 구분한다. |
| 앞 장면·같은 노드로 돌아오는 관계 | `story_topology.edges[].relation=return` | `complete.html?view=photos#rescue`; 본편 읽는 순서를 순환시키지 않는다. |
| 부·장 구분, 현재 장면, 장면 지도·미니맵 | `scene_navigation.py`, `scene_minimap.py/js/css`; `phases`, `events[].phase_id` | `complete.html#story`; 읽는 순서·분기·되돌아가는 선이 같은 원래 모델을 소비한다. |
| 이미지 없는 장면 | `reader_presentation.text_only_scenes`, 기존 scene renderer | `text-only.html#memory`; 가짜 장면 사진을 생성하지 않는다. |
| 읽기 표제·관점별 범례·전환 문구·장면에서 관점으로 이동 | `reader_presentation.py`; `main_view`, `perspective_views`, `transitions`, `scene_links`, `quote_labels`, `preserve_line_breaks` | `complete.html#rescue`; 입력한 전환·링크를 같은 원래 사건 ID에 연결한다. |

## 시간 지도와 인물 관점

| 원본 템플릿·기능 | 기존 구현과 입력 | 창작 예제·확인 지점 |
| --- | --- | --- |
| 사진 노드, 행·열의 기준, 관계별 색·연결선 | `time_map.py/css/js`, `diagram_geometry.js`; `reader_guides[].time_map` | `complete.html?story=perspective-times#perspective-times-map` |
| 과거로 돌아가는 선·공유된 사건·여러 시간이 만나는 공간 | `time_map.edges`, `nodes[].lane_span`, `shared_space` | 같은 원본 시간 지도; 사진·caption은 한 노드에 속하고 연결은 텍스트로도 읽을 수 있다. |
| 시간 지도 장면 dialog와 닫은 후 복귀 | `time_map.js`의 기존 dialog·선택·초점/스크롤 소유자 | 시간 지도에서 사진을 눌러 확인한다. 함수 존재나 SVG 생성만으로 dialog 동작을 통과했다고 하지 않는다. |
| 인물의 삶과 확인 수준 | `perspective_timeline.py`, `reader_guides.py`, `story_tree_reader.js`; perspective items | `life.html?story=perspective-times`; 확인된 사건·전승·정정·해석의 표시는 원래 입력을 따른다. |
| 관점별 분기·순환 | perspective guide의 `story_topology` | 원본 소스·입력 계약에 포함한다. 이 gallery의 `life`는 선형 관점이며 별도의 관점 v2 분기 입력·브라우저 확인을 대신하지 않는다. |

## 해설과 근거: 여섯 종류 모두

`reader_guides.py/html/css/js`가 실제로 지원하는 종류는 아래 여섯 개다. 하나의 일반
아코디언에 이름만 붙여 대신하지 않는다. 공개 예제의 인용·해석은 실제 작품이나 방송 기록이
아닌 동봉 창작 원문을 대상으로 한다.

| 종류 | 원래 입력의 의미 | 예제 |
| --- | --- | --- |
| `conclusion` 핵심 흐름 | 항목을 억지로 만들지 않는 제목·요약 | `complete.html#guide-overview` |
| `relationships` 인물·세력 관계 | 주체·관계·대상·설명·관련 장면 | `complete.html#guide-people` |
| `contrast` 두 관점 | 라벨·제목·설명의 나란한 비교 | `complete.html#guide-comparison` |
| `questions` 질문과 답 | 제목·답변의 native 펼침 | `complete.html#guide-questions` |
| `clues` 떡밥과 상징·깊게 읽기 | 분류·해설 제목·본문·명시한 근거·확인 수준·원문·관련 장면 복귀 | `complete.html#guide-letter` |
| `perspective` 인물의 삶 | 인물이 경험한 사건과 확인 수준, 본편과 다른 읽는 축 | `life.html?story=perspective-times` |

`term_links`, `glossary_terms`와 `glossary_navigation.js`는 본문의 용어에서 원래 용어 설명을
열고 원래 읽던 장면으로 돌아오는 경로다. `complete.html#story-glossary-title`은 ‘문턱’의
공통 뜻과 해당 이야기의 역할을 동봉 원문과 연결한다. 외부 원전·유래를 창작 사실로 만들지 않는다.

## 영상·후기·공유·Board

| 구성요소 | 현재 포함·예제 | 남은 입력 또는 운영 경계 |
| --- | --- | --- |
| 하이라이트·컷씬 편집 초안 | `connections.py`와 원래 `__main__.py`의 moment; `complete.html#moment-promise-highlight` | 미확인 창작 초안이다. 실제 방송 시각·재생 가능한 링크를 만들지 않는다. |
| 방송 같이보기·같은 하이라이트의 여러 시점·다시보기 | `streams`, `links`, `moments`, `pending_replays`의 원래 계약·validator·renderer 소스 | 실제 동일 장면의 원본 영상·시각·출처 확인이 필요하다. 이 gallery는 방송을 조회하거나 가짜 검증 링크를 생성하지 않는다. |
| 별도 하이라이트 갤러리 | `moments[].placement=watch_gallery`의 원래 renderer | 검증된 방송·썸네일 입력이 있어야 원래 계약대로 출력된다. 기본 창작 예제에 없는 것과 소스 미포함을 구분한다. |
| 방송 감상 후기 | `moments[].placement=streamer_review`의 원래 renderer | 실제 방송·담당자의 문장을 제공해야 한다. 만들어 낸 후기를 검증된 인용으로 내보내지 않는다. |
| 공유·현재 장면 주소 | `reader_share.py/js/css` | 로컬 예제에서는 원래 계약대로 공개 공유가 비활성이다. 공유 short-link 서비스 개설·공개 게시는 별도다. |
| Board 진입·부/관점·장면 지도 | `reader_board.py/js/css`, 기존 자체 `tools/elio_board` 앱 | 공개 package의 Board와 명시 입력을 사용한다. 실제 작품의 draft나 운영 자료를 자동으로 가져오지 않는다. |
| 언어 선택·링크 이동 효과 | `reader_language.js`, `link_effects.js`, `reader_experience.py` | UI 코드와 실제 번역·공개 사이트 운영 기능은 다르다. 로컬 renderer가 번역 서버를 제공하지 않는다. |

## 로딩·첫 진입·링크 연출 registry: 누락으로 숨기지 않는 항목

기존 `reader_experience.py`의 registry에는 다음 선택지가 있다.

| 슬롯 | 등록된 선택지 |
| --- | --- |
| 로딩 | `none`, `cassette_reels`, `signal_orbit` |
| 첫 진입 | `reader`, `memory_tape`, `moon_memory` |
| 링크 | `standard`, `none`, `memory_tape` |

원래 components 소스 전체와 두 작품의 기존 완성본을 명시 recipe에 동봉합니다.

기억 테이프는 명조3장5막, 달의 기억은 명조3장 엣지 드림의 기존 완성본을 그대로 동봉한다. 본문·영상·3D·카메라·다시보기·복귀를 새 창작물로 대체하지 않는다. 공용 스킬의 매체 범용성과 특정 작품 예제의 보존은 별개다. 예제 파일은 ORIGINAL_EXAMPLES.json의 exact hash로 묶고 제3자 미디어 권리는 별도 고지한다. 실제 운영 공개·stable/module 채택은 수행하지 않는다.

[기존 작품 예제](ORIGINAL_EXAMPLES.md)에 각각의 경로와 runtime·미디어·출처 고지를 적었습니다.

원래 준비 모듈3개는 `loading.html`에서, 원래 기본/즉시 링크 정책은 source와 명시 입력에서
확인한다. 실제 방송·영상이 없는 창작 예제에 재생 링크·썸네일·후기를 꾸며 넣지 않는다.
해당 원본 기능의 코드·입력은 모두 포함하고 확인한 원자료를 연결해 사용한다.

## 검증과 범위

gallery 생성은 원래 Python renderer·validator를 실행한다. 동일 입력의 반복 출력 bytes와
native DOM marker를 비교할 수 있다. 브라우저에서의 사진 클릭·dialog·접기·복귀·분기 선택·
단축키·공유 상태·연출·새 문맥 재열기는 각 실제 화면에서 별도 확인한다. 이 문서는 기능 전수
목록과 소스/입력 연결이며 모든 항목의 미감·동작·공개 권한 통과증이 아니다.
