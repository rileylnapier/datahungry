import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,buy,unlock,maxLevel,capacity,serialize,readSave} from '../src/state.js';
import {upgradeStorage,upgradeAnalyzer,storageCapacity,analyzerRate} from '../src/processing.js';

test('equipping the vat opens higher Byte and base tiers without resetting purchases',()=>{
  const s=createState({points:1000000,total:1000,knowledge:{text:60,image:8},levels:{capacity:5,range:5,decode:5,parallel:3},base:{imageMuncher:true,storageLevels:{text:3,image:3},speedLevel:3},trial:{started:true,text:6,image:4}});
  for(const id of ['capacity','range','decode','parallel'])assert.equal(buy(s,id),false);
  assert.equal(upgradeAnalyzer(s),false);
  const points=s.points;assert.equal(unlock(s),true);assert.equal(s.points,points);
  assert.equal(capacity(s),42);assert.equal(storageCapacity(s,'text'),144);assert.equal(analyzerRate(s),2.5);
  for(const id of ['capacity','range','decode','parallel'])while(s.levels[id]<maxLevel(id,s))assert.equal(buy(s,id),true);
  for(const type of ['text','image'])for(let i=0;i<3;i++)assert.equal(upgradeStorage(s,type),true);
  for(let i=0;i<3;i++)assert.equal(upgradeAnalyzer(s),true);
  assert.equal(capacity(s),60);assert.equal(storageCapacity(s,'image'),264);assert.equal(analyzerRate(s),4);
  assert.equal(upgradeAnalyzer(s),false);assert.equal(buy(s,'capacity'),false);
  const restored=readSave({getItem:()=>serialize(s)});
  assert.deepEqual(restored.levels,s.levels);assert.deepEqual(restored.base,s.base);assert.equal(restored.points,s.points);
});
