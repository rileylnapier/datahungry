import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeFrames} from '../src/performance-monitor.js';

test('frame stats measure real intervals including stalls, not clamped game dt',()=>{
  assert.equal(summarizeFrames([]),null);
  const frames=Array.from({length:99},()=>({frame:1000/60,logic:2,scene:5,ui:1}));
  frames.push({frame:250,logic:10,scene:20,ui:5});
  const stats=summarizeFrames(frames);
  assert.ok(Math.abs(stats.fps-1000/19)<1e-8);
  assert.equal(stats.p95,1000/60);assert.equal(stats.worst,250);assert.equal(stats.slow,1);
  assert.equal(stats.logic,2.08);assert.equal(stats.scene,5.15);assert.equal(stats.ui,1.04);
  assert.equal(frames.at(-1).frame,250);
});
