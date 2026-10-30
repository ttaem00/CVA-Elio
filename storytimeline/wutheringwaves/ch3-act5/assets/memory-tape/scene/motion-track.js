// Two poses interpolate linearly; playback owns the single progress clock.
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const fields=['yaw','pitch','radius','focus','reel','roll','background'];
const smooth=p=>p*p*(3-2*p);

export function createMotionTrack(data){
  const keys=data?.keyframes;
  if(!Array.isArray(keys)||keys.length!==2||keys[0].p!==0||keys[1].p!==1)throw new Error('Exactly two pose keys must span 0..1');
  for(const key of keys){
    for(const name of fields)if(!Number.isFinite(key[name]))throw new Error('Invalid '+name);
    if(key.radius<=0)throw new Error('Radius must be positive');
  }
  const from={...keys[0]},to={...keys[1]};
  const logFrom=Math.log(from.radius),logSpan=Math.log(to.radius)-logFrom;
  let fadeStart,fadeSpan;
  if(data.backgroundFade!==undefined){
    const fade=data.backgroundFade;
    if(!Array.isArray(fade)||fade.length!==2||!fade.every(Number.isFinite)||fade[1]<=0||fade[0]<=fade[1])throw new Error('Background fade requires two decreasing positive radii');
    fadeStart=Math.log(fade[0]);fadeSpan=fadeStart-Math.log(fade[1]);
  }
  function radiusAt(u){return u===0?from.radius:u===1?to.radius:Math.exp(logFrom+logSpan*u);}
  return {data,sample(progress,out={}){
    const p=clamp(progress);out.p=p;
    for(const name of fields)out[name]=name==='radius'?radiusAt(p):from[name]+(to[name]-from[name])*p;
    if(fadeSpan!==undefined){
      const fade=clamp((fadeStart-logFrom-logSpan*p)/fadeSpan);
      out.background=from.background+(to.background-from.background)*smooth(fade);
    }
    out.label=p===1?to.label:from.label;return out;
  },derivative(progress,out={}){
    const p=clamp(progress),slope=progress<0||progress>1?0:1;
    for(const name of fields)out[name]=name==='radius'?radiusAt(p)*logSpan*slope:(to[name]-from[name])*slope;
    if(fadeSpan!==undefined){
      const fade=clamp((fadeStart-logFrom-logSpan*p)/fadeSpan);
      out.background=(to.background-from.background)*6*fade*(1-fade)*(-logSpan/fadeSpan)*slope;
    }
    return out;
  }};
}

// A scalar progress transition with the incoming derivative kept in seconds.
// The second handle can soften late motion without changing either spatial key.
export function createBezierTransition(from,to,startVelocity,duration,secondHandleFraction=.4){
  if(![from,to,startVelocity,duration,secondHandleFraction].every(Number.isFinite)||from<0||from>1||to<0||to>1||duration<0||secondHandleFraction<0||secondHandleFraction>1)throw new RangeError('Invalid Bezier transition');
  if(from===to||duration===0)return {duration:0,sample(){return {value:to,velocity:0,q:1};}};
  const secondHandle=from+secondHandleFraction*(to-from);
  let seconds=duration;
  if(startVelocity!==0){
    const bound=startVelocity*(to-from)>0?secondHandle:startVelocity>0?1:0;
    const available=3*(bound-from)/startVelocity;
    if(available<=0)throw new RangeError('Incoming velocity points outside progress range');
    seconds=Math.min(seconds,available);
  }
  const handle=from+startVelocity*seconds/3;
  return {duration:seconds,sample(elapsedSeconds){
    const q=clamp(elapsedSeconds/seconds),v=1-q;
    const value=q===0?from:q===1?to:clamp(v*v*v*from+3*v*v*q*handle+3*v*q*q*secondHandle+q*q*q*to);
    const velocity=q===0?startVelocity:3*(v*v*(handle-from)+2*v*q*(secondHandle-handle)+q*q*(to-secondHandle))/seconds;
    return {value,velocity,q};
  }};
}
