import {BENCHMARK,restoreBenchmark,newBenchmark,benchmarkScore} from './benchmark.js';
// Local-network learning goals compose existing collection and processing systems.
export const CHAPTER={sandboxText:60,sandboxImages:8,sandboxUpgrades:2,trialText:6,trialImages:4,photoGoal:6,codeGoal:8,photoCost:60,autoSortCost:80};
export const PROFILES={cat:{type:'image',name:'Cat photo'},dog:{type:'image',name:'Dog photo'},routing:{type:'code',name:'Routing snippet'}};
export const validProfile=(type,profile)=>profile===undefined||PROFILES[profile]?.type===type;
const count=v=>Number.isInteger(v)?Math.max(0,Math.min(1000000,v)):0;
export const createSamples=saved=>Object.fromEntries(Object.keys(PROFILES).map(id=>[id,count(saved?.[id])]));
export const createTrial=saved=>({...restoreBenchmark(saved),legacyPassed:saved?.legacyPassed===true||(saved?.version===undefined&&saved?.started===true&&count(saved?.text)>=CHAPTER.trialText&&count(saved?.image)>=CHAPTER.trialImages)});
export const sandboxReady=s=>s.knowledge.text>=CHAPTER.sandboxText&&s.base.imageMuncher&&s.knowledge.image>=CHAPTER.sandboxImages&&['capacity','range','decode','parallel'].reduce((n,id)=>n+s.levels[id],0)>=CHAPTER.sandboxUpgrades;
export const trialPassed=s=>s.trial.legacyPassed===true||(s.trial.version===BENCHMARK.id&&s.trial.started&&benchmarkScore(s.trial).passed);
export function startTrial(s){if(s.unlocked||trialPassed(s)||!sandboxReady(s)||(s.trial.started&&!benchmarkScore(s.trial).complete))return false;s.trial=newBenchmark(s.trial.best);return true;}
export const photoReady=s=>s.unlocked&&s.base.imageMuncher&&s.samples.cat>=CHAPTER.photoGoal&&s.samples.dog>=CHAPTER.photoGoal;
export const autoSortReady=s=>s.base.photoSorter&&s.network.developerVisited&&s.samples.routing>=CHAPTER.codeGoal;
export function buildProgram(s,id){
  if(!['photoSorter','autoSort'].includes(id)||s.base[id])return false;
  const ready=id==='photoSorter'?photoReady(s):autoSortReady(s),price=id==='photoSorter'?CHAPTER.photoCost:CHAPTER.autoSortCost;
  if(!ready||s.points<price)return false;
  s.points-=price;s.base[id]=true;return true;
}
export const codeAvailable=s=>s.unlocked&&s.base.photoSorter&&s.network.developerVisited;
export function visitDevice(s,id){
  if(!s.unlocked)return false;
  const key=id==='photos'?'photosVisited':id==='developer'&&s.base.photoSorter?'developerVisited':null;
  if(!key||s.network[key])return false;s.network[key]=true;return true;
}
