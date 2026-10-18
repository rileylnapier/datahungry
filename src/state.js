import { CHAPTER, PROFILES, createSamples, createTrial, trialPassed, validProfile } from './chapter.js';
import { BENCHMARK } from './benchmark.js';
import { cleanExplored } from './exploration.js';
import { clampZoom } from './zoom.js';
import { createBase, dropOff, PROCESSING, picturesUnlocked } from './processing.js';
export const SAVE_KEY = 'datahungry.v1';
export const BALANCE = {startingCapacity:12,capacityPerLevel:6,startingRange:2.15,rangePerLevel:.6,upgradeGrowth:1.7,gateTraining:120,gateUpgrades:2,parallelTraining:60,startingSpeed:4.4,vatSpeedBonus:.1,speedPerLevel:.05};
export const TYPES = {
  text: { name: 'Textling', size: 1, value: 3, decode: .75, speed: .48, color: 0xd8f5a5 },
  image: { name: 'Pixel moth', size: 2, value: 8, decode: 1.25, speed: .8, color: 0xbcb1ff },
  code: { name: 'Code bug', size: 3, value: 15, decode: 1.8, speed: 1.15, color: 0xffc18a },
};
export const UPGRADES = {
  capacity: { name: 'Memory capacity', detail: 'Carry more data before returning to the dock.', base: 24 },
  range: { name: 'Collection range', detail: 'Grab creatures from farther away.', base: 30 },
  decode: { name: 'Decoding speed', detail: 'Capture each creature faster once a cable connects.', base: 36 },
  parallel: { name: 'Parallel downloads', detail: 'Grow another collector: up to 4 head sprouts, then 10 vat hoses.', base: 60 },
  speed: { name: 'Movement speed', detail: 'Move the travel vat faster while exploring and returning home.', base: 60 },
  clarity: { name: 'Hallucination detection', detail: 'Tell fake data apart from useful data.', base: 42 },
};
const cleanInt = (v, max = 1e7) => Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
export function createState(saved = {}) {
  if (!saved || typeof saved !== 'object') saved = {};
  const knowledge=Object.fromEntries(['text','image','code'].map(type=>[type,cleanInt(saved.knowledge?.[type])]));
  const base=createBase(saved.base,knowledge);
  // Older prototypes sold the image addon before knowledge existed. Refund that
  // purchase; preserve all queued data for the starter analyzer.
  const migrate=saved.knowledge===undefined&&base.imageMuncher;
  if(migrate){base.imageMuncher=false;if(base.image){base.queue.unshift(base.image);base.image=null;}}
  return {samples:createSamples(saved.samples),trial:createTrial(saved.trial),network:{photosVisited:saved.network?.photosVisited===true,developerVisited:saved.network?.developerVisited===true}, explored:cleanExplored(saved.explored),zoom:clampZoom(saved.zoom),knowledge,base, points: cleanInt(saved.points)+(migrate?PROCESSING.imageMuncherCost:0), total: cleanInt(saved.total), levels: { speed: cleanInt(saved.levels?.speed, 5), capacity: cleanInt(saved.levels?.capacity, 8), range: cleanInt(saved.levels?.range, 8), decode: cleanInt(saved.levels?.decode, 8), parallel: cleanInt(saved.levels?.parallel, 9), clarity: cleanInt(saved.levels?.clarity, 3) }, unlocked: saved.unlocked === true, visited: saved.visited === true, stressPassed: saved.stressPassed === true, cargo: [], health: 100, zone: 0, collected: cleanInt(saved.collected), banks: cleanInt(saved.banks) };
}
export function configureContent(content) { Object.assign(BENCHMARK,content.benchmark);Object.assign(CHAPTER,content.chapter);Object.assign(BALANCE,content.balance);Object.assign(PROCESSING,content.processing);for(const id of Object.keys(TYPES))Object.assign(TYPES[id],content.creatures[id]);for(const id of Object.keys(UPGRADES))UPGRADES[id].base=content.upgrades[id].base; }
export const capacity = s => BALANCE.startingCapacity + s.levels.capacity * BALANCE.capacityPerLevel;
export const used = s => s.cargo.reduce((a, c) => a + c.size, 0);
export const haulValue = s => s.cargo.reduce((a, c) => a + c.value, 0);
export const noise = s => s.cargo.filter(c=>c.type==='noise').reduce((a,c)=>a+c.size,0);
export const maxLevel = (id,state) => id==='parallel'?(state&&!state.unlocked?3:9):id==='clarity'?3:id==='speed'?5:state?.unlocked?8:5;
export const movementSpeed=s=>BALANCE.startingSpeed*(1+(s.unlocked?BALANCE.vatSpeedBonus+s.levels.speed*BALANCE.speedPerLevel:0));
export const bodyRadius = s => s.unlocked?1.1+s.levels.capacity*.055:.55+s.levels.capacity*.02;
export const range = s => BALANCE.startingRange + s.levels.range * BALANCE.rangePerLevel;
export const connections = s => Math.min(s.unlocked?10:4,1+s.levels.parallel);
export const upgradeUnlocked = (s,id) => id==='parallel' ? s.total>=BALANCE.parallelTraining&&(s.unlocked||s.levels.parallel<3) : id==='clarity' ? false : id==='speed' ? s.unlocked : true;
export const level = s => Object.values(s.levels).reduce((a, b) => a + b, 0);
export const cost = (s, id) => Math.round(UPGRADES[id].base * BALANCE.upgradeGrowth ** s.levels[id]);
export function packetStats(type,size=TYPES[type]?.size,profile){
  const base=TYPES[type];if(!base||!Number.isInteger(size)||size<1||size>12||!validProfile(type,profile,size))return null;
  const special=PROFILES[profile];if(special?.size)return {...base,size,value:special.value,decode:special.decode,speed:special.speed};
  return {...base,size,value:Math.round(base.value*size/base.size),decode:base.decode*size/base.size};
}
export function collect(s, type, rich = false, size=TYPES[type]?.size,profile) {
  const t = packetStats(type,size,profile);
  if (!t || !validProfile(type,profile) || used(s) + t.size > capacity(s)) return false;
  s.cargo.push({ type, size: t.size, value: t.value * (rich ? 2 : 1),...(profile?{profile}:{} ) });
  s.collected++;
  return true;
}
export function bank(s) { return dropOff(s); }
export function collectHallucination(s, size=2) { if (s.levels.clarity>=3 || used(s)+size>capacity(s)) return false; s.cargo.push({type:'noise',size,value:0}); return true; }
export function buy(s, id) {
  if (!UPGRADES[id] || !upgradeUnlocked(s,id) || s.levels[id] >= maxLevel(id,s) || s.points < cost(s, id)) return false;
  s.points -= cost(s, id); s.levels[id]++; return true;
}
export function unlock(s) { if (s.unlocked || !trialPassed(s)) return false; s.unlocked = true; return true; }
export function defeat(s) { const before = haulValue(s); s.cargo = s.cargo.filter((_, i) => i % 2 === 1); s.health = 100; s.zone = 0; return before - haulValue(s); }
export function serialize(s) { return JSON.stringify({ samples:s.samples,trial:s.trial,network:s.network,explored:s.explored,zoom:s.zoom,knowledge:s.knowledge, base:s.base, points: s.points, total: s.total, levels: s.levels, unlocked: s.unlocked, visited: s.visited, stressPassed: s.stressPassed, collected: s.collected, banks: s.banks }); }
export function readSave(storage) { try { return createState(JSON.parse(storage.getItem(SAVE_KEY) || '{}')); } catch { return createState(); } }
