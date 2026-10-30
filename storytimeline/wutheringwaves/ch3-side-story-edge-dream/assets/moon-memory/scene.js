import {MoonScene, Vector3, viewBounds} from './scene-runtime.js?v=1491640ae11d';
import {createMoonCamera, fitViewport} from './camera.js?v=59f1439fbbfa';
import {createFilmPlayer} from './film-player.js?v=19e6f601e90a';
import {clamp, sampleMemory, filmPhase, progressAtFilmTime, advanceLocal} from './motion.js?v=6f8da61a45e9';

const byId = id => document.getElementById(id);
const text = (id,value) => {const element=byId(id);if(element.textContent!==value)element.textContent=value;};
const session = new URLSearchParams(location.search).get('moonSession') || '';
const send = (action,target) => {
  if (parent !== window) parent.postMessage({type:'elio-moon',session,action,target},location.origin);
};
const world=byId('world'), filmCanvas=byId('film'), stage=byId('stage');
const slider=byId('progress'), caption=byId('caption'), final=byId('final');
let scene=null, film=null, disposed=false, readySent=false, modelPainted=false;
let autoplayPending=true,gpuReady=false;
let frame=0, previous=0, progress=0, auto=null, handedOff=false;
let fx=true, drag=null, yaw=0, pitch=0, filmPainted=null, visibleFilm=0;
let lastWidth=0,lastHeight=0;
let cameraRig=null,viewportDirty=true;
const viewportObserver=new ResizeObserver(()=>{viewportDirty=true;});
viewportObserver.observe(stage);
const posters=new Map(['reach','grasp','merge','imprint','ending'].map(id=>{
  const image=new Image();image.src=`assets/${id}-first.webp`;return [id,image];
}));
const sendReady=()=>{
  if(disposed||!gpuReady)return;
  byId('status').textContent='';
  byId('play').disabled=false;
  if(!readySent){readySent=true;send('ready');if(autoplayPending)togglePlayback();}
};
const scrollLength=()=>Math.max(1,document.documentElement.scrollHeight-innerHeight);
const seek=p=>window.scrollTo({top:clamp(p)*scrollLength(),behavior:'instant'});
const stop=()=>{autoplayPending=false;auto=null;film?.pause();};
const takeManualControl=()=>{autoplayPending=false;if(auto)stop();};
function togglePlayback() {
  autoplayPending=false;
  if(byId('play').disabled)return;
  if(auto){stop();seek(progress);return;}
  seek(progress);
  auto={clip:null,localReady:false};
  previous=performance.now();
}
function advancePlayback(dt) {
  const phase=filmPhase(progress);
  if(phase) {
    auto.localReady=false;
    if(auto.clip!==phase.clip) {
      auto.clip=phase.clip;
      film?.play({clip:phase.clip,time:phase.time},{rate:phase.rate});
    }
    const playback=film?.state().playback;
    if(playback?.clip===phase.clip&&Number.isFinite(playback.time)) {
      progress=progressAtFilmTime(phase.clip,playback.time);
    }
  } else {
    if(auto.clip!==null){film?.pause();auto.clip=null;}
    // Wait for the first actual model draw rather than skipping its loading time.
    if(progress>=.925||modelPainted) {
      if(auto.localReady)progress=advanceLocal(progress,dt);
      else auto.localReady=true;
    }
  }
  seek(progress);
}
function handoff(target='strange-gate') {
  if(handedOff)return;
  handedOff=true;stop();send('reader',target);
  setTimeout(()=>send('done'),850);
}

function resize() {
  if(!viewportDirty)return;
  viewportDirty=false;
  const fitted=fitViewport(stage.clientWidth,stage.clientHeight);
  world.style.width=`${fitted.width}px`;world.style.height=`${fitted.height}px`;
  const width=world.clientWidth,height=world.clientHeight;
  if(scene&&width&&height&&(width!==lastWidth||height!==lastHeight)) {
    lastWidth=width;lastHeight=height;
    // Buffer and projection adopt the same size before the next draw.
    scene.resize();
  }
}

function prepareWorld(sample) {
  if(!scene?.ready||scene.failed||!cameraRig)return false;
  resize();
  scene.character.visible=true;
  for(const row of scene.materials) {
    row.material.opacity=row.opacity;
    row.material.depthWrite=true;
  }
  cameraRig.apply({yaw:sample.yaw+yaw,pitch:sample.pitch+pitch,dolly:sample.dolly,width:lastWidth,height:lastHeight});
  const bounds=viewBounds(scene.camera.projectionMatrix,6);
  const size=bounds.getSize(new Vector3());
  const height=Math.max(size.y,size.x/(1920/810))*1.12;
  scene.plate.scale.set(height*(1920/810)/28,height/(28*810/1920),1);
  scene.plate.position.copy(bounds.getCenter(new Vector3()).applyQuaternion(scene.camera.quaternion)).add(scene.camera.position);
  scene.plate.quaternion.copy(scene.camera.quaternion);
  scene.stars.visible=false;
  scene.renderer.setScissorTest(false);
  return true;
}

function renderWorld(sample) {
  if(!gpuReady||!prepareWorld(sample))return false;
  // Memory interference belongs to the screen overlay; it never warps people.
  scene.renderer.render(scene.scene,scene.camera);
  scene.renderer.setScissorTest(false);
  world.dataset.frame=String(sample.progress.toFixed(4));
  world.dataset.buffer=`${world.width}x${world.height}`;
  const cameraDiagnostic=JSON.stringify(cameraRig.snapshot());
  if(world.dataset.camera!==cameraDiagnostic)world.dataset.camera=cameraDiagnostic;
  if(!modelPainted){byId('status').textContent='';sendReady();}
  modelPainted=true;return true;
}

function tick(now) {
  if(disposed)return;
  const elapsed=Math.max(0,(now-previous)/1000||0),dt=Math.min(.05,elapsed);previous=now;
  if(auto)advancePlayback(elapsed);
  const desired=clamp(scrollY/scrollLength());
  if(!auto) {
    progress+= (desired-progress)*(1-Math.exp(-dt*18));
    if(Math.abs(desired-progress)<.00005)progress=desired;
  }
  const sample=sampleMemory(progress);
  document.body.dataset.phase=sample.phase;
  stage.dataset.progress=sample.progress.toFixed(4);
  const filmDiagnostic=JSON.stringify(film?.state()||null);
  if(stage.dataset.film!==filmDiagnostic)stage.dataset.film=filmDiagnostic;
  stage.style.setProperty('--fog',String(sample.fog));
  stage.style.setProperty('--signal',String(sample.glitch));
  stage.style.setProperty('--scan-position',`${sample.scan*100}%`);
  stage.style.setProperty('--rgb',String(sample.rgb));
  stage.style.setProperty('--memory-progress',String(sample.memory));
  stage.style.setProperty('--fragments',String(sample.fragments));
  const rgbActive=fx&&sample.rgb>.015;
  document.body.dataset.rgb=rgbActive?'active':'quiet';
  if(rgbActive) {
    byId('signal-cyan').setAttribute('dx',String(sample.rgb*4));
    byId('signal-red').setAttribute('dx',String(-sample.rgb*3));
  }
  slider.value=String(Math.round(desired*1000));
  slider.style.setProperty('--progress',`${desired*100}%`);
  // Once the ending covers the model, keep its last image without drawing hidden 3D.
  if(progress>=.44&&progress<.81)renderWorld(sample);
  const awaitingModel=progress>=.46&&progress<.785&&!modelPainted;
  const needsFilm=progress<.485||progress>=.785||awaitingModel;
  if(needsFilm&&!auto)film?.request(sample.film);
  const hasTarget=filmPainted?.clip===sample.film.clip;
  // Never expose a different clip while the requested surface is still decoding.
  const desiredFilm=progress<.46?1:progress<.785?1-sample.embrace:
    hasTarget?sample.ending:0;
  visibleFilm+= (desiredFilm-visibleFilm)*(1-Math.exp(-dt*24));
  if(!modelPainted&&progress<.785)visibleFilm=1;
  filmCanvas.style.opacity=filmPainted&&hasTarget?String(awaitingModel?1:visibleFilm):'0';
  world.style.opacity=modelPainted?'1':'0';
  const waitingFilm=needsFilm&&!hasTarget;
  const poster=byId('poster');
  const nextPoster=posters.get(sample.film.clip);
  const posterReady=Boolean(nextPoster?.complete&&nextPoster.naturalWidth);
  if(waitingFilm&&posterReady) {
    if(poster.getAttribute('src')!==nextPoster.getAttribute('src'))poster.src=nextPoster.getAttribute('src');
  }
  poster.style.zIndex='2';
  poster.style.opacity=!posterReady?'0':awaitingModel?(hasTarget?'0':'1'):waitingFilm?String(progress<.46?1:progress<.785?1-sample.embrace:sample.ending):'0';
  if(awaitingModel)byId('status').textContent='달에서의 재회를 준비하고 있어요.';
  text('caption-title',sample.title);
  text('caption-kicker',sample.copy);
  caption.style.opacity=String(awaitingModel?0:sample.captionOpacity);
  caption.setAttribute('aria-hidden',String(awaitingModel||sample.captionOpacity<.02));
  final.style.opacity=String(sample.final);
  const finalActive=sample.final>.95;
  final.inert=!finalActive;final.setAttribute('aria-hidden',String(!finalActive));
  const playing=Boolean(auto);
  byId('play').setAttribute('aria-pressed',String(playing));
  byId('play').setAttribute('aria-label',playing?'달의 기억 일시정지':'달의 기억 재생');
  text('play-icon',playing?'Ⅱ':'▶');text('play-label',playing?'일시정지':'재생');
  byId('hint').hidden=progress>.49;
  text('readout',`${String(sample.phase==='fragments'?['reach','grasp','merge','imprint'].indexOf(sample.film.clip)+1:sample.phase==='embrace'?5:6).padStart(2,'0')} / 06`);
  if(sample.complete)handoff();
  frame=requestAnimationFrame(tick);
}

async function start() {
  const config=await fetch('./assets/scene.json?v=474b3bca8fb6').then(response=>{if(!response.ok)throw Error('Scene unavailable');return response.json();});
  film=createFilmPlayer(filmCanvas,[
    {id:'reach',url:'assets/cut-reach.mp4',frames:36,fps:60},
    {id:'grasp',url:'assets/cut-grasp.mp4',frames:42,fps:60},
    {id:'merge',url:'assets/cut-merge.mp4',frames:48,fps:60},
    {id:'imprint',url:'assets/cut-imprint.mp4',frames:78,fps:60},
    {id:'ending',url:'assets/ending.mp4',frames:300,fps:60},
  ],{onFrame:painted=>{
    filmPainted=painted;filmCanvas.dataset.clip=painted.clip;
    filmCanvas.dataset.frame=String(painted.frame);filmCanvas.dataset.mediaTime=String(painted.mediaTime);
    sendReady();
  },onEnded:({clip})=>{
    if(!auto||auto.clip!==clip)return;
    const phase=filmPhase(progress);
    if(!phase||phase.clip!==clip)return;
    progress=phase.end;auto.clip=null;seek(progress);
  },onError:error=>{
    stop();
    if(error?.code==='VIDEO_PLAY_FAILED'&&filmPainted) {
      byId('status').textContent='영상을 재생하지 못했어요. 재생 버튼을 눌러 이어서 볼 수 있어요.';
      byId('play').disabled=false;
    } else send('close');
  }});
  film.resize(1280,540);film.preload();film.request({clip:'reach',time:0});
  scene=new MoonScene(world,config,status=>{if(status==='error')send('close');});
  // The original debounced observer can resize after a newer projection. One owner now resizes before rendering.
  scene.resizeObserver.disconnect();clearTimeout(scene.resizeTimer);
  await scene.load();
  if(disposed){scene.dispose();return;}
  cameraRig=createMoonCamera(scene,config);viewportDirty=true;
  stage.dataset.model=JSON.stringify({url:config.character.url,wireBytes:scene.modelWireBytes,decodedBytes:scene.modelDecodedBytes,ready:scene.ready});
  // Prepare the first 3D state before native playback, without spending its hold.
  const initial=sampleMemory(.44);
  world.style.opacity='0';
  if(!prepareWorld(initial))throw Error('Moon scene is unavailable');
  await scene.renderer.compileAsync(scene.scene,scene.camera);
  if(disposed)return;
  // A resize during compilation must use the same camera/material state as display.
  if(!prepareWorld(initial))throw Error('Moon scene is unavailable');
  scene.renderer.render(scene.scene,scene.camera);
  scene.renderer.setScissorTest(false);
  gpuReady=true;
  if(filmPainted)sendReady();
}

byId('fx').addEventListener('click',()=>{
  fx=!fx;document.body.dataset.fx=fx?'on':'off';byId('fx').setAttribute('aria-pressed',String(fx));
  byId('fx').textContent=fx?'FX 켜짐':'FX 꺼짐';
});
byId('play').addEventListener('click',togglePlayback);
byId('restart').addEventListener('click',event=>{event.preventDefault();stop();yaw=pitch=0;seek(0);});
byId('read').addEventListener('click',()=>handoff());
byId('notes').addEventListener('click',()=>handoff('guide-edgerunners-the-survivors'));
slider.addEventListener('input',()=>{takeManualControl();seek(Number(slider.value)/1000);});
window.addEventListener('wheel',takeManualControl,{passive:true});
window.addEventListener('touchstart',event=>{if(!event.target?.closest?.('button,a,input,label'))takeManualControl();},{passive:true});
window.addEventListener('keydown',event=>{if(event.key==='Escape'){stop();send('close');}else if(event.key===' '&&(event.target===slider||!['INPUT','BUTTON','A','TEXTAREA','SELECT'].includes(event.target?.tagName))){event.preventDefault();if(!event.repeat)togglePlayback();}else if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End'].includes(event.key))takeManualControl();});
window.addEventListener('message',event=>{
  const data=event.data;
  if(event.source!==parent||event.origin!==location.origin||data?.type!=='elio-moon-control'||data.session!==session)return;
  if(data.action==='focus-play'&&!byId('play').disabled)byId('play').focus({preventScroll:true});
  else if(data.action==='toggle-play')togglePlayback();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
world.addEventListener('pointerdown',event=>{if(progress<.485||progress>.785||event.pointerType==='touch')return;stop();drag={x:event.clientX,y:event.clientY,yaw,pitch};world.setPointerCapture(event.pointerId);});
world.addEventListener('pointermove',event=>{if(!drag)return;yaw=Math.max(-.18,Math.min(.18,drag.yaw+(event.clientX-drag.x)*.0006));pitch=Math.max(-.10,Math.min(.10,drag.pitch+(event.clientY-drag.y)*.0004));});
world.addEventListener('pointerup',()=>{drag=null;});world.addEventListener('pointercancel',()=>{drag=null;});
window.addEventListener('pagehide',()=>{autoplayPending=false;disposed=true;cancelAnimationFrame(frame);viewportObserver.disconnect();film?.dispose();scene?.dispose();},{once:true});
slider.disabled=false;
frame=requestAnimationFrame(tick);
start().catch(error=>{console.error('Moon scene:',error);send('close');});
