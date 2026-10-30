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
