import test from 'node:test';
import assert from 'node:assert/strict';
import starter from '../src/starter-content.js';
import { validateContent } from '../src/content.js';
import { worldLayout, routeThroughGate } from '../src/world-layout.js';

test('sandbox is over five times the original area and gateway separates zones',()=>{
  const {safe,hard,gateZ,minZ,maxZ}=worldLayout(starter);
  assert.ok((safe.maxX-safe.minX)*(safe.maxZ-safe.minZ)>5*18*16.5);
  assert.ok(gateZ<safe.minZ&&gateZ>hard.maxZ);
  assert.ok(minZ<hard.minZ&&maxZ>safe.maxZ);
});
test('return routes line up with the gateway before crossing from either side',()=>{
  const {gateZ}=worldLayout(starter);
  const returning=routeThroughGate({x:18,z:gateZ-4},{x:-3,z:5},gateZ);
  assert.deepEqual(returning,[{x:0,z:gateZ-2},{x:0,z:gateZ+2},{x:-3,z:5}]);
  assert.deepEqual(routeThroughGate({x:-5,z:5},{x:8,z:-6},gateZ),[{x:8,z:-6}]);
  assert.equal(routeThroughGate({x:18,z:5},{x:0,z:gateZ-4},gateZ)[0].z,gateZ+2);
});
test('content rejects habitats outside their area and overlapping networks',()=>{
  const a=structuredClone(starter);a.areas[0].spawns[0].habitat.minX=-100;
  assert.throws(()=>validateContent(a),/habitat/);
  const b=structuredClone(starter);b.areas[1].bounds.maxZ=-20;
  assert.throws(()=>validateContent(b),/separated zones/);
});
test('training pipes have safe bounded output positions and cannot emit unbounded bursts',()=>{
  assert.equal(starter.areas[0].spawns.filter(s=>s.emitter).length,4);
  const a=structuredClone(starter);a.areas[0].spawns[0].emitter.interval=0;
  assert.throws(()=>validateContent(a),/training emitter/);
  const b=structuredClone(starter);b.areas[0].spawns[0].emitter.z=100;
  assert.throws(()=>validateContent(b),/training emitter/);
});
