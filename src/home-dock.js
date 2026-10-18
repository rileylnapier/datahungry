export const HOME_DOCK={x:-3,z:5,radius:1.8};
// Half a segment offset avoids the existing bolts and leaves the entry clear.
export const DOCK_PORTS=Array.from({length:10},(_,i)=>{
  const angle=(i+.5)/10*Math.PI*2;
  return {x:HOME_DOCK.x+Math.sin(angle)*2.35,y:.22,z:HOME_DOCK.z+Math.cos(angle)*2.35};
});
export const atHomeDock=player=>Math.hypot(player.x-HOME_DOCK.x,player.z-HOME_DOCK.z)<=HOME_DOCK.radius;
