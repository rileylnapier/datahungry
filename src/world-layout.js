import {STORY_SITES} from './story.js';
import {networkWalls} from './network-layout.js';
// All gameplay boundaries derive from the same content used to build the map.
export function worldLayout(content){
  const safe=content.areas[0].bounds,hard=content.areas[1].bounds;
  return {safe,hard,gateZ:(safe.minZ+hard.maxZ)/2,minX:Math.min(safe.minX,hard.minX)-1,maxX:Math.max(safe.maxX,hard.maxX)+1,minZ:hard.minZ-1,maxZ:safe.maxZ+1};
}
export function routeThroughGate(start,goal,gateZ){
  if((start.z<gateZ)===(goal.z<gateZ))return [goal];
  const side=start.z<gateZ?-1:1;
  return [{x:0,z:gateZ+side*2},{x:0,z:gateZ-side*2},goal];
}
export const NETWORK_ROUTER={x:5.5,z:-40,width:3,depth:1.8};
export const NETWORK_DEVICES={photos:{name:'Photo Library',x:-24,z:-42,color:0xb9a5ef},documents:{name:'Shared Inbox',x:24,z:-42,color:0xd8efa8},developer:{name:'Developer Workstation',x:-6,z:-68,color:0xf3b77f}};
export const BASE_STORAGE={text:{x:-8,z:12.5,color:0xd8efa8},image:{x:2,z:12.5,color:0xb9a5ef}};
export const FOLDERS=Object.values(BASE_STORAGE).map(s=>[s.x,s.z,s.color]);
export const MEMORY_MODULES=[[-15,-10],[15,-21]];
export const PROCESSOR={x:10,z:-20,width:5,depth:5};
export function serverTowers(layout){return [[-16,0,2.5],[16,-4,3],[-14,layout.hard.minZ+3,3.2],[14,layout.hard.maxZ-3,3.7],[15,10,2]];}
export const BASE_SORTER={x:-3,z:9};
export const DOCK_PILLARS=[{x:-4.95,z:4.8,width:.5,depth:.6},{x:-1.05,z:4.8,width:.5,depth:.6}];
export const BASE_MACHINES={basic:{x:-8,z:9},image:{x:2,z:9},extra:{x:-13,z:9}};
export function solidObstacles(content,base={}){
  const layout=worldLayout(content),result=networkWalls(content);
  const add=(x,z,width,depth)=>result.push({minX:x-width/2,maxX:x+width/2,minZ:z-depth/2,maxZ:z+depth/2});
  for(const id of ['terminal','infected','backup','relay']){const p=STORY_SITES[id];add(p.x,p.z,1.8,1.4);}
  add(-26,-86.2,4.5,.8);
  add(NETWORK_ROUTER.x,NETWORK_ROUTER.z,NETWORK_ROUTER.width,NETWORK_ROUTER.depth);
  for(const p of DOCK_PILLARS)add(p.x,p.z,p.width,p.depth);
  for(const pos of Object.values(NETWORK_DEVICES))add(pos.x,pos.z,4,3);
  if(base.autoSort)add(BASE_MACHINES.extra.x,BASE_MACHINES.extra.z,2,2);
  add(BASE_MACHINES.basic.x,BASE_MACHINES.basic.z,2,2);
  add(BASE_SORTER.x,BASE_SORTER.z,1.4,1.4);
  if(base.imageMuncher)add(BASE_MACHINES.image.x,BASE_MACHINES.image.z,2,2);
  for(const [x,z] of FOLDERS)add(x,z,5,3.5);
  for(const [x,z] of MEMORY_MODULES)add(x,z,2.5,6);
  add(PROCESSOR.x,PROCESSOR.z,PROCESSOR.width+.5,PROCESSOR.depth+.5);
  for(const [x,z] of serverTowers(layout))add(x,z,1.9,1.7);
  for(const s of content.areas[0].spawns)if(s.emitter)add(s.emitter.x,s.emitter.z-.5,1.8,2.6);
  result.push({minX:layout.minX-2,maxX:-2.4,minZ:layout.gateZ-.45,maxZ:layout.gateZ+.45},{minX:2.4,maxX:layout.maxX+2,minZ:layout.gateZ-.45,maxZ:layout.gateZ+.45});
  // Side barriers keep the wider network from opening routes around the sandbox.
  add(layout.minX-1,(layout.minZ+layout.maxZ)/2,2,layout.maxZ-layout.minZ+4);
  add(layout.maxX+1,(layout.minZ+layout.maxZ)/2,2,layout.maxZ-layout.minZ+4);
  return result;
}
