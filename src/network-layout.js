export const contains=(b,x,z)=>x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ;
export const districtAt=(content,x,z)=>content.areas[1].districts?.find(d=>contains(d.bounds,x,z));
export const districtCenter=d=>({x:(d.bounds.minX+d.bounds.maxX)/2,z:(d.bounds.minZ+d.bounds.maxZ)/2});
// Exact rectangular complement of rooms and corridors; used by rendering and
// collisions so a visible wall never disagrees with the navigation mesh.
export function networkWalls(content){
  const area=content.areas[1];if(!area.districts)return [];
  const b=area.bounds,walk=[...area.districts.map(d=>d.bounds),...area.corridors];
  const xs=[...new Set([b.minX,b.maxX,...walk.flatMap(r=>[r.minX,r.maxX])])].sort((a,b)=>a-b);
  const zs=[...new Set([b.minZ,b.maxZ,...walk.flatMap(r=>[r.minZ,r.maxZ])])].sort((a,b)=>a-b);
  const walls=[];
  for(let iz=0;iz<zs.length-1;iz++){
    let run=null;
    for(let ix=0;ix<xs.length-1;ix++){
      const x=(xs[ix]+xs[ix+1])/2,z=(zs[iz]+zs[iz+1])/2;
      if(walk.some(r=>contains(r,x,z))){run=null;continue;}
      if(run)run.maxX=xs[ix+1];else {run={minX:xs[ix],maxX:xs[ix+1],minZ:zs[iz],maxZ:zs[iz+1]};walls.push(run);}
    }
  }
  return walls;
}
