import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, collect, collectHallucination, bank, serialize, readSave, defeat, unlock } from '../src/state.js';
import { processBase, processingSummary, buildImageMuncher, autoDropOff, upgradeAnalyzer, picturesUnlocked, feedAvailable, storageUsed, storageCapacity, storageCost, upgradeStorage } from '../src/processing.js';
import { validateContent } from '../src/content.js';
import starter from '../src/starter-content.js';

test('walking onto home unloads once without spending points or learning early',()=>{
  const s=createState();collect(s,'text');
  assert.equal(autoDropOff(s,{x:0,z:5}),null);
  assert.deepEqual(autoDropOff(s,{x:-3,z:5}),{count:1,value:3,items:[{type:'text',size:1,value:3}],remaining:0});
  assert.equal(s.cargo.length,0);assert.equal(s.points,0);assert.equal(s.knowledge.text,0);
  assert.equal(autoDropOff(s,{x:-3,z:5}),null);assert.equal(s.base.queue.length,1);
  processBase(s,1.5);assert.equal(s.knowledge.text,1);assert.equal(s.points,3);
});
test('speed purchase accelerates an existing job and knowledge is never spent',()=>{
  const s=createState({points:24,knowledge:{text:4}});collect(s,'text');bank(s);processBase(s,.5);
  assert.equal(upgradeAnalyzer(s),true);assert.equal(s.points,0);assert.equal(s.knowledge.text,4);
  assert.equal(processBase(s,2/3),3);assert.equal(s.knowledge.text,5);
  const saved=readSave({getItem:()=>serialize(s)});assert.equal(saved.base.speedLevel,1);assert.equal(saved.knowledge.text,5);
});
test('text milestone unlocks picture feed and specialist; the starter also learns images',()=>{
  const s=createState({points:100,knowledge:{text:59}});
  assert.equal(feedAvailable(s,'text'),true);assert.equal(feedAvailable(s,'image'),false);assert.equal(feedAvailable(s,'code'),false);
  assert.equal(buildImageMuncher(s),false);
  collect(s,'text');collect(s,'image');bank(s);processBase(s,1.5);
  assert.equal(s.knowledge.image,0);assert.equal(s.knowledge.text,60);
  assert.equal(picturesUnlocked(s),true);assert.equal(feedAvailable(s,'image'),true);
  assert.equal(processingSummary(s).count,1);assert.equal(buildImageMuncher(s),true);
  processBase(s,3);assert.equal(s.knowledge.image,1);assert.equal(processingSummary(s).count,0);
});
test('older image addon is refunded once and its queued pictures remain safe',()=>{
  const s=createState({points:10,levels:{range:2},base:{imageMuncher:true,image:{type:'image',size:2,value:8,duration:1,remaining:.5}}});
  assert.equal(s.points,90);assert.equal(s.base.imageMuncher,false);assert.equal(s.levels.range,2);assert.equal(s.base.queue.length,1);
  const restored=readSave({getItem:()=>serialize(s)});assert.equal(restored.points,90);assert.equal(restored.base.queue.length,1);
});

test('starter haul takes 18 seconds and pays incrementally, with no drop-off payout',()=>{
  const s=createState();for(let i=0;i<12;i++)collect(s,'text');
  assert.equal(bank(s),36);assert.equal(s.points,0);assert.equal(s.total,0);assert.equal(s.cargo.length,0);
  assert.equal(processBase(s,1),0);assert.equal(processBase(s,.5),3);
  assert.equal(processingSummary(s).count,11);
  assert.equal(processBase(s,16.5),33);assert.equal(s.points,36);assert.equal(s.total,36);
  assert.equal(processBase(s,100),0);assert.equal(processingSummary(s).count,0);
});
test('image addon costs once and processes pictures concurrently at three times the speed',()=>{
  const s=createState({points:79,knowledge:{text:60}});assert.equal(buildImageMuncher(s),false);
  s.points=80;assert.equal(buildImageMuncher(s),true);assert.equal(s.points,0);assert.equal(buildImageMuncher(s),false);
  collect(s,'code');collect(s,'image');collect(s,'image');bank(s);
  assert.equal(processBase(s,1),8);assert.equal(s.base.basic.type,'code');
  assert.equal(processBase(s,1),8);assert.equal(s.base.basic.remaining,2.5);
  assert.equal(processBase(s,2.5),15);assert.equal(s.total,31);
});
test('processing gives identical results for large and frame-sized time steps',()=>{
  const a=createState({points:80,knowledge:{text:60}});buildImageMuncher(a);collect(a,'image');collect(a,'text');collect(a,'code');collect(a,'image');bank(a);
  const b=readSave({getItem:()=>serialize(a)});
  processBase(a,3);for(let i=0;i<180;i++)processBase(b,1/60);
  assert.equal(a.points,b.points);assert.equal(a.total,b.total);
  assert.equal(processingSummary(a).count,processingSummary(b).count);
  assert.ok(Math.abs(a.base.basic.remaining-b.base.basic.remaining)<1e-7);
});
test('unfinished jobs survive reload and defeat without duplicate payments',()=>{
  let s=createState();collect(s,'text');collect(s,'code');bank(s);processBase(s,1);
  s=readSave({getItem:()=>serialize(s)});assert.equal(s.base.basic.remaining,.5);assert.equal(s.base.queue.length,1);
  collect(s,'text');defeat(s);assert.equal(processingSummary(s).count,2);
  assert.equal(processBase(s,5),18);assert.equal(s.total,18);
  const saved=serialize(s);s=readSave({getItem:()=>saved});assert.equal(processBase(s,60),0);assert.equal(s.points,18);
});
test('fake data is purged at drop-off and pending points do not pass the benchmark',()=>{
  const s=createState({trial:{started:true,text:5,image:4},total:119,knowledge:{text:59},levels:{capacity:2}});collectHallucination(s,3);collect(s,'text');bank(s);
  assert.equal(processingSummary(s).count,1);assert.equal(unlock(s),false);
  processBase(s,1.5);assert.equal(unlock(s),false); // Analysis cannot complete the swipe benchmark.
});
test('old or malformed base saves recover and content rejects invalid processing settings',()=>{
  const s=createState({base:{queue:[null,{type:'noise',size:1,value:3}],basic:{type:'text',size:1,value:3,duration:1,remaining:-1}}});
  assert.equal(processingSummary(s).count,0);assert.equal(s.base.imageMuncher,false);
  for(const mutate of [m=>delete m.processing,m=>m.processing.secondsPerKB=0,m=>m.processing.imageMuncherCost=-1,m=>m.processing.imageSecondsPerKB=99]){
    const m=structuredClone(starter);mutate(m);assert.throws(()=>validateContent(m));
  }
});


test('libraries retain completed files; full libraries still unload and pay points',()=>{
  const s=createState({knowledge:{text:24},base:{libraryUsed:{text:24,image:0}},levels:{capacity:5}});
  collect(s,'text',false,3);collect(s,'image',false,4);collectHallucination(s);
  const delivery=autoDropOff(s,{x:-3,z:5});
  assert.equal(delivery.value,25);assert.equal(delivery.items.length,2);assert.equal(delivery.remaining,0);
  assert.equal(s.cargo.length,0);assert.equal(storageUsed(s,'image'),0);
  const outputs=[];processBase(s,20,(item,id,retained)=>outputs.push([item.type,retained]));
  assert.equal(s.points,25);assert.equal(s.knowledge.text,24);assert.equal(storageUsed(s,'text'),24);
  assert.equal(s.knowledge.image,1);assert.equal(storageUsed(s,'image'),4);
  assert.deepEqual(outputs,[['text',false],['image',true]]);
});
test('storage costs only points and remains expandable past both former stage caps',()=>{
  const s=createState({points:29,knowledge:{text:10}});
  assert.equal(upgradeStorage(s,'text'),false);s.points=30;
  assert.equal(upgradeStorage(s,'text'),true);assert.equal(s.points,0);
  assert.equal(storageCapacity(s,'text'),48);assert.equal(storageCapacity(s,'image'),24);
  assert.equal(s.knowledge.text,10);assert.equal(s.levels.capacity,0);
  assert.equal(storageCost(s,'text'),54);s.points=100000;
  assert.equal(upgradeStorage(s,'image'),true);assert.equal(upgradeStorage(s,'oops'),false);
  for(let i=0;i<7;i++)assert.equal(upgradeStorage(s,'text'),true);
  const restored=readSave({getItem:()=>serialize(s)});
  assert.equal(storageCapacity(restored,'text'),216);assert.equal(storageCapacity(restored,'image'),48);
  assert.equal(restored.knowledge.text,10);assert.equal(restored.points,s.points);
});
test('legacy over-capacity queues drain completely, retain what fits, and always pay',()=>{
  const items=Array.from({length:30},()=>({type:'text',size:1,value:3}));
  const s=createState({base:{queue:items,storageLevels:{text:-1,image:'bad'}}});
  assert.equal(storageUsed(s,'text'),0);assert.equal(storageCapacity(s,'text'),24);
  collect(s,'text');assert.equal(bank(s),3);assert.equal(s.cargo.length,0);
  processBase(s,60);assert.equal(s.knowledge.text,24);assert.equal(s.points,93);
  assert.equal(storageUsed(s,'text'),24);assert.equal(processingSummary(s).count,0);
});

test('only completed analysis sends data to the matching output folder',()=>{
  const s=createState({knowledge:{text:60},base:{imageMuncher:true}}),outputs=[];
  collect(s,'text');collect(s,'image');bank(s);
  const completed=(item,id)=>outputs.push({item,id});
  processBase(s,.5,completed);assert.equal(outputs.length,0);
  processBase(s,.5,completed);
  assert.deepEqual(outputs,[{item:{type:'image',size:2,value:8},id:'image'}]);
  processBase(s,.5,completed);
  assert.deepEqual(outputs[1],{item:{type:'text',size:1,value:3},id:'basic'});
  processBase(s,10,completed);assert.equal(outputs.length,2);
});

test('zero points and a full image library can earn expansion, then resume learning',()=>{
  let s=createState({knowledge:{text:60,image:12},base:{libraryUsed:{text:60,image:24}}});
  for(let i=0;i<4;i++)assert.equal(collect(s,'image'),true);
  assert.equal(autoDropOff(s,{x:-3,z:5}).count,4);assert.equal(s.cargo.length,0);
  processBase(s,12);assert.equal(s.points,32);assert.equal(s.knowledge.image,12);
  assert.equal(storageUsed(s,'image'),24);assert.equal(s.base.imageMuncher,false);
  s=readSave({getItem:()=>serialize(s)});
  assert.equal(upgradeStorage(s,'image'),true);assert.equal(s.points,2);
  assert.equal(s.knowledge.image,12);assert.equal(storageCapacity(s,'image'),48);
  collect(s,'image');bank(s);processBase(s,3);
  assert.equal(s.points,10);assert.equal(s.knowledge.image,13);assert.equal(storageUsed(s,'image'),26);
});

test('starter image progress survives reload and specialist purchase without restarting or double paying',()=>{
  let s=createState({knowledge:{text:60},points:80});
  collect(s,'image');collect(s,'image');collect(s,'text');bank(s);processBase(s,1);
  assert.equal(s.base.basic.remaining,2);
  s=readSave({getItem:()=>serialize(s)});
  assert.equal(s.base.basic.type,'image');assert.equal(s.base.basic.remaining,2);
  assert.equal(buildImageMuncher(s),true);
  const outputs=[];
  processBase(s,1,(item,id)=>outputs.push([item.type,id]));
  assert.deepEqual(outputs,[['image','image']]);assert.equal(s.base.basic.remaining,1);
  processBase(s,1,(item,id)=>outputs.push([item.type,id]));
  assert.deepEqual(outputs,[['image','image'],['image','basic']]);
  processBase(s,1.5);assert.equal(s.knowledge.image,2);assert.equal(s.points,19);
  assert.equal(processBase(s,60),0);assert.equal(processingSummary(s).count,0);
});

test('starter handles mixed images, text and code in queue order with frame-independent payouts',()=>{
  const a=createState({knowledge:{text:60}});
  collect(a,'image');collect(a,'text');collect(a,'code');bank(a);
  const b=readSave({getItem:()=>serialize(a)}),outputs=[];
  assert.equal(processBase(a,9,(item,id)=>outputs.push([item.type,id])),26);
  for(let i=0;i<540;i++)processBase(b,1/60);
  assert.deepEqual(outputs,[['image','basic'],['text','basic'],['code','basic']]);
  assert.equal(a.points,b.points);assert.deepEqual(a.knowledge,b.knowledge);
  assert.equal(processingSummary(a).count,0);assert.equal(processingSummary(b).count,0);
});

test('specialist also pays points without teaching when library is full',()=>{
  const s=createState({knowledge:{text:60,image:12},base:{imageMuncher:true}});
  collect(s,'image');bank(s);assert.equal(s.cargo.length,0);
  assert.equal(processBase(s,1),8);assert.equal(storageUsed(s,'image'),24);
  assert.equal(s.knowledge.image,12);assert.equal(collect(s,'text'),true);
});

test('full libraries do not advance cat/dog unlocks; expansion resumes them',()=>{
  let s=createState({unlocked:true,network:{libraryGranted:true},points:100,knowledge:{text:60,image:12},base:{imageMuncher:true},samples:{cat:5,dog:6}});
  collect(s,'image',false,2,'cat');bank(s);processBase(s,1);
  assert.equal(s.samples.cat,5);assert.equal(s.knowledge.image,12);assert.equal(s.points,108);
  assert.equal(upgradeStorage(s,'image'),true);
  collect(s,'image',false,2,'cat');bank(s);processBase(s,.5);
  s=readSave({getItem:()=>serialize(s)});processBase(s,.5);
  assert.equal(s.samples.cat,6);assert.equal(s.knowledge.image,13);assert.equal(storageUsed(s,'image'),26);
  const after=s.points;processBase(s,30);assert.equal(s.points,after);
});
test('concurrent workers cannot overfill the last library slot; frame sizes agree',()=>{
  const a=createState({knowledge:{text:23},base:{autoSort:true}});
  collect(a,'text');collect(a,'text');bank(a);
  const b=readSave({getItem:()=>serialize(a)});
  processBase(a,3);for(let i=0;i<180;i++)processBase(b,1/60);
  assert.equal(a.points,6);assert.equal(a.knowledge.text,24);assert.equal(storageUsed(a,'text'),24);
  assert.deepEqual(a.knowledge,b.knowledge);assert.deepEqual(a.base,b.base);assert.equal(b.points,6);
});
test('file bytes determine fit, knowledge counts retained examples, and recycling is final',()=>{
  const s=createState({knowledge:{text:22},points:100});
  collect(s,'text',false,3);collect(s,'text',false,1);bank(s);processBase(s,6);
  assert.equal(s.points,112);assert.equal(s.knowledge.text,23);assert.equal(storageUsed(s,'text'),23);
  upgradeStorage(s,'text');processBase(s,100);assert.equal(s.knowledge.text,23);
  collect(s,'text',false,3);bank(s);processBase(s,4.5);
  assert.equal(s.knowledge.text,24);assert.equal(storageUsed(s,'text'),26);
  const restored=readSave({getItem:()=>serialize(s)});assert.equal(storageUsed(restored,'text'),26);
});
test('legacy knowledge and purchases are preserved with enough grandfathered library space',()=>{
  let s=createState({points:400,knowledge:{text:1234,image:987,code:5},samples:{cat:9,dog:10},unlocked:true,base:{storageLevels:{text:3,image:6},imageMuncher:true,photoSorter:true,queue:[{type:'image',size:4,value:16}]}});
  const snapshot=serialize(s);
  assert.equal(storageUsed(s,'text'),1234);assert.equal(storageUsed(s,'image'),1974);
  assert.ok(storageCapacity(s,'text')>=1234);assert.ok(storageCapacity(s,'image')>=1974);
  assert.equal(s.base.storageLevels.text,3);assert.equal(s.samples.cat,9);assert.equal(s.base.queue.length,1);
  s=readSave({getItem:()=>snapshot});assert.equal(serialize(s),snapshot);
  const capacityBefore=storageCapacity(s,'text');assert.equal(upgradeStorage(s,'text'),true);
  assert.equal(storageCapacity(s,'text'),capacityBefore+24);assert.equal(s.knowledge.text,1234);
});
test('paragraph-only sandbox runs can always buy enough storage to unlock pictures',()=>{
  const s=createState();
  for(let i=0;i<300&&!picturesUnlocked(s);i++){
    collect(s,'text',false,3);bank(s);processBase(s,4.5);
    if(storageCapacity(s,'text')-storageUsed(s,'text')<3)upgradeStorage(s,'text');
  }
  assert.equal(picturesUnlocked(s),true);assert.equal(s.knowledge.text,60);
  assert.ok(s.base.storageLevels.text>3);assert.equal(storageUsed(s,'text'),180);
});

test('media feeds unlock with the email; queued clips survive reload and teach through full libraries',()=>{
  let s=createState({unlocked:true,base:{libraryUsed:{text:24,image:24}}});
  assert.equal(feedAvailable(s,'audio'),false);assert.equal(feedAvailable(s,'video'),false);
  s.story.done.email=true;assert.equal(feedAvailable(s,'audio'),true);assert.equal(feedAvailable(s,'video'),true);
  assert.equal(feedAvailable(s,'unknown'),false);
  collect(s,'audio');collect(s,'video');bank(s);processBase(s,1);s=readSave({getItem:()=>serialize(s)});
  assert.equal(processingSummary(s).types.audio,1);assert.equal(processingSummary(s).types.video,1);
  assert.equal(processBase(s,100),42);assert.equal(s.knowledge.audio,1);assert.equal(s.knowledge.video,1);assert.equal(processBase(s,100),0);
  assert.equal(createState().knowledge.audio,0);
});
