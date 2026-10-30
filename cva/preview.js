(function () {
  'use strict';
  const mount=document.getElementById('preview');
  let dispose;
  function render(id){
    const pattern=FW_CATALOG.patterns.find(p=>p.id===id);
    if(!pattern||document.body.dataset.pattern===id)return;
    try {
      dispose?.();
      const section=FW_CONTENT.makeSection(pattern);
      mount.innerHTML=CVA_FORMA_CONTEXT.complete(section,FormaWeb.renderSection(section,0,false)).replace(/\bsrc="assets\//g,'src="../assets/');
      dispose=FW_INIT(mount);
      document.title=`${pattern.name} · Elio 관계 표현 미리보기`;document.body.dataset.pattern=pattern.id;document.body.dataset.ready='true';
    } catch(error){mount.textContent='이 표현을 불러오지 못했습니다. 원래 표현을 새 창에서 확인해 주세요.';document.body.dataset.ready='error';console.error(error);}
  }
  window.addEventListener('message',event=>{if(event.source===parent&&event.origin===location.origin&&event.data?.type==='cva.preview.select')render(event.data.patternId);});
  window.addEventListener('pagehide',()=>dispose?.(),{once:true});
  render(new URLSearchParams(location.search).get('pattern')||FW_CATALOG.patterns[0].id);
  if(parent!==window)parent.postMessage({type:'cva.preview.ready'},location.origin==='null'?'*':location.origin);
}());
