// The camera, readable words, cassette core and optical surroundings have
// different jobs. Their seconds live here; camera progress never cuts text short.
const clamp=x=>Math.max(0,Math.min(1,x));
const range=(time,from,to)=>clamp((time-from)/(to-from));
const smooth=x=>x*x*(3-2*x);

// Like the supplied slider studies, position owns deformation. The same scene
// position gives the same glyph fragments when scrolling forwards or backwards.
export function sampleTextSignal(progress){
  const p=Number.isFinite(progress)?clamp(progress):0;
  const envelope=(from,to)=>p<=from||p>=to?0:Math.sin(Math.PI*range(p,from,to))**1.4;
  return {title:envelope(.005,.09),question:envelope(.24,.58),quote:envelope(.08,.52),
    slice:Math.round(Math.sin(p*91)*9),pixelX:Math.round(Math.sin(p*57)*3),pixelY:Math.round(Math.cos(p*73)*2)};
}

export function sampleIntroTypography(progress){
  return {titleOpacity:1-smooth(range(progress,.02,.18)),
    questionOpacity:smooth(range(progress,.12,.30))*(1-smooth(range(progress,.56,.66)))};
}

export function entryPresentation(mode){
  if(mode==='read')return {mode,duration:7.8,cameraDuration:4.5,endProgress:.74,readerAt:6.35,
    core:[2.95,5.2],spread:[3.55,7.2],surroundings:[3.75,6.9],whole:[6.9,7.8],
    titleOut:[.1,.8],questionIn:[.55,1.25],questionOut:[3.9,4.5]};
  if(mode==='watch')return {mode,duration:5.3,cameraDuration:5.3,endProgress:.74,linkAt:3.45,
    glow:[1.4,3.45],core:[4.15,4.85],spread:[4.15,5.2],surroundings:[4.2,5.1],whole:[4.65,5.3],
    quoteIn:[.06,.42],quoteOut:[3.45,3.95],metadataOut:[3.55,4]};
  throw new RangeError('Unknown entry presentation');
}

export function sampleEntryPresentation(plan,seconds,initial={}){
  const t=Math.max(0,seconds),phase=window=>range(t,...window);
  const initialTitle=Number.isFinite(initial.titleOpacity)?clamp(initial.titleOpacity):1;
  const initialQuestion=Number.isFinite(initial.questionOpacity)?clamp(initial.questionOpacity):0;
  return {core:phase(plan.core),spread:phase(plan.spread),surroundings:phase(plan.surroundings),
    glow:plan.glow?smooth(phase(plan.glow)):0,
    entry:range(t,plan.core[0],plan.duration),overlayOpacity:1-smooth(phase(plan.whole)),
    titleOpacity:plan.mode==='read'?initialTitle*(1-smooth(phase(plan.titleOut))):1-smooth(range(t,0,.45)),
    questionOpacity:plan.mode==='read'?(initialQuestion+(1-initialQuestion)*smooth(phase(plan.questionIn)))*(1-smooth(phase(plan.questionOut))):0,
    quoteOpacity:plan.mode==='watch'?smooth(phase(plan.quoteIn))*(1-smooth(phase(plan.quoteOut))):0,
    metadataOpacity:plan.mode==='watch'?1-smooth(phase(plan.metadataOut)):0,
    handoff:plan.mode==='watch'&&t>=plan.linkAt,done:t>=plan.duration};
}
