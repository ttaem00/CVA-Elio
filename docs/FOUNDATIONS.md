# Elio 디자인 기준

**같은 의미는 같은 기준으로 읽히고 작동합니다.** 라이브러리에서 구성을 고르고,
페이지 제작실에서 내용을 편집할 때도 주행동·선택·포커스·상태의 역할은 같습니다.
라이브러리의 숲색과 제작실의 네이비·황동은 각 화면의 분위기로 이어갑니다.

[시각적 사용 가이드](../examples/foundations.html) · [제작과 읽기 흐름](S6_FLOWS.md) · [입력 오류·편집 초점·복귀 관계](S7_RESILIENCE.md) · [행동과 상태](../examples/ui-states.html) · [브랜드와 이름](BRANDING.md)

## 1. 작업 화면과 만드는 페이지

| 범위 | 실제 소비 소스 | 바뀌는 것 | 유지할 것 |
| --- | --- | --- | --- |
| Elio 작업 화면 | [`design/foundations.css`](../design/foundations.css) | 라이브러리·제작실의 표면과 조작 표현 | 행동의 이름, 선택과 포커스의 구분, 실제 결과 안내 |
| 만드는 페이지의 profile | [`cva/tokens.js`](../cva/tokens.js), [`cva/module-styles.css`](../cva/module-styles.css) | 콘텐츠의 색·타이포·밀도·표현 방식 | 내용·순서·관계·시간·출처와 저장 형식 |
| 원래 Story·Board | [Story 저작 계약](STORY_AUTHORING.md), [원본 템플릿](ELIO_TEMPLATE_COVERAGE.md) | 해당 기능에서 지원하는 명시적 보기 | 원래 작품·이미지·입력과 복귀 경로 |

`tokens.js`의 앞선 제품 profile 수치는 관찰한 호환 기준입니다. 실제 조합 페이지에는
`module-styles.css`의 본문·간격·반경과 Story 원형 규칙이 함께 적용됩니다.
예를 들어 ttaem의 관찰 반경 10px를 모든 조합 페이지의 반경으로 안내하지 않습니다.
최종 결과는 실제 renderer로 확인하며, 공통 본문 크기가 각 profile의 의도를 덮어쓰지 않습니다.

[`design/tokens.js`](../design/tokens.js)도 같은 호환 값을 제공합니다. 실제 Library·Studio와
이 가이드의 스타일 비교는 `cva/tokens.js`를 소비합니다. 두 파일은 별도 사본이며
`build_sources.py`의 자동 동기화 대상이 아닙니다. 공통 값을 바꿀 때는
[소비 경로와 생성 범위](OWNED_RUNTIME.md#source-maintenance)를 함께 확인합니다.

**페이지 스타일을 바꾸어도 편집 도구 자체의 색은 바뀌지 않습니다.** 라이브러리와 제작실은
`--elio-*`, 만들어지는 페이지는 기존 `--cva-*`를 사용합니다. `foundations.css`는
Story·Board 원형이나 독립 HTML exporter에 새 의존성으로 삽입하지 않습니다.

## 2. 값 → 의미 → 컴포넌트

| 층 | 예시 | 사용하는 곳 |
| --- | --- | --- |
| 기본값 | `--elio-forest-950`, `--elio-brass-300`, `--elio-space-3` | 정본 안에서 실제 사용 중인 색과 간격을 정의 |
| 의미 | `--elio-text`, `--elio-text-muted`, `--elio-action`, `--elio-selected-bg`, `--elio-focus` | 화면의 본문, 보조 설명, 행동, 선택, 포커스 |
| 컴포넌트 역할 | `--elio-control-height`, `--elio-control-gap`, `--elio-feedback-icon-size` | 버튼·필드·피드백의 조작 영역과 정렬 |

선택은 사용자가 고른 대상을, 포커스는 키보드로 조작할 대상을 나타냅니다. 같은 강조색을
사용하더라도 역할을 합치지 않습니다. 선택에는 경계·밑줄·확인 표시 등 형태가 남고,
포커스에는 바깥 윤곽이 나타납니다. 상태는 아이콘과 실제 문장으로 함께 전달합니다.

구조를 나누는 얇은 구획선은 `--elio-border`, 입력·버튼을 알아보게 하는 경계는
`--elio-border-control`입니다. 두 선을 같은 약한 대비로 취급하지 않습니다.

### 새 작업 화면에 적용

```html
<link rel="stylesheet" href="../design/foundations.css">
<section data-elio-shell="library" aria-labelledby="action-title">
  <h2 id="action-title">필요한 구성을 고르세요.</h2>
  <label for="scene-name">장면 이름</label>
  <input class="elio-input" id="scene-name" type="text">
  <button class="elio-button" data-tone="primary" type="button">구성 선택</button>
  <p class="action-feedback" role="status" aria-live="polite" aria-atomic="true"></p>
</section>
```

이 예시의 버튼은 시각·접근성 구조를 보여 줍니다. 실제 작업은 해당 화면의 처리 함수에
연결해야 합니다. 상태를 표시할 때는 `library-interactions.js`의 기존 `run` 함수와 실제
작업의 Promise를 연결합니다. 시간 경과만으로 성공을 표시하지 않습니다.

- `data-elio-shell="library"`: 숲색 작업 화면. `guide`도 이 역할 값을 기본으로 사용합니다.
- `data-elio-shell="studio"`: 네이비·황동 작업 화면. 중첩한 예시 영역에도 적용할 수 있습니다.
- `.elio-button`: 보조 실행 또는 행동 링크. 주행동에는 `data-tone="primary"`를 붙입니다.
- `.elio-input`, `.elio-select`: 이름이 연결된 입력. 오류 문장에는 `aria-describedby`를 연결하고 입력에는 `aria-invalid="true"`를 사용합니다.
- `.elio-choice[aria-pressed]`: 실제 선택 상태를 바꾸는 버튼. 실행 코드는 `aria-pressed`와 실제 선택을 함께 갱신합니다.
- `.elio-link`: 목적지가 있는 이동 링크. 새 탭이면 그 사실을 이름 또는 보조 문구로 알립니다.
- `.action-feedback` 또는 `.elio-feedback`: 실제 `data-state="pending|success|error"`를 표현합니다. 정적 예시에는 `data-static`을 붙이고 예시임을 문장으로 밝힙니다.

컨트롤 최소 높이 44px, 기본 기능 아이콘 18px, 포커스 3px와 바깥 간격 3px를 공유합니다.
아이콘만 있는 버튼은 폭도 충분히 확보하고 `aria-label`로 행동을 이름 짓습니다.
일반 텍스트 링크와 데이터 행을 모두 버튼처럼 만들지는 않습니다. 원본 이미지와 브랜드 표식은
[브랜드 아이콘 가이드](../examples/brand-icons.html)의 크기·비율을 따릅니다.

움직임 감소 설정에서는 공용 전환과 진행 회전을 중지합니다. 강제 색상 모드에는 시스템
색과 명시적 경계를 사용합니다. 이러한 소스 규칙은 실제 브라우저·키보드 검증을 대신하지 않습니다.

## 3. 8개 profile은 목적을 고르는 묶음

기술 ID와 저장한 파일을 보존합니다. 아래 이름은 기존 profile의 용도 설명이며 새 제품 이름이 아닙니다.

| 기존 ID | 용도 | 달라지는 표현 |
| --- | --- | --- |
| `ttaem` | CVA의 기록과 도구 소개 | 네이비, 종이색 글, 황동 강조 |
| `elio` | Elio Story의 장면 읽기 | 밝은 바탕, 장면·축과 원래 reader 표현 |
| `editor` | 조밀한 작업·비교 정보 | 청색 선택, 작은 간격과 편집용 위계 |
| `forma` | 자료와 관계를 설명하기 | 밝은 면, 초록 강조와 여유 있는 정보 구성 |
| `cham` | 큰 글씨의 설명·인포그래픽 | 베이지·주황, 큰 제목·수치·보조 설명 |
| `folio` | 긴 문장과 에세이 | 종이색, 세리프 제목, 긴 읽기 호흡 |
| `signal` | 핵심을 빠르게 읽는 포스터 | 각진 면, 굵은 제목, 선명한 강조 |
| `mist` | 여유 있게 읽는 차분한 구성 | 낮은 채도, 부드러운 면, 넓은 여백 |

처음에는 만들 내용에 맞는 profile을 고르고, 필요한 경우에만 강조 팔레트·본문 폭·내용 간격을
조정합니다. 팔레트는 forest·violet·ocean·amber 네 기존 ID를 사용합니다.
색을 바꾸어도 성공·실패나 순서·인과를 새 의미로 해석하지 않습니다.
모든 profile이 단순한 색 테마인 것은 아닙니다. 특히 Story는 원래 reader 표현을,
cham은 큰 설명용 크기를 함께 선택합니다.

## 4. 기본 요소와 Elio 고유 패턴

| 요소·패턴 | 언제 쓰나 | 상태와 키보드 | 필요한 내용·정본 |
| --- | --- | --- | --- |
| 행동과 이동 | 실행하거나 다른 내용으로 갈 때 | 실행은 button, 이동은 href가 있는 a. 진행·실패 후 같은 행동으로 복구 | 행동 이름·목적지·실제 결과. [행동 링크](../cva/library.html?item=component%3Abutton), [실행 상태](../examples/ui-states.html) |
| 입력 | 작성자가 내용을 바꿀 때 | label, 힌트·오류 연결, native input/select. 오류를 색만으로 알리지 않음 | ID·이름·값·지원 선택지·오류. [입력 필드](../cva/library.html?item=component%3Afield) |
| 부분 탐색 | 페이지 안의 구역으로 이동할 때 | 기존 `CVA_COMPONENTS.tabs`는 native anchor이며 가짜 ARIA tab을 붙이지 않음 | 실제 존재하는 구역 ID·이름·현재 위치. [부분 탐색 링크](../cva/library.html?item=component%3Atabs) |
| 대화상자 | 현재 작업을 유지하며 파일 열기·내보내기를 정할 때 | 기존 dialog의 열기·닫기·취소 흐름 유지. 새 대화상자는 닫힌 뒤 실행 위치로 복귀 | 목적·확정할 행동·취소 경로. [페이지 제작실](../cva/index.html)의 실제 파일·내보내기 흐름 |
| 장면 카드 | 한 장면의 제목·그림·설명을 읽을 때 | 카드를 클릭 가능하게 만들면 실제 목적지와 이름 제공. 장식 카드에 임의 tabstop 추가 금지 | 장면 ID·제목·본문·등록 이미지. [내용 패널](../cva/library.html?item=component%3Apanel), [Story 입력](STORY_AUTHORING.md) |
| 원문과 근거 | 설명을 확인하거나 원자료로 돌아갈 때 | 실제 링크, 확인한 원문 위치, 펼친 뒤 원래 장면으로 복귀 | 인용·해석·미확인 구분과 실제 출처. [이야기 저작](STORY_AUTHORING.md#현재-입력-계약에-출처를-연결합니다) |
| 관계 범례 | 선·그룹이 어떤 관계인지 알릴 때 | 색에 선 모양·문장·범례를 함께 사용. 선택한 항목과 연결된 항목을 구별 | 명시한 edge·membership·관계 이름. [지원 입력](OWNED_RUNTIME.md) |
| 시간과 순서 | 읽는 흐름·사건·영상 위치를 표시할 때 | 같은 폭 숫자와 단위·기준을 함께 읽음. 실제 재생 링크만 조작 가능 | 아래 네 시간 기준과 각 소유자·단위·근거 |
| 펼침과 복귀 | 설명·근거를 추가로 읽을 때 | native details 또는 원래 reader controller. Escape·닫기·포커스 복귀는 해당 controller 계약 | 대상 ID·제목·펼친 내용·복귀 위치. [원본 템플릿](ELIO_TEMPLATE_COVERAGE.md) |
| 선택과 관련 강조 | 현재 편집 대상과 연결 항목을 구별할 때 | 실제 선택만 pressed/selected/current 상태. 관련 항목을 선택된 것으로 표시하지 않음 | 선택 ID와 확인한 관계. 공간상 가깝다는 이유로 연결을 만들지 않음 |
| 미확인과 해석 | 근거가 부족하거나 작성자의 관점일 때 | 확인한 사실·해석·미확인을 문장으로 표시 | 현재 schema가 받는 출처·상태 필드. 새 필드를 임의로 저장하지 않음 |

이 표는 지원하는 각 컴포넌트의 계약을 연결합니다. 모든 패턴에 새 공통 컨트롤러가 추가되었다는
의미가 아닙니다. 실제 입력 형식·허용 값·동작은 연결한 정본을 사용합니다.

## 5. 네 시간 기준과 관계의 의미

| 기준 | 뜻 | 혼동하지 않을 것 |
| --- | --- | --- |
| 읽는 순서 `reading-order` | 이 페이지가 내용을 소개하는 순서 | 화면 간격을 경과 시간으로 읽지 않음 |
| 작품 속 시간 `story-time` | 작품 안에서 사건이 일어난 시각·순서 | 공개 순서와 다를 수 있음. 모르는 시각·동시성은 만들지 않음 |
| 원본 영상 `source-replay` | 특정 원본 영상의 확인한 재생 위치 | 다른 영상의 시계와 합치지 않음 |
| 편집 결과 `result-sequence` | 편집한 결과에서의 누적 위치 | 원본 시각을 그대로 결과 시각으로 표시하지 않음 |

순서·인과·관련·분기·합류·포함은 각각 명시된 의미를 가집니다. 배치·색·선의 아름다움을 위해
내용에 없는 관계·수량·시간을 추정하지 않습니다. 출처를 열지 않은 요약을 원문으로 부르지 않습니다.

## 6. 새 표현을 추가할 때

먼저 현재 컴포넌트와 명시된 입력을 고릅니다. 작업 화면이라면 공용 shell 의미를,
출력 콘텐츠라면 기존 page profile과 `--cva-*` 역할을 사용합니다. 색·포커스·상태를
새 CSS 값으로 다시 복제하기 전에 정본에 해당 역할이 있는지 확인합니다.

기본 컴포넌트의 생성 HTML과 CSS는 함께 확인합니다. `CVA_COMPONENTS.button`의
`tone: 'secondary'`는 `.cva-button-secondary`를 출력하며, primitive CSS는 이 클래스와
기존 `.cva-button.secondary`를 모두 지원합니다.

수정 후 `node scripts/smoke.cjs`로 기존 컴포넌트와 모델·출력·재열기를 확인합니다.
profile을 바꾸는 작업은 내용·관계·시간·출처를 보존하는지도 확인합니다. 브라우저에서
보지 못한 포커스·키보드·넘침·클립보드 권한은 검증 완료로 표시하지 않습니다.

라이브러리의 카드와 상세 제목 곁에는 등록 정보가 있는 항목만 **실험적 표현**으로 표시합니다.
현재 이 표기는 요소의 기존 `lab` 값에서 읽으며 저장 입력이나 이름을 바꾸지 않습니다.
해당 표현은 정지 상태로 시작해 사용자가 명시적으로 켭니다. 표기가 없는 항목도 적용 환경에
맞는 확인이 필요하며, 등록 여부를 안정성·접근성 검증 완료로 해석하지 않습니다.

첫 페이지의 구성 선택은 [기존 템플릿](../cva/library.html?kind=template), 공용 화면의 적용은
위 사용 기준, 소스 유지보수는 [현재 소스와 생성 범위](OWNED_RUNTIME.md#source-maintenance)에서
시작합니다. API와 파일 형식의 버전, 현재 커밋, 실제 서비스 반영도 해당 안내에서 구분합니다.
