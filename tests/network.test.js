import test from 'node:test';
import assert from 'node:assert/strict';
import starter from '../src/starter-content.js';
import {createState,serialize,readSave,packetStats,collect,SAVE_KEY,connections,capacity} from '../src/state.js';
import {processBase,storageCapacity} from '../src/processing.js';
import {PROGRAMS,buyProgram,malwareDamage,cleanPacket} from '../src/network-programs.js';
import {createAgentSystem,requestCourier,assignCollector,agentLoad} from '../src/agents.js';
import {debugPreset,debugStorage,startDebug,DEBUG_KEY} from '../src/debug.js';
import {districtCenter,networkWalls,contains} from '../src/network-layout.js';
import {worldLayout,solidObstacles,routeThroughGate} from '../src/world-layout.js';
import {planPath,overlapsCircle} from '../src/collision.js';
import {validateContent} from '../src/content.js';
const layout=worldLayout(starter),obstacles=solidObstacles(starter,{imageMuncher:true,autoSort:true});
const load=s=>readSave({getItem:()=>serialize(s)});
const system=(s,creatures=[],overrides={})=>createAgentSystem(s,{content:starter,layout,obstacles,creatures,packetStats,respawn:c=>{c.wait=20;c.progress=0;},...overrides});
test('debug presets and restart writes stay separate from normal save and backup',()=>{
  const data=new Map([[SAVE_KEY,'normal'],[SAVE_KEY+'.before-restart','backup']]);
  const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  startDebug(storage,'network');const s=readSave(debugStorage(storage));
  assert.equal(s.unlocked,true);assert.equal(connections(s),4);assert.equal(capacity(s),42);
  assert.equal(s.base.imageMuncher,true);assert.equal(s.base.speedLevel,3);
  assert.equal(s.knowledge.text,120);assert.equal(s.knowledge.image,60);assert.equal(s.knowledge.code,0);
  assert.ok(Object.values(s.programs).every(v=>!v));
  debugStorage(storage).setItem(SAVE_KEY+'.before-restart','test backup');
  assert.equal(data.get(SAVE_KEY),'normal');assert.equal(data.get(SAVE_KEY+'.before-restart'),'backup');
  const before=data.get(DEBUG_KEY);assert.throws(()=>startDebug(storage,'invalid'));assert.equal(data.get(DEBUG_KEY),before);
  assert.equal(connections(debugPreset('sandbox')),1);assert.ok(Object.values(debugPreset('tools').programs).every(Boolean));
});
test('vat adds library room once and preserves purchases through repeated saves',()=>{
  let s=createState({unlocked:true,knowledge:{text:120,image:60}});
  const text=storageCapacity(s,'text'),images=storageCapacity(s,'image');
  for(let i=0;i<5;i++)s=load(s);
  assert.equal(storageCapacity(s,'text'),text);assert.equal(storageCapacity(s,'image'),images);
  assert.equal(s.base.libraryBonus.image>=96,true);
});
test('programs require knowledge, money and prerequisite; purchase never spends knowledge',()=>{
  const s=debugPreset('network');s.points=1000;
  assert.equal(buyProgram(s,'courier'),false);s.knowledge.code=6;
  assert.equal(buyProgram(s,'courier'),true);assert.equal(s.points,910);assert.equal(s.knowledge.code,6);
  assert.equal(buyProgram(s,'courier'),false);s.knowledge.code=16;
  assert.equal(buyProgram(s,'cleaner'),false);assert.equal(buyProgram(s,'firewall'),true);
  assert.equal(buyProgram(s,'cleaner'),true);assert.equal(malwareDamage(s,20),8);
  assert.deepEqual(cleanPacket({size:8,value:20}),{type:'code',size:8,value:80,profile:'cleaned'});
  const restored=load(s);assert.deepEqual(restored.programs,s.programs);
  restored.points=0;assert.equal(buyProgram(restored,'harvester'),false);
});
test('courier transfers at most 24 KB, leaves noise, resumes saved delivery, pays at base only',()=>{
  let s=debugPreset('tools');s.agents.courier.x=-24;s.agents.courier.z=-48;
  for(let i=0;i<5;i++)collect(s,'image',false,6,i%2?'dog':'cat');
  s.cargo.push({type:'noise',size:2,value:0});const points=s.points;
  assert.equal(requestCourier(s),true);system(s).update(.1,{x:-24,z:-48});
  assert.equal(agentLoad(s.agents.courier),24);assert.equal(s.cargo.reduce((n,c)=>n+c.size,0),8);assert.equal(s.points,points);
  s=load(s);const sim=system(s);let frames=0;
  while(s.agents.courier.cargo.length&&frames++<3000)sim.update(.05,{x:0,z:-44});
  assert.ok(frames<3000,'courier follows corridors and crosses gateway');
  assert.equal(s.base.queue.length,4);assert.equal(s.points,points);
  const value=s.base.queue.reduce((n,c)=>n+c.value,0);processBase(s,100);assert.equal(s.points,points+value);
  sim.update(1,{x:0,z:-44});processBase(s,100);assert.equal(s.points,points+value);
});
test('collector uses only assigned safe discovered room and delivers real examples',()=>{
  const s=debugPreset('tools');s.agents.harvester.x=-24;s.agents.harvester.z=-48;
  assert.equal(assignCollector(s,'infected',starter,()=>true),false);
  assert.equal(assignCollector(s,'photos',starter,()=>false),false);
  assert.equal(assignCollector(s,'photos',starter,()=>true),true);
  const c={type:'image',packetSize:6,profile:'cat',x:-24,z:-48,zone:1,wait:0,progress:0};
  const corrupt={...c,profile:'cat',corrupt:true};
  const sim=system(s,[c,corrupt]);const points=s.points;
  for(let i=0;i<200;i++)sim.update(.05,{x:0,z:-44});
  assert.ok(c.wait>0);assert.equal(c.agentOwner,false);assert.equal(corrupt.wait,0);
  let frames=0;while(s.base.queue.length===0&&frames++<3000)sim.update(.05,{x:0,z:-44});
  assert.ok(frames<3000);assert.equal(s.base.queue.length,1);assert.equal(s.points,points);
  processBase(s,100);assert.equal(s.samples.cat,7);assert.ok(s.points>points);
  assert.equal(assignCollector(s,null,starter,()=>false),true);
});
test('collector cannot take an example being downloaded by Byte; no collection in locked game',()=>{
  const s=debugPreset('tools'),c={type:'image',packetSize:6,profile:'cat',x:-24,z:-48,zone:1,wait:0,progress:.5};
  s.agents.harvester.x=c.x;s.agents.harvester.z=c.z;assignCollector(s,'photos',starter,()=>true);
  const sim=system(s,[c]);for(let i=0;i<100;i++)sim.update(.1,c);
  assert.equal(agentLoad(s.agents.harvester),0);assert.equal(c.progress,.5);
  s.unlocked=false;c.progress=0;sim.update(100,c);assert.equal(agentLoad(s.agents.harvester),0);
});
test('every district is reachable with largest vat, through corridors and back home',()=>{
  const radius=1.54;
  for(const d of starter.areas[1].districts){
    let start={x:-3,z:5};
    for(const goal of [...routeThroughGate(start,districtCenter(d),layout.gateZ),...routeThroughGate(districtCenter(d),{x:-3,z:5},layout.gateZ)]){
      const path=planPath(start,goal,layout,obstacles,radius);assert.ok(path.length,`${d.id} has a route`);
      for(const end of path){const n=Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.1);for(let i=1;i<=n;i++)assert.ok(!obstacles.some(b=>overlapsCircle({x:start.x+(end.x-start.x)*i/n,z:start.z+(end.z-start.z)*i/n},b,radius)),`${d.id} route is clear`);start=end;}
    }
    assert.deepEqual(start,{x:-3,z:5});
  }
});
test('map wall complement leaves all rooms/corridors open and hostiles live only in dangerous rooms',()=>{
  const area=starter.areas[1],walls=networkWalls(starter);
  for(const h of area.hostiles)assert.ok(area.districts.some(d=>!d.safe&&contains(d.bounds,h.habitat.minX,h.habitat.minZ)&&contains(d.bounds,h.habitat.maxX,h.habitat.maxZ)));
  for(const d of area.districts){const c=districtCenter(d);assert.ok(!walls.some(w=>contains(w,c.x,c.z)));}
  for(const mutate of [m=>m.areas[1].districts[0].color='url(x)',m=>m.areas[1].corridors[0].minX=-100,m=>m.areas[1].hostiles[0].habitat.minZ=-200]){const c=structuredClone(starter);mutate(c);assert.throws(()=>validateContent(c));}
});

test('main entrance and developer corridor stay clear for walking straight north',()=>{
  for(let z=-30;z>=-80;z-=.1)assert.ok(!obstacles.some(b=>overlapsCircle({x:0,z},b,1.54)),`center lane blocked at ${z}`);
});

test('reassigning a loaded collector sends existing cargo home before the new room',()=>{
  const s=debugPreset('tools');s.agents.harvester.assignment='photos';s.agents.harvester.mode='harvest';s.agents.harvester.cargo.push({type:'image',size:6,value:24,profile:'cat'});
  assert.equal(assignCollector(s,'documents',starter,()=>true),true);assert.equal(s.agents.harvester.mode,'return');assert.equal(s.agents.harvester.assignment,'documents');
  assert.equal(agentLoad(s.agents.harvester),6);
});
