import * as THREE from '../vendor/three/three.module.js';
import {GLTFLoader} from '../vendor/three/loaders/GLTFLoader.js';

export const COLLECTOR_URL=new URL('../assets/models/byte-collector-v1.glb',import.meta.url).href;
const forward=new THREE.Vector3(0,0,1);
let templatePromise;

// Object3D.clone shares skeletons. Rebind every mesh to the cloned bones so
// buying a second hose cannot move the first hose's joints.
export function cloneCollector(template){
  const copy=template.clone(true),source=[],clones=[],lookup=new Map();
  template.traverse(o=>source.push(o));copy.traverse(o=>clones.push(o));
  source.forEach((o,i)=>lookup.set(o,clones[i]));
  source.forEach((o,i)=>{
    if(!o.isSkinnedMesh)return;
    const mesh=clones[i];
    mesh.skeleton=new THREE.Skeleton(o.skeleton.bones.map(b=>lookup.get(b)),o.skeleton.boneInverses.map(m=>m.clone()));
    mesh.bindMatrix.copy(o.bindMatrix);mesh.bindMatrixInverse.copy(o.bindMatrixInverse);
    mesh.frustumCulled=false;
  });
  return copy;
}

export function createByteCollectors(parent,{applyMaterial=()=>{},template=null,brainAnchor=null}={}){
  const slots=[],group=new THREE.Group();group.name='Byte collectors';parent.add(group);
  let ready=false;
  const asset=template||(templatePromise??=new GLTFLoader().loadAsync(COLLECTOR_URL));
  const loading=asset.then(({scene})=>{
    for(let i=0;i<10;i++){
      const root=cloneCollector(scene);group.add(root);root.visible=false;
      root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material=o.material.clone();applyMaterial(o.material);}});
      const bones=Array.from({length:9},(_,j)=>root.getObjectByName(`Hose_${String(j).padStart(2,'0')}`));
      const rest=bones.map(b=>b.quaternion.clone());
      const socket=new THREE.Mesh(new THREE.SphereGeometry(.075,12,8),new THREE.MeshStandardMaterial({color:0x5f9691,roughness:.4}));applyMaterial(socket.material);root.add(socket);
      slots.push({root,bones,rest,socket,target:null,kick:0,port:null,dockBlend:0,mouth:new THREE.Vector3(),curve:new THREE.CubicBezierCurve3()});
    }
    ready=true;
  });
  const localTarget=new THREE.Vector3(),direction=new THREE.Vector3(),tangent=new THREE.Vector3(),rotation=new THREE.Quaternion();
  return {
    loading,
    get ready(){return ready;},
    getOrigin(target){return slots.find(s=>s.target===target)?.mouth;},
    getDockPort(index){const s=slots[index];return s?.root.visible&&s.dockBlend>.85?s.port:null;},
    getDockPoint(index,t){
      const s=slots[index];if(!s?.root.visible||!s.port||s.dockBlend<.85)return null;
      const point=s.curve.getPoint(THREE.MathUtils.clamp(t,0,1));return parent.localToWorld(point);
    },
    collect(target){const s=slots.find(s=>s.target===target);if(s){s.kick=.25;s.target=null;}},
    update({count=1,targets=[],dt=0,time=0,inVat=false,dockPorts=[]}={}){
      if(!ready)return;
      count=THREE.MathUtils.clamp(Math.floor(count),1,inVat?10:4);
      if(dockPorts.length)targets=[];
      for(let i=count;i<slots.length;i++){slots[i].port=null;slots[i].dockBlend=0;}
      for(let i=0;i<slots.length;i++)if(i>=count||!targets.includes(slots[i].target))slots[i].target=null;
      for(const target of targets)if(!slots.some(s=>s.target===target)){const free=slots.slice(0,count).find(s=>!s.target);if(free)free.target=target;}
      parent.updateWorldMatrix(true,false);
      slots.forEach((s,i)=>{
        s.root.visible=i<count;if(!s.root.visible)return;
        const angle=inVat?i/count*Math.PI*2:(count===1?0:i/count*Math.PI*2);
        const outward=inVat?new THREE.Vector3(Math.sin(angle),0,Math.cos(angle)):new THREE.Vector3(0,0,1);
        // The first sprout sits above the face like a unicorn horn. Upgrades grow
        // back along the crest without moving the existing forehead sprout.
        const anchor=inVat?outward.clone().multiplyScalar(.76):new THREE.Vector3(0,0,.44-i*.23);
        anchor.y=inVat?.48:.84-Math.abs(anchor.z)*.13;
        if(!inVat&&brainAnchor)brainAnchor(i,anchor);
        if(dockPorts.length&&!dockPorts.includes(s.port)){
          const origin=parent.localToWorld(anchor.clone());
          const available=dockPorts.filter(port=>!slots.some(other=>other!==s&&other.port===port));
          s.port=available.sort((a,b)=>origin.distanceToSquared(a)-origin.distanceToSquared(b))[0]||null;
        }
        s.dockBlend=THREE.MathUtils.lerp(s.dockBlend,dockPorts.length&&s.port?1:0,1-Math.exp(-dt*10));
        if(s.dockBlend>.995)s.dockBlend=1;
        if(s.dockBlend<.001){s.dockBlend=0;if(!dockPorts.length)s.port=null;}
        if(s.target){s.port=null;s.dockBlend=0;}
        s.kick=Math.max(0,s.kick-dt);
        const recoil=Math.sin(s.kick/.25*Math.PI)*.09;
        // Keep the mohawk roots fixed, but let each resting sprout lean to its
        // own side. Different rhythms avoid a synchronized row of antennae.
        const restingSprout=!inVat&&!s.target;
        const sway=restingSprout?Math.sin(time*(1.15+i*.13)+i*2.4)*.055+Math.sin(time*1.9+i*.8)*.018:0;
        const lean=restingSprout?[-.65,1,-1,.8][i]*.22+sway:0;
        if(s.target){localTarget.set(s.target.x,.65,s.target.z);parent.worldToLocal(localTarget);direction.subVectors(localTarget,anchor).normalize();}
        else direction.copy(outward).multiplyScalar(inVat?.8:.35).add(new THREE.Vector3(0,(inVat?.35:.8)+Math.sin(time*1.5+i)*.12,0)).normalize();
        if(restingSprout)direction.x=lean*1.5;
        direction.normalize();
        const end=anchor.clone().addScaledVector(outward,inVat?.32:.12).addScaledVector(direction,.30-recoil);
        end.y+=(inVat?.10:.22)+Math.sin(time*2+i)*.035;
        if(restingSprout){end.x+=lean*.65;end.y+=[.025,-.035,.045,-.015][i];}
        s.curve.v0.copy(anchor);
        s.curve.v1.copy(anchor).addScaledVector(outward,inVat?.30:.04);s.curve.v1.y+=inVat?.16:.34;
        s.curve.v3.copy(end);s.curve.v2.copy(end).addScaledVector(direction,-.22);
        if(restingSprout){s.curve.v1.x+=lean*.2;s.curve.v2.x+=sway*.35;}
        if(s.port&&s.dockBlend>0){
          // Stretch the actual rig to the socket. The nozzle points down into
          // the port; account for Byte's scale so its mouth meets it exactly.
          const goal=parent.worldToLocal(new THREE.Vector3(s.port.x,s.port.y,s.port.z));
          const above=parent.worldToLocal(new THREE.Vector3(s.port.x,s.port.y+1,s.port.z));
          const dockDirection=goal.clone().sub(above).normalize();
          const dockEnd=goal.clone().addScaledVector(dockDirection,-.175);
          const shoulder=anchor.clone().lerp(dockEnd,.23);shoulder.y=Math.max(anchor.y,dockEnd.y)+(inVat?.4:.75);
          s.curve.v1.lerp(shoulder,s.dockBlend);
          s.curve.v2.lerp(dockEnd.clone().addScaledVector(dockDirection,-.5),s.dockBlend);
          s.curve.v3.lerp(dockEnd,s.dockBlend);
          direction.lerp(dockDirection,s.dockBlend).normalize();
        }
        s.socket.position.copy(anchor);
        s.bones.forEach((bone,j)=>{
          const t=j/(s.bones.length-1);s.curve.getPoint(t,bone.position);s.curve.getTangent(t,tangent);
          rotation.setFromUnitVectors(forward,tangent);bone.quaternion.copy(rotation).multiply(s.rest[j]);
        });
        s.mouth.copy(s.curve.v3).addScaledVector(direction,.175);parent.localToWorld(s.mouth);
      });
    },
  };
}
