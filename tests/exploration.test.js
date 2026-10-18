import test from 'node:test';
import assert from 'node:assert/strict';
import { createExploration } from '../src/exploration.js';
import { clampZoom, pinchZoom } from '../src/zoom.js';
import { createState, serialize, readSave, packetStats, collect, bank, used } from '../src/state.js';
import { processBase } from '../src/processing.js';
import { worldLayout } from '../src/world-layout.js';
import { validateContent } from '../src/content.js';
import starter from '../src/starter-content.js';

test('home starts revealed, distant territory stays hidden, and discovery survives reload',()=>{
  const s=createState(),layout=worldLayout(starter),fog=createExploration(s,layout);
  assert.equal(fog.known(-8,1),true);assert.equal(fog.known(12,-14),false);
  fog.reveal(12,-14);assert.equal(fog.known(12,-14),true);assert.equal(fog.known(0,-45),false);
  fog.reveal(-3,3);assert.equal(fog.known(12,-14),true);
  const restored=createExploration(readSave({getItem:()=>serialize(s)}),layout);assert.equal(restored.known(12,-14),true);
});
test('invalid exploration and zoom saves are sanitized; pinch and button zoom stay bounded',()=>{
  const s=createState({explored:['0,3','0,3',null,'<script>','999,0'],zoom:99});
  assert.deepEqual(s.explored,['0,3']);assert.equal(s.zoom,1.75);
  assert.equal(clampZoom(-10),.65);assert.equal(clampZoom(NaN),1);
  assert.equal(pinchZoom(1,100,120),1.2);assert.equal(pinchZoom(1,100,50),.65);
  assert.equal(pinchZoom(1,0,50),1);
});
test('large packets use their actual capacity, reward, download time, and analysis time',()=>{
  assert.equal(packetStats('text',3).decode,2.25);assert.equal(packetStats('image',4).value,16);
  const s=createState();for(let i=0;i<4;i++)assert.equal(collect(s,'text',false,3),true);
  assert.equal(used(s),12);assert.equal(collect(s,'text',false,3),false);
  assert.equal(bank(s),36);assert.equal(processBase(s,4),0);assert.equal(processBase(s,.5),9);
  assert.equal(s.knowledge.text,1);assert.equal(collect(s,'text',false,99),false);
});
test('each pipe has a unique identity and content rejects invalid packet sizes',()=>{
  const spawns=starter.areas[0].spawns;
  assert.equal(new Set(spawns.map(s=>s.emitter.id)).size,4);
  assert.deepEqual(spawns.filter(s=>s.creature==='text').map(s=>s.packetSize),[1,3]);
  assert.deepEqual(spawns.filter(s=>s.creature==='image').map(s=>s.packetSize),[2,4]);
  for(const mutate of [m=>m.areas[0].spawns[1].emitter.id='words',m=>m.areas[0].spawns[0].packetSize=0,m=>m.areas[0].spawns[0].packetSize=1.5]){
    const m=structuredClone(starter);mutate(m);assert.throws(()=>validateContent(m));
  }
});
