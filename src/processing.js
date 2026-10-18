import {atHomeDock} from './home-dock.js';
import { validProfile, codeAvailable } from './chapter.js';
// Base work advances during play and in the dock menu, but pauses with the game.
export const PROCESSING={secondsPerKB:1.5,imageSecondsPerKB:.5,imageMuncherCost:80,textKnowledgeGoal:60,analyzerSpeedCost:24};
export const STORAGE_TYPES=['text','image'];
export const STORAGE={startingKB:24,upgradeKB:24,baseCost:30};
export const analyzerMaxLevel=state=>state.unlocked?6:3;
export const storageCapacity=(state,type)=>STORAGE_TYPES.includes(type)?STORAGE.startingKB+state.base.storageLevels[type]*STORAGE.upgradeKB+state.base.libraryBonus[type]:Infinity;
// Retained examples occupy permanent library space. The processing queue is separate.
export const storageUsed=(state,type)=>state.base.libraryUsed[type]??0;
export const canRetain=(state,item)=>storageUsed(state,item.type)+item.size<=storageCapacity(state,item.type);
export const storageCost=(state,type)=>{
  const level=state.base.storageLevels[type];
  // Keep familiar early prices, then use linear growth so expansion stays attainable.
  return Math.round(STORAGE.baseCost*1.8**Math.min(level,6))+Math.max(0,level-6)*300;
};
export function upgradeStorage(state,type){
  if(!STORAGE_TYPES.includes(type)||state.points<storageCost(state,type))return false;
  state.points-=storageCost(state,type);state.base.storageLevels[type]++;return true;
}
export const validItem=item=>item&&['text','image','code'].includes(item.type)&&Number.isInteger(item.size)&&item.size>0&&item.size<=12&&Number.isInteger(item.value)&&item.value>0&&item.value<=2000&&validProfile(item.type,item.profile,item.size);
const copyItem=item=>({type:item.type,size:item.size,value:item.value,...(item.profile?{profile:item.profile}:{}),...(item.trial===true?{trial:true}:{})});
function restoreJob(job){
  if(!validItem(job)||!Number.isFinite(job.duration)||job.duration<=0||job.duration>240||!Number.isFinite(job.remaining)||job.remaining<=0||job.remaining>job.duration)return null;
  return {...copyItem(job),duration:job.duration,remaining:job.remaining};
}
export function createBase(saved,knowledge={}){
  const imageMuncher=saved?.imageMuncher===true;
  const storageLevels=Object.fromEntries(STORAGE_TYPES.map(type=>[type,Number.isInteger(saved?.storageLevels?.[type])?Math.max(0,Math.min(1000000,saved.storageLevels[type])):0]));
  const clean=v=>Number.isSafeInteger(v)&&v>=0?Math.min(v,1000000000):0;
  const libraryUsed={},libraryBonus={};
  for(const type of STORAGE_TYPES){
    // Pre-library saves have no byte totals. Preserve learned examples at their
    // original default packet size, and grandfather enough space to hold them.
    libraryUsed[type]=saved?.libraryUsed?.[type]===undefined?clean(knowledge[type])*(type==='image'?2:1):clean(saved.libraryUsed[type]);
    const purchased=STORAGE.startingKB+storageLevels[type]*STORAGE.upgradeKB;
    libraryBonus[type]=Math.max(clean(saved?.libraryBonus?.[type]),Math.ceil(Math.max(0,libraryUsed[type]-purchased)/STORAGE.upgradeKB)*STORAGE.upgradeKB);
  }
  const autoSort=saved?.autoSort===true,extra=restoreJob(saved?.extra);
  const queue=Array.isArray(saved?.queue)?saved.queue.filter(validItem).map(copyItem):[];
  if(extra&&(!autoSort||extra.type==='image'))queue.unshift(copyItem(extra));
  return {libraryUsed,libraryBonus,photoSorter:saved?.photoSorter===true,autoSort,extra:autoSort&&extra?.type!=='image'?extra:null,storageLevels,speedLevel:Number.isInteger(saved?.speedLevel)?Math.max(0,Math.min(6,saved.speedLevel)):0,imageMuncher,queue,basic:restoreJob(saved?.basic),image:imageMuncher&&saved?.image?.type==='image'?restoreJob(saved.image):null};
}
export function dropOff(state){
  let value=0;
  for(const item of state.cargo){
    if(!validItem(item))continue;
    state.base.queue.push(copyItem(item));value+=item.value;
  }
  if(value)state.banks++;
  state.cargo=[];state.health=100;
  return value;
}
export function buildImageMuncher(state){
  if(!picturesUnlocked(state)||state.base.imageMuncher||state.points<PROCESSING.imageMuncherCost)return false;
  state.points-=PROCESSING.imageMuncherCost;state.base.imageMuncher=true;return true;
}
export function processingSummary(state){
  const items=[...state.base.queue,...[state.base.basic,state.base.image,state.base.extra].filter(Boolean)];
  return {count:items.length,value:items.reduce((sum,item)=>sum+item.value,0),types:Object.fromEntries(['text','image','code'].map(type=>[type,items.filter(item=>item.type===type).length]))};
}
export const picturesUnlocked=state=>state.knowledge.text>=PROCESSING.textKnowledgeGoal;
export const feedAvailable=(state,type)=>type==='text'||(type==='image'?picturesUnlocked(state):codeAvailable(state));
export const analyzerRate=state=>1+state.base.speedLevel*.5;
export const analyzerSpeedCost=state=>Math.round(PROCESSING.analyzerSpeedCost*1.7**state.base.speedLevel);
export function upgradeAnalyzer(state){
  const price=analyzerSpeedCost(state);
  if(state.base.speedLevel>=analyzerMaxLevel(state)||state.points<price)return false;
  state.points-=price;state.base.speedLevel++;return true;
}
export function autoDropOff(state,player){
  if(!state.cargo.length||!atHomeDock(player))return null;
  const before=[...state.cargo],value=dropOff(state),count=before.length-state.cargo.length;
  if(!count)return null;
  return {count,value,items:before.filter(item=>validItem(item)&&!state.cargo.includes(item)),remaining:state.cargo.length};
}
function startJobs(base){
  // Let the specialist take a picture before the universal machine takes any job.
  if(base.imageMuncher&&!base.image){
    const index=base.queue.findIndex(item=>item.type==='image');
    if(index>=0){const item=base.queue.splice(index,1)[0],duration=item.size*PROCESSING.imageSecondsPerKB/(base.photoSorter?2:1);base.image={...item,duration,remaining:duration};}
  }
  for(const id of base.autoSort?['basic','extra']:['basic'])if(!base[id]){
    // The starter always has a free path through every data type. Once installed,
    // the image specialist owns new pictures; a starter job already running finishes.
    const index=base.queue.findIndex(item=>item.type!=='image'||(id==='basic'&&!base.imageMuncher));
    if(index>=0){const item=base.queue.splice(index,1)[0],duration=item.size*PROCESSING.secondsPerKB;base[id]={...item,duration,remaining:duration};}
  }
}
export function processBase(state,seconds,onComplete=()=>{}){
  if(!Number.isFinite(seconds)||seconds<0)return 0;
  let remaining=seconds*analyzerRate(state),earned=0;
  startJobs(state.base);
  while(remaining>0){
    const workers=['basic','image','extra'].filter(id=>state.base[id]);if(!workers.length)break;
    const step=Math.min(remaining,...workers.map(id=>state.base[id].remaining));remaining-=step;
    for(const id of workers){const job=state.base[id];job.remaining-=step;if(job.remaining<=1e-8){earned+=job.value;
      const retained=canRetain(state,job);
      if(retained){
        if(STORAGE_TYPES.includes(job.type))state.base.libraryUsed[job.type]+=job.size;
        state.knowledge[job.type]++;if(job.profile)state.samples[job.profile]++;
      }
      state.base[id]=null;onComplete(copyItem(job),id,retained);}}
    startJobs(state.base);
  }
  state.points+=earned;state.total+=earned;return earned;
}
