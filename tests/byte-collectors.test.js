import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three/three.module.js';
import {GLTFLoader} from '../vendor/three/loaders/GLTFLoader.js';
import {cloneCollector,createByteCollectors} from '../src/byte-collectors.js';

async function asset(){
  const bytes=await readFile(new URL('../assets/models/byte-collector-v1.glb',import.meta.url));
  assert.ok(bytes.length<100000,'small reusable asset');
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
}
test('Blender export has nine weighted joints and independent cloned skeletons',async()=>{
  const {scene}=await asset(),a=cloneCollector(scene),b=cloneCollector(scene);
  let meshes=0,triangles=0;
  a.traverse(o=>{
    if(!o.isSkinnedMesh)return;meshes++;triangles+=o.geometry.index.count/3;
    assert.equal(o.skeleton.bones.length,9);
    assert.ok(o.skeleton.bones.every(bone=>a.getObjectByName(bone.name)===bone));
    const weights=o.geometry.attributes.skinWeight;
    for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-5);
  });
  assert.equal(meshes,4);assert.ok(triangles<2500);
  a.getObjectByName('Hose_04').position.x=8;
  assert.equal(b.getObjectByName('Hose_04').position.x,0);
  assert.equal(scene.getObjectByName('Hose_04').position.x,0);
});
test('one to three collectors aim independently and preserve assignment during captures',async()=>{
  const parent=new THREE.Group();parent.position.set(7,2,-5);parent.rotation.y=.7;parent.scale.setScalar(1.2);
  const collectors=createByteCollectors(parent,{template:asset()});await collectors.loading;
  const targets=[{x:10,z:2},{x:0,z:4},{x:7,z:-9}];
  collectors.update({count:3,targets,time:0,dt:.016});
  const group=parent.getObjectByName('Byte collectors');assert.equal(group.children.filter(c=>c.visible).length,3);
  const origins=targets.map(t=>collectors.getOrigin(t).clone());
  // Crest-mounted mouths are closer than the old side arms, but remain independent.
  for(let i=0;i<origins.length;i++)for(let j=i+1;j<origins.length;j++)assert.ok(origins[i].distanceTo(origins[j])>.1);
  for(const p of origins)assert.ok(p.toArray().every(Number.isFinite));
  collectors.collect(targets[0]);collectors.update({count:3,targets:targets.slice(1),time:0,dt:.016});
  assert.equal(collectors.getOrigin(targets[0]),undefined);
  assert.ok(collectors.getOrigin(targets[1]).distanceTo(origins[1])<1e-6);
  collectors.update({count:1,targets:[],time:1,inVat:true});
  assert.equal(group.children.filter(c=>c.visible).length,1);
  parent.updateMatrixWorld(true);
  group.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();const v=o.getVertexPosition(0,new THREE.Vector3());assert.ok(v.toArray().every(Number.isFinite));}});
});

test('ten vat hoses have distinct ports, and the same save is capped at four head sprouts',async()=>{
  const parent=new THREE.Group(),c=createByteCollectors(parent,{template:asset()});await c.loading;
  const targets=Array.from({length:10},(_,i)=>({x:Math.sin(i/10*Math.PI*2)*4,z:Math.cos(i/10*Math.PI*2)*4}));
  c.update({count:10,targets,inVat:true,time:2,dt:.016});
  const group=parent.getObjectByName('Byte collectors');assert.equal(group.children.filter(o=>o.visible).length,10);
  const origins=targets.map(t=>c.getOrigin(t).clone());
  for(let i=0;i<10;i++)for(let j=i+1;j<10;j++)assert.ok(origins[i].distanceTo(origins[j])>.1);
  c.update({count:10,targets,inVat:false,time:2,dt:.016});assert.equal(group.children.filter(o=>o.visible).length,4);
  for(const root of group.children.filter(o=>o.visible))assert.ok(root.getObjectByName('Hose_00').position.y>=.75);
  const roots=group.children.filter(o=>o.visible).map(o=>o.getObjectByName('Hose_00').position);
  assert.ok(roots.every(p=>p.x===0),'starter hoses are centered along the head');
  assert.equal(new Set(roots.map(p=>p.z)).size,4,'four distinct front-to-back roots');
  const first=roots[0].clone();
  assert.ok(first.z>.35,'first sprout sits forward above the face');
  c.update({count:1,inVat:false});
  assert.ok(group.children[0].getObjectByName('Hose_00').position.equals(first),'upgrades keep the forehead sprout in place');
});

test('home connections occupy unique ports, track a rotated scaled Byte and release on departure',async()=>{
  const {DOCK_PORTS}=await import('../src/home-dock.js');
  const parent=new THREE.Group();parent.position.set(-3,0,5);parent.rotation.y=.8;parent.scale.setScalar(1.44);
  const c=createByteCollectors(parent,{template:asset()});await c.loading;
  for(let i=0;i<20;i++)c.update({count:10,inVat:true,dockPorts:DOCK_PORTS,dt:.05,time:i*.05});
  const ports=Array.from({length:10},(_,i)=>c.getDockPort(i));
  assert.equal(new Set(ports).size,10);assert.ok(ports.every(p=>DOCK_PORTS.includes(p)));
  for(let i=0;i<10;i++){
    const end=c.getDockPoint(i,1),previous=c.getDockPoint(i,.999),tip=end.clone().add(end.clone().sub(previous).normalize().multiplyScalar(.175*1.44));
    assert.ok(tip.distanceTo(new THREE.Vector3(ports[i].x,ports[i].y,ports[i].z))<.005,'nozzle meets its socket');
  }
  parent.rotation.y=-.4;
  c.update({count:10,inVat:true,dockPorts:DOCK_PORTS,dt:.05});
  assert.deepEqual(Array.from({length:10},(_,i)=>c.getDockPort(i)),ports,'turning does not reassign sockets');
  for(let i=0;i<20;i++)c.update({count:10,inVat:true,dt:.05});
  assert.equal(c.getDockPort(0),null);assert.equal(c.getDockPoint(0,.5),null);
  c.update({count:1,targets:[{x:2,z:8}],dt:.05});
  assert.equal(parent.getObjectByName('Byte collectors').children.filter(o=>o.visible).length,1);
});

test('device uses exactly one unlocked hose, reaches its socket, and releases back to collection',async()=>{
  const {DEVICE_PORTS}=await import('../src/device-ports.js');
  const port=DEVICE_PORTS.terminal;
  for(const [inVat,count] of [[false,1],[false,4],[true,4],[true,10]]){
    const parent=new THREE.Group();parent.position.set(4,0,3);parent.rotation.y=-.5;parent.scale.setScalar(1.275);
    const c=createByteCollectors(parent,{template:asset()});await c.loading;
    const target={x:6,z:3};
    for(let i=0;i<20;i++)c.update({count,inVat,targets:[target],dockPorts:[port],dt:.05});
    const assigned=Array.from({length:10},(_,i)=>c.getDockPort(i)).filter(Boolean);
    assert.deepEqual(assigned,[port]);assert.equal(c.getOrigin(target),undefined);
    assert.equal(parent.getObjectByName('Byte collectors').children.filter(o=>o.visible).length,count);
    const index=Array.from({length:count},(_,i)=>i).find(i=>c.getDockPort(i)===port);
    const end=c.getDockPoint(index,1),previous=c.getDockPoint(index,.999);
    const tip=end.clone().add(end.clone().sub(previous).normalize().multiplyScalar(.175*1.275));
    assert.ok(tip.distanceTo(new THREE.Vector3(port.x,port.y,port.z))<.005);
    for(let i=0;i<20;i++)c.update({count,inVat,dt:.05});
    assert.ok(Array.from({length:count},(_,i)=>c.getDockPort(i)).every(p=>p===null));
    c.update({count,inVat,targets:[target],dt:.05});assert.ok(c.getOrigin(target));
  }
});
