import * as THREE from '../vendor/three/three.module.js';

const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

// Landmarks belong to byte-sandbox-v1, in its original glTF coordinates.
// Compress the textured eye and feather into the surrounding lids, keeping
// the smile, back of the head and cable still. No texture replacement needed.
export function addStarterBlink(scene){
  scene.traverse(mesh=>{
    if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.morphTargetDictionary?.Blink!==undefined)return;
    const geometry=mesh.geometry,position=geometry.attributes.position;
    const closed=position.clone();
    for(let i=0;i<position.count;i++){
      const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
      let delta=0;
      for(const [cx,cy,width] of [[-.182,-.083,.057],[.078,-.100,.047]]){
        const weight=(1-smooth(width,width+.035,Math.abs(x-cx)))*(1-smooth(.061,.12,Math.abs(y-cy)))*smooth(.32,.38,z);
        delta+=(cy-y)*.97*weight;
      }
      closed.setXYZ(i,x,y+delta,z-.4*delta);
    }
    closed.name='Blink';
    geometry.morphTargetsRelative=false;
    geometry.morphAttributes.position=[closed];
    mesh.updateMorphTargets();
  });
}

export function createByteBlink(model,{random=Math.random}={}){
  const targets=[];
  model.traverse(mesh=>{
    const index=mesh.morphTargetDictionary?.Blink;
    if(index!==undefined)targets.push({mesh,index});
  });
  if(!targets.length)return null;
  let wait=1.2+random()*2,elapsed=null,held=false;
  const duration=.20;
  const apply=value=>{for(const {mesh,index} of targets)mesh.morphTargetInfluences[index]=value;};
  return {
    blink(){if(!held&&elapsed===null){elapsed=0;wait=0;}},
    holdClosed(value){held=!!value;elapsed=null;wait=2.5+random()*3.5;apply(held?1:0);},
    update(dt){
      if(held)return;
      dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1));
      if(elapsed===null){wait-=dt;if(wait>0)return;elapsed=0;}
      elapsed+=dt;
      if(elapsed>=duration){elapsed=null;wait=2.5+random()*3.5;apply(0);return;}
      // A fast close, brief contact, then a softer reopening.
      apply(elapsed<.055?smooth(0,.055,elapsed):1-smooth(.08,duration,elapsed));
    },
  };
}
