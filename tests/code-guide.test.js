import test from 'node:test';
import assert from 'node:assert/strict';
import {codeGuide,deviceApproach} from '../src/code-guide.js';
import {debugPreset} from '../src/debug.js';
import {buildProgram,codeAvailable,visitDevice} from '../src/chapter.js';
import {collect,bank} from '../src/state.js';
import {processBase} from '../src/processing.js';
import {buyProgram} from '../src/network-programs.js';
import {NETWORK_DEVICES,solidObstacles,worldLayout} from '../src/world-layout.js';
import {planPath,overlapsCircle} from '../src/collision.js';
import starter from '../src/starter-content.js';
test('code is available on network entry without Photo Sorter or cat/dog quotas',()=>{
  assert.equal(codeGuide(debugPreset('sandbox')),null);
  const s=debugPreset('network');assert.match(codeGuide(s).title,/Safe code/);
  assert.deepEqual(codeGuide(s).destination,deviceApproach('developer'));
  assert.equal(s.base.photoSorter,false);assert.equal(s.samples.cat,0);
  assert.equal(codeAvailable(s),true);assert.equal(visitDevice(s,'developer'),true);
  assert.match(codeGuide(s).detail,/Starter Analyzer/);
  for(let i=0;i<6;i++)assert.equal(collect(s,'code',false,3,'routing'),true);
  bank(s);processBase(s,100);assert.equal(s.knowledge.code,6);
  assert.equal(buyProgram(s,'courier'),true);
});
test('every mapped device approach is clear for the largest vat and activates the device',()=>{
  const obstacles=solidObstacles(starter,{imageMuncher:true}),layout=worldLayout(starter),r=1.54;
  for(const [id,d] of Object.entries(NETWORK_DEVICES)){
    const goal=deviceApproach(id);assert.ok(Math.hypot(goal.x-d.x,goal.z-d.z)<4.5);
    assert.ok(!obstacles.some(b=>overlapsCircle(goal,b,r)));
    const path=planPath({x:0,z:-44},goal,layout,obstacles,r);assert.ok(path.length);assert.deepEqual(path.at(-1),goal);
  }
});
