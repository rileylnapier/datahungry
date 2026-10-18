import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three/three.module.js';
import {addStarterBlink,createByteBlink} from '../src/byte-blink.js';

async function fixture(){
  const bytes=await readFile(new URL('../assets/models/byte-body-v2.glb',import.meta.url));
  const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
  const accessor=json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
  const view=json.bufferViews[accessor.bufferView],offset=28+length+(view.byteOffset||0)+(accessor.byteOffset||0);
  const values=new Float32Array(accessor.count*3);
  for(let i=0;i<accessor.count;i++)for(let j=0;j<3;j++)values[i*3+j]=bytes.readFloatLE(offset+i*(view.byteStride||12)+j*4);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(values,3));
  const model=new THREE.Mesh(geometry);addStarterBlink(model);return model;
}

test('blink deforms both textured eyes without moving the smile or rear cable',async()=>{
  const model=await fixture(),open=model.geometry.attributes.position,closed=model.geometry.morphAttributes.position[0];
  const count=[0,0],seams=new Map();
  for(let i=0;i<open.count;i++){
    const x=open.getX(i),y=open.getY(i),z=open.getZ(i),next=[closed.getX(i),closed.getY(i),closed.getZ(i)];
    assert.ok(next.every(Number.isFinite));assert.equal(next[0],x);
    if(z<.32||Math.abs(x+.05)<.02)assert.deepEqual(next,[x,y,z]);
    for(const [eye,cx,cy] of [[0,-.182,-.083],[1,.078,-.1]]){
      if(Math.abs(x-cx)<.04&&Math.abs(y-cy)<.05&&z>.38){
        assert.ok(Math.abs(next[1]-cy)<=Math.abs(y-cy)*.031+1e-7);count[eye]++;
      }
    }
    const key=[x,y,z].join(',');if(seams.has(key))assert.deepEqual(next,seams.get(key));else seams.set(key,next);
  }
  assert.ok(count.every(n=>n>10));
});

test('blinking closes, reopens, pauses, and supports a held preview without getting stuck',async()=>{
  const model=await fixture(),blink=createByteBlink(model,{random:()=>0}),value=()=>model.morphTargetInfluences[0];
  blink.blink();blink.update(.06);assert.equal(value(),1);
  blink.update(0);assert.equal(value(),1);
  blink.update(.08);assert.ok(value()>0&&value()<1);
  blink.update(.08);assert.equal(value(),0);
  for(let i=0;i<24;i++)blink.update(.1);assert.equal(value(),0);
  blink.update(.06);assert.equal(value(),0);blink.update(.06);assert.equal(value(),1);
  blink.holdClosed(true);for(let i=0;i<60;i++)blink.update(.1);assert.equal(value(),1);
  blink.holdClosed(false);assert.equal(value(),0);
  assert.equal(createByteBlink(new THREE.Group()),null);
});
