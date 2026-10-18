import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,serialize,readSave} from '../src/state.js';
import {BENCHMARK,cardSeconds,newBenchmark,advanceTrialTime,answerBenchmark,benchmarkScore,benchmarkCard} from '../src/benchmark.js';

test('falling card deadlines persist through saves and an expired card is recorded once',()=>{
  let s=createState();s.trial=newBenchmark(0,()=>.999);
  const id=s.trial.deck[0],duration=cardSeconds(benchmarkCard(id));
  assert.equal(advanceTrialTime(s,duration/2).remaining,duration/2);
  s=readSave({getItem:()=>serialize(s)});
  assert.equal(advanceTrialTime(s,0).remaining,duration/2,'reopening does not reset the card');
  assert.equal(advanceTrialTime(s,duration).expired,true);
  assert.equal(answerBenchmark(s,id,'missed').matched,false);
  assert.equal(answerBenchmark(s,id,'cat'),null,'a late swipe cannot answer the expired card again');
  assert.equal(s.trial.answers.length,1);assert.equal(benchmarkScore(s.trial).correct,0);
  const loaded=readSave({getItem:()=>serialize(s)});assert.equal(loaded.trial.answers[0],'missed');
  assert.equal(advanceTrialTime(loaded,0).remaining,cardSeconds(benchmarkCard(loaded.trial.deck[1])));
});

test('paragraphs receive more time and malformed saved timers cannot extend a deadline',()=>{
  assert.ok(cardSeconds({kind:'paragraph'})>cardSeconds({kind:'word'}));
  assert.ok(cardSeconds({kind:'word'})>cardSeconds({kind:'picture'}));
  const trial=newBenchmark(0,()=>.999);trial.remaining=99999;
  const s=createState({trial});assert.equal(s.trial.remaining,cardSeconds(BENCHMARK.cards[0]));
  const before=s.trial.remaining;assert.equal(advanceTrialTime(s,NaN),null);assert.equal(advanceTrialTime(s,-1),null);assert.equal(s.trial.remaining,before);
});
