import {clamp} from './motion-track.js?v=6b481f834d5d';
import {idleHeading,idleOrbit} from './memory-idle-orbit.js?v=1f15ff9806ff';

export const NAVIGATION={scrollEnd:.97,dragDegreesPerWidth:320,pitchLimit:88,resumeMs:850,autoAmplitude:12,autoPeriod:16,scrubSeconds:.16,dragSeconds:.055,inertiaSeconds:.16};
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};

// Exact critically damped update: a new target changes acceleration, never v.
function spring(x,v,goal,dt,seconds){
 const omega=2/seconds,offset=x-goal,c=v+omega*offset,decay=Math.exp(-omega*dt);
 return {value:goal+(offset+c*dt)*decay,velocity:(v-omega*c*dt)*decay};
}

// The flick target itself coasts exponentially. Integrate that forcing exactly.
function coastSpring(x,v,goal,speed,dt,seconds){
 if(speed===0)return {...spring(x,v,goal,dt,seconds),goal,speed};
 const omega=2/seconds,k=1/NAVIGATION.inertiaSeconds,a=speed/k,end=goal+a;
 const inertia=Math.exp(-k*dt),decay=Math.exp(-omega*dt);
 let value,velocity;
 if(Math.abs(omega-k)<1e-8){
  const b=x-end,c=v+omega*b,q=b+c*dt-.5*omega*omega*a*dt*dt;
  value=end+q*decay;velocity=(c-omega*omega*a*dt-omega*q)*decay;
 }else{
  const a1=omega*omega*a/((omega-k)*(omega-k)),b=x-end+a1,c=v-k*a1+omega*b;
  value=end-a1*inertia+(b+c*dt)*decay;
  velocity=k*a1*inertia+(c-omega*(b+c*dt))*decay;
 }
 return {value,velocity,goal:goal+a*(1-inertia),speed:speed*inertia};
}

// Integral of the idle speed ramp smoothstep(t/.65), in seconds.
function idleTime(seconds){
 if(seconds<=0)return 0;
 if(seconds>=.65)return seconds-.325;
 const u=seconds/.65;return .65*(u*u*u-.5*u*u*u*u);
}

export function progressForRadius(track,radius){
 const pose={};
 if(radius>=track.sample(0,pose).radius)return 0;
 if(radius<=track.sample(1,pose).radius)return 1;
 let a=0,b=1;
 for(let i=0;i<40;i++){const m=(a+b)/2;if(track.sample(m,pose).radius>radius)a=m;else b=m;}
 return (a+b)/2;
}

// Keep the third positional argument for existing callers; zoom is input-owned.
export function createNavigation(track,baseRadius,_introTarget=.42,manualEnd=NAVIGATION.scrollEnd){
 const ceiling=clamp(manualEnd);
 let progress=0,goal=0,progressVelocity=0,orbit=0,orbitGoal=0,orbitVelocity=0;
 let tilt=0,tiltGoal=0,tiltVelocity=0,coastVelocity=0;
 let phase=0,autoYaw=0,autoPitch=0,autoYawVelocity=0,autoPitchVelocity=0;
 let held=false,last=0,inputAt=-Infinity,started=false;
 let lastAuto=false,lastView;const pose={},base={},slope={};
 let idleDirection={yaw:1,pitch:1};

 const radiusProgress=radius=>progressForRadius(track,radius);
 function start(now){last=now;inputAt=now;started=true;}
 function reset(now){
  progress=goal=progressVelocity=orbit=orbitGoal=orbitVelocity=tilt=tiltGoal=tiltVelocity=coastVelocity=0;
  phase=autoYaw=autoPitch=autoYawVelocity=autoPitchVelocity=0;
  held=false;start(now);
 }
 function interrupt(now){
  if(started)tick(now,lastAuto,lastView);
  orbit+=autoYaw;orbitGoal+=autoYaw;orbitVelocity+=autoYawVelocity;
  tilt+=autoPitch;tiltGoal+=autoPitch;tiltVelocity+=autoPitchVelocity;
  phase=autoYaw=autoPitch=autoYawVelocity=autoPitchVelocity=0;
  inputAt=now;coastVelocity=0;
 }
 function begin(now){
  interrupt(now);held=true;goal=progress;orbitGoal=orbit;tiltGoal=tilt;
  // A direct grab stops at the hand. Momentum against a frozen goal rebounds.
  progressVelocity=orbitVelocity=tiltVelocity=0;
  return {yaw:orbitGoal,pitch:tiltGoal,progress:goal};
 }
 function move(yaw,pitch,speed=0,now=last){
  if(started&&now>last)tick(now,lastAuto,lastView);
  orbitGoal=yaw;tiltGoal=clamp(pitch,-NAVIGATION.pitchLimit,NAVIGATION.pitchLimit);
  coastVelocity=clamp(speed,-150,150);
 }
 function release(now){
  if(started)tick(now,lastAuto,lastView);
  held=false;inputAt=now;
 }
 function scroll(delta,now){
  interrupt(now);const previous=goal;goal=clamp(goal+delta,0,ceiling);
  if(delta<0){const ratio=previous>0?goal/previous:0;orbitGoal*=ratio;tiltGoal*=ratio;}
 }
 function seek(value,now,immediate=false){
  interrupt(now);goal=clamp(value,0,ceiling);
  if(immediate){progress=goal;progressVelocity=0;}
 }
 function freeze(now){
  interrupt(now);held=false;goal=progress;orbitGoal=orbit;tiltGoal=tilt;
  progressVelocity=orbitVelocity=tiltVelocity=coastVelocity=0;
 }
 function adopt(from,now){
  held=false;progressVelocity=orbitVelocity=tiltVelocity=coastVelocity=0;
  phase=autoYaw=autoPitch=autoYawVelocity=autoPitchVelocity=0;
  progress=goal=radiusProgress(from.radius);track.sample(progress,base);
  orbit=orbitGoal=from.yaw-base.yaw;tilt=tiltGoal=from.pitch-base.pitch;
  last=now;inputAt=now;started=true;
 }
 function tick(now,autoEnabled,view){
  const previous=last,dt=started?Math.max(0,(now-last)/1000):0;
  last=now;lastAuto=autoEnabled;lastView=view;
  const next=spring(progress,progressVelocity,goal,dt,NAVIGATION.scrubSeconds);
  // Keep a deep adopted pose; ordinary wheel and pinch goals use the ceiling.
  const upper=Math.max(ceiling,progress,goal);
  progress=clamp(next.value,0,upper);progressVelocity=next.velocity;
  if(progress!==next.value)progressVelocity=0;
  const orbitStep=held?spring(orbit,orbitVelocity,orbitGoal,dt,NAVIGATION.dragSeconds)
   :coastSpring(orbit,orbitVelocity,orbitGoal,coastVelocity,dt,.11);
  orbit=orbitStep.value;orbitVelocity=orbitStep.velocity;
  if(!held){orbitGoal=orbitStep.goal;coastVelocity=orbitStep.speed;}
  const tiltStep=spring(tilt,tiltVelocity,tiltGoal,dt,held?NAVIGATION.dragSeconds:.11);
  tilt=tiltStep.value;tiltVelocity=tiltStep.velocity;
  const idleSeconds=Math.max(0,(now-inputAt-NAVIGATION.resumeMs)/1000);
  const auto=started&&autoEnabled&&!held&&idleSeconds>0;
  let phaseVelocity=0;
  if(auto){
   if(phase===0)idleDirection=idleHeading(view);
   const previousIdle=Math.max(0,(previous-inputAt-NAVIGATION.resumeMs)/1000);
   const rate=Math.PI*2/NAVIGATION.autoPeriod;
   phase+=rate*(idleTime(idleSeconds)-idleTime(previousIdle));
   phaseVelocity=rate*smooth(idleSeconds/.65);
  }
  track.sample(progress,pose);track.derivative(progress,slope);
  if(autoEnabled){
   const idle=idleOrbit(progress,phase,idleDirection);autoPitch=idle.pitch;
   // A small loop needs no angle saturation or dwell at a compressed boundary.
   // Only the automatic offset narrows near an edge; manual orbit stays free.
   const relative=((pose.yaw+orbit+90)%180+180)%180-90;
   const angle=relative*Math.PI/180,baseVelocity=slope.yaw*progressVelocity+orbitVelocity;
   const amplitude=NAVIGATION.autoAmplitude*Math.cos(angle)**2;
   const amplitudeVelocity=-NAVIGATION.autoAmplitude*Math.sin(2*angle)*Math.PI/180*baseVelocity;
   autoYaw=amplitude*Math.sin(phase)*idleDirection.yaw;
   autoYawVelocity=(amplitudeVelocity*Math.sin(phase)+amplitude*Math.cos(phase)*phaseVelocity)*idleDirection.yaw;
   autoPitchVelocity=1.4*.7*Math.cos(phase*.7)*phaseVelocity*idleDirection.pitch;
  }else{autoYawVelocity=autoPitchVelocity=0;}
  pose.yaw+=orbit+autoYaw;
  pose.pitch=clamp(pose.pitch+tilt+autoPitch,-89,89);
  pose.label=held?'직접 회전':auto?'자동 회전 · 드래그 가능':'스크롤 · 회전하며 접근';
  return pose;
 }
 function moving(now,autoEnabled){
  return Math.abs(goal-progress)>1e-7||Math.abs(progressVelocity)>1e-6
   ||Math.abs(orbitGoal-orbit)>.001||Math.abs(orbitVelocity)>.001
   ||Math.abs(tiltGoal-tilt)>.001||Math.abs(tiltVelocity)>.001||Math.abs(coastVelocity)>.01
   // Keep the render clock awake through the idle resume delay after reset.
   ||started&&autoEnabled&&!held;
 }
 function snapshot(){
  track.sample(progress,base);track.derivative(progress,slope);
  const rawPitch=base.pitch+tilt+autoPitch;
  return {progress,targetProgress:goal,progressVelocity,manualEnd:ceiling,orbit,orbitTarget:orbitGoal,pitchOffset:tilt,
   autoAngle:autoYaw,autoPhase:phase,held,intro:false,inputAt,zoom:baseRadius/base.radius,
   angularVelocity:{yaw:slope.yaw*progressVelocity+orbitVelocity+autoYawVelocity,
    pitch:Math.abs(rawPitch)>=89?0:slope.pitch*progressVelocity+tiltVelocity+autoPitchVelocity}};
 }
 return {start,reset,interrupt,begin,move,release,scroll,seek,freeze,adopt,tick,moving,snapshot,progressForRadius:radiusProgress,
  pauseClock(now){if(started)inputAt+=Math.max(0,now-last);last=now;},
  get progress(){return progress;},get targetProgress(){return goal;}};
}
