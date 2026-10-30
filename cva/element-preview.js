(function(){
  'use strict';
  const page=document.getElementById('library-preview');
  let dispose,signature='';
  CVA_COMPONENTS.forwardPreviewDownloads(page,parent,location.origin);
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='cva.library.component')return;
    try{
      const {id,props,profile,palette}=event.data;
      const native=event.data.kind==='element';
      const descriptor=native?CVA_ELEMENTS.get(id):CVA_LIBRARY.components.find(c=>c.id===id);
      if(!descriptor)throw new Error('등록되지 않은 기본 요소입니다.');
      const selected=Object.hasOwn(CVA_TOKENS.profiles,profile)?profile:'elio',selectedPalette=Object.hasOwn(CVA_TOKENS.palettes,palette)?palette:'';
      const nextSignature=JSON.stringify({kind:event.data.kind,id,props}),existing=page.querySelector('.cva-page');
      if(existing&&signature===nextSignature){
        existing.dataset.cvaProfile=selected;existing.style.cssText=CVA_RENDERER.profileStyle(selected,selectedPalette);
        parent.postMessage({type:'cva.library.rendered',id,requestId:event.data.requestId},location.origin);return;
      }
      const html=native?CVA_ELEMENTS.render(id,props,{id:'library-live'}):descriptor.render(props);
      dispose?.();
      page.innerHTML='<div class="cva-page" data-cva data-cva-profile="'+selected+'" style="'+CVA_COMPONENTS.escape(CVA_RENDERER.profileStyle(selected,selectedPalette))+'"><section class="cva-module">'+html+(id==='tabs'?'<section id="library-overview" class="preview-note"><h2>개요</h2><p>부분 탐색은 해당 본문으로 이동하는 링크입니다.</p></section><section id="library-sources" class="preview-note"><h2>출처</h2><p>현재 위치와 다음에 읽을 부분을 구분합니다.</p></section>':'')+'</section></div>';
      signature=nextSignature;
      dispose=native?CVA_ELEMENTS.mount(page):null;
      parent.postMessage({type:'cva.library.rendered',id,requestId:event.data.requestId},location.origin);
    }catch(error){dispose?.();dispose=null;signature='';page.textContent='미리보기를 만들지 못했습니다: '+error.message;parent.postMessage({type:'cva.library.error',message:error.message,requestId:event.data.requestId},location.origin);}
  });
  parent.postMessage({type:'cva.library.ready'},location.origin);
  window.addEventListener('pagehide',()=>dispose?.(),{once:true});
}());
