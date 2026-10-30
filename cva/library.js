(function () {
  'use strict';
  const $ = id => document.getElementById(id), esc = CVA_COMPONENTS.escape;
  const kinds = {section:'섹션 조합',template:'페이지 템플릿',module:'블록·모듈',element:'UI 요소·이펙트',component:'기본 요소',interaction:'상태·움직임',pattern:'자체 관계 표현',scene:'확장 장면',elio:'Elio Story 원본'};
  const resources = CVA_LIBRARY.resources(), categories = CVA_LIBRARY.categories;
  const profiles = CVA_TOKENS.profiles, palettes = CVA_TOKENS.palettes;
  const icons = name => CVA_LIBRARY_ICONS.render(name);
  let current, page = 0, currentProps = {}, previewDocument = null, previewComponent = null, disposeReveal = null, previewRequest = 0, invalidProps = false;
  const observer = new ResizeObserver(entries => entries.forEach(({target,contentRect}) => {
    target.style.setProperty('--preview-scale', contentRect.width / 1440);
    target.style.setProperty('--compact-scale', contentRect.width / 480);
  }));
  function state() {
    const q = new URLSearchParams(location.search);
    const requestedPage=Number(q.get('page'));
    return {category:categories.some(c=>c.id===q.get('category'))?q.get('category'):'all',q:q.get('q')||'',kind:Object.hasOwn(kinds,q.get('kind'))?q.get('kind'):'all',item:q.get('item')||'',page:Number.isInteger(requestedPage)&&requestedPage>=0&&requestedPage<100?requestedPage:0,profile:Object.hasOwn(profiles,q.get('profile'))?q.get('profile'):'',palette:Object.hasOwn(palettes,q.get('palette'))?q.get('palette'):''};
  }
  function href(change = {}) {
    const next={...state(),...change}, q=new URLSearchParams();
    for(const [key,value] of Object.entries(next))if(value&&value!=='all')q.set(key,value);
    return 'library.html'+(q.size?'?'+q:'');
  }
  function resourceKey(resource) { return resource.kind+':'+resource.id; }
  function selectedProfile(resource=current) {
    const requested=state().profile;if(requested)return requested;
    if(resource?.kind==='template')return CVA_TEMPLATES.entries.find(entry=>entry.id===resource.id).preferredProfile;
    if(resource?.kind==='section')return CVA_SECTIONS.entries.find(entry=>entry.id===resource.id).preferredProfile;
    return 'elio';
  }
  function styledUrl(value, resource=current, profile=selectedProfile(resource)) {
    if(resource?.kind==='elio')return value;
    const url=new URL(value,location.href),palette=state().palette;
    url.searchParams.set('profile',profile);
    url.searchParams.set('palette',palette||'original');
    return url.pathname.split('/').pop()+url.search+url.hash;
  }
  function styleDocument(documentModel,resource=current) {
    const doc={...documentModel,profile:selectedProfile(resource)},presentation={...documentModel.presentation};
    if(state().palette)presentation.palette=state().palette;else delete presentation.palette;
    if(Object.keys(presentation).length)doc.presentation=presentation;else delete doc.presentation;
    return CVA_MODULES.normalizeDocument(doc);
  }
  function resourceUrl(resource) { return href({item:resourceKey(resource)}); }
  function navigate(change, focus = true, replace = false) {
    history[replace?'replaceState':'pushState'](null,'',href(change));page=0;render();
    if(focus)$('library-main').focus({preventScroll:true});
  }
  function formState() { navigate({q:$('query').value,kind:$('kind').value,item:'',page:0},false,true); }
  function filtered(s,category='all'){
    const q=s.q.trim().toLocaleLowerCase();
    return resources.filter(r=>(category==='all'||r.category===category||category==='labs'&&r.lab)&&(s.kind==='all'||r.kind===s.kind)&&(!q||[r.id,r.name,r.description,r.keywords,categories.find(c=>c.id===r.category)?.name,kinds[r.kind]].flat().join(' ').toLocaleLowerCase().includes(q)));
  }
  function categoryNav() {
    const s=state(),selected=s.category,pool=filtered(s);
    const list=[{id:'all',name:'모든 요소'},...categories];
    $('categories').innerHTML=list.map(c=>'<a href="'+esc(href({category:c.id,item:'',page:0}))+'" data-category="'+esc(c.id)+'"'+(selected===c.id?' aria-current="page"':'')+'>'+esc(c.name)+'<span>'+pool.filter(r=>c.id==='all'||r.category===c.id||c.id==='labs'&&r.lab).length+'</span></a>').join('');
  }
  function card(resource) {
    // Full Elio readers own navigation, media and observers. Open them explicitly;
    // a decorative catalogue thumbnail must not start a second reader runtime.
    let preview=resource.kind==='elio'?'':resource.previewUrl;
    if(resource.kind==='component')preview='thumb.html?atom='+encodeURIComponent(resource.id);
    if(preview)preview=styledUrl(preview,resource);
    const name=resource.name||resource.title||resource.id;
    return '<a class="resource-card" href="'+esc(resourceUrl(resource))+'" data-resource="'+esc(resourceKey(resource))+'">'+(preview?'<div class="card-preview"'+(['component','element'].includes(resource.kind)?' data-compact="true"':'')+' aria-hidden="true"><iframe src="'+esc(preview)+'" loading="lazy" tabindex="-1" title="'+esc(name)+' 미리보기" sandbox="allow-scripts allow-same-origin"></iframe></div>':'<div class="card-fallback" aria-hidden="true">'+esc(resource.kind==='elio'?'장면에서 이야기로':resource.kind==='interaction'?(resource.id==='text-reveal'?'말에 리듬을 더하다':'실행 → 진행 → 완료'):name)+'</div>')+'<div class="card-copy"><span class="card-kind">'+esc(kinds[resource.kind])+'</span><h3>'+esc(name)+'</h3><p>'+esc(resource.description||'실제 예제와 지원 입력을 확인하세요.')+'</p><div class="card-foot"><span>'+esc(categories.find(c=>c.id===resource.category)?.name||'공용 요소')+'</span><span>살펴보기 ↗</span></div></div></a>';
  }
  function browse() {
    observer.disconnect();
    const s=state(),category=categories.find(c=>c.id===s.category),matches=filtered(s,s.category);
    const per=18,max=Math.max(0,Math.ceil(matches.length/per)-1);page=Math.min(page,max);
    $('query').value=s.q;$('kind').value=s.kind;$('clear-query').hidden=!s.q;
    starterChoices(s);
    $('category-title').textContent=category?.name||'모든 요소';$('category-description').textContent=category?.description||'이름보다 쓰임을 먼저 보고 고르세요.';
    $('result-count').textContent=matches.length+'개 요소';
    $('element-expansion').hidden=true;
    $('results').innerHTML=matches.length?matches.slice(page*per,(page+1)*per).map(card).join(''):'<div class="empty"><h3>찾는 요소가 보이지 않나요?</h3><p>검색어를 짧게 바꾸거나 다른 분류에서 찾아보세요.<br>현재 구현된 요소만 결과에 표시합니다.</p><a href="'+esc(href({category:'all',q:'',kind:'all',item:'',page:0}))+'" data-reset>모든 요소 다시 보기 →</a></div>';
    $('pagination').innerHTML=max?'<button data-page="-1"'+(page===0?' disabled':'')+'>이전</button><span>'+(page+1)+' / '+(max+1)+'</span><button data-page="1"'+(page===max?' disabled':'')+'>다음</button>':'';
    document.querySelectorAll('.card-preview').forEach(node=>observer.observe(node));
  }
  function starterChoices(s) {
    const show=s.category==='all'&&s.kind==='all'&&!s.q.trim();
    $('start-points').hidden=!show;
    if(!show){$('starter-grid').innerHTML='';return;}
    const choices=[
      ['afterglow-reading','문장과 이미지로 읽기','이야기 · 에세이'],
      ['comparison-notebook','두 자료를 나란히 비교','자료 · 근거'],
      ['reference-workbench','찾고, 고르고, 기록하기','도감 · 작업실']
    ];
    $('all-templates').href=href({kind:'template',item:'',page:0});
    $('starter-grid').innerHTML=choices.map(([id,title,use])=>{
      const resource=resources.find(entry=>entry.kind==='template'&&entry.id===id);
      return '<a class="starter-card" aria-label="'+esc(title+' · '+use)+'" href="'+esc(resourceUrl(resource))+'" data-resource="'+esc(resourceKey(resource))+'"><article><header><span class="overline">'+esc(use)+'</span><h3>'+esc(title)+'</h3></header><div class="card-preview" aria-hidden="true"><iframe src="'+esc(styledUrl(resource.previewUrl,resource))+'" title="'+esc(title)+' 미리보기" loading="lazy" tabindex="-1" sandbox="allow-scripts allow-same-origin"></iframe></div><footer>내용을 바꿔 시작하기 <span aria-hidden="true">↗</span></footer></article></a>';
    }).join('');
    document.querySelectorAll('#starter-grid .card-preview').forEach(node=>observer.observe(node));
  }
  function toneFamilies() {
    if(!$('tone-comparison').open||current){$('tone-families').innerHTML='';return;}
    const s=state();
    if(!$('tone-families').querySelector('[data-tone-profile]'))$('tone-families').innerHTML=Object.entries(profiles).map(([id,entry])=>'<button type="button" class="tone-family" data-tone-profile="'+esc(id)+'" aria-pressed="'+String(s.profile===id)+'"><span class="card-preview" aria-hidden="true"><iframe src="'+esc(styledUrl('thumb.html?module=cards',null,id))+'" title="'+esc(entry.label)+' 스타일 예제" loading="lazy" tabindex="-1" sandbox="allow-scripts allow-same-origin"></iframe></span><span class="tone-label">'+(s.profile===id?'<span aria-hidden="true">✓ </span>':'')+esc(entry.label)+'</span></button>').join('');
    $('tone-families').querySelectorAll('[data-tone-profile]').forEach(button=>{
      const id=button.dataset.toneProfile,selected=s.profile===id;
      button.setAttribute('aria-pressed',String(selected));
      button.querySelector('.tone-label').textContent=(selected?'✓ ':'')+profiles[id].label;
      const frame=button.querySelector('iframe'),next=styledUrl('thumb.html?module=cards',null,id);
      if(frame.getAttribute('src')!==next)frame.setAttribute('src',next);
    });
    document.querySelectorAll('#tone-families .card-preview').forEach(node=>observer.observe(node));
  }
  function toneControls() {
    const s=state(),original=current?.kind==='elio'||!current&&s.kind==='elio';
    $('tone-controls').hidden=original;$('original-style-note').hidden=!original;
    const studioLink=document.querySelector('.site-header a[href^="index.html"]');
    if(studioLink)studioLink.href=styledUrl('index.html');
    const elioLink=document.querySelector('.elio-entry');
    if(elioLink)elioLink.href=href({kind:'elio',item:'',q:'',category:'all',page:0});
    if(original)return;
    $('library-profile').value=s.profile;$('library-palette').value=s.palette;
    const profile=selectedProfile(),palette=s.palette?palettes[s.palette].label:'원래 색상';
    $('tone-summary').textContent=(s.profile?profiles[profile].label:current?'예제 추천 · '+profiles[profile].label:'예제마다 추천하는 스타일')+' · '+palette;
    $('tone-comparison').hidden=Boolean(current);toneFamilies();

  }
  function changeTone(change) {
    history.pushState(null,'',href(change));refreshTone();
  }
  function refreshTone() {
    categoryNav();toneControls();
    if(current){
      if(previewDocument)previewDocument=styleDocument(previewDocument);
      updateCode();sendPreview();
      const back=$('detail').querySelector('[data-back]');if(back)back.href=href({item:''});
    }else browse();
  }
  function control(c) {
    const id='control-'+c.key,value=currentProps[c.key],options=c.options||[];
    const label='<label for="'+esc(id)+'">'+esc(c.label)+'</label>';
    if(c.kind==='checkbox')return '<div class="control check"><label for="'+esc(id)+'"><input type="checkbox" id="'+esc(id)+'" name="'+esc(c.key)+'"'+(value?' checked':'')+'>'+esc(c.label)+'</label></div>';
    const common=' id="'+esc(id)+'" name="'+esc(c.key)+'"';
    let input;
    if(c.kind==='select'||c.kind==='image'){const choices=c.kind==='image'?[{value:'',label:'이미지 없음'},...CVA_MODULES.media.map(m=>({value:m.id,label:m.label}))]:options;input='<select'+common+'>'+choices.map(o=>'<option value="'+esc(o.value)+'"'+(String(o.value)===String(value)?' selected':'')+'>'+esc(o.label)+'</option>').join('')+'</select>';}
    else if(c.kind==='number')input='<input'+common+' type="number" step="'+esc(c.step??'any')+'"'+(c.min===undefined?'':' min="'+esc(c.min)+'"')+(c.max===undefined?'':' max="'+esc(c.max)+'"')+' value="'+esc(value??'')+'">';
    else if(c.kind==='textarea')input='<textarea'+common+' rows="3" maxlength="2000">'+esc(value??'')+'</textarea>';
    else input='<input'+common+' value="'+esc(value??'')+'" maxlength="2000">';
    return '<div class="control">'+label+input+(c.hint?'<small>'+esc(c.hint)+'</small>':'')+'</div>';
  }
  function createDocument(resource) {
    if(resource.kind==='template')return styleDocument(CVA_TEMPLATES.create(resource.id),resource);
    if(resource.kind==='section')return styleDocument(CVA_SECTIONS.create(resource.id,{namespace:'library-section'}),resource);
    let block;
    if(resource.kind==='module')block=CVA_MODULES.create(resource.id,'library-example');
    if(resource.kind==='pattern'){block=CVA_MODULES.create('forma-pattern','library-example');Object.assign(block.props,{patternId:resource.id,title:'',body:''});block.props.section=CVA_MODULES.sectionFor(block);}
    if(resource.kind==='scene'){const scene=CVA_SCENES.entries.find(e=>e.id===resource.id);block=CVA_MODULES.create('scene-composition','library-example');block.variant=scene.variant;block.props=JSON.parse(JSON.stringify(scene.props));}
    return block?styleDocument({schema:'cva.page.v2',title:resource.name,modules:[block]},resource):null;
  }
  function sourceLinks(resource,descriptor) {
    if(resource.kind==='element')return '<details class="source-details"><summary>원본 위치·지원 범위</summary><p><a href="NATIVE_SOURCES.md">재사용 코드·출처·MIT 고지</a></p><p>'+esc(descriptor.source?.name||'CVA native')+' · '+esc(descriptor.source?.method||'설계 원리 적용')+'</p><p>'+esc(descriptor.lab?'Labs: 정지 상태를 기본으로 제공하는 실험적 표현입니다.':'일반 HTML·CSS·JavaScript에서 같은 속성과 동작을 사용합니다.')+'</p></details>';
    const files=[descriptor?.source||resource.source].flat().filter(v=>typeof v==='string').flatMap(file=>file.split(' → '));
    function sourceUrl(file){if(file==='catalog.js')return '../catalog.js';if(file.startsWith('tools/elio_preview/'))return '../elio/'+file;return '../source/'+(file.startsWith('tools/')?'':'cva/')+file;}
    return '<details class="source-details"><summary>원본 위치·지원 범위</summary>'+files.map(file=>'<p><a href="'+esc(sourceUrl(file))+'">'+esc(file)+'</a></p>').join('')+'<p>기본 요소는 공용 HTML 함수입니다. 모듈은 편집 문서의 구성 단위입니다. Elio 원본은 별도 이야기 입력과 리더를 사용합니다.</p>'+(descriptor?.constraints?'<p>'+esc([descriptor.constraints].flat().join(' · '))+'</p>':'')+'</details>';
  }
  function componentDetail(resource,descriptor) {
    if(resource.kind==='element')descriptor={...descriptor,consumers:[],controls:[{key:'variant',label:'표현 변형',kind:'select',options:descriptor.variants.map(v=>({value:v.id,label:v.label}))},...descriptor.controls.filter(c=>c.key!=='variant')]};
    return '<div class="detail-layout"><div class="preview-panel"><div class="preview-toolbar"><span>실제 공용 컴포넌트</span><span>위에서 고른 스타일과 색상</span></div><iframe id="live-preview" class="live-preview" src="element-preview.html" title="'+esc(resource.name)+' 조절 결과" sandbox="allow-scripts allow-same-origin allow-forms"></iframe></div><section class="component-controls"><h2>직접 조절해 보세요</h2><form id="component-form">'+descriptor.controls.map(control).join('')+'</form><button id="reset-props">기본값으로</button><p id="preview-status" class="detail-note" role="status" aria-live="polite"></p></section></div>'+(descriptor.consumers.length?'<section class="usage-section"><h2>이 요소가 쓰인 곳에서 편집</h2><p class="detail-note">현재 작업 창은 유지하고, 해당 모듈 예제를 새 창에서 엽니다.</p><div class="consumer-list">'+descriptor.consumers.map(c=>'<a data-studio-route="index.html?module='+encodeURIComponent(c.type)+'" href="'+esc(styledUrl('index.html?module='+encodeURIComponent(c.type),resource))+'" target="_blank" rel="noopener">'+esc(c.label||c.type)+' ↗<small>'+esc((c.fields||[]).join(' · '))+'</small></a>').join('')+'</div></section>':resource.kind==='element'?'<p class="detail-note">변형과 내용을 바꾼 뒤 아래에서 같은 설정으로 제작실을 여세요. 페이지에 넣고 편집 JSON·독립 HTML로 보관할 수 있습니다.</p>':'<p class="detail-note">이 요소는 아래 공용 API로 HTML에 넣습니다. 소비 모듈에서 편집합니다.</p>');
  }
  function interactionDetail(resource) {
    if(resource.id==='text-reveal')return '<div class="detail-layout"><div class="demo-stage"><span class="chip">명시적으로 시작하는 짧은 효과</span><h2 id="reveal-title">장면이 이어지는 순간,\n이야기가 됩니다.</h2><button id="reveal-play">한 번 재생</button><p id="demo-status" class="demo-status" role="status" aria-live="polite">전체 문장은 처음부터 읽을 수 있습니다.</p></div><section class="component-controls"><h2>문장 바꾸기</h2><div class="control"><label for="reveal-text">강조할 짧은 문장</label><textarea id="reveal-text" maxlength="240" rows="5">장면이 이어지는 순간,\n이야기가 됩니다.</textarea></div><p class="detail-note">긴 본문에는 적용하지 않습니다. 시스템의 움직임 줄이기 설정에서는 정지 상태를 유지합니다.</p></section></div>';
    return '<div class="detail-layout"><div class="demo-stage"><span class="chip">실제 클립보드 작업</span><h2>눌렀을 때,<br>지금 상태를 분명하게.</h2><button id="async-demo">예제 코드 복사</button><p id="demo-status" class="demo-status" role="status" aria-live="polite">복사가 끝난 뒤에만 완료를 알립니다.</p></div><section class="component-controls"><h2>실행 상태</h2><p class="detail-note">대기 → 실행 중 → 완료 또는 오류.<br><br>진행 중 중복 실행을 막고, 실패하면 같은 자리에서 다시 시도할 수 있습니다. 가짜 진행률이나 자동 성공 타이머를 사용하지 않습니다.</p></section></div>';
  }
  function codeFor(resource) {
    if(resource.kind==='section')return "// 섹션은 기존 페이지의 평평한 modules 배열로 삽입합니다.\n// namespace는 같은 문서의 다른 삽입과 겹치지 않는 값을 사용하세요.\nconst section = CVA_SECTIONS.create('"+resource.id+"', {namespace: 'my-section-1', profile: '"+previewDocument.profile+"'});\nconst next = CVA_MODULES.normalizeDocument({...pageModel, profile: section.profile, presentation: {...pageModel.presentation, palette: "+JSON.stringify(state().palette||undefined)+"}, modules: [...pageModel.modules, ...section.modules]});\n// 각 블록의 원래 API로 내용·변형을 편집합니다.\n\n// 실제 정규화된 섹션 입력\nconst sectionModel = "+JSON.stringify(previewDocument,null,2)+';';
    if(resource.kind==='element')return '// 같은 스타일·색상·요소 설정을 보관하는 편집 문서\nconst pageModel = '+JSON.stringify(elementDocument(resource.id,currentProps),null,2)+';\nconst html = CVA_RENDERER.renderDocument(CVA_MODULES.normalizeDocument(pageModel));\n// 독립 HTML: await CVA_EXPORTER.html(pageModel); 편집 JSON: CVA_EXPORTER.json(pageModel);\n\n// 기존 CVA 페이지 안에 요소만 삽입할 때\n'+CVA_ELEMENTS.code(resource.id,currentProps);
    if(resource.kind==='component'){
      const profile=selectedProfile(resource),palette=state().palette;
      return '// 먼저 cva.css·module-styles.css와 tokens.js·components.js·modules.js·module-renderer.js를 키트의 의존 순서로 불러옵니다.\n// CSS와 profile root가 선택한 스타일·색상을 적용합니다. container는 이 요소를 넣을 기존 DOM입니다.\nconst profile = '+JSON.stringify(profile)+';\nconst palette = '+JSON.stringify(palette)+';\nconst root = document.createElement("div");\nroot.className = "cva-page";\nroot.setAttribute("data-cva", "");\nroot.dataset.cvaProfile = profile;\nroot.style.cssText = CVA_RENDERER.profileStyle(profile, palette);\nroot.innerHTML = '+CVA_LIBRARY.components.find(c=>c.id===resource.id).code(currentProps).replace(/;\s*$/,'')+';\ncontainer.append(root);';
    }
    if(resource.kind==='interaction')return resource.id==='text-reveal'?"// 본문은 처음부터 보이는 일반 HTML입니다. 명시적으로 재생합니다.\nconst stop = CVA_LIBRARY_INTERACTIONS.reveal(titleElement);\n// 요소를 제거하거나 다시 재생할 때\nstop();":"const result = await CVA_LIBRARY_INTERACTIONS.run(\n  copyButton,\n  () => navigator.clipboard.writeText(code),\n  statusElement,\n  { pending: '복사 중…', success: '코드를 복사했습니다.' }\n);";
    if(resource.kind==='elio')return '// ZIP을 푼 폴더에서 같은 Elio 원본 리더를 생성합니다.\n'+resource.code+'\n\n// 수정할 입력: '+resource.inputs.join(', ')+'\n// 해당 요소의 실제 필드\n'+resource.fields.join('\n');
    if(previewDocument)return '// 원본 모듈·표현의 실제 편집 입력\nconst document = '+JSON.stringify(previewDocument,null,2)+';\nconst html = CVA_RENDERER.renderDocument(CVA_MODULES.normalizeDocument(document));';
    return JSON.stringify(resource,null,2);
  }
  function elementDocument(id,settings){const block=CVA_MODULES.create('interface','my-element');block.variant='bare';block.props.elementId=id;block.props.settings=CVA_ELEMENTS.normalize(id,settings);return styleDocument({schema:'cva.page.v2',title:CVA_ELEMENTS.get(id).name,modules:[block]});}
  function updateCode(){
    const target=$('use-code');if(target)target.textContent=codeFor(current);
    for(const link of $('detail').querySelectorAll('[data-studio-route]'))link.href=styledUrl(link.dataset.studioRoute,current);
    if(current.kind==='element'){
      const link=$('detail').querySelector('.detail-actions a');
      if(link)link.href=styledUrl('index.html?element='+encodeURIComponent(current.id)+'&settings='+encodeURIComponent(JSON.stringify(currentProps)),current);
    }
  }
  function syncElementControls(resource){
    if(resource.kind!=='element')return;
    const form=$('component-form');
    for(const field of CVA_ELEMENTS.get(resource.id).controls){
      if(field.variants)form.elements.namedItem(field.key).closest('.control').hidden=!field.variants.includes(form.elements.namedItem('variant').value);
    }
  }
  function sendPreview() {
    const iframe=$('live-preview');if(!iframe)return;previewRequest++;
    if(previewComponent)iframe.contentWindow.postMessage({type:'cva.library.component',requestId:previewRequest,kind:current.kind,id:previewComponent.id,props:currentProps,profile:selectedProfile(),palette:state().palette},location.origin);
    else if(previewDocument)iframe.contentWindow.postMessage({type:'cva.canvas.document',document:previewDocument,documentKey:'library-'+resourceKey(current),requestId:previewRequest,editable:false,navigation:true},location.origin);
  }
  function detail(resource) {
    const descriptor=resource.kind==='element'?CVA_ELEMENTS.get(resource.id):resource.kind==='component'?CVA_LIBRARY.components.find(c=>c.id===resource.id):null;
    invalidProps=false;previewComponent=descriptor;previewDocument=createDocument(resource);currentProps=descriptor?{...descriptor.defaults}:{};
    let body='';
    if(descriptor)body=componentDetail(resource,descriptor);
    else if(resource.kind==='interaction')body=interactionDetail(resource);
    else if(resource.kind==='elio')body='<div class="elio-contract"><h2>Elio 원본의 수정 경로</h2><p>'+esc(resource.description)+'</p><p>화면에서 읽고 배치하는 예제와, 같은 리더를 생성하는 이야기 입력을 연결합니다. 제작실의 Elio 스타일 선택은 원본 이야기 입력을 바꾸지 않습니다.</p>'+(resource.fields?'<pre>'+esc(JSON.stringify(resource.fields,null,2))+'</pre>':'')+'<p>개인 보관 ZIP의 <code>examples/templates/complete.</code> 입력과 <code>scripts/render_elio.py</code>로 원본 리더를 렌더할 수 있습니다.</p></div>';
    else body='<div class="preview-panel"><div class="preview-toolbar"><span>원본 엔진으로 실행하는 예제</span><span>'+esc(kinds[resource.kind])+'</span></div><iframe id="live-preview" class="live-preview" style="height:620px" src="canvas.html#preview" title="'+esc(resource.name)+' 실행 예제" sandbox="allow-scripts allow-same-origin allow-forms"></iframe></div>';
    if(resource.kind==='section')body='<p class="composition-note"><strong>'+previewDocument.modules.length+'개 블록을 함께 쓰는 섹션</strong> · 아래에서 섹션으로 시작하거나, 기존 제작실의 ‘섹션 조합’에서 현재 페이지에 삽입하세요. 각 블록을 그대로 편집하고 한 번에 되돌릴 수 있습니다.</p>'+body;
    if(['template','section'].includes(resource.kind)&&previewDocument.profile==='elio')body+='<p class="composition-note">이 구성은 CVA 페이지의 Elio 스타일입니다. Elio 원본 전체 템플릿과 사건·관계·단서 입력은 <a href="library.html?kind=elio">Elio 원본 저작 입력</a>과 <a href="../examples/templates/index.html">같은 리더의 실행 예제</a>를 사용하세요.</p>';
    $('detail').innerHTML='<a class="back-link" href="'+esc(href({item:''}))+'" data-back>← 목록으로</a><header class="detail-head"><span class="overline">'+esc(kinds[resource.kind])+' / '+esc(categories.find(c=>c.id===resource.category)?.name||'ELIO')+'</span><h1 id="detail-title">'+esc(resource.name)+'</h1><p>'+esc(resource.description)+'</p></header>'+body+(resource.studioUrl||resource.kind==='elio'?'<div class="detail-actions">'+(resource.studioUrl?'<a class="action primary" data-studio-route="'+esc(resource.studioUrl)+'" href="'+esc(styledUrl(resource.studioUrl,resource))+'" target="_blank" rel="noopener">'+(resource.kind==='elio'?'원본 예제에서 열기':'페이지 제작실에서 조절')+' ↗</a>':'')+(resource.kind==='elio'?'<a class="action" href="../examples/templates/index.html" target="_blank" rel="noopener">원본 리더 읽기 ↗</a><a class="action" href="../docs/ELIO_TEMPLATE_COVERAGE.md" download>원본 템플릿 보관 ↓</a>':'')+'</div>':'')+'<section class="code-section"><div class="code-header"><h2>'+(resource.kind==='elio'?'연결 정보':'사용 코드')+'</h2><button id="copy-code">'+icons('copy')+'코드 복사</button></div><pre><code id="use-code"></code></pre><p id="copy-status" class="detail-note" role="status" aria-live="polite"></p></section>'+sourceLinks(resource,descriptor);
    updateCode();
    if(descriptor){syncElementControls(resource);$('component-form').addEventListener('submit',event=>event.preventDefault());$('component-form').addEventListener('input',event=>{const input=event.target;if(!input.name)return;const next={...currentProps};if(resource.kind==='element')syncElementControls(resource);for(const field of event.currentTarget.elements){if(field.name&&!field.closest('.control')?.hidden)next[field.name]=field.type==='checkbox'?field.checked:field.type==='number'?field.valueAsNumber:field.value;}try{if(resource.kind==='element')CVA_ELEMENTS.normalize(resource.id,next);if(!input.checkValidity())throw new Error('입력 범위를 확인하세요.');invalidProps=false;currentProps=next;syncElementControls(resource);updateCode();sendPreview();}catch(error){invalidProps=true;$('preview-status').textContent='마지막 유효한 미리보기를 유지합니다: '+error.message;}});$('reset-props').addEventListener('click',()=>{detail(resource);$('reset-props').focus();});}
    if(resource.kind==='interaction'&&resource.id==='text-reveal'){
      $('reveal-text').addEventListener('input',()=>{disposeReveal?.();$('reveal-title').textContent=$('reveal-text').value;});
      $('reveal-play').addEventListener('click',()=>{disposeReveal?.();disposeReveal=CVA_LIBRARY_INTERACTIONS.reveal($('reveal-title'));$('demo-status').textContent='짧은 제목 효과를 요청했습니다. 움직임 줄이기 설정에서는 정지 상태입니다.';});
    }
    if(resource.kind==='interaction'&&resource.id==='async-action')$('async-demo').addEventListener('click',()=>CVA_LIBRARY_INTERACTIONS.run($('async-demo'),()=>navigator.clipboard.writeText(codeFor(resource)),$('demo-status'),{pending:'복사 중…',success:'예제 코드를 복사했습니다.'}));
    $('copy-code').addEventListener('click',()=>CVA_LIBRARY_INTERACTIONS.run($('copy-code'),()=>navigator.clipboard.writeText(codeFor(resource)),$('copy-status'),{pending:'복사 중…',success:'현재 옵션의 코드를 복사했습니다.'}));
  }
  function render() {
    const key=state().item;
    if(current&&resourceKey(current)===key){refreshTone();return;}
    disposeReveal?.();disposeReveal=null;observer.disconnect();categoryNav();
    page=state().page;
    current=resources.find(r=>resourceKey(r)===key);
    $('search-form').hidden=$('browse').hidden=$('browse-heading').hidden=Boolean(key);$('detail').hidden=!key;
    if(current)detail(current);
    else if(key)$('detail').innerHTML='<a class="back-link" href="'+esc(href({category:'all',q:'',kind:'all',item:'',page:0}))+'" data-reset>← 모든 요소</a><div class="empty"><h1>등록된 요소를 찾지 못했습니다.</h1><p>원래 목록에서 다시 선택하세요. 기존 편집 내용에는 영향을 주지 않습니다.</p></div>';
    else {previewComponent=previewDocument=null;browse();}
    toneControls();
  }
  document.addEventListener('click',event=>{
    const tone=event.target.closest('[data-tone-profile]');if(tone){changeTone({profile:tone.dataset.toneProfile});return;}
    const a=event.target.closest('a[data-category],a[data-resource],a[data-back],a[data-reset]');
    if(a&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&event.button===0){event.preventDefault();history.pushState(null,'',a.href);render();$('library-main').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
    const p=event.target.closest('[data-page]');if(p){page+=Number(p.dataset.page);history.pushState(null,'',href({page}));browse();$('category-title').tabIndex=-1;$('category-title').focus({preventScroll:true});$('category-title').scrollIntoView({block:'start'});}
  });
  $('search-form').addEventListener('submit',event=>{event.preventDefault();formState();});$('query').addEventListener('input',formState);$('kind').addEventListener('change',formState);$('clear-query').addEventListener('click',()=>{$('query').value='';formState();$('query').focus();});
  $('library-profile').innerHTML='<option value="">예제 추천 스타일</option>'+Object.entries(profiles).map(([id,entry])=>'<option value="'+esc(id)+'">'+esc(entry.label)+'</option>').join('');
  $('library-palette').innerHTML='<option value="">원래 색상</option>'+Object.entries(palettes).map(([id,entry])=>'<option value="'+esc(id)+'">'+esc(entry.label)+'</option>').join('');
  $('tone-comparison').addEventListener('toggle',toneFamilies);
  $('library-profile').addEventListener('change',()=>changeTone({profile:$('library-profile').value}));
  $('library-palette').addEventListener('change',()=>changeTone({palette:$('library-palette').value}));
  window.addEventListener('popstate',render);
  window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==$('live-preview')?.contentWindow)return;if(CVA_COMPONENTS.receivePreviewDownload(event,[$('live-preview')]))return;if(['cva.library.ready','cva.canvas.ready'].includes(event.data?.type))sendPreview();if(event.data?.type==='cva.library.rendered'&&event.data.requestId===previewRequest&&!invalidProps&&$('preview-status'))$('preview-status').textContent='현재 옵션으로 표시했습니다.';if(event.data?.type==='cva.library.error'&&event.data.requestId===previewRequest&&!invalidProps&&$('preview-status'))$('preview-status').textContent='미리보기를 만들지 못했습니다: '+event.data.message;});
  window.addEventListener('pagehide',()=>{observer.disconnect();disposeReveal?.();},{once:true});
  $('search-icon').innerHTML=icons('search');
  if(matchMedia('(max-width:740px)').matches)$('category-disclosure').open=false;
  render();document.body.dataset.ready='true';
}());

