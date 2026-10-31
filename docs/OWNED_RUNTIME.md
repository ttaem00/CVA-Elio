# Elio 소유 표현 runtime

이 소스는 CVA의 공개 저작 계약에서 새로 작성한 구현이다. Forma 원본 코드·CSS·예시·
이미지를 읽거나 복사하지 않는다. 사적인 원형 키트의 126개 항목을 재배포한 사본이 아니다.
기존 `forma-pattern` 모듈과 저장 문서의 실제 입력 경계를 재사용하기 위해 기술 이름
`FW_CATALOG`, `FW_CONTENT`, `FormaWeb`, `FW_INIT`, `FW_BUNDLE`을 지원한다.

`catalog.js`가 17개 관계 계열에 연결된 자체 표현 34개를 선언한다. 정확한 지원 ID,
계열, engine, variant는 `ELIO_OWNED_RUNTIME.patterns`에서 조회한다. 알려지지 않은 ID,
engine/variant 불일치와 구현하지 않은 계산·분포·불확실성 모델은 오류로 남긴다.
고급 원형의 이름만 가져와 같은 카드로 바꿔 성공 처리하지 않는다. 다축 분류 `axes`와 별도 펼침 `mode`도 현재 지원하지 않으며 명시적으로 거부한다. 좌표 주석은 표현 하나에 공통 이미지 하나를 사용한다.

순서 목록, 방향 있는 분기·합류와 관계 지도, 순환, 중첩 포함, 분류, 원본별 시간 기록,
관측 비교표, 부호 있는 막대와 원자료 표, 좌표 투영, 상태 표식, 주·보조 편집 구획,
이미지 순서와 캡션, 좌표 주석표, 근거 전개, native details와 관계 선택을 제공한다.
선의 의미·조건은 별도 표에서 읽고, 화면 배치·간격을 실제 시간·인과·거리로 주장하지 않는다.
같은 축의 0과 음수, null/미기록을 구분한다. 공간 표현은 명시한 x/y 없이 렌더하지 않는다.
관계 지도 안의 순환 연결도 보존하며 원형 배치만으로 과정의 반복을 새로 주장하지 않는다.
명시한 `observations`에서 빠진 비교 칸은 항목의 기본값으로 채우지 않고 미기록으로 남긴다.
좌표 주석은 표현 하나에 공통 이미지 하나를 사용한다. 다른 이미지들을 같은 주석표에
넣으면 명시적으로 거부하며, 각각 별도 표현으로 작성한다. 이미지가 없는 주석 seed는
좌표와 설명의 편집 입력으로 표시하고 완성된 이미지 주석이라고 부르지 않는다.

`content.js`는 창작 예제만 만든다. 저장한 section을 임의로 바꾸지 않는다. 공용 모듈의
private `defaultExample()`은 공개 조립에서 사용하지 않고 이 자체 seed를 소비한다.
기존 공개 템플릿이 요구하는 항목 모양은 fork4, taxonomy6, network4, branch3,
parallel4, evolving5다. 공개 템플릿·장면 adapter의 나머지 media/문구 투영은 package owner가 맡는다.

브라우저 로딩 순서는 `catalog.js`, `engines.js`, `editorial.js`, `data-engines.js`,
`story-data.js`, `content.js`, `bundle.js`, `assets-data.js`다. CVA의 기존 scoped
CSS와 함께 `FW_BUNDLE.css`를 넣어야 한다. public package의 원본 preview는 별도 자체
`index.html`을 사용하며 private Forma의 index나 studio를 포함하지 않는다.

소스와 export의 상호작용은 같은 `FW_INIT`에서 파생한다. `FW_INIT(root)`는 dispose를 반환한다.
상태는 해당 DOM의 일시적인 선택이며 저장·서버·원자료를 바꾸지 않는다. 이미지와 폰트의
실제 파일·출처·포함 범위는 package의 명시 recipe와 고지가 소유한다.

저장소 루트에서 `node scripts/smoke.cjs`로 컴포넌트 입력, URL·문자열 처리,
페이지 모델의 HTML 조립·JSON 정규화 재열기와 등록 템플릿 렌더를 확인한다.
이 명령은 브라우저를 실행하지 않는다. 실제 Library/Studio 클릭·키보드 입력,
다운로드한 HTML의 독립 실행·JSON 파일 가져오기 흐름은 별도 브라우저 확인 대상이다.

<a id="source-maintenance"></a>
## 현재 소스와 생성 범위

라이브러리 상세의 **원본 위치·지원 범위**는 이 저장소 루트의 실제 파일로 연결된다.
기본 요소·모듈·템플릿·관계·Story 입력의 등록 경로는 `cva/library-map.js`가 모으며,
Story의 실제 예제 명령도 같은 등록 정보를 사용한다. 별도 사설 패키지의 폴더를 준비할 필요가 없다.

| 바꾸려는 것 | 읽고 수정할 소스 | 실제 소비·생성 범위 |
| --- | --- | --- |
| 작업 화면의 색·간격·선택·초점·피드백 | [`design/foundations.css`](../design/foundations.css) | Library·Studio와 가이드의 `--elio-*`. 출력 문서에는 자동 삽입하지 않음 |
| 만드는 페이지의 스타일 | [`cva/tokens.js`](../cva/tokens.js), [`cva/module-styles.css`](../cva/module-styles.css) | 제작실·미리보기·출력 renderer가 소비하는 profile과 `--cva-*` |
| 기본 요소와 조합 입력 | [`cva/components.js`](../cva/components.js), [`cva/modules.js`](../cva/modules.js)와 각 registry | 실제 HTML 함수·정규화·등록 구성. Story 공유 구간은 아래 생성기로 갱신 |
| Story 공유 가이드 | `tools/elio_preview/components/reader_guide_templates.json` | `build_elio_guides.py` → `cva/components.js`의 지정된 가이드 구간 |
| Story 원형 CSS·장면 shell·hero | `tools/elio_preview/style.css`, `components/reader_guides.css`, `components/scene_shell.html`, `template.html` | `build_elio_reader.py` → `cva/module-renderer.js`의 지정된 reader 구간 |
| 시간 지도 templates·geometry·CSS·adapter | `tools/elio_preview/components/`의 지도 소스와 [`map-adapter.js`](../map-adapter.js) | `build_elio_map.py` → 루트 `engines.js`의 지정된 지도 구간 |
| Board의 화면·저작 코드 | [`tools/elio_board/app/`](../tools/elio_board/app/) | 기존 `python -m tools.elio_board build --input … --output …`가 명시한 출력 폴더에 생성 |

Story 원자료를 고쳤다면 저장소 루트에서 `python scripts/build_sources.py`를 실행한다.
이 명령은 위 `build_elio_guides.py`, `build_elio_reader.py`, `build_elio_map.py` 세 생성기만 호출한다.
`--check`는 해당 삽입 구간이 원자료와 일치하는지 확인한다. 다른 CSS·토큰·registry를
자동 갱신하거나 전체 화면의 동작을 검사하는 명령이 아니다.

`design/tokens.js`, `design/components.js`, `design/cva.css`는 공용 호환 소스이며 `cva/`에도
같은 이름의 소비 사본이 있다. 현재 두 경로가 같은 값을 제공하더라도 별도 파일이다.
`build_sources.py`는 이 세 쌍 전체를 복사하지 않으며, Story 가이드 생성기는
`cva/components.js`의 지정된 구간만 갱신한다. 공통 API·값을 바꾸면 해당 소비 사본과
소개 화면·기존 smoke의 사용 범위를 함께 확인한다. 파일명만 보고 한쪽 변경이 모두 반영됐다고
판단하지 않는다.

### 파일 형식·기술 버전·반영 상태

| 표시 | 뜻 | 확인할 곳 |
| --- | --- | --- |
| `cva.page.v2` | 페이지 제작실의 편집 JSON 형식 | [`CVA_MODULES.normalizeDocument`](../cva/modules.js) |
| `CVA_MODULES.version`, `CVA_EXPORTER.version` | 각 API에 붙인 기술 버전 | [`modules.js`](../cva/modules.js), [`exporter.js`](../cva/exporter.js) |
| `cva-preserved-product-system.v1` | 관찰한 호환 profile 묶음의 식별자 | [`tokens.js`](../cva/tokens.js) |
| `elio-owned.v1` | 자체 관계 registry의 식별자 | [`catalog.js`](../catalog.js) |
| `lab: true` | 명시적으로 등록한 실험적 표현 | 해당 요소 등록과 라이브러리의 같은 표기 |
| Git 커밋·기본 브랜치 | 확인 중인 소스의 상태 | 이 저장소의 커밋과 변경 내용 |
| 실제 서비스 반영 | 실행 중인 환경에 적용된 상태 | 별도의 배포·실행 확인 |

이 표의 기술 식별자를 하나의 Elio 제품 릴리스 번호로 합치지 않는다. `manifest.json`의 후보
상태·hash는 추출 당시 기록이며 현재 컴포넌트의 안정성 인증이 아니다. 실험 표기가 없는
항목도 사용하는 환경에서 확인한다. 새 안정성 등급을 등록하거나 저장 형식을 바꾸지 않는다.

Studio의 편집 JSON은 페이지 제작실에서 다시 연다. Story의 이야기·원문 입력은
[`scripts/render_story.py`](../scripts/render_story.py)와 [Story 작성 안내](STORY_AUTHORING.md)를,
Board의 문서는 해당 Board 가져오기 계약을 사용한다. 이름이 비슷하다는 이유로 형식을
서로 바꾸거나 한 도구의 입력이 다른 도구에서도 열린다고 안내하지 않는다.

결과물의 로고·사이트·저장소 표시는 [기존 브랜드·이용 기준](BRANDING.md)에 따라 생략할 수 있다.
현재 페이지 exporter는 footer 링크를 기본 포함한다. 이 정책은 Studio에 출처 표시 토글이
있다는 뜻이 아니며, 코드·패키지 자체의 재배포 고지와는 구분한다.

이 소유 코드는 공개 패키지에 동봉된 TTaem CVA Source-Available License 1.1을 따른다.
외부 라이선스의 원래 권리를 재지정하지 않는다.

### 2026-10-30 원래 Elio 템플릿의 실제 공유와 매체 중립화

앞선 profile 적용은 색·타이포그래피만 바꾸고 Studio의 별도 DOM을 유지했다. 이를 실제
원형 소비로 보고한 해석은 철회한다. `components/scene_shell.html`을 원래 Python Story
renderer와 Studio의 Elio adapter가 함께 사용한다. `build_elio_reader.py`는 원래
`template.html`의 hero 머리와 `style.css` 전체 bytes를 source hash와 함께 renderer에
재현 가능하게 묶는다. 새 색 테마를 원형 재사용으로 대신하지 않는다.

모든 등록 페이지·section의 Elio profile은 이 원래 reader CSS와 페이지/hero/ending
구도를 소비한다. 명시 장면 순서에는 공용 scene shell의 원형 이미지·회색 축·교차 본문을
사용한다. 수치·비교·분기·분류·공간은 각 원래 데이터 renderer를 보존한다. 별도 관계를
선형 사건으로 바꾸지 않으며 가로 보기의 명시 선택은 유지한다. CSS는 해당 reader에
`@scope`로 한정하고 동작은 기존 CVA mount/dispose를 유지한다. Story의 전용 spoiler,
관점·다시보기 controller를 일반 CVA 입력에 있는 것처럼 표시하지 않는다.

공개 스킬/저작 문서는 스토리게임·드라마·영화·소설·만화의 판본·구간·페이지·패널·
타임코드 근거를 구분한다. `source_lines`의 실제 정수 줄 계약과 원문 hash는 유지하고
게임 전용 수치·방송/VOD 연결은 선택 사항으로 다룬다. 공개 seed의 사적 작품 대사를
인물명만 바꿔 창작물로 표시하지 않고 해당 seed 전체를 소유한 창작 장면으로 교체한다.

CSS 격리의 공식 비교 근거: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40scope
DOM 순서를 CSS 배치로 바꾸지 않는 원칙은 GoogleChrome modern-web-guidance css-layout
자료와 비교했다. 새 framework나 원본 제한 vendor를 추가하지 않는다.

