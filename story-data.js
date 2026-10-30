/* Neutral scenes for the public scene adapter; no game story or imagery. */
(function (global) {
  'use strict';
  global.FW_STORY = [
    { id:'public-arrival', title:'첫 만남', body:'창작 예제에서 여행자와 기록 담당자가 처음 만납니다.', eyebrow:'창작 예제', image:'assets/public-arrival.svg' },
    { id:'public-discovery', title:'기록의 발견', body:'창작 예제에서 두 사람이 서로 다른 기록을 확인합니다.', eyebrow:'창작 예제', image:'assets/public-discovery.svg' },
    { id:'public-return', title:'돌아와 이야기 나누기', body:'창작 예제에서 확인한 기록과 남은 의문을 나눕니다.', eyebrow:'창작 예제', image:'assets/public-return.svg' },
    { id:'public-choice', title:'두 기록을 비교하는 선택', body:'창작 예제에서 확인한 사실과 다음에 살필 자료를 구분합니다.', eyebrow:'창작 예제', image:'assets/public-choice.svg' },
    { id:'public-crossing', title:'서로 다른 관점의 교차', body:'창작 예제에서 두 관점을 나란히 읽고 차이를 남깁니다.', eyebrow:'창작 예제', image:'assets/public-crossing.svg' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
