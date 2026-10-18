import {BENCHMARK,restoreBenchmark,newBenchmark,benchmarkScore} from './benchmark.js';
// Local-network learning goals compose existing collection and processing systems.
export const CHAPTER={sandboxText:120,sandboxImages:60,trialText:6,trialImages:4,photoGoal:6,codeGoal:8,photoCost:60,autoSortCost:80};
export const PROFILES={article:{type:'text',name:'Long article'},script:{type:'code',name:'Utility script'},corrupt_text:{type:'text',name:'Corrupted document',corrupt:true},corrupt_code:{type:'code',name:'Corrupted archive',corrupt:true},cleaned:{type:'code',name:'Cleaned code'},cat:{type:'image',name:'Cat photo'},dog:{type:'image',name:'Dog photo'},routing:{type:'code',name:'Routing snippet'},full_book:{type:'text',name:'Full Book',size:12,decode:45,value:120,speed:.14,scale:1.45,respawn:45},image_4k:{type:'image',name:'4K Image',size:12,decode:60,value:160,speed:.18,scale:1.5,respawn:55}};
export const validProfile=(type,profile,size)=>profile===undefined||(PROFILES[profile]?.type===type&&(!PROFILES[profile].size||size===undefined||size===PROFILES[profile].size));
const count=v=>Number.isInteger(v)?Math.max(0,Math.min(1000000,v)):0;
export const createSamples=saved=>Object.fromEntries(Object.keys(PROFILES).map(id=>[id,count(saved?.[id])]));
export const createTrial=saved=>({...restoreBenchmark(saved),legacyPassed:saved?.legacyPassed===true||(saved?.version===undefined&&saved?.started===true&&count(saved?.text)>=CHAPTER.trialText&&count(saved?.image)>=CHAPTER.trialImages)});
export const sandboxReady=s=>s.knowledge.text>=CHAPTER.sandboxText&&s.knowledge.image>=CHAPTER.sandboxImages;
export const trialPassed=s=>s.trial.legacyPassed===true||(s.trial.version===BENCHMARK.id&&s.trial.started&&benchmarkScore(s.trial).passed);
export function startTrial(s){if(s.unlocked||trialPassed(s)||(!s.trial.started&&!sandboxReady(s))||(s.trial.started&&!benchmarkScore(s.trial).complete))return false;s.trial=newBenchmark(s.trial.best);return true;}
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
