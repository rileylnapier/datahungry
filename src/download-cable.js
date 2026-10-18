import * as THREE from '../vendor/three/three.module.js';
import { TYPES } from './state.js';

// Instanced solid segments retain their width on mobile WebGL, unlike lineWidth.
const SEGMENTS=24;
const geometry=new THREE.CylinderGeometry(1,1,1,8);
const up=new THREE.Vector3(0,1,0);
export function createDownloadCable(scene,labels){
  const track=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:0x35565c,transparent:true,opacity:.85}),SEGMENTS);
  const fill=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:0xc8f99d,transparent:true,opacity:1,toneMapped:false}),SEGMENTS);
  track.material.depthWrite=false;fill.renderOrder=2;
  track.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fill.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  track.frustumCulled=fill.frustumCulled=false;
  scene.add(track,fill);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.105,12,8),fill.material);head.renderOrder=3;scene.add(head);
  const badge=document.createElement('div');badge.className='download-label';badge.hidden=true;labels.append(badge);
  const points=Array.from({length:SEGMENTS+1},()=>new THREE.Vector3());
  const transform=new THREE.Object3D(),delta=new THREE.Vector3(),end=new THREE.Vector3(),middle=new THREE.Vector3();
  const cable={target:null,completion:0,points,track,fill,head,badge};
  cable.hide=()=>{track.visible=fill.visible=head.visible=false;badge.hidden=true;};
  cable.update=(player,target,progress,time,phase,project,completion=0)=>{
    track.visible=fill.visible=head.visible=true;badge.hidden=false;
    progress=THREE.MathUtils.clamp(progress,0,1);
    if(target){const data=TYPES[target.type];cable.caption=data?`${target.packetName?.toUpperCase()||{text:'TEXT',image:'IMAGE',code:'CODE',audio:'SOUND',video:'VIDEO'}[target.type]} · ${target.packetSize??data.size} KB`:'BENCHMARK';fill.material.color.setHex(data?.color??0xc8f99d);}
    if(target)for(let i=0;i<=SEGMENTS;i++){
      const t=i/SEGMENTS;
      points[i].set(player.x+(target.x-player.x)*t+Math.sin(t*Math.PI)*Math.sin(time*4+phase)*.25,(player.downloadHeight??.65)*(1-t)+.65*t+Math.sin(t*Math.PI)*.65,player.z+(target.z-player.z)*t);
    }
    let count=0;
    for(let i=0;i<SEGMENTS;i++){
      const a=points[i],b=points[i+1];delta.subVectors(b,a);
      transform.position.copy(a).addScaledVector(delta,.5);transform.quaternion.setFromUnitVectors(up,delta.clone().normalize());
      transform.scale.set(.085,delta.length()*.9,.085);transform.updateMatrix();track.setMatrixAt(i,transform.matrix);
      // Data starts at the creature (last segment) and travels into Byte.
      const fraction=THREE.MathUtils.clamp(progress*SEGMENTS-(SEGMENTS-1-i),0,1);
      if(fraction>0){end.copy(b).addScaledVector(delta,-fraction);transform.position.copy(b).lerp(end,.5);const pulse=1+completion*.5;transform.scale.set(.065*pulse,delta.length()*fraction*.9,.065*pulse);transform.updateMatrix();fill.setMatrixAt(count++,transform.matrix);}
    }
    fill.count=count;track.instanceMatrix.needsUpdate=fill.instanceMatrix.needsUpdate=true;
    const position=(1-progress)*SEGMENTS,index=Math.min(SEGMENTS-1,Math.floor(position));head.position.copy(points[index]).lerp(points[index+1],position-index);
    head.scale.setScalar(1+completion*.8);head.visible=progress>0;
    fill.material.opacity=completion?Math.min(1,completion*3):1;track.material.opacity=completion?completion*.85:.85;
    middle.copy(points[SEGMENTS/2]);middle.y+=.3;
    const screen=project(middle);badge.hidden=!screen.visible;badge.style.left=screen.x+'px';badge.style.top=screen.y+'px';badge.style.opacity=String(completion?Math.min(1,completion*3):1);
    badge.textContent=`${cable.caption} · ${completion?'✓ 100%':Math.floor(progress*100)+'%'}`;
  };
  cable.hide();return cable;
}
