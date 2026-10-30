import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ConvexHull} from 'three/addons/math/ConvexHull.js';
import {createMotionTrack,createBezierTransition,clamp} from './motion-track.js?v=6b481f834d5d';
import {createNavigation,progressForRadius,NAVIGATION} from './navigation.js?v=3048afd5cc77';
import {rendererProfile,gaussianSize} from './render-policy.js?v=172df03b4e0f';
import {assetUrl,assets} from './assets.js?v=0ecce3eac256';
import {convexOutline} from './cassette-outline.js?v=558b9bfd7c3f';
import {registerCassette} from './cassette-registration.js?v=98da4e91d604';
const $=id=>document.getElementById(id),stage=$('stage'),viewport=$('viewport');
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);},rad=THREE.MathUtils.degToRad;
const normalize=value=>THREE.MathUtils.euclideanModulo(value+180,360)-180;
// This explicitly opened experiment always uses its full original motion.
const embedded=parent!==window,reduced=false,ambientEnabled=true;
const query=new URLSearchParams(location.search);
const inverseEntry=query.get('transition')==='inverse';
if(inverseEntry)document.documentElement.classList.add('inverse-entry');
if(new URLSearchParams(location.search).get('ui')==='0')document.body.classList.add('hide-ui');
const diagnostic=document.createElement('script');diagnostic.type='application/json';diagnostic.id='viewer-diagnostics';document.body.append(diagnostic);
const metrics={version:10,phase:'loading',errors:[],frames:0,inputEvents:0,embedded,renderPolicy:'GPU: live original scene; software: baked original camera film selected by boot',navigationConfig:NAVIGATION};
metrics.startup={viewerBegin:performance.now(),sourceFetchStart:null,fetchAndModuleReady:null,bufferReady:null,decodeStart:null,bodyReady:null,decodeDone:null,warmupStart:null,firstWarmDraw:null,firstRealFrame:null,ready:null};
function markStartup(name){metrics.startup[name]=performance.now();}
function sourceProgress(event){metrics.startup.receivedBytes=event.loaded;if(event.loaded>=event.total&&event.total>0&&metrics.startup.bodyReady===null)markStartup('bodyReady');}
let renderer,camera,scene,spark,bg,prop,portal,track,navigation,originalFrame,blendScene,blendCamera,blendMaterial,renderProfile,ready=false,started=false;
let playing=false,interactive=true,comparing=false,raf=0,dirty=0,lastDraw=0,lastUi=0,resumeTimer=0;
let active=query.get('entry')!=='poster',lastProgress=-Infinity,manualZoom=false,lastWheelInput=-Infinity,handoffProgress=0;
let p=0,current={},drag=null,pinch=null,covered=false,duration=4.8,start=0,startProgress=0,playQ=0,bridge=null,playbackMotion=null,playOptions={},reelRadius=.0033;
const pointers=new Map(),pivot=new THREE.Vector3(-.085,-.025,-1.405),reel=new THREE.Vector3(),baseOffset=pivot.clone().negate(),baseRadius=baseOffset.length();
let originalWeight=1,offlineCapture=false;
let cassetteHull=[];
let preparingInitialFrame=true,completeInitialDraw=null;
function initialSourceReady(){const lod=lodState();return spark?.activeSplats>0&&(!renderProfile.lod||lod.treeReady&&lod.usingLod&&lod.selectedSplats>0);}
function confirmInitialDraw(){
 if(!completeInitialDraw||!initialSourceReady())return;
 markStartup('firstSortedDraw');
 if(metrics.startup.firstRealFrame===null){markStartup('firstRealFrame');metrics.startup.firstRealFrameSplats=spark.activeSplats;}
 Object.assign(metrics.startup,{drawActiveSplats:spark.activeSplats,drawWidth:drawingSize.x,drawHeight:drawingSize.y,drawPose:{...metrics.camera},drawFrame:metrics.frames,drawSourceSplats:bg.numSplats,drawLod:lodState(),drawOriginalWeight:originalWeight});
 const complete=completeInitialDraw;completeInitialDraw=null;complete();
}
async function waitInitialGpuFrame(){
 const gl=renderer.getContext();
 if(gl.isContextLost())throw Error('Initial scene WebGL context lost');
 const sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
 if(!sync)throw Error('Initial scene GPU fence unavailable');
 gl.flush();
 try{
  await new Promise((resolve,reject)=>{
   function check(){
    if(gl.isContextLost()){reject(Error('Initial scene WebGL context lost'));return;}
    const status=gl.clientWaitSync(sync,0,0);
    if(status===gl.WAIT_FAILED){reject(Error('Initial scene GPU wait failed'));return;}
    if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED){resolve();return;}
    setTimeout(check,10);
   }
   setTimeout(check,0);
  });
  markStartup('firstGpuCompletedFrame');
 }finally{gl.deleteSync(sync);}
}
function reportInput(pointerType){if(pointerType)emit('input',{pointerType});}
const drawingSize=new THREE.Vector2();
const offset=new THREE.Vector3(),target=new THREE.Vector3(),rot=new THREE.Quaternion(),aim=new THREE.Quaternion(),lookMatrix=new THREE.Matrix4(),rollRot=new THREE.Quaternion(),zAxis=new THREE.Vector3(0,0,1),euler=new THREE.Euler(0,0,0,'YXZ');
const projected=new THREE.Vector3(),axisX=new THREE.Vector3(),axisY=new THREE.Vector3();
function lodState(){return {treeReady:!!bg?.packedSplats?.lodSplats,usingLod:bg?.context?.enableLod?.value===true,selectedSplats:spark?.lodInstances?.get(bg)?.numSplats??0};}
function publish(){metrics.viewport={width:innerWidth,height:innerHeight};metrics.progress=p;metrics.playing=playing;metrics.comparingOriginal=comparing;metrics.ambientEnabled=ambientEnabled;metrics.active=active;metrics.activeSplats=spark?.activeSplats??0;if(spark)metrics.lod=lodState();if(navigation)metrics.navigation=navigation.snapshot();metrics.progressVelocity=playing&&playbackMotion?playbackMotion.sample(playQ*duration).velocity:interactive?metrics.navigation?.progressVelocity??0:0;diagnostic.textContent=JSON.stringify(metrics);publishProgress();}
function publishProgress(force=false){const now=performance.now();if(!force&&now-lastProgress<1000/60)return;lastProgress=now;emit('progress',{progress:p,radius:current.radius,entryCenter:metrics.portal?.screenCenter,cassetteOutline:projectCassetteOutline(),timelineProgress:playing?playQ:p,held:navigation?.snapshot().held??false,playing,ready,reducedMotion:reduced});}
function projectCassetteOutline(){
 if(!embedded||!cassetteHull.length||!camera||!stage.clientWidth||!stage.clientHeight)return null;
 const vw=viewport.clientWidth/stage.clientWidth,vh=viewport.clientHeight/stage.clientHeight;
 const points=[];
 for(const point of cassetteHull){const q=projected.copy(point).project(camera);if(!Number.isFinite(q.x)||!Number.isFinite(q.y)||q.z< -1||q.z>1)return null;points.push({x:.5+q.x*.5*vw,y:.5-q.y*.5*vh});}
 return convexOutline(points);
}
const replyOrigin=location.origin;
function emit(type,detail={}){const message={channel:'memory-tape',version:1,event:type,...detail};window.dispatchEvent(new CustomEvent('memory-tape:'+type,{detail}));if(parent!==window)parent.postMessage(message,replyOrigin);document.body.dataset.event=type;}
function inputLocked(){return playing&&playOptions.lockInput===true;}
function canFinishZoom(now,includeQuiet=true){
 if(!navigation||!active||!interactive||playing||!manualZoom||p<handoffProgress-.02)return false;
 const state=navigation.snapshot();
 // Settle at the handoff boundary, not a wheel overshoot deep inside the reel.
 const boundary=Math.min(state.targetProgress,handoffProgress);
 return !state.held&&state.targetProgress>=handoffProgress&&boundary-p<.006&&(!includeQuiet||now-state.inputAt>=160);
}

function fail(error){emit('error',{message:'장면을 열 수 없습니다.'});metrics.errors.push(String(error));metrics.phase='error';$('loading').hidden=true;$('error').hidden=false;$('errorText').textContent=String(error);playing=false;publish();console.error(error);}
window.addEventListener('error',e=>fail(e.message));window.addEventListener('unhandledrejection',e=>fail(e.reason));
function invalidate(frames=2){if(offlineCapture||preparingInitialFrame)return;dirty=Math.max(dirty,frames);if(!raf&&ready&&!document.hidden&&(active||!started)){raf=1;metrics.idle=false;renderer.setAnimationLoop(frame);}}
function setAmbient(){$('ambient').setAttribute('aria-pressed','true');publish();invalidate();}
function setActive(value){active=!!value;manualZoom=false;if(!active){clearTimeout(resumeTimer);playing=false;if(started){renderer?.setAnimationLoop(null);raf=0;metrics.idle=true;}}else{navigation?.pauseClock(performance.now());lastDraw=0;size();invalidate(3);}publish();publishProgress(true);}
function pixelRatio(){return Math.min(devicePixelRatio,matchMedia('(max-width:650px)').matches?1.25:1.5);}
function size(){if(!ready||offlineCapture)return;const w=stage.clientWidth,h=stage.clientHeight,r=1920/810,vw=Math.min(w,h*r),vh=vw/r;viewport.style.width=vw+'px';viewport.style.height=vh+'px';renderer.setPixelRatio(pixelRatio());renderer.setSize(Math.round(vw),Math.round(vh),false);renderer.getDrawingBufferSize(drawingSize);const gs=gaussianSize(drawingSize.x,drawingSize.y,renderProfile);originalFrame.setSize(gs.width,gs.height);metrics.blendBuffer=gs;metrics.cassetteBuffer={width:drawingSize.x,height:drawingSize.y};invalidate(4);}
new ResizeObserver(size).observe(stage);
function hideDestination(){$('destination').hidden=true;}
function compare(){comparing=false;}
function updateUi(force=false){publish();}
function cameraPose(view,s){
 target.copy(pivot).lerp(reel,s.reel);euler.set(rad(s.pitch),rad(s.yaw),0,'YXZ');rot.setFromEuler(euler);
 offset.copy(baseOffset).multiplyScalar(s.radius/baseRadius).applyQuaternion(rot);view.position.copy(target).add(offset);
 view.quaternion.copy(rot);aim.setFromRotationMatrix(lookMatrix.lookAt(view.position,target,THREE.Object3D.DEFAULT_UP));view.quaternion.slerp(aim,s.focus);
 rollRot.setFromAxisAngle(zAxis,rad(s.roll));view.quaternion.multiply(rollRot);view.updateMatrixWorld();
}
function setPortal(opacity){
 const u=portal.material.uniforms,fullCover=smooth(.965,1,p);u.opacity.value=opacity;u.fullCover.value=fullCover;portal.visible=opacity>.001;metrics.portal={opacity,fullCover,covered:opacity>=.999&&fullCover>=.999};
 projected.copy(reel).project(camera);axisX.copy(reel);axisX.x+=reelRadius;axisX.project(camera);axisY.copy(reel);axisY.y+=reelRadius;axisY.project(camera);
 u.center.value.set(projected.x*.5+.5,projected.y*.5+.5);u.basis.value.set((axisX.x-projected.x)*.5,(axisX.y-projected.y)*.5,(axisY.x-projected.x)*.5,(axisY.y-projected.y)*.5);
 metrics.portal.screenCenter={x:.5+(u.center.value.x-.5)*viewport.clientWidth/stage.clientWidth,y:.5+(.5-u.center.value.y)*viewport.clientHeight/stage.clientHeight};
 // Measure the same projected ellipse as the shader, including rolled views.
 const {x:a,y:b,z:c,w:d}=u.basis.value,det=a*d-b*c;
 if(Math.abs(det)>1e-8){
  const center=u.center.value;
  const farthest=Math.max(...[[0,0],[1,0],[1,1],[0,1]].map(([x,y])=>{const dx=x-center.x,dy=y-center.y;return Math.hypot((d*dx-c*dy)/det,(-b*dx+a*dy)/det);}));
  metrics.portal.cornerDistance=farthest;metrics.portal.projectedCovered=farthest<=.87;metrics.portal.covered=metrics.portal.covered||opacity>=.999&&farthest<=.87;
 }
}
function applyPose(s){
 // One camera and one world transform for the whole scene. Unobserved people
 // fade away at wide angles instead of counter-rotating against the cassette.
 cameraPose(camera,s);const authoredYaw=track.sample(p).yaw;originalWeight=s.background*(1-smooth(12,30,Math.abs(normalize(s.yaw-authoredYaw))))*(1-smooth(12,35,Math.abs(s.pitch)));
 // The original tape points were removed offline. One rigid GLB is present in
 // both the complete scene and the isolated close view; only its surroundings fade.
 if(bg){bg.opacity=1;bg.visible=originalWeight>0;spark.visible=bg.visible;}
 prop.visible=true;
 setPortal(smooth(.89,.985,p));metrics.cassetteMeshOpacity=1;
 metrics.camera={yaw:s.yaw,pitch:s.pitch,radius:s.radius,dolly:baseRadius/s.radius,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),target:target.toArray(),roll:s.roll};
 metrics.backgroundOpacity=originalWeight;metrics.gaussianPass=!!bg?.visible;
 metrics.cameraPasses=originalWeight>0&&(originalWeight<1||renderProfile.mode!=='gpu')?2:1;
 metrics.sceneBlend={original:originalWeight,mesh:1-originalWeight};
}
function draw(){
 // The inverse comparison keeps the actual mesh alpha above its separate
 // background wipe. Gaussian/mixed passes retain the original opaque blend.
 if(metrics.transparentCassette)renderer.setClearAlpha(originalWeight>0?1:0);
 const mixed=originalWeight>0&&originalWeight<1;
 const scaledSource=renderProfile.mode!=='gpu'&&originalWeight>0;
 if(mixed||scaledSource){
  const portalVisible=portal.visible;
  prop.visible=true;portal.visible=false;
  renderer.setRenderTarget(originalFrame);renderer.clear();renderer.render(scene,camera);
  bg.visible=false;spark.visible=false;prop.visible=true;
  renderer.setRenderTarget(null);renderer.clear();if(prop.visible)renderer.render(scene,camera);
  blendMaterial.opacity=originalWeight;renderer.render(blendScene,blendCamera);
  portal.visible=portalVisible;if(portalVisible)renderer.render(portal,camera);
  bg.visible=true;spark.visible=true;
 }else{renderer.clear();renderer.render(scene,camera);}
}
function wakeAfterInput(){clearTimeout(resumeTimer);if(ambientEnabled)resumeTimer=setTimeout(()=>invalidate(),NAVIGATION.resumeMs+25);invalidate();}
function manual(){const now=performance.now();metrics.inputEvents++;clearTimeout(resumeTimer);if(!interactive||playing){navigation.adopt(current,now);interactive=true;}playing=false;covered=false;hideDestination();compare(false);$('play').textContent='테이프 안으로';return now;}
function reset(){if(!ready)return false;clearTimeout(resumeTimer);manualZoom=false;playing=false;playOptions={};interactive=true;covered=false;hideDestination();compare(false);setAmbient(true);navigation.reset(performance.now());current={...navigation.tick(performance.now(),false)};p=0;applyPose(current);updateUi(true);invalidate(5);return true;}
function stop(){if(!ready)return;clearTimeout(resumeTimer);playing=false;playOptions={};interactive=false;navigation.freeze(performance.now());$('play').textContent='테이프 안으로';publish();invalidate();}
function sample(progress){p=clamp(progress);track.sample(p,current);applyPose(current);updateUi();}
function seek(progress){if(!ready)return false;manualZoom=false;stop();hideDestination();covered=false;metrics.completed=false;compare(false);sample(progress);navigation.adopt(current,performance.now());interactive=true;updateUi(true);if(active&&!document.hidden)draw();publishProgress(true);wakeAfterInput();return true;}
function play(options={}){
 if(!ready||inputLocked()||(options.endProgress!==undefined&&!Number.isFinite(options.endProgress))||(options.curveHandle!==undefined&&!Number.isFinite(options.curveHandle)))return false;manualZoom=false;const from={...current},incoming=interactive?navigation.snapshot():null,beforePosition=camera.position.clone(),beforeQuaternion=camera.quaternion.clone();clearTimeout(resumeTimer);playing=false;interactive=false;hideDestination();compare(false);covered=false;metrics.completed=false;playOptions=options;
 startProgress=navigation.progressForRadius(from.radius);
 const hasTarget=options.endProgress!==undefined,targetProgress=hasTarget?Math.max(startProgress,clamp(options.endProgress)):1;
 const requestedDuration=clamp(Number(options.duration)||4.8,.22,20),curveHandle=options.curveHandle===undefined?.75:clamp(options.curveHandle);
 playbackMotion=createBezierTransition(startProgress,targetProgress,hasTarget?0:Math.max(0,incoming?.progressVelocity??0),requestedDuration,curveHandle);
 // A presentation owns its elapsed clock even if its target is already reached.
 duration=hasTarget?requestedDuration:playbackMotion.duration;
 const initialVelocity=playbackMotion.sample(0).velocity;
 // A committed read/replay takes control at the current pose. Its two poses
 // always turn in the authored film direction, independent of idle velocity.
 const authoredTurn=track.sample(1).yaw-track.sample(0).yaw;
 const yawPerProgress=authoredTurn;
 bridge={yaw:from.yaw,yawPerProgress,pitch:from.pitch,reel:from.reel,focus:from.focus,roll:from.roll};
 playQ=0;samplePlayback();start=performance.now();metrics.animationStartFrames=metrics.frames;metrics.playStart={sourcePose:from,startProgress,endProgress:targetProgress,curveHandle,initialProgressVelocity:initialVelocity,initialAngularVelocity:{yaw:yawPerProgress*initialVelocity,pitch:0},incomingAngularVelocity:incoming?.angularVelocity??{yaw:0,pitch:0},duration,positionJump:beforePosition.distanceTo(camera.position),angleJumpDegrees:THREE.MathUtils.radToDeg(beforeQuaternion.angleTo(camera.quaternion))};playing=true;lastDraw=0;$('play').textContent='재생 중';emit('start',{duration});invalidate();return true;
}
function samplePlayback(){
 p=playbackMotion.sample(playQ*duration).value;track.sample(p,current);
 // Distance and yaw share this one progress curve; there is no separate idle
 // tangent or return path that can choose the opposite enlargement direction.
 current.yaw=bridge.yaw+bridge.yawPerProgress*(p-startProgress);
 // Hold the existing center, tilt and roll. Re-centering onto the reel while
 // dollying creates a separate late lift even when the distance curve is smooth.
 current.pitch=bridge.pitch;current.reel=bridge.reel;current.focus=bridge.focus;current.roll=bridge.roll;applyPose(current);updateUi();
}
function finish(){playing=false;playQ=1;samplePlayback();metrics.completed=true;metrics.lastAnimation={drawnFrames:metrics.frames-metrics.animationStartFrames,elapsedMs:performance.now()-start,endRadius:current.radius,portalCovered:metrics.portal?.covered===true};$('play').textContent='테이프 안으로';if(p>=1&&!covered){covered=true;emit('covered');playOptions.onCovered?.();}if(!embedded){$('destination').hidden=false;}emit('complete',playOptions.endProgress===undefined?{}:{progress:p,radius:current.radius});playOptions.onComplete?.();playOptions={};publish();}
function frame(now){
 if(!ready||document.hidden||(!active&&started)){renderer.setAnimationLoop(null);raf=0;return;}
 const cap=60;if(lastDraw&&now-lastDraw<1000/cap-1)return;
 if(playing){playQ=duration>0?clamp((now-start)/(duration*1000)):1;samplePlayback();}
 else if(interactive&&!comparing){Object.assign(current,navigation.tick(now,ambientEnabled,{camera:camera.position,pivot}));p=navigation.progress;applyPose(current);updateUi();}
 const began=performance.now();draw();metrics.cpuSubmitMs=performance.now()-began;metrics.frames++;confirmInitialDraw();if(spark?.activeSplats>0&&metrics.startup.firstRealFrame===null){markStartup('firstRealFrame');metrics.startup.firstRealFrameSplats=spark.activeSplats;}metrics.lastDrawAtMs=now;if(lastDraw)metrics.lastFrameIntervalMs=now-lastDraw;lastDraw=now;dirty=Math.max(0,dirty-1);
 if(playing&&playQ>=1)finish();
 if(canFinishZoom(now))play({duration:.46,lockInput:true});
 const moving=interactive&&!comparing&&(navigation.moving(now,ambientEnabled)||canFinishZoom(now,false));
 if(!playing&&!moving&&dirty===0){renderer.setAnimationLoop(null);raf=0;metrics.idle=true;publish();}
}
$('play').onclick=()=>play();$('reset').onclick=reset;$('return').onclick=reset;
function pinchState(){const [a,b]=[...pointers.values()];return {distance:Math.hypot(a.x-b.x,a.y-b.y),progress:navigation.targetProgress};}
function endPointer(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;drag=null;navigation.release(performance.now());wakeAfterInput();publish();}
stage.addEventListener('pointerover',e=>reportInput(e.pointerType),{passive:true});
stage.addEventListener('pointerdown',e=>{
 reportInput(e.pointerType);
 if(inputLocked()){e.preventDefault();return;}
 if(!ready||!active||comparing||e.target.closest('#destination'))return;
 const now=manual();stage.focus({preventScroll:true});stage.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const base=navigation.begin(now);
 emit('interaction',{kind:pointers.size===2?'pinch':'drag'});
 if(pointers.size===2){pinch=pinchState();drag=null;}else drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:base.yaw,pitch:base.pitch,progress:base.progress,mode:e.button===1?'dolly':'orbit',lastX:e.clientX,lastAt:now};invalidate();
});
stage.addEventListener('pointermove',e=>{
 if(inputLocked()){e.preventDefault();return;}
 if(!pointers.has(e.pointerId))return;if(e.pointerType==='mouse'&&e.buttons===0){endPointer(e);return;}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch&&pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);const progress=pinch.progress+Math.log(Math.max(1,distance)/Math.max(1,pinch.distance))*.28;if(progress>navigation.targetProgress)manualZoom=true;navigation.seek(progress,performance.now());invalidate();return;}
 if(!drag||drag.id!==e.pointerId)return;
 const now=performance.now(),degrees=(e.clientX-drag.x)/viewport.clientWidth*NAVIGATION.dragDegreesPerWidth;
 if(drag.mode==='dolly')navigation.seek(drag.progress+(drag.y-e.clientY)/viewport.clientHeight*.55,now);
 else navigation.move(drag.yaw+degrees,drag.pitch+(e.clientY-drag.y)/viewport.clientHeight*130,(e.clientX-drag.lastX)/viewport.clientWidth*NAVIGATION.dragDegreesPerWidth/Math.max(.008,(now-drag.lastAt)/1000),now);
 drag.lastX=e.clientX;drag.lastAt=now;invalidate();
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,endPointer);
function scrollBy(pixels){if(inputLocked()||!ready||!active||comparing||pixels===0)return;const now=manual();if(now-lastWheelInput>200)emit('interaction',{kind:'wheel'});lastWheelInput=now;if(pixels>0)manualZoom=true;navigation.scroll(pixels*.00034,now);wakeAfterInput();}
stage.addEventListener('wheel',e=>{reportInput('mouse');e.preventDefault();scrollBy(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1));},{passive:false});
stage.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&ready&&active){e.preventDefault();reset();emit('cancel');return;}
 if(inputLocked()){e.preventDefault();return;}
 if(!ready||!active)return;const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','r','R'];if(!keys.includes(e.key))return;e.preventDefault();if(e.key.toLowerCase()==='r'){reset();return;}
 const now=manual();navigation.interrupt(now);const state=navigation.snapshot();navigation.move(state.orbitTarget+(e.key==='ArrowLeft'?-12:e.key==='ArrowRight'?12:0),state.pitchOffset+(e.key==='ArrowUp'?8:e.key==='ArrowDown'?-8:0),0,now);navigation.release(now);wakeAfterInput();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(resumeTimer);renderer?.setAnimationLoop(null);raf=0;if(playing){stop();emit('cancel');}}else{navigation?.pauseClock(performance.now());lastDraw=0;invalidate(3);}});
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==window.parent||parent===window||e.data?.channel!=='memory-tape'||e.data.version!==1)return;
 const d=e.data;if(!['play','reset','ambient','status','seek','active','scroll'].includes(d.command))return;
 if(d.command==='status'){if(started)emit('ready');publishProgress(true);return;}
 if(d.command==='active'&&typeof d.enabled==='boolean'){setActive(d.enabled);return;}
 if(!ready)return;
 if(d.command==='play')play({duration:clamp(Number(d.duration)||4.8,.6,12),lockInput:d.lockInput===true,endProgress:d.endProgress,curveHandle:d.curveHandle});
 if(d.command==='seek'&&typeof d.progress==='number'&&Number.isFinite(d.progress))seek(clamp(d.progress,0,.88));
 if(d.command==='reset')reset();
 if(d.command==='scroll'&&Number.isFinite(d.pixels))scrollBy(d.pixels);
 // Kept for host compatibility; this opt-in scene has no off preference.
 if(d.command==='ambient'&&typeof d.enabled==='boolean')setAmbient();
});
try{
 const begun=performance.now(),config={height:810,focalPx:1444.9014892578125,webGaussian:'scene.spz'},motion={"keyframes":[{"p":0,"yaw":0,"pitch":0,"radius":1.40779,"focus":0,"reel":0,"roll":0,"background":1},{"p":1,"yaw":43,"pitch":0,"radius":0.14,"focus":0,"reel":0,"roll":0,"background":0}],"backgroundFade":[0.70,0.50]},anchor={"position":[-0.09120161226153127,-0.04861075448913092,-1.3954174737801919],"radius":0.0033};
 track=createMotionTrack(motion);handoffProgress=progressForRadius(track,.21);navigation=createNavigation(track,baseRadius,0,handoffProgress);reel.fromArray(anchor.position);reelRadius=anchor.radius;
 metrics.motionTrack={kind:'two-pose accelerating cubic Bezier in log-distance',keys:motion.keyframes.length,startRadius:motion.keyframes[0].radius,endRadius:motion.keyframes[1].radius,idleRadius:baseRadius,handoffProgress,handoffRadius:.21};
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:inverseEntry,preserveDrawingBuffer:false,powerPreference:'high-performance'});renderer.autoClear=false;renderer.setPixelRatio(pixelRatio());renderer.setClearColor(0x030507);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;viewport.prepend(renderer.domElement);
 const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');metrics.webglRenderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 metrics.antialias=gl.getContextAttributes()?.antialias===true;
 metrics.transparentCassette=inverseEntry;
 renderProfile=rendererProfile(metrics.webglRenderer);
 // Explicit reference rendering is private QA only; never infer a GPU from it.
 if(query.get('render')==='gaussian'){renderProfile={...renderProfile,source:'gaussian',lod:false,gaussianScale:1,maxGaussianPixels:Infinity};metrics.referenceOverride=true;}
 if(query.get('render')==='lod-reference'){renderProfile={...renderProfile,source:'gaussian'};metrics.referenceOverride=true;}
 metrics.renderProfile={...renderProfile,maxGaussianPixels:Number.isFinite(renderProfile.maxGaussianPixels)?renderProfile.maxGaussianPixels:null};
 metrics.sourceMode=renderProfile.source;
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(2*Math.atan(config.height/(2*config.focalPx))),1920/810,.001,1000);scene.add(camera);
 originalFrame=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});originalFrame.texture.colorSpace=THREE.SRGBColorSpace;
 blendScene=new THREE.Scene();blendCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 blendMaterial=new THREE.MeshBasicMaterial({map:originalFrame.texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
 const blendQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),blendMaterial);blendQuad.frustumCulled=false;blendScene.add(blendQuad);
 portal=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{center:{value:new THREE.Vector2(.5,.5)},basis:{value:new THREE.Vector4(.1,0,0,.1)},opacity:{value:0},fullCover:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 vUv;uniform vec2 center;uniform vec4 basis;uniform float opacity;uniform float fullCover;void main(){vec2 d=vUv-center;float det=basis.x*basis.w-basis.y*basis.z;vec2 q=vec2(basis.w*d.x-basis.z*d.y,-basis.y*d.x+basis.x*d.y)/max(abs(det),.00000001)*sign(det);float a=mix(1.-smoothstep(.87,1.,length(q)),1.,fullCover)*opacity;gl_FragColor=vec4(vec3(.011,.016,.023),a);}'}));portal.frustumCulled=false;portal.renderOrder=10000;scene.add(portal);
 const sourceReady=loadGaussians();
 const [gltf]=await Promise.all([new GLTFLoader().loadAsync(assetUrl('cassette')),sourceReady]);
 const registered=registerCassette(gltf.scene,pivot);prop=registered.prop;scene.add(prop);
 if(registered.reelAnchor){reel.copy(registered.reelAnchor);anchor.position=reel.toArray();}
 // The opaque cassette is static; only the camera moves. Build its outer 3D
 // hull once, then project that same geometry afresh for every visible pose.
 const hullStarted=performance.now(),hull=new ConvexHull().setFromObject(prop),outer=new Set();
 for(const face of hull.faces){let edge=face.edge;do{outer.add(edge.head().point);edge=edge.next;}while(edge!==face.edge);}
 cassetteHull=[...outer];metrics.silhouette={kind:'live projected convex outline',vertices:cassetteHull.length,buildMs:performance.now()-hullStarted};
 metrics.cassetteTriangles=registered.triangles;metrics.reelAnchor=anchor;metrics.reducedMotion=reduced;ready=true;setAmbient();sample(0);size();
 // Allocate and compile the short crossfade during the initial load, never on
 // the first scroll or video click. The Gaussian scene still renders once.
 renderer.initRenderTarget(originalFrame);renderer.compile(blendScene,blendCamera);
 markStartup('warmupStart');metrics.startup.warmupCamera={...metrics.camera};const wideWeight=originalWeight;originalWeight=.5;draw();markStartup('firstWarmDraw');originalWeight=wideWeight;
 // Own the first sort at the actual wide pose, then wait for its real draw and
 // GPU completion. A frame count is neither a sort nor a presentation signal.
 const initialDraw=new Promise(resolve=>{completeInitialDraw=resolve;});
 markStartup('initialSortStart');await spark.update({scene,camera});markStartup('initialSortDone');
 if(initialSourceReady()){
  draw();metrics.frames++;confirmInitialDraw();
 }else{
  // LoD selection is asynchronous. Keep its existing readiness predicate and
  // let the normal renderer provide the first valid sorted frame.
  spark.autoUpdate=true;preparingInitialFrame=false;invalidate(2);
 }
 await initialDraw;await waitInitialGpuFrame();
 spark.autoUpdate=true;preparingInitialFrame=false;
 markStartup('ready');metrics.startup.readyActiveSplats=spark.activeSplats;metrics.startup.readyFrames=metrics.frames;started=true;navigation.start(performance.now());for(const id of ['reset','play'])$(id).disabled=false;$('loading').hidden=true;metrics.phase='ready';metrics.interactiveMs=performance.now();metrics.loadDurationMs=performance.now()-begun;metrics.resources=performance.getEntriesByType('resource').map(r=>({name:r.name.replace(location.origin,''),status:r.responseStatus,bytes:r.transferSize}));publish();emit('ready');invalidate(4);
}catch(error){fail(error);}

async function loadGaussians(){
 markStartup('sourceFetchStart');
 const [{SparkRenderer,SplatMesh},response]=await Promise.all([import('@sparkjsdev/spark'),fetch(assetUrl('gaussian'))]);
 markStartup('fetchAndModuleReady');
 if(!response.ok)throw Error('Gaussian HTTP '+response.status);
 spark=new SparkRenderer({renderer,autoUpdate:false,onDirty:()=>invalidate(),enableLod:renderProfile.lod,enableDriveLod:renderProfile.lod,...(renderProfile.lod?{lodSplatCount:renderProfile.splatBudget,lodSplatScale:1}:{})});scene.add(spark);
 let input;
 if(response.body){input={stream:response.body,streamLength:assets.files.gaussian.bytes};metrics.startup.inputMode='stream';}
 else{input={fileBytes:new Uint8Array(await response.arrayBuffer())};metrics.startup.inputMode='buffer-body-unavailable';markStartup('bufferReady');}
 markStartup('decodeStart');
 bg=new SplatMesh({...input,fileName:'scene.spz',lod:renderProfile.lod,enableLod:renderProfile.lod,onProgress:sourceProgress});bg.quaternion.set(1,0,0,0);scene.add(bg);await bg.initialized;markStartup('decodeDone');metrics.sceneGaussians=renderProfile.lod?null:bg.numSplats;
}

// Offline artifact generation uses the original Gaussian scene at its authored
// first pose. No typography, idle offset or browser settings enter the capture.
export function captureSource(){
 if(!ready||!bg)throw Error('Gaussian reference is not ready');
 stop();p=0;track.sample(0,current);applyPose(current);
 renderer.setPixelRatio(1);renderer.setSize(1536,648,false);draw();
 const image=renderer.domElement.toDataURL('image/webp',.92);
 size();return {image,width:1536,height:648,pose:metrics.camera};
}

// Offline only: render the same two-pose scene into a deterministic film. The
// video contains both representations' crossfade, so no second tape is overlaid
// at runtime. Wait for Spark's changed view to reach its sorting/render pass.
export async function captureFrame(progress,width=3414,height=1440,sourceWeight,orbitYaw=0,includeImage=true,orbitPitch=0){
 if(!ready||!bg)throw Error('Gaussian reference is not ready');
 if(renderProfile.lod)throw Error('Offline capture requires the full non-LoD Gaussian reference');
 offlineCapture=true;stop();renderer.setAnimationLoop(null);raf=0;spark.autoUpdate=false;renderer.setPixelRatio(1);renderer.setSize(width,height,false);originalFrame.setSize(width,height);
 p=clamp(progress);track.sample(p,current);current.yaw+=orbitYaw;current.pitch+=orbitPitch;applyPose(current);
 if(sourceWeight!==undefined){originalWeight=clamp(sourceWeight);bg.visible=originalWeight>0;spark.visible=bg.visible;prop.visible=true;}
 const beforeSort=performance.now();await spark.update({scene,camera});const beforeDraw=performance.now();draw();
 metrics.capture={width,height,gaussianWidth:originalFrame.width,gaussianHeight:originalFrame.height,gaussians:bg.numSplats,lod:renderProfile.lod,sorted:true};
 return {image:includeImage?renderer.domElement.toDataURL('image/png'):null,pose:metrics.camera,background:originalWeight,capture:metrics.capture,sortMs:beforeDraw-beforeSort,drawMs:performance.now()-beforeDraw};
}
// Capture-only API. The approved interactive scene and its clocks are untouched.
// Coordinates belong to the rendered image, before any responsive letterboxing.
export async function captureImageFrame(progress,orbitYaw=0,orbitPitch=0){
 const result=await captureFrame(progress,3414,1440,undefined,orbitYaw,false,orbitPitch);
 const points=cassetteHull.map(point=>{const q=point.clone().project(camera);return {x:q.x*.5+.5,y:.5-q.y*.5};});
 return {p:clamp(progress),radius:current.radius,yaw:current.yaw,pitch:current.pitch,
  outline:convexOutline(points),image:renderer.domElement.toDataURL('image/webp',.8),
  encoding:{format:'webp',quality:80},capture:result.capture,renderer:metrics.webglRenderer};
}
export async function captureFilm({count=150,firstFrame=0,lastFrame=count,fps=30,width=3414,height=1440,kind='approach'}={}){
 if(!ready||!bg)throw Error('Gaussian reference is not ready');
 if(!Number.isInteger(firstFrame)||!Number.isInteger(lastFrame)||firstFrame<0||lastFrame>count||lastFrame<=firstFrame)throw Error('Invalid offline capture frame range');
 stop();renderer.setAnimationLoop(null);raf=0;
 const chunks=[],job={frame:firstFrame,count,status:'rendering',bytes:0,parts:[]};window.memoryFilmCapture=job;
 const base64=bytes=>{let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);};
 const encoder=new VideoEncoder({output:chunk=>{const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);chunks.push(bytes);job.bytes+=bytes.byteLength;job.parts.push({frame:Math.round(chunk.timestamp*fps/1e6),base64:base64(bytes)});},error:error=>{job.error=String(error);}});
 const config={codec:'avc1.640033',width,height,bitrate:150000000,framerate:fps,hardwareAcceleration:'prefer-software',avc:{format:'annexb'}};
 if(!(await VideoEncoder.isConfigSupported(config)).supported)throw Error('High-quality offline encoder configuration is unsupported');
 encoder.configure(config);
 const curve=createBezierTransition(0,1,0,1);
 for(let i=firstFrame;i<lastFrame;i++){
  const orbit=kind==='orbit',progress=orbit?0:curve.sample(i/(count-1)).value;
  const began=performance.now();const captured=await captureFrame(progress,width,height,undefined,orbit?3.5*Math.sin(2*Math.PI*i/count):0,false);job.captureMs=performance.now()-began;job.sortMs=captured.sortMs;job.drawMs=captured.drawMs;
  const frame=new VideoFrame(renderer.domElement,{timestamp:Math.round(i/fps*1e6),duration:Math.round(1e6/fps)});
  encoder.encode(frame,{keyFrame:true});frame.close();if((i+1)%4===0||i+1===lastFrame)await encoder.flush();
  job.frameMs=performance.now()-began;job.frame=i+1;if(job.error)throw Error(job.error);
 }
 encoder.close();const bytes=new Uint8Array(job.bytes);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
 job.base64=base64(bytes);job.status='complete';return {frames:lastFrame-firstFrame,fps,width,height,bytes:job.bytes};
}
