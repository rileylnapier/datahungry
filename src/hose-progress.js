import * as THREE from '../vendor/three/three.module.js';

// Color the skinned hose itself, from the creature's tip (1) back to Byte (0).
// Joint weights keep this coordinate attached as the hose stretches and bends.
export function applyHoseProgress(mesh,uniforms){
  if(!mesh.isSkinnedMesh)return;
  if(!mesh.geometry.getAttribute('hosePosition')){
    const joints=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
    const values=new Float32Array(joints.count);
    for(let i=0;i<values.length;i++)for(let j=0;j<4;j++)values[i]+=joints.getComponent(i,j)*weights.getComponent(i,j)/8;
    mesh.geometry.setAttribute('hosePosition',new THREE.BufferAttribute(values,1));
  }
  const material=mesh.material,compile=material.onBeforeCompile,cacheKey=material.customProgramCacheKey.bind(material),key=cacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
    compile.call(material,shader,renderer);
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='attribute float hosePosition; varying float vHosePosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHosePosition=hosePosition;');
    shader.fragmentShader='uniform float hoseProgress; uniform float hoseActive; uniform float hoseTime; uniform vec3 hoseColor; varying float vHosePosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float downloaded=smoothstep(1.0-hoseProgress-0.025,1.0-hoseProgress+0.025,vHosePosition)*step(0.001,hoseProgress)*hoseActive;
      float pulse=0.65+0.35*pow(0.5+0.5*sin(vHosePosition*35.0+hoseTime*9.0),4.0);
      diffuseColor.rgb=mix(diffuseColor.rgb,hoseColor,downloaded*0.65);
      totalEmissiveRadiance+=hoseColor*downloaded*pulse*1.4;`);
  };
  material.customProgramCacheKey=()=>key+'-hose-progress-v1';material.needsUpdate=true;
}
