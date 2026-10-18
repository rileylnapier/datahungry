import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/loaders/GLTFLoader.js';
import { addStarterBlink } from './byte-blink.js';

export const BYTE_MODEL_URL=new URL('../assets/models/byte-body-v2.glb',import.meta.url).href;

// Normalize once inside a wrapper. Gameplay keeps ownership of position, bounce,
// rotation and evolution, independent of the model's export units and origin.
export function normalizeByteModel(model,{extent=1.25,rotationX=0,rotationY=0}={}){
  const oriented=new THREE.Group();oriented.rotation.set(rotationX,rotationY,0);oriented.add(model);
  const bounds=new THREE.Box3().setFromObject(oriented),size=bounds.getSize(new THREE.Vector3());
  const longest=Math.max(size.x,size.y,size.z);
  if(!Number.isFinite(longest)||longest<=0)throw new Error('Byte model has no usable geometry');
  const center=bounds.getCenter(new THREE.Vector3()),scale=extent/longest;
  const root=new THREE.Group();root.name='Byte mesh';root.add(oriented);
  oriented.position.copy(center).multiplyScalar(-1);
  root.scale.setScalar(scale);
  root.userData.size=size.multiplyScalar(scale).toArray();
  return root;
}

export async function loadByteModel({applyMaterial=()=>{},anisotropy=4}={}){
  const {scene,animations}=await new GLTFLoader().loadAsync(BYTE_MODEL_URL);
  addStarterBlink(scene);
  scene.traverse(object=>{
    if(!object.isMesh)return;
    object.castShadow=true;object.receiveShadow=true;
    if(object.isSkinnedMesh)object.frustumCulled=false;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      material.side=THREE.FrontSide;
      for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(material[key])material[key].anisotropy=anisotropy;
      applyMaterial(material);
    }
  });
  const model=normalizeByteModel(scene);model.animations=animations;
  return model;
}
