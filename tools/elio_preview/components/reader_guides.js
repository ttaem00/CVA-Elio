document.querySelectorAll('.reader-guide__disclosure, .reader-guide__sources').forEach((detail) => {
  detail.addEventListener('toggle', () => {
    const guide = detail.closest('.reader-guide');
    guide?.classList.toggle('is-disclosure-active', detail.open);
  });
});

// A related-scene link must also work when the original article is in the
// compact reader, or when the URL already names that scene (no hashchange).
document.querySelectorAll('.reader-guide__scene').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const id = link.hash.slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    const reader = document.querySelector('.story-tree')?.storyReader;
    event.preventDefault();
    if (reader?.compact) { reader.show(id); return; }
    lockSceneNavigation(); setCurrentScene(id);
    history.replaceState(null, '', `#${id}`);
    scrollToScene(target);
    const heading = target.querySelector('.scene-title a');
    if (!sceneIsCovered(target)) heading?.focus({ preventScroll:true });
    else target.querySelector('.spoiler-cover')?.focus({ preventScroll:true });
  });
});
