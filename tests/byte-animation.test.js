import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createByteAnimator} from '../src/byte-animation.js';

function fixture(){
  const model=new THREE.Group(),bone=new THREE.Bone();bone.name='Body';model.add(bone);
  model.animations=['Idle','Move','Collect'].map((name,i)=>new THREE.AnimationClip(name,i===2?.5:1,[new THREE.NumberKeyframeTrack('Body.position[y]',[0,i===2?.5:1],[i,i])]));
  return {model,bone,animator:createByteAnimator(model)};
}
function run(animator,speed=0,options={},seconds=1){for(let t=0;t<seconds;t+=1/60)animator.update(1/60,speed,options);}

test('static or incomplete exports retain procedural animation',()=>{
  const model=new THREE.Group();assert.equal(createByteAnimator(model),null);
  model.animations=[new THREE.AnimationClip('Idle',1,[])];assert.equal(createByteAnimator(model),null);
});
test('locomotion blends smoothly, returns to idle, and stays calm in the vat',()=>{
  const {bone,animator}=fixture();animator.update(1/60,4.4);
  assert.ok(bone.position.y>0&&bone.position.y<.5);
  run(animator,4.4);assert.ok(bone.position.y>.99);
  run(animator,4.4,{inVat:true});assert.ok(bone.position.y<.01);
  run(animator,4.4);run(animator);assert.ok(bone.position.y<.01);
  animator.dispose();
});
test('collection plays once, survives repeated captures, and releases locomotion',()=>{
  const {bone,animator}=fixture();animator.collect();
  run(animator,0,{},.15);assert.ok(bone.position.y>1.9);
  for(let i=0;i<24;i++){animator.collect();animator.update(1/60,4.4);}
  // A repeated capture cannot keep resetting the reaction to its first frame.
  run(animator,4.4,{},1);assert.ok(Math.abs(bone.position.y-1)<.01);
  animator.collect();run(animator,0,{inVat:true},.15);assert.ok(bone.position.y<1.1);
  run(animator);assert.ok(bone.position.y<.01);
});
