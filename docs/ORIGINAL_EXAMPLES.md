# 기존 작품 예제

공용 Elio 스킬은 여러 매체에 적용한다. 기존 작품 예제는 실제 내용과 연출을 그대로
보여 준다. 범용 스킬을 만들기 위해 이미 완성된 작품 예제를 다른 내용으로 바꾸지 않는다.

| 기존 완성본 | 동봉 경로 | 보존한 내용 |
| --- | --- | --- |
| 명조 3장 5막 「어젯밤의 뭇별들」 · 기억 테이프 | `storytimeline/wutheringwaves/ch3-act5/index.html` | 본문·사진·관계도·기억 테이프·카메라·다시보기·본문 복귀 |
| 명조 3장 「엣지 드림」 · 달의 기억 | `storytimeline/wutheringwaves/ch3-side-story-edge-dream/index.html` | 본문·해설·영상·3D 포옹·카메라·마지막 장면·본문 복귀 |

두 페이지와 직접 연결된 native runtime은 기존 Elio 미리보기의 완성본 bytes다.
`ORIGINAL_EXAMPLES.json`은 선택한 파일의 경로·크기·SHA256을 기록한다. 새로 만든
대체 조형이나 창작 본문을 원본 예제의 자리에 넣지 않는다. 원래 Memory delivery
manifest의 공개 미디어 주소도 유지한다. Memory의 첫 장면·릴·사진과 Moon의 영상·모델은
각 원래 runtime이 선택한다. 별도 AI 재작성·영상 재생성·카메라 재해석은 하지 않는다.

게임 영상·이미지·대사 등은 원래 권리자에게 귀속한다. 명조: 워더링 웨이브는
KURO GAMES의 작품이며, 엣지 드림의 제휴 작품·인물도 각 원래 권리를 유지한다.
이 예제의 포함은 제3자 미디어에 CVA 소프트웨어 라이선스를 부여하지 않는다.
Memory의 SOURCE-ATTRIBUTION.txt·THIRD_PARTY_NOTICES.txt와 Moon의 THREE_LICENSE.txt를
각 runtime과 함께 보존한다. 기존 원문·영상 출처는 각 본문의 근거 링크를 따른다.

이 스냅샷은 관리자가 지정한 기존 예제의 분리 준비다. 기존 작품의 공개 승인·저장 상태를
변경하거나 운영 사이트에 새로 게시하지 않는다. 다른 작품은 공통 Story 입력 계약과
자신의 자료·연출을 사용하며 이 두 작품의 이름·카메라·세계관을 기본값으로 상속하지 않는다.

## 기존 최적화 자산

기억 테이프는 검수된 compact GLB 863,360bytes와 잘라낸 SPZ 16,263,649bytes,
기존 AVIF 1080p/1440p 선택을 유지한다. 브라우저는 두 해상도를 동시에 받지 않는다.
전체 묶음은 로컬 미리보기와 각 실행 경로를 보존하며 단일 실행 다운로드량과 다르다.
달의 기억도 기존 압축 GLB·MP4 파생본을 유지한다. 현재 scene.json·영상 목록에서
참조하지 않는 이전 embrace-static.glb.gz·hero.webp·cut-love.mp4는 제외했다.
제외한 파일의 hash는 snapshot에 남긴다. 원래 runtime 저장소의 파일은 수정하지 않는다.
