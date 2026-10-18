import * as THREE from '../vendor/three/three.module.js';
import {GLTFLoader} from '../vendor/three/loaders/GLTFLoader.js';

export const VAT_MODEL_URL=new URL('../assets/models/byte-vat-v1.glb',import.meta.url).href;
export const VAT_BRAIN_HEIGHT=1.17;
// The prepared GLB is already in game units, grounded, with +Y up.
const profile=[[.747,.63],[.765,.70],[.775,.86],[.77,1.10],[.74,1.32],[.68,1.51],[.57,1.67],[.45,1.752]];
function shape(points){return points.map(([r,y])=>new THREE.Vector2(r,y));}

export function createByteVat(parent,{applyMaterial=()=>{},anisotropy=4}={}){
  const group=new THREE.Group();group.name='Byte travel vat';parent.add(group);
  const material=(Type,props)=>{const m=new Type(props);applyMaterial(m);return m;};
  const add=(geometry,mat,name)=>{const m=new THREE.Mesh(geometry,mat);m.name=name;group.add(m);return m;};
  // Alpha surfaces keep the brain readable on mobile without a transmission render pass.
  const glass=add(new THREE.LatheGeometry(shape(profile),64),
    material(THREE.MeshPhysicalMaterial,{color:0xc5eeef,transparent:true,opacity:.115,roughness:.12,metalness:.08,clearcoat:1,depthWrite:false,side:THREE.FrontSide}),'Vat glass');
  glass.renderOrder=5;
  const waterProfile=profile.filter(([,y])=>y<1.63).map(([r,y])=>[r-.022,y]);
  waterProfile.push([.582,1.63]);
  const liquid=add(new THREE.LatheGeometry(shape(waterProfile),48),
    material(THREE.MeshStandardMaterial,{color:0x9fa9ee,transparent:true,opacity:.14,roughness:.2,depthWrite:false,side:THREE.FrontSide}),'Vat liquid');
  liquid.renderOrder=3;
  const surface=add(new THREE.CircleGeometry(.582,64),
    material(THREE.MeshStandardMaterial,{color:0xb8c9ff,transparent:true,opacity:.24,roughness:.18,depthWrite:false,side:THREE.DoubleSide}),'Liquid surface');
  surface.rotation.x=-Math.PI/2;surface.position.y=1.63;surface.renderOrder=4;
  const waterline=add(new THREE.TorusGeometry(.582,.009,6,64),
    material(THREE.MeshBasicMaterial,{color:0xc6d8ff,transparent:true,opacity:.45,depthWrite:false}),'Waterline');
  waterline.rotation.x=Math.PI/2;waterline.position.y=1.63;waterline.renderOrder=4;
  const highlights=[];
  for(const angle of [.85,3.9]){
    const strip=add(new THREE.LatheGeometry(shape(profile.slice(1,-1).map(([r,y])=>[r+.004,y])),12,angle,.035),
      material(THREE.MeshBasicMaterial,{color:0xe0ffff,transparent:true,opacity:.27,depthWrite:false,side:THREE.DoubleSide}),'Glass reflection');
    strip.renderOrder=6;highlights.push(strip);
  }
  const bubbles=[];
  const bubbleMat=material(THREE.MeshStandardMaterial,{color:0xc7edff,transparent:true,opacity:.45,roughness:.1,depthWrite:false});
  for(let i=0;i<5;i++){
    const b=add(new THREE.SphereGeometry(.016+(i%3)*.006,10,8),bubbleMat,'Liquid bubble');
    b.renderOrder=4;bubbles.push(b);
  }
  // A compact housing remains if the optional downloaded asset cannot load.
  const fallback=new THREE.Group();group.add(fallback);
  for(const [r,h,y,c] of [[.84,.28,.45,0xe0ddc7],[.45,.11,1.8,0xe0ddc7]]){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,40),material(THREE.MeshStandardMaterial,{color:c,roughness:.4}));
    m.position.y=y;fallback.add(m);
  }
  const loading=new GLTFLoader().loadAsync(VAT_MODEL_URL).then(({scene})=>{
    scene.name='Meshy vat hardware';
    scene.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=o.receiveShadow=true;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key])m[key].anisotropy=anisotropy;
        applyMaterial(m);
      }
    });
    group.add(scene);fallback.visible=false;return scene;
  });
  return {group,loading,update(time){
    surface.position.y=waterline.position.y=1.63+Math.sin(time*1.8)*.004;
    surface.rotation.z=Math.sin(time*.7)*.009;
    bubbles.forEach((b,i)=>{
      const phase=(time*.09+i*.21)%1,a=i*2.4;
      b.position.set(Math.sin(a)*.50+Math.sin(time+i)*.012,.73+phase*.83,Math.cos(a)*.50);
      b.scale.setScalar(Math.min(1,phase*12,(1-phase)*12));
    });
    highlights.forEach((h,i)=>h.material.opacity=.23+Math.sin(time*.8+i)*.035);
  }};
}
