# Elio · CVA 디자인 시스템

![TTaem CVA](assets/logo.svg)

[ttaem.com](https://ttaem.com) · [cva-elio 원본 저장소](https://github.com/ttaem00/cva-elio)

정보의 관계를 먼저 정하고, 읽기·선택·근거·복귀를 함께 만드는 디자인 시스템입니다.
Elio Story는 이야기 읽기와 저작, Elio Board는 이야기·도감의 보드를 뜻합니다.
공식 공개 소스는 [ttaem00/cva-elio](https://github.com/ttaem00/cva-elio)에서 제공합니다.

## 바로 확인하기

Python 3.12 이상과 Node.js 22 이상을 사용합니다. 미리보기에는 로그인이 필요 없습니다.
원본 Story renderer의 Python 의존성은 먼저 설치합니다.
실제 raster 이미지의 검증에는 requirements.txt에 포함된 Pillow를 사용합니다.

```text
python -m pip install -r requirements.txt
python scripts/demo.py --check
node scripts/smoke.cjs
python -m http.server 8798 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:8798/`를 열고 창작 이야기 예제를 읽습니다.
편집은 `examples/story.json`·`source.json`·`connections.json`의 원래 계약과
`docs/STORY_AUTHORING.md`를 따릅니다. 위 파일의 입력을 바꾸는 경우
`scripts/demo.py`는 고정 예제를 재생성하므로 편집한 입력에 직접 renderer를 사용합니다.

```text
python scripts/render_story.py --input examples/story.json --source examples/source.json --connections examples/connections.json --output my-story.html
```

`design/tokens.js`는 8개 기존 스타일·4개 색상 조합을, `components.js`는 escape된
기본 요소를 제공합니다. 공개 저작 스킬은 `skills/elio/`와 `skills/elio-story/`입니다.
HTML 생성과 로컬 파일 저장은 웹 게시와 별개입니다. 필요한 원문·이미지·인용 권리를
확인하고 사용자가 검토·명시적으로 저장한 뒤 별도 도구에서 공개합니다.

## 포함되는 기능

- Elio 소유 관계 표현: 순서·분기·합류·순환·위계·관계·시간·비교·수치·공간 등17계열의 독립 구현입니다. 원래 Forma의 소스·스타일·예제는 포함하지 않습니다. 정확한 지원 ID와 한계는 docs/OWNED_RUNTIME.md를 따릅니다.
- Library에서 탐색하고 Studio에서 편집한 뒤 미리보기·JSON·독립 HTML로 보관하고 다시 여는 기존 CVA 경로입니다. `cva/library.html`과 `cva/index.html`을 엽니다.
- CVA 소유 토큰·기본 요소·UI 요소·모듈·section·페이지 template·장면 구도와 허용된 MIT 의존성입니다.
- Elio Story의 기존 renderer·관점·시간지도·관계도·장면 탐색·원문 근거와 창작 예제입니다.
- Elio Board의 자체 DOM·CSS·포인터 카드, 네 보기·모션 감소·편집·JSON/독립 HTML 출력입니다. `board/index.html`에서 창작 도감을 엽니다.
- CVA 로고·OFL Pretendard·직접 작성한 SVG·원본 참조 없이 생성한 창작 이미지입니다.

편집한 module JSON은 다음 명령으로 새 독립 HTML에 렌더합니다.

```text
node scripts/render_cva.cjs --input my-page.cva.json --output my-page.html
python -m tools.elio_board build --input examples/board.catalog.json --output new-board
```

Memory/Moon은 기존 명조3장5막·엣지 드림의 완성본과 필요한 native runtime을 그대로 동봉합니다. [기존 작품 예제](docs/ORIGINAL_EXAMPLES.md)의 경로·해시·권리 고지를 따릅니다. Forma 원본·Aceternity 구현·TimerLink fixture와 무관한 운영 자료는 포함하지 않습니다. 스킬·컴포넌트·정적 예제의 존재가 자동 수집·번역·공개 게시를 지원한다는 뜻은 아닙니다. 정확한 브랜드·범위는 docs/BRANDING.md를 따릅니다.

## 이용과 기여

**TTaem CVA Source-Available License 1.1**입니다. OSI 승인 오픈소스 라이선스가 아닙니다.
비상업적 이용·수정·파일 재배포를 허용하며, 자기 방송 요약 예외 이외의 상업 이용과
유·무료 타인 대상 호스팅·생성 대행에는 별도 서면 허가가 필요합니다.
프로그램 자체의 재배포에는 로고·사이트·원본 저장소 세 가지 출처를 유지합니다.
**Elio로 만든 모든 결과물의 로고·링크 표시는 권장 사항이며 생략할 수 있습니다.**
상업 이용·재배포·기여 정책은 Loki와 같고, 결과물 출처 표시는 이 프로젝트에서 완화했습니다.
[LICENSE](LICENSE), [POLICY.md](POLICY.md), [CONTRIBUTING.md](CONTRIBUTING.md)를
읽어 주세요. 문의: **ttaem00@naver.com**.


기존 Elio 원본은 [전체 템플릿 자료실](examples/templates/index.html)에서 고릅니다.
선형·카드·사진 흐름·분기와 합류·되돌아오는 관계·행/열 시간선·공유 공간·인물 관점·
해설6종·용어·장면 탐색·원문·영상 연결·공유·Board·준비/첫진입/링크 연출30항목을
[원본 목록과 입력](docs/ELIO_TEMPLATE_COVERAGE.md)에 연결했습니다. 실제 영상·후기에는
확인한 본인 자료를 입력하며 예제에 실제 방송을 꾸며 넣지 않습니다.

```text
python scripts/render_story.py --input examples/story.json --source examples/source.json --connections examples/connections.json --output my-reader.html
python scripts/build_sources.py --check
```

기억 테이프와 달의 기억은 전체 원본 자료실에서 각각 기존 작품의 본문·연출로 열립니다.
공통 renderer의 추가 의존성은 requirements.txt에 명시했습니다.
원형 CSS/공용 HTML을 수정했다면 `python scripts/build_sources.py`로 브라우저 source도
같이 다시 생성합니다. 제작실·HTML 출력·원래 Story가 같은 공용 템플릿을 소비합니다.

`manifest.json`은 업로드 전 생성 시점의 소스·파일 hash와 검토 후보 상태를 기록합니다.
실제 공개 여부와 최신 소스는 이 공개 저장소의 기본 브랜치·커밋으로 확인합니다.
