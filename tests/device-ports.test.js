import test from 'node:test';
import assert from 'node:assert/strict';
import {DEVICE_PORTS,devicePort} from '../src/device-ports.js';
import {STORY_SITES} from '../src/story.js';

test('each device can connect from its approach but never remotely or while moving',()=>{
  assert.equal(DEVICE_PORTS.home,undefined);
  for(const [id,port] of Object.entries(DEVICE_PORTS)){
    const player={...STORY_SITES[id].approach,vx:0,vz:0};
    assert.ok([port.x,port.y,port.z].every(Number.isFinite));
    assert.equal(devicePort(id,player),port);
    assert.equal(devicePort(id,{...player,x:player.x+20}),null);
    assert.equal(devicePort(id,{...player,vx:1}),null);
  }
  assert.equal(devicePort(null,{x:4,z:3}),null);
  assert.equal(devicePort('unknown',{x:4,z:3}),null);
});
