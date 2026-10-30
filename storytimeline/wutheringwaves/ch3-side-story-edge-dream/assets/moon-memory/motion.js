// One scroll coordinate owns camera, captions and transitions.
export const clamp = value => Math.max(0, Math.min(1, value));
export const range = (value, from, to) => clamp((value - from) / (to - from));
export const smooth = value => value * value * (3 - 2 * value);
const ramp = (p, a, b) => smooth(range(p, a, b));
export const FILM_RATE = 1.35;
export const ENDING_RATE = 2;
export const EMBRACE_SECONDS = 2.2;
export const FINAL_SECONDS = 1.2;
const playbackKeys = [[0,0],[.10,.6/FILM_RATE],[.21,1.3/FILM_RATE],
  [.33,2.1/FILM_RATE],[.46,3.4/FILM_RATE],
  [.785,3.4/FILM_RATE+EMBRACE_SECONDS],
  [.925,3.4/FILM_RATE+EMBRACE_SECONDS+5/ENDING_RATE],
  [1,3.4/FILM_RATE+EMBRACE_SECONDS+5/ENDING_RATE+FINAL_SECONDS]];
export const PLAYBACK_SECONDS = playbackKeys.at(-1)[1];
function interpolateKeys(value, input, output) {
  const pair=playbackKeys.findIndex(row=>value<=row[input]);
  if(pair<=0)return playbackKeys[0][output];
  const a=playbackKeys[pair-1],b=playbackKeys[pair];
  return a[output]+(b[output]-a[output])*(value-a[input])/(b[input]-a[input]);
}
export const playbackRemaining = (from=0) => PLAYBACK_SECONDS-interpolateKeys(clamp(from),0,1);
export function playbackProgress(seconds,from=0) {
  const time=Math.min(PLAYBACK_SECONDS,interpolateKeys(clamp(from),0,1)+Math.max(0,seconds));
  return interpolateKeys(time,1,0);
}
const shots = [
  {id:'reach',start:0,end:.10,frames:36,title:'다시, 너에게.',copy:'부서진 꿈의 조각을 따라'},
  {id:'grasp',start:.10,end:.21,frames:42,title:'남겨진 조각을 하나씩.',copy:'데이비드가 있던 자리에서'},
  {id:'merge',start:.21,end:.33,frames:48,title:'다시 만날 길이 이어진다.',copy:'흩어졌던 드림 밴드가'},
  {id:'imprint',start:.33,end:.46,frames:78,title:'너를 기억하는 사람들.',copy:'그가 남긴 마크를 이어받아'},
];
const filmSegments = [...shots, {id:'ending',start:.785,end:.925,frames:300}];
export function filmPhase(progress) {
  const p=clamp(progress), shot=filmSegments.find(row=>p>=row.start&&p<row.end);
  return shot?{clip:shot.id,start:shot.start,end:shot.end,duration:shot.frames/60,
    rate:shot.id==='ending'?ENDING_RATE:FILM_RATE,
    time:Math.min(range(p,shot.start,shot.end)*shot.frames/60,(shot.frames-1)/60)}:null;
}
export function progressAtFilmTime(clip,time) {
  const shot=filmSegments.find(row=>row.id===clip);
  if(!shot)throw new RangeError('Unknown film phase');
  return shot.start+(shot.end-shot.start)*clamp(time/(shot.frames/60));
}
export function advanceLocal(progress, seconds) {
  const p=clamp(progress), elapsed=Math.max(0,seconds);
  if(p>=.46&&p<.785)return Math.min(.785,p+elapsed/EMBRACE_SECONDS*(.785-.46));
  if(p>=.925)return Math.min(1,p+elapsed/FINAL_SECONDS*.075);
  return p;
}
export function sampleMemory(value, endingFrames=300, endingFps=60) {
  const p=clamp(value),shot=shots.find(row=>p<row.end)||shots.at(-1);
  const camera=smooth(range(p,.46,.775)),end=p>=.785;
  const pulse=(at,width)=>Math.max(0,1-Math.abs(p-at)/width);
  return {progress:p,phase:p<.46?'fragments':p<.785?'embrace':p<.925?'ending':'good-dream',
    film:end?{clip:'ending',time:Math.min(range(p,.785,.925)*endingFrames/endingFps,(endingFrames-1)/endingFps)}
      :{clip:shot.id,time:Math.min(range(p,shot.start,shot.end)*shot.frames/60,(shot.frames-1)/60)},
    embrace:ramp(p,.455,.485),ending:ramp(p,.785,.805),final:ramp(p,.925,.95),
    title:p<.46?'다시, 너에게.':p<.68?'혼자 보았던 달을, 이제 너에게.':'이제… 깨어날 시간이야.',
    copy:p<.46?'부서진 기억을 따라':p<.68?'달에서 다시 만난 루시와 데이비드':'데이비드 · 마지막 인사',
    captionOpacity:p<.46?1:ramp(p,.49,.515)*(1-ramp(p,.735,.78)),
    yaw:-.22+camera*.50,pitch:-.015+camera*.04+Math.sin(camera*Math.PI)*.025,
    dolly:Math.exp(Math.log(1.10)+(Math.log(.84)-Math.log(1.10))*camera),
    fog:p<.44?.12:p<.805?(.58+.30*Math.sin(camera*Math.PI))*(1-ramp(p,.775,.805)):0,
    rgb:p>=.46&&p<.785?Math.max(pulse(.466,.018),pulse(.78,.018))*.88:0,
    scan:range(p,.455,.505),
    memory:range(p,.46,.785),
    fragments:p>=.46&&p<.785?(.30+.70*camera)*ramp(p,.46,.49):0,
    glitch:p>=.785?0:Math.max(pulse(.10,.014),pulse(.21,.014),pulse(.33,.014),pulse(.466,.022),
      pulse(.56,.018),pulse(.64,.018),pulse(.715,.018),pulse(.78,.022))*.88,
    complete:p>=.999};
}
