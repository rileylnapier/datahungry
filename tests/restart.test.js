import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,readSave,serialize,SAVE_KEY,connections,buy,upgradeUnlocked} from '../src/state.js';
import {restartProgress,restoreProgress,hasRestartBackup,BACKUP_KEY} from '../src/restart.js';
test('restart begins with one sprout and preserves a restorable permanent-progress backup',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const previous=createState({points:1234,total:4000,unlocked:true,knowledge:{text:90,image:30},levels:{parallel:6}});
  storage.setItem(SAVE_KEY,serialize(previous));restartProgress(storage,previous);
  const fresh=readSave(storage);assert.equal(connections(fresh),1);assert.equal(fresh.points,0);assert.equal(fresh.unlocked,false);assert.equal(fresh.knowledge.text,0);
  assert.equal(hasRestartBackup(storage),true);restoreProgress(storage);
  assert.equal(readSave(storage).points,1234);assert.equal(connections(readSave(storage)),7);assert.equal(readSave(storage).knowledge.image,30);
  assert.ok(storage.getItem(BACKUP_KEY));
});
test('brain stops at four sprouts; the vat unlocks six further purchases and saves all ten',()=>{
  const s=createState({points:100000,total:100000});
  for(let i=0;i<3;i++)assert.equal(buy(s,'parallel'),true);
  assert.equal(connections(s),4);assert.equal(upgradeUnlocked(s,'parallel'),false);
  const points=s.points;assert.equal(buy(s,'parallel'),false);assert.equal(s.points,points);
  s.unlocked=true;for(let i=0;i<6;i++)assert.equal(buy(s,'parallel'),true);
  assert.equal(connections(s),10);assert.equal(buy(s,'parallel'),false);
  assert.equal(connections(readSave({getItem:()=>serialize(s)})),10);
  s.unlocked=false;assert.equal(connections(s),4);assert.equal(s.levels.parallel,9);
});
test('a failed restart write does not clear the existing save',()=>{
  const old=serialize(createState({points:77}));const data=new Map([[SAVE_KEY,old]]);
  const storage={getItem:k=>data.get(k),setItem(k,v){if(k===SAVE_KEY)throw Error('quota');data.set(k,v);}};
  assert.throws(()=>restartProgress(storage,createState({points:77})),/quota/);
  assert.equal(data.get(SAVE_KEY),old);
});
