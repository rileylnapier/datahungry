import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,packetStats,collect,bank,serialize,readSave} from '../src/state.js';
import {processBase} from '../src/processing.js';
import {validateContent} from '../src/content.js';
import starter from '../src/starter-content.js';

test('large sandbox files have long downloads, high payouts and matching content definitions',()=>{
  for(const [profile,type,decode,value] of [['full_book','text',45,120],['image_4k','image',60,160]]){
    const stats=packetStats(type,12,profile);
    assert.equal(stats.decode,decode);assert.equal(stats.value,value);
    assert.equal(packetStats(type,1,profile),null);
    assert.equal(packetStats(type==='text'?'image':'text',12,profile),null);
    const spawn=starter.areas[0].spawns.find(s=>s.profile===profile);
    assert.equal(spawn.count,1);assert.equal(spawn.packetSize,12);assert.equal(spawn.creature,type);
    const invalid=structuredClone(starter);invalid.areas[0].spawns.find(s=>s.profile===profile).packetSize=2;
    assert.throws(()=>validateContent(invalid));
  }
});

test('large files fit an empty starter context, persist in analysis, and pay once',()=>{
  for(const [profile,type,value] of [['full_book','text',120],['image_4k','image',160]]){
    let s=createState();assert.equal(collect(s,type,false,12,profile),true);
    assert.equal(collect(s,'text'),false);assert.equal(bank(s),value);
    assert.equal(s.points,0);processBase(s,1);
    s=readSave({getItem:()=>serialize(s)});
    assert.equal(s.base.basic.profile,profile);
    assert.equal(processBase(s,30),value);assert.equal(s.knowledge[type],1);
    assert.equal(s.base.libraryUsed[type],12);assert.equal(processBase(s,30),0);
    s=readSave({getItem:()=>serialize(s)});assert.equal(s.points,value);
  }
});

test('large file payouts remain available when the library is full',()=>{
  const s=createState({knowledge:{text:24},base:{libraryUsed:{text:24,image:0}}});
  collect(s,'text',false,12,'full_book');bank(s);processBase(s,20);
  assert.equal(s.points,120);assert.equal(s.knowledge.text,24);
  assert.equal(s.base.libraryUsed.text,24);
});
