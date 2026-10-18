import * as THREE from '../vendor/three/three.module.js';
import {PANEL_CONTOURS,PANEL_GEOMETRIES,boardPanels,createSurfaceTexture} from './board-surfaces.js';
import {BASE_MACHINES,BASE_STORAGE,NETWORK_DEVICES,MEMORY_MODULES,PROCESSOR,serverTowers} from './world-layout.js';

const unitShape=new THREE.Shape();
unitShape.moveTo(-.44,-.44);unitShape.lineTo(.44,-.44);unitShape.lineTo(.44,.44);unitShape.lineTo(-.44,.44);unitShape.closePath();
export const hardwareGeometry=new THREE.ExtrudeGeometry(unitShape,{depth:.88,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:2,steps:1});
hardwareGeometry.translate(0,0,-.44);
const cube=new THREE.BoxGeometry(1,1,1),disc=new THREE.CylinderGeometry(1,1,1,16);

// Shared, instanced dressing: broad walkable panels, recessed traces, sparse hardware.
// These are surface details inside existing footprints; collision layout stays authoritative.
export function createEnvironmentArt(scene,layout,content,applyMaterial){
  const root=new THREE.Group();root.name='Motherboard environment';scene.add(root);
  const batches=new Map(),routes=[],fans=[],halos=[];
  const colors={teal:0x20434a,network:0x28364e,mint:0xb1ed9c,image:0xba9cf7,gold:0xbca477,cream:0xe5dbc0};
  const grainMap=createSurfaceTexture();
  const panelColors=[0x20434a,0x28474d,0x243e43],networkColors=[0x28364e,0x303f53,0x263c49];
  const textured=new Set([...panelColors,...networkColors,0x59757c,0x526682,colors.cream]);
  const matrix=new THREE.Matrix4(),quat=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
  const mats=new Map();
  function material(color,glow=0){
    const key=color+':'+glow;
    if(!mats.has(key)){
      const m=new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.3,emissive:color,emissiveIntensity:glow});
      if(textured.has(color)){m.map=grainMap;m.bumpMap=grainMap;m.bumpScale=.025;m.roughness=.58;}
      applyMaterial(m);mats.set(key,m);
    }
    return mats.get(key);
  }
  function add(geometry,color,x,y,z,w,h,d,glow=0,angle=0){
    const mat=material(color,glow),key=geometry.uuid+':'+mat.uuid;
    if(!batches.has(key))batches.set(key,{geometry,mat,transforms:[]});
    position.set(x,y,z);scale.set(w,h,d);quat.setFromAxisAngle(new THREE.Vector3(0,1,0),angle);
    matrix.compose(position,quat,scale);batches.get(key).transforms.push(matrix.clone());
  }
  function block(c,x,y,z,w,h,d,glow=0){add(hardwareGeometry,c,x,y,z,w,h,d,glow);}
  function screw(x,y,z,r=.075){
    add(disc,0x10272e,x,y-.008,z,r*1.5,.018,r*1.5);
    add(disc,colors.gold,x,y,z,r,.018,r);
    add(cube,0x263b40,x,y+.012,z,r*1.2,.008,.018,0,.6);
  }
  function line(a,b,color,width=.035,y=.065,glow=0){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(length<.001)return;
    add(cube,color,(a[0]+b[0])/2,y,(a[1]+b[1])/2,width,.012,length,glow,Math.atan2(dx,dz));
  }
  function circuit(points,color=colors.mint){
    const lengths=points.slice(1).map((b,i)=>Math.hypot(b[0]-points[i][0],b[1]-points[i][1]));
    for(let i=1;i<points.length;i++){
      line(points[i-1],points[i],0x102c34,.15,.06);
      line(points[i-1],points[i],color,.032,.072,.8);
      halos.push({a:points[i-1],b:points[i],color});
      // Dim companion traces give the board depth without filling its walkable space.
      line(points[i-1].map((v,j)=>v+(j===0?.2:0)),points[i].map((v,j)=>v+(j===0?.2:0)),0x365c59,.025,.068);
    }
    for(const [x,z] of [points[0],points.at(-1)]){
      add(disc,0x0d2830,x,.075,z,.22,.025,.22);
      add(disc,color,x,.09,z,.1,.02,.1,.7);
    }
    routes.push({points,lengths,length:lengths.reduce((a,b)=>a+b,0),color});
  }
  const {safe,hard,gateZ}=layout;
  // Reused clipped and notched silhouettes form broad panels with varied proportions.
  for(const area of [safe,hard]){
    const network=area===hard;
    for(const p of boardPanels(area)){
      const {x,z,width:w,depth:d}=p,geometry=PANEL_GEOMETRIES[p.shape];
      add(geometry,network?0x111f30:0x102a30,x,.002,z,w,1,d);
      add(geometry,(network?networkColors:panelColors)[p.tone],x,.019,z,w-.07,1,d-.07);
      const corners=PANEL_CONTOURS[p.shape].map(([cx,cz])=>[x+cx*(w-.32),z+cz*(d-.32)]);
      for(let i=0;i<corners.length;i++)line(corners[i],corners[(i+1)%corners.length],0x122e35,.025,.052);
      for(const i of [1,Math.floor(corners.length/2)])screw(corners[i][0],.065,corners[i][1],.065);
      if(Math.abs(x)>4&&w>3&&d>3)for(let row=0;row<2;row++)for(let col=0;col<3;col++){
        const vx=x-w*.26+col*.26,vz=z+d*.22+row*.26;
        add(disc,0x3d5c60,vx,.054,vz,.095,.008,.095);
        add(disc,0x0c222a,vx,.06,vz,.072,.008,.072);
      }
    }
  }
  // Visible traces lead through the network's branching corridors.
  for(const c of content.areas[1].corridors||[]){
    const x=(c.minX+c.maxX)/2,z=(c.minZ+c.maxZ)/2;
    circuit(c.maxX-c.minX>c.maxZ-c.minZ?[[c.minX,z],[c.maxX,z]]:[[x,c.minZ],[x,c.maxZ]],colors.image);
  }
  // Layered stepping plates: inset seats, metal edges and brushed faces.
  for(let i=0;i<(layout.maxZ-layout.minZ)/1.25;i++){
    const z=layout.maxZ-i*1.25,x=Math.sin(z*.22)*1.5,angle=Math.sin(z*.22)*.13;
    const width=2.15+(i%4)*.12,depth=.77+(i%3)*.045;
    add(hardwareGeometry,0x112b32,x,.055,z,width+.2,.07,depth+.17,0,angle);
    add(hardwareGeometry,0x867b5e,x,.095,z,width,.06,depth,0,angle);
    add(hardwareGeometry,z<gateZ?0x526682:0x59757c,x,.125,z,width-.065,.04,depth-.065,0,angle);
    for(const side of [-1,1]){
      const dx=side*(width/2+.19),px=x+Math.cos(angle)*dx,pz=z-Math.sin(angle)*dx;
      add(hardwareGeometry,0x8c805f,px,.08,pz,.15,.07,.3,0,angle);
      if((i+(side>0?1:0))%3!==0)add(hardwareGeometry,0xe5efb2,px,.126,pz,.09,.03,.22,.85,angle);
      else screw(px,.13,pz,.04);
    }
  }
  // Orthogonal, sparse routes connect the existing geography.
  for(let i=0;i<14;i++){
    const side=i%2?1:-1,z=safe.maxZ-2-i*3.1,x=side*(4.5+(i%3)*3);
    circuit([[side*2.5,z],[x,z],[x,z-2],[x+side*2,z-2]],i%4===1?colors.image:colors.mint);
  }
  for(const s of content.areas[0].spawns)if(s.emitter){
    const {x,z}=s.emitter,color=s.creature==='image'?colors.image:colors.mint;
    circuit([[x+.85,z-1.2],[x+2,z-1.2],[x+2,z+2.5],[x+.5,z+2.5]],color);
    // Metal mounting plate, brass screws, and an embedded status panel.
    block(0x142d35,x,.12,z-.5,1.95,.16,2.75);
    block(0x8e886b,x,.21,z-.5,1.85,.12,2.65);
    block(colors.cream,x,.277,z-.5,1.74,.025,2.54);
    for(const dx of [-.72,.72])for(const dz of [-1.55,.55]){
      add(disc,colors.gold,x+dx,.32,z+dz,.09,.045,.09);
      add(cube,0x263b40,x+dx,.346,z+dz,.10,.012,.02);
    }
    // Insulated port collars and brass retaining clips; all inside the pipe footprint.
    for(const side of [-1,1]){
      block(colors.gold,x+side*.59,.79,z-.38,.12,.34,.15);
      block(0x29454c,x+side*.61,.79,z-.38,.025,.16,.07);
      block(colors.cream,x+side*.73,.36,z-.65,.18,.12,1.1);
    }
    block(0x0d222b,x+.71,.62,z-1.15,.15,.48,.16);
    for(let i=0;i<3;i++)block(color,x+.71,.48+i*.14,z-1.055,.085,.06,.03,.9);
  }
  // Device islands are larger, darker sockets joined by purple network signals.
  for(const [id,p] of Object.entries(NETWORK_DEVICES)){
    block(0x111d32,p.x,-.005,p.z,6.3,.1,5.1);
    block(0x34445c,p.x,.045,p.z,6,.10,4.8);
    for(const dx of [-2.8,2.8])block(colors.image,p.x+dx,.107,p.z,.035,.015,4,.35);
    circuit([[0,gateZ-2],[0,p.z+3],[p.x,p.z+3],[p.x,p.z+1.7]],colors.image);
  }
  // Flush connector pads mark the threshold while preserving the gateway opening.
  for(let i=0;i<8;i++){
    const x=-1.8+i*.5;
    block(colors.gold,x,.08,gateZ,.22,.10,1.3);
    block(0x1a2c3e,x,.15,gateZ+.7,.26,.07,.16);
  }
  for(const side of [-1,1]){
    block(colors.cream,side*2.8,2.75,gateZ,.9,.20,1.1);
    block(colors.image,side*2.8,2.88,gateZ,.55,.06,.7,1);
  }
  // Small details stay on known solid footprints, so decoration never blocks a route.
  for(const [x,z] of MEMORY_MODULES){
    for(let j=0;j<11;j++)block(colors.gold,x-1.24,.35,z-2.5+j*.5,.18,.09,.18);
    block(0x8eaa85,x+1.15,.42,z-2.3,.08,.09,.28,.6);
  }
  const p=PROCESSOR;
  for(const dx of [-2,2])for(const dz of [-2,2]){
    add(disc,colors.gold,p.x+dx,.47,p.z+dz,.12,.05,.12);
    add(cube,0x283e43,p.x+dx,.501,p.z+dz,.13,.01,.025);
  }
  // A simple neural symbol inlaid on the existing CPU.
  for(const [x,z] of [[0,0],[-.7,-.6],[.7,-.6],[-.7,.6],[.7,.6],[0,-1],[0,1]]){
    add(disc,0x7caeb0,p.x+x,.774,p.z+z,.10,.018,.10,.25);
    if(x||z)line([p.x,p.z],[p.x+x,p.z+z],0x537e83,.03,.773);
  }
  for(const [x,z,h] of serverTowers(layout)){
    // A fan in the top of a server, not another obstacle beside it.
    add(disc,0x0e242d,x,h+.15,z,.47,.06,.47);
    const fan=new THREE.Group();fan.position.set(x,h+.20,z);root.add(fan);fans.push(fan);
    for(let i=0;i<5;i++){
      const blade=new THREE.Mesh(hardwareGeometry,material(0x53676b));
      blade.scale.set(.19,.05,.36);const a=i/5*Math.PI*2;
      blade.position.set(Math.sin(a)*.22,0,Math.cos(a)*.22);blade.rotation.y=a+.5;fan.add(blade);
    }
    add(disc,colors.gold,x,h+.25,z,.12,.06,.12);
    // Layered cooling grille and corner fasteners give towers a manufactured face.
    for(let i=0;i<4;i++){
      block(0x0d222b,x,.65+i*.48,z+.66,1.06,.25,.06);
      for(let j=0;j<5;j++)block(0x53676b,x-.4+j*.2,.65+i*.48,z+.70,.06,.15,.018);
    }
    for(const dx of [-.55,.55])screw(x+dx,h+.09,z+.5,.06);
  }
  for(const p of Object.values(BASE_MACHINES)){
    for(const side of [-1,1])block(colors.gold,p.x+side*.9,.47,p.z,.09,.09,1.4);
    for(let i=0;i<3;i++)block(0x29454c,p.x+.77,.85+i*.16,p.z,.045,.055,.65);
    for(const dx of [-.72,.72])screw(p.x+dx,.48,p.z+.72,.055);
    // Recessed slot trim and short metal feet stay within each machine's footprint.
    block(0x0d222b,p.x,.77,p.z+.65,1.12,.38,.04);
    block(colors.gold,p.x,.57,p.z+.7,1.2,.055,.06);
    for(const dx of [-.63,.63])block(0x53676b,p.x+dx,.22,p.z+.55,.24,.17,.5);
  }
  for(const p of Object.values(BASE_STORAGE)){
    block(colors.cream,p.x,.12,p.z+1.6,4.6,.1,.14);
    for(const side of [-1,1])add(disc,colors.gold,p.x+side*2.1,.18,p.z+1.4,.1,.04,.1);
  }
  // Decorative outer cable bundles are outside navigable bounds.
  for(const side of [-1,1])for(let j=0;j<3;j++){
    const x=side*(safe.maxX+1+j*.18);
    line([x,safe.minZ],[x,safe.maxZ],0x0d222b,.14,.17);
    for(let z=safe.minZ+3;z<safe.maxZ;z+=8){block(colors.gold,x,.25,z,.2,.12,.15);screw(x,.32,z,.045);}
  }
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;screw(-3+Math.sin(a)*2.32,.17,5+Math.cos(a)*2.32,.085);}
  // Freeze static geometry into batches. Extra detail adds dozens, not hundreds, of draw calls.
  for(const {geometry,mat,transforms} of batches.values()){
    const batch=new THREE.InstancedMesh(geometry,mat,transforms.length);
    transforms.forEach((m,i)=>batch.setMatrixAt(i,m));batch.receiveShadow=true;
    batch.computeBoundingSphere();root.add(batch);
  }
  // Soft, inexpensive surface glows, with the same fog mask as the terrain.
  const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=8;
  const gc=glowCanvas.getContext('2d'),gradient=gc.createLinearGradient(0,0,64,0);
  gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(.5,'rgba(255,255,255,.65)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  gc.fillStyle=gradient;gc.fillRect(0,0,64,8);
  const glowMap=new THREE.CanvasTexture(glowCanvas);
  for(const color of [colors.mint,colors.image]){
    const selected=halos.filter(h=>h.color===color);
    const mat=new THREE.MeshBasicMaterial({color,map:glowMap,transparent:true,opacity:.4,depthWrite:false,toneMapped:false});
    applyMaterial(mat);
    const geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
    const batch=new THREE.InstancedMesh(geometry,mat,selected.length);
    selected.forEach(({a,b},i)=>{
      const dx=b[0]-a[0],dz=b[1]-a[1];
      position.set((a[0]+b[0])/2,.085,(a[1]+b[1])/2);scale.set(.48,1,Math.hypot(dx,dz));
      quat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,Math.atan2(dx,dz));
      matrix.compose(position,quat,scale);batch.setMatrixAt(i,matrix);
    });
    batch.computeBoundingSphere();root.add(batch);
  }
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
  const sc=shadowCanvas.getContext('2d'),sg=sc.createRadialGradient(32,32,8,32,32,32);
  sg.addColorStop(0,'rgba(0,0,0,.55)');sg.addColorStop(.5,'rgba(0,0,0,.3)');sg.addColorStop(1,'rgba(0,0,0,0)');
  sc.fillStyle=sg;sc.fillRect(0,0,64,64);
  const sm=new THREE.MeshBasicMaterial({color:0x06151d,map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,opacity:.7});applyMaterial(sm);
  const footprints=[[-3,5,5,5],...Object.values(BASE_MACHINES).map(p=>[p.x,p.z,3,3]),...content.areas[0].spawns.filter(s=>s.emitter).map(s=>[s.emitter.x,s.emitter.z-.5,3,4])];
  const shadowGeo=new THREE.PlaneGeometry(1,1);shadowGeo.rotateX(-Math.PI/2);
  const shadows=new THREE.InstancedMesh(shadowGeo,sm,footprints.length);
  footprints.forEach(([x,z,w,d],i)=>{position.set(x,.057,z);scale.set(w,1,d);quat.identity();matrix.compose(position,quat,scale);shadows.setMatrixAt(i,matrix);});
  shadows.computeBoundingSphere();root.add(shadows);
  // Local pools of light provide a bloom-like glow without a full-screen render pass.
  const lightCanvas=document.createElement('canvas');lightCanvas.width=lightCanvas.height=64;
  const lc=lightCanvas.getContext('2d'),lg=lc.createRadialGradient(32,32,0,32,32,32);
  lg.addColorStop(0,'rgba(255,255,255,.8)');lg.addColorStop(.3,'rgba(255,255,255,.3)');lg.addColorStop(1,'rgba(255,255,255,0)');lc.fillStyle=lg;lc.fillRect(0,0,64,64);
  const lightMap=new THREE.CanvasTexture(lightCanvas);
  for(const type of ['text','image']){
    const ports=content.areas[0].spawns.filter(s=>s.emitter&&s.creature===type).map(s=>[s.emitter.x,s.emitter.z+.95]);
    if(type==='text')ports.push([-3,5]);
    const lm=new THREE.MeshBasicMaterial({map:lightMap,color:type==='text'?colors.mint:colors.image,transparent:true,opacity:.48,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});applyMaterial(lm);
    const lights=new THREE.InstancedMesh(shadowGeo,lm,ports.length);
    ports.forEach(([x,z],i)=>{position.set(x,.11,z);scale.set(2.7,1,2.7);quat.identity();matrix.compose(position,quat,scale);lights.setMatrixAt(i,matrix);});lights.computeBoundingSphere();root.add(lights);
  }
  const pulseGroups=new Map();
  for(const color of [colors.mint,colors.image]){
    const selected=routes.filter(r=>r.color===color),count=selected.length*2;
    const core=new THREE.InstancedMesh(cube,material(color,2.8),count);
    core.instanceMatrix.setUsage(THREE.DynamicDrawUsage);core.frustumCulled=false;root.add(core);
    pulseGroups.set(color,{core,routes:selected});
  }
  function along(route,t){
    let distance=t*route.length;
    for(let i=0;i<route.lengths.length;i++){
      if(distance<=route.lengths[i]||i===route.lengths.length-1){
        const a=route.points[i],b=route.points[i+1],f=distance/route.lengths[i];
        return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,Math.atan2(b[0]-a[0],b[1]-a[1])];
      }
      distance-=route.lengths[i];
    }
  }
  return {root,update(time){
    fans.forEach((f,i)=>f.rotation.y=time*(1.8+i*.15));
    for(const {core,routes} of pulseGroups.values()){
      routes.forEach((r,i)=>{for(let j=0;j<2;j++){
        const [x,z,angle]=along(r,(time*.95/r.length+i*.17+j*.5)%1);
        position.set(x,.105,z);scale.set(.095,.035,.20);quat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,angle);
        matrix.compose(position,quat,scale);core.setMatrixAt(i*2+j,matrix);
      }});core.instanceMatrix.needsUpdate=true;
    }
  }};
}
