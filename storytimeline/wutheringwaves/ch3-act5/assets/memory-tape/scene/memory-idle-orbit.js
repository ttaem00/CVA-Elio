// Keep the original broad orbit. Choose its first direction from the current view,
// never by rotating the cassette independently of its Gaussian scene and reel.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function idleHeading(view){
  const camera=view?.camera,pivot=view?.pivot;
  const dx=camera&&pivot?camera.x-pivot.x:0;
  const dy=camera&&pivot?camera.y-pivot.y:0;
  const dz=camera&&pivot?camera.z-pivot.z:1;
  // The supplied cassette's two broad faces have world normals +Z / -Z.
  const angle=Math.atan2(dx,dz),face=dz>=0?0:Math.sign(angle)*Math.PI;
  const relative=Math.atan2(Math.sin(angle-face),Math.cos(angle-face));
  return {yaw:Math.abs(relative)<1e-6?1:-Math.sign(relative),pitch:dy<0?-1:1};
}

export function idleOrbit(progress,phase,direction={yaw:1,pitch:1}){
  return {yaw:(12+26*smooth(.05,.3,progress))*Math.sin(phase)*direction.yaw,
    pitch:1.4*Math.sin(phase*.7)*direction.pitch};
}
