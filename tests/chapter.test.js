import {BENCHMARK,benchmarkCard,answerBenchmark,benchmarkScore} from '../src/benchmark.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, collect, bank, unlock, serialize, readSave } from '../src/state.js';
import { CHAPTER, sandboxReady, startTrial, trialPassed, buildProgram, codeAvailable, visitDevice } from '../src/chapter.js';
import { processBase, processingSummary } from '../src/processing.js';
import { validateContent } from '../src/content.js';
import starter from '../src/starter-content.js';

const ready=()=>createState({knowledge:{text:CHAPTER.sandboxText,image:CHAPTER.sandboxImages}});
test('swipe benchmark resumes after reload, cannot advance through collecting, and grants the vat once',()=>{
  let s=ready();assert.equal(startTrial(createState()),false);
  assert.equal(startTrial(s),true);assert.equal(startTrial(s),false);
  collect(s,'text');collect(s,'image');bank(s);processBase(s,30);
  assert.equal(s.trial.answers.length,0);assert.equal(trialPassed(s),false);
  const id=s.trial.deck[0],card=benchmarkCard(id);
  assert.equal(answerBenchmark(s,id,card.answer).matched,true);
  assert.equal(answerBenchmark(s,id,card.answer),null);
  assert.equal(answerBenchmark(s,s.trial.deck[1],'fox'),null);
  s=readSave({getItem:()=>serialize(s)});assert.equal(s.trial.answers.length,1);
  for(const id of s.trial.deck.slice(1))answerBenchmark(s,id,benchmarkCard(id).answer);
  assert.equal(benchmarkScore(s.trial).correct,12);assert.equal(trialPassed(s),true);
  assert.equal(startTrial(s),false);const points=s.points;
  assert.equal(unlock(s),true);assert.equal(unlock(s),false);assert.equal(s.points,points);
  assert.equal(readSave({getItem:()=>serialize(s)}).unlocked,true);
});
test('benchmark requires every category, offers free retries, and preserves best score',()=>{
  const s=ready();startTrial(s);
  // Ten correct is insufficient if two paragraphs were misclassified.
  let mistakes=0;
  for(const id of s.trial.deck){const c=benchmarkCard(id),wrong=c.kind==='paragraph'&&mistakes++<2;answerBenchmark(s,id,wrong?(c.answer==='cat'?'dog':'cat'):c.answer);}
  assert.equal(benchmarkScore(s.trial).correct,10);assert.equal(trialPassed(s),false);assert.equal(unlock(s),false);
  assert.equal(s.trial.best,10);const before=JSON.stringify({points:s.points,knowledge:s.knowledge,base:s.base});
  assert.equal(startTrial(s),true);assert.equal(s.trial.answers.length,0);assert.equal(s.trial.best,10);
  assert.equal(JSON.stringify({points:s.points,knowledge:s.knowledge,base:s.base}),before);
  let missed=new Set();for(const id of s.trial.deck){const c=benchmarkCard(id),wrong=c.kind!=='paragraph'&&!missed.has(c.kind);if(wrong)missed.add(c.kind);answerBenchmark(s,id,wrong?(c.answer==='cat'?'dog':'cat'):c.answer);}
  assert.equal(benchmarkScore(s.trial).correct,10);assert.equal(trialPassed(s),true);
});
test('malformed attempts reset safely; earned legacy rewards and unlocked saves survive',()=>{
  const s=ready();startTrial(s);const good=structuredClone(s.trial);
  for(const bad of [{...good,deck:['oops']},{...good,answers:['fox']},{...good,deck:Array(12).fill(good.deck[0])},{...good,answers:Array(13).fill('cat')}]){
    const restored=createState({trial:bad});assert.equal(restored.trial.started,false);assert.equal(trialPassed(restored),false);
  }
  const old=createState({trial:{started:true,text:6,image:4}});assert.equal(unlock(old),true);
  assert.equal(trialPassed(createState({trial:{started:true,text:5,image:4}})),false);
  assert.equal(createState({unlocked:true}).unlocked,true);
});
test('benchmark content is balanced and rejects invalid cards, thresholds and duplicates',()=>{
  assert.equal(BENCHMARK.cards.length,12);
  for(const mutate of [m=>m.benchmark.passScore=13,m=>m.benchmark.minimumPerKind=5,m=>m.benchmark.cards[0].answer='fox',m=>m.benchmark.cards[1].id=m.benchmark.cards[0].id,m=>m.benchmark.cards[4].text='',m=>m.benchmark.cards[0].variant=3]){
    const m=structuredClone(starter);mutate(m);assert.throws(()=>validateContent(m));
  }
});

test('cat and dog learning builds a faster photo handler; routing learning builds a second worker',()=>{
  let s=createState({unlocked:true,points:500,knowledge:{text:60},base:{imageMuncher:true},levels:{capacity:5}});
  assert.equal(buildProgram(s,'photoSorter'),false);assert.equal(codeAvailable(s),false);
  assert.equal(visitDevice(s,'developer'),false);assert.equal(visitDevice(s,'photos'),true);
  for(const profile of ['cat','dog'])for(let i=0;i<6;i++)assert.equal(collect(s,'image',false,2,profile),true);
  bank(s);assert.equal(s.samples.cat,0);processBase(s,12);
  assert.equal(s.samples.cat,6);assert.equal(s.samples.dog,6);
  s=readSave({getItem:()=>serialize(s)});const points=s.points;
  assert.equal(buildProgram(s,'photoSorter'),true);assert.equal(s.points,points-60);assert.equal(buildProgram(s,'photoSorter'),false);
  collect(s,'image',false,2,'cat');bank(s);assert.equal(processBase(s,.5),8);
  assert.equal(codeAvailable(s),false);assert.equal(visitDevice(s,'developer'),true);assert.equal(codeAvailable(s),true);
  for(let i=0;i<8;i++)collect(s,'code',false,3,'routing');bank(s);
  processBase(s,36);assert.equal(s.samples.routing,8);assert.equal(buildProgram(s,'autoSort'),true);
  collect(s,'text');collect(s,'text');bank(s);processBase(s,.5);
  s=readSave({getItem:()=>serialize(s)});assert.equal(processingSummary(s).count,2);
  assert.equal(processBase(s,1),6);assert.equal(processBase(s,10),0);
});

test('chapter validation rejects invalid profiles and balance; legacy unlock remains earned',()=>{
  for(const mutate of [m=>m.chapter.trialText=0,m=>m.areas[1].spawns[0].profile='routing',m=>delete m.bosses[0].enabled]){
    const m=structuredClone(starter);mutate(m);assert.throws(()=>validateContent(m));
  }
  const s=createState({unlocked:true,knowledge:{code:300}});
  assert.equal(s.unlocked,true);assert.equal(s.samples.routing,0);
  assert.equal(collect(s,'text',false,1,'cat'),false);
  assert.equal(s.cargo.length,0);assert.equal(starter.bosses[0].enabled,false);
  assert.equal(starter.areas[1].hallucinations.count,0);assert.equal(starter.areas[1].hostiles.length,0);
});

 test('vat trial gate uses both knowledge goals, regardless of points or purchased upgrades',()=>{
  const s=ready();assert.equal(sandboxReady(s),true);assert.equal(s.base.imageMuncher,false);
  assert.ok(Object.values(s.levels).every(n=>n===0));assert.equal(s.points,0);
  assert.equal(startTrial(s),true);
  for(const kind of ['text','image']){
    const below=ready();below.knowledge[kind]--;below.points=100000;below.total=100000;
    below.levels={...below.levels,capacity:5,range:5,decode:5,parallel:3};
    below.base.imageMuncher=true;below.base.speedLevel=3;
    assert.equal(sandboxReady(below),false);assert.equal(startTrial(below),false);
  }
});
