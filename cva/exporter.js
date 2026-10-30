/* Private, offline HTML and editable JSON; all source paths are local allowlisted assets. */
(function(global){
  'use strict';let bundlePromise;
  function scriptText(value){return String(value).replace(/<\/script/gi,'<\\/script');}
  function styleText(value){return String(value).replace(/<\/style/gi,'<\\/style');}
  function assemble(model,{css,bundleCss='',bundleJS='',threeJS='',elementsJS='',assets={}}){
    const doc=global.CVA_MODULES.normalizeDocument(model),escape=global.CVA_COMPONENTS.escape;
    let markup=global.CVA_RENDERER.renderDocument(doc);
    markup=markup.replace(/\bsrc="([^"]+)"/g,(match,path)=>{const key=path.replace(/^\.\.\//,'');const asset=assets[path]||assets[key];if(!asset)throw new Error('이미지를 묶지 못했습니다: '+path);return 'src="'+escape(asset)+'"';});
    const needsForma=doc.modules.some(b=>b.type==='forma-pattern');
    const runtime = [doc.modules.some(b=>b.type==='focus') ? global.CVA_FOCUS.runtimeSource : '', doc.modules.some(b=>b.type==='experience') ? global.CVA_EXPERIENCE.runtimeSource+'\n'+global.CVA_HELP.runtimeSource : ''].filter(Boolean).join('\n');
    const needsThree=doc.modules.some(b=>b.type==='experience'&&b.variant==='spatial');
    const needsElements=doc.modules.some(b=>b.type==='interface');
    if(needsElements&&!elementsJS)throw new Error('독립 UI 요소의 동작에 필요한 로컬 소스를 묶지 못했습니다.');
    if(needsThree&&!threeJS)throw new Error('독립 3D에 필요한 로컬 라이브러리를 묶지 못했습니다.');
    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="'+escape(doc.description)+'"><title>'+escape(doc.title)+'</title><style>'+styleText((needsForma?bundleCss:'')+'\n'+css+'\nhtml,body{margin:0;min-height:100%}')+'</style></head><body>'+markup+(needsForma?'<script>'+scriptText(bundleJS)+'</script>':'')+(needsThree?'<script>'+scriptText(threeJS)+'</script>':'')+(runtime?'<script>'+scriptText(runtime)+'</script>':'')+(needsElements?'<script>'+scriptText(elementsJS)+'\nCVA_ELEMENTS.mount(document);</script>':'')+'<footer style="padding:24px;font:16px/1.7 system-ui;text-align:center"><a href="https://ttaem.com">ttaem.com · Elio</a></footer></body></html>';
  }
  function loadScript(path){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=path;script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('로컬 원본 묶음을 불러오지 못했습니다.'));};document.head.append(script);});}
  async function text(path){const response=await fetch(path);if(!response.ok)throw new Error('로컬 파일을 읽지 못했습니다: '+path);return response.text();}
  async function data(path){const response=await fetch(path);if(!response.ok)throw new Error('로컬 이미지를 읽지 못했습니다: '+path);const blob=await response.blob();return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('로컬 자료를 묶지 못했습니다.'));reader.readAsDataURL(blob);});}
  async function html(model){
    const doc=global.CVA_MODULES.normalizeDocument(model);let bundleCss='',bundleJS='',assets={};
    if(doc.modules.some(b=>b.type==='forma-pattern')){if(!bundlePromise)bundlePromise=loadScript('../bundle.js').then(()=>loadScript('../assets-data.js')).catch(error=>{bundlePromise=null;throw error;});await bundlePromise;bundleCss=FW_BUNDLE.css;bundleJS=FW_BUNDLE.js;Object.assign(assets,FW_ASSETS);}
    const rendered=CVA_RENDERER.renderDocument(doc),sources=[...rendered.matchAll(/\bsrc="([^"]+)"/g)].map(m=>m[1]);
    await Promise.all([...new Set(sources)].map(async path=>{if(!assets[path]&&!assets[path.replace(/^\.\.\//,'')])assets[path]=await data(path);}));
    const needsExperience=doc.modules.some(b=>b.type==='experience');
    const needsElements=doc.modules.some(b=>b.type==='interface');
    const elementsJS=needsElements?(await Promise.all(['components.js','elements-core.js','elements-vendor.js','elements-controls.js','elements-effects.js'].map(text))).join('\n'):'';
    const elementsCSS=needsElements?(await Promise.all(['elements.css','elements-controls.css','elements-effects.css'].map(text))).join('\n'):'';
    const [base,modules,scenes,font,experience,help,threeJS]=await Promise.all([text('cva.css'),text('module-styles.css'),text('scene-styles.css'),data('assets/PretendardVariable.woff2'),needsExperience?text('experience.css'):'',needsExperience?text('help.css'):'',doc.modules.some(b=>b.type==='experience'&&b.variant==='spatial')?text('vendor/three-0.186.1.min.js'):'']);
    const css=('@font-face{font-family:Pretendard;src:url("assets/PretendardVariable.woff2") format("woff2");font-weight:100 900;font-style:normal;font-display:swap}\n'+base+'\n'+modules).replace(/url\(['"]?assets\/PretendardVariable\.woff2['"]?\)/g,'url("'+font+'")');
    return assemble(doc,{css:css+'\n'+scenes+'\n'+experience+'\n'+help+'\n'+elementsCSS,bundleCss,bundleJS,threeJS,elementsJS,assets});
  }
  global.CVA_EXPORTER={version:'2.0',assemble,html,json:model=>JSON.stringify(global.CVA_MODULES.normalizeDocument(model),null,2)+'\n'};
})(window);
