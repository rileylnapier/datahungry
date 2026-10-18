import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,movementSpeed,buy,cost,maxLevel,serialize,readSave} from '../src/state.js';
import {steerVelocity} from '../src/movement.js';

test('vat gives a small automatic boost and five paid speed upgrades that survive saves',()=>{
  const s=createState({points:10000});assert.equal(s.levels.speed,0);assert.equal(movementSpeed(s),4.4);
  assert.equal(buy(s,'speed'),false);assert.equal(s.points,10000);
  s.unlocked=true;assert.ok(Math.abs(movementSpeed(s)-4.84)<1e-9);
  for(let i=0;i<maxLevel('speed',s);i++){
    const price=cost(s,'speed'),before=s.points,speed=movementSpeed(s);
    assert.equal(buy(s,'speed'),true);assert.equal(s.points,before-price);
    assert.ok(Math.abs(movementSpeed(s)-speed-.22)<1e-9);
  }
  assert.equal(buy(s,'speed'),false);assert.ok(Math.abs(movementSpeed(s)-5.94)<1e-9);
  const restored=readSave({getItem:()=>serialize(s)});assert.equal(movementSpeed(restored),movementSpeed(s));
  assert.equal(createState({levels:{speed:999}}).levels.speed,5);
  assert.equal(movementSpeed(createState({levels:{speed:5}})),4.4,'speed bonuses only apply in the vat');
  const p={vx:0,vz:0};for(let i=0;i<120;i++)steerVelocity(p,1,1,1/60,movementSpeed(s));
  assert.ok(Math.abs(Math.hypot(p.vx,p.vz)-movementSpeed(s))<1e-7,'diagonals respect upgraded speed');
});
