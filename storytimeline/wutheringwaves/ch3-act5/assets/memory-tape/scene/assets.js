const response=await fetch(new URL('./assets.json?v=2b7e5d31b770',import.meta.url));
if(!response.ok)throw Error('Asset manifest HTTP '+response.status);
export const assets=await response.json();

export function assetUrl(name){
 const asset=assets.files[name];
 if(!asset)throw Error('Unknown Memory asset');
 const key=`memory-tape/${asset.sha256}/${asset.filename}`;
 // Local preview is separate from the production hotlink policy. Its builder
 // stages precisely these hashes; localhost is never a production allowed origin.
 return ['127.0.0.1','localhost','[::1]'].includes(location.hostname)
  ?new URL('../media/'+key,import.meta.url).href:assets.deliveryBase+'/'+key;
}

// Discover the two live-scene downloads while the renderer's module graph is
// still loading. The viewer consumes these same CORS fetches from HTTP cache.
export function preloadLiveAssets(){
 for(const name of ['gaussian','cassette']){
  const link=document.createElement('link');
  link.rel='preload';link.as='fetch';link.crossOrigin='anonymous';
  link.href=assetUrl(name);document.head.append(link);
 }
}
