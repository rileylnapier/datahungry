import starter from './starter-content.js';

export const BENCHMARK={...starter.benchmark};
export const TRIAL_SECONDS={picture:6,word:8,paragraph:14};
export const cardSeconds=card=>TRIAL_SECONDS[card?.kind]??6;
export const BENCHMARK_KINDS=['picture','word','paragraph'];
export const benchmarkCard=id=>BENCHMARK.cards.find(card=>card.id===id);
export function benchmarkScore(trial){
  const byKind=Object.fromEntries(BENCHMARK_KINDS.map(kind=>[kind,0]));
  let correct=0;
  for(let i=0;i<(trial.answers?.length||0);i++){
    const card=benchmarkCard(trial.deck[i]);
    if(card&&card.answer===trial.answers[i]){correct++;byKind[card.kind]++;}
  }
  const complete=trial.deck?.length===BENCHMARK.cards.length&&trial.answers?.length===trial.deck.length;
  return {correct,byKind,complete,passed:complete&&correct>=BENCHMARK.passScore&&BENCHMARK_KINDS.every(kind=>byKind[kind]>=BENCHMARK.minimumPerKind)};
}
export function restoreBenchmark(saved){
  const empty={version:BENCHMARK.id,started:false,deck:[],answers:[],best:0,remaining:null};
  if(saved?.version!==BENCHMARK.id)return empty;
  const best=Number.isInteger(saved.best)?Math.max(0,Math.min(BENCHMARK.cards.length,saved.best)):0;
  if(!Array.isArray(saved.deck)||saved.deck.length!==BENCHMARK.cards.length||new Set(saved.deck).size!==saved.deck.length||!saved.deck.every(benchmarkCard))return {...empty,best};
  if(!Array.isArray(saved.answers)||saved.answers.length>saved.deck.length||!saved.answers.every(a=>a==='cat'||a==='dog'||a==='missed'))return {...empty,best};
  return {...empty,started:saved.started===true,deck:[...saved.deck],answers:[...saved.answers],best,remaining:Number.isFinite(saved.remaining)?Math.max(0,Math.min(cardSeconds(benchmarkCard(saved.deck[saved.answers.length])),saved.remaining)):null};
}
export function newBenchmark(best=0,random=Math.random){
  const deck=BENCHMARK.cards.map(card=>card.id);
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  return {version:BENCHMARK.id,started:true,deck,answers:[],best,remaining:null};
}
export function answerBenchmark(state,id,answer){
  const t=state.trial;
  if(state.unlocked||!t.started||t.version!==BENCHMARK.id||!['cat','dog','missed'].includes(answer)||t.deck[t.answers.length]!==id)return null;
  const card=benchmarkCard(id);if(!card)return null;
  t.answers.push(answer);t.remaining=null;
  const score=benchmarkScore(t);if(score.complete)t.best=Math.max(t.best,score.correct);
  return {matched:card.answer===answer,answer:card.answer,...score};
}

// Time only advances while the trial view is actively playing. Remaining time
// is serialized with the card so closing the panel does not grant a fresh timer.
export function advanceTrialTime(state,seconds){
  const trial=state.trial,card=benchmarkCard(trial.deck[trial.answers.length]);
  if(!trial.started||state.unlocked||!card||!Number.isFinite(seconds)||seconds<0)return null;
  trial.remaining=Math.max(0,(trial.remaining??cardSeconds(card))-seconds);
  return {remaining:trial.remaining,progress:1-trial.remaining/cardSeconds(card),expired:trial.remaining===0};
}
