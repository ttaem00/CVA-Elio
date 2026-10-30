/* Independent Elio renderers for explicit authoring relationships. */
(function (global) {
  'use strict';
  /* BEGIN CANONICAL ELIO MAP */
  const canonicalMap = {"templates": {"node": "<a href=\"#{{TARGET}}\" class=\"time-map__node\" data-time-node=\"{{ID}}\" data-time-item=\"{{TARGET}}\" data-era=\"{{ERA}}\" data-lane=\"{{LANE}}\" data-lane-span=\"{{SPAN}}\" style=\"--era:{{ERA_CSS}};--lane:{{LANE_CSS}};--lane-span:{{SPAN}}\" aria-label=\"{{LABEL}}\"><span class=\"time-map__photo\">{{PHOTO}}</span><span class=\"time-map__caption\">{{CAPTION}}</span></a>", "detail": "<details id=\"{{TARGET}}-fallback\" data-time-detail=\"{{TARGET}}\" class=\"time-map__detail\"><summary>{{TITLE}}</summary><article id=\"{{TARGET}}\" class=\"item time-map__scene spoiler-revealed\">{{VISUAL}}<div class=\"copy\"><h3 class=\"scene-title\">{{TITLE}}</h3><p class=\"scene-desc\">{{BODY}}</p>{{LINK}}</div></article></details>", "frame": "<section id=\"{{PREFIX}}-map\" class=\"time-map\" aria-label=\"{{TITLE}}\"><div class=\"time-map__content reader-guide__content\"><header><h2>{{TITLE}}</h2><p>{{SUMMARY}}</p></header>{{SPACE}}<div class=\"time-map__legend\" aria-label=\"시간 지도 연결선\">{{LEGEND}}</div><div class=\"time-map__canvas\" style=\"--era-count:{{ERAS}};--lane-count:{{LANES}}\"><svg class=\"time-map__connections\" aria-hidden=\"true\"></svg>{{AXES}}{{NODES}}</div><script type=\"application/json\" class=\"time-map__data\">{{MODEL}}</script><p class=\"time-map__hint\">사진을 누르면 장면이 펼쳐집니다.</p><div class=\"time-map__details\">{{DETAILS}}</div><details class=\"time-map__reading\"><summary>연결을 글로 읽기</summary><ul>{{EDGES}}</ul></details></div><button class=\"spoiler-cover\" type=\"button\" aria-label=\"시간 지도 내용 보기\" hidden><span><small>시간 지도</small><strong>내용 보기</strong></span></button></section>"}, "runtime": "/* Measured diagram geometry only: story order, dates and relations stay in their owners. */\n(function(root,factory){\n  const api=factory();\n  if(typeof module!=='undefined'&&module.exports)module.exports=api;\n  root.elioDiagramGeometry=api;\n})(typeof globalThis!=='undefined'?globalThis:this,function(){\n  const EPS=.001,SPACING=8;\n  const clone=value=>JSON.parse(JSON.stringify(value||{}));\n  const edgeId=(from,to)=>`${from}->${to}`;\n  const mode=(layout,mobile)=>layout?.[mobile?'mobile':'desktop']||{};\n  const finitePoint=point=>Array.isArray(point)&&point.length===2&&point.every(Number.isFinite);\n  const compact=points=>points.filter((point,index,all)=>!index||point[0]!==all[index-1][0]||point[1]!==all[index-1][1])\n    .filter((point,index,all)=>{\n      if(!index||index===all.length-1)return true;\n      const a=all[index-1],b=all[index+1];\n      return !((a[0]===point[0]&&point[0]===b[0]&&point[1]>=Math.min(a[1],b[1])&&point[1]<=Math.max(a[1],b[1]))||(a[1]===point[1]&&point[1]===b[1]&&point[0]>=Math.min(a[0],b[0])&&point[0]<=Math.max(a[0],b[0])));\n    });\n  const overlaps=(a,b,gap=0)=>a.left<b.left+b.width+gap&&a.left+a.width+gap>b.left&&a.top<b.top+b.height+gap&&a.top+a.height+gap>b.top;\n  function resolveOffsets(nodes,overrides,width,{reserved=[],orderPairs=[],minY=0,orderAxis='y'}={}){\n    const warnings=[],base=new Map(nodes.map(node=>[node.id,node.box])),moved=new Set(),boxes=new Map();\n    nodes.forEach(node=>{\n      const offset=overrides?.[node.id];\n      let dx=Number.isFinite(offset?.x)?offset.x*width:0,dy=Number.isFinite(offset?.y)?offset.y:0;\n      dx=Math.max(-node.box.left,Math.min(width-node.box.left-node.box.width,dx));\n      dy=Math.max(minY-node.box.top,dy);\n      boxes.set(node.id,{...node.box,left:node.box.left+dx,top:node.box.top+dy});\n      if(dx||dy)moved.add(node.id);\n    });\n    // Reverting an invalid move can expose a second collision. At most one\n    // moved node is removed each pass, so this loop is bounded by node count.\n    for(let pass=0;pass<=nodes.length;pass++){\n      const invalid=new Set();\n      nodes.forEach((node,index)=>{\n        const box=boxes.get(node.id);\n        if(moved.has(node.id)&&reserved.some(other=>overlaps(box,other,4)))invalid.add(node.id);\n        for(const other of nodes.slice(index+1)){\n          if(!overlaps(box,boxes.get(other.id),4))continue;\n          if(moved.has(node.id))invalid.add(node.id);\n          if(moved.has(other.id))invalid.add(other.id);\n        }\n      });\n      orderPairs.forEach(([from,to])=>{\n        const a=boxes.get(from),b=boxes.get(to);\n        if(!a||!b||(orderAxis==='x'?a.left+a.width<=b.left+EPS:a.top+a.height<=b.top+EPS))return;\n        if(moved.has(from))invalid.add(from);\n        if(moved.has(to))invalid.add(to);\n      });\n      if(!invalid.size)break;\n      invalid.forEach(id=>{boxes.set(id,{...base.get(id)});moved.delete(id);warnings.push(`Node ${id}: move overlaps a scene or reading boundary.`);});\n    }\n    return {offsets:Object.fromEntries(nodes.map(node=>{const box=boxes.get(node.id);return [node.id,{x:box.left-node.box.left,y:box.top-node.box.top}];})),warnings};\n  }\n  function edgeOverride(layout,mobile,from,to){return mode(layout,mobile).edges?.[edgeId(from,to)]||{};}\n  // The browser import boundary uses the same display-only fields and bounds\n  // as diagram_layout.py. Neither receiver normalizes or changes the meaning.\n  function validateLayout(value,nodeIds,edges){\n    const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);\n    const fields=(value,allowed,message)=>{if(!object(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw new Error(message);};\n    const number=(value,low,high)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<low||value>high)throw new Error('Diagram layout coordinate must be finite and within bounds');};\n    const ports=new Set(['left','right','top','bottom']),knownEdges=new Set(edges.map(edge=>edgeId(edge.from,edge.to)));\n    fields(value,['desktop','mobile'],'Diagram layout needs only desktop and mobile modes');\n    for(const part of Object.values(value)){\n      fields(part,['nodes','edges'],'Diagram layout mode needs nodes or edges');\n      const nodes=Object.hasOwn(part,'nodes')?part.nodes:{},routes=Object.hasOwn(part,'edges')?part.edges:{};\n      if(!object(nodes)||Object.keys(nodes).some(id=>!nodeIds.has(id)))throw new Error('Diagram layout references an unknown node');\n      for(const point of Object.values(nodes)){fields(point,['x','y'],'Diagram layout node needs x and y offsets');if(Object.keys(point).length!==2)throw new Error('Diagram layout node needs x and y offsets');number(point.x,-1,1);number(point.y,-5000,5000);}\n      if(!object(routes)||Object.keys(routes).some(id=>!knownEdges.has(id)))throw new Error('Diagram layout references an unknown edge');\n      for(const route of Object.values(routes)){\n        fields(route,['via','source_port','target_port'],'Diagram layout edge fields are invalid');\n        if(!Array.isArray(route.via)||route.via.length>8)throw new Error('Diagram layout edge has too many waypoints');\n        for(const point of route.via){fields(point,['x','y'],'Diagram layout waypoint needs x and y');if(Object.keys(point).length!==2)throw new Error('Diagram layout waypoint needs x and y');number(point.x,0,1);number(point.y,-100000,100000);}\n        for(const name of ['source_port','target_port'])if(name in route&&!ports.has(route[name]))throw new Error('Diagram layout port is invalid');\n      }\n    }\n    return value;\n  }\n  function availablePort(port,side,reserved,min,max){\n    const axis=['top','bottom'].includes(side)?0:1,center=port.tip[axis];\n    const candidates=[center,min,max,...reserved.flatMap(value=>[value-10,value+10])]\n      .filter(value=>value>=min-EPS&&value<=max+EPS&&reserved.every(other=>Math.abs(value-other)>=10-EPS))\n      .sort((a,b)=>Math.abs(a-center)-Math.abs(b-center)||a-b);\n    if(!candidates.length)return null;\n    const delta=candidates[0]-center,tip=[...port.tip],gate=[...port.gate];tip[axis]+=delta;gate[axis]+=delta;\n    return {...port,tip,gate};\n  }\n  function terminalPort(port,side,lead=24,{obstacles=[],width=Infinity,height=Infinity}={}){\n    const axis=['top','bottom'].includes(side)?1:0,sign=['left','top'].includes(side)?-1:1;\n    const gate=[...port.gate],limit=port.tip[axis]+sign*lead;\n    gate[axis]=sign<0?Math.min(gate[axis],limit):Math.max(gate[axis],limit);\n    // Tight compact-card gaps cannot contain two full leads. Keep the existing\n    // layout and shorten only to the next real obstacle or canvas boundary.\n    let space=sign<0?port.tip[axis]-2:(axis?height:width)-2-port.tip[axis];\n    obstacles.forEach(box=>{\n      const near=axis?box.top:box.left,far=near+(axis?box.height:box.width),cross=port.tip[1-axis],low=axis?box.left:box.top,high=low+(axis?box.width:box.height);\n      if(cross<=low-4||cross>=high+4)return;\n      const distance=sign<0?port.tip[axis]-far-5:near-port.tip[axis]-5;\n      if(distance>=0)space=Math.min(space,distance);\n    });\n    gate[axis]=port.tip[axis]+sign*Math.min(Math.abs(gate[axis]-port.tip[axis]),Math.max(0,space));\n    return {...port,tip:[...port.tip],gate};\n  }\n  function adaptTerminalPair(start,end,obstacles=[],minimumLead=9){\n    const unchanged={start,end},opposite={left:'right',right:'left',top:'bottom',bottom:'top'};\n    if(opposite[start.side]!==end.side||![start.tip,start.gate,end.tip,end.gate].every(finitePoint))return unchanged;\n    const axis=['top','bottom'].includes(start.side)?1:0,sign=['left','top'].includes(start.side)?-1:1;\n    const gap=(end.tip[axis]-start.tip[axis])*sign,a=(start.gate[axis]-start.tip[axis])*sign,b=(end.tip[axis]-end.gate[axis])*sign;\n    if(gap<=0||a<0||b<0||a+b<=gap+EPS)return unchanged;\n    const required=(port,length,direction)=>{\n      let lead=Math.min(minimumLead,length);\n      obstacles.forEach(box=>{\n        const cross=port.tip[1-axis],low=(axis?box.left:box.top)-4,high=low+(axis?box.width:box.height)+8;\n        if(cross<=low+EPS||cross>=high-EPS)return;\n        const near=(axis?box.top:box.left)-4,far=near+(axis?box.height:box.width)+8;\n        const first=(near-port.tip[axis])*direction,last=(far-port.tip[axis])*direction,enter=Math.min(first,last),exit=Math.max(first,last);\n        if(exit>lead&&enter<length-EPS)lead=Math.max(lead,exit);\n      });\n      return lead;\n    };\n    const minA=required(start,a,sign),minB=required(end,b,-sign);\n    if(minA>a+EPS||minB>b+EPS||minA+minB>gap+EPS)return unchanged;\n    const capacity=a-minA+b-minB,share=capacity?Math.max(0,gap-minA-minB)*(a-minA)/capacity:0;\n    const meeting=start.tip[axis]+sign*(minA+share),startGate=[...start.gate],endGate=[...end.gate];\n    // One identical coordinate avoids subpixel gate reversals after x/width\n    // serialization. Never move a tip or shrink a gate into a hard caption.\n    startGate[axis]=meeting;endGate[axis]=meeting;\n    return {start:{...start,gate:startGate},end:{...end,gate:endGate}};\n  }\n  function waypoints(value,width,sourceAnchor){\n    if(!Array.isArray(value))return [];\n    return value.map(point=>[point.x*width,sourceAnchor.y+point.y]);\n  }\n  function segmentCost(a,b,occupied){\n    let penalty=0;\n    const horizontal=a[1]===b[1];\n    occupied.forEach(([c,d])=>{\n      const otherHorizontal=c[1]===d[1];\n      if(horizontal===otherHorizontal){\n        if(Math.abs((horizontal?a[1]:a[0])-(horizontal?c[1]:c[0]))>EPS)return;\n        const axis=horizontal?0:1;\n        const length=Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis]))-Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis]));\n        if(length>EPS)penalty+=length*4;\n      }else{\n        const h=horizontal?[a,b]:[c,d],v=horizontal?[c,d]:[a,b],x=v[0][0],y=h[0][1];\n        if(x<Math.min(h[0][0],h[1][0])-EPS||x>Math.max(h[0][0],h[1][0])+EPS||y<Math.min(v[0][1],v[1][1])-EPS||y>Math.max(v[0][1],v[1][1])+EPS)return;\n        const t=horizontal?(x-a[0])/(b[0]-a[0]):(y-a[1])/(b[1]-a[1]);\n        const u=otherHorizontal?(x-c[0])/(d[0]-c[0]):(y-c[1])/(d[1]-c[1]);\n        // Each directed segment owns its end, not its start. A crossing at a\n        // visibility-grid vertex is then charged once, even if either line\n        // has been split there; overlap is likewise purely additive by length.\n        if(t>1e-9&&t<=1+1e-9&&u>1e-9&&u<=1+1e-9)penalty+=60;\n      }\n    });\n    return penalty;\n  }\n  function corridorCost(a,b,rects){\n    const vertical=a[0]===b[0],coordinate=vertical?a[0]:a[1],low=Math.min(vertical?a[1]:a[0],vertical?b[1]:b[0]),high=Math.max(vertical?a[1]:a[0],vertical?b[1]:b[0]);\n    let before=-Infinity,after=Infinity;\n    rects.forEach(r=>{\n      if(Math.min(high,vertical?r.bottom:r.right)<=Math.max(low,vertical?r.top:r.left))return;\n      const left=vertical?r.right:r.bottom,right=vertical?r.left:r.top;\n      if(left<=coordinate)before=Math.max(before,left);\n      if(right>=coordinate)after=Math.min(after,right);\n    });\n    if(!Number.isFinite(before)||!Number.isFinite(after)||after-before<EPS)return 0;\n    return (high-low)*.03*Math.min(1,Math.abs(coordinate-(before+after)/2)/((after-before)/2));\n  }\n  function straightRoute(start,end,obstacles=[]){\n    if(start[0]!==end[0]&&start[1]!==end[1])return null;\n    const vertical=start[0]===end[0];\n    const blocked=obstacles.some(b=>vertical\n      ?start[0]>b.left-4&&start[0]<b.left+b.width+4&&Math.max(start[1],end[1])>b.top-4&&Math.min(start[1],end[1])<b.top+b.height+4\n      :start[1]>b.top-4&&start[1]<b.top+b.height+4&&Math.max(start[0],end[0])>b.left-4&&Math.min(start[0],end[0])<b.left+b.width+4);\n    return blocked?null:[start,end];\n  }\n  function simplifyAuto(points,obstacles=[]){\n    let path=compact(points);\n    // Gate rectangles can overlap by a few pixels although the circular\n    // terminals do not. Do not draw a tiny reversal just to visit both gates.\n    while(path.length>2&&straightRoute(path[0],path[2],obstacles))path=compact([path[0],...path.slice(2)]);\n    while(path.length>2&&straightRoute(path.at(-3),path.at(-1),obstacles))path=compact([...path.slice(0,-2),path.at(-1)]);\n    return path;\n  }\n  function pathCost(points,occupied=[],obstacles=[]){\n    const path=compact(points),rects=obstacles.map(b=>({left:b.left-4,right:b.left+b.width+4,top:b.top-4,bottom:b.top+b.height+4}));\n    return segments(path).reduce((cost,[a,b],index)=>cost+Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+(index?12:0)+segmentCost(a,b,occupied)+corridorCost(a,b,rects),0);\n  }\n  function routeOrthogonal({start,end,via=[],obstacles=[],width,height,occupied=[],startTip,endTip,preferStraightStops=false}){\n    if(![start,end,...via].every(finitePoint)||![width,height].every(n=>Number.isFinite(n)&&n>0))return null;\n    const rects=obstacles.map(box=>({left:box.left-4,right:box.left+box.width+4,top:box.top-4,bottom:box.top+box.height+4}));\n    // The searched body starts/ends at the gates. Keep the already composed\n    // tip-to-gate leads clear even after a tiny sideways step from a gate.\n    // Gate boundaries remain usable; authoritative waypoints are not moved.\n    for(const [tip,gate] of [[startTip,start],[endTip,end]]){\n      if(!finitePoint(tip)||tip[0]===gate[0]&&tip[1]===gate[1])continue;\n      if(tip[0]===gate[0])rects.push({left:tip[0]-10,right:tip[0]+10,top:Math.min(tip[1],gate[1]),bottom:Math.max(tip[1],gate[1])});\n      else if(tip[1]===gate[1])rects.push({left:Math.min(tip[0],gate[0]),right:Math.max(tip[0],gate[0]),top:tip[1]-10,bottom:tip[1]+10});\n    }\n    const blocked=([x,y])=>x<0||x>width||y<0||y>height||rects.some(r=>x>r.left+EPS&&x<r.right-EPS&&y>r.top+EPS&&y<r.bottom-EPS);\n    if([start,end,...via].some(blocked))return null;\n    const clear=(a,b)=>!rects.some(r=>a[0]===b[0]\n      ?a[0]>r.left+EPS&&a[0]<r.right-EPS&&Math.max(a[1],b[1])>r.top+EPS&&Math.min(a[1],b[1])<r.bottom-EPS\n      :a[1]>r.top+EPS&&a[1]<r.bottom-EPS&&Math.max(a[0],b[0])>r.left+EPS&&Math.min(a[0],b[0])<r.right-EPS);\n    const stops=[start,...via,end];\n    if(stops.slice(1).every((point,index)=>{\n      const previous=stops[index];\n      return (previous[0]===point[0]||previous[1]===point[1])&&clear(previous,point)&&(preferStraightStops||segmentCost(previous,point,occupied)===0&&corridorCost(previous,point,rects)===0);\n    }))return compact(stops);\n    const xs=new Set([2,width-2,start[0],end[0]]),ys=new Set([2,height-2,start[1],end[1]]);\n    rects.forEach(r=>{xs.add(r.left-5);xs.add(r.right+5);ys.add(r.top-5);ys.add(r.bottom+5);});\n    // A corridor is bounded by both captions, not by one caption's edge.\n    // These middle lines remain valid when fonts wrap or the grid transposes.\n    for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){\n      const a=rects[i],b=rects[j];\n      if(Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)){\n        if(a.right<b.left)xs.add((a.right+b.left)/2);else if(b.right<a.left)xs.add((b.right+a.left)/2);\n      }\n      if(Math.min(a.right,b.right)>Math.max(a.left,b.left)){\n        if(a.bottom<b.top)ys.add((a.bottom+b.top)/2);else if(b.bottom<a.top)ys.add((b.bottom+a.top)/2);\n      }\n    }\n    via.forEach(([x,y])=>{xs.add(x);ys.add(y);});\n    // Distinct nearby corridors let a later connector avoid sharing a long\n    // segment. Cap the graph rather than multiplying work with every edge.\n    if((xs.size+occupied.length*4)*(ys.size+occupied.length*4)<=18000)occupied.forEach(([a,b])=>{\n      for(const point of [a,b]){xs.add(point[0]-SPACING);xs.add(point[0]+SPACING);ys.add(point[1]-SPACING);ys.add(point[1]+SPACING);}\n    });\n    const X=[...xs].filter(x=>x>=0&&x<=width).sort((a,b)=>a-b),Y=[...ys].filter(y=>y>=0&&y<=height).sort((a,b)=>a-b);\n    const oversized=X.length*Y.length>24000;\n    const point=index=>[X[index%X.length],Y[Math.floor(index/X.length)]];\n    function between(first,last){\n      // Manually placed stops own a clear straight segment. Other wires are\n      // a soft routing cost; captions and terminal collars remain hard bounds.\n      if(preferStraightStops&&(first[0]===last[0]||first[1]===last[1])&&clear(first,last))return [first,last];\n      if(oversized){\n        // Large story boards can exceed the visibility-grid budget despite\n        // having clear nearby corridors. Keep that budget and the same hard\n        // caption/terminal tests; try a bounded set of existing corridor lines.\n        const excess=(value,a,b)=>Math.abs(value-a)+Math.abs(value-b)-Math.abs(a-b);\n        const xs=[...new Set([first[0],last[0],2,width-2,...rects.flatMap(r=>[r.left-5,r.right+5])])].filter(value=>value>=0&&value<=width).sort((a,b)=>excess(a,first[0],last[0])-excess(b,first[0],last[0])||Math.abs(a-first[0])-Math.abs(b-first[0])).slice(0,16);\n        const ys=[...new Set([first[1],last[1],2,height-2,...rects.flatMap(r=>[r.top-5,r.bottom+5])])].filter(value=>value>=0&&value<=height).sort((a,b)=>excess(a,first[1],last[1])-excess(b,first[1],last[1])||Math.abs(a-first[1])-Math.abs(b-first[1])).slice(0,16);\n        const candidates=[[first,[last[0],first[1]],last],[first,[first[0],last[1]],last]];\n        xs.forEach(x=>candidates.push([first,[x,first[1]],[x,last[1]],last]));\n        ys.forEach(y=>candidates.push([first,[first[0],y],[last[0],y],last]));\n        // Keep the two outer clear rails even when many closer candidates\n        // occupy the bounded local list. They remain a last-resort candidate\n        // under the same distance, bend, crossing and overlap cost.\n        for(const x of [2,width-2])candidates.push([first,[x,first[1]],[x,last[1]],last]);\n        for(const y of [2,height-2])candidates.push([first,[first[0],y],[last[0],y],last]);\n        for(const x of xs.slice(0,6))for(const y of ys.slice(0,6)){\n          candidates.push([first,[x,first[1]],[x,y],[last[0],y],last]);\n          candidates.push([first,[first[0],y],[x,y],[x,last[1]],last]);\n        }\n        let best=null,cost=Infinity;\n        for(const candidate of candidates){const path=compact(candidate);if(path.some(blocked)||!segments(path).every(([a,b])=>clear(a,b)))continue;const value=pathCost(path,occupied,obstacles);if(value<cost){best=path;cost=value;}}\n        return best;\n      }\n      const begin=Y.indexOf(first[1])*X.length+X.indexOf(first[0]),finish=Y.indexOf(last[1])*X.length+X.indexOf(last[0]);\n      const heap=[],dist=new Map([[begin*3,0]]),previous=new Map();\n      const push=row=>{let i=heap.length;heap.push(row);while(i){const parent=(i-1)>>1;if(heap[parent][0]<=row[0])break;heap[i]=heap[parent];i=parent;}heap[i]=row;};\n      const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;if(heap[j][0]>=last[0])break;heap[i]=heap[j];i=j;}heap[i]=last;}return first;};\n      push([0,begin*3]);\n      while(heap.length){\n        const [cost,state]=pop(),index=Math.floor(state/3),direction=state%3;\n        if(cost!==dist.get(state))continue;\n        if(index===finish){const result=[];for(let at=state;at!==undefined;at=previous.get(at))result.push(point(Math.floor(at/3)));return result.reverse();}\n        const x=index%X.length,y=Math.floor(index/X.length),a=point(index);\n        for(const [nx,ny,nextDirection] of [[x-1,y,1],[x+1,y,1],[x,y-1,2],[x,y+1,2]]){\n          if(nx<0||ny<0||nx>=X.length||ny>=Y.length)continue;\n          const nextIndex=ny*X.length+nx,b=point(nextIndex);if(!clear(a,b))continue;\n          const key=nextIndex*3+nextDirection,next=cost+Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+(direction&&direction!==nextDirection?12:0)+segmentCost(a,b,occupied)+corridorCost(a,b,rects);\n          if(next<(dist.get(key)??Infinity)){dist.set(key,next);previous.set(key,state);push([next,key]);}\n        }\n      }\n      return null;\n    }\n    const result=[start];\n    for(let i=1;i<stops.length;i++){const part=between(stops[i-1],stops[i]);if(!part)return null;result.push(...part.slice(1));}\n    return compact(result);\n  }\n  function roundedPath(points,radius=8,terminalLead=0){\n    const path=compact(points);if(path.length<2)return '';\n    let d=`M${path[0].join(' ')}`;\n    for(let i=1;i<path.length-1;i++){\n      const p=path[i],a=path[i-1],b=path[i+1],la=Math.hypot(p[0]-a[0],p[1]-a[1]),lb=Math.hypot(p[0]-b[0],p[1]-b[1]);\n      const r=Math.min(radius,la/2,lb/2,i===1?Math.max(0,la-terminalLead):Infinity,i===path.length-2?Math.max(0,lb-terminalLead):Infinity);\n      if(!r){d+=` L${p.join(' ')}`;continue;}\n      d+=` L${p[0]+(a[0]-p[0])*r/la} ${p[1]+(a[1]-p[1])*r/la} Q${p.join(' ')} ${p[0]+(b[0]-p[0])*r/lb} ${p[1]+(b[1]-p[1])*r/lb}`;\n    }\n    return d+` L${path.at(-1).join(' ')}`;\n  }\n  function segments(points){return points.slice(1).map((point,index)=>[points[index],point]);}\n  function arrowHead(points,length=9,width=7){\n    const path=compact(points);if(path.length<2)return [];\n    const tip=path.at(-1),from=path.at(-2),distance=Math.hypot(tip[0]-from[0],tip[1]-from[1]);\n    if(!distance||![...tip,...from,length,width].every(Number.isFinite)||length<=0||width<=0)return [];\n    const dx=(tip[0]-from[0])/distance,dy=(tip[1]-from[1])/distance,back=[tip[0]-dx*length,tip[1]-dy*length];\n    return [[...tip],[back[0]-dy*width/2,back[1]+dx*width/2],[back[0]+dy*width/2,back[1]-dx*width/2]];\n  }\n  return {clone,edgeId,mode,resolveOffsets,validateLayout,edgeOverride,availablePort,terminalPort,adaptTerminalPair,waypoints,routeOrthogonal,pathCost,straightRoute,simplifyAuto,roundedPath,segments,compact,arrowHead};\n});\n\n// Scene text stays in the DOM. Only connections use SVG coordinates.\n(() => {\nconst mounted = new WeakMap();\nfunction mountMap(map, {restoreHash = true} = {}) {\n  if (mounted.has(map)) return mounted.get(map);\n  const document = map.ownerDocument || globalThis.document;\n  const window = document.defaultView || globalThis.window;\n  const location = window.location || globalThis.location;\n  const history = window.history || globalThis.history;\n  const listeners = [], observers = [];\n  let disposed = false, frame = 0;\n  const on = (target, type, handler) => {\n    target.addEventListener(type, handler);\n    listeners.push(() => target.removeEventListener(type, handler));\n  };\n  const details = [...map.querySelectorAll('.time-map__detail')];\n  const links = [...map.querySelectorAll('[data-time-node]')];\n  const portals = [...map.querySelectorAll('[data-time-portal]')];\n  const sceneLinks = [...links, ...portals];\n  const relations = [...map.querySelectorAll('.time-map__reading li')];\n  const canvas = map.querySelector('.time-map__canvas');\n  const svg = map.querySelector('.time-map__connections');\n  const data = map.querySelector('.time-map__data');\n  const model = data ? JSON.parse(data.textContent) : null;\n  const prior = {\n    enhanced: map.classList.contains?.('time-map--enhanced') || false,\n    detailOpen: details.map(detail => detail.open),\n    attributes: sceneLinks.map(link => [link, link.getAttribute?.('aria-current'), link.getAttribute?.('aria-haspopup')]),\n    transforms: links.map(link => link.style.transform), paddingBottom: canvas.style.paddingBottom,\n    svgChildren: [...(svg.childNodes || svg.children)], viewBox: svg.getAttribute?.('viewBox'),\n    warning: map.dataset.diagramLayoutWarning, storyReader: map.storyReader, elioDiagram: map.elioDiagram,\n  };\n  const geometry = globalThis.elioDiagramGeometry;\n  let diagramLayout = geometry.clone(model?.diagram_layout), lastGeometry = null;\n  const colors = {life:'#89939b','actor-a':'#16869a','actor-b':'#7954aa',world:'#ab7a29'};\n  const ns = 'http://www.w3.org/2000/svg';\n  let selected = null;\n  map.classList.add('time-map--enhanced');\n  // Reuse the photo-flow reader's native dialog shell and typography.\n  const dialog=document.createElement('dialog');dialog.className='story-detail';\n  const header=document.createElement('header');header.className='story-detail__header';\n  const context=document.createElement('span');context.className='story-detail__context';\n  const close=document.createElement('button');close.type='button';close.className='story-detail__close';close.textContent='흐름으로 돌아가기 ×';\n  const body=document.createElement('div');body.className='story-detail__body';\n  header.append(context,close);dialog.append(header,body);map.append(dialog);\n  dialog.style.setProperty('--route-color','#16869a');\n  let opened=null,returnFocus=null,savedScroll=0;\n  const restore=()=>{if(opened){opened.append(body.querySelector('.time-map__scene'));opened=null;}};\n  on(dialog,'close',()=>{restore();document.body.classList.remove('story-detail-open');if(!disposed){returnFocus?.focus({preventScroll:true});window.scrollTo({top:savedScroll,behavior:'instant'});}});\n  on(close,'click',()=>dialog.close());\n  on(dialog,'click',event=>{if(event.target===dialog)dialog.close();});\n  const highlight = () => map.querySelectorAll('.time-map__edge, .time-map__arrow').forEach((edge) => {\n    edge.style.opacity = !selected || edge.dataset.from === selected || edge.dataset.to === selected ? '1' : '.25';\n  });\n  const select = (id, node) => {\n    selected = node;\n    details.forEach((detail) => { detail.open = false; });\n    sceneLinks.forEach((link) => {\n      if (link.dataset.timeItem === id) link.setAttribute('aria-current', 'true');\n      else link.removeAttribute('aria-current');\n    });\n    highlight();\n  };\n  const show=(link)=>{\n    if(disposed)return;\n    if(map.closest('.spoilers-on') && !map.classList.contains('spoiler-revealed'))return;\n    const detail=details.find(d=>d.dataset.timeDetail===link.dataset.timeItem);if(!detail)return;\n    if(!dialog.open){returnFocus=link;savedScroll=window.scrollY;}\n    restore();select(detail.dataset.timeDetail,link.dataset.timeNode || link.dataset.timePortal);opened=detail;\n    const era=map.querySelectorAll('.time-map__era')[+link.dataset.era]?.textContent||'';\n    context.textContent=era;\n    dialog.setAttribute('aria-label',detail.querySelector('summary').textContent);\n    body.append(detail.querySelector('.time-map__scene'));\n    if(!dialog.open){dialog.showModal();document.body.classList.add('story-detail-open');}\n    dialog.scrollTop=0;close.focus({preventScroll:true});\n  };\n  sceneLinks.forEach((link) => on(link,'click', (event) => {\n    if (event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;\n    event.preventDefault();\n    show(link);\n    history.replaceState(null, '', `#${link.dataset.timeItem}`);\n  }));\n  links.forEach(link=>link.setAttribute('aria-haspopup','dialog'));\n  map.storyReader={compact:true,resume:(id)=>{const link=links.find(l=>l.dataset.timeItem===id);if(link)show(link);}};\n  // The shared glossary listener records the original scene and resumes this\n  // reader through the same contract used by the photo-flow dialog.\n  on(dialog,'click',event=>{\n    const anchor=event.target.closest('a.term-link[href^=\"#\"]');\n    if(!anchor || event.button>0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;\n    const target=document.getElementById(anchor.hash.slice(1));\n    if(target && !dialog.contains(target)){event.preventDefault();dialog.close();}\n  });\n  const syncHash = () => {\n    if(disposed)return;\n    const link = links.find((row) => row.hash === location.hash);\n    if(link)show(link);else {if(dialog.open)dialog.close();select(null,null);}\n  };\n  if (restoreHash) {\n    syncHash();\n    on(window,'hashchange', syncHash);\n  }\n  const draw = () => {\n    if (disposed || !canvas.clientWidth) return;\n    links.forEach(link=>{link.style.transform='';});\n    canvas.style.paddingBottom='';\n    const origin = canvas.getBoundingClientRect();\n    const relative = (el) => {\n      const r = el.getBoundingClientRect();\n      return {left:r.left-origin.left,top:r.top-origin.top,right:r.right-origin.left,bottom:r.bottom-origin.top,width:r.width,height:r.height,cx:(r.left+r.right)/2-origin.left,cy:(r.top+r.bottom)/2-origin.top};\n    };\n    const portrait = getComputedStyle(canvas).getPropertyValue('--map-orientation').trim() === 'portrait';\n    const nodes = links.map((link) => ({id:link.dataset.timeNode,era:+link.dataset.era,lane:+link.dataset.lane,span:+link.dataset.laneSpan,\n      box:relative(link),photo:relative(link.querySelector('.time-map__photo'))}));\n    const W=origin.width,baseHeight=origin.height,basePadding=parseFloat(getComputedStyle(canvas).paddingBottom)||0;\n    const offsets=geometry.resolveOffsets(nodes,geometry.mode(diagramLayout,portrait).nodes,W,{minY:Math.min(...nodes.map(n=>n.box.top))});\n    const warnings=[...offsets.warnings];\n    nodes.forEach((node,index)=>{\n      const offset=offsets.offsets[node.id];links[index].style.transform=`translate(${offset.x}px,${offset.y}px)`;\n      for(const key of ['box','photo']){const r=node[key];node[key]={...r,left:r.left+offset.x,right:r.right+offset.x,top:r.top+offset.y,bottom:r.bottom+offset.y,cx:r.cx+offset.x,cy:r.cy+offset.y};}\n    });\n    const byId = new Map(nodes.map((n) => [n.id,n]));\n    let H=Math.max(baseHeight,...nodes.map(n=>n.box.bottom+18));\n    const obstacles=nodes.map(n=>n.box);\n    // Gateways are outside the full caption, never through its text.\n    const port = (n, side) => {\n      const b=n.box,p=n.photo;\n      const space={obstacles:nodes.filter(node=>node.id!==n.id).map(node=>node.box),width:W,height:H};\n      if(side==='left') return geometry.terminalPort({side,tip:[p.left-8,p.cy],gate:[b.left-9,p.cy]},side,24,space);\n      if(side==='right') return geometry.terminalPort({side,tip:[p.right+8,p.cy],gate:[b.right+9,p.cy]},side,24,space);\n      if(side==='top') return geometry.terminalPort({side,tip:[p.cx,p.top-8],gate:[p.cx,b.top-9]},side,24,space);\n      return geometry.terminalPort({side,tip:[p.cx,b.bottom+8],gate:[p.cx,b.bottom+9]},side,24,space);\n    };\n    const returnRails = new Map();\n    const plan = relations.map((relation) => {\n      const s=byId.get(relation.dataset.from),t=byId.get(relation.dataset.to);\n      let a,b,via=[];\n      const sameLane=s.lane===t.lane || s.span>1 || t.span>1;\n      // Shared scenes span lanes: different actors may use the same physical\n      // return corridor. Allocate bands by geometry, not actor/kind identity.\n      const key=portrait ? Math.min(s.box.left,t.box.left)\n        : Math.min(...nodes.filter(n=>n.lane===t.lane).map(n=>n.box.top));\n      const returnLevel=s.era>t.era && sameLane ? (returnRails.get(key)||0) : 0;\n      if(s.era>t.era && sameLane)returnRails.set(key,returnLevel+1);\n      if(portrait){\n        if(s.era===t.era){ a=s.lane<t.lane?'right':'left'; b=s.lane<t.lane?'left':'right'; }\n        else if(s.era<t.era){a='bottom';b='top';}\n        else if(sameLane){\n          a='left';b='left';\n          const rail=Math.max(43,Math.min(s.box.left,t.box.left)-17-returnLevel*6-(relation.dataset.kind==='life'?6:0));\n          via=[[rail,s.photo.cy],[rail,t.photo.cy]];\n        }else{\n          a='top';b='bottom';\n        }\n      }else{\n        if(s.era===t.era){a=s.lane<t.lane?'bottom':'top';b=s.lane<t.lane?'top':'bottom';}\n        else if(s.era>t.era && sameLane){\n          a='top';b='top';\n          const band=Math.min(...nodes.filter(n=>n.lane===t.lane).map(n=>n.box.top))-18-returnLevel*9;\n          via=[[s.photo.cx,band],[t.photo.cx,band]];\n        }else if(s.era<t.era && sameLane){a='right';b='left';}\n        else{\n          // Cross-lane causes are not temporal return loops. Let visibility\n          // routing use the nearest clear corridor, in either time direction.\n          a=s.era<t.era?'right':'left';b=s.era<t.era?'left':'right';\n        }\n      }\n      const defaultSides=[a,b],override=geometry.edgeOverride(diagramLayout,portrait,s.id,t.id);\n      if(override.source_port)a=override.source_port;\n      if(override.target_port)b=override.target_port;\n      if(override.source_port||override.target_port)via=[];\n      if(override.via?.length)via=geometry.waypoints(override.via,W,{x:s.photo.cx,y:s.photo.cy});\n      const manual=Boolean(override.via?.length||override.source_port||override.target_port);\n      let alternate=null;\n      if(!manual&&s.span===1&&t.span===1){\n        if(s.era!==t.era&&s.lane!==t.lane)alternate=portrait?(s.lane<t.lane?['right','left']:['left','right']):(s.lane<t.lane?['bottom','top']:['top','bottom']);\n        else if(t.era-s.era>1&&s.lane===t.lane){\n          // A continuing branch can use the shared inner corridor instead of\n          // circling below every caption. Still compare it with the old ports.\n          const inner=portrait?(s.photo.cx<W/2?'right':'left'):(s.photo.cy<H/2?'bottom':'top');\n          alternate=[inner,inner];\n        }\n      }\n      return {relation,id:geometry.edgeId(s.id,t.id),defaultSides,alternate,start:{...port(s,a),node:s.id,side:a,other:t.photo},end:{...port(t,b),node:t.id,side:b,other:s.photo},via,manual};\n    });\n    const fans=new Map();\n    plan.forEach(p=>[p.start,p.end].forEach(endpoint=>{\n      const key=`${endpoint.node}:${endpoint.side}`;\n      if(!fans.has(key))fans.set(key,[]);fans.get(key).push(endpoint);\n    }));\n    fans.forEach(endpoints=>endpoints.sort((a,b)=>['top','bottom'].includes(a.side)?a.other.cx-b.other.cx:a.other.cy-b.other.cy).forEach((endpoint,i)=>{\n      const axis=['top','bottom'].includes(endpoint.side)?0:1;\n      const offset=(i-(endpoints.length-1)/2)*10;\n      endpoint.tip[axis]+=offset;endpoint.gate[axis]+=offset;\n    }));\n    // A free port can align with the opposing fan port. Keep a clear forward\n    // connection straight rather than drawing a five-pixel decorative jog.\n    plan.forEach(p=>{\n      const s=byId.get(p.start.node),t=byId.get(p.end.node);\n      const axis=portrait?0:1;\n      const aligned=portrait?s.photo.cx===t.photo.cx:s.photo.cy===t.photo.cy;\n      const forward=portrait?p.start.side==='bottom' && p.end.side==='top'\n        :p.start.side==='right' && p.end.side==='left';\n      if(p.via.length || !aligned || !forward)return;\n      const freeStart=fans.get(`${p.start.node}:${p.start.side}`).length===1;\n      const freeEnd=fans.get(`${p.end.node}:${p.end.side}`).length===1;\n      const endpoint=freeStart?p.start:freeEnd?p.end:null;\n      if(endpoint){const v=(freeStart?p.end:p.start).tip[axis];endpoint.tip[axis]=v;endpoint.gate[axis]=v;}\n    });\n    plan.forEach(p=>{\n      if(!p.via.length||p.manual)return;\n      if(!portrait && p.start.side==='top' && p.end.side==='top'){\n        p.via[0][0]=p.start.gate[0];p.via.at(-1)[0]=p.end.gate[0];\n        const band=Math.min(p.via[0][1],p.start.gate[1],p.end.gate[1]);p.via.forEach(point=>{point[1]=band;});\n      }else if(portrait && p.start.side==='left' && p.end.side==='left'){\n        p.via[0][1]=p.start.gate[1];p.via.at(-1)[1]=p.end.gate[1];\n        const rail=Math.min(p.via[0][0],p.start.gate[0],p.end.gate[0]);p.via.forEach(point=>{point[0]=rail;});\n      }\n    });\n    plan.forEach(p=>p.via.forEach(point=>{if(Number.isFinite(point[1]))H=Math.max(H,point[1]+18);}));\n    canvas.style.paddingBottom=`${basePadding+H-baseHeight}px`;\n    const el=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;};\n    svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${W} ${H}`);\n    const routed=new Map(),terminals=new Map(),occupied=[];\n    const reservations=new Map([...fans].map(([key,endpoints])=>[key,endpoints.map(endpoint=>endpoint.tip[['top','bottom'].includes(endpoint.side)?0:1])]));\n    const alternatePort=(id,side)=>{\n      const node=byId.get(id),photo=node.photo,vertical=['top','bottom'].includes(side);\n      return geometry.availablePort(port(node,side),side,reservations.get(`${id}:${side}`)||[],vertical?photo.left+4:photo.top+4,vertical?photo.right-4:photo.bottom-4);\n    };\n    const reserve=(id,side,endpoint)=>{const key=`${id}:${side}`;if(!reservations.has(key))reservations.set(key,[]);reservations.get(key).push(endpoint.tip[['top','bottom'].includes(side)?0:1]);};\n    const length=p=>Math.abs(p.start.gate[0]-p.end.gate[0])+Math.abs(p.start.gate[1]-p.end.gate[1]);\n    const route=(start,end,via=[],preferStraightStops=false)=>geometry.routeOrthogonal({start:start.gate,end:end.gate,startTip:start.tip,endTip:end.tip,via,obstacles,width:W,height:H,occupied,preferStraightStops});\n    [...plan].sort((a,b)=>Number(b.manual)-Number(a.manual)||length(a)-length(b)).forEach(p=>{\n      let {start,end}=p;\n      ({start,end}=geometry.adaptTerminalPair(start,end,obstacles));\n      const otherObstacles=nodes.filter(node=>node.id!==p.start.node&&node.id!==p.end.node).map(node=>node.box);\n      const direct=!p.manual&&!p.via.length&&geometry.straightRoute(start.tip,end.tip,otherObstacles);\n      if(direct){routed.set(p.id,direct);terminals.set(p.id,{start,end});occupied.push(...geometry.segments(direct));return;}\n      let path=route(start,end,p.via,p.manual&&p.via.length>0);\n      if(p.alternate){\n        let altStart=alternatePort(p.start.node,p.alternate[0]),altEnd=alternatePort(p.end.node,p.alternate[1]);\n        if(altStart&&altEnd)({start:altStart,end:altEnd}=geometry.adaptTerminalPair(altStart,altEnd,obstacles));\n        const alternative=altStart&&altEnd&&route(altStart,altEnd);\n        if(alternative&&(!path||geometry.pathCost([altStart.tip,...alternative,altEnd.tip],occupied,obstacles)<geometry.pathCost([start.tip,...path,end.tip],occupied,obstacles)-1)){\n          start=altStart;end=altEnd;path=alternative;\n          reserve(p.start.node,p.alternate[0],start);reserve(p.end.node,p.alternate[1],end);\n        }\n      }\n      if(!path){\n        if(p.manual)warnings.push(`Edge ${p.id}: requested waypoints or ports are blocked; automatic route shown.`);\n        path=route(start,end);\n      }\n      if(!path){\n        start=port(byId.get(p.start.node),p.defaultSides[0]);end=port(byId.get(p.end.node),p.defaultSides[1]);\n        ({start,end}=geometry.adaptTerminalPair(start,end,obstacles));\n        path=route(start,end);\n      }\n      if(!path){warnings.push(`Edge ${p.id}: no clear route; its relation remains in the text list.`);return;}\n      const full=[start.tip,...path,end.tip],points=p.manual?geometry.compact(full):geometry.simplifyAuto(full,otherObstacles);routed.set(p.id,points);terminals.set(p.id,{start,end});occupied.push(...geometry.segments(points));\n    });\n    const arrows=[];\n    plan.forEach(({relation,id})=>{\n      const points=routed.get(id);if(!points)return;\n      const d=geometry.roundedPath(points,7,9);\n      // A narrow surface-colored bridge makes a necessary crossing visibly\n      // distinct from a junction; adjacent return rails have separate bands.\n      svg.append(el('path',{class:'time-map__bridge',d,stroke:'#f8fbfc','stroke-width':5.5,fill:'none','stroke-linejoin':'round'}));\n      svg.append(el('path',{class:'time-map__edge','data-from':relation.dataset.from,'data-to':relation.dataset.to,d,stroke:colors[relation.dataset.kind]}));\n      arrows.push(el('polygon',{class:'time-map__arrow','data-from':relation.dataset.from,'data-to':relation.dataset.to,points:geometry.arrowHead(points).map(point=>point.join(',')).join(' '),fill:colors[relation.dataset.kind],stroke:'none'}));\n    });\n    // Later crossing bridges may cover an earlier body, never its arrowhead.\n    svg.append(...arrows);\n    highlight();\n    if(warnings.length)map.dataset.diagramLayoutWarning=warnings.join('\\n');else delete map.dataset.diagramLayoutWarning;\n    const terminalSnapshot=id=>terminals.has(id)?Object.fromEntries(Object.entries(terminals.get(id)).map(([key,{tip,gate,side}])=>[key,{tip,gate,side}])):undefined;\n    lastGeometry={variant:portrait?'mobile':'desktop',width:W,height:H,obstacles,nodes:nodes.map(node=>({id:node.id,box:{left:node.box.left,top:node.box.top,width:node.box.width,height:node.box.height},anchor:{x:node.photo.cx,y:node.photo.cy},offsetCurrent:geometry.mode(diagramLayout,portrait).nodes?.[node.id]||{x:0,y:0}})),edges:plan.map(p=>({id:p.id,from:p.relation.dataset.from,to:p.relation.dataset.to,points:routed.get(p.id)||[],terminals:terminalSnapshot(p.id)}))};\n    if(typeof CustomEvent==='function')map.dispatchEvent(new CustomEvent('elio:diagram-drawn',{bubbles:true}));\n  };\n  let queued=false;\n  const schedule=()=>{if(disposed||queued)return;queued=true;frame=requestAnimationFrame(()=>{frame=0;queued=false;if(!disposed)draw();});};\n  map.elioDiagram={kind:'time_map',surface:canvas,nodes:links.map(link=>({id:link.dataset.timeNode,label:model?.nodes?.find(node=>node.id===link.dataset.timeNode)?.label||link.textContent||link.dataset.timeNode})),edges:relations.map(relation=>({id:geometry.edgeId(relation.dataset.from,relation.dataset.to),from:relation.dataset.from,to:relation.dataset.to,label:relation.textContent||''})),getLayout:()=>geometry.clone(diagramLayout),setLayout:value=>{diagramLayout=geometry.clone(value);schedule();},geometry:()=>geometry.clone(lastGeometry)};\n  const diagram = map.elioDiagram, reader = map.storyReader;\n  for(const element of [canvas,...links]){const observer=new ResizeObserver(schedule);observer.observe(element);observers.push(observer);}\n  document.fonts?.ready.then(schedule);\n  schedule();\n  const dispose=()=>{\n    if(disposed)return;\n    disposed=true;cancelAnimationFrame(frame);frame=0;queued=false;\n    observers.forEach(observer=>observer.disconnect());\n    listeners.forEach(remove=>remove());\n    restore();\n    if(dialog.open)dialog.close();\n    dialog.remove();\n    if(!document.querySelector('dialog.story-detail[open]'))document.body.classList.remove('story-detail-open');\n    if(!prior.enhanced)map.classList.remove('time-map--enhanced');\n    details.forEach((detail,index)=>{detail.open=prior.detailOpen[index];});\n    for(const [link,current,popup] of prior.attributes){\n      if(current===null||current===undefined)link.removeAttribute('aria-current');else link.setAttribute('aria-current',current);\n      if(popup===null||popup===undefined)link.removeAttribute('aria-haspopup');else link.setAttribute('aria-haspopup',popup);\n    }\n    links.forEach((link,index)=>{link.style.transform=prior.transforms[index]||'';});\n    canvas.style.paddingBottom=prior.paddingBottom||'';\n    svg.replaceChildren(...prior.svgChildren);\n    if(prior.viewBox===null||prior.viewBox===undefined)svg.removeAttribute('viewBox');else svg.setAttribute('viewBox',prior.viewBox);\n    if(prior.warning===undefined)delete map.dataset.diagramLayoutWarning;else map.dataset.diagramLayoutWarning=prior.warning;\n    if(map.storyReader===reader){if(prior.storyReader===undefined)delete map.storyReader;else map.storyReader=prior.storyReader;}\n    if(map.elioDiagram===diagram){if(prior.elioDiagram===undefined)delete map.elioDiagram;else map.elioDiagram=prior.elioDiagram;}\n    if(mounted.get(map)===dispose)mounted.delete(map);\n  };\n  mounted.set(map,dispose);\n  return dispose;\n}\nfunction mount(root, {restoreHash = true} = {}) {\n  const maps=[...(root.matches?.('.time-map')?[root]:[]),...root.querySelectorAll('.time-map')];\n  const disposers=maps.map(map=>mountMap(map,{restoreHash}));\n  let disposed=false;\n  return ()=>{if(disposed)return;disposed=true;disposers.forEach(dispose=>dispose());};\n}\nglobalThis.ElioTimeMap={mount};\nif(typeof document!=='undefined')mount(document);\n})();\n", "css": "/* Reader notes: a single reading surface with information-specific modules. */\n.reader-guide__nav-title { font-weight:inherit; }\n.reader-guide__scene { display:inline-flex; align-items:center; min-height:44px; margin-top:8px; color:#287a96; font-size:12px; font-weight:750; text-underline-offset:4px; }\n.reader-guide__scene:focus-visible { outline:3px solid #42a7c5; outline-offset:3px; border-radius:4px; }\n.reader-guides{width:min(880px,calc(100% - 40px));margin:76px auto 38px;padding:0 38px 12px;border:1px solid rgba(47,66,80,.12);border-radius:28px;background:rgba(255,255,255,.86);box-shadow:0 22px 58px rgba(34,50,64,.08)}\n.reader-guides__intro{padding:38px 0 27px;border-bottom:1px solid rgba(47,66,80,.11);text-align:left}.reader-guides__intro>span{color:#2f8da5;font-size:.68rem;font-weight:950;letter-spacing:.15em}.reader-guides__intro h2{margin:8px 0 9px;font-size:clamp(1.8rem,3.5vw,2.55rem);line-height:1.18;letter-spacing:-.04em}.reader-guides__intro>p{max-width:640px;margin:0;color:#66737e;font-size:1rem;line-height:1.75;word-break:keep-all}.reader-guides__nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}.reader-guides__nav a{display:flex;align-items:center;gap:8px;min-height:42px;padding:8px 13px;border:1px solid rgba(47,66,80,.12);border-radius:999px;background:#fff;color:#4c5963;font-size:.77rem;font-weight:800;text-decoration:none}.reader-guides__nav a span{flex:0 0 auto;color:#2786a3;font-size:.62rem;letter-spacing:.08em}.reader-guides__nav a:hover,.reader-guides__nav a:focus-visible{border-color:rgba(39,134,163,.45);background:#f3fbfd}\n.reader-guides__body{display:grid;grid-template-columns:minmax(0,1fr)}.reader-guide{--guide-accent:#3ca4c2;position:relative;min-width:0;scroll-margin-top:76px;border-bottom:1px solid rgba(47,66,80,.11);background:transparent;box-shadow:none;overflow:hidden}.reader-guide:last-child{border-bottom:0}.reader-guide__content{position:relative;min-width:0;padding:34px 0 36px;text-align:left;transition:opacity .22s ease,transform .25s ease,visibility 0s linear}.reader-guide__header{max-width:720px;min-width:0}.reader-guide__header>span{display:block;margin-bottom:7px;color:var(--guide-accent);font-size:.7rem;font-weight:950;letter-spacing:.12em}.reader-guide__header h3{margin:0 0 10px;font-size:clamp(1.4rem,2.6vw,1.85rem);line-height:1.35;letter-spacing:-.03em;word-break:keep-all}.reader-guide__header>p{margin:0;color:#5f6e79;font-size:1rem;line-height:1.78;word-break:keep-all}.reader-guide--conclusion{--guide-accent:#238eaa}.reader-guide--conclusion .reader-guide__content{margin:26px 0;padding:25px 28px;border-left:4px solid var(--guide-accent);border-radius:0 18px 18px 0;background:linear-gradient(100deg,rgba(56,169,198,.09),rgba(56,169,198,.025))}.reader-guide--contrast{--guide-accent:#b77b17}.reader-guide--questions{--guide-accent:#8758bc}.reader-guide--clues{--guide-accent:#c05a77}\n.reader-guide:hover{transform:none;box-shadow:none}\n.reader-guide__comparison{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0;margin-top:25px;border-top:1px solid rgba(47,66,80,.12);border-bottom:1px solid rgba(47,66,80,.12)}.reader-guide__comparison-item{padding:22px 22px 22px 0}.reader-guide__comparison-item+.reader-guide__comparison-item{padding-left:22px;border-left:1px solid rgba(47,66,80,.12)}.reader-guide__comparison-item>span{color:var(--guide-accent);font-size:.68rem;font-weight:950;letter-spacing:.1em}.reader-guide__comparison-item h4{margin:7px 0 8px;font-size:1.02rem;line-height:1.45;letter-spacing:-.015em}.reader-guide__comparison-item p{margin:0;color:#66737e;font-size:.92rem;line-height:1.72;word-break:keep-all}\n.reader-guide--relationships{--guide-accent:#397f91}.reader-guide__relationships{display:grid;gap:10px;margin-top:24px}.reader-guide__relationship{display:block;padding:17px 20px 18px;border:1px solid rgba(57,127,145,.16);border-radius:15px;background:rgba(57,127,145,.045)}.reader-guide__relationship-line{display:grid;grid-template-columns:max-content max-content max-content;justify-content:start;align-items:center;gap:10px;min-width:0}.reader-guide__relationship-line strong{font-size:.95rem;line-height:1.4;text-align:left;white-space:nowrap}.reader-guide__relationship-line span{padding:4px 8px;border-radius:999px;background:rgba(57,127,145,.1);color:#397f91;font-size:.68rem;font-weight:900;line-height:1.35;white-space:nowrap}.reader-guide__relationship>p{margin:10px 0 0;padding-top:10px;border-top:1px solid rgba(57,127,145,.11);color:#66737e;font-size:.91rem;line-height:1.7;word-break:keep-all}\n.reader-guide__disclosures{margin-top:24px;border-top:1px solid rgba(47,66,80,.14)}.reader-guide__disclosure{border-bottom:1px solid rgba(47,66,80,.12)}.reader-guide__disclosure summary{display:grid;grid-template-columns:132px minmax(0,1fr) 24px;align-items:center;gap:12px;min-height:66px;padding:13px 2px;cursor:pointer;list-style:none}.reader-guide__disclosure summary::-webkit-details-marker{display:none}.reader-guide__meta{display:flex;min-width:0;flex-direction:column;align-items:flex-start;gap:4px}.reader-guide__meta>span{color:var(--guide-accent);font-size:.67rem;font-weight:950;letter-spacing:.09em}.reader-guide__disclosure summary>strong{font-size:1rem;line-height:1.45;letter-spacing:-.015em}.reader-guide__disclosure summary>i,.reader-guide__sources summary>i{position:relative;width:22px;height:22px;border-radius:50%;background:color-mix(in srgb,var(--guide-accent) 10%,white)}.reader-guide__disclosure summary>i:before,.reader-guide__disclosure summary>i:after,.reader-guide__sources summary>i:before,.reader-guide__sources summary>i:after{content:\"\";position:absolute;left:6px;right:6px;top:10px;height:2px;border-radius:9px;background:var(--guide-accent)}.reader-guide__disclosure summary>i:after,.reader-guide__sources summary>i:after{transform:rotate(90deg);transition:transform .18s ease}.reader-guide__disclosure[open] summary>i:after,.reader-guide__sources[open] summary>i:after{transform:rotate(0)}.reader-guide__answer{max-width:650px;margin:-3px 32px 18px 144px}.reader-guide__answer>p{margin:0;color:#66737e;font-size:.93rem;line-height:1.75;word-break:keep-all}.reader-guide__reference{color:#247f9c;text-decoration:underline;text-decoration-color:rgba(36,127,156,.38);text-decoration-thickness:1px;text-underline-offset:3px}.reader-guide__reference:hover,.reader-guide__reference:focus-visible{color:#185e75;text-decoration-color:currentColor}.reader-guide__reference span{margin-left:3px;font-size:.64em;text-decoration:none}.reader-guide__disclosure summary:hover>strong{color:#1f7089}\n.reader-guide__sources{margin-top:20px}.reader-guide__sources summary{display:flex;align-items:center;gap:7px;width:max-content;min-height:36px;padding:4px 0;color:#737f88;font-size:.75rem;font-weight:800;cursor:pointer;list-style:none}.reader-guide__sources summary::-webkit-details-marker{display:none}.reader-guide__sources summary strong{color:#2f829b}.reader-guide__sources summary>i{width:18px;height:18px}.reader-guide__sources summary>i:before,.reader-guide__sources summary>i:after{left:5px;right:5px;top:8px}.reader-guide__sources>div{display:flex;flex-wrap:wrap;gap:8px;padding-top:9px}.reader-guide__sources a{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:7px 10px;border:1px solid rgba(47,66,80,.12);border-radius:9px;background:#fff;color:#316f83;font-size:.75rem;font-weight:750;text-decoration:none}.reader-guide__sources a:hover{text-decoration:underline}.reader-guide__sources a span{font-size:.66rem}\n.page.spoilers-on .reader-guide:not(.spoiler-revealed) .reader-guide__content{visibility:hidden;opacity:0;transform:scale(.99);user-select:none;pointer-events:none;transition:opacity .18s ease,transform .18s ease,visibility 0s linear .18s}.reader-guide .spoiler-cover{inset:0}.reader-guide.is-disclosure-active .reader-guide__disclosure[open]>.reader-guide__answer,.reader-guide.is-disclosure-active .reader-guide__sources[open]>div{animation:reader-guide-open .24s ease-out both}@keyframes reader-guide-open{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}\n@media(max-width:720px){.reader-guides{width:calc(100% - 24px);margin-top:52px;padding:0 20px 8px;border-radius:22px}.reader-guides__intro{padding:29px 0 23px}.reader-guides__intro h2{font-size:1.8rem}.reader-guides__intro h2,.reader-guides__intro>p,.reader-guide__header h3,.reader-guide__header>p,.reader-guide__disclosure summary>strong,.reader-guide__answer>p{white-space:normal;word-break:normal;overflow-wrap:anywhere}.reader-guides__intro>p,.reader-guide__header>p{font-size:.94rem}.reader-guides__nav{display:grid;grid-template-columns:minmax(0,1fr)}.reader-guides__nav a{min-width:0;align-items:flex-start;border-radius:14px;line-height:1.45;white-space:normal;word-break:normal;overflow-wrap:anywhere}.reader-guide__content{padding:29px 0 31px}.reader-guide--conclusion .reader-guide__content{margin:20px 0;padding:21px 20px}.reader-guide__header h3{font-size:1.38rem}.reader-guide__relationships{gap:8px}.reader-guide__relationship{padding:15px 14px 16px}.reader-guide__relationship-line{display:flex;flex-wrap:wrap;gap:7px 9px}.reader-guide__relationship-line strong{text-align:left}.reader-guide__relationship>p{margin-top:9px;padding-top:9px}.reader-guide__comparison{grid-template-columns:minmax(0,1fr)}.reader-guide__comparison-item{min-width:0;padding:19px 0}.reader-guide__comparison-item+.reader-guide__comparison-item{padding-left:0;border-top:1px solid rgba(47,66,80,.1);border-left:0}.reader-guide__disclosure summary{grid-template-columns:minmax(0,1fr) 22px;gap:5px;min-height:68px}.reader-guide__disclosure summary>span{grid-column:1}.reader-guide__disclosure summary>strong{grid-column:1;min-width:0}.reader-guide__disclosure summary>i{grid-column:2;grid-row:1/span 2}.reader-guide__answer{margin:-1px 30px 18px 0}.reader-guide__reference{max-width:100%;white-space:normal;word-break:normal;overflow-wrap:anywhere}.reader-guide__sources>div{display:grid;grid-template-columns:minmax(0,1fr)}.reader-guide__sources a{width:100%;min-width:0;white-space:normal;word-break:normal;overflow-wrap:anywhere}}\n.reader-guide--perspective{--guide-accent:#267d91}.reader-guide__life{margin:28px 0 0;padding:0;list-style:none}.reader-guide__life-item{display:grid;grid-template-columns:56px minmax(0,1fr);gap:16px;position:relative}.reader-guide__life-rail{position:relative;display:flex;justify-content:center}.reader-guide__life-rail:before{content:\"\";position:absolute;top:34px;bottom:-12px;width:2px;background:linear-gradient(#81bfd0,#d9e7ea)}.reader-guide__life-item:last-child .reader-guide__life-rail:before{display:none}.reader-guide__life-rail>span{position:relative;z-index:1;display:grid;place-items:center;width:38px;height:38px;border:2px solid #81bfd0;border-radius:50%;background:#fff;color:#286f82;font-size:.7rem;font-weight:950;box-shadow:0 5px 14px rgba(31,92,109,.1)}.reader-guide__life-card{min-width:0;margin-bottom:17px;padding:1px 0 22px;border-bottom:1px solid rgba(47,66,80,.1)}.reader-guide__life-item:last-child .reader-guide__life-card{border-bottom:0}.reader-guide__life-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:7px}.reader-guide__life-meta>span{color:#55707a;font-size:.7rem;font-weight:900;letter-spacing:.08em}.reader-guide__evidence{display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border:1px solid transparent;border-radius:999px;font-size:.66rem;font-style:normal;font-weight:850;line-height:1.2}.reader-guide__evidence--confirmed{border-color:#8cc9b6;background:#edf9f5;color:#24745d}.reader-guide__evidence--in_world_legend{border-color:#d8c390;background:#fff9e8;color:#826219}.reader-guide__evidence--corrected_record{border-color:#cbb7df;background:#f7f1fc;color:#745199}.reader-guide__evidence--interpretation{border-color:#a9cbd5;background:#f0f8fa;color:#376f7e}.reader-guide__life-card h4{margin:0 0 8px;font-size:1.08rem;line-height:1.45;letter-spacing:-.02em}.reader-guide__life-card p{margin:0;color:#61717b;font-size:.94rem;line-height:1.76;word-break:keep-all}\n@media(max-width:720px){.reader-guide__life-item{grid-template-columns:42px minmax(0,1fr);gap:11px}.reader-guide__life-rail>span{width:34px;height:34px}.reader-guide__life-rail:before{top:31px}.reader-guide__life-card{padding-bottom:19px}.reader-guide__life-card h4{font-size:1rem}.reader-guide__life-card p{font-size:.91rem;word-break:normal;overflow-wrap:anywhere}}\n@media print{.reader-guide__disclosure,.reader-guide__sources{display:block}.reader-guide__answer,.reader-guide__sources>div{display:flex!important}}\n.reader-guide__answer>.reader-guide__reference{display:inline-flex;align-items:center;min-height:44px;margin:8px 14px 0 0;font-size:12px;font-weight:750}\n\n.timeline[data-story-layout=\"map\"]::before{display:none}\n.time-map{position:relative}\n.time-map>.spoiler-cover{inset:12px;width:calc(100% - 24px);border-radius:24px}\n.page.spoilers-on .time-map:not(.spoiler-revealed)>.time-map__content{visibility:hidden;pointer-events:none;user-select:none}\n.time-map{max-width:1120px;margin:0 auto;padding:28px 24px 20px;border:1px solid rgba(51,63,75,.1);border-radius:28px;background:radial-gradient(ellipse at 15% 12%,rgba(116,210,232,.065),transparent 48%),linear-gradient(145deg,#fff,#f8fbfc);box-shadow:0 18px 46px rgba(22,31,41,.045);color:var(--ink,#23272d);container-type:inline-size;font-family:inherit}\n.time-map header h2{font-size:1.4rem;font-weight:800;letter-spacing:-.035em;line-height:1.4;margin:0 0 8px;word-break:keep-all}\n.time-map header p{margin:0;max-width:72ch;color:var(--muted,#6e747c);line-height:1.7;font-size:.875rem;word-break:keep-all}\n.time-map__space{margin-top:20px;padding:16px 18px;border:1px solid #d7e8ed;border-radius:18px;background:linear-gradient(115deg,#eef8fa,#f5f5fc);color:#405864}\n.time-map__space-heading{display:flex;align-items:baseline;justify-content:space-between;gap:8px 20px;flex-wrap:wrap}\n.time-map__space-heading h3{margin:0;font-size:.9rem;font-weight:750;letter-spacing:-.025em}\n.time-map__space-heading>span{font-size:.7rem;color:#677986}\n.time-map__space>p{font-size:.78rem;line-height:1.65;margin:6px 0 12px;word-break:keep-all;color:#5d737e}\n.time-map__portals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;position:relative}\n.time-map__portals::before{content:\"\";position:absolute;top:50%;left:10%;right:10%;border-top:1px solid #b6ccd5}\n.time-map__portal{position:relative;display:flex;flex-direction:column;justify-content:center;gap:3px;min-height:58px;padding:9px 12px;border:1px solid #cddfe6;border-radius:11px;background:#fcfdff;text-decoration:none;color:#395361;text-align:center;outline-offset:3px;transition:border-color .18s,background .18s}\n.time-map__portal>span{font-size:.7rem;color:#6b7d88}\n.time-map__portal>strong{font-size:.8rem;font-weight:650;line-height:1.5;word-break:keep-all}\n.time-map__portal:hover,.time-map__portal[aria-current=\"true\"]{background:#eaf6f9;border-color:#329ab6}\n.time-map__portal:focus-visible{outline:2px solid #16869a}\n.time-map__scene .scene-desc a[href^=\"https://www.youtube.com/\"],.time-map__scene .scene-desc a[href^=\"https://youtu.be/\"]{display:flex;align-items:center;gap:8px;width:fit-content;min-height:44px;margin:16px 0 10px;padding:9px 16px;border:1px solid #d9e5ea;border-radius:12px;background:#f5fafc;color:#315c6e;font-size:.84rem;font-weight:700;line-height:1.5;text-decoration:none;box-sizing:border-box;transition:background .18s,border-color .18s}\n.time-map__scene .scene-desc a[href^=\"https://www.youtube.com/\"]::before,.time-map__scene .scene-desc a[href^=\"https://youtu.be/\"]::before{content:\"▶\";color:#d34749;font-size:.7rem}\n.time-map__scene .scene-desc a[href^=\"https://www.youtube.com/\"]:hover,.time-map__scene .scene-desc a[href^=\"https://youtu.be/\"]:hover{background:#eaf4f8;border-color:#96bccd}\n.time-map__scene .scene-desc a[href^=\"https://www.youtube.com/\"]:focus-visible,.time-map__scene .scene-desc a[href^=\"https://youtu.be/\"]:focus-visible{outline:2px solid #16869a;outline-offset:3px}\n.time-map__legend{display:flex;flex-wrap:wrap;gap:8px 18px;margin:20px 0 12px;font-size:.72rem;font-weight:600;color:#5a6873}\n.time-map__legend span::before{content:\"\";display:inline-block;width:19px;border-top:2px solid var(--map-color);border-radius:9px;vertical-align:middle;margin-right:6px}\n.time-map__canvas{--map-orientation:landscape;position:relative;isolation:isolate;display:grid;grid-template-columns:64px repeat(var(--era-count),minmax(0,1fr));grid-template-rows:48px repeat(var(--lane-count),174px);gap:24px 14px;padding:0 12px 48px 0}\n.time-map__era,.time-map__lane{font-size:.79rem;line-height:1.45;font-weight:650;color:#677581;align-self:center;text-align:center;word-break:keep-all;position:relative;z-index:1}\n.time-map__era{grid-column:var(--era);grid-row:1}\n.time-map__lane{grid-column:1;grid-row:var(--lane);text-align:left}\n.time-map__node{grid-column:var(--era);grid-row:var(--lane)/span var(--lane-span);align-self:center;justify-self:center;display:flex;flex-direction:column;align-items:center;gap:10px;text-decoration:none;color:inherit;text-align:center;width:100%;max-width:150px;position:relative;z-index:2;border-radius:12px;outline-offset:5px;-webkit-tap-highlight-color:transparent}\n.time-map__photo{display:block;flex:none;width:66px;height:66px;border-radius:50%;overflow:hidden;background:#eaf2f5;border:3px solid #fff;outline:1px solid #c9e1e9;box-shadow:0 4px 12px rgba(46,91,112,.1);transition:outline-color .18s,box-shadow .18s}\n.time-map__photo img,.time-map__photo svg{display:block;width:100%;height:100%;object-fit:cover}\n.time-map__caption{display:flex;flex-direction:column;gap:3px;line-height:1.45;letter-spacing:-.025em;word-break:keep-all;white-space:pre-line}\n.time-map__role{font-size:.8rem;font-weight:500;color:#66747e}\n.time-map__action{font-size:.93rem;font-weight:700;color:#34434f}\n.time-map__node:hover .time-map__photo,.time-map__node[aria-current=\"true\"] .time-map__photo{outline:2px solid #329ab6;box-shadow:0 4px 14px rgba(46,135,164,.17)}\n.time-map__node:focus-visible{outline:2px solid #16869a}\n.time-map__node[aria-current=\"true\"] .time-map__action{color:#137e97}\n.time-map__connections{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:0}\n.time-map__edge{fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;transition:opacity .18s}\n.time-map__hint{font-size:.75rem;line-height:1.6;color:#697b85;margin:0}\n.time-map__detail{padding:15px 18px;border:1px solid rgba(54,139,169,.12);border-radius:18px;background:linear-gradient(135deg,#edf8fb,#f7fafb);margin-top:14px;scroll-margin-top:80px}\n.time-map__detail summary{font-weight:700;font-size:.93rem;color:#42545f;cursor:pointer;line-height:1.5}\n.time-map__detail p{font-size:.875rem;color:#606c76;line-height:1.75;margin:9px 0 0;word-break:keep-all}\n.time-map--enhanced .time-map__detail{display:none}\n.time-map__reading{margin-top:14px;color:#60717c;font-size:.78rem;line-height:1.7;border-top:1px solid #e5ecef;padding-top:10px}\n.time-map__reading summary{cursor:pointer;min-height:28px;display:list-item}\n.time-map__reading ul{padding-left:20px;margin:8px 0 0}\n.time-map__reading li+li{margin-top:4px}\n@container(max-width:700px){\n .time-map__space{padding:14px;margin-top:16px}\n .time-map__portals{gap:8px}\n .time-map__portal{padding:8px 5px;min-height:66px}\n .time-map__portal>strong{font-size:.74rem}\n .time-map header h2{font-size:1.18rem;line-height:1.45}\n /* Leave a real routing corridor between the full, wrapped captions. */\n .time-map__canvas{--map-orientation:portrait;grid-template-columns:40px repeat(var(--lane-count),minmax(0,1fr));grid-template-rows:28px repeat(var(--era-count),minmax(148px,auto));gap:20px 20px;padding:0 12px 12px 0}\n .time-map__era{grid-row:var(--era);grid-column:1;text-align:left;font-size:.72rem}\n .time-map__lane{grid-column:var(--lane);grid-row:1;text-align:center;font-size:.8rem}\n .time-map__node{grid-column:var(--lane)/span var(--lane-span);grid-row:var(--era);max-width:190px;gap:8px}\n .time-map__photo{width:48px;height:48px;border-width:2px}\n .time-map__role{font-size:.76rem}\n .time-map__action{font-size:.84rem}\n .time-map__caption{gap:2px;line-height:1.4}\n .time-map__legend{gap:7px 12px;margin:16px 0 14px;font-size:.68rem}\n}\n@media(max-width:480px){.time-map{padding:20px 16px 16px;border-radius:24px}.time-map header p{font-size:.81rem;line-height:1.7}}\n@media print{.time-map--enhanced .time-map__detail{display:block}.time-map__reading{display:block}}\n\n/* Compact overview and original scene detail are two views of the same content. */\nhtml:has(.story-tree:not([data-linear=\"true\"])),html:has(.has-compact-tree) { scrollbar-gutter:stable; }\n.story-tree[data-linear=\"true\"]:not(.is-compact) { display:none; }\n.timeline.has-photo-reader::before { display:none; }\n.hero-tools .story-tree__mode { min-height:34px; padding:7px 12px; font-size:11px; }\n.story-tree__highlights { display:none; }\n.story-tree.is-compact .story-tree__highlights { display:block; position:relative; z-index:2; margin:8px auto 0; padding:7px 10px; min-height:32px; border:1px solid #ead7e0; border-radius:18px; background:var(--bg,#f5f6f7); color:#9b4367; font-family:inherit; font-size:10px; line-height:1.4; font-weight:700; cursor:pointer; }\n.story-tree__highlights:focus-visible,.story-detail__return:focus-visible { outline:3px solid #1766a0; outline-offset:3px; }\n.story-detail__return { display:block; margin-top:16px; padding:10px 14px; border:1px solid #c7dce5; border-radius:20px; background:#fff; color:#276c87; cursor:pointer; }\n.story-tree__mode { flex-shrink:0; background:#fff; color:#344858; border:1px solid #d5dfe5; border-radius:24px; padding:10px 15px; font-family:inherit; font-weight:700; font-size:12px; cursor:pointer; }\n.story-tree__canvas { position:relative; }\n.story-tree__thumb { display:none; }\n.story-tree__scene { display:contents; }\n.story-tree__scene[hidden] { display:none!important; }\n.story-tree__choices { position:absolute; top:calc(100% + 8px); right:0; background:#fff; color:#304453; border:1px solid #dce4e9; border-radius:15px; padding:16px; box-shadow:0 12px 32px #20344325; }\n.story-tree__choices[hidden] { display:none; }\n.story-tree__choices small { display:block; margin-bottom:9px; }\n.story-tree__choices button { padding:10px 16px; border:1px solid #d7e2e9; border-radius:20px; background:#f7fafc; color:#304453; cursor:pointer; margin:4px; }\n.story-tree .node { border-color:var(--route-color,#718391); }\n.story-tree__track { color:var(--route-color,#385e71); }\n.story-tree__edges path { stroke:var(--route-color,#718391); stroke-width:4; }\n.story-tree__edges path[data-relation=\"return\"] { stroke:#93628e; stroke-dasharray:8 6; stroke-width:3; }\n.story-detail__causal-return button { border-style:dashed; border-color:#b994b6; color:#754e71; }\n.story-tree.is-compact .story-tree__viewport { overflow-x:auto; padding:12px 0 32px; scrollbar-width:thin; overscroll-behavior-x:contain; }\n.story-tree.is-compact .story-tree__canvas { max-width:660px; margin-inline:auto; }\n.story-tree.is-compact .story-tree__node { padding:0; min-height:112px; }\n.story-tree.is-compact .story-tree__node > :is(.story-tree__meta,.story-tree__relations,.story-tree__scene) { display:none; }\n.story-tree.is-compact .story-tree__thumb { display:flex; flex-direction:column; align-items:center; width:100%; border:0; padding:0 4px; margin:0; cursor:pointer; background:none; color:#344858; font:inherit; position:relative; z-index:2; }\n.story-tree__picture { display:block; width:76px; height:76px; border:3px solid var(--route-color); border-radius:50%; padding:4px; background:var(--bg,#f5f6f7); box-shadow:0 4px 16px #29445612; position:relative; transition:box-shadow .2s,transform .2s; }\n.story-tree__picture img { display:block; width:100%; height:100%; border-radius:50%; object-fit:cover; }\n.story-tree__picture img[hidden], .story-tree__image-state[hidden], .story-tree__thumb-time[hidden], .story-tree__thumb-title[hidden] { display:none!important; }\n.story-tree__image-state { display:grid; place-items:center; position:absolute; inset:5px; padding:6px; border-radius:50%; background:#e2e9ed; color:#647a88; font-size:10px; line-height:1.45; }\n.story-tree__number { position:absolute; bottom:-7px; left:50%; transform:translateX(-50%); min-width:25px; padding:1px 6px; background:var(--route-color); color:white; border:2px solid var(--bg,#f5f6f7); border-radius:20px; font-size:10px; font-weight:850; line-height:18px; }\n.story-tree__thumb-label { font-size:11px; font-weight:800; color:var(--route-color); line-height:1.4; margin-top:14px; padding:2px 5px; background:var(--bg,#f5f6f7); border-radius:5px; min-height:19px; }\n.story-tree__thumb-label:empty { padding:0; }\n.story-tree__thumb-title { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; max-width:150px; padding:1px 4px; background:var(--bg,#f5f6f7); color:#344858; font-size:11px; font-weight:700; line-height:1.5; overflow-wrap:anywhere; }\n.story-tree__thumb-time { max-width:100%; margin-top:5px; padding:1px 4px; background:var(--bg,#f5f6f7); color:#617783; font-size:10px; line-height:1.5; overflow-wrap:anywhere; }\n.story-tree__thumb[aria-pressed=\"true\"] .story-tree__picture { box-shadow:0 0 0 5px color-mix(in srgb,var(--route-color),transparent 82%),0 8px 24px #1e425c20; }\n.story-tree__thumb:hover .story-tree__picture { transform:translateY(-2px); }\n.story-tree__hidden-mark { display:none; }\n.story-tree__thumb.is-covered img, .story-tree__thumb.is-covered .story-tree__thumb-label, .story-tree__thumb.is-covered .story-tree__thumb-title, .story-tree__thumb.is-covered .story-tree__thumb-time, .story-tree__thumb.is-covered .story-tree__image-state { visibility:hidden; }\n.story-tree__thumb.is-covered .story-tree__hidden-mark { display:grid; place-items:center; position:absolute; inset:4px; border-radius:50%; background:#dce5e9; color:#526a79; font-size:26px; }\n.has-compact-tree #scene-dock, .has-compact-tree .scene-nav { display:none!important; }\n.story-tree__thumb:focus-visible, .story-tree__mode:focus-visible, .story-detail button:focus-visible, .story-tree__choices button:focus-visible { outline:3px solid #1766a0; outline-offset:5px; }\nbody.story-detail-open { overflow:hidden; }\n.story-detail { width:min(640px,calc(100vw - 32px)); max-height:88dvh; padding:0; margin:auto; border:1px solid #dce4e9; border-radius:24px; background:var(--bg,#f5f6f7); color:#252e35; box-shadow:0 24px 90px #1834463b; overscroll-behavior:contain; }\n.story-detail::backdrop { background:#1d334754; backdrop-filter:blur(3px); }\n.story-detail__header { display:flex; justify-content:space-between; gap:12px; align-items:center; position:sticky; top:0; z-index:30; padding:16px 22px; background:var(--bg,#f5f6f7); border-bottom:1px solid #dce4e9; }\n.story-detail__context { min-width:0; font-size:12px; line-height:1.55; font-weight:850; color:var(--route-color); overflow-wrap:anywhere; }\n.story-detail__close { cursor:pointer; border:0; background:#e7ecef; border-radius:20px; padding:10px 14px; font-size:12px; font-weight:700; color:#344858; }\n.story-detail__body { padding:26px 28px 12px; }\n.story-detail__facts { margin:0 0 24px; color:#647886; font-size:12px; line-height:1.7; }\n.story-detail .item { display:flex!important; flex-direction:column; gap:25px; padding:0!important; }\n.story-detail .item > .node { display:none!important; }\n.story-detail .item > .visual { order:0; width:min(228px,65vw)!important; margin:0 auto!important; align-self:center; }\n.story-detail .item > .copy { order:1; width:100%; max-width:none!important; padding:0!important; text-align:left!important; }\n.story-detail .scene-title { font-size:25px!important; line-height:1.35; }\n.story-detail .scene-desc { font-size:15px!important; line-height:1.8; }\n.story-detail .num { font-size:32px; }\n.story-detail .caption { max-width:none; }\n.story-detail .event-actions { justify-content:flex-start; }\n.story-detail .quote { font-size:13px; }\n.story-detail .watch-moment { padding:24px 0!important; }\n.story-detail .watch-moment__marker { display:none; }\n.story-detail .streamer-picker__panel { max-width:min(280px,calc(100vw - 80px)); }\n.story-detail__nav { border-top:1px solid #dce4e9; margin:18px 28px 0; padding:18px 0 28px; display:grid; gap:16px; }\n.story-detail__routes { display:flex; gap:8px; flex-wrap:wrap; }\n.story-detail__routes small { flex-basis:100%; color:#71818c; font-size:11px; }\n.story-detail__routes button { cursor:pointer; border:1px solid #d3dfe5; border-radius:18px; background:white; color:#304858; padding:11px 14px; font-size:12px; line-height:1.4; text-align:left; }\n@media(max-width:900px) {\n  .story-tree__mode { font-size:11px; padding:9px 11px; }\n  .story-detail { width:100%; max-width:none; max-height:88dvh; margin:auto 0 0; border-radius:24px 24px 0 0; border-bottom:0; padding-bottom:env(safe-area-inset-bottom); }\n  .story-detail__body { padding:24px 24px 8px; }\n}\n@media(max-width:420px) {\n  .story-tree__picture { width:66px; height:66px; }\n  .story-tree__thumb-label { font-size:10px; }\n  .story-detail__header { padding:12px 18px; }\n  .story-detail .scene-title { font-size:23px!important; }\n}\n@media print {\n  .story-tree__highlights,.story-tree__mode,.story-detail__return { display:none!important; }\n  .story-tree__thumb,.story-detail { display:none!important; }\n  .story-tree.is-compact .story-tree__node > .story-tree__scene { display:contents; }\n  .story-tree.is-compact .story-tree__node > .story-tree__scene[hidden] { display:contents!important; }\n  .story-tree.is-compact .story-tree__canvas { min-width:0!important; }\n}\n"};
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

  /* END CANONICAL ELIO MAP */
  const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = value => {
    if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,159}$/.test(value)) throw new Error('Invalid Elio ID');
    return value;
  };
  const valueText = value => value === null || value === undefined || value === '' ? '미기록' : String(value);
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  function href(value) {
    if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f]/.test(value)) throw new Error('Unsafe Elio link');
    if (value.startsWith('#')) return '#' + safe(value.slice(1));
    const parsed = new URL(value);
    if (!['https:','http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Unsafe Elio link');
    return value;
  }
  function imageURL(value) {
    if (typeof value !== 'string' || !/^assets\/[A-Za-z0-9_.-]+\.(svg|png|webp|avif|jpe?g)$/i.test(value)) throw new Error('Unregistered Elio asset path');
    return value;
  }
  function figure(item) {
    const image = item.image || item.media?.src;
    return image ? '<figure><img src="'+e(imageURL(image))+'" alt="'+e(item.alt || item.media?.alt || '')+'" loading="lazy"><figcaption>'+e(item.label || item.title)+'</figcaption></figure>' : '';
  }
  function copy(item) {
    return '<h3>'+e(item.title)+'</h3>'+(item.label?'<p class="elio-label">'+e(item.label)+'</p>':'')
      +(item.body?'<p>'+e(item.body)+'</p>':'')+figure(item)
      +(item.action?'<a href="'+e(href(item.action.target || item.action.href))+'">'+e(item.action.label || '연결된 설명 읽기')+'</a>':'');
  }
  function validate(section) {
    const pattern = global.FW_CATALOG.patterns.find(row => row.id === section?.patternId);
    if (!pattern) throw new Error('Unsupported Elio expression: '+String(section?.patternId));
    for (const key of ['engine','variant','placement']) if (section[key] !== pattern[key]) throw new Error('Elio expression identity mismatch: '+key);
    safe(section.id);
    if (!Array.isArray(section.items) || section.items.length > 200) throw new Error('Elio items must contain at most 200 entries');
    const ids = new Set();
    section.items.forEach(item => { safe(item.id); if(ids.has(item.id)) throw new Error('Duplicate Elio item ID'); ids.add(item.id); });
    if (section.edges && (!Array.isArray(section.edges) || section.edges.length > 400)) throw new Error('Invalid Elio edges');
    (section.edges || []).forEach(edge => { if(!ids.has(edge.from)||!ids.has(edge.to)||edge.from===edge.to) throw new Error('Dangling Elio edge'); });
    if (section.order && (!Array.isArray(section.order) || new Set(section.order).size!==section.order.length || section.order.some(id=>!ids.has(id)))) throw new Error('Invalid Elio order');
    if (section.model || section.operation || section.inputs || section.distribution || section.uncertainty || section.axes || Object.hasOwn(section,'mode')) throw new Error('Unsupported Elio rich model; use an implemented expression without discarding these fields');
    return pattern;
  }
  function ordered(section) {
    if (!section.order) return section.items;
    const byID = new Map(section.items.map(item => [item.id,item]));
    return [...section.order.map(id=>byID.get(id)),...section.items.filter(item=>!section.order.includes(item.id))];
  }
  function list(items, tag = 'ul', extra = '') {
    return '<'+tag+' class="elio-items" '+extra+'>'+items.map(item=>'<li data-elio-item="'+e(item.id)+'">'+copy(item)+'</li>').join('')+'</'+tag+'>';
  }
  function table(caption, columns, rows) {
    return '<div class="elio-table" role="region" tabindex="0" aria-label="'+e(caption)+'"><table><caption>'+e(caption)+'</caption><thead><tr>'+columns.map(label=>'<th scope="col">'+e(label)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((value,index)=>'<'+(index?'td':'th scope="row"')+'>'+e(valueText(value))+'</'+(index?'td':'th')+'>').join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  function relationships(edges) {
    const amounts=edges.some(edge=>Object.hasOwn(edge,'value')||Object.hasOwn(edge,'amount'));
    return '<div data-elio-relations>'+table('명시된 연결과 조건',['출발 ID','도착 ID','관계','설명',...(amounts?['값','수량']:[])],edges.map(edge=>[edge.from,edge.to,edge.kind,edge.label,...(amounts?[edge.value,edge.amount]:[])]))+'</div>';
  }
  function contextFor(section,variant) {
    const labels=[['condition','조건'],['mechanism','작동 원리'],['changes','변경'],['progressionBasis','반복 근거'],
      ['source','출처'],['unit','단위'],['value','입력값'],['baseline','기준값'],['target','목표값'],
      ['timeBasis','시각의 기준'],['recurrence','반복 시각의 기준'],['xLabel','가로축 이름'],['yLabel','세로축 이름'],
      ['rowLabel','기록 이름'],['primaryLabel','첫 값 이름'],['secondaryLabel','다음 값 이름'],
      ['comparisonLabel','비교 이름'],['currentItemId','현재 항목 ID'],['heading','안내 제목']];
    const rows=labels.filter(([key])=>Object.hasOwn(section,key)).map(([key,label])=>[label,section[key]]);
    let output=rows.length?table('내용의 기준과 출처',['항목','작성한 내용'],rows):'';
    if(Object.hasOwn(section,'measure')) {
      if(!section.measure||typeof section.measure!=='object')throw new Error('Invalid Elio measure');
      const measureLabels=[['current','현재값'],['target','목표값'],['min','범위의 최소값'],['max','범위의 최대값'],['unit','단위'],['basis','측정 기준']];
      output+=table('작성한 측정 기준',['항목','입력값'],measureLabels.filter(([key])=>Object.hasOwn(section.measure,key)).map(([key,label])=>[label,section.measure[key]]));
    }
    if(section.timeDomain)output+=table('시각 해석의 기준',['항목','작성한 내용'],[['timezone','시간대'],['precision','정밀도'],['scaleMode','시각 척도']].filter(([key])=>Object.hasOwn(section.timeDomain,key)).map(([key,label])=>[label,section.timeDomain[key]]));
    if(section.columnLabels?.length)output+=table('작성한 구획 이름',['순서','구획 이름'],section.columnLabels.map((label,index)=>[index+1,label]));
    if(section.groups?.length)output+=table('범위와 분류의 정의',['ID','이름','설명','상위 범위'],section.groups.map(group=>[group.id,group.title||group.label,group.body,group.parentId]));
    if(section.edges?.length&&!['branch','graph','interactive-graph','cycle'].includes(variant))output+=relationships(section.edges);
    if(section.outcome&&variant!=='assembly')output+='<aside class="elio-authored-outcome"><h3>'+e(section.outcome.title||'작성한 결과')+'</h3><p>'+e(valueText(section.outcome.body))+'</p></aside>';
    if(section.statusDefinitions?.length)output+=table('작성한 상태의 범례',['ID','상태 이름'],section.statusDefinitions.map(status=>[status.id,status.label]));
    if(section.dataset?.source)output+='<p>자료 표의 출처: '+e(section.dataset.source)+'</p>';
    return output;
  }
  function graph(section, interactive = false, cycle = false) { return originalMap(section,interactive,cycle); }
  function classification(section) {
    const groups=section.groups || [], known=new Set(groups.map(group=>group.id));
    const groupIDs=item=>Array.isArray(item.group)?item.group:[item.group];
    const grouped=groups.map(group=>'<details open><summary>'+e(group.title)+'</summary>'+list(section.items.filter(item=>groupIDs(item).includes(group.id)))+'</details>').join('');
    const unassigned=section.items.filter(item=>!groupIDs(item).some(id=>known.has(id)));
    return grouped+(unassigned.length?'<details open><summary>미분류</summary>'+list(unassigned)+'</details>':'');
  }
  function hierarchy(section) {
    if(section.variant==='shared-membership') return table('명시된 소속',['범위','항목','소속 유형'],(section.containment||[]).map(row=>[row.containerId,row.memberId,row.membershipType]))+list(section.items);
    const relations=section.containment || section.items.filter(item=>item.parentId).map(item=>({containerId:item.parentId,memberId:item.id}));
    const byID=new Map(section.items.map(item=>[item.id,item])), parent=new Map();
    relations.forEach(row=>{if(!byID.has(row.containerId)||!byID.has(row.memberId)||parent.has(row.memberId))throw new Error('Invalid Elio hierarchy');parent.set(row.memberId,row.containerId);});
    function render(item,trail) {
      if(trail.has(item.id))throw new Error('Elio hierarchy contains a cycle');
      const next=new Set(trail);next.add(item.id);
      const children=section.items.filter(child=>parent.get(child.id)===item.id);
      return '<li>'+copy(item)+(children.length?'<ul>'+children.map(child=>render(child,next)).join('')+'</ul>':'')+'</li>';
    }
    for(const item of section.items){let current=item.id;const seen=new Set();while(parent.has(current)){if(seen.has(current))throw new Error('Elio hierarchy contains a cycle');seen.add(current);current=parent.get(current);}}
    return '<ul class="elio-hierarchy">'+section.items.filter(item=>!parent.has(item.id)).map(item=>render(item,new Set())).join('')+'</ul>';
  }
  function comparison(section) {
    const subjects=section.subjects||section.items,criteria=section.criteria||[{id:'value',key:'value',label:'값'}];
    const observations=section.observations||[],explicitObservations=Object.hasOwn(section,'observations');
    return table(section.criterionLabel||'같은 기준의 비교',['대상',...criteria.map(c=>c.label||c.title||c.id)],subjects.map(item=>[item.title,...criteria.map(c=>{const observation=observations.find(row=>row.subjectId===item.id&&row.criterionId===c.id);return observation?observation.value:explicitObservations?null:item[c.key||c.id];})]))
      +(section.sharedConditions?.length?'<p>공통 조건: '+e(section.sharedConditions.join(' / '))+'</p>':'')+list(subjects);
  }
  function data(section) {
    const rows=section.dataset?.rows||section.items,key=section.measureKey||'value';
    const values=rows.map(item=>item[key]),numbers=values.filter(finite),min=Math.min(0,...numbers),max=Math.max(0,...numbers),magnitude=Math.max(Math.abs(min),Math.abs(max),1),span=max/magnitude-min/magnitude||1;
    const x=value=>40+(value/magnitude-min/magnitude)*500/span,zero=x(0),height=rows.length*42+35;
    const bars='<svg class="elio-data" viewBox="0 0 600 '+height+'" aria-hidden="true"><line x1="'+zero+'" y1="0" x2="'+zero+'" y2="'+height+'"/>'+rows.map((item,index)=>finite(item[key])?'<rect x="'+Math.min(zero,x(item[key]))+'" y="'+(index*42+10)+'" width="'+Math.abs(x(item[key])-zero)+'" height="24"/><text x="550" y="'+(index*42+28)+'">'+e(item[key])+'</text>':'').join('')+'</svg>';
    const measures=section.dataset?.measures?.length?section.dataset.measures:[{key,label:key,unit:section.unit||''}];
    return bars+table(section.dataTitle||'원래 입력값',['기록',...measures.map(measure=>measure.label+(measure.unit?' ('+measure.unit+')':''))],rows.map(item=>[item.title||item.id,...measures.map(measure=>item[measure.key])]));
  }
  function spatial(section) {
    section.items.forEach(item=>{if(!finite(item.x)||!finite(item.y))throw new Error('Spatial expressions require explicit finite x/y coordinates');});
    const xs=section.items.map(item=>item.x),ys=section.items.map(item=>item.y),minX=Math.min(0,...xs),maxX=Math.max(1,...xs),minY=Math.min(0,...ys),maxY=Math.max(1,...ys);
    return '<p>좌표는 입력값입니다. 화면상 배치는 범위에 맞춰 투영합니다.</p><svg class="elio-spatial" viewBox="0 0 600 360" aria-hidden="true">'+section.items.map((item,index)=>'<g><circle cx="'+(40+520*(item.x-minX)/(maxX-minX))+'" cy="'+(320-280*(item.y-minY)/(maxY-minY))+'" r="16"/><text x="'+(40+520*(item.x-minX)/(maxX-minX))+'" y="'+(325-280*(item.y-minY)/(maxY-minY))+'" text-anchor="middle">'+(index+1)+'</text></g>').join('')+'</svg>'+table('입력 좌표',['항목','X','Y'],section.items.map(item=>[item.title,item.x,item.y]));
  }
  function annotation(section) {
    section.items.forEach(item=>{if(!finite(item.x)||!finite(item.y)||item.x<0||item.x>100||item.y<0||item.y>100)throw new Error('Annotations require explicit image-relative x/y percentages');});
    const images=new Set(section.items.map(item=>item.image||item.media?.src).filter(Boolean));
    if(images.size>1)throw new Error('Annotations support one shared image per expression; use separate expressions for distinct images');
    const image=section.items.find(item=>item.image||item.media?.src);
    const drawing=image?'<figure><div class="elio-annotated"><img src="'+e(imageURL(image.image||image.media.src))+'" alt="'+e(image.alt||image.media?.alt||'')+'"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+section.items.map((item,index)=>'<g><circle cx="'+item.x+'" cy="'+item.y+'" r="3"/><text x="'+item.x+'" y="'+(item.y+1)+'" text-anchor="middle">'+(index+1)+'</text></g>').join('')+'</svg></div><figcaption>'+e(image.label||image.title)+'</figcaption></figure>':'<p>주석의 대상 이미지는 아직 등록되지 않았습니다. 아래 좌표와 설명은 편집 입력입니다.</p>';
    return drawing+table('그림의 부분과 설명',['번호','항목','X(%)','Y(%)','설명'],section.items.map((item,index)=>[index+1,item.title,item.x,item.y,item.body]));
  }
  function renderSection(section) {
    const pattern=validate(section),items=ordered(section);section={...section,items};let body;
    switch(pattern.variant) {
      case 'sequence': body=list(items,'ol');break;
      case 'branch': case 'graph': body=graph(section);break;
      case 'interactive-graph': body=graph(section,true);break;
      case 'cycle': body=graph(section,false,true)+table('명시한 반복 경로',['반복','항목 순서'],(section.cycles||[]).map(cycle=>[cycle.title,cycle.items.join(' → ')]));break;
      case 'assembly': body='<div class="elio-assembly"><div>'+list(items)+'</div><div class="elio-result"><h3>'+e(section.outcome?.title||'결과 미기록')+'</h3><p>'+e(section.outcome?.body||'')+'</p></div></div>';break;
      case 'hierarchy': case 'shared-membership': body=hierarchy(section);break;
      case 'timeline': body=classification(section)+'<p>'+e(section.timeBasis||'원본 시각의 기준을 입력하세요.')+'</p>'+table('원본별 시각',['항목','원본','시각','시작','끝'],items.map(item=>[item.title,item.group,item.date,item.start,item.end]));break;
      case 'classification': body=classification(section);break;
      case 'comparison': body=comparison(section);break;
      case 'data': body=data(section);break;
      case 'spatial': body=spatial(section);break;
      case 'status': body=table('항목과 상태',['항목','상태','명시한 값'],items.map(item=>[item.title,(section.statusDefinitions||[]).find(row=>row.id===item.status)?.label||item.status||'미기록',item.value]))+list(items);break;
      case 'layout': body='<div class="elio-editorial">'+items.map((item,index)=>'<article class="'+(index?'elio-support':'elio-primary')+'">'+copy(item)+'</article>').join('')+'</div>';break;
      case 'images': body=list(items,'ol','data-elio-storyboard');break;
      case 'annotation': body=annotation(section);break;
      case 'argument': body=list(items,'ol','data-elio-argument');break;
      case 'disclosure': body=items.map(item=>'<details><summary>'+e(item.title)+'</summary><div>'+copy(item)+'</div></details>').join('');break;
      default: throw new Error('Unimplemented Elio expression: '+pattern.variant);
    }
    const context=contextFor(section,pattern.variant);
    const nativeMap=['branch','graph','interactive-graph','cycle'].includes(pattern.variant);
    return '<section class="elio-expression'+(nativeMap?' elio-native-map':'')+'" id="'+e(safe(section.id))+'" data-elio-expression="'+e(pattern.id)+'" data-elio-family="'+pattern.familyId+'">'+(nativeMap?'':'<header><p class="elio-label">'+e(section.eyebrow||'Elio')+'</p><h2>'+e(section.title)+'</h2><p>'+e(section.lead)+'</p></header>')+body+(nativeMap&&context?'<details class="elio-map-records"><summary>작성한 자료의 기준</summary>'+context+'</details>':context)+(section.note?'<footer>'+e(section.note)+'</footer>':'')+'</section>';
  }
  function mount(root) {
    const listeners=[];
    const disposeMap=globalThis.ElioTimeMap?.mount(root,{restoreHash:root.dataset?.editable!=='true'});
    for(const section of root.querySelectorAll('[data-elio-expression="linked-selection"]')) {
      const buttons=[...section.querySelectorAll('[data-elio-pick]')],nodes=[...section.querySelectorAll('[data-elio-node]')],rows=[...section.querySelectorAll('[data-elio-relations] tbody tr')],output=section.querySelector('output');
      for(const button of buttons) {
        const callback=()=>{const id=button.dataset.elioPick,selected=button.getAttribute('aria-pressed')!=='true',related=new Set([id]);
          for(const row of rows){const cells=row.querySelectorAll('td,th');if(cells[0]?.textContent===id||cells[1]?.textContent===id){related.add(cells[0].textContent);related.add(cells[1].textContent);}}
          buttons.forEach(node=>node.setAttribute('aria-pressed',String(selected&&node===button)));
          nodes.forEach(node=>{node.dataset.elioRelated=String(selected&&related.has(node.dataset.elioNode));});
          if(output)output.textContent=selected?button.textContent+' · 직접 연결된 항목 '+(related.size-1)+'개':'전체 관계를 표시합니다.';
        };
        button.addEventListener('click',callback);listeners.push(()=>button.removeEventListener('click',callback));
      }
    }
    return ()=>{listeners.forEach(dispose=>dispose());disposeMap?.();};
  }
  const styles = `
    .elio-expression{color:var(--cva-text,#182635);background:var(--cva-surface,#fff);padding:clamp(1rem,3vw,3rem);margin:1.5rem 0;border:1px solid var(--cva-border,#bcc8cb);border-radius:1rem;line-height:1.7;overflow-wrap:anywhere}
    .elio-expression h2{font-size:clamp(1.7rem,3vw,2.6rem);line-height:1.2}.elio-expression h3{font-size:1.1rem;margin:0}.elio-label,.elio-expression footer{color:var(--cva-muted,#405763)}
    .elio-items{display:grid;gap:1rem;padding-inline-start:1.6rem}.elio-items li{padding:.6rem}.elio-items p{margin:.3rem 0}.elio-node-list{grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))}
    .elio-expression figure{margin:.8rem 0}.elio-expression img{display:block;max-width:100%;height:auto}.elio-expression details{border-block-end:1px solid var(--cva-border,#bcc8cb);padding:.8rem 0}.elio-expression summary{cursor:pointer;font-weight:650}
    .elio-expression button,.elio-expression a{font:inherit;color:inherit}.elio-expression button{background:transparent;border:1px solid currentColor;border-radius:.4rem;padding:.4rem .7rem;cursor:pointer}.elio-expression button[aria-pressed=true]{background:var(--cva-text,#182635);color:var(--cva-surface,#fff)}
    .elio-expression :focus-visible{outline:3px solid var(--cva-focus,#815217);outline-offset:3px}.elio-table{overflow-x:auto;margin:1rem 0}.elio-table table{border-collapse:collapse;width:100%;text-align:start}.elio-table caption{text-align:start;font-weight:700}.elio-table th,.elio-table td{padding:.6rem;border:1px solid var(--cva-border,#bcc8cb);vertical-align:top}
    .elio-graph,.elio-data,.elio-spatial{display:block;width:100%;max-height:32rem;background:var(--cva-bg,#f5f4ed)}.elio-expression svg line{stroke:currentColor;stroke-width:2}.elio-expression svg circle,.elio-expression svg rect{fill:var(--cva-accent,#87b9a3);stroke:currentColor}.elio-expression svg path{fill:currentColor}.elio-expression svg text{fill:var(--cva-text,#182635);font:16px sans-serif}
    .elio-hierarchy ul{border-inline-start:2px solid var(--cva-border,#bcc8cb);margin:.8rem}.elio-hierarchy li{padding:.6rem}.elio-assembly,.elio-editorial{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:1.5rem}.elio-result{border-inline-start:3px solid var(--cva-accent,#87b9a3);padding:1rem}.elio-primary{grid-column:1/-1}.elio-primary h3{font-size:2rem}.elio-live{display:block;padding:1rem;border-block-start:1px solid currentColor}[data-elio-related=true]{outline:2px solid var(--cva-focus,#815217);outline-offset:2px}
    .elio-annotated{position:relative}.elio-annotated figure{margin:0}.elio-annotated figcaption{position:relative}.elio-annotated svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.elio-annotated svg text{font-size:3px}
    @media(prefers-reduced-motion:reduce){.elio-expression *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
  `;
  global.FormaWeb={escape:e,safe,renderSection,renderPage:page=>(page.sections||[]).map(renderSection).join('')};
  global.FW_INIT=mount;
  const mapStyles=canonicalMap.css+'\n.elio-expression.elio-native-map{padding:0;border:0;background:transparent}.elio-map-basis{font-size:.8rem;color:#697b85}.elio-map-records{margin-block:18px;font-size:.85rem}.elio-map-records summary{cursor:pointer}'+'\n.elio-expression .time-map__connections path{fill:none}.elio-map-token{display:grid;place-items:center;inline-size:100%;block-size:100%;font-weight:800;color:#34434f}.elio-expression .time-map__detail{white-space:pre-line}';
  Object.assign(global.ELIO_OWNED_RUNTIME,{styles:styles+'\n'+mapStyles,mountSource:canonicalMap.runtime+'\n('+mount.toString()+')(document);',renderSection});
  /* BEGIN CANONICAL ELIO MAP RUNTIME */
/* Measured diagram geometry only: story order, dates and relations stay in their owners. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.elioDiagramGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const EPS=.001,SPACING=8;
  const clone=value=>JSON.parse(JSON.stringify(value||{}));
  const edgeId=(from,to)=>`${from}->${to}`;
  const mode=(layout,mobile)=>layout?.[mobile?'mobile':'desktop']||{};
  const finitePoint=point=>Array.isArray(point)&&point.length===2&&point.every(Number.isFinite);
  const compact=points=>points.filter((point,index,all)=>!index||point[0]!==all[index-1][0]||point[1]!==all[index-1][1])
    .filter((point,index,all)=>{
      if(!index||index===all.length-1)return true;
      const a=all[index-1],b=all[index+1];
      return !((a[0]===point[0]&&point[0]===b[0]&&point[1]>=Math.min(a[1],b[1])&&point[1]<=Math.max(a[1],b[1]))||(a[1]===point[1]&&point[1]===b[1]&&point[0]>=Math.min(a[0],b[0])&&point[0]<=Math.max(a[0],b[0])));
    });
  const overlaps=(a,b,gap=0)=>a.left<b.left+b.width+gap&&a.left+a.width+gap>b.left&&a.top<b.top+b.height+gap&&a.top+a.height+gap>b.top;
  function resolveOffsets(nodes,overrides,width,{reserved=[],orderPairs=[],minY=0,orderAxis='y'}={}){
    const warnings=[],base=new Map(nodes.map(node=>[node.id,node.box])),moved=new Set(),boxes=new Map();
    nodes.forEach(node=>{
      const offset=overrides?.[node.id];
      let dx=Number.isFinite(offset?.x)?offset.x*width:0,dy=Number.isFinite(offset?.y)?offset.y:0;
      dx=Math.max(-node.box.left,Math.min(width-node.box.left-node.box.width,dx));
      dy=Math.max(minY-node.box.top,dy);
      boxes.set(node.id,{...node.box,left:node.box.left+dx,top:node.box.top+dy});
      if(dx||dy)moved.add(node.id);
    });
    // Reverting an invalid move can expose a second collision. At most one
    // moved node is removed each pass, so this loop is bounded by node count.
    for(let pass=0;pass<=nodes.length;pass++){
      const invalid=new Set();
      nodes.forEach((node,index)=>{
        const box=boxes.get(node.id);
        if(moved.has(node.id)&&reserved.some(other=>overlaps(box,other,4)))invalid.add(node.id);
        for(const other of nodes.slice(index+1)){
          if(!overlaps(box,boxes.get(other.id),4))continue;
          if(moved.has(node.id))invalid.add(node.id);
          if(moved.has(other.id))invalid.add(other.id);
        }
      });
      orderPairs.forEach(([from,to])=>{
        const a=boxes.get(from),b=boxes.get(to);
        if(!a||!b||(orderAxis==='x'?a.left+a.width<=b.left+EPS:a.top+a.height<=b.top+EPS))return;
        if(moved.has(from))invalid.add(from);
        if(moved.has(to))invalid.add(to);
      });
      if(!invalid.size)break;
      invalid.forEach(id=>{boxes.set(id,{...base.get(id)});moved.delete(id);warnings.push(`Node ${id}: move overlaps a scene or reading boundary.`);});
    }
    return {offsets:Object.fromEntries(nodes.map(node=>{const box=boxes.get(node.id);return [node.id,{x:box.left-node.box.left,y:box.top-node.box.top}];})),warnings};
  }
  function edgeOverride(layout,mobile,from,to){return mode(layout,mobile).edges?.[edgeId(from,to)]||{};}
  // The browser import boundary uses the same display-only fields and bounds
  // as diagram_layout.py. Neither receiver normalizes or changes the meaning.
  function validateLayout(value,nodeIds,edges){
    const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
    const fields=(value,allowed,message)=>{if(!object(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw new Error(message);};
    const number=(value,low,high)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<low||value>high)throw new Error('Diagram layout coordinate must be finite and within bounds');};
    const ports=new Set(['left','right','top','bottom']),knownEdges=new Set(edges.map(edge=>edgeId(edge.from,edge.to)));
    fields(value,['desktop','mobile'],'Diagram layout needs only desktop and mobile modes');
    for(const part of Object.values(value)){
      fields(part,['nodes','edges'],'Diagram layout mode needs nodes or edges');
      const nodes=Object.hasOwn(part,'nodes')?part.nodes:{},routes=Object.hasOwn(part,'edges')?part.edges:{};
      if(!object(nodes)||Object.keys(nodes).some(id=>!nodeIds.has(id)))throw new Error('Diagram layout references an unknown node');
      for(const point of Object.values(nodes)){fields(point,['x','y'],'Diagram layout node needs x and y offsets');if(Object.keys(point).length!==2)throw new Error('Diagram layout node needs x and y offsets');number(point.x,-1,1);number(point.y,-5000,5000);}
      if(!object(routes)||Object.keys(routes).some(id=>!knownEdges.has(id)))throw new Error('Diagram layout references an unknown edge');
      for(const route of Object.values(routes)){
        fields(route,['via','source_port','target_port'],'Diagram layout edge fields are invalid');
        if(!Array.isArray(route.via)||route.via.length>8)throw new Error('Diagram layout edge has too many waypoints');
        for(const point of route.via){fields(point,['x','y'],'Diagram layout waypoint needs x and y');if(Object.keys(point).length!==2)throw new Error('Diagram layout waypoint needs x and y');number(point.x,0,1);number(point.y,-100000,100000);}
        for(const name of ['source_port','target_port'])if(name in route&&!ports.has(route[name]))throw new Error('Diagram layout port is invalid');
      }
    }
    return value;
  }
  function availablePort(port,side,reserved,min,max){
    const axis=['top','bottom'].includes(side)?0:1,center=port.tip[axis];
    const candidates=[center,min,max,...reserved.flatMap(value=>[value-10,value+10])]
      .filter(value=>value>=min-EPS&&value<=max+EPS&&reserved.every(other=>Math.abs(value-other)>=10-EPS))
      .sort((a,b)=>Math.abs(a-center)-Math.abs(b-center)||a-b);
    if(!candidates.length)return null;
    const delta=candidates[0]-center,tip=[...port.tip],gate=[...port.gate];tip[axis]+=delta;gate[axis]+=delta;
    return {...port,tip,gate};
  }
  function terminalPort(port,side,lead=24,{obstacles=[],width=Infinity,height=Infinity}={}){
    const axis=['top','bottom'].includes(side)?1:0,sign=['left','top'].includes(side)?-1:1;
    const gate=[...port.gate],limit=port.tip[axis]+sign*lead;
    gate[axis]=sign<0?Math.min(gate[axis],limit):Math.max(gate[axis],limit);
    // Tight compact-card gaps cannot contain two full leads. Keep the existing
    // layout and shorten only to the next real obstacle or canvas boundary.
    let space=sign<0?port.tip[axis]-2:(axis?height:width)-2-port.tip[axis];
    obstacles.forEach(box=>{
      const near=axis?box.top:box.left,far=near+(axis?box.height:box.width),cross=port.tip[1-axis],low=axis?box.left:box.top,high=low+(axis?box.width:box.height);
      if(cross<=low-4||cross>=high+4)return;
      const distance=sign<0?port.tip[axis]-far-5:near-port.tip[axis]-5;
      if(distance>=0)space=Math.min(space,distance);
    });
    gate[axis]=port.tip[axis]+sign*Math.min(Math.abs(gate[axis]-port.tip[axis]),Math.max(0,space));
    return {...port,tip:[...port.tip],gate};
  }
  function adaptTerminalPair(start,end,obstacles=[],minimumLead=9){
    const unchanged={start,end},opposite={left:'right',right:'left',top:'bottom',bottom:'top'};
    if(opposite[start.side]!==end.side||![start.tip,start.gate,end.tip,end.gate].every(finitePoint))return unchanged;
    const axis=['top','bottom'].includes(start.side)?1:0,sign=['left','top'].includes(start.side)?-1:1;
    const gap=(end.tip[axis]-start.tip[axis])*sign,a=(start.gate[axis]-start.tip[axis])*sign,b=(end.tip[axis]-end.gate[axis])*sign;
    if(gap<=0||a<0||b<0||a+b<=gap+EPS)return unchanged;
    const required=(port,length,direction)=>{
      let lead=Math.min(minimumLead,length);
      obstacles.forEach(box=>{
        const cross=port.tip[1-axis],low=(axis?box.left:box.top)-4,high=low+(axis?box.width:box.height)+8;
        if(cross<=low+EPS||cross>=high-EPS)return;
        const near=(axis?box.top:box.left)-4,far=near+(axis?box.height:box.width)+8;
        const first=(near-port.tip[axis])*direction,last=(far-port.tip[axis])*direction,enter=Math.min(first,last),exit=Math.max(first,last);
        if(exit>lead&&enter<length-EPS)lead=Math.max(lead,exit);
      });
      return lead;
    };
    const minA=required(start,a,sign),minB=required(end,b,-sign);
    if(minA>a+EPS||minB>b+EPS||minA+minB>gap+EPS)return unchanged;
    const capacity=a-minA+b-minB,share=capacity?Math.max(0,gap-minA-minB)*(a-minA)/capacity:0;
    const meeting=start.tip[axis]+sign*(minA+share),startGate=[...start.gate],endGate=[...end.gate];
    // One identical coordinate avoids subpixel gate reversals after x/width
    // serialization. Never move a tip or shrink a gate into a hard caption.
    startGate[axis]=meeting;endGate[axis]=meeting;
    return {start:{...start,gate:startGate},end:{...end,gate:endGate}};
  }
  function waypoints(value,width,sourceAnchor){
    if(!Array.isArray(value))return [];
    return value.map(point=>[point.x*width,sourceAnchor.y+point.y]);
  }
  function segmentCost(a,b,occupied){
    let penalty=0;
    const horizontal=a[1]===b[1];
    occupied.forEach(([c,d])=>{
      const otherHorizontal=c[1]===d[1];
      if(horizontal===otherHorizontal){
        if(Math.abs((horizontal?a[1]:a[0])-(horizontal?c[1]:c[0]))>EPS)return;
        const axis=horizontal?0:1;
        const length=Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis]))-Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis]));
        if(length>EPS)penalty+=length*4;
      }else{
        const h=horizontal?[a,b]:[c,d],v=horizontal?[c,d]:[a,b],x=v[0][0],y=h[0][1];
        if(x<Math.min(h[0][0],h[1][0])-EPS||x>Math.max(h[0][0],h[1][0])+EPS||y<Math.min(v[0][1],v[1][1])-EPS||y>Math.max(v[0][1],v[1][1])+EPS)return;
        const t=horizontal?(x-a[0])/(b[0]-a[0]):(y-a[1])/(b[1]-a[1]);
        const u=otherHorizontal?(x-c[0])/(d[0]-c[0]):(y-c[1])/(d[1]-c[1]);
        // Each directed segment owns its end, not its start. A crossing at a
        // visibility-grid vertex is then charged once, even if either line
        // has been split there; overlap is likewise purely additive by length.
        if(t>1e-9&&t<=1+1e-9&&u>1e-9&&u<=1+1e-9)penalty+=60;
      }
    });
    return penalty;
  }
  function corridorCost(a,b,rects){
    const vertical=a[0]===b[0],coordinate=vertical?a[0]:a[1],low=Math.min(vertical?a[1]:a[0],vertical?b[1]:b[0]),high=Math.max(vertical?a[1]:a[0],vertical?b[1]:b[0]);
    let before=-Infinity,after=Infinity;
    rects.forEach(r=>{
      if(Math.min(high,vertical?r.bottom:r.right)<=Math.max(low,vertical?r.top:r.left))return;
      const left=vertical?r.right:r.bottom,right=vertical?r.left:r.top;
      if(left<=coordinate)before=Math.max(before,left);
      if(right>=coordinate)after=Math.min(after,right);
    });
    if(!Number.isFinite(before)||!Number.isFinite(after)||after-before<EPS)return 0;
    return (high-low)*.03*Math.min(1,Math.abs(coordinate-(before+after)/2)/((after-before)/2));
  }
  function straightRoute(start,end,obstacles=[]){
    if(start[0]!==end[0]&&start[1]!==end[1])return null;
    const vertical=start[0]===end[0];
    const blocked=obstacles.some(b=>vertical
      ?start[0]>b.left-4&&start[0]<b.left+b.width+4&&Math.max(start[1],end[1])>b.top-4&&Math.min(start[1],end[1])<b.top+b.height+4
      :start[1]>b.top-4&&start[1]<b.top+b.height+4&&Math.max(start[0],end[0])>b.left-4&&Math.min(start[0],end[0])<b.left+b.width+4);
    return blocked?null:[start,end];
  }
  function simplifyAuto(points,obstacles=[]){
    let path=compact(points);
    // Gate rectangles can overlap by a few pixels although the circular
    // terminals do not. Do not draw a tiny reversal just to visit both gates.
    while(path.length>2&&straightRoute(path[0],path[2],obstacles))path=compact([path[0],...path.slice(2)]);
    while(path.length>2&&straightRoute(path.at(-3),path.at(-1),obstacles))path=compact([...path.slice(0,-2),path.at(-1)]);
    return path;
  }
  function pathCost(points,occupied=[],obstacles=[]){
    const path=compact(points),rects=obstacles.map(b=>({left:b.left-4,right:b.left+b.width+4,top:b.top-4,bottom:b.top+b.height+4}));
    return segments(path).reduce((cost,[a,b],index)=>cost+Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+(index?12:0)+segmentCost(a,b,occupied)+corridorCost(a,b,rects),0);
  }
  function routeOrthogonal({start,end,via=[],obstacles=[],width,height,occupied=[],startTip,endTip,preferStraightStops=false}){
    if(![start,end,...via].every(finitePoint)||![width,height].every(n=>Number.isFinite(n)&&n>0))return null;
    const rects=obstacles.map(box=>({left:box.left-4,right:box.left+box.width+4,top:box.top-4,bottom:box.top+box.height+4}));
    // The searched body starts/ends at the gates. Keep the already composed
    // tip-to-gate leads clear even after a tiny sideways step from a gate.
    // Gate boundaries remain usable; authoritative waypoints are not moved.
    for(const [tip,gate] of [[startTip,start],[endTip,end]]){
      if(!finitePoint(tip)||tip[0]===gate[0]&&tip[1]===gate[1])continue;
      if(tip[0]===gate[0])rects.push({left:tip[0]-10,right:tip[0]+10,top:Math.min(tip[1],gate[1]),bottom:Math.max(tip[1],gate[1])});
      else if(tip[1]===gate[1])rects.push({left:Math.min(tip[0],gate[0]),right:Math.max(tip[0],gate[0]),top:tip[1]-10,bottom:tip[1]+10});
    }
    const blocked=([x,y])=>x<0||x>width||y<0||y>height||rects.some(r=>x>r.left+EPS&&x<r.right-EPS&&y>r.top+EPS&&y<r.bottom-EPS);
    if([start,end,...via].some(blocked))return null;
    const clear=(a,b)=>!rects.some(r=>a[0]===b[0]
      ?a[0]>r.left+EPS&&a[0]<r.right-EPS&&Math.max(a[1],b[1])>r.top+EPS&&Math.min(a[1],b[1])<r.bottom-EPS
      :a[1]>r.top+EPS&&a[1]<r.bottom-EPS&&Math.max(a[0],b[0])>r.left+EPS&&Math.min(a[0],b[0])<r.right-EPS);
    const stops=[start,...via,end];
    if(stops.slice(1).every((point,index)=>{
      const previous=stops[index];
      return (previous[0]===point[0]||previous[1]===point[1])&&clear(previous,point)&&(preferStraightStops||segmentCost(previous,point,occupied)===0&&corridorCost(previous,point,rects)===0);
    }))return compact(stops);
    const xs=new Set([2,width-2,start[0],end[0]]),ys=new Set([2,height-2,start[1],end[1]]);
    rects.forEach(r=>{xs.add(r.left-5);xs.add(r.right+5);ys.add(r.top-5);ys.add(r.bottom+5);});
    // A corridor is bounded by both captions, not by one caption's edge.
    // These middle lines remain valid when fonts wrap or the grid transposes.
    for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
      const a=rects[i],b=rects[j];
      if(Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)){
        if(a.right<b.left)xs.add((a.right+b.left)/2);else if(b.right<a.left)xs.add((b.right+a.left)/2);
      }
      if(Math.min(a.right,b.right)>Math.max(a.left,b.left)){
        if(a.bottom<b.top)ys.add((a.bottom+b.top)/2);else if(b.bottom<a.top)ys.add((b.bottom+a.top)/2);
      }
    }
    via.forEach(([x,y])=>{xs.add(x);ys.add(y);});
    // Distinct nearby corridors let a later connector avoid sharing a long
    // segment. Cap the graph rather than multiplying work with every edge.
    if((xs.size+occupied.length*4)*(ys.size+occupied.length*4)<=18000)occupied.forEach(([a,b])=>{
      for(const point of [a,b]){xs.add(point[0]-SPACING);xs.add(point[0]+SPACING);ys.add(point[1]-SPACING);ys.add(point[1]+SPACING);}
    });
    const X=[...xs].filter(x=>x>=0&&x<=width).sort((a,b)=>a-b),Y=[...ys].filter(y=>y>=0&&y<=height).sort((a,b)=>a-b);
    const oversized=X.length*Y.length>24000;
    const point=index=>[X[index%X.length],Y[Math.floor(index/X.length)]];
    function between(first,last){
      // Manually placed stops own a clear straight segment. Other wires are
      // a soft routing cost; captions and terminal collars remain hard bounds.
      if(preferStraightStops&&(first[0]===last[0]||first[1]===last[1])&&clear(first,last))return [first,last];
      if(oversized){
        // Large story boards can exceed the visibility-grid budget despite
        // having clear nearby corridors. Keep that budget and the same hard
        // caption/terminal tests; try a bounded set of existing corridor lines.
        const excess=(value,a,b)=>Math.abs(value-a)+Math.abs(value-b)-Math.abs(a-b);
        const xs=[...new Set([first[0],last[0],2,width-2,...rects.flatMap(r=>[r.left-5,r.right+5])])].filter(value=>value>=0&&value<=width).sort((a,b)=>excess(a,first[0],last[0])-excess(b,first[0],last[0])||Math.abs(a-first[0])-Math.abs(b-first[0])).slice(0,16);
        const ys=[...new Set([first[1],last[1],2,height-2,...rects.flatMap(r=>[r.top-5,r.bottom+5])])].filter(value=>value>=0&&value<=height).sort((a,b)=>excess(a,first[1],last[1])-excess(b,first[1],last[1])||Math.abs(a-first[1])-Math.abs(b-first[1])).slice(0,16);
        const candidates=[[first,[last[0],first[1]],last],[first,[first[0],last[1]],last]];
        xs.forEach(x=>candidates.push([first,[x,first[1]],[x,last[1]],last]));
        ys.forEach(y=>candidates.push([first,[first[0],y],[last[0],y],last]));
        // Keep the two outer clear rails even when many closer candidates
        // occupy the bounded local list. They remain a last-resort candidate
        // under the same distance, bend, crossing and overlap cost.
        for(const x of [2,width-2])candidates.push([first,[x,first[1]],[x,last[1]],last]);
        for(const y of [2,height-2])candidates.push([first,[first[0],y],[last[0],y],last]);
        for(const x of xs.slice(0,6))for(const y of ys.slice(0,6)){
          candidates.push([first,[x,first[1]],[x,y],[last[0],y],last]);
          candidates.push([first,[first[0],y],[x,y],[x,last[1]],last]);
        }
        let best=null,cost=Infinity;
        for(const candidate of candidates){const path=compact(candidate);if(path.some(blocked)||!segments(path).every(([a,b])=>clear(a,b)))continue;const value=pathCost(path,occupied,obstacles);if(value<cost){best=path;cost=value;}}
        return best;
      }
      const begin=Y.indexOf(first[1])*X.length+X.indexOf(first[0]),finish=Y.indexOf(last[1])*X.length+X.indexOf(last[0]);
      const heap=[],dist=new Map([[begin*3,0]]),previous=new Map();
      const push=row=>{let i=heap.length;heap.push(row);while(i){const parent=(i-1)>>1;if(heap[parent][0]<=row[0])break;heap[i]=heap[parent];i=parent;}heap[i]=row;};
      const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;if(heap[j][0]>=last[0])break;heap[i]=heap[j];i=j;}heap[i]=last;}return first;};
      push([0,begin*3]);
      while(heap.length){
        const [cost,state]=pop(),index=Math.floor(state/3),direction=state%3;
        if(cost!==dist.get(state))continue;
        if(index===finish){const result=[];for(let at=state;at!==undefined;at=previous.get(at))result.push(point(Math.floor(at/3)));return result.reverse();}
        const x=index%X.length,y=Math.floor(index/X.length),a=point(index);
        for(const [nx,ny,nextDirection] of [[x-1,y,1],[x+1,y,1],[x,y-1,2],[x,y+1,2]]){
          if(nx<0||ny<0||nx>=X.length||ny>=Y.length)continue;
          const nextIndex=ny*X.length+nx,b=point(nextIndex);if(!clear(a,b))continue;
          const key=nextIndex*3+nextDirection,next=cost+Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+(direction&&direction!==nextDirection?12:0)+segmentCost(a,b,occupied)+corridorCost(a,b,rects);
          if(next<(dist.get(key)??Infinity)){dist.set(key,next);previous.set(key,state);push([next,key]);}
        }
      }
      return null;
    }
    const result=[start];
    for(let i=1;i<stops.length;i++){const part=between(stops[i-1],stops[i]);if(!part)return null;result.push(...part.slice(1));}
    return compact(result);
  }
  function roundedPath(points,radius=8,terminalLead=0){
    const path=compact(points);if(path.length<2)return '';
    let d=`M${path[0].join(' ')}`;
    for(let i=1;i<path.length-1;i++){
      const p=path[i],a=path[i-1],b=path[i+1],la=Math.hypot(p[0]-a[0],p[1]-a[1]),lb=Math.hypot(p[0]-b[0],p[1]-b[1]);
      const r=Math.min(radius,la/2,lb/2,i===1?Math.max(0,la-terminalLead):Infinity,i===path.length-2?Math.max(0,lb-terminalLead):Infinity);
      if(!r){d+=` L${p.join(' ')}`;continue;}
      d+=` L${p[0]+(a[0]-p[0])*r/la} ${p[1]+(a[1]-p[1])*r/la} Q${p.join(' ')} ${p[0]+(b[0]-p[0])*r/lb} ${p[1]+(b[1]-p[1])*r/lb}`;
    }
    return d+` L${path.at(-1).join(' ')}`;
  }
  function segments(points){return points.slice(1).map((point,index)=>[points[index],point]);}
  function arrowHead(points,length=9,width=7){
    const path=compact(points);if(path.length<2)return [];
    const tip=path.at(-1),from=path.at(-2),distance=Math.hypot(tip[0]-from[0],tip[1]-from[1]);
    if(!distance||![...tip,...from,length,width].every(Number.isFinite)||length<=0||width<=0)return [];
    const dx=(tip[0]-from[0])/distance,dy=(tip[1]-from[1])/distance,back=[tip[0]-dx*length,tip[1]-dy*length];
    return [[...tip],[back[0]-dy*width/2,back[1]+dx*width/2],[back[0]+dy*width/2,back[1]-dx*width/2]];
  }
  return {clone,edgeId,mode,resolveOffsets,validateLayout,edgeOverride,availablePort,terminalPort,adaptTerminalPair,waypoints,routeOrthogonal,pathCost,straightRoute,simplifyAuto,roundedPath,segments,compact,arrowHead};
});

// Scene text stays in the DOM. Only connections use SVG coordinates.
(() => {
const mounted = new WeakMap();
function mountMap(map, {restoreHash = true} = {}) {
  if (mounted.has(map)) return mounted.get(map);
  const document = map.ownerDocument || globalThis.document;
  const window = document.defaultView || globalThis.window;
  const location = window.location || globalThis.location;
  const history = window.history || globalThis.history;
  const listeners = [], observers = [];
  let disposed = false, frame = 0;
  const on = (target, type, handler) => {
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  };
  const details = [...map.querySelectorAll('.time-map__detail')];
  const links = [...map.querySelectorAll('[data-time-node]')];
  const portals = [...map.querySelectorAll('[data-time-portal]')];
  const sceneLinks = [...links, ...portals];
  const relations = [...map.querySelectorAll('.time-map__reading li')];
  const canvas = map.querySelector('.time-map__canvas');
  const svg = map.querySelector('.time-map__connections');
  const data = map.querySelector('.time-map__data');
  const model = data ? JSON.parse(data.textContent) : null;
  const prior = {
    enhanced: map.classList.contains?.('time-map--enhanced') || false,
    detailOpen: details.map(detail => detail.open),
    attributes: sceneLinks.map(link => [link, link.getAttribute?.('aria-current'), link.getAttribute?.('aria-haspopup')]),
    transforms: links.map(link => link.style.transform), paddingBottom: canvas.style.paddingBottom,
    svgChildren: [...(svg.childNodes || svg.children)], viewBox: svg.getAttribute?.('viewBox'),
    warning: map.dataset.diagramLayoutWarning, storyReader: map.storyReader, elioDiagram: map.elioDiagram,
  };
  const geometry = globalThis.elioDiagramGeometry;
  let diagramLayout = geometry.clone(model?.diagram_layout), lastGeometry = null;
  const colors = {life:'#89939b','actor-a':'#16869a','actor-b':'#7954aa',world:'#ab7a29'};
  const ns = 'http://www.w3.org/2000/svg';
  let selected = null;
  map.classList.add('time-map--enhanced');
  // Reuse the photo-flow reader's native dialog shell and typography.
  const dialog=document.createElement('dialog');dialog.className='story-detail';
  const header=document.createElement('header');header.className='story-detail__header';
  const context=document.createElement('span');context.className='story-detail__context';
  const close=document.createElement('button');close.type='button';close.className='story-detail__close';close.textContent='흐름으로 돌아가기 ×';
  const body=document.createElement('div');body.className='story-detail__body';
  header.append(context,close);dialog.append(header,body);map.append(dialog);
  dialog.style.setProperty('--route-color','#16869a');
  let opened=null,returnFocus=null,savedScroll=0;
  const restore=()=>{if(opened){opened.append(body.querySelector('.time-map__scene'));opened=null;}};
  on(dialog,'close',()=>{restore();document.body.classList.remove('story-detail-open');if(!disposed){returnFocus?.focus({preventScroll:true});window.scrollTo({top:savedScroll,behavior:'instant'});}});
  on(close,'click',()=>dialog.close());
  on(dialog,'click',event=>{if(event.target===dialog)dialog.close();});
  const highlight = () => map.querySelectorAll('.time-map__edge, .time-map__arrow').forEach((edge) => {
    edge.style.opacity = !selected || edge.dataset.from === selected || edge.dataset.to === selected ? '1' : '.25';
  });
  const select = (id, node) => {
    selected = node;
    details.forEach((detail) => { detail.open = false; });
    sceneLinks.forEach((link) => {
      if (link.dataset.timeItem === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    highlight();
  };
  const show=(link)=>{
    if(disposed)return;
    if(map.closest('.spoilers-on') && !map.classList.contains('spoiler-revealed'))return;
    const detail=details.find(d=>d.dataset.timeDetail===link.dataset.timeItem);if(!detail)return;
    if(!dialog.open){returnFocus=link;savedScroll=window.scrollY;}
    restore();select(detail.dataset.timeDetail,link.dataset.timeNode || link.dataset.timePortal);opened=detail;
    const era=map.querySelectorAll('.time-map__era')[+link.dataset.era]?.textContent||'';
    context.textContent=era;
    dialog.setAttribute('aria-label',detail.querySelector('summary').textContent);
    body.append(detail.querySelector('.time-map__scene'));
    if(!dialog.open){dialog.showModal();document.body.classList.add('story-detail-open');}
    dialog.scrollTop=0;close.focus({preventScroll:true});
  };
  sceneLinks.forEach((link) => on(link,'click', (event) => {
    if (event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    show(link);
    history.replaceState(null, '', `#${link.dataset.timeItem}`);
  }));
  links.forEach(link=>link.setAttribute('aria-haspopup','dialog'));
  map.storyReader={compact:true,resume:(id)=>{const link=links.find(l=>l.dataset.timeItem===id);if(link)show(link);}};
  // The shared glossary listener records the original scene and resumes this
  // reader through the same contract used by the photo-flow dialog.
  on(dialog,'click',event=>{
    const anchor=event.target.closest('a.term-link[href^="#"]');
    if(!anchor || event.button>0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
    const target=document.getElementById(anchor.hash.slice(1));
    if(target && !dialog.contains(target)){event.preventDefault();dialog.close();}
  });
  const syncHash = () => {
    if(disposed)return;
    const link = links.find((row) => row.hash === location.hash);
    if(link)show(link);else {if(dialog.open)dialog.close();select(null,null);}
  };
  if (restoreHash) {
    syncHash();
    on(window,'hashchange', syncHash);
  }
  const draw = () => {
    if (disposed || !canvas.clientWidth) return;
    links.forEach(link=>{link.style.transform='';});
    canvas.style.paddingBottom='';
    const origin = canvas.getBoundingClientRect();
    const relative = (el) => {
      const r = el.getBoundingClientRect();
      return {left:r.left-origin.left,top:r.top-origin.top,right:r.right-origin.left,bottom:r.bottom-origin.top,width:r.width,height:r.height,cx:(r.left+r.right)/2-origin.left,cy:(r.top+r.bottom)/2-origin.top};
    };
    const portrait = getComputedStyle(canvas).getPropertyValue('--map-orientation').trim() === 'portrait';
    const nodes = links.map((link) => ({id:link.dataset.timeNode,era:+link.dataset.era,lane:+link.dataset.lane,span:+link.dataset.laneSpan,
      box:relative(link),photo:relative(link.querySelector('.time-map__photo'))}));
    const W=origin.width,baseHeight=origin.height,basePadding=parseFloat(getComputedStyle(canvas).paddingBottom)||0;
    const offsets=geometry.resolveOffsets(nodes,geometry.mode(diagramLayout,portrait).nodes,W,{minY:Math.min(...nodes.map(n=>n.box.top))});
    const warnings=[...offsets.warnings];
    nodes.forEach((node,index)=>{
      const offset=offsets.offsets[node.id];links[index].style.transform=`translate(${offset.x}px,${offset.y}px)`;
      for(const key of ['box','photo']){const r=node[key];node[key]={...r,left:r.left+offset.x,right:r.right+offset.x,top:r.top+offset.y,bottom:r.bottom+offset.y,cx:r.cx+offset.x,cy:r.cy+offset.y};}
    });
    const byId = new Map(nodes.map((n) => [n.id,n]));
    let H=Math.max(baseHeight,...nodes.map(n=>n.box.bottom+18));
    const obstacles=nodes.map(n=>n.box);
    // Gateways are outside the full caption, never through its text.
    const port = (n, side) => {
      const b=n.box,p=n.photo;
      const space={obstacles:nodes.filter(node=>node.id!==n.id).map(node=>node.box),width:W,height:H};
      if(side==='left') return geometry.terminalPort({side,tip:[p.left-8,p.cy],gate:[b.left-9,p.cy]},side,24,space);
      if(side==='right') return geometry.terminalPort({side,tip:[p.right+8,p.cy],gate:[b.right+9,p.cy]},side,24,space);
      if(side==='top') return geometry.terminalPort({side,tip:[p.cx,p.top-8],gate:[p.cx,b.top-9]},side,24,space);
      return geometry.terminalPort({side,tip:[p.cx,b.bottom+8],gate:[p.cx,b.bottom+9]},side,24,space);
    };
    const returnRails = new Map();
    const plan = relations.map((relation) => {
      const s=byId.get(relation.dataset.from),t=byId.get(relation.dataset.to);
      let a,b,via=[];
      const sameLane=s.lane===t.lane || s.span>1 || t.span>1;
      // Shared scenes span lanes: different actors may use the same physical
      // return corridor. Allocate bands by geometry, not actor/kind identity.
      const key=portrait ? Math.min(s.box.left,t.box.left)
        : Math.min(...nodes.filter(n=>n.lane===t.lane).map(n=>n.box.top));
      const returnLevel=s.era>t.era && sameLane ? (returnRails.get(key)||0) : 0;
      if(s.era>t.era && sameLane)returnRails.set(key,returnLevel+1);
      if(portrait){
        if(s.era===t.era){ a=s.lane<t.lane?'right':'left'; b=s.lane<t.lane?'left':'right'; }
        else if(s.era<t.era){a='bottom';b='top';}
        else if(sameLane){
          a='left';b='left';
          const rail=Math.max(43,Math.min(s.box.left,t.box.left)-17-returnLevel*6-(relation.dataset.kind==='life'?6:0));
          via=[[rail,s.photo.cy],[rail,t.photo.cy]];
        }else{
          a='top';b='bottom';
        }
      }else{
        if(s.era===t.era){a=s.lane<t.lane?'bottom':'top';b=s.lane<t.lane?'top':'bottom';}
        else if(s.era>t.era && sameLane){
          a='top';b='top';
          const band=Math.min(...nodes.filter(n=>n.lane===t.lane).map(n=>n.box.top))-18-returnLevel*9;
          via=[[s.photo.cx,band],[t.photo.cx,band]];
        }else if(s.era<t.era && sameLane){a='right';b='left';}
        else{
          // Cross-lane causes are not temporal return loops. Let visibility
          // routing use the nearest clear corridor, in either time direction.
          a=s.era<t.era?'right':'left';b=s.era<t.era?'left':'right';
        }
      }
      const defaultSides=[a,b],override=geometry.edgeOverride(diagramLayout,portrait,s.id,t.id);
      if(override.source_port)a=override.source_port;
      if(override.target_port)b=override.target_port;
      if(override.source_port||override.target_port)via=[];
      if(override.via?.length)via=geometry.waypoints(override.via,W,{x:s.photo.cx,y:s.photo.cy});
      const manual=Boolean(override.via?.length||override.source_port||override.target_port);
      let alternate=null;
      if(!manual&&s.span===1&&t.span===1){
        if(s.era!==t.era&&s.lane!==t.lane)alternate=portrait?(s.lane<t.lane?['right','left']:['left','right']):(s.lane<t.lane?['bottom','top']:['top','bottom']);
        else if(t.era-s.era>1&&s.lane===t.lane){
          // A continuing branch can use the shared inner corridor instead of
          // circling below every caption. Still compare it with the old ports.
          const inner=portrait?(s.photo.cx<W/2?'right':'left'):(s.photo.cy<H/2?'bottom':'top');
          alternate=[inner,inner];
        }
      }
      return {relation,id:geometry.edgeId(s.id,t.id),defaultSides,alternate,start:{...port(s,a),node:s.id,side:a,other:t.photo},end:{...port(t,b),node:t.id,side:b,other:s.photo},via,manual};
    });
    const fans=new Map();
    plan.forEach(p=>[p.start,p.end].forEach(endpoint=>{
      const key=`${endpoint.node}:${endpoint.side}`;
      if(!fans.has(key))fans.set(key,[]);fans.get(key).push(endpoint);
    }));
    fans.forEach(endpoints=>endpoints.sort((a,b)=>['top','bottom'].includes(a.side)?a.other.cx-b.other.cx:a.other.cy-b.other.cy).forEach((endpoint,i)=>{
      const axis=['top','bottom'].includes(endpoint.side)?0:1;
      const offset=(i-(endpoints.length-1)/2)*10;
      endpoint.tip[axis]+=offset;endpoint.gate[axis]+=offset;
    }));
    // A free port can align with the opposing fan port. Keep a clear forward
    // connection straight rather than drawing a five-pixel decorative jog.
    plan.forEach(p=>{
      const s=byId.get(p.start.node),t=byId.get(p.end.node);
      const axis=portrait?0:1;
      const aligned=portrait?s.photo.cx===t.photo.cx:s.photo.cy===t.photo.cy;
      const forward=portrait?p.start.side==='bottom' && p.end.side==='top'
        :p.start.side==='right' && p.end.side==='left';
      if(p.via.length || !aligned || !forward)return;
      const freeStart=fans.get(`${p.start.node}:${p.start.side}`).length===1;
      const freeEnd=fans.get(`${p.end.node}:${p.end.side}`).length===1;
      const endpoint=freeStart?p.start:freeEnd?p.end:null;
      if(endpoint){const v=(freeStart?p.end:p.start).tip[axis];endpoint.tip[axis]=v;endpoint.gate[axis]=v;}
    });
    plan.forEach(p=>{
      if(!p.via.length||p.manual)return;
      if(!portrait && p.start.side==='top' && p.end.side==='top'){
        p.via[0][0]=p.start.gate[0];p.via.at(-1)[0]=p.end.gate[0];
        const band=Math.min(p.via[0][1],p.start.gate[1],p.end.gate[1]);p.via.forEach(point=>{point[1]=band;});
      }else if(portrait && p.start.side==='left' && p.end.side==='left'){
        p.via[0][1]=p.start.gate[1];p.via.at(-1)[1]=p.end.gate[1];
        const rail=Math.min(p.via[0][0],p.start.gate[0],p.end.gate[0]);p.via.forEach(point=>{point[0]=rail;});
      }
    });
    plan.forEach(p=>p.via.forEach(point=>{if(Number.isFinite(point[1]))H=Math.max(H,point[1]+18);}));
    canvas.style.paddingBottom=`${basePadding+H-baseHeight}px`;
    const el=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;};
    svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    const routed=new Map(),terminals=new Map(),occupied=[];
    const reservations=new Map([...fans].map(([key,endpoints])=>[key,endpoints.map(endpoint=>endpoint.tip[['top','bottom'].includes(endpoint.side)?0:1])]));
    const alternatePort=(id,side)=>{
      const node=byId.get(id),photo=node.photo,vertical=['top','bottom'].includes(side);
      return geometry.availablePort(port(node,side),side,reservations.get(`${id}:${side}`)||[],vertical?photo.left+4:photo.top+4,vertical?photo.right-4:photo.bottom-4);
    };
    const reserve=(id,side,endpoint)=>{const key=`${id}:${side}`;if(!reservations.has(key))reservations.set(key,[]);reservations.get(key).push(endpoint.tip[['top','bottom'].includes(side)?0:1]);};
    const length=p=>Math.abs(p.start.gate[0]-p.end.gate[0])+Math.abs(p.start.gate[1]-p.end.gate[1]);
    const route=(start,end,via=[],preferStraightStops=false)=>geometry.routeOrthogonal({start:start.gate,end:end.gate,startTip:start.tip,endTip:end.tip,via,obstacles,width:W,height:H,occupied,preferStraightStops});
    [...plan].sort((a,b)=>Number(b.manual)-Number(a.manual)||length(a)-length(b)).forEach(p=>{
      let {start,end}=p;
      ({start,end}=geometry.adaptTerminalPair(start,end,obstacles));
      const otherObstacles=nodes.filter(node=>node.id!==p.start.node&&node.id!==p.end.node).map(node=>node.box);
      const direct=!p.manual&&!p.via.length&&geometry.straightRoute(start.tip,end.tip,otherObstacles);
      if(direct){routed.set(p.id,direct);terminals.set(p.id,{start,end});occupied.push(...geometry.segments(direct));return;}
      let path=route(start,end,p.via,p.manual&&p.via.length>0);
      if(p.alternate){
        let altStart=alternatePort(p.start.node,p.alternate[0]),altEnd=alternatePort(p.end.node,p.alternate[1]);
        if(altStart&&altEnd)({start:altStart,end:altEnd}=geometry.adaptTerminalPair(altStart,altEnd,obstacles));
        const alternative=altStart&&altEnd&&route(altStart,altEnd);
        if(alternative&&(!path||geometry.pathCost([altStart.tip,...alternative,altEnd.tip],occupied,obstacles)<geometry.pathCost([start.tip,...path,end.tip],occupied,obstacles)-1)){
          start=altStart;end=altEnd;path=alternative;
          reserve(p.start.node,p.alternate[0],start);reserve(p.end.node,p.alternate[1],end);
        }
      }
      if(!path){
        if(p.manual)warnings.push(`Edge ${p.id}: requested waypoints or ports are blocked; automatic route shown.`);
        path=route(start,end);
      }
      if(!path){
        start=port(byId.get(p.start.node),p.defaultSides[0]);end=port(byId.get(p.end.node),p.defaultSides[1]);
        ({start,end}=geometry.adaptTerminalPair(start,end,obstacles));
        path=route(start,end);
      }
      if(!path){warnings.push(`Edge ${p.id}: no clear route; its relation remains in the text list.`);return;}
      const full=[start.tip,...path,end.tip],points=p.manual?geometry.compact(full):geometry.simplifyAuto(full,otherObstacles);routed.set(p.id,points);terminals.set(p.id,{start,end});occupied.push(...geometry.segments(points));
    });
    const arrows=[];
    plan.forEach(({relation,id})=>{
      const points=routed.get(id);if(!points)return;
      const d=geometry.roundedPath(points,7,9);
      // A narrow surface-colored bridge makes a necessary crossing visibly
      // distinct from a junction; adjacent return rails have separate bands.
      svg.append(el('path',{class:'time-map__bridge',d,stroke:'#f8fbfc','stroke-width':5.5,fill:'none','stroke-linejoin':'round'}));
      svg.append(el('path',{class:'time-map__edge','data-from':relation.dataset.from,'data-to':relation.dataset.to,d,stroke:colors[relation.dataset.kind]}));
      arrows.push(el('polygon',{class:'time-map__arrow','data-from':relation.dataset.from,'data-to':relation.dataset.to,points:geometry.arrowHead(points).map(point=>point.join(',')).join(' '),fill:colors[relation.dataset.kind],stroke:'none'}));
    });
    // Later crossing bridges may cover an earlier body, never its arrowhead.
    svg.append(...arrows);
    highlight();
    if(warnings.length)map.dataset.diagramLayoutWarning=warnings.join('\n');else delete map.dataset.diagramLayoutWarning;
    const terminalSnapshot=id=>terminals.has(id)?Object.fromEntries(Object.entries(terminals.get(id)).map(([key,{tip,gate,side}])=>[key,{tip,gate,side}])):undefined;
    lastGeometry={variant:portrait?'mobile':'desktop',width:W,height:H,obstacles,nodes:nodes.map(node=>({id:node.id,box:{left:node.box.left,top:node.box.top,width:node.box.width,height:node.box.height},anchor:{x:node.photo.cx,y:node.photo.cy},offsetCurrent:geometry.mode(diagramLayout,portrait).nodes?.[node.id]||{x:0,y:0}})),edges:plan.map(p=>({id:p.id,from:p.relation.dataset.from,to:p.relation.dataset.to,points:routed.get(p.id)||[],terminals:terminalSnapshot(p.id)}))};
    if(typeof CustomEvent==='function')map.dispatchEvent(new CustomEvent('elio:diagram-drawn',{bubbles:true}));
  };
  let queued=false;
  const schedule=()=>{if(disposed||queued)return;queued=true;frame=requestAnimationFrame(()=>{frame=0;queued=false;if(!disposed)draw();});};
  map.elioDiagram={kind:'time_map',surface:canvas,nodes:links.map(link=>({id:link.dataset.timeNode,label:model?.nodes?.find(node=>node.id===link.dataset.timeNode)?.label||link.textContent||link.dataset.timeNode})),edges:relations.map(relation=>({id:geometry.edgeId(relation.dataset.from,relation.dataset.to),from:relation.dataset.from,to:relation.dataset.to,label:relation.textContent||''})),getLayout:()=>geometry.clone(diagramLayout),setLayout:value=>{diagramLayout=geometry.clone(value);schedule();},geometry:()=>geometry.clone(lastGeometry)};
  const diagram = map.elioDiagram, reader = map.storyReader;
  for(const element of [canvas,...links]){const observer=new ResizeObserver(schedule);observer.observe(element);observers.push(observer);}
  document.fonts?.ready.then(schedule);
  schedule();
  const dispose=()=>{
    if(disposed)return;
    disposed=true;cancelAnimationFrame(frame);frame=0;queued=false;
    observers.forEach(observer=>observer.disconnect());
    listeners.forEach(remove=>remove());
    restore();
    if(dialog.open)dialog.close();
    dialog.remove();
    if(!document.querySelector('dialog.story-detail[open]'))document.body.classList.remove('story-detail-open');
    if(!prior.enhanced)map.classList.remove('time-map--enhanced');
    details.forEach((detail,index)=>{detail.open=prior.detailOpen[index];});
    for(const [link,current,popup] of prior.attributes){
      if(current===null||current===undefined)link.removeAttribute('aria-current');else link.setAttribute('aria-current',current);
      if(popup===null||popup===undefined)link.removeAttribute('aria-haspopup');else link.setAttribute('aria-haspopup',popup);
    }
    links.forEach((link,index)=>{link.style.transform=prior.transforms[index]||'';});
    canvas.style.paddingBottom=prior.paddingBottom||'';
    svg.replaceChildren(...prior.svgChildren);
    if(prior.viewBox===null||prior.viewBox===undefined)svg.removeAttribute('viewBox');else svg.setAttribute('viewBox',prior.viewBox);
    if(prior.warning===undefined)delete map.dataset.diagramLayoutWarning;else map.dataset.diagramLayoutWarning=prior.warning;
    if(map.storyReader===reader){if(prior.storyReader===undefined)delete map.storyReader;else map.storyReader=prior.storyReader;}
    if(map.elioDiagram===diagram){if(prior.elioDiagram===undefined)delete map.elioDiagram;else map.elioDiagram=prior.elioDiagram;}
    if(mounted.get(map)===dispose)mounted.delete(map);
  };
  mounted.set(map,dispose);
  return dispose;
}
function mount(root, {restoreHash = true} = {}) {
  const maps=[...(root.matches?.('.time-map')?[root]:[]),...root.querySelectorAll('.time-map')];
  const disposers=maps.map(map=>mountMap(map,{restoreHash}));
  let disposed=false;
  return ()=>{if(disposed)return;disposed=true;disposers.forEach(dispose=>dispose());};
}
globalThis.ElioTimeMap={mount};
if(typeof document!=='undefined')mount(document);
})();

  /* END CANONICAL ELIO MAP RUNTIME */
})(typeof window !== 'undefined' ? window : globalThis);
