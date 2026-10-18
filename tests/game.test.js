import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, collect, bank, used, buy, capacity, unlock, defeat, serialize, readSave, configureContent, cost, collectHallucination, noise } from '../src/state.js';
import { validateContent, loadContent } from '../src/content.js';
import starter from '../src/starter-content.js';
import { processBase } from '../src/processing.js';
import { connections, upgradeUnlocked, range } from '../src/state.js';

test('parallel downloads unlock later and range never adds connections',()=>{
  const s=createState({points:500}),reach=range(s);
  assert.equal(connections(s),1);
  assert.equal(buy(s,'range'),true);
  assert.ok(range(s)>reach);
  assert.equal(connections(s),1);
  const points=s.points;
  assert.equal(upgradeUnlocked(s,'parallel'),false);
  assert.equal(buy(s,'parallel'),false);
  assert.equal(s.points,points);
  s.total=60;
  assert.equal(upgradeUnlocked(s,'parallel'),true);
  assert.equal(cost(s,'parallel'),60);
  assert.equal(buy(s,'parallel'),true);
  assert.equal(connections(s),2);
  assert.equal(cost(s,'parallel'),102);
  assert.equal(buy(s,'parallel'),true);
  assert.equal(connections(s),3);
  assert.equal(buy(s,'parallel'),true);
  assert.equal(connections(s),4);
  assert.equal(buy(s,'parallel'),false);
  assert.equal(connections(readSave({getItem:()=>serialize(s)})),4);
});
test('old saves start with one connection and malformed parallel levels are clamped',()=>{
  assert.equal(connections(createState({levels:{range:5}})),1);
  assert.equal(connections(createState({levels:{parallel:999}})),4);
  assert.equal(connections(createState({levels:{parallel:'oops'}})),1);
});
test('parallel content prices and unlock milestones are validated',()=>{
  for(const mutate of [m=>delete m.upgrades.parallel,m=>m.upgrades.parallel.base=-1,m=>delete m.balance.parallelTraining]){
    const m=structuredClone(starter);mutate(m);assert.throws(()=>validateContent(m));
  }
});

test('collection respects capacity, drop-off empties cargo, and processing pays exactly once',()=>{const s=createState();for(let i=0;i<4;i++)assert.equal(collect(s,'code'),true);assert.equal(used(s),12);assert.equal(collect(s,'text'),false);assert.equal(bank(s),60);assert.equal(s.points,0);assert.equal(bank(s),0);assert.equal(processBase(s,18),60);assert.equal(s.points,60);assert.equal(processBase(s,18),0);assert.equal(used(s),0);});
test('upgrade spending, increasing prices, max level, and gateway requirements',()=>{const s=createState();assert.equal(buy(s,'capacity'),false);s.points=1000;assert.equal(unlock(s),false);assert.equal(buy(s,'capacity'),true);assert.equal(capacity(s),18);assert.equal(cost(s,'capacity'),41);assert.equal(buy(s,'range'),true);assert.equal(unlock(s),false);s.total=120;assert.equal(unlock(s),false);s.knowledge.text=60;assert.equal(unlock(s),false);s.trial=createState({trial:{started:true,text:6,image:4}}).trial;assert.equal(unlock(s),true);const p=s.points;assert.equal(unlock(s),false);assert.equal(s.points,p);s.levels.capacity=8;assert.equal(buy(s,'capacity'),false);assert.equal(buy(s,'unknown'),false);});
test('defeat loses part of current haul and preserves banked progress',()=>{const s=createState({points:42,levels:{range:2},unlocked:true});for(let i=0;i<4;i++)collect(s,'code',true);assert.equal(defeat(s),60);assert.equal(used(s),6);assert.equal(s.points,42);assert.equal(s.levels.range,2);assert.equal(s.unlocked,true);assert.equal(s.health,100);});
test('save roundtrip retains permanent progress but starts a fresh run',()=>{const s=createState({points:87,levels:{capacity:2},banks:3});collect(s,'text');const loaded=readSave({getItem:()=>serialize(s)});assert.equal(loaded.points,87);assert.equal(loaded.levels.capacity,2);assert.equal(used(loaded),0);assert.equal(loaded.banks,3);});
test('corrupt and unavailable saves recover safely',()=>{assert.equal(readSave({getItem:()=>'{broken'}).points,0);assert.equal(readSave({getItem:()=>{throw Error();}}).points,0);assert.equal(createState(null).points,0);const s=createState({points:-10,levels:{capacity:999,range:'oops'}});assert.equal(s.points,0);assert.equal(s.levels.capacity,8);assert.equal(s.levels.range,0);});
test('hallucinations consume context without rewards, dock purges, clarity filters',()=>{const s=createState();assert.equal(collectHallucination(s,3),true);assert.equal(used(s),3);assert.equal(noise(s),3);collect(s,'image');assert.equal(bank(s),8);assert.equal(noise(s),0);s.levels.clarity=3;assert.equal(collectHallucination(s),false);assert.equal(used(s),0);s.points=1000;assert.equal(buy(s,'clarity'),false);});
test('local manifest is valid and config drives economy',()=>{assert.equal(validateContent(starter),starter);const m=structuredClone(starter);m.creatures.text.value=7;m.upgrades.capacity.base=40;configureContent(m);const s=createState();collect(s,'text');assert.equal(bank(s),7);assert.equal(cost(s,'capacity'),40);configureContent(starter);});
test('reject unknown behavior, excessive spawns, invalid phases, HTML names, future app, disabled content',()=>{for(const mutate of [m=>m.bosses[0].phases[0].behaviors[0].type='eval',m=>m.areas[0].spawns[0].count=900,m=>m.bosses[0].phases[1].untilHealth=.9,m=>m.areas[0].name='<img onerror=alert(1)>',m=>m.minimumAppVersion='99.0.0',m=>m.disabled=true]){const m=structuredClone(starter);mutate(m);assert.throws(()=>validateContent(m));}});
test('loader returns validated data and falls back after bad JSON or offline failure',async()=>{const good=await loadContent('test',async()=>({ok:true,text:async()=>JSON.stringify(starter)}));assert.equal(good.contentVersion,starter.contentVersion);assert.equal(good.fallback,undefined);for(const fetcher of [async()=>{throw Error('offline');},async()=>({ok:true,text:async()=>'{broken'}),async()=>({ok:false})]){const c=await loadContent('test',fetcher);assert.equal(c.fallback,true);assert.equal(c.areas[0].id,'localhost');}});
