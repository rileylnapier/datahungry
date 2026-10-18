import {STORY_SITES} from './story.js';

// Shared upward-facing service socket, just in front of each device's approach.
// Home retains its ten-port unloading ring.
export const DEVICE_PORTS=Object.fromEntries(Object.entries(STORY_SITES)
  .filter(([id])=>id!=='home')
  .map(([id,site])=>{
    const dx=site.x-site.approach.x,dz=site.z-site.approach.z,d=Math.hypot(dx,dz);
    return [id,{x:site.approach.x+dx/d*1.6+dz/d*1.1,y:.48,z:site.approach.z+dz/d*1.6-dx/d*1.1}];
  }));

export function devicePort(id,player){
  const port=DEVICE_PORTS[id],site=STORY_SITES[id];
  if(!port||!player||Math.hypot(player.x-site.x,player.z-site.z)>=4.5||Math.hypot(player.x-port.x,player.z-port.z)>5||Math.hypot(player.vx||0,player.vz||0)>.6)return null;
  return port;
}
