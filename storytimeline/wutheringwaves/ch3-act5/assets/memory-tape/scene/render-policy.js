// Renderer strings are capability evidence, not a browser preference API.
export function rendererProfile(name=''){
 const software=/swiftshader|llvmpipe|softpipe|lavapipe|microsoft basic render|software (?:raster|render)|\bwarp\b/i.test(name);
 const hardware=!software&&/nvidia|geforce|radeon|\bamd\b|\bintel\b|\bapple\b|adreno|mali|powervr|vivante|qualcomm/i.test(name);
 const mode=software?'software':hardware?'gpu':'unknown';
 return {mode,source:software?'prerender-video':'gaussian',reason:software?'software-renderer':hardware?'hardware-renderer':'renderer-info-unavailable',
  lod:!hardware,splatBudget:software?150000:hardware?null:350000,
  gaussianScale:software?.5:hardware?1:.75,maxGaussianPixels:software?260000:hardware?Infinity:700000};
}

export function gaussianSize(width,height,profile){
 const scale=Math.min(profile.gaussianScale,Math.sqrt(profile.maxGaussianPixels/(width*height)));
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}
