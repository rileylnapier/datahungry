import * as THREE from '../vendor/three/three.module.js';

// Clip names are the export contract for the Blender rig. Static models keep
// using the existing procedural motion until an animated export is installed.
export function createByteAnimator(model){
  const clips=model.animations||[];
  if(!['Idle','Move','Collect'].every(name=>clips.some(c=>c.name===name)))return null;
  const mixer=new THREE.AnimationMixer(model);
  const actions=Object.fromEntries(['Idle','Move','Collect'].map(name=>[name,mixer.clipAction(clips.find(c=>c.name===name))]));
  actions.Idle.play();actions.Move.play().setEffectiveWeight(0);
  actions.Collect.setLoop(THREE.LoopOnce,1);actions.Collect.clampWhenFinished=true;
  let movement=0,elapsed=Infinity;
  const duration=actions.Collect.getClip().duration;
  return {
    collect(){
      // Simultaneous downloads celebrate once; continuous feeding still allows
      // a reaction to finish before another one begins.
      if(elapsed<duration)return;
      elapsed=0;actions.Collect.reset().setEffectiveWeight(0).play();
    },
    update(dt,speed=0,{inVat=false}={}){
      dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1));
      const target=inVat?0:THREE.MathUtils.clamp(speed/4.4,0,1);
      movement+=(target-movement)*(1-Math.exp(-dt*12));
      elapsed+=dt;
      const reaction=elapsed<duration?Math.min(1,elapsed/.07,(duration-elapsed)/.14)*(inVat?.45:1):0;
      actions.Idle.setEffectiveWeight((1-movement)*(1-reaction));
      actions.Move.setEffectiveWeight(movement*(1-reaction)).setEffectiveTimeScale(.7+target*.5);
      actions.Collect.setEffectiveWeight(reaction);
      mixer.update(dt);
      if(elapsed>=duration&&actions.Collect.isScheduled())actions.Collect.stop();
    },
    dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);},
  };
}
