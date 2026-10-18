// Each pipe owns a fixed pool: collecting returns a slot for the next emission.
export function nextPipePacket(pipe,dt){
  const packet=pipe.members.find(c=>c.wait>0);
  if(!packet){pipe.cooldown=pipe.interval;return null;}
  pipe.cooldown-=Math.max(0,dt);
  if(pipe.cooldown>0)return null;
  // Never catch up missed emissions after a pause or long frame.
  pipe.cooldown=pipe.interval;
  return packet;
}
