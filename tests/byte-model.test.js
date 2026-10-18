import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three/three.module.js';
import {normalizeByteModel} from '../src/byte-model.js';

test('model normalization centers offset exports without changing their proportions',()=>{
  const source=new THREE.Mesh(new THREE.BoxGeometry(20,10,8));source.position.set(40,-9,15);
  const root=normalizeByteModel(source),bounds=new THREE.Box3().setFromObject(root);
  const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  assert.ok(center.length()<1e-8);assert.ok(Math.abs(size.x-1.25)<1e-8);
  assert.ok(Math.abs(size.x/size.y-2)<1e-8);
  assert.throws(()=>normalizeByteModel(new THREE.Group()),/no usable geometry/);
});

test('shipped Byte GLB is self-contained and fits the mobile geometry budget',async()=>{
  const bytes=await readFile(new URL('../assets/models/byte-sandbox-v1.glb',import.meta.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);assert.ok(bytes.length<6*1024*1024);
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.deepEqual(json.extensionsRequired||[],[]);
  assert.ok(json.buffers.every(b=>!b.uri));assert.ok(json.images.every(i=>Number.isInteger(i.bufferView)&&!i.uri));
  let triangles=0;
  for(const mesh of json.meshes)for(const primitive of mesh.primitives){
    assert.equal(primitive.mode,4);assert.ok(primitive.attributes.NORMAL!==undefined);
    assert.ok(primitive.attributes.TEXCOORD_0!==undefined);
    triangles+=json.accessors[primitive.indices].count/3;
  }
  assert.equal(triangles,12568);assert.ok(triangles<20000);
});
