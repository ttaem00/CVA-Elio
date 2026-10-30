const clamp=value=>Math.max(0,Math.min(1,value));

// Only the first layout selects network assets. The root manifest itself is the
// 1440p default; its optional 1080p reference avoids a duplicate 1440p manifest.
export function selectImageVariant(manifest,{stageWidth,stageHeight,devicePixelRatio=1}){
  if(!Number.isFinite(manifest?.width)||manifest.width<=0||!Number.isFinite(manifest?.height)||manifest.height<=0)throw new RangeError('Invalid native image size');
  const dpr=Number.isFinite(devicePixelRatio)&&devicePixelRatio>0?devicePixelRatio:1;
  const validLayout=[stageWidth,stageHeight].every(value=>Number.isFinite(value)&&value>0);
  const pixelHeight=validLayout?Math.min(stageHeight,stageWidth*manifest.height/manifest.width)*dpr:null;
  const reference=pixelHeight!==null&&pixelHeight<=1080&&Array.isArray(manifest.variants)
    ?manifest.variants.find(variant=>variant.height===1080&&variant.width===2560&&typeof variant.manifest==='string'&&variant.manifest.length>0)??null:null;
  return {reference,height:reference?.height??manifest.height,pixelHeight,stageWidth,stageHeight,devicePixelRatio:dpr};
}

// Keep compressed network bytes separately from the four decoded surfaces.
// A visible target jumps ahead of speculative preloads; neither starts a new
// decoder or an unbounded number of fetches.
export function createEncodedCache({load,maxBytes=64*1024*1024,concurrency=8}){
  if(typeof load!=='function'||!Number.isFinite(maxBytes)||maxBytes<1||!Number.isInteger(concurrency)||concurrency<1||concurrency>16)throw new TypeError('Invalid encoded cache');
  const entries=new Map(),jobs=new Map(),queue=[];let bytes=0,running=0,closed=false,fetches=0,hits=0;
  // Compressed transfers do not consume bitmap slots. Leave one lane available
  // for the displayed target instead of filling every lane with speculation.
  const backgroundLimit=concurrency>2?concurrency-1:concurrency;
  function pump(){
    while(!closed&&running<concurrency&&queue.length){
      const urgent=queue.findIndex(job=>job.urgent);
      if(urgent<0&&running>=backgroundLimit)break;
      const job=queue.splice(urgent<0?0:urgent,1)[0];running++;fetches++;
      Promise.resolve().then(()=>load(job.key,{priority:job.urgent?'high':'low'})).then(blob=>{
        if(closed){job.resolve(null);return;}
        if(!Number.isFinite(blob?.size)||blob.size<0)throw Error('Invalid encoded image');
        if(blob.size<=maxBytes){
          while(bytes+blob.size>maxBytes&&entries.size){const key=entries.keys().next().value;bytes-=entries.get(key).size;entries.delete(key);}
          entries.set(job.key,blob);bytes+=blob.size;
        }
        job.resolve(blob);
      }).catch(error=>{if(closed)job.resolve(null);else job.reject(error);}).finally(()=>{running--;jobs.delete(job.key);pump();});
    }
  }
  function get(key,priority){
    if(closed)return Promise.resolve(null);
    if(entries.has(key)){hits++;const blob=entries.get(key);entries.delete(key);entries.set(key,blob);return Promise.resolve(blob);}
    if(jobs.has(key)){
      const job=jobs.get(key),index=queue.indexOf(job);if(priority&&index>=0){job.urgent=true;queue.splice(index,1);queue.unshift(job);pump();}return job.promise;
    }
    let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;}),job={key,promise,resolve,reject,urgent:priority};
    jobs.set(key,job);if(priority)queue.unshift(job);else queue.push(job);pump();return promise;
  }
  return {has:key=>entries.has(key),request:key=>get(key,true),preload:keys=>Promise.all(keys.map(key=>get(key,false).then(()=>undefined))).then(()=>undefined),
    prioritize(keys){
      // Reorder bytes that will be needed next without promoting every future
      // frame to browser High priority or evicting an in-flight visible target.
      const waiting=new Set(keys);const ahead=queue.filter(job=>waiting.has(job.key)),rest=queue.filter(job=>!waiting.has(job.key));
      ahead.sort((a,b)=>keys.indexOf(a.key)-keys.indexOf(b.key));queue.splice(0,queue.length,...ahead,...rest);pump();
    },
    close(){closed=true;for(const job of queue)job.resolve(null);queue.length=0;entries.clear();bytes=0;},
    get metrics(){return {encodedBytes:bytes,encodedFrames:entries.size,encodedHits:hits,fetches,runningFetches:running,queuedFetches:queue.length,maxEncodedBytes:maxBytes,fetchConcurrency:concurrency};}};
}

// Encoded bytes and decoded pixels have different lifetimes. Keep one latest
// visible target and one replaceable future frame; the visible target runs first.
export function createFrameCache({load,decode,max=4}){
  if(typeof load!=='function'||typeof decode!=='function'||!Number.isInteger(max)||max<1||max>4)throw new TypeError('Invalid image cache');
  const frames=new Map();let queued=null,future=null,running=null,epoch=0,closed=false,decodes=0,closedBitmaps=0,hits=0;
  const close=bitmap=>{bitmap.close();closedBitmaps++;};
  const touch=(key,bitmap)=>{frames.delete(key);frames.set(key,bitmap);return bitmap;};
  const discard=job=>job?.resolve(null);
  async function pump(){
    if(running||closed||!queued&&!future)return;
    const job=queued||future;if(queued)queued=null;else future=null;running=job;
    try{
      const blob=await load(job.key);
      if(closed||job.epoch!==epoch){job.resolve(null);return;}
      decodes++;const bitmap=await decode(blob,job.key);
      if(closed||job.epoch!==epoch){close(bitmap);job.resolve(null);return;}
      touch(job.key,bitmap);
      while(frames.size>max){const key=frames.keys().next().value;close(frames.get(key));frames.delete(key);}
      job.resolve(bitmap);
    }catch(error){if(closed||job.epoch!==epoch)job.resolve(null);else job.reject(error);}
    finally{running=null;pump();}
  }
  function request(key){
    if(closed)return Promise.reject(new Error('Image cache is closed'));
    if(queued&&queued.key!==key){discard(queued);queued=null;}
    if(future&&future.key!==key){discard(future);future=null;}
    if(frames.has(key)){hits++;return Promise.resolve(touch(key,frames.get(key)));}
    if(running?.key===key&&running.epoch===epoch)return running.promise;
    if(queued?.key===key)return queued.promise;
    if(future?.key===key){const job=future;queued=job;future=null;pump();return job.promise;}
    let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    queued={key,epoch,promise,resolve,reject};pump();return promise;
  }
  function cancelPrefetch(){discard(future);future=null;}
  function prefetch(key){
    if(closed)return Promise.resolve(null);
    if(frames.has(key))return Promise.resolve(frames.get(key));
    if(running?.key===key&&running.epoch===epoch)return running.promise;
    if(queued?.key===key)return queued.promise;
    if(future?.key===key)return future.promise;
    cancelPrefetch();let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    future={key,epoch,promise,resolve,reject};pump();return promise;
  }
  function clear(){epoch++;discard(queued);queued=null;cancelPrefetch();for(const bitmap of frames.values())close(bitmap);frames.clear();}
  return {request,prefetch,cancelPrefetch,clear,close(){closed=true;clear();},get size(){return frames.size;},
    get state(){return {size:frames.size,queued:queued?.key??null,future:future?.key??null,running:running?.key??null,max,decodes,closedBitmaps,bitmapHits:hits};}};
}

export function selectFrame(frames,progress){
  if(!frames.length||!Number.isFinite(progress))throw new RangeError('Invalid frame selection');
  const p=clamp(progress);let lo=0,hi=frames.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(frames[mid].p<p)lo=mid+1;else hi=mid;}
  if(lo&&Math.abs(frames[lo-1].p-p)<=Math.abs(frames[lo].p-p))lo--;
  return frames[lo];
}

// Capture metadata is viewport-normalized, not the capture browser's stage.
// Center its letterbox once, using the current desktop or portrait dimensions.
export function mapFrameOutline(frame,{stageWidth,stageHeight,viewportWidth,viewportHeight}){
  if(![stageWidth,stageHeight,viewportWidth,viewportHeight].every(value=>Number.isFinite(value)&&value>0)||!Array.isArray(frame?.outline)||frame.outline.length<3)return null;
  const coordinates=frame.outline.map(point=>Array.isArray(point)?point:[point?.x,point?.y]);
  if(!coordinates.every(point=>point.length===2&&point.every(Number.isFinite)))return null;
  return coordinates.map(([u,v])=>({x:.5+(u-.5)*viewportWidth/stageWidth,y:.5+(v-.5)*viewportHeight/stageHeight}));
}
