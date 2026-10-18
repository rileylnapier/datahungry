import test from 'node:test';
import assert from 'node:assert/strict';
import {nextPipePacket} from '../src/training-pipes.js';
import starter from '../src/starter-content.js';

test('every pipe fills to its configured cap, waits indefinitely, then replaces collected data',()=>{
  const spawns=starter.areas[0].spawns.filter(s=>s.emitter);
  assert.deepEqual(spawns.map(s=>s.count),[10,6,8,4]);
  for(const spawn of spawns){
    const pipe={interval:spawn.emitter.interval,cooldown:0,members:Array.from({length:spawn.count},()=>({wait:Infinity}))};
    const tick=dt=>{const c=nextPipePacket(pipe,dt);if(c)c.wait=0;return c;};
    for(let i=0;i<spawn.count;i++)assert.ok(tick(pipe.interval));
    for(let i=0;i<1000;i++)assert.equal(tick(60),null);
    assert.equal(pipe.members.filter(c=>c.wait===0).length,spawn.count);
    const collected=pipe.members[0];collected.wait=Infinity;
    assert.equal(tick(pipe.interval/2),null);assert.equal(tick(pipe.interval/2),collected);
    assert.equal(tick(100),null);
  }
});

test('one long frame emits at most one item and each pipe has its own capacity',()=>{
  const a={interval:2,cooldown:0,members:[{wait:Infinity},{wait:Infinity}]};
  const b={interval:2,cooldown:0,members:[{wait:0}]};
  nextPipePacket(a,100).wait=0;
  assert.equal(a.members.filter(c=>c.wait===0).length,1);
  assert.equal(nextPipePacket(a,0),null);assert.equal(nextPipePacket(b,100),null);
});
