import {STORY_SITES,networkAccess,terminalEvent} from './story.js';
import {networkWalls} from './network-layout.js';
import {agentLoad,AGENT_CAPACITY} from './agents.js';
import * as THREE from '../vendor/three/three.module.js';
import {createEnvironmentArt,hardwareGeometry} from './environment-art.js';
import {createSurfaceTexture} from './board-surfaces.js';
import {DOCK_PORTS,atHomeDock} from './home-dock.js';
import {DEVICE_PORTS,devicePort} from './device-ports.js';
import {CAMERA_OFFSET} from './camera-view.js';
import { createByteVat, VAT_BRAIN_HEIGHT } from './byte-vat.js';
import { loadByteModel } from './byte-model.js';
import { createByteAnimator } from './byte-animation.js';
import { createByteBlink } from './byte-blink.js';
import { createByteCollectors } from './byte-collectors.js';
import { createBrainAttachments } from './byte-attachments.js';
import { TYPES, range, level, connections } from './state.js';
import { createWorldFog } from './world-fog.js';
import { clampZoom } from './zoom.js';
import { createDownloadCable } from './download-cable.js';
import { picturesUnlocked, feedAvailable, storageUsed, storageCapacity } from './processing.js';
import { worldLayout, FOLDERS, MEMORY_MODULES, PROCESSOR, serverTowers, BASE_MACHINES, BASE_STORAGE, BASE_SORTER, NETWORK_DEVICES,NETWORK_ROUTER, DOCK_PILLARS } from './world-layout.js';

const materials = new Map();
let fogMaterial=()=>{};
function mat(color, glow = 0) {
  const key = `${color}-${glow}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .52, metalness: .16, emissive: color, emissiveIntensity: glow }));
  const material=materials.get(key);fogMaterial(material);return material;
}
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
function mesh(parent, geo, material, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  fogMaterial(material);const m = new THREE.Mesh(geo, material); m.position.set(x,y,z); m.scale.set(sx,sy,sz); parent.add(m); return m;
}
function ball(p, c, x, y, z, sx, sy = sx, sz = sx, glow = 0) { return mesh(p, sphereGeo, mat(c,glow), x,y,z,sx,sy,sz); }
function box(p,c,x,y,z,sx,sy,sz,glow=0) { const m=mesh(p,sx>=.4&&sz>=.4&&sy>=.05?hardwareGeometry:cubeGeo,mat(c,glow),x,y,z,sx,sy,sz);m.castShadow=true;m.receiveShadow=true;return m; }
function cylinder(p,c,x,y,z,r,h,glow=0) {const m=mesh(p,new THREE.CylinderGeometry(r,r,h,32),mat(c,glow),x,y,z);m.receiveShadow=true;return m;}
function torus(p,c,x,y,z,r,t,glow=0){const m=mesh(p,new THREE.TorusGeometry(r,t,8,48),mat(c,glow),x,y,z);m.rotation.x=Math.PI/2;return m;}
function tube(p, points, c, radius=.04, glow=0) { return mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(a=>new THREE.Vector3(...a))),24,radius,6,false),mat(c,glow)); }
let seed = 84;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

export function createScene(canvas, state, content, exploration) {
  const layout=worldLayout(content),{safe,hard,gateZ}=layout;
  const worldFog=createWorldFog(exploration,layout);fogMaterial=worldFog.apply;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x132a32);scene.fog=new THREE.FogExp2(0x132a32,.023);
  scene.add(new THREE.HemisphereLight(0xc5e0db,0x102b35,1.7));
  const sun=new THREE.DirectionalLight(0xffefd0,3.1);sun.position.set(-12,24,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,far:65});sun.shadow.bias=-.001;scene.add(sun);
  const rim=new THREE.DirectionalLight(0x91a1ff,2);rim.position.set(8,8,-15);scene.add(rim);
  const camera=new THREE.OrthographicCamera(-15,15,12,-12,.1,100);
  let zoomTarget=clampZoom(state.zoom),fogInitialized=false;camera.zoom=zoomTarget;
  function setZoom(value){zoomTarget=clampZoom(value);return zoomTarget;}
  const focus=new THREE.Vector3(0,0,1);const raycaster=new THREE.Raycaster();
  const ground=mesh(scene,new THREE.PlaneGeometry(layout.maxX-layout.minX+20,layout.maxZ-layout.minZ+20),mat(0x1a383d));ground.rotation.x=-Math.PI/2;ground.position.set(0,-.12,(layout.minZ+layout.maxZ)/2);ground.receiveShadow=true;
  // Keep the backdrop below both substrates: the Local Network top is y=0.
  // Coplanar surfaces fight for depth and flicker as the camera moves.
  // Distinct board substrates; surface detail is batched by the art layer.
  box(scene,0x1b2941,0,-.1,(hard.minZ+hard.maxZ)/2,hard.maxX-hard.minX+8,.2,hard.maxZ-hard.minZ+5);
  const environmentArt=createEnvironmentArt(scene,layout,content,worldFog.apply);
  const walls=networkWalls(content),wallBatch=new THREE.InstancedMesh(cubeGeo,mat(0x152733),walls.length),wallTransform=new THREE.Object3D();
  walls.forEach((b,i)=>{wallTransform.position.set((b.minX+b.maxX)/2,.45,(b.minZ+b.maxZ)/2);wallTransform.scale.set(b.maxX-b.minX,.9,b.maxZ-b.minZ);wallTransform.updateMatrix();wallBatch.setMatrixAt(i,wallTransform.matrix);});
  wallBatch.receiveShadow=true;wallBatch.castShadow=true;wallBatch.computeBoundingSphere();scene.add(wallBatch);
  for(const d of content.areas[1].districts||[]){
    const b=d.bounds,color=Number(d.color.replace('#','0x'));
    for(const x of [b.minX+.15,b.maxX-.15])box(scene,color,x,.09,(b.minZ+b.maxZ)/2,.08,.045,b.maxZ-b.minZ-.3,.35);
    for(const z of [b.minZ+.15,b.maxZ-.15])box(scene,color,(b.minX+b.maxX)/2,.09,z,b.maxX-b.minX-.3,.045,.08,.35);
    if(!d.safe)for(let i=0;i<5;i++)box(scene,0xf58b82,(b.minX+b.maxX)/2-2+i,.12,b.maxZ-.7,.5,.07,.5,.4);
  }
  const router=new THREE.Group();scene.add(router);router.position.set(NETWORK_ROUTER.x,0,NETWORK_ROUTER.z);
  box(router,0x506f7d,0,.5,0,3,1,1.8);for(const x of [-1,1]){cylinder(router,0x82cbd5,x,1.5,0,.07,1.6);ball(router,0xb8ffe0,x,2.3,0,.12,.12,.12,.5);}
  for(let i=0;i<5;i++)box(router,0xb8ffe0,-.8+i*.4,.5,.92,.12,.12,.03,.6);
  // Small, readable interactable hardware. Kept off travel lanes.
  const storyHardware={};
  for(const id of ['terminal','infected','backup','relay']){
    const p=STORY_SITES[id],g=new THREE.Group();g.position.set(p.x,0,p.z);scene.add(g);
    box(g,0x273d43,0,.16,0,1.8,.3,1.4);
    box(g,0xd7d0b4,0,.7,0,1.35,.9,.8);
    box(g,0x102a30,0,1.4,-.12,1.5,1.05,.3);
    const screen=box(g,p.color,0,1.4,.05,1.22,.78,.035,.4);
    for(let i=0;i<3;i++)box(g,0x183c3b,-.15,1.6-i*.19,.08,.8-i*.18,.05,.02);
    box(g,0x89ac9d,0,.6,.5,1.3,.08,.3);
    const beacon=ball(g,p.color,.62,2,-.12,.1,.1,.1,.5);
    const halo=torus(g,p.color,0,.12,0,1.12,.035,.35);
    storyHardware[id]={g,screen,beacon,halo};
  }
  const mediaDisplay=new THREE.Group();mediaDisplay.position.set(-26,0,-86.2);scene.add(mediaDisplay);
  box(mediaDisplay,0x263a43,0,1.5,0,3.4,2,.3);
  const mediaScreen=box(mediaDisplay,0x472e3d,0,1.5,.17,3.05,1.65,.035,.1);
  const movingFrame=ball(mediaDisplay,0xf3cf91,-.8,1.5,.23,.22,.22,.035,.3);
  const speakerLights=[];
  for(const side of [-1,1]){box(mediaDisplay,0x233d42,side*2,1.2,0,.5,1.6,.6);for(const y of [.8,1.5]){cylinder(mediaDisplay,0x71989a,side*2,y,.35,.18,.08);speakerLights.push(ball(mediaDisplay,0x88dfe1,side*2,y,.4,.12,.12,.025,.4));}}
  // Firewall remains red; the allowed relay route lights independently.
  const firewallStatus=box(router,0xef977d,0,1.13,.3,1.3,.12,.35,.45);
  const relayTrace=box(scene,0x8de0d0,0,.1,-108,.1,.06,3,.5);
  // The starter habitat is a contained virtual sandbox on a computer board.
  const boardCenter=(safe.minZ+safe.maxZ)/2,boardDepth=safe.maxZ-safe.minZ+7;
  box(scene,0x24453f,0,-.18,boardCenter,safe.maxX-safe.minX+6,.3,boardDepth);
  for(const x of [safe.minX-2,safe.maxX+2]){
    box(scene,0x49675e,x,.18,boardCenter,.25,.5,boardDepth);
    box(scene,0x96b9a0,x,.46,boardCenter,.08,.04,boardDepth,.2);
  }
  box(scene,0x49675e,0,.18,safe.maxZ+2,safe.maxX-safe.minX+4,.5,.25);
  for(const x of [safe.minX-1,safe.maxX+1])for(const z of [safe.maxZ+1,safe.minZ-1]){
    cylinder(scene,0x9ba99b,x,.16,z,.28,.16);box(scene,0x314f4b,x,.25,z,.32,.015,.05);
  }
  // Memory modules and a CPU establish the computer scale.
  for(const [x,z] of MEMORY_MODULES){
    box(scene,0x426b53,x,.18,z,2.5,.3,6);
    for(let i=0;i<4;i++){box(scene,0x172d31,x,.42,z-2.1+i*1.4,1.6,.35,.9);for(const side of [-1,1])box(scene,0xb3aa75,x+side*1.05,.3,z-2.1+i*1.4,.3,.08,.9);}
  }
  box(scene,0xa18e65,PROCESSOR.x,.2,PROCESSOR.z,PROCESSOR.width,.4,PROCESSOR.depth);box(scene,0x253e47,10,.55,-20,3.6,.4,3.6);
  for(let i=0;i<10;i++){const offset=-2.1+i*.47;for(const side of [-1,1]){box(scene,0xa6ad8a,10+side*2.35,.3,-20+offset,.55,.08,.12);box(scene,0xa6ad8a,10+offset,.3,-20+side*2.35,.12,.08,.55);}}
  // Storage folders sit behind their matching analyzers at home.
  for(const [x,z,color] of FOLDERS){
    box(scene,0x30494a,x,.08,z,5,.16,3.5);
    box(scene,color,x,1,z,3.5,1.8,.3);box(scene,color,x-.9,2,z,.95,.35,.3);
    const front=box(scene,color,x,.85,z+.7,3.5,1.6,.2);front.rotation.x=-.18;
    box(scene,0xf0efce,x,.95,z+.87,1.1,.38,.03);
  }
  const storageViews={};
  for(const [type,pos] of Object.entries(BASE_STORAGE)){
    const group=new THREE.Group();group.position.set(pos.x,0,pos.z);scene.add(group);
    box(group,0x16383c,0,.23,1.25,3.6,.12,.22);
    const fill=box(group,pos.color,-1.8,.31,1.25,.01,.08,.18,.5);
    const modules=Array.from({length:6},(_,i)=>{
      const m=new THREE.Group();group.add(m);m.position.set(1.95,.32+i*.38,0);
      box(m,0x45645f,0,0,0,.6,.32,1.7);box(m,pos.color,0,.02,.88,.4,.1,.04,.4);return m;
    });
    storageViews[type]={fill,modules};
  }
  const emitterRings=new Map();
  const pipeFinish=new THREE.MeshStandardMaterial({color:0xe6d9b9,map:createSurfaceTexture(),metalness:.38,roughness:.34});
  const pipeInside=new THREE.MeshStandardMaterial({color:0x102126,roughness:.85,side:THREE.DoubleSide});
  for(const spawn of content.areas[0].spawns){
    if(!spawn.emitter)continue;
    const e=spawn.emitter,g=new THREE.Group();g.position.set(e.x,0,e.z);scene.add(g);
    const color={text:0xd8efa8,image:0xb9a5ef,code:0xf3b77f}[spawn.creature];
    // A smooth elbow with a recessed throat, metal lip and illuminated collars.
    const elbow=new THREE.CatmullRomCurve3([[0,.28,-1.2],[0,.86,-1.14],[0,1,-.5],[0,1,.65]].map(p=>new THREE.Vector3(...p)));
    const housing=mesh(g,new THREE.TubeGeometry(elbow,40,.48,24,false),pipeFinish);housing.castShadow=true;housing.receiveShadow=true;
    for(const [z,bandColor] of [[-.5,0xb5f2c5],[.13,color]]){
      const collar=torus(g,0x4b6866,0,1,z,.49,.065);collar.rotation.x=0;
      const band=torus(g,bandColor,0,1,z+.015,.548,.025,1);band.rotation.x=0;
    }
    const throat=mesh(g,new THREE.CylinderGeometry(.405,.36,.38,32,1,true),pipeInside,0,1,.48);throat.rotation.x=Math.PI/2;
    mesh(g,new THREE.CircleGeometry(.36,32),mat(0x070f14),0,1,.285);
    const rim=mesh(g,new THREE.TorusGeometry(.452,.066,12,48),pipeFinish,0,1,.69);rim.castShadow=true;
    const lip=torus(g,color,0,1,.755,.474,.022,.55);lip.rotation.x=0;
    const pulse=torus(g,color,0,1,.73,.41,.018,.8);pulse.rotation.x=0;
    emitterRings.set(e.id,{pulse,lip,type:spawn.creature,remaining:0});
    box(g,color,.72,.38,-1.15,.12,.5,.14,.4);
  }
  function pulseEmitter(id){const emitter=emitterRings.get(id);if(emitter)emitter.remaining=.45;}
  // Familiar devices make this a small local network, with wired routes between them.
  const agentViews={};
  for(const id of ['courier','harvester']){
    const color=id==='courier'?0x89e7d5:0xb9a5ef,g=new THREE.Group();scene.add(g);
    ball(g,color,0,.65,0,.3,.3,.3);box(g,0x223f50,0,.65,.26,.4,.18,.07);
    for(const x of [-.1,.1])ball(g,0xe6fff0,x,.67,.31,.035);
    if(id==='courier'){
      const pod=box(g,0xb5efe0,0,.55,-.32,.65,.65,.5);pod.material=pod.material.clone();pod.material.transparent=true;pod.material.opacity=.28;pod.material.depthWrite=false;
      for(const x of [-.3,.3])box(g,0x41656b,x,.55,-.32,.055,.65,.5);
    }else{
      box(g,0x29494f,0,.45,-.29,.45,.4,.3);
      const nozzle=mesh(g,new THREE.CylinderGeometry(.15,.11,.35,12),mat(color),0,.43,.42);nozzle.rotation.x=Math.PI/2;
      const rim=mesh(g,new THREE.TorusGeometry(.15,.035,6,16),mat(0xe6efdc),0,.43,.6);
      mesh(g,new THREE.CircleGeometry(.12,16),mat(0x142632),0,.43,.605);
    }
    const pack=box(g,color,0,.45,-.46,.4,.02,.03,.5);
    for(const x of [-.34,.34])torus(g,color,x,.36,0,.16,.035,.3);
    const beam=box(scene,color,0,.7,0,.045,.045,1,.7);beam.visible=false;
    agentViews[id]={group:g,pack,beam};
  }
  const deviceLights={};
  for(const [id,pos] of Object.entries(NETWORK_DEVICES)){
    const g=new THREE.Group();g.position.set(pos.x,0,pos.z);scene.add(g);
    box(g,0x3a4764,0,.12,0,4,.24,3);
    box(g,0xa5a5b4,0,.32,.4,3,.25,1.5);
    box(g,0x19353d,0,1.35,-.6,3,2,.25);
    box(g,pos.color,0,1.35,-.44,2.7,1.7,.04,.2);
    if(id==='photos'){
      for(const side of [-1,1]){
        const x=side*.65;ball(g,side<0?0x8664ae:0xb38052,x,1.45,-.32,.3,.3,.04);
        for(const ear of [-1,1])ball(g,side<0?0x8664ae:0xb38052,x+ear*.24,side<0?1.74:1.38,-.31,.09,side<0?.17:.23,.04);
        for(const eye of [-1,1])ball(g,0x17323b,x+eye*.1,1.48,-.26,.025);
      }
    }else for(let i=0;i<4;i++)box(g,0x355e5b,-.3+i*.08,1.9-i*.3,-.39,1.7-i*.2,.08,.03);
    for(let i=0;i<6;i++)box(g,0x23484a,-1+i*.4,.48,.65,.25,.03,.22);
    deviceLights[id]=ball(g,pos.color,1.3,.55,.8,.09,.09,.09,.6);
    const wire=new THREE.CurvePath(),wirePoints=[[0,.11,gateZ-3],[0,.11,pos.z+2],[pos.x,.11,pos.z+2]];
    for(let i=1;i<wirePoints.length;i++)wire.add(new THREE.LineCurve3(new THREE.Vector3(...wirePoints[i-1]),new THREE.Vector3(...wirePoints[i])));
    mesh(scene,new THREE.TubeGeometry(wire,24,.09,6,false),mat(0x34364f));
  }
  box(scene,0x34505b,0,.5,hard.minZ+1,hard.maxX-hard.minX,1,.4);
  for(const x of [-2,2])box(scene,0x829c9d,x,1.3,hard.minZ+1,.25,2,.3);
  // Server stacks act as landmarks at the edge of the garden.
  for(const [x,z,h] of serverTowers(layout)) {
    const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
    box(g,0x25434a,0,h/2,0,1.25,h,1.15);box(g,0x54716b,0,h+.05,0,1.45,.15,1.35);
    for(let y=.4;y<h;y+=.5) {box(g,0x112d35,0,y,.59,.92,.28,.05);for(let j=0;j<3;j++)box(g,0xbbe9b0,-.3+j*.13,y,.63,.055,.065,.03,.6);}
    box(g,0x748d75,0,.06,0,1.9,.12,1.7);
  }
  const dock=new THREE.Group();dock.position.set(-3,0,5);scene.add(dock);
  cylinder(dock,0x18383d,0,.12,0,2,.24);cylinder(dock,0xd5caab,0,.27,0,1.7,.16);cylinder(dock,0x294c46,0,.36,0,1.45,.04);
  torus(dock,0xc1f4a9,0,.4,0,1.4,.045,.6);torus(dock,0x789d84,0,.29,0,1.85,.035,.2);
  const dockLight=new THREE.PointLight(0xc6ff9a,5,6);dockLight.position.set(0,1,0);dock.add(dockLight);
  for(const p of DOCK_PILLARS) {const x=p.x+3,z=p.z-5;box(dock,0xddd2b5,x,.6,z,p.width,1.2,p.depth);box(dock,0xc6f6b0,x,1.25,z,.4,.12,.5,.5);}
  const dockSockets=DOCK_PORTS.map(port=>{
    const x=port.x+3,z=port.z-5;
    cylinder(dock,0x617e79,x,.14,z,.24,.12);
    cylinder(dock,0x0b1d25,x,.195,z,.17,.035);
    const rim=torus(dock,0x9fdbc5,x,port.y,z,.19,.033,.12);
    rim.material=rim.material.clone();worldFog.apply(rim.material);
    return {port,rim};
  });
  const deviceSockets=Object.entries(DEVICE_PORTS).map(([id,port])=>{
    const g=new THREE.Group();g.name=`${id} service socket`;scene.add(g);
    const site=STORY_SITES[id];
    box(g,0x36595b,port.x,.12,port.z,.7,.24,.7);
    cylinder(g,0xb9c9b2,port.x,.3,port.z,.27,.25);
    cylinder(g,0x0b1d25,port.x,.44,port.z,.19,.06);
    const rim=torus(g,0x9fdbc5,port.x,port.y,port.z,.22,.04,.2);
    rim.material=rim.material.clone();
    const path=new THREE.LineCurve3(new THREE.Vector3(site.x,.1,site.z),new THREE.Vector3(port.x,.1,port.z));
    mesh(g,new THREE.TubeGeometry(path,1,.035,5,false),mat(0x617e79));
    return {id,port,rim};
  });
  const devicePackets=Array.from({length:3},()=>{const bit=ball(scene,0xcaf3df,0,0,0,.055,.055,.055,1);bit.visible=false;return bit;});
  const dockPackets=Array.from({length:10},()=>{const bit=ball(scene,0xd8efa8,0,0,0,.065,.065,.065,1);bit.visible=false;return bit;});
  let dockTransfer=0,dockTime=0,dockColors=[];
  const hopper=new THREE.Group();hopper.position.set(BASE_SORTER.x,0,BASE_SORTER.z);scene.add(hopper);
  box(hopper,0xcbbf9e,0,.3,0,1.4,.6,1.4);
  for(const x of [-.65,.65])box(hopper,0x5c7875,x,.8,0,.1,.55,1.4);
  for(const z of [-.65,.65])box(hopper,0x5c7875,0,.8,z,1.4,.55,.1);
  const storedBits=Array.from({length:8},(_,i)=>box(hopper,0xd8efa8,(i%2-.5)*.45,.65+Math.floor(i/4)*.25,(Math.floor(i/2)%2-.5)*.4,.3,.2,.3));
  // Raw data enters the sorter, then an analyzer. Finished data flows to its folder.
  function conduit(points,color){
    const path=new THREE.CurvePath();
    for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i-1]),new THREE.Vector3(...points[i])));
    return mesh(scene,new THREE.TubeGeometry(path,32,.075,6,false),mat(color,.25));
  }
  const deliveries=[];
  const intake=[[-3,.18,5],[BASE_SORTER.x,.18,BASE_SORTER.z]];
  conduit(intake,0x96bcac);
  function followRoute(object,points,t){
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1],p[2]-points[i][2]));
    let distance=Math.min(1,Math.max(0,t))*lengths.reduce((sum,n)=>sum+n,0);
    for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const ratio=Math.min(1,distance/lengths[i]);object.position.set(...points[i].map((v,j)=>v+(points[i+1][j]-v)*ratio));return;}distance-=lengths[i];}
  }
  function deliverData(items){
    dockTransfer=1.8;dockColors=items.map(item=>TYPES[item.type]?.color??0xf3b77f);
    for(const [i,item] of items.slice(0,12).entries()){
      const color=TYPES[item.type]?.color??0xf3b77f;
      const bit=box(scene,color,-3,.3,5,.18,.18,.18,.6);
      deliveries.push({bit,path:intake,age:-.5-i*.08,duration:.6});
    }
  }
  function photoSorterAttachment(machine){
    // A roof-mounted classifier stays within the analyzer's collision footprint.
    const group=new THREE.Group();group.name='Photo Sorter attachment';machine.add(group);
    for(const x of [-.52,.52])box(group,0x4a6969,x,1.68,-.1,.13,.34,.35);
    box(group,0x36525d,0,1.94,-.1,1.48,.56,.62);
    box(group,0xe3d9bc,0,2.24,-.1,1.55,.08,.66);
    const lights=[];
    for(const [i,animal] of ['cat','dog'].entries()){
      const x=i===0?-.36:.36,color=i===0?0xb9a5ef:0xe8bf85;
      box(group,color,x,1.95,.22,.61,.44,.06);
      const texture=new THREE.TextureLoader().load(new URL(`../assets/trials/${animal}-v1.png`,import.meta.url).href);
      texture.colorSpace=THREE.SRGBColorSpace;
      mesh(group,new THREE.PlaneGeometry(.42,.38),new THREE.MeshBasicMaterial({map:texture}),x,1.96,.257);
      const light=box(group,color,x,1.65,.24,.48,.055,.06,.4);lights.push({light,color,animal});
    }
    return {group,lights};
  }
  const munchers={};
  for(const [id,pos] of Object.entries(BASE_MACHINES)){
    const color=id==='image'?0xb9a5ef:0xbbe9a0;
    const group=new THREE.Group();group.position.set(pos.x,0,pos.z);scene.add(group);
    cylinder(group,0x345650,0,.08,0,1.15,.16);
    const machine=new THREE.Group();group.add(machine);
    box(machine,0x45645f,0,.24,0,2,.35,2);
    box(machine,0xe3d9bc,0,.9,0,1.5,1.15,1.2);
    ball(machine,0xe3d9bc,0,1.47,0,.75,.22,.6);
    // A friendly face and an animated mouth make the processor read as a muncher.
    for(const x of [-.32,.32]){ball(machine,0x17323b,x,1.2,.62,.09,.12,.04);ball(machine,0xf3fff1,x-.025,1.24,.66,.025);}
    box(machine,0x17323b,0,.78,.62,.95,.3,.04);
    const jaw=box(machine,0xe8f3ca,0,.67,.67,.8,.09,.12);
    box(machine,0x254541,0,.43,.7,1.35,.13,.14);
    const progress=box(machine,color,-.6,.43,.79,1.2,.06,.025,.7);
    const snack=box(machine,color,0,.77,1.15,.25,.25,.08,.35);
    const storage=BASE_STORAGE[id==='image'?'image':'text'];
    const path=[[BASE_SORTER.x,.18,BASE_SORTER.z],[pos.x,.18,pos.z]];
    const outerX=id==='extra'?pos.x:storage.x+Math.sign(pos.x-BASE_SORTER.x)*3.1;
    const output=[[pos.x,.18,pos.z],[outerX,.18,pos.z],[outerX,.18,storage.z],[storage.x,.18,storage.z]].filter((p,i,a)=>i===0||p.some((v,j)=>v!==a[i-1][j]));
    conduit(path,color);conduit(output,color);
    // Starter pictures go to the image folder, even before its specialist exists.
    const imageOutput=id==='basic'?[[pos.x,.18,pos.z],[outerX,.18,pos.z],[outerX,.18,14.2],[BASE_STORAGE.image.x,.18,14.2],[BASE_STORAGE.image.x,.18,BASE_STORAGE.image.z]]:output;
    if(id==='basic')conduit(imageOutput,BASE_STORAGE.image.color);
    // Arrowheads make both the input and finished-data direction readable at rest.
    const direction=Math.sign(pos.x-BASE_SORTER.x),middle=(BASE_SORTER.x+pos.x)/2;
    conduit([[middle-direction*.25,.18,pos.z-.2],[middle,.18,pos.z],[middle-direction*.25,.18,pos.z+.2]],color);
    const outputZ=(pos.z+storage.z)/2,outputDirection=Math.sign(storage.z-pos.z);
    conduit([[outerX-.2,.18,outputZ-outputDirection*.25],[outerX,.18,outputZ],[outerX+.2,.18,outputZ-outputDirection*.25]],color);
    const transfer=box(scene,color,BASE_SORTER.x,.7,BASE_SORTER.z,.18,.18,.18,.4);
    const placeholder=torus(group,color,0,.19,0,.8,.035,.3);
    munchers[id]={machine,jaw,progress,snack,placeholder,transfer,pos,path,output,imageOutput,sorter:null};
  }
  function storeData(item,id,retained=true){
    if(!retained){const p=BASE_MACHINES[id];burst(new THREE.Vector3(p.x,1.1,p.z),0xd8efa8,5);return;}
    if(!BASE_STORAGE[item.type])return;
    const bit=box(scene,BASE_STORAGE[item.type].color,0,.18,0,.22,.22,.22,.8);
    const path=item.type==='image'?munchers[id].imageOutput:munchers[id].output;followRoute(bit,path,0);
    deliveries.push({bit,path,age:0,duration:.7});
  }
  const gate=new THREE.Group();gate.position.set(0,0,gateZ);scene.add(gate);
  for(const x of [-2.8,2.8]) {box(gate,0x3f4e5d,x,1.3,0,.7,2.6,.8);box(gate,0x748289,x,2.65,0,.85,.16,.95);box(gate,0xc2a4ef,x,1.5,.43,.12,1.7,.04,.6);}
  box(gate,0x5d6276,0,2.9,0,6.3,.35,.65);
  const barrier=mesh(gate,new THREE.PlaneGeometry(4.9,2.4),new THREE.MeshBasicMaterial({color:0xb4a1ed,transparent:true,opacity:.17,side:THREE.DoubleSide}),0,1.25,0);
  const bars=[];for(let x=-2.3;x<2.5;x+=.45)bars.push(box(gate,0xbca6ed,x,1.2,0,.025,2.2,.025,.5));
  for(const side of [-1,1])for(let i=0;i<11;i++){box(scene,0x344653,side*(4+i*1.65),.5,gateZ,1.55,1,.6);box(scene,0x7c7498,side*(4+i*1.65),1.05,gateZ,1.55,.08,.66);}
  const byte=new THREE.Group();scene.add(byte);
  const body=new THREE.Group();byte.add(body);
  let brainAttachments=null;
  const collectors=createByteCollectors(body,{applyMaterial:worldFog.apply,targetColor:t=>TYPES[t.type]?.color??0xf3b77f,brainAnchor:(i,out)=>{
    if(brainAttachments?.(i,out))return out;
    out.set(0,.29,.44-i*.23);brain.localToWorld(out);return body.worldToLocal(out);
  }});
  collectors.loading.then(()=>canvas.dataset.byteCollectors='ready').catch(error=>{canvas.dataset.byteCollectors='fallback';console.warn('Collector rig unavailable',error);cables.push(...Array.from({length:10},()=>createDownloadCable(scene,document.getElementById('labels'))));});
  const brain=new THREE.Group();brain.position.y=1.1;body.add(brain);
  ball(brain,0xc5a0df,-.21,0,0,.41,.34,.35);ball(brain,0xc5a0df,.21,0,0,.41,.34,.35);
  for(let i=0;i<18;i++){const a=i*2.4;ball(brain, i%3 ? 0xcca9e5:0xb88bd6,Math.sin(a)*.43,.10+Math.cos(i*1.7)*.16,Math.cos(a)*.25,.16,.17,.15);}
  // Deliberately friendly eyes sit on the front of the brain.
  for(const x of [-.2,.2]) {ball(brain,0x263349,x,-.04,.345,.07,.085,.04);ball(brain,0xffffff,x-.015,-.015,.379,.018);}
  tube(brain,[[-.08,-.16,.35],[0,-.19,.37],[.08,-.16,.35]],0x775477,.018);
  let byteMeshReady=false,byteAnimator=null,byteBlink=null;
  canvas.dataset.byteModel='loading';
  loadByteModel({applyMaterial:worldFog.apply,anisotropy:Math.min(4,renderer.capabilities.getMaxAnisotropy())}).then(model=>{
    brain.clear();brain.add(model);byteMeshReady=true;currentLevel=-1;
    brainAttachments=createBrainAttachments(model,brain,body);
    byteAnimator=createByteAnimator(model);
    byteBlink=createByteBlink(model);
    canvas.dataset.byteAnimated=String(!!byteAnimator);
    canvas.dataset.byteModel='ready';
  }).catch(error=>{
    canvas.dataset.byteModel='fallback';
    console.warn('Byte mesh unavailable; keeping the procedural character.',error);
  });
  const vatAssembly=createByteVat(body,{applyMaterial:worldFog.apply,anisotropy:Math.min(4,renderer.capabilities.getMaxAnisotropy())});
  const shell=vatAssembly.group;
  vatAssembly.loading.then(()=>canvas.dataset.vatModel='ready').catch(error=>{canvas.dataset.vatModel='fallback';console.warn('Vat hardware unavailable',error);});
  const extras=new THREE.Group();body.add(extras);
  // Keep ground indicators above the raised board panels, paths and circuit traces.
  const indicatorHeight=.22;
  const damageRing=mesh(scene,new THREE.RingGeometry(.94,1,48),new THREE.MeshBasicMaterial({color:0xff5b67,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));damageRing.rotation.x=-Math.PI/2;damageRing.visible=false;
  const reduceHitMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const radiusRing=mesh(scene,new THREE.RingGeometry(1,1.022,80),new THREE.MeshBasicMaterial({color:0xc8edbb,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}));radiusRing.rotation.x=-Math.PI/2;
  const targetRing=mesh(scene,new THREE.RingGeometry(.17,.22,32),new THREE.MeshBasicMaterial({color:0xd2f8b7,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));targetRing.rotation.x=-Math.PI/2;targetRing.visible=false;
  // Ten live downloads plus room for their completion flashes.
  const cables=[];let capturePath=null;
  function completeDownload(target){capturePath=collectors.collect(target);byteAnimator?.collect();const cable=cables.find(c=>c.target===target);if(cable){cable.target=null;cable.completion=.24;}}
  const particles=[];
  const fragments=new Map();
  for(const [type,glyph,color] of [['text','hello','#e6ffbc'],['image','▪','#d8c4ff'],['code','{ }','#ffd5ab'],['audio','~♪~','#88dfe1'],['video','▶','#f3b1c7']]){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const ctx=canvas.getContext('2d');ctx.font='bold 30px monospace';ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(glyph,64,42);const texture=new THREE.CanvasTexture(canvas);fragments.set(type,new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  }
  const particleGeo=new THREE.BoxGeometry(.08,.08,.08);
  let currentLevel=-1;
  function evolve(){
    const lv=level(state),key=`${lv}-${state.unlocked}`;if(key===currentLevel)return;currentLevel=key;
    shell.visible=state.unlocked;
    byte.scale.setScalar(state.unlocked?1:.85);
    const brainHeight=state.unlocked?VAT_BRAIN_HEIGHT:.48;
    for(const child of [...extras.children])extras.remove(child);
    body.scale.setScalar(1+state.levels.capacity*.055);
    for(let i=0;state.unlocked&&i<state.levels.capacity;i++)box(extras,0x839790,-.8,.55+i*.17,0,.23,.12,.42);
    if(state.unlocked&&lv>=2){tube(extras,[[.4,1.8,0],[.5,2.15,0],[.7,2.28,0]],0x7d9993,.035);ball(extras,0xe4c4fa,.7,2.28,0,.1,.1,.1,.7);}
    if(state.unlocked&&lv>=5)torus(extras,0xa9b5f3,0,1,0,1.12,.035,.5);
    for(let i=0;i<state.levels.decode;i++)ball(extras,0xe3bdff,Math.sin(i*2.4)*.43,brainHeight+.3,Math.cos(i*2.4)*.3,.06,.06,.06,.9);
    for(let i=0;i<state.levels.clarity;i++){const lens=torus(extras,0x8ee6df,0,brainHeight-.2+i*.18,0,state.unlocked?.87:.65,.023,.7);lens.rotation.z=.1;}
  }
  function creature(type,hard=false,profile){
    const g=new THREE.Group(), model=new THREE.Group();g.add(model);scene.add(g);
    const color=TYPES[type].color;
    const wings=[];
    if(profile==='full_book'){
      // A chunky hardback, with page edges, binding and a hanging bookmark.
      box(model,0xf0e3bc,0,.65,0,.7,.82,.26);
      for(const z of [-.17,.17])box(model,0x477966,0,.65,z,.83,.94,.07);
      box(model,0x315748,-.4,.65,0,.12,.94,.4);
      for(const y of [.31,.95])box(model,0xe0ba70,-.4,y,.02,.13,.055,.41);
      for(let i=0;i<6;i++)box(model,0xb9ad88,.356,.34+i*.12,0,.012,.015,.24);
      box(model,0xd67e75,.2,.24,.21,.09,.34,.025);
      box(model,0xd8efa8,0,.78,.214,.47,.3,.014);
      for(const x of [-.1,.1])ball(model,0x283844,x,.79,.23,.027,.038,.022);
      for(const x of [-.22,.22])ball(model,0x315748,x,.13,0,.1,.12,.12);
    }else if(profile==='image_4k'){
      // A wide gallery print: layered frame, landscape and four bright pixels.
      box(model,0xd4bc7d,0,.67,0,1.12,.83,.18);
      box(model,0x554975,0,.67,.1,1.02,.73,.04);
      box(model,0x889dc0,0,.67,.13,.91,.61,.025);
      ball(model,0xf8df96,.27,.83,.16,.09,.09,.02,.15);
      for(const [x,y,r] of [[-.21,.5,.23],[.11,.49,.18]]){
        const mountain=mesh(model,new THREE.ConeGeometry(r,.37,3),mat(0x667e92),x,y,.17);mountain.scale.z=.12;
      }
      for(let i=0;i<4;i++)box(model,0xdac8ff,-.19+i*.125,1.04,.12,.06,.045,.025,.35);
      for(const x of [-.09,.09])ball(model,0x283844,x,.36,.16,.025,.03,.02);
      for(const x of [-.32,.32])ball(model,0x554975,x,.18,0,.1,.1,.1);
    }else if(type==='audio'){
      // A swimming waveform, rather than another picture card.
      for(let i=0;i<7;i++)box(model,color,(i-3)*.11,.48,0,.065,.15+Math.sin(i*.95)**2*.4,.1,.25);
      ball(model,0x305c66,.4,.48,0,.15,.18,.13);
    }else if(type==='video'){
      // A compact moving filmstrip with frame holes and a play mark.
      box(model,0x35414e,0,.52,0,.88,.62,.15);
      box(model,color,0,.52,.09,.63,.45,.025,.2);
      const play=mesh(model,new THREE.ConeGeometry(.13,.22,3),mat(0x334a51),.01,.53,.13);play.rotation.z=-Math.PI/2;play.scale.z=.1;
      for(const side of [-1,1])for(let i=0;i<4;i++)box(model,0xe9d9d5,side*.38,.31+i*.14,.09,.05,.06,.025);
      for(const x of [-.25,.25])ball(model,0x35414e,x,.18,0,.12,.12,.13);
    }else if(type==='text') {
      const page=box(model,color,0,.45,0,.43,.48,.1);page.rotation.z=-.12;
      for(let i=0;i<3;i++)box(model,0x81966a,-.02,.53-i*.09,.061,.24-i*.03,.025,.01);
      for(const x of [-.13,.13])ball(model,0x476453,x,.21,0,.06,.13,.06);
    }else if(type==='image'&&profile){
      const petColor=profile==='cat'?0xb79ad8:0xd6a36e;
      box(model,0xe4deef,0,.6,0,.8,.7,.08);
      box(model,0x758c98,0,.6,.045,.7,.59,.02);
      ball(model,petColor,0,.6,.08,.23,.22,.035);
      for(const side of [-1,1]){
        if(profile==='cat')mesh(model,new THREE.ConeGeometry(.1,.2,3),mat(petColor),side*.16,.83,.09);
        else ball(model,petColor,side*.22,.59,.09,.08,.18,.035);
        ball(model,0x17323b,side*.08,.63,.13,.025);
      }
      ball(model,0x17323b,0,.54,.13,.025,.02,.02);
    }else if(type==='image'){
      ball(model,0x8275b3,0,.5,0,.1,.25,.12);
      for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*.07,.52,0);model.add(pivot);const wing=box(pivot,color,side*.19,0,0,.34,.4,.055);wing.rotation.z=side*.25;box(pivot,0xe2d1fc,side*.2,.04,.035,.13,.17,.015);wings.push(pivot);}
    }else{
      ball(model,color,0,.35,0,.17,.15,.22);
      for(const side of [-1,1])tube(model,[[side*.34,.46,.08],[side*.22,.35,.15],[side*.34,.24,.08]],color,.045);
      for(const x of [-.09,.09])tube(model,[[x,.4,0],[x*1.5,.65,-.05]],color,.018);
    }
    const large=profile==='full_book'||profile==='image_4k';
    if(!large)for(const x of [-.08,.08])ball(model,0x283844,x,type==='text'?.64:.56,.11,.025,.033,.025);
    if(hard)torus(model,0xe7bbef,0,.1,0,.42,.018,.5);
    const tell=torus(g,0xff9dbb,0,.12,0,.52,.025,.65);tell.visible=false;
    const shadow=mesh(g,new THREE.CircleGeometry(large?.75:.35,16),new THREE.MeshBasicMaterial({color:0x071b24,transparent:true,opacity:.2}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.035;
    return {group:g,model,wings,tell};
  }
  function malware(){
    const g=new THREE.Group();scene.add(g);ball(g,0x965775,0,.5,0,.43,.4,.43);
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const m=mesh(g,new THREE.ConeGeometry(.12,.4,5),mat(0xe090a0),Math.cos(a)*.45,.5,Math.sin(a)*.45);m.rotation.z=-Math.cos(a)*1.3;m.rotation.x=Math.sin(a)*1.3;}
    for(const x of [-.16,.16]){const eye=box(g,0xffdcbb,x,.57,.38,.13,.06,.04,.5);eye.rotation.z=x>0?.3:-.3;}
    return g;
  }
  function burst(position,color,count=12){for(let i=0;i<count;i++){const m=mesh(scene,particleGeo,mat(color,.4),position.x,position.y+.5,position.z);particles.push({mesh:m,age:0,velocity:new THREE.Vector3((rnd()-.5)*2,1+rnd(),(rnd()-.5)*2)});}}
  function absorb(position,type){const path=capturePath?new THREE.CatmullRomCurve3(capturePath):null;capturePath=null;for(let i=0;i<7;i++){const sprite=new THREE.Sprite(fragments.get(type));sprite.scale.set(.45,.23,1);sprite.position.copy(position);scene.add(sprite);particles.push({mesh:sprite,age:-i*.06,source:position.clone(),path,phase:i*.9});}}
  const viewport={width:0,height:0};
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;viewport.width=w;viewport.height=h;renderer.setSize(w,h,false);const height=h>w?20:16;camera.left=-height*w/h/2;camera.right=-camera.left;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();}
  resize();window.addEventListener('resize',resize);
  new ResizeObserver(resize).observe(canvas);
  function project(pos){const p=pos.clone().project(camera);return {x:(p.x*.5+.5)*viewport.width,y:(-.5*p.y+.5)*viewport.height,visible:p.z<1&&Math.abs(p.x)<1.1&&Math.abs(p.y)<1.1};}
  function worldPoint(x,y){const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),camera);return raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());}
  function draw(player, targets, dt, time, destination,interactionDevice=null){
    for(const [id,v] of Object.entries(agentViews)){
      const a=state.agents[id];v.group.visible=state.programs[id];v.beam.visible=state.programs[id]&&!!a.targetPosition;
      v.group.position.set(a.x,Math.sin(time*4+(id==='courier'?0:2))*.06,a.z);v.group.rotation.y=a.heading||0;
      v.pack.scale.y=Math.max(.02,agentLoad(a)/AGENT_CAPACITY[id]*.4);
      if(v.beam.visible){const t=a.targetPosition;v.beam.position.set((a.x+t.x)/2,.7,(a.z+t.z)/2);v.beam.scale.z=Math.hypot(a.x-t.x,a.z-t.z);v.beam.rotation.y=Math.atan2(t.x-a.x,t.z-a.z);}
    }
    worldFog.update();
    environmentArt.update(time);
    if(!fogInitialized){scene.traverse(object=>{if(object.material)for(const material of Array.isArray(object.material)?object.material:[object.material])if(!material.isSpriteMaterial)worldFog.apply(material);});fogInitialized=true;}
    if(Math.abs(camera.zoom-zoomTarget)>.0001){camera.zoom=THREE.MathUtils.lerp(camera.zoom,zoomTarget,1-Math.exp(-dt*14));camera.updateProjectionMatrix();}
    for(let i=deliveries.length-1;i>=0;i--){const d=deliveries[i];d.age+=dt;const t=Math.max(0,d.age/d.duration);d.bit.visible=d.age>=0;followRoute(d.bit,d.path,t);if(t>=1){scene.remove(d.bit);deliveries.splice(i,1);}}
    for(const [type,view] of Object.entries(storageViews)){
      const fill=Math.min(1,storageUsed(state,type)/storageCapacity(state,type));
      view.fill.scale.x=Math.max(.001,fill*3.6);view.fill.position.x=-1.8+fill*1.8;
      view.modules.forEach((module,i)=>module.visible=i<state.base.storageLevels[type]);
    }
    storedBits.forEach((bit,i)=>{bit.visible=i<state.base.queue.length;const item=state.base.queue[i];if(item)bit.material=mat(TYPES[item.type].color);});
    deviceLights.developer.material=mat(networkAccess(state)?0xf3b77f:0x53696b,.4);
    for(const [id,v] of Object.entries(storyHardware)){const done=id==='relay'?state.story.done.complete:state.story.done[id],ready=id==='terminal'?!!terminalEvent(state):!done;v.beacon.material=mat(done?0x9fe0c3:STORY_SITES[id].color,ready?.7:.2);v.halo.visible=ready;v.halo.rotation.z=time*.2;}
    relayTrace.visible=state.story.done.bridge;
    mediaScreen.material=mat(state.story.done.backup?0x8ebfb4:state.story.done.infected?0x36515c:0x472e3d,.25);
    movingFrame.visible=state.story.done.backup;movingFrame.position.x=Math.sin(time)*1.1;
    for(const light of speakerLights){light.visible=state.story.done.infected;light.scale.setScalar(.8+Math.sin(time*4)*.15);}
    firewallStatus.material=mat(state.story.done.firewall?0xef977d:0x8cb1ad,.4);
    for(const [id,m] of Object.entries(munchers)){
      const installed=id==='basic'||(id==='image'?state.base.imageMuncher:state.base.autoSort),job=state.base[id],progress=job?1-job.remaining/job.duration:0;
      m.machine.visible=installed;m.placeholder.visible=!installed&&(id==='image'?picturesUnlocked(state):state.base.photoSorter);
      if(id==='image'&&state.base.photoSorter&&!m.sorter)m.sorter=photoSorterAttachment(m.machine);
      if(m.sorter){
        m.sorter.group.visible=state.base.photoSorter;
        for(const {light,color,animal} of m.sorter.lights)light.material=mat(color,job?.profile===animal?1.1:.35);
      }
      const travel=Math.min(1,progress*3);
      m.transfer.visible=installed&&!!job&&travel<1;
      if(job)m.transfer.material=mat(TYPES[job.type].color,.4);
      followRoute(m.transfer,m.path,travel);
      m.jaw.position.y=.67+(job?Math.sin(progress*35)*.055:0);
      m.snack.visible=installed&&!!job;m.snack.position.z=1.3-(progress*3%1)*.65;
      m.snack.rotation.z=job?Math.sin(progress*20)*.2:0;
      if(job)m.snack.material=mat(TYPES[job.type].color,.35);
      m.progress.scale.x=Math.max(.001,progress*1.2);m.progress.position.x=-.6+progress*.6;
    }
    for(const e of emitterRings.values()){e.remaining=Math.max(0,e.remaining-dt);const t=1-e.remaining/.45;e.pulse.visible=e.remaining>0;e.pulse.position.z=.76+t*.9;e.pulse.scale.setScalar(1+t*.5);e.lip.visible=feedAvailable(state,e.type);}
    evolve();
    const speed=Math.hypot(player.vx,player.vz),moving=Math.min(1,speed/4.4);
    const heading=speed>.08?Math.atan2(player.vx,player.vz):byte.rotation.y;
    const turn=Math.atan2(Math.sin(heading-byte.rotation.y),Math.cos(heading-byte.rotation.y));
    byte.rotation.y+=turn*(1-Math.exp(-dt*11));
    byteAnimator?.update(dt,speed,{inVat:state.unlocked});
    byteBlink?.update(dt);
    const hop=!byteAnimator&&player.munch>0?Math.sin((1-player.munch/.32)*Math.PI)*.2:0;
    byte.position.set(player.x,hop,player.z);
    body.position.y=byteAnimator?0:Math.abs(Math.sin(time*16))*(state.unlocked?.045:.14)*moving;
    body.rotation.x=THREE.MathUtils.lerp(body.rotation.x,moving*.09,1-Math.exp(-dt*10));
    body.rotation.z=THREE.MathUtils.lerp(body.rotation.z,-Math.max(-.2,Math.min(.2,turn*moving*.17))+Math.sin(time*13)*.025*moving,1-Math.exp(-dt*12));
    const size=1+state.levels.capacity*.055;
    body.scale.set(size*(1-hop*.12),size*(1+hop*.18),size*(1-hop*.12));
    if(state.unlocked)vatAssembly.update(time);
    brain.position.y=(state.unlocked?VAT_BRAIN_HEIGHT:.48)+(byteAnimator?0:Math.sin(time*2)*.045+Math.sin(time*13+.7)*moving*.04);
    brain.rotation.z=-body.rotation.z*.6;brain.rotation.x=-body.rotation.x*.5;

    const hitAge=1.2-player.hurt,hitStrength=player.hurt>0?Math.max(0,1-hitAge/.45):0;
    damageRing.visible=hitStrength>0;damageRing.position.set(player.x,indicatorHeight+.02,player.z);
    damageRing.scale.setScalar((state.unlocked?1.6:.9)+(reduceHitMotion.matches?0:hitAge*2));damageRing.material.opacity=hitStrength*.85;
    if(hitStrength>0&&!reduceHitMotion.matches){body.rotation.z+=Math.sin(hitAge*25)*.24*hitStrength;body.position.y+=Math.sin(hitAge*12)*.1*hitStrength;}
    const conversationOffset=interactionDevice&&interactionDevice!=='home'&&viewport.width<=900?4.5:-1.3;
    const desired=new THREE.Vector3(player.x,0,player.z+conversationOffset);focus.lerp(desired,1-Math.exp(-dt*3));camera.position.copy(focus).add(new THREE.Vector3(...CAMERA_OFFSET));camera.lookAt(focus);
    radiusRing.position.set(player.x,indicatorHeight,player.z);radiusRing.scale.setScalar(range(state));
    targetRing.visible=!!destination;if(destination)targetRing.position.set(destination.x,indicatorHeight,destination.z);
    barrier.visible=!networkAccess(state);bars.forEach(b=>b.visible=!networkAccess(state));
    for(const cable of cables)if(cable.target&&!targets.includes(cable.target))cable.target=null;
    for(const target of targets){if(!cables.some(c=>c.target===target)){const available=cables.find(c=>!c.target&&c.completion<=0);if(available)available.target=target;}}
    const servicePort=devicePort(interactionDevice,player);
    const docking=!servicePort&&atHomeDock(player)&&speed<.6;
    collectors.update({count:connections(state),targets,dt,time,inVat:state.unlocked,dockPorts:servicePort?[servicePort]:docking?DOCK_PORTS:[]});
    dockTime+=dt;dockTransfer=Math.max(0,dockTransfer-dt);
    const serviceIndex=servicePort?Array.from({length:connections(state)},(_,i)=>i).find(i=>collectors.getDockPort(i)===servicePort):undefined;
    for(const socket of deviceSockets){
      const connected=serviceIndex!==undefined&&socket.port===servicePort;
      const available=socket.id==='terminal'&&!!terminalEvent(state);
      socket.rim.material.emissiveIntensity=connected?.85+Math.sin(dockTime*7)*.25:available?.4+Math.sin(dockTime*3)*.2:.16;
    }
    devicePackets.forEach((bit,i)=>{
      const p=serviceIndex!==undefined?collectors.getDockPoint(serviceIndex,1-(dockTime*.65+i/3)%1):null;
      bit.visible=!!p;if(p)bit.position.copy(p);
    });
    for(const socket of dockSockets){
      const connected=dockPackets.some((_,i)=>collectors.getDockPort(i)===socket.port);
      socket.rim.material.emissiveIntensity=connected?(dockTransfer>0?1.1+Math.sin(dockTime*12)*.3:.55):.12;
    }
    dockPackets.forEach((bit,i)=>{
      const p=docking&&dockTransfer>0?collectors.getDockPoint(i,(dockTime*1.7+i*.13)%1):null;
      bit.visible=!!p;
      if(p){bit.position.copy(p);bit.material=mat(dockColors[i%dockColors.length]??0xd8efa8,1);}
    });
    const downloadOrigin={...player,downloadHeight:state.unlocked?.65:.42};
    cables.forEach((cable,i)=>{
      if(cable.completion>0){cable.update(downloadOrigin,null,1,time,i,project,cable.completion/.24);cable.completion=Math.max(0,cable.completion-dt);}
      else if(cable.target){const mouth=collectors.getOrigin(cable.target);cable.update(mouth?{x:mouth.x,z:mouth.z,downloadHeight:mouth.y}:downloadOrigin,cable.target,cable.target.progress??0,time,i,project);}
      else cable.hide();
    });
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.source){const t=Math.max(0,p.age),swirl=Math.sin(t*Math.PI)*.4;p.mesh.position.set(p.source.x+(player.x-p.source.x)*t+Math.cos(t*9+p.phase)*swirl,p.source.y+((state.unlocked?1.2:.5)-p.source.y)*t+Math.sin(t*Math.PI)*.5,p.source.z+(player.z-p.source.z)*t+Math.sin(t*9+p.phase)*swirl);if(p.path)p.path.getPoint(Math.min(1,t),p.mesh.position);p.mesh.scale.set(.5*(1-t*.7),.25*(1-t*.7),1);}else{p.mesh.position.addScaledVector(p.velocity,dt);p.velocity.y-=dt*2;p.mesh.scale.setScalar(Math.max(0,1-p.age));}if(p.age>1){scene.remove(p.mesh);particles.splice(i,1);}}
    renderer.render(scene,camera);
  }
  return {renderer,scene,viewport,draw,setZoom,getZoom:()=>zoomTarget,creature,malware,burst,absorb,completeDownload,pulseEmitter,deliverData,storeData,project,worldPoint,THREE};
}
