import { CHAPTER, validProfile } from './chapter.js';
import starter from './starter-content.js';
export const APP_VERSION = '0.1.0';
export const BEHAVIORS = Object.freeze(['wander','flutter','skitter','chase','charge','mimic']);
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const check = (condition,message) => { if(!condition) throw new Error(`Invalid content: ${message}`); };
const number = (value,min,max) => Number.isFinite(value)&&value>=min&&value<=max;
const integer = (value,min,max) => Number.isInteger(value)&&number(value,min,max);
const safeName = s => typeof s==='string' && /^[A-Za-z0-9 ._-]{1,48}$/.test(s);
export function validateContent(m){
  check(plain(m),'manifest');check(m.schemaVersion===1,'schema version');check(integer(m.contentVersion,1,1e6),'content version');
  check(typeof m.minimumAppVersion==='string'&&/^\d+\.\d+\.\d+$/.test(m.minimumAppVersion),'app version');
  const min=m.minimumAppVersion.split('.').map(Number),current=APP_VERSION.split('.').map(Number);
  for(let i=0;i<3;i++){check(min[i]<=current[i],'requires newer app');if(min[i]<current[i])break;}
  check(['development','staging','production'].includes(m.channel),'channel');check(m.disabled===false,'content disabled');
  check(plain(m.balance),'balance');
  check(plain(m.chapter),'chapter');
  const benchmark=m.benchmark;
  check(plain(benchmark)&&safeName(benchmark.id)&&integer(benchmark.passScore,1,12)&&integer(benchmark.minimumPerKind,1,4)&&Array.isArray(benchmark.cards)&&benchmark.cards.length===12,'benchmark');
  const cardIds=new Set();
  for(const card of benchmark.cards){
    check(plain(card)&&safeName(card.id)&&!cardIds.has(card.id)&&['picture','word','paragraph'].includes(card.kind)&&['cat','dog'].includes(card.answer),'benchmark card');cardIds.add(card.id);
    check(card.kind==='picture'?integer(card.variant,0,1):typeof card.text==='string'&&card.text.trim().length>0&&card.text.length<350,'benchmark example');
  }
  for(const kind of ['picture','word','paragraph'])for(const answer of ['cat','dog'])check(benchmark.cards.filter(c=>c.kind===kind&&c.answer===answer).length===2,'balanced benchmark');
  for(const key of Object.keys(CHAPTER))check(integer(m.chapter[key],1,10000),'chapter '+key);
  check(plain(m.processing)&&number(m.processing.secondsPerKB,.1,20)&&number(m.processing.imageSecondsPerKB,.1,m.processing.secondsPerKB)&&integer(m.processing.imageMuncherCost,1,10000),'processing');
  check(integer(m.processing.textKnowledgeGoal,1,10000)&&integer(m.processing.analyzerSpeedCost,1,10000),'intro progression');
  for(const key of ['startingCapacity','capacityPerLevel','startingRange','rangePerLevel','upgradeGrowth','gateTraining','gateUpgrades','parallelTraining'])check(number(m.balance[key],.1,key==='upgradeGrowth'?3:10000),'balance '+key);
  for(const [id,behavior] of Object.entries({text:'wander',image:'flutter',code:'skitter'})){
    const c=m.creatures?.[id];check(plain(c)&&c.behavior===behavior,'creature behavior');
    check(integer(c.size,1,12)&&integer(c.value,1,1000)&&number(c.decode,.1,20)&&number(c.speed,.1,5),'creature values');
  }
  check(number(m.balance.startingSpeed,1,8)&&number(m.balance.vatSpeedBonus,0,.3)&&number(m.balance.speedPerLevel,0,.1),'movement balance');
  for(const id of ['capacity','range','decode','parallel','clarity','speed'])check(integer(m.upgrades?.[id]?.base,1,10000),'upgrade price');
  check(Array.isArray(m.areas)&&m.areas.length===2,'prototype supports two area slots');
  let total=0;const emitterIds=new Set();
  m.areas.forEach((a,i)=>{
    check(a.zone===i&&safeName(a.id)&&safeName(a.name),'area identity');const b=a.bounds;
    check(plain(b)&&number(b.minX,-30,-4)&&number(b.maxX,4,30)&&b.minX<b.maxX,'area X bounds');
    check(number(b.minZ,-90,-4)&&number(b.maxZ,-85,25)&&b.minZ<b.maxZ,'area Z bounds');
    check(Array.isArray(a.spawns)&&a.spawns.length<=8,'spawns');
    for(const s of a.spawns){check(['text','image','code'].includes(s.creature)&&integer(s.count,0,40),'spawn');total+=s.count;check(validProfile(s.creature,s.profile,s.packetSize??m.creatures[s.creature].size),'data profile');if(s.packetSize!==undefined)check(integer(s.packetSize,1,12),'packet size');if(s.habitat){const h=s.habitat;check(plain(h)&&number(h.minX,b.minX,b.maxX)&&number(h.maxX,b.minX,b.maxX)&&h.minX<h.maxX&&number(h.minZ,b.minZ,b.maxZ)&&number(h.maxZ,b.minZ,b.maxZ)&&h.minZ<h.maxZ,'spawn habitat');}if(s.emitter){const e=s.emitter,h=s.habitat||b;check(plain(e)&&safeName(e.id)&&safeName(e.name)&&!emitterIds.has(e.id)&&i===0&&number(e.x,h.minX,h.maxX)&&number(e.z,h.minZ,h.maxZ-2)&&number(e.interval,.5,10),'training emitter');emitterIds.add(e.id);}}
    check(plain(a.hallucinations)&&a.hallucinations.behavior==='mimic'&&integer(a.hallucinations.count,0,12),'hallucinations');
    check(Array.isArray(a.hostiles)&&a.hostiles.length<=4,'hostiles');
    for(const h of a.hostiles)check(h.enemy==='malware'&&integer(h.count,0,8)&&i===1,'hostile spawn');
  });check(total>0&&total<=120,'creature budget');
  check(m.areas[1].bounds.maxZ<m.areas[0].bounds.minZ-2,'separated zones');
  const enemy=m.enemies?.malware;check(plain(enemy)&&enemy.behavior==='chase'&&number(enemy.speed,.1,5)&&number(enemy.detection,1,12)&&number(enemy.damage,1,50),'enemy');
  check(Array.isArray(m.bosses)&&m.bosses.length===1,'prototype supports one boss slot');
  const b=m.bosses[0];check(typeof b.enabled==='boolean','boss enabled');check(safeName(b.id)&&safeName(b.name),'boss identity');check(number(b.integrity,1,10000)&&number(b.decodeRate,1,100)&&number(b.damage,1,50)&&integer(b.reward,0,10000),'boss values');
  check(Array.isArray(b.phases)&&b.phases.length>0&&b.phases.length<=5,'boss phases');let threshold=1;
  for(const p of b.phases){check(number(p.untilHealth,0,1)&&p.untilHealth<threshold,'phase ordering');threshold=p.untilHealth;check(Array.isArray(p.behaviors)&&p.behaviors.length>0&&p.behaviors.length<=2,'behaviors');const seen=new Set();for(const behavior of p.behaviors){check(['chase','charge'].includes(behavior.type)&&!seen.has(behavior.type),'unsupported or duplicate behavior');seen.add(behavior.type);check(number(behavior.speed,.1,8),'behavior speed');if(behavior.type==='charge')check(number(behavior.duration,.1,2)&&number(behavior.interval,2,20),'charge timing');}}
  check(threshold===0,'final phase');
  return m;
}
export async function loadContent(source='./content/local-manifest.json',fetcher=fetch){
  try {
    const response=await fetcher(source,{signal:AbortSignal.timeout(4000)});if(!response.ok)throw new Error('Content unavailable');
    const text=await response.text();if(text.length>100000)throw new Error('Manifest too large');
    return validateContent(JSON.parse(text));
  }catch(error){console.warn('Content fallback:',error.message);return {...validateContent(structuredClone(starter)),fallback:true};}
}
