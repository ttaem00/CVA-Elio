const youtubeHosts=new Set(['www.youtube.com','youtube.com','m.youtube.com','youtu.be']);

// Keep the original page; autoplay is a best-effort request, not a playback guarantee.
export function replayUrl(href){
  let url;
  try{url=new URL(href);}catch{return href;}
  if(!['https:','http:'].includes(url.protocol)||!youtubeHosts.has(url.hostname))return href;
  url.searchParams.set('autoplay','1');
  return url.href;
}
