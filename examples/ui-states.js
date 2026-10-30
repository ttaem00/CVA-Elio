/* A usage guide for the same icon renderer and action helper used by the library. */
(() => {
  'use strict';
  for (const slot of document.querySelectorAll('[data-ui-icon]')) {
    const size = Number(slot.dataset.iconSize) || 18;
    slot.innerHTML = CVA_LIBRARY_ICONS.render(slot.dataset.uiIcon, { size });
  }

  const copyButton = document.getElementById('copy-try');
  const text = document.getElementById('copy-text');
  const copyFeedback = document.getElementById('copy-feedback');
  copyButton.disabled = false;
  copyButton.addEventListener('click', () => CVA_LIBRARY_INTERACTIONS.run(
    copyButton,
    () => {
      if (!navigator.clipboard?.writeText) throw new Error('이 브라우저에서 클립보드를 사용할 수 없습니다.');
      return navigator.clipboard.writeText(text.value);
    },
    copyFeedback,
    {
      pending: '문장을 복사하고 있습니다…',
      success: '문장을 복사했습니다. 필요한 곳에 붙여넣으세요.',
      error: '복사하지 못했습니다. 위 문장을 직접 선택해 복사하거나 다시 시도하세요.'
    }
  ));

  const simulationButton = document.getElementById('simulate-error');
  const simulationFeedback = document.getElementById('simulation-feedback');
  simulationButton.disabled = false;
  simulationButton.addEventListener('click', () => CVA_LIBRARY_INTERACTIONS.run(
    simulationButton,
    // An explicit demonstration, never used by the actual clipboard action.
    () => new Promise((resolve, reject) => setTimeout(() => reject(new Error()), 700)),
    simulationFeedback,
    {
      pending: '시뮬레이션 진행 중…',
      error: '실패 상태의 예시입니다. 같은 버튼으로 다시 시도할 수 있습니다.'
    }
  ));
})();
