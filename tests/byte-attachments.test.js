import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three/three.module.js';
import {GLTFLoader} from '../vendor/three/loaders/GLTFLoader.js';
import {normalizeByteModel} from '../src/byte-model.js';
import {createBrainAttachments} from '../src/byte-attachments.js';
import {createByteCollectors} from '../src/byte-collectors.js';

async function brainAsset(){
  // Keep the shipped mesh transforms and vertices; textures need a browser.
  const bytes=await readFile(new URL('../assets/models/byte-body-v2.glb',import.meta.url)),size=bytes.readUInt32LE(12);
  const json=JSON.parse(bytes.subarray(20,20+size));
  for(const mesh of json.meshes)for(const p of mesh.primitives)delete p.material;
  for(const key of ['materials','textures','images','samplers'])delete json[key];
  const text=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+bytes.length-20-size,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const out=Buffer.concat([header,padded,bytes.subarray(20+size)]);
  const {scene}=await new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');
  return normalizeByteModel(scene);
}

test('all four sprouts stay seated in the shipped brain through bob, tilt, turn and growth',async()=>{
  const body=new THREE.Group(),brain=new THREE.Group(),model=await brainAsset();body.add(brain);brain.add(model);brain.position.y=.48;
  const sample=createBrainAttachments(model,brain,body),rest=[];
  for(let i=0;i<4;i++){
    const anchor=sample(i,new THREE.Vector3());assert.ok(anchor,`crown mount ${i} exists`);
    rest.push(brain.worldToLocal(body.localToWorld(anchor.clone())));
  }
  const bytes=await readFile(new URL('../assets/models/byte-collector-v1.glb',import.meta.url));
  const template=new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const collectors=createByteCollectors(body,{template,brainAnchor:sample});await collectors.loading;
  for(let frame=0;frame<120;frame++){
    const t=frame/20;body.position.set(t,.1,-2);body.rotation.set(.1,t,.15);body.scale.setScalar(1+frame/400);
    brain.position.y=.48+Math.sin(t*2)*.085;brain.rotation.set(Math.sin(t)*.15,0,Math.cos(t)*.2);
    collectors.update({count:4,time:t,dt:1/60});
    const roots=body.getObjectByName('Byte collectors').children.slice(0,4);
    for(let i=0;i<4;i++){
      const actual=brain.worldToLocal(roots[i].getObjectByName('Hose_00').getWorldPosition(new THREE.Vector3()));
      assert.ok(actual.distanceTo(rest[i])<1e-5,'attachment follows head instead of hovering at a fixed height');
    }
  }
  collectors.update({count:4,inVat:true});
  assert.equal(body.getObjectByName('Byte collectors').children[0].getObjectByName('Hose_00').position.y,.48);
});

test('surface attachments follow vertex deformation as well as object transforms',()=>{
  const body=new THREE.Group(),brain=new THREE.Group();body.add(brain);
  const geometry=new THREE.BoxGeometry(1.2,1,1.2),position=geometry.attributes.position,raised=position.clone();
  for(let i=0;i<raised.count;i++)raised.setY(i,raised.getY(i)+.2);
  geometry.morphAttributes.position=[raised];
  const model=new THREE.Mesh(geometry);brain.add(model);
  const sample=createBrainAttachments(model,brain,body),before=sample(0,new THREE.Vector3());
  model.morphTargetInfluences[0]=1;
  const after=sample(0,new THREE.Vector3());assert.ok(Math.abs(after.y-before.y-.2)<1e-6);
});
