// Exponential response stays consistent across frame rates. Braking is firmer
// than acceleration so a thumb release feels deliberate, with just a little roll.
export function steerVelocity(player, x, z, dt, speed=4.4) {
  const magnitude=Math.hypot(x,z), divisor=Math.max(1,magnitude);
  const blend=1-Math.exp(-dt*(magnitude>.01?12:16));
  player.vx+=(x/divisor*speed-player.vx)*blend;
  player.vz+=(z/divisor*speed-player.vz)*blend;
  if(Math.hypot(player.vx,player.vz)<.015){player.vx=0;player.vz=0;}
}
