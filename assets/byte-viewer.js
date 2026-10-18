import * as THREE from '../vendor/three/three.module.js';
import {createByteVat,VAT_BRAIN_HEIGHT} from '../src/byte-vat.js';
import {loadByteModel} from '../src/byte-model.js';
import {createByteBlink} from '../src/byte-blink.js';
import {createByteCollectors} from '../src/byte-collectors.js';
import {createBrainAttachments} from '../src/byte-attachments.js';
const canvas=document.getElementById('viewer'),status=document.getElementById('status');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x173038);
scene.add(new THREE.HemisphereLight(0xfff4e5,0x8298aa,2.4));
for(const [color,intensity,position] of [[0xffefd9,3,[3,4,5]],[0xc7c1ff,1.5,[-3,2,-2]]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(...position);scene.add(l);}
const camera=new THREE.PerspectiveCamera(35,1,.01,100),pivot=new THREE.Group();scene.add(pivot);
let yaw=.25,pitch=.25,distance=4.6,auto=true,drag=null,last=0;
let blink=null,brainAttachments=null;
const collectors=createByteCollectors(pivot,{brainAnchor:(i,out)=>brainAttachments?.(i,out)});collectors.loading.catch(console.error);
let collectorCount=1,feeding=false,inVat=false,bodyModel=null;
const fitDistance=()=>(inVat?5.7:4.6)/Math.min(1,camera.aspect);
const vatAssembly=createByteVat(pivot),vat=vatAssembly.group;vat.visible=false;
vatAssembly.loading.then(()=>canvas.dataset.vatModel='ready').catch(error=>{canvas.dataset.vatModel='fallback';console.error(error);});
const demoTargets=Array.from({length:10},(_,i)=>({x:Math.sin(i/10*Math.PI*2)*3,z:Math.cos(i/10*Math.PI*2)*3,type:'text',progress:0}));
document.getElementById('hoses').onclick=e=>{collectorCount=collectorCount%(inVat?10:4)+1;e.currentTarget.textContent=`${collectorCount} ${collectorCount===1?'hose':'hoses'}`;};
document.getElementById('vat').onclick=e=>{inVat=!inVat;vat.visible=inVat;collectorCount=Math.min(collectorCount,inVat?10:4);if(bodyModel)bodyModel.position.y=inVat?VAT_BRAIN_HEIGHT:.48;pivot.position.y=inVat?-1.05:-.55;distance=fitDistance();e.currentTarget.textContent=inVat?'Show brain':'Show vat';document.getElementById('hoses').textContent=`${collectorCount} ${collectorCount===1?'hose':'hoses'}`;};
document.getElementById('max-hoses').onclick=()=>{collectorCount=inVat?10:4;document.getElementById('hoses').textContent=`${collectorCount} hoses`;};
document.getElementById('feed').onclick=e=>{feeding=!feeding;e.currentTarget.setAttribute('aria-pressed',String(feeding));e.currentTarget.textContent=feeding?'Stop aiming':'Aim at data';};
const blinkButton=document.getElementById('blink'),closedButton=document.getElementById('closed');
blinkButton.onclick=()=>blink?.blink();
closedButton.onclick=()=>{const closed=closedButton.getAttribute('aria-pressed')!=='true';closedButton.setAttribute('aria-pressed',String(closed));closedButton.textContent=closed?'Open eyes':'Hold eyes closed';blinkButton.disabled=closed;blink?.holdClosed(closed);};
const rotate=document.getElementById('rotate');
function setAuto(value){auto=value;rotate.textContent=auto?'Pause rotation':'Resume rotation';rotate.setAttribute('aria-pressed',String(auto));}
rotate.onclick=()=>setAuto(!auto);
document.getElementById('reset').onclick=()=>{yaw=.25;pitch=.25;distance=fitDistance();setAuto(true);};
canvas.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);setAuto(false);});
canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.008;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.006,-1.2,1.2);drag.x=e.clientX;drag.y=e.clientY;});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance*Math.exp(e.deltaY*.001),1.4,Math.max(8,fitDistance()*1.5));},{passive:false});
function resize(){renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();distance=fitDistance();}
new ResizeObserver(resize).observe(canvas);resize();
try{const model=await loadByteModel();bodyModel=new THREE.Group();bodyModel.position.y=inVat?VAT_BRAIN_HEIGHT:.48;bodyModel.add(model);pivot.add(bodyModel);brainAttachments=createBrainAttachments(model,bodyModel,pivot);pivot.position.y=inVat?-1.05:-.55;blink=createByteBlink(model);blinkButton.disabled=closedButton.disabled=!blink;status.textContent='Drag to rotate · Scroll to zoom · Byte blinks automatically';canvas.dataset.modelLoaded='true';}catch(error){status.textContent='Byte could not load. Refresh to try again.';console.error(error);}
if(location.hash==='#vat')document.getElementById('vat').click();
renderer.setAnimationLoop(ms=>{const dt=last?Math.min((ms-last)/1000,.05):0;last=ms;collectors.update({inVat,count:collectorCount,targets:feeding?demoTargets.slice(0,collectorCount):[],dt,time:ms/1000});blink?.update(document.hidden?0:dt);if(inVat){vatAssembly.update(ms/1000);if(bodyModel)bodyModel.position.y=VAT_BRAIN_HEIGHT+Math.sin(ms*.002)*.035;}if(auto)yaw+=dt*.18;camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(0,0,0);renderer.render(scene,camera);});
