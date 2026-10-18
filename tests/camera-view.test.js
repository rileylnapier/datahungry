import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {CAMERA_OFFSET,screenMovement} from '../src/camera-view.js';

test('drag directions project back along the screen at the angled camera',()=>{
  const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);
  camera.position.set(...CAMERA_OFFSET);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const origin=new THREE.Vector3().project(camera);
  for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1],[.3,.7],[-.5,-.5]]){
    const world=screenMovement(x,z),screen=new THREE.Vector3(world.x,0,world.z).project(camera).sub(origin);
    assert.ok(Math.abs(screen.x*z+screen.y*x)<1e-10,'input and projected direction are collinear');
    assert.ok(screen.x*x-screen.y*z>0,'movement follows the intended direction');
    assert.ok(Math.abs(Math.hypot(world.x,world.z)-Math.hypot(x,z))<1e-10,'analog magnitude is preserved');
  }
  assert.deepEqual(screenMovement(0,0),{x:0,z:0});
});
