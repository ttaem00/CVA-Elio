/* Complete supplied context and relationships, retaining native cards and data. */
(function (global) {
  'use strict';

  function parallelInputs(section, html) {
    if (section.engine !== 'transformation-section' || section.variant !== 'input-process-output'
        || !section.outcome || !Array.isArray(section.items) || section.items.length < 2
        || html.includes('class="wf-transform-inputs"')) return html;
    // Native stages retain their complete cards and anchors. Multiple supplied
    // inputs have no edge between them; only the group flows into the operation.
    const stages = [...html.matchAll(/<div class="wf-change-stage" data-change-stage>[\s\S]*?<\/article><\/div>/g)];
    if (stages.length !== section.items.length + (section.operation ? 1 : 0) + 1) return html;
    const inputs = stages.slice(0, section.items.length);
    const start = inputs[0].index, end = inputs.at(-1).index + inputs.at(-1)[0].length;
    if (inputs.map(stage => stage[0]).join('') !== html.slice(start, end)) return html;
    const group = '<div class="wf-transform-inputs" role="group" aria-label="함께 사용하는 입력">'
      + inputs.map(stage => stage[0].replace('<span class="wf-change-next" aria-hidden="true">↓</span>', '')).join('') + '</div>';
    return html.slice(0, start) + group + html.slice(end);
  }

  function complete(section, originalHTML) {
    const escape = global.FormaWeb.escape;
    originalHTML = parallelInputs(section, originalHTML);
    let context = '';
    // These existing evidence branches format their numbers without the shared unit.
    if (section.engine === 'evidence-section' && ['two-variable-relationship', 'bounded-estimates'].includes(section.variant)) {
      const unit = section.unit ?? section.measure?.unit;
      if (unit?.trim()) context += '<p class="wd-context-note">단위: ' + escape(unit) + '</p>';
    }
    if (section.engine === 'comparison-section' && section.source?.trim()) {
      const source = '<p class="wd-source">' + escape(section.source) + '</p>';
      // Match the known native paragraph, never a string inside data-fw-meta.
      if (!originalHTML.includes(source)) context += source;
    }
    return originalHTML + (context ? '<div class="section-wrap">' + context + '</div>' : '');
  }

  global.CVA_FORMA_CONTEXT = { complete };
})(window);
