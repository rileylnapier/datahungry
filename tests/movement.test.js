import test from 'node:test';
import assert from 'node:assert/strict';
import { steerVelocity } from '../src/movement.js';

test('steering accelerates quickly without snapping to maximum speed',()=>{
  const p={vx:0,vz:0};steerVelocity(p,1,0,1/60);
  assert.ok(p.vx>0&&p.vx<4.4);
  for(let i=0;i<14;i++)steerVelocity(p,1,0,1/60);
  assert.ok(p.vx>4.1&&p.vx<=4.4);
});
test('thumb release brakes within a quarter second, diagonal input has no speed advantage',()=>{
  const p={vx:4.4,vz:0};steerVelocity(p,0,0,.25);assert.ok(p.vx<.1&&p.vx>0);
  const diagonal={vx:0,vz:0};for(let i=0;i<60;i++)steerVelocity(diagonal,1,1,1/60);
  assert.ok(Math.hypot(diagonal.vx,diagonal.vz)<=4.4);
});
test('velocity response is the same at 30 and 120 frames per second',()=>{
  const a={vx:0,vz:0},b={vx:0,vz:0};
  for(let i=0;i<30;i++)steerVelocity(a,.5,-1,1/30);
  for(let i=0;i<120;i++)steerVelocity(b,.5,-1,1/120);
  assert.ok(Math.abs(a.vx-b.vx)<1e-9&&Math.abs(a.vz-b.vz)<1e-9);
});
