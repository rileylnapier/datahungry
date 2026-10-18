const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function overlapsCircle(p,box,radius){
  return Math.hypot(p.x-clamp(p.x,box.minX,box.maxX),p.z-clamp(p.z,box.minZ,box.maxZ))<radius-1e-6;
}
function pushOutside(p,boxes,radius){
  for(let pass=0;pass<3;pass++)for(const b of boxes){
    const cx=clamp(p.x,b.minX,b.maxX),cz=clamp(p.z,b.minZ,b.maxZ),dx=p.x-cx,dz=p.z-cz,d=Math.hypot(dx,dz);
    if(d>=radius)continue;
    if(d>.0001){p.x=cx+dx/d*radius;p.z=cz+dz/d*radius;}
    else{
      const exits=[{distance:p.x-b.minX,axis:'x',value:b.minX-radius},{distance:b.maxX-p.x,axis:'x',value:b.maxX+radius},{distance:p.z-b.minZ,axis:'z',value:b.minZ-radius},{distance:b.maxZ-p.z,axis:'z',value:b.maxZ+radius}];
      exits.sort((a,b)=>a.distance-b.distance);p[exits[0].axis]=exits[0].value;
    }
  }
}
export function moveWithCollisions(start,end,boxes,radius){
  const p={x:start.x,z:start.z};pushOutside(p,boxes,radius);
  const dx=end.x-start.x,dz=end.z-start.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
  for(let i=0;i<steps;i++){p.x+=dx/steps;pushOutside(p,boxes,radius);p.z+=dz/steps;pushOutside(p,boxes,radius);}
  return p;
}
export function planPath(start,goal,layout,boxes,radius){
  const clearance=radius+.15;
  const free=p=>p.x>=layout.minX+clearance&&p.x<=layout.maxX-clearance&&p.z>=layout.minZ+clearance&&p.z<=layout.maxZ-clearance&&!boxes.some(b=>overlapsCircle(p,b,clearance));
  const clear=(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2));for(let i=1;i<=n;i++)if(!free({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;return true;};
  const nearest=p=>{let best=null,d=Infinity;for(let x=Math.round(p.x)-6;x<=Math.round(p.x)+6;x++)for(let z=Math.round(p.z)-6;z<=Math.round(p.z)+6;z++){const q={x,z},dist=Math.hypot(x-p.x,z-p.z);if(dist<d&&free(q)){best=q;d=dist;}}return best;};
  const finish=free(goal)?goal:nearest(goal);if(!finish)return [];
  if(clear(start,finish))return [finish];
  const from=nearest(start),to=nearest(finish);if(!from||!to)return [];
  const key=p=>`${p.x},${p.z}`,heuristic=p=>Math.hypot(p.x-to.x,p.z-to.z);
  const nodes=new Map(),closed=new Set(),open=[];
  const first={...from,g:0,f:heuristic(from),parent:null};nodes.set(key(first),first);open.push(first);
  let last=null;
  while(open.length){open.sort((a,b)=>a.f-b.f);const current=open.shift(),id=key(current);if(closed.has(id))continue;if(id===key(to)){last=current;break;}closed.add(id);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const p={x:current.x+dx,z:current.z+dz},pid=key(p);if(closed.has(pid)||!free(p)||!clear(current,p))continue;
      const g=current.g+Math.hypot(dx,dz),prior=nodes.get(pid);if(prior&&prior.g<=g)continue;
      const node={...p,g,f:g+heuristic(p),parent:current};nodes.set(pid,node);open.push(node);
    }
  }
  if(!last)return [];
  const path=[];for(let n=last;n;n=n.parent)path.unshift({x:n.x,z:n.z});path.push(finish);
  // Skip redundant grid steps while preserving full body clearance around corners.
  const smooth=[];let anchor=start,index=0;
  while(index<path.length){let far=index;for(let j=index;j<path.length;j++){if(clear(anchor,path[j]))far=j;else break;}smooth.push(path[far]);anchor=path[far];index=far+1;}
  return smooth;
}
