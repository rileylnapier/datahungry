import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('vat export contains only its hardware, embedded textures, and an empty brain chamber',async()=>{
  const bytes=await readFile(new URL('../assets/models/byte-vat-v1.glb',import.meta.url));
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.equal(gltf.scenes.length,1,'do not export other open Blender scenes');
  assert.deepEqual(gltf.nodes.map(n=>n.name).sort(),['Vat_Basin','Vat_Chassis','Vat_Lid']);
  assert.ok(gltf.buffers.every(b=>!b.uri));
  assert.ok(gltf.images.every(i=>i.bufferView!==undefined&&!i.uri));
  assert.ok(bytes.length<6*1024*1024);
  let triangles=0;
  for(const mesh of gltf.meshes)for(const p of mesh.primitives){
    triangles+=gltf.accessors[p.indices].count/3;
    const bounds=gltf.accessors[p.attributes.POSITION];
    assert.ok(bounds.max[1]<.8||bounds.min[1]>1.7,'hardware must leave room for Byte');
  }
  assert.ok(triangles>10000&&triangles<16000);
});
