# Elio 브랜드와 범위

이 문서는 이 저장소의 **현재 이름·역할·화면 입구·자산 용도**를 연결하는 기준입니다.
Elio는 **CVA의 공용 디자인 시스템**이며, 소개 문구는 **“관계를 고르고, 페이지로 만듭니다.”**입니다.
기존 기술 ID·URL·JSON 형식은 보존합니다. Story의 책 심벌이나 `elio`라는 기존 기술 ID를
디자인 시스템 전체의 새 로고·새 제품으로 해석하지 않습니다.

## 이름과 화면 입구

| 이름 | 역할 | 이 저장소의 입구 |
| --- | --- | --- |
| **CVA** | Elio를 포함한 상위 브랜드 | [Elio 소개](../index.html)의 원본 로고·[ttaem.com](https://ttaem.com) |
| **Elio** | 요소·관계 표현·템플릿과 제작 흐름을 제공하는 공용 디자인 시스템 | [소개](../index.html) |
| **Elio 라이브러리** | 필요한 요소·모듈·표현을 고르는 화면 | [`cva/library.html`](../cva/library.html) |
| **페이지 제작실** | 페이지의 구성·내용·스타일을 편집하고 HTML·JSON으로 보관하는 화면 | [`cva/index.html`](../cva/index.html) |
| **Elio Story** | 장면·관점·시간·원문 근거를 따라 읽는 이야기 리더 | [창작 이야기 읽기](../examples/story.html) · [원본 전체 템플릿](../examples/templates/index.html) |
| **Elio Board** | 이야기·도감 항목과 관계를 탐색·편집하는 보드 | [`board/index.html`](../board/index.html) |

라이브러리와 페이지 제작실은 Elio 안의 작업 화면입니다. 별도 제품 이름으로 늘리지 않습니다.
Story를 읽는 입구와 전체 템플릿 목록은 다른 목적지로 표시합니다.
내부 `studio`, `forma-pattern`, `FW_*`, 기존 profile 값과 저장 문서의 식별자는 이름 정리로 바꾸지 않습니다.

## 같은 이름의 수치는 같은 목록에서

| 화면의 수치 | 집계 기준 |
| --- | --- |
| 제작실의 관계·장면 표현 전체 | `CVA_PATTERNS.enrich(FW_CATALOG)`와 `CVA_SCENES.entries`의 합 |
| 자체 관계 표현 | [`catalog.js`](../catalog.js)의 현재 등록 목록 |
| 확장 장면 표현 | [`cva/scene-catalog.js`](../cva/scene-catalog.js)의 `entries` |
| 표현 계열 | [`cva/patterns.js`](../cva/patterns.js)의 `families` |
| 요소 라이브러리 전체 | [`cva/library-map.js`](../cva/library-map.js)가 구성 단위별로 모은 항목 |

제작실의 선택 메뉴와 결과 수는 같은 실행 목록에서 계산합니다. 검색·필터 후의 결과 수는
전체 수와 함께 보여 줍니다. 요소 라이브러리는 UI 요소·모듈·템플릿 등을 함께 세므로
관계·장면 표현 수와 비교하지 않습니다. 사적 원형 키트의 과거 126개 항목은 현재 제공 수가 아닙니다.

## 자산과 기본 표현

| 자산 | 용도 | 기준 |
| --- | --- | --- |
| [`cva/assets/cva-symbol.svg`](../cva/assets/cva-symbol.svg) | 32·34px 헤더의 CVA 표식 | CVA v4 compact의 S1 중심 보정본. 64 그리드·3.2 획·16 모서리. Elio 독립 로고를 새로 만든 것이 아님 |
| [`cva/assets/cva-symbol-micro.svg`](../cva/assets/cva-symbol-micro.svg) | 16px 파비콘의 CVA 표식 | 같은 중심 보정을 적용한 micro 자산. 작은 크기에서 3.8 획 사용 |
| [`assets/logo.svg`](../assets/logo.svg) | 소개·README의 다람쥐와 워드마크 | 원본 비율을 유지하고 충분한 크기(가이드 최소 160px)로 표시 |
| `cva/assets/cva-color.svg` | 기존 원본 로고 자산 경로 | 호환을 위해 유지. 작은 헤더에서 새로 축소해 쓰지 않음 |

작은 표식은 CVA 정본 `docs/design/cva-brand-v1/media/icons/v4/`의 `cva-color.svg`와 `cva-micro.svg`에서 가져왔습니다.
S1 자산 출처는 `ttaem00/chzz-vod-analyzer`의 `91602249d9046d97eb22e7fd5f329e3174a242f5`입니다.
S1에서 마름모만 왼쪽으로 2 이동해 중심을 (32, 32)에 맞췄습니다. 고리·시작 노드·색·크기는 유지합니다.
원본 로고를 표시하는 기존 소개·재배포 고지는 유지합니다.

기본 CVA 표현은 네이비 `#141D2B`, 종이 `#FAF5EB`, 황동 `#F4BE70`을 공유합니다.
Pretendard Variable, 기본 본문 16px/1.75, 짧은 영문 인사 Georgia, 시간·수치의 고정 폭 숫자를 사용합니다.
제품별 색·밀도·본문 리듬은 [`design/tokens.js`](../design/tokens.js)의 profile별 역할을 따릅니다.
본문 16px/1.75는 공통 기본값이며 편집 화면·큰 설명 화면 등 명시된 profile 값을 덮어쓰는 규칙이 아닙니다.
포커스와 의미는 색만으로 전달하지 않으며 모션 감소 설정을 존중합니다.

## 소스와 반영 상태

이름·자산 용도는 이 문서, 실제 표현 목록은 위 등록 소스, 동작 계약은
[소유 표현 runtime](OWNED_RUNTIME.md)과 [이야기 저작 안내](STORY_AUTHORING.md)를 따릅니다.
`manifest.json`의 후보 상태와 hash는 추출 당시의 기록입니다. 현재 소스는 검토 중인
브랜치·커밋을 확인하고, 기본 브랜치 병합과 실제 웹 서비스 반영은 각각 확인합니다.
문서나 소개 문구를 고친 것만으로 배포 완료·공식 제휴·기능 검증을 주장하지 않습니다.

## 출처와 제공 범위

Elio로 만든 모든 결과물의 로고·ttaem.com·cva-elio 원본 저장소 표시는 권장 사항이며 생략할 수 있습니다. 기본 표시를 제거해도 허용된 결과물 사용·공유 권한을 잃지 않습니다. 코드·패키지·스킬 자체의 재배포에는 세 가지 출처와 이용허락·저작권·제3자 고지를 모두 유지합니다. 자발적으로 로고를 사용하면 원형·색·비율을 보존하며 공식 제휴·보증을 뜻하지 않습니다. 정확한 조건은 LICENSE를 따릅니다.

이 저장소는 CVA 소유 관계 엔진·라이브러리·페이지 제작실·자체 Board 카드와 기존 Story 소스를 제공합니다. Forma 원본 코드·Aceternity 구현·TimerLink fixture는 포함하지 않습니다. 기억 테이프와 달의 기억은 관리자가 지정한 기존 명조 작품 예제 그대로 제공하며, 게임·제휴 작품의 권리를 CVA 소프트웨어 권리와 구분합니다. 외부 서비스 로고는 문자로 표시합니다.

