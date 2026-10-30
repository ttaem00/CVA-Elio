// Catch the remote module graph before the viewer's own initialization begins.
// Network exception strings may contain remote URLs; readers get one safe message.
const requested=new URLSearchParams(location.search).get('render');
  const selection=requested==='film'?null:requested;
document.documentElement.dataset.memoryBootAtMs=String(performance.now());
// Explicit Canvas2D playback needs no WebGL context or GPU-process handshake.
const loaded=selection==='images'?import('./image-viewer.js?v=15156a69d6f7'):import('./render-policy.js?v=172df03b4e0f').then(({rendererProfile}) => {
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl2',{powerPreference:'high-performance'})||canvas.getContext('webgl');
  const debug=gl?.getExtension('WEBGL_debug_renderer_info');
  const name=gl?(debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):'WebGL unavailable';
  document.documentElement.dataset.webglRenderer=name;
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
  const reference=['gaussian','lod-reference'].includes(selection);
  const images=selection==='images'||!reference&&selection!=='film'&&(!gl||rendererProfile(name).source==='prerender-video');
  if(!images&&selection!=='film'){
    // These prepare in parallel with Three and the viewer's local imports.
    // Normal viewer initialization remains the single error/readiness owner.
    import('./assets.js?v=0ecce3eac256').then(({preloadLiveAssets})=>preloadLiveAssets()).catch(()=>{});
    import('@sparkjsdev/spark').catch(()=>{});
  }
  return import(images?'./image-viewer.js?v=15156a69d6f7':'./viewer.js?v=acd77e88280e');
});
loaded.then(() => {
  document.documentElement.dataset.memoryModuleAtMs=String(performance.now());
}).catch(() => {
  const message = '3D 모듈을 불러오지 못했습니다. 본문으로 계속 읽을 수 있습니다.';
  document.getElementById('loading').hidden = true;
  document.getElementById('error').hidden = false;
  document.getElementById('errorText').textContent = message;
  document.body.dataset.event = 'error';
  window.dispatchEvent(new CustomEvent('memory-tape:error', { detail: { message } }));
  if (parent !== window) {
    parent.postMessage({ channel: 'memory-tape', version: 1, event: 'error', message }, location.origin);
  }
});
