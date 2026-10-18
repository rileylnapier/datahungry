import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { createDownloadCable } from '../src/download-cable.js';

test('download fill and its leading light travel from the creature toward Byte',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({style:{}})};
  try{
    const cable=createDownloadCable(new THREE.Scene(),{append(){}});
    const player={x:0,z:0},target={x:4,z:0,type:'text'},project=()=>({x:100,y:100,visible:true});
    cable.update(player,target,.25,0,0,project);
    assert.equal(cable.fill.count,6);
    assert.equal(cable.head.position.x,3);
    assert.equal(cable.badge.textContent,'TEXT · 1 KB · 25%');
    const matrix=new THREE.Matrix4();
    for(let i=0;i<cable.fill.count;i++){cable.fill.getMatrixAt(i,matrix);assert.ok(matrix.elements[12]>=3);}
    cable.update(player,target,.75,0,0,project);assert.equal(cable.head.position.x,1);
    cable.update(player,null,1,0,0,project,1);assert.equal(cable.head.position.x,0);assert.equal(cable.fill.count,24);assert.match(cable.badge.textContent,/✓ 100%/);
    assert.equal(cable.track.material.depthWrite,false);
  }finally{if(previous)globalThis.document=previous;else delete globalThis.document;}
});
