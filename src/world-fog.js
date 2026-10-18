import * as THREE from '../vendor/three/three.module.js';

// A shared world-space mask hides terrain and props together, including tall props.
export function createWorldFog(exploration,layout){
  const width=layout.maxX-layout.minX+2,depth=layout.maxZ-layout.minZ+2;
  const originX=layout.minX-1,originZ=layout.minZ-1;
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(width*8);canvas.height=Math.ceil(depth*8);
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  const bounds=new THREE.Vector4(originX,originZ,width,depth),color=new THREE.Color(0x132a32);
  const patched=new WeakSet();let revision=-1;
  function update(){
    if(revision===exploration.revision)return;revision=exploration.revision;
    ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
    // Soften the edge between discovered cells and the hidden world.
    ctx.fillStyle='#fff';
    for(const key of exploration.cells){const [x,z]=key.split(',').map(Number);ctx.fillRect((x-originX)*8,(originZ+depth-z-1)*8,8,8);}
    ctx.filter='blur(3px)';ctx.globalCompositeOperation='source-in';ctx.drawImage(canvas,0,0);ctx.filter='none';ctx.globalCompositeOperation='source-over';
    texture.needsUpdate=true;
  }
  function apply(material){
    if(patched.has(material))return;patched.add(material);
    material.onBeforeCompile=shader=>{
      shader.uniforms.exploredMap={value:texture};shader.uniforms.exploredBounds={value:bounds};shader.uniforms.unexploredColor={value:color};
      shader.vertexShader='varying vec2 exploredPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 exploredVertex=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          exploredVertex=instanceMatrix*exploredVertex;
        #endif
        exploredPosition=(modelMatrix*exploredVertex).xz;`);
      shader.fragmentShader='uniform sampler2D exploredMap; uniform vec4 exploredBounds; uniform vec3 unexploredColor; varying vec2 exploredPosition;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>
        vec2 exploredUV=(exploredPosition-exploredBounds.xy)/exploredBounds.zw;
        float inside=step(0.0,exploredUV.x)*step(0.0,exploredUV.y)*step(exploredUV.x,1.0)*step(exploredUV.y,1.0);
        float discovered=texture2D(exploredMap,exploredUV).r*inside;
        gl_FragColor.rgb=mix(unexploredColor,gl_FragColor.rgb,smoothstep(0.15,0.95,discovered));`);
    };
    material.customProgramCacheKey=()=> 'data-hungry-exploration-v1';material.needsUpdate=true;
  }
  update();return {apply,update};
}
