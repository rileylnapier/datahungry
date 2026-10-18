import { BASE_STORAGE, BASE_MACHINES } from './world-layout.js';
export const REVEAL_RADIUS=6.5;
export function cleanExplored(value){
  if(!Array.isArray(value))return [];
  return [...new Set(value.filter(key=>typeof key==='string'&&/^-?\d{1,3},-?\d{1,3}$/.test(key)&&key.split(',').every(n=>Number(n)>=-128&&Number(n)<=128)))].slice(0,66049);
}
export function createExploration(state,layout){
  const cells=new Set(state.explored);
  const known=(x,z)=>cells.has(`${Math.floor(x)},${Math.floor(z)}`);
  let revision=0;
  function reveal(x,z,radius=REVEAL_RADIUS){
    let changed=false;
    for(let cx=Math.max(Math.floor(layout.minX),Math.floor(x-radius));cx<=Math.min(Math.ceil(layout.maxX),Math.ceil(x+radius));cx++)for(let cz=Math.max(Math.floor(layout.minZ),Math.floor(z-radius));cz<=Math.min(Math.ceil(layout.maxZ),Math.ceil(z+radius));cz++){
      if(Math.hypot(cx+.5-x,cz+.5-z)>radius)continue;
      const key=`${cx},${cz}`;if(!cells.has(key)){cells.add(key);changed=true;}
    }
    if(changed){state.explored=[...cells];revision++;}return changed;
  }
  reveal(-3,3);reveal(0,3);
  for(const pos of Object.values(BASE_STORAGE))reveal(pos.x,pos.z,3);
  for(const pos of Object.values(BASE_MACHINES))reveal(pos.x,pos.z,2.5);
  return {known,reveal,cells,get revision(){return revision;}};
}
