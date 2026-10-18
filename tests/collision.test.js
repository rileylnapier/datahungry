import test from 'node:test';
import assert from 'node:assert/strict';
import { overlapsCircle, moveWithCollisions, planPath } from '../src/collision.js';
import { bodyRadius, createState, unlock, serialize, readSave } from '../src/state.js';
import { solidObstacles, worldLayout, routeThroughGate, NETWORK_DEVICES, DOCK_PILLARS } from '../src/world-layout.js';
import starter from '../src/starter-content.js';

const box={minX:0,maxX:3,minZ:0,maxZ:3};
test('home pillars stop Byte while the center return lane stays open',()=>{
  const boxes=solidObstacles(starter),layout=worldLayout(starter);
  for(const radius of [.55,1.54]){
    for(const p of DOCK_PILLARS){
      const result=moveWithCollisions({x:p.x-3,z:p.z},{x:p.x,z:p.z},boxes,radius);
      assert.equal(boxes.some(b=>overlapsCircle(result,b,radius)),false);
    }
    checkPath({x:-3,z:0},planPath({x:-3,z:0},{x:-3,z:5},layout,boxes,radius),boxes,radius);
  }
});
test('solid props stop fast movement, allow sliding, and resolve an embedded start',()=>{
  const stopped=moveWithCollisions({x:-2,z:1},{x:5,z:1},[box],.55);
  assert.ok(stopped.x<=-.55);
  const slid=moveWithCollisions({x:-.55,z:1},{x:.5,z:2},[box],.55);
  assert.ok(slid.x<=-.55&&slid.z>1.9);
  const escaped=moveWithCollisions({x:1,z:1},{x:1,z:1},[box],.55);
  assert.equal(overlapsCircle(escaped,box,.55),false);
});
function checkPath(start,path,boxes,radius){
  assert.ok(path.length,'route exists');
  for(const end of path){
    const count=Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.05);
    for(let i=1;i<=count;i++){
      const p={x:start.x+(end.x-start.x)*i/count,z:start.z+(end.z-start.z)*i/count};
      assert.equal(boxes.some(b=>overlapsCircle(p,b,radius)),false,'route clears all props');
    }
    start=end;
  }
  return start;
}
test('routes clear folders and all training outlets for both brain and largest vat',()=>{
  const layout=worldLayout(starter),boxes=solidObstacles(starter,{imageMuncher:true,autoSort:true});
  for(const radius of [.55,1.54]){
    const start={x:0,z:3};
    // The north approach to the drop-off pad stays clear of base machinery.
    checkPath({x:-3,z:-5},[{x:-3,z:5}],boxes,radius);
    for(const goal of [{x:-10,z:-2},...starter.areas[0].spawns.map(s=>s.emitter?({x:s.emitter.x,z:s.emitter.z+2.3}):({x:(s.habitat.minX+s.habitat.maxX)/2,z:(s.habitat.minZ+s.habitat.maxZ)/2}))]){
      const end=checkPath(start,planPath(start,goal,layout,boxes,radius),boxes,radius);
      assert.equal(boxes.some(b=>overlapsCircle(end,b,radius)),false);
    }
    let from={x:24,z:-48};
    for(const goal of routeThroughGate(from,{x:-3,z:5},layout.gateZ))from=checkPath(from,planPath(from,goal,layout,boxes,radius),boxes,radius);
    assert.deepEqual(from,{x:-3,z:5});
  }
});
test('passing the benchmark permanently equips the larger protective vat',()=>{
  const s=createState({trial:{started:true,text:6,image:4},total:120,knowledge:{text:60},levels:{capacity:2}}),small=bodyRadius(s);
  assert.equal(unlock(s),true);
  assert.ok(bodyRadius(s)>small*1.8);
  assert.equal(bodyRadius(readSave({getItem:()=>serialize(s)})),bodyRadius(s));
});


test('all network devices are reachable with the largest vat and return through the gateway',()=>{
  const layout=worldLayout(starter),boxes=solidObstacles(starter,{imageMuncher:true,autoSort:true}),radius=1.54;
  for(const d of Object.values(NETWORK_DEVICES)){
    let from={x:-3,z:5};const goal={x:d.x,z:d.z+3};
    for(const waypoint of routeThroughGate(from,goal,layout.gateZ))from=checkPath(from,planPath(from,waypoint,layout,boxes,radius),boxes,radius);
    for(const waypoint of routeThroughGate(from,{x:-3,z:5},layout.gateZ))from=checkPath(from,planPath(from,waypoint,layout,boxes,radius),boxes,radius);
    assert.deepEqual(from,{x:-3,z:5});
  }
});
