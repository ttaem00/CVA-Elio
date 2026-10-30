import {assetUrl} from './assets.js?v=0ecce3eac256';
import {createBezierTransition,createMotionTrack} from './motion-track.js?v=6b481f834d5d';
import {createNavigation,progressForRadius} from './navigation.js?v=3048afd5cc77';
import {createEncodedCache,createFrameCache,selectFrame,mapFrameOutline,selectImageVariant} from './image-sequence.js?v=8efc0f36cff5';

const clamp=(value,low=0,high=1)=>Math.max(low,Math.min(high,value));
const smooth=value=>value*value*(3-2*value);

export function createImagePlayer({stage,viewport,canvas,manifestUrl,resolveAsset=assetUrl,document:doc,window:win,fetch:fetcher,createImageBitmap:decode}){
  const $=id=>doc.getElementById(id),ctx=canvas.getContext('2d',{alpha:false}),embedded=win.parent!==win;
  const blendCanvas=doc.createElement('canvas'),blendContext=blendCanvas.getContext('2d',{alpha:false});
  const diagnostic=doc.createElement('script');diagnostic.type='application/json';diagnostic.id='viewer-diagnostics';doc.body.append(diagnostic);
  const metrics={version:1,sourceMode:'prerender-image',phase:'loading',frames:0,errors:[],progress:0,playing:false};
  let manifest,ready=false,active=new URLSearchParams(win.location.search).get('entry')!=='poster',playing=false,idle=true,idleAllowed=true,held=false,manualZoom=false,raf=null;
  let goal=0,desired=0,painted=null,requestedKey=null,epoch=0,curve=null,began=0,orbitBegan=null,orbitOffset=0,blendAt=null,touch=null;
  let prepared=null,decodeWidth=1,decodeHeight=1,desiredKind='approach',lastDirection=0,playSeconds=1,blendFrame=null,disposed=false,navigation,track,manualEnd=1,paintedAt=null;
  const paintGaps=[];
  const now=()=>win.performance.now();
  const encoded=createEncodedCache({load:async(key,options)=>{const response=await fetcher(resolveAsset(key),options);if(!response.ok)throw Error('Image HTTP '+response.status);return response.blob();}});
  const cache=createFrameCache({max:4,load:key=>encoded.request(key),
    decode:async blob=>{const began=now(),bitmap=await decode(blob,{resizeWidth:decodeWidth,resizeHeight:decodeHeight,resizeQuality:'high'});metrics.decodeMs=now()-began;metrics.maxDecodeMs=Math.max(metrics.maxDecodeMs||0,metrics.decodeMs);return bitmap;}});
  function emit(event,detail={}){const data={channel:'memory-tape',version:1,event,...detail};if(embedded)win.parent.postMessage(data,win.location.origin);win.dispatchEvent(new win.CustomEvent('memory-tape:'+event,{detail}));doc.body.dataset.event=event;}
  function publish(){
    if(!painted)return;
    const outline=mapFrameOutline(painted.frame,{stageWidth:stage.clientWidth,stageHeight:stage.clientHeight,viewportWidth:viewport.clientWidth,viewportHeight:viewport.clientHeight});
    const center=outline?{x:(Math.min(...outline.map(p=>p.x))+Math.max(...outline.map(p=>p.x)))/2,y:(Math.min(...outline.map(p=>p.y))+Math.max(...outline.map(p=>p.y)))/2}:undefined;
    Object.assign(metrics,{progress:painted.frame.p,radius:painted.frame.radius,playing,ready,active,held,decodedFrames:cache.size,frameAsset:painted.frame.asset,frameKind:painted.kind,decodes:cache.state.decodes,bitmapHits:cache.state.bitmapHits,prefetchQueued:cache.state.future,...encoded.metrics});
    metrics.viewport={width:stage.clientWidth,height:stage.clientHeight,devicePixelRatio:win.devicePixelRatio||1,decodeWidth,decodeHeight};
    metrics.navigation=navigation?.snapshot();diagnostic.textContent=JSON.stringify(metrics);
    emit('progress',{progress:painted.frame.p,radius:painted.frame.radius,cassetteOutline:outline,entryCenter:center,frameKind:painted.kind,playing,held,ready,
      timelineProgress:playing?clamp((now()-began)/(playSeconds*1000)):painted.frame.p,reducedMotion:false});
  }
  function cancelFrame(){if(raf!==null)win.cancelAnimationFrame(raf);raf=null;}
  function pause(){if(idle&&manifest&&painted?.kind==='orbit')orbitOffset=manifest.orbit.indexOf(painted.frame)/manifest.orbit.length*manifest.orbitDuration*1000;orbitBegan=null;epoch++;playing=false;manualZoom=false;curve=null;held=false;touch=null;requestedKey=null;blendAt=null;blendFrame=null;paintedAt=null;cache.cancelPrefetch();goal=desired=painted?.frame.p??0;if(navigation)navigation.adopt(track.sample(desired),now());cancelFrame();publish();}
  function fail(error){pause();ready=false;metrics.phase='error';metrics.errors.push(String(error));if($('loading'))$('loading').hidden=true;if($('error'))$('error').hidden=false;if($('errorText'))$('errorText').textContent='장면을 재생하지 못했습니다. 이야기 화면에서 계속 읽을 수 있습니다.';emit('error',{message:'장면을 재생하지 못했습니다.'});}
  function size(){
    if(!manifest)return;const w=stage.clientWidth,h=stage.clientHeight,aspect=manifest.width/manifest.height,vw=Math.min(w,h*aspect),vh=vw/aspect;
    viewport.style.width=vw+'px';viewport.style.height=vh+'px';
    const ratio=Math.min(1,(vw*(win.devicePixelRatio||1))/manifest.width),dw=Math.max(1,Math.round(manifest.width*ratio)),dh=Math.max(1,Math.round(manifest.height*ratio));
    if(dw!==decodeWidth||dh!==decodeHeight){decodeWidth=dw;decodeHeight=dh;epoch++;requestedKey=null;blendAt=null;blendFrame=null;cache.clear();}
    wake();
  }
  function paint(frame,kind,bitmap,time){
    if(canvas.width!==decodeWidth||canvas.height!==decodeHeight){canvas.width=decodeWidth;canvas.height=decodeHeight;}
    ctx.globalAlpha=1;ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    if(blendAt!==null){const q=clamp((time-blendAt)/240);if(q<1){blendFrame={frame,kind,bitmap};ctx.globalAlpha=1-smooth(q);ctx.drawImage(blendCanvas,0,0,canvas.width,canvas.height);ctx.globalAlpha=1;return;}blendAt=null;blendFrame=null;}
    if(ready&&active&&!doc.hidden&&painted?.frame.asset!==frame.asset){
      if(paintedAt!==null){paintGaps.push(time-paintedAt);if(paintGaps.length>30)paintGaps.shift();}
      paintedAt=time;metrics.cadence={sourceOrbitFps:manifest.orbit.length/manifest.orbitDuration,recentPaintGapsMs:[...paintGaps]};
    }
    painted={frame,kind};metrics.frames++;publish();finish(time);prefetchNext(frame,kind);
  }
  function prefetchNext(frame,kind){
    if(!ready||!active||doc.hidden)return;
    const frames=manifest[kind],captured=frames.includes(frame)?frame:selectFrame(frames,frame.p),index=frames.indexOf(captured),direction=kind==='orbit'?1:Math.sign(goal-frame.p);
    const ahead=Array.from({length:12},(_,i)=>kind==='orbit'&&idle?frames[(index+i+1)%frames.length]:kind==='approach'&&direction?frames[index+(i+1)*direction]:null).filter(Boolean);
    encoded.prioritize(ahead.map(next=>next.asset));
    const next=ahead[0],token=epoch;
    cache.cancelPrefetch();
    if(!next)return;
    const warm=()=>{if(token===epoch&&ready&&active&&!doc.hidden&&desiredKind===kind&&painted?.frame===frame)cache.prefetch(next.asset).catch(()=>{});};
    // A speculative fetch must never hold the single decoder while a newly
    // visible or reversed target already has its bytes available.
    if(encoded.has(next.asset))warm();else encoded.preload([next.asset]).then(warm).catch(()=>{});
  }
  function request(frame,kind,time=now()){
    const key=frame.asset;if(requestedKey===key)return;requestedKey=key;const token=epoch;
    // Start/promote this transfer immediately, independently of the decoder.
    encoded.request(key).then(blob=>{
      if(!blob||token!==epoch||kind!==desiredKind)return null;
      if(requestedKey!==key){
        // A cold transfer may arrive between two requested positions. It is
        // still useful if it moves toward the current visible goal; requiring
        // the newest key here can discard every frame on a slower connection.
        const from=painted?.frame.p??0,sign=Math.sign(desired-from);
        if(kind!=='approach'||sign===0||sign>0&&(frame.p<=from||frame.p>desired)||sign<0&&(frame.p>=from||frame.p<desired))return null;
      }
      return cache.request(key);
    }).then(bitmap=>{
      if(!bitmap||token!==epoch||kind!==desiredKind)return;
      // A completed decode may trail the latest RAF. Keep useful forward frames,
      // but never let an older request reverse the visible camera after a turn.
      if(kind==='approach'&&painted?.kind==='approach'){
        const from=painted.frame.p,sign=Math.sign(desired-from);
        if(sign>0&&frame.p<from||sign<0&&frame.p>from||sign===0&&frame.p!==from)return;
        const target=selectFrame(manifest.approach,desired).p;
        if(sign>0&&frame.p>target||sign<0&&frame.p<target)return;
      }
      paint(frame,kind,bitmap,now());wake();
    }).catch(error=>{if(token===epoch&&key===requestedKey)fail(error);});
  }
  function finish(time){
    if(!playing||!curve||time-began<playSeconds*1000||blendAt!==null||painted?.kind!=='approach'||painted.frame!==selectFrame(manifest.approach,goal))return;
    playing=false;navigation.adopt(track.sample(painted.frame.p),time);metrics.completed=true;publish();emit('complete',{progress:painted.frame.p,radius:painted.frame.radius});
  }
  function tick(time){
    raf=null;if(!ready||!active||doc.hidden)return;
    if(blendFrame&&time-blendAt>=240){const frame=blendFrame;paint(frame.frame,frame.kind,frame.bitmap,time);}
    if(playing)desired=curve.sample(Math.max(0,(time-began)/1000)).value;
    else if(idle&&goal===0){
      orbitBegan??=time-orbitOffset;desiredKind='orbit';const q=((time-orbitBegan)/1000%manifest.orbitDuration)/manifest.orbitDuration;
      request(manifest.orbit[Math.min(manifest.orbit.length-1,Math.floor(q*manifest.orbit.length))],'orbit',time);wake();return;
    }else{
      navigation.tick(time,false);desired=navigation.progress;goal=navigation.targetProgress;
      const state=navigation.snapshot();
      if(manualZoom&&!held&&state.targetProgress>=manualEnd&&manualEnd-desired<.006&&painted?.kind==='approach'&&painted.frame.p>=manualEnd-.02&&time-state.inputAt>=160){play({duration:.46,lockInput:true});return;}
    }
    desiredKind='approach';request(selectFrame(manifest.approach,desired),'approach',time);finish(time);
    if(playing||Math.abs(goal-desired)>.0001||blendAt!==null||manualZoom&&!held&&goal>=manualEnd)wake();
    else if(goal===0&&!held&&idleAllowed){idle=true;orbitBegan=null;wake();}
  }
  function wake(){if(ready&&active&&!doc.hidden&&raf===null)raf=win.requestAnimationFrame(tick);}
  function leaveIdle(){
    if(painted?.kind==='orbit'&&canvas.width&&canvas.height){blendCanvas.width=canvas.width;blendCanvas.height=canvas.height;blendContext.drawImage(canvas,0,0);blendAt=now();}
    idle=false;desiredKind='approach';orbitBegan=null;orbitOffset=0;
  }
  function seek(progress,force=false){
    if(!ready||playing||!Number.isFinite(progress))return false;
    epoch++;requestedKey=null;cache.cancelPrefetch();manualZoom=false;leaveIdle();if(force)blendAt=null;
    idleAllowed=!force&&progress===0;goal=desired=clamp(progress);navigation.adopt(track.sample(desired),now());desiredKind='approach';request(selectFrame(manifest.approach,desired),'approach');wake();return true;
  }
  function play(options={}){
    if(!ready||!active||doc.hidden||playing||options.endProgress!==undefined&&!Number.isFinite(options.endProgress)||options.curveHandle!==undefined&&!Number.isFinite(options.curveHandle))return false;
    epoch++;requestedKey=null;cache.cancelPrefetch();manualZoom=false;held=false;touch=null;leaveIdle();idleAllowed=false;desired=painted?.frame.p??0;goal=Math.max(desired,clamp(options.endProgress===undefined?1:options.endProgress));
    const duration=clamp(Number(options.duration)||4.8,.22,20),handle=options.curveHandle===undefined?.75:clamp(options.curveHandle);
    const incoming=options.endProgress===undefined?Math.max(0,navigation.snapshot().progressVelocity):0;
    curve=createBezierTransition(desired,goal,incoming,duration,handle);playSeconds=options.endProgress===undefined?(curve.duration||duration):duration;began=now();playing=true;metrics.completed=false;prefetchNext(painted.frame,'approach');emit('start',{duration:playSeconds});publish();wake();return true;
  }
  function reset(){pause();idle=idleAllowed=true;orbitBegan=null;orbitOffset=0;goal=desired=0;navigation.reset(now());desiredKind='approach';requestedKey=null;request(manifest.approach[0],'approach');wake();}
  function scrub(delta,kind){
    if(!ready||!active||doc.hidden||playing||!Number.isFinite(delta))return;
    const next=clamp(goal+delta),direction=Math.sign(next-goal);if(direction&&direction!==lastDirection){epoch++;requestedKey=null;cache.cancelPrefetch();lastDirection=direction;}
    if(idle)navigation.adopt(track.sample(painted?.frame.p??0),now());leaveIdle();manualZoom=true;navigation.scroll(delta,now());goal=navigation.targetProgress;idleAllowed=goal===0;
    metrics.inputEvents=(metrics.inputEvents||0)+1;emit('interaction',{kind});wake();
  }
  function command(data){
    if(data.command==='status'){publish();if(ready)emit('ready',{sourceMode:metrics.sourceMode});}
    if(data.command==='warm')start();
    if(data.command==='active'){const wasIdle=idle;active=data.enabled!==false;if(!active){pause();idle=wasIdle;}else{orbitBegan=null;navigation?.pauseClock(now());wake();}publish();}
    if(data.command==='pause')pause();
    if(data.command==='reset'&&ready)reset();
    if(['seek','set-progress'].includes(data.command)&&Number.isFinite(data.progress))seek(data.progress,true);
    if(data.command==='play')play(data);
    if(data.command==='scroll'&&Number.isFinite(data.pixels))scrub(data.pixels*.00034,'wheel');
    if(data.command==='ambient')wake();
  }
  canvas.style.cssText='display:block;width:100%;height:100%';canvas.setAttribute('aria-hidden','true');viewport.prepend(canvas);stage.style.cursor='ns-resize';stage.style.touchAction='none';
  stage.setAttribute('aria-label','테이프에 남은 장면. 스크롤이나 위아래 쓸기로 다가가거나 물러납니다. Escape로 이야기로 돌아갑니다.');
  stage.addEventListener('wheel',event=>{event.preventDefault();scrub(event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1)*.00034,'wheel');},{passive:false});
  stage.addEventListener('pointerdown',event=>{if(!ready||!active||playing)return;held=true;navigation.begin(now());touch={id:event.pointerId,y:event.clientY};stage.setPointerCapture(event.pointerId);publish();});
  stage.addEventListener('pointermove',event=>{if(!touch||touch.id!==event.pointerId)return;event.preventDefault();const delta=(touch.y-event.clientY)/Math.max(180,stage.clientHeight);touch.y=event.clientY;scrub(delta,'vertical-swipe');});
  for(const type of ['pointerup','pointercancel'])stage.addEventListener(type,event=>{if(touch?.id===event.pointerId){touch=null;held=false;navigation.release(now());publish();wake();}});
  win.addEventListener('keydown',event=>{if(!active)return;if(event.key==='Escape'){event.preventDefault();pause();emit('cancel');}else if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key)){event.preventDefault();scrub(['ArrowDown','ArrowRight'].includes(event.key)?.04:-.04,'keyboard');}else if(event.key==='r'||event.key==='R'){event.preventDefault();if(ready&&!playing)reset();}});
  win.addEventListener('message',event=>{if(embedded&&event.source===win.parent&&event.origin===win.location.origin&&event.data?.channel==='memory-tape'&&event.data.version===1)command(event.data);});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){const wasPlaying=playing,wasIdle=idle;pause();idle=wasIdle;if(wasPlaying)emit('cancel');}else wake();});
  win.addEventListener('resize',size);win.addEventListener('pagehide',event=>{pause();if(!event.persisted){disposed=true;cache.close();encoded.close();}});
  for(const id of ['reset','return'])$(id)?.addEventListener('click',()=>{if(ready)reset();});$('play')?.addEventListener('click',()=>play());
  function start(){
    if(prepared)return prepared;
    prepared=(async()=>{
      try{
        const response=await fetcher(manifestUrl);if(!response.ok)throw Error('Sequence HTTP '+response.status);let data=await response.json();
        const selection=selectImageVariant(data,{stageWidth:stage.clientWidth,stageHeight:stage.clientHeight,devicePixelRatio:win.devicePixelRatio});
        if(selection.reference){
          const base=new URL(manifestUrl,win.location.href||win.location.origin+'/'),selected=new URL(selection.reference.manifest,base);
          if(selected.origin!==base.origin)throw Error('Image variant must use this origin');
          const response=await fetcher(selected.href);if(!response.ok)throw Error('Variant HTTP '+response.status);data=await response.json();
          if(data.height!==selection.reference.height||data.width!==selection.reference.width)throw Error('Image variant size mismatch');
        }
        manifest={...data,approach:data.frames?.approach,orbit:data.frames?.orbit};
        Object.assign(metrics,{selectedHeight:selection.height,nativeWidth:manifest.width,nativeHeight:manifest.height,selectionPixelHeight:selection.pixelHeight,
          selectionStageWidth:selection.stageWidth,selectionStageHeight:selection.stageHeight,selectionDevicePixelRatio:selection.devicePixelRatio});
        if(manifest.schema!=='elio-memory-image-sequence.v1'||!Number.isInteger(manifest.width)||!Number.isInteger(manifest.height)||manifest.width<1||manifest.height<1||!Number.isFinite(manifest.orbitDuration)||manifest.orbitDuration<=0||!Array.isArray(manifest.approach)||manifest.approach.length<2||!Array.isArray(manifest.orbit)||!manifest.orbit.length)throw Error('Invalid image sequence');
        for(const frame of [...manifest.approach,...manifest.orbit])if(!Number.isFinite(frame.p)||frame.p<0||frame.p>1||!Number.isFinite(frame.radius)||frame.radius<=0||typeof frame.asset!=='string'||!mapFrameOutline(frame,{stageWidth:1,stageHeight:1,viewportWidth:1,viewportHeight:1}))throw Error('Invalid image frame');
        if(manifest.approach[0].p!==0||manifest.approach.at(-1).p!==1||manifest.approach.some((frame,index,frames)=>index&&frame.p<=frames[index-1].p))throw Error('Invalid approach order');
        const pose=frame=>({p:frame.p,radius:frame.radius,yaw:frame.yaw??0,pitch:frame.pitch??0,focus:0,reel:0,roll:0,background:frame.p===0?1:0});
        track=createMotionTrack({keyframes:[pose(manifest.approach[0]),pose(manifest.approach.at(-1))]});manualEnd=progressForRadius(track,.21);navigation=createNavigation(track,manifest.approach[0].radius,.42,manualEnd);navigation.start(now());
        size();desiredKind='approach';const frame=manifest.approach[0];let bitmap;
        do{bitmap=await cache.request(frame.asset);}while(!bitmap&&!disposed);
        if(disposed)return;
        paint(frame,'approach',bitmap,now());
        metrics.firstPaintAtMs=now();
        // Present the wide scene and a half-second orbit window first. Keep
        // only two decoded surfaces here, not the whole approach in RAM.
        await encoded.preload(manifest.orbit.slice(0,8).map(frame=>frame.asset));
        await cache.prefetch(manifest.orbit[0].asset);
        if(disposed)return;
        if(canvas.width!==decodeWidth||canvas.height!==decodeHeight){do{bitmap=await cache.request(frame.asset);}while(!bitmap&&!disposed);if(disposed)return;paint(frame,'approach',bitmap,now());}
        ready=true;metrics.phase='ready';metrics.readyAtMs=now();if($('loading'))$('loading').hidden=true;for(const id of ['reset','play'])if($(id))$(id).disabled=false;
        publish();emit('ready',{sourceMode:metrics.sourceMode});wake();
        // Cover the entire path sparsely before densifying it. These are still
        // the original frames; visible requests and directional lookahead lead
        // the queue, so scroll, Read and Watch never wait behind an idle tail.
        const coverage=manifest.approach.filter((_,i)=>i%12===0);
        coverage.push(selectFrame(manifest.approach,.74),manifest.approach.at(-1));
        encoded.preload([...coverage,...manifest.approach,...manifest.orbit.slice(8)].map(frame=>frame.asset)).catch(()=>{});
      }catch(error){if(!disposed){fail(error);throw error;}}
    })();return prepared;
  }
  return {start,command,seek,play,pause,reset,metrics,canvas,refresh:publish};
}

if(typeof document!=='undefined'&&document.getElementById('stage')){
  const player=createImagePlayer({stage:document.getElementById('stage'),viewport:document.getElementById('viewport'),canvas:document.createElement('canvas'),
    manifestUrl:new URL('./image-sequence.json?v=ebd608ddbe3f',import.meta.url),document,window,fetch,createImageBitmap});
  player.start().catch(()=>{});
}
