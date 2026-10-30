(function(){
  'use strict';
  const q=new URLSearchParams(location.search),template=CVA_TEMPLATES.entries.find(e=>e.id===q.get('template')),section=CVA_SECTIONS.entries.find(e=>e.id===q.get('section'));
  const profile=Object.hasOwn(CVA_TOKENS.profiles,q.get('profile'))?q.get('profile'):template?.preferredProfile||section?.preferredProfile||'elio',palette=Object.hasOwn(CVA_TOKENS.palettes,q.get('palette'))?q.get('palette'):'';
  let doc;
  try {
    if(q.has('atom')){
      const C=CVA_COMPONENTS, atoms={
        heading:C.heading({eyebrow:'장면 이야기',title:'이어지는 순간',body:'제목과 설명을 구분합니다.'}),
        button:C.button('내용 확인',{target:'atom-preview',tone:'primary'})+'<div class="cva-actions">'+C.button('이전 장면',{target:'atom-preview',tone:'secondary'})+'</div>',
        badge:C.badge('제2장 · 여섯 번째 이야기')+'<div class="cva-actions">'+C.badge('현재 장면',{kind:'current'})+C.badge('검토 완료',{kind:'complete'})+'</div>',
        media:C.media('adaptive-notebook',{title:'장면과 출처를 함께',caption:'CVA 창작 정물 · 관측 수첩'}),
        panel:C.panel({title:'지금 살펴보는 장면',body:'제목·설명·상태를 한 항목 안에서 읽습니다.',label:'작성 예시'}),
        field:C.field({id:'atom-field',label:'페이지 제목',kind:'text',value:'함께 이어지는 순간',hint:'이 제목은 보관한 편집 입력에도 남습니다.',required:true}),
        tabs:C.tabs([{id:'first',label:'전체'},{id:'second',label:'상세'}],{active:'first'})+'<p id="first" class="cva-body">현재 위치는 글자와 밑줄로 표시합니다.</p><span id="second"></span>',
        quote:C.quote('장면과 설명이 서로를 이해하게 합니다.','편집 예시')
      };
      if(!Object.prototype.hasOwnProperty.call(atoms,q.get('atom')))throw new Error('등록되지 않은 기본 요소');
      document.getElementById('page').innerHTML='<div class="cva-page" data-cva data-cva-profile="'+profile+'" style="'+C.escape(CVA_RENDERER.profileStyle(profile,palette))+';padding:0!important;min-height:280px"><section id="atom-preview" class="cva-module" style="padding:20px;min-height:280px">'+atoms[q.get('atom')]+'</section></div>';
      return;
    }
    if(q.has('element')){
      const id=q.get('element');
      document.getElementById('page').innerHTML='<div class="cva-page" data-cva data-cva-profile="'+profile+'" style="'+CVA_COMPONENTS.escape(CVA_RENDERER.profileStyle(profile,palette))+';padding:20px!important;min-height:280px"><section class="cva-module">'+CVA_ELEMENTS.render(id,CVA_ELEMENTS.defaults(id),{id:'thumb-element'})+'</section></div>';
      return;
    }
    if(template)doc=CVA_TEMPLATES.create(template.id,profile);
    else if(q.has('section'))doc=CVA_SECTIONS.create(q.get('section'),{namespace:'thumb-section',profile});
    else if(q.has('scene')){
      const scene=CVA_SCENES.entries.find(e=>e.id===q.get('scene'));
      if(!scene)throw new Error('등록되지 않은 확장 표현');
      const block=CVA_MODULES.create('scene-composition','thumb-scene');block.variant=scene.variant;block.props=JSON.parse(JSON.stringify(scene.props));
      doc={schema:'cva.page.v2',title:scene.name,description:'',profile,modules:[block]};
    } else if(q.has('pattern')){
      const pattern=(FW_CATALOG.patterns||[]).find(p=>p.id===q.get('pattern'));
      if(!pattern)throw new Error('등록되지 않은 표현');
      const block=CVA_MODULES.create('forma-pattern','thumb-pattern');block.props.patternId=pattern.id;block.props.title='';block.props.body='';
      doc={schema:'cva.page.v2',title:pattern.name,description:'',profile,modules:[block]};
    } else {
      const def=CVA_MODULES.definitions.find(d=>d.type===q.get('module'));
      if(!def)throw new Error('등록되지 않은 모듈');
      doc={schema:'cva.page.v2',title:def.name,description:'',profile,modules:[CVA_MODULES.create(def.type,'thumb-module')]};
    }
    if(['vertical','horizontal','original'].includes(q.get('orientation')))doc.modules.forEach(b=>b.orientation=q.get('orientation'));
    if(palette)doc.presentation={...doc.presentation,palette};
    else if(q.get('palette')==='original'&&doc.presentation)delete doc.presentation.palette;
    document.getElementById('page').innerHTML=CVA_RENDERER.renderDocument(doc);
    // A single expression should show its whole structure, including the join.
    // Template previews keep the first page view; no content model is changed.
    if(!template){
      const page=document.querySelector('.cva-page');
      const fit=()=>{page.style.transform='scale('+Math.min(1,900/Math.max(900,page.offsetHeight))+')';page.style.transformOrigin='top center';};
      new ResizeObserver(fit).observe(page);
      page.querySelectorAll('img').forEach(img=>img.addEventListener('load',fit,{once:true}));
      document.fonts.ready.then(fit);fit();
    }
  }catch(error){document.getElementById('page').textContent=error.message;}
}());
