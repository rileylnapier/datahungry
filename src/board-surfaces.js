import * as THREE from '../vendor/three/three.module.js';

// Reusable silhouettes keep irregular floor plating instanced and inexpensive.
export const PANEL_CONTOURS=[
  [[-.5,-.34],[-.34,-.5],[.5,-.5],[.5,.34],[.34,.5],[-.5,.5]],
  [[-.5,-.5],[.27,-.5],[.5,-.27],[.5,.5],[-.37,.5],[-.5,.37]],
  [[-.5,-.5],[.5,-.5],[.5,.08],[.28,.08],[.28,.5],[-.34,.5],[-.5,.34]],
  [[-.5,-.28],[-.28,-.5],[.34,-.5],[.5,-.34],[.5,.36],[.36,.5],[-.5,.5]],
];
export const PANEL_GEOMETRIES=PANEL_CONTOURS.map(points=>{
  const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:1,steps:1});
  geometry.rotateX(-Math.PI/2);return geometry;
});

export function boardPanels(area){
  const panels=[],heights=[4.7,6.1,3.8,5.4],widths=[5.6,3.7,7.3,4.6];
  let row=0;
  for(let z=area.minZ;z<area.maxZ-.3;row++){
    const depth=Math.min(heights[row%heights.length],area.maxZ-z);let column=0;
    for(let x=area.minX;x<area.maxX-.3;column++){
      let width=Math.min(widths[(column+row*3)%widths.length],area.maxX-x);
      if(area.maxX-x-width<1.6)width=area.maxX-x;
      panels.push({x:x+width/2,z:z+depth/2,width:width-.13,depth:depth-.13,shape:(row+column*3)%PANEL_CONTOURS.length,tone:(row*2+column)%3});x+=width;
    }
    z+=depth;
  }
  return panels;
}

export function createSurfaceTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512);let seed=173;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<pixels.data.length;i+=4){const v=225+Math.floor(random()*19);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}
  ctx.putImageData(pixels,0,0);
  // Broad rubbed patches, fine machining lines and occasional hairline scuffs.
  for(let i=0;i<28;i++){
    const x=random()*512,y=random()*512,r=12+random()*80,g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(45,55,55,${.035+random()*.065})`);g.addColorStop(1,'rgba(45,55,55,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  for(let i=0;i<250;i++){
    const x=random()*512,y=random()*512,length=3+random()*36;
    ctx.strokeStyle=i%3?'rgba(255,255,245,.12)':'rgba(55,65,63,.16)';ctx.lineWidth=.4+random()*.45;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+length,y+length*(random()-.65)*.7);ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}
