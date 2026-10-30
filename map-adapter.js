// Field adapter only. The original reader owns node/dialog DOM, CSS and routing.
function originalMap(section, interactive, cycle) {
  const items=section.items,edges=section.edges||[],levels=new Map(items.map(item=>[item.id,0]));
  let cyclic=cycle;
  if(!cyclic)for(let pass=0;pass<items.length;pass++){
    let changed=false;
    for(const edge of edges)if(edge.kind!=='feedback'&&levels.get(edge.to)<levels.get(edge.from)+1){levels.set(edge.to,levels.get(edge.from)+1);changed=true;}
    if(!changed)break;
    if(pass===items.length-1)cyclic=true;
  }
  if(cyclic)items.forEach((item,index)=>levels.set(item.id,index));
  const counts=new Map(),seen=new Map();
  levels.forEach(rank=>counts.set(rank,(counts.get(rank)||0)+1));
  const columns=Math.max(0,...levels.values())+1,lanes=Math.max(1,...counts.values());
  const prefix='perspective-'+safe(section.id);
  const fill=(name,fields)=>canonicalMap.templates[name].replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>String(fields[key]??''));
  const model={title:section.title,summary:section.lead,eras:section.columnLabels?.length===columns?section.columnLabels:Array.from({length:columns},(_,i)=>'연결 '+(i+1)),lanes:Array.from({length:lanes},(_,i)=>lanes===1?'항목':'경로 '+String.fromCharCode(65+i)),nodes:[],edges:[]};
  const kindFor=edge=>edge.kind==='split'?'actor-a':edge.kind==='merge'?'actor-b':edge.kind==='feedback'?'world':'life';
  const nodes=items.map((item,index)=>{
    const era=levels.get(item.id),lane=seen.get(era)||0;seen.set(era,lane+1);
    const target=prefix+'-'+item.id,image=item.image||item.media?.src;
    model.nodes.push({id:item.id,item_id:item.id,era,lane,label:(item.label?item.label+'\n':'')+item.title});
    return fill('node',{TARGET:e(target),ID:e(item.id),ERA:era,LANE:lane,SPAN:1,ERA_CSS:era+2,LANE_CSS:lane+2,LABEL:e(item.title),PHOTO:image?'<img src="'+e(imageURL(image))+'" alt="'+e(item.alt||item.media?.alt||'')+'" loading="lazy" decoding="async">':'<span class="elio-map-token">'+(index+1)+'</span>',CAPTION:(item.label?'<span class="time-map__role">'+e(item.label)+'</span>':'')+'<span class="time-map__action">'+e(item.title)+'</span>'});
  }).join('');
  const detail=items.map(item=>fill('detail',{TARGET:e(prefix+'-'+item.id),TITLE:e(item.title),VISUAL:figure(item),BODY:e(item.body||'')+(item.detail?'<br>'+e(item.detail):'')+(item.source?'<br>'+e(item.source):'')+(item.value!==undefined?'<br>'+e(valueText(item.value)):''),LINK:item.action?'<a class="perspective-scene-link" href="'+e(href(item.action.target||item.action.href))+'">'+e(item.action.label||'관련 자료 읽기')+'</a>':''})).join('');
  const relations=edges.map(edge=>{const kind=kindFor(edge);model.edges.push({from:edge.from,to:edge.to,kind,label:edge.label||edge.kind,via:[]});if(edge.kind==='exchange')model.edges.push({from:edge.to,to:edge.from,kind,label:edge.label||edge.kind,via:[]});return '<li data-from="'+e(edge.from)+'" data-to="'+e(edge.to)+'" data-kind="'+kind+'">'+e(items.find(item=>item.id===edge.from).title)+(edge.kind==='exchange'?' ↔ ':' → ')+e(items.find(item=>item.id===edge.to).title)+' · '+e(edge.label||edge.kind)+'</li>';}).join('');
  const colors={life:['#89939b','연결'],'actor-a':['#16869a','분기'],'actor-b':['#7954aa','합류'],world:['#ab7a29','되돌아가는 연결']};
  const kinds=new Set(model.edges.map(edge=>edge.kind));
  const legend=Object.entries(colors).filter(([kind])=>kinds.has(kind)).map(([,row])=>'<span style="--map-color:'+row[0]+'">'+row[1]+'</span>').join('');
  const axes=model.eras.map((label,index)=>'<span class="time-map__era" style="--era:'+(index+2)+'">'+e(label)+'</span>').join('')+model.lanes.map((label,index)=>'<span class="time-map__lane" style="--lane:'+(index+2)+'">'+e(label)+'</span>').join('');
  const json=JSON.stringify(model).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  return fill('frame',{PREFIX:e(prefix),TITLE:e(section.title),SUMMARY:e(section.lead),SPACE:'',LEGEND:legend,ERAS:columns,LANES:lanes,AXES:axes,NODES:nodes,MODEL:json,DETAILS:detail,EDGES:relations})+
    '<p class="elio-map-basis">행과 열은 연결을 읽기 위한 배치입니다. 간격은 실제 시간·거리·인과를 새로 뜻하지 않습니다.</p><details class="elio-map-records"><summary>작성한 연결 기록</summary>'+relationships(edges)+'</details>'+
    (interactive?'<div class="elio-linked-controls">'+items.map((item,index)=>'<span data-elio-node="'+e(item.id)+'"><button type="button" data-elio-pick="'+e(item.id)+'" aria-pressed="false">'+(index+1)+'. '+e(item.title)+'</button></span>').join('')+'<output class="elio-live" aria-live="polite">대상을 고르면 직접 연결된 항목을 함께 표시합니다.</output></div>':'');
}
