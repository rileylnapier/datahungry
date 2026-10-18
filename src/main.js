import {STORY_SITES,STORY_NODES,DIALOGUES,networkAccess,terminalEvent,storyObjective,storyEventAvailable,beginStory,advanceStory,siteEvent,nearbyStorySite} from './story.js';
import {renderStory,storyCard} from './story-view.js';
import {createDamageFeedback} from './damage-feedback.js';
import {codeGuide,deviceApproach} from './code-guide.js';
import {PROGRAMS,buyProgram,programRequirements,malwareDamage,cleanPacket} from './network-programs.js';
import {createAgentSystem,requestCourier,assignCollector,agentLoad,AGENT_CAPACITY} from './agents.js';
import {districtAt,districtCenter} from './network-layout.js';
import {debugStorage,startDebug} from './debug.js';
import {nextPipePacket} from './training-pipes.js';
import {createPerformanceMonitor} from './performance-monitor.js';
import {goalProgress} from './goal-progress.js';
import {BENCHMARK,benchmarkScore} from './benchmark.js';
import {mountBenchmark} from './benchmark-view.js';
import { CHAPTER, PROFILES, sandboxReady, createTrial, startTrial, trialPassed, photoReady, autoSortReady, buildProgram, codeAvailable, visitDevice } from './chapter.js';
import { createExploration, REVEAL_RADIUS } from './exploration.js';
import { MIN_ZOOM, MAX_ZOOM, pinchZoom } from './zoom.js';
import { createScene } from './scene.js';
import { readSave, SAVE_KEY, serialize, packetStats, TYPES, UPGRADES, BALANCE, configureContent, movementSpeed, noise, connections, upgradeUnlocked, bodyRadius, maxLevel, collectHallucination, capacity, used, haulValue, range, level, cost, collect, bank, buy, unlock, defeat } from './state.js';
import { PROCESSING, processBase, processingSummary, buildImageMuncher, picturesUnlocked, mediaUnlocked, feedAvailable, autoDropOff, analyzerRate, analyzerSpeedCost, upgradeAnalyzer, STORAGE, STORAGE_TYPES, canRetain, analyzerMaxLevel, storageCapacity, storageUsed, storageCost, upgradeStorage } from './processing.js';
import { loadContent } from './content.js';
import { worldLayout, routeThroughGate, solidObstacles, BASE_MACHINES, BASE_STORAGE, BASE_SORTER, NETWORK_DEVICES } from './world-layout.js';
import { moveWithCollisions, planPath } from './collision.js';
import { steerVelocity } from './movement.js';
import {atHomeDock} from './home-dock.js';
import {screenMovement} from './camera-view.js';
import {hasRestartBackup,restartProgress,restoreProgress} from './restart.js';

const $=id=>document.getElementById(id);
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}};}
const normalStorage=storage,debugActive=new URLSearchParams(location.search).get('debug')==='1';
if(debugActive)storage=debugStorage(normalStorage);
const state=readSave(storage);
const content=await loadContent();
configureContent(content);
state.trial=createTrial(state.trial);
const layout=worldLayout(content),{gateZ}=layout;
const obstacles=solidObstacles(content,state.base);
const exploration=createExploration(state,layout);
let exploredDirty=false,explorationSaveTime=0,revealX=0,revealZ=3,revealRange=0;
let world;
try { world=createScene($('world'),state,content,exploration); } catch(error) { $('boot-error').hidden=false; throw error; }
const {THREE}=world;
const damageFeedback=createDamageFeedback({edge:$('damage-edge'),popup:$('damage-popup'),hud:$('health-hud'),status:$('health-warning'),project:p=>world.project(new THREE.Vector3(p.x,3.1,p.z))});
const player={x:0,z:debugActive&&networkAccess(state)?-44:3,vx:0,vz:0,hurt:0,munch:0};
const creatures=[],enemies=[],emitters=[];
let time=0,last=0,uiTime=0,paused=false,panel=null,destination=null,returning=false,gateCooldown=0;
let storySite=null,terminalMode=false,lastStoryNotice='',storyPanelSignature='';
let route=[],dockTab='base',processingSaveTime=0,benchmarkView=null,interactionDevice=null;
document.addEventListener('visibilitychange',()=>{last=0;});
const dataNames={text:'Text',image:'Image',code:'Code',audio:'Sound',video:'Video'};
const perf=createPerformanceMonitor(world.renderer,()=>({zone:content.areas[state.zone].name,collectors:connections(state),queue:processingSummary(state).count,creatures:creatures.filter(c=>c.wait<=0&&c.view.group.visible).length,panel:panel||'playing',zoom:world.getZoom()}),enabled=>{const button=$('performance-toggle');if(button)button.textContent=`${enabled?'Hide':'Show'} performance monitor`;});
let pictureMilestoneSeen=picturesUnlocked(state),lastLearningWarning=-Infinity;
function callCourier(){if(requestCourier(state)){save();toast('Courier called! Keep exploring; it will meet you.');updateUI();}}
$('call-courier').onclick=callCourier;
function captureSpecimen(c,t){
  if(c.corrupt){
    if(state.programs.cleaner){if(used(state)+t.size>capacity(state))return false;state.cargo.push(cleanPacket(t));state.collected++;return true;}
    return collectHallucination(state,t.size);
  }
  return c.mimic?collectHallucination(state,t.size):collect(state,c.type,c.rich,t.size,c.profile);
}
function navigateTo(goal){
  route=[];let start=player;
  for(const waypoint of routeThroughGate(player,goal,gateZ)){
    const segment=planPath(start,waypoint,layout,obstacles,bodyRadius(state));
    if(!segment.length){destination=null;route=[];toast('No clear route. Try a nearby spot.');return;}
    route.push(...segment);start=segment.at(-1);
  }
  destination=route.shift();
}
let soundOn=false,audio=null,toastTimer;
let replacingSave=false;
function save(){if(replacingSave)return;try{storage.setItem(SAVE_KEY,serialize(state));}catch{toast('Storage unavailable. Progress lasts for this session.');}}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function tone(freq=500,length=.09){if(!soundOn)return;try{audio ||= new AudioContext();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.35,audio.currentTime+length);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+length);}catch{soundOn=false;}}
const random=(a,b)=>a+Math.random()*(b-a);
function respawn(c,initial=false){if(c.emitter){c.wait=Infinity;c.progress=0;c.life=0;c.view.group.visible=false;return;}const bounds=c.habitat||content.areas[c.zone].bounds;c.x=random(bounds.minX,bounds.maxX);c.z=random(bounds.minZ,bounds.maxZ);if(c.zone===0&&Math.hypot(c.x+3,c.z-5)<2.6)c.z-=4;c.angle=random(0,Math.PI*2);c.progress=0;c.wait=initial?0:PROFILES[c.profile]?.respawn??random(5,10);c.view.group.visible=initial;}
for(const area of content.areas){
  for(const spawn of area.spawns){const emitter=spawn.emitter?{...spawn.emitter,type:spawn.creature,packetSize:spawn.packetSize??TYPES[spawn.creature].size,cooldown:.25,members:[]}:null;if(emitter)emitters.push(emitter);for(let i=0;i<spawn.count;i++){const c={type:spawn.creature,packetSize:spawn.packetSize??TYPES[spawn.creature].size,profile:spawn.profile,corrupt:PROFILES[spawn.profile]?.corrupt===true,rich:area.id==='open_web',packetName:PROFILES[spawn.profile]?.name||spawn.emitter?.name.replace(/ pipe$/i,'')||(['audio','video'].includes(spawn.creature)?TYPES[spawn.creature].name:undefined),zone:area.zone,emitter,habitat:spawn.habitat,view:world.creature(spawn.creature,area.id==='open_web',spawn.profile),phase:random(0,6),wait:0};respawn(c,true);creatures.push(c);if(emitter)emitter.members.push(c);}}
  for(let i=0;i<area.hallucinations.count;i++){const type=['text','image','code'][i%3];const c={type,zone:area.zone,mimic:true,view:world.creature(type,true),phase:random(0,6),wait:0};respawn(c,true);creatures.push(c);}
  for(const hostile of area.hostiles)for(let i=0;i<hostile.count;i++){
    const h=hostile.habitat,e={...content.enemies[hostile.enemy],habitat:h,homeX:random(h.minX+1,h.maxX-1),homeZ:random(h.minZ+1,h.maxZ-1),phase:random(0,6),wait:0,progress:0,type:'code',packetSize:6,packetName:'Malware'};
    e.x=e.homeX;e.z=e.homeZ;e.view=world.malware();enemies.push(e);
  }
}

const agentSystem=createAgentSystem(state,{content,layout,obstacles,creatures,packetStats,respawn,onChange:save,onDelivery:(items,id)=>{world.deliverData(items);toast(`${id==='courier'?'Courier':'Collector'} delivered ${items.reduce((n,c)=>n+c.size,0)} KB. Home is analyzing it.`);}});
const bossDef=content.bosses[0];
const boss={x:0,z:layout.hard.minZ+4,hp:bossDef.integrity,alive:bossDef.enabled&&!state.stressPassed,timer:0,charge:0,view:world.malware()};boss.view.scale.setScalar(2.1);boss.view.visible=boss.alive;
const labels=[];
function label(className,text,pos){const el=document.createElement('div');el.className='world-label '+className;el.innerHTML=text;$('labels').append(el);labels.push({el,pos});return el;}
label('dock-label','BYTE’S HOME<small>Drop off · Build · Grow</small>',()=>new THREE.Vector3(-3,2.1,5));
for(const [title,detail,x,z] of [['PROCESSOR','Local computer',10,-20]])label('district-label',`${title}<small>${detail}</small>`,()=>new THREE.Vector3(x,2.5,z));
const storageLabels=Object.fromEntries(Object.entries(BASE_STORAGE).map(([type,pos])=>[type,label('district-label','',()=>new THREE.Vector3(pos.x,2.5,pos.z))]));
label('dock-label','DATA SORTER',()=>new THREE.Vector3(BASE_SORTER.x,1.6,BASE_SORTER.z));
const muncherLabel=label('dock-label','STARTER ANALYZER<small>Ready for data</small>',()=>new THREE.Vector3(BASE_MACHINES.basic.x,2.25,BASE_MACHINES.basic.z));
const imageMuncherLabel=label('district-label','IMAGE ANALYZER<small>Build at home</small>',()=>new THREE.Vector3(BASE_MACHINES.image.x,state.base.photoSorter?2.85:2.25,BASE_MACHINES.image.z));
const gateLabel=label('gate-label','LOCAL NETWORK<small>DATA TRIALS · Cats & dogs</small>',()=>new THREE.Vector3(0,3.5,gateZ));
for(const c of creatures.filter(c=>c.mimic)){const el=label('hallucination-label','HALLUCINATION',()=>new THREE.Vector3(c.x,1.2,c.z));c.warning=el;}
for(const e of emitters)e.label=label('pipe-label','',()=>new THREE.Vector3(e.x,2,e.z-.9));
const bossLabel=label('gate-label',bossDef.name,()=>new THREE.Vector3(boss.x,2.7,boss.z));
const extraLabel=label('dock-label','AUTO SORT<small>Second text & code worker</small>',()=>new THREE.Vector3(BASE_MACHINES.extra.x,2.25,BASE_MACHINES.extra.z));
const deviceLabels=Object.fromEntries(Object.entries(NETWORK_DEVICES).map(([id,d])=>[id,label('district-label','',()=>new THREE.Vector3(d.x,3,d.z))]));
for(const d of content.areas[1].districts){const center=districtCenter(d);label(d.safe?'district-label':'danger-label',`${d.name.toUpperCase()}<small>${d.safe?'Connected device · explore for data':'DANGER · malware & corrupted files'}</small>`,()=>new THREE.Vector3(center.x,2.6,d.bounds.minZ+1.5));}
for(const id of ['courier','harvester']){const el=label('agent-label','',()=>new THREE.Vector3(state.agents[id].x,1.7,state.agents[id].z));el.dataset.agent=id;}
label('district-label','← PHOTO LIBRARY · SHARED INBOX →',()=>new THREE.Vector3(0,.8,-48));
const webLabel=label('gate-label','',()=>new THREE.Vector3(0,3,layout.hard.minZ+1));
const storyLabels={};
for(const id of ['terminal','infected','backup','firewall','archive']){const site=STORY_SITES[id];storyLabels[id]=label('story-node-label','',()=>new THREE.Vector3(site.x,2.5,site.z));}
let nearby=null;
const nearbyLabel=label('specimen-label','',()=>new THREE.Vector3(nearby?.x??player.x,1.15,nearby?.z??player.z));

const keys=new Set();let pointer=null,pinch=null;const touchPoints=new Map();
const joystick=$('joystick');
function clearInput(){keys.clear();pointer=null;pinch=null;touchPoints.clear();joystick.hidden=true;}
function closePanel(){benchmarkView?.destroy();benchmarkView=null;$('panel').classList.remove('benchmark-panel');panel=null;interactionDevice=null;$('app').classList.remove('device-conversation');$('modal-backdrop').hidden=true;clearInput();gateCooldown=3;$('world').focus({preventScroll:true});}
function showPanel(type,device=null){interactionDevice=type==='story'?device:type==='benchmark'?interactionDevice:null;panel=type;$('app').classList.toggle('device-conversation',type==='story'&&!!interactionDevice&&interactionDevice!=='home');clearInput();player.vx=0;player.vz=0;destination=null;route=[];returning=false;$('modal-backdrop').hidden=false;renderPanel();if(type!=='benchmark')$('close-panel').focus();}
function upgradeCard(id,u){
  const current=state.levels[id],maxed=current>=maxLevel(id,state),price=cost(state,id),locked=!upgradeUnlocked(state,id);
  let change='';
  if(id==='capacity')change=`${capacity(state)} KB → ${capacity(state)+BALANCE.capacityPerLevel} KB carried`;
  if(id==='range'){
    change=`${range(state).toFixed(2)} m → ${(range(state)+BALANCE.rangePerLevel).toFixed(2)} m reach`;

  }
  if(id==='parallel')change=!state.unlocked&&state.levels.parallel>=3?'Four head sprouts grown. Equip the travel vat to add more hoses.':locked?`Unlocks after ${BALANCE.parallelTraining} lifetime processing points · ${goalProgress(state.total,BALANCE.parallelTraining)}`:`${connections(state)} → ${connections(state)+1} creatures at once · each downloads at full speed`;
  if(id==='speed')change=`${movementSpeed(state).toFixed(2)} → ${(movementSpeed(state)+BALANCE.startingSpeed*BALANCE.speedPerLevel).toFixed(2)} m/s · Vat bonus included`;
  if(id==='decode')change=`${Math.round(.4/(1+current*.4)*100)}% faster than your current speed`;
  if(id==='clarity')change=['Next: fake data flickers to give you a clue.','Next: fake data gets a visible warning label.','Next: Byte automatically skips fake data.','Fake data is automatically filtered.'][current];
  return `<button class="upgrade" data-upgrade="${id}" ${locked||maxed||state.points<price?'disabled':''}><span class="upgrade-copy"><strong>${u.name}</strong><small>${u.detail}</small><span class="upgrade-effect">${id==='parallel'&&!state.unlocked&&current>=3?'Four sprouts active · Equip the travel vat to add more hoses':maxed?(state.unlocked?'Fully upgraded':'Sandbox limit · Equip the travel vat to upgrade further'):change}</span><span class="upgrade-level">Level ${current} of ${maxLevel(id,state)}</span></span><span class="upgrade-price">${maxed?(state.unlocked?'MAX':'VAT'):price+' ✦'}${locked?'<small>Locked</small>':!maxed&&state.points<price?`<small>Need ${price-state.points} more</small>`:''}</span></button>`;
}
function renderPanel(){
  const p=$('panel-content');benchmarkView?.destroy();benchmarkView=null;$('panel').classList.toggle('benchmark-panel',panel==='benchmark');
  if(panel==='story'){
    p.innerHTML=renderStory(state,terminalMode);
    if($('story-trial'))$('story-trial').innerHTML=chapterShop();
  }else if(panel==='benchmark'){
    benchmarkView=mountBenchmark(p,state,{onChange:()=>{save();updateUI();},onPersist:save,onClaim:claimVat,onExit:()=>showPanel('dock')});
  }else if(panel==='dock'){
        p.innerHTML=`<span class="eyebrow">BYTE’S HOME</span><h2 id="panel-title">A home for hungry thoughts.</h2><p>Walk onto the home pad to unload, then keep exploring. Analyzers always earn points. Saved examples also build knowledge, which unlocks new upgrades. Spending points never spends knowledge.</p><div class="panel-stat"><span>Points</span><strong id="dock-points">${state.points} ✦</strong></div><div class="dock-tabs" role="group" aria-label="Home upgrades"><button id="base-tab" aria-pressed="${dockTab==='base'}">Build home</button><button id="byte-tab" aria-pressed="${dockTab==='byte'}">Grow Byte</button></div>${dockTab==='base'?baseShop():Object.entries(UPGRADES).filter(([id])=>id!=='clarity'&&(id!=='speed'||state.unlocked)).map(([id,u])=>upgradeCard(id,u)).join('')}<p class="panel-note">${dockTab==='base'?'Dropped-off data and unfinished jobs are saved. Machines rest when you pause or close the game.':`${state.unlocked?'Vat tier unlocked: more memory, reach, decoding, movement speed and up to ten hoses.':`Reach ${CHAPTER.sandboxText} text knowledge and ${CHAPTER.sandboxImages} image knowledge, then pass Data Trials to earn the vat. Choose the upgrades that help you learn faster.`}`}</p><button class="primary" id="explore">Back to exploring <span>↗</span></button>`;
    $('base-tab').onclick=()=>{dockTab='base';renderPanel();};$('byte-tab').onclick=()=>{dockTab='byte';renderPanel();};
    p.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{if(buy(state,b.dataset.upgrade)){save();tone(800);renderPanel();updateUI();}});
    if($('build-muncher'))$('build-muncher').onclick=()=>{if(buildImageMuncher(state)){obstacles.splice(0,obstacles.length,...solidObstacles(content,state.base));save();tone(850,.2);world.burst(new THREE.Vector3(BASE_MACHINES.image.x,0,BASE_MACHINES.image.z),0xc9b8ff,24);toast('Image Analyzer built! Pictures now have their own machine.');renderPanel();updateUI();}};
    if($('speed-upgrade'))$('speed-upgrade').onclick=()=>{if(upgradeAnalyzer(state)){save();tone(750);renderPanel();updateUI();}};
    p.querySelectorAll('[data-storage]').forEach(b=>b.onclick=()=>{const type=b.dataset.storage;if(upgradeStorage(state,type)){save();tone(750);world.burst(new THREE.Vector3(BASE_STORAGE[type].x,1,BASE_STORAGE[type].z),TYPES[type].color,16);renderPanel();updateUI();}});
    p.querySelectorAll('[data-program]').forEach(b=>b.onclick=()=>{if(buyProgram(state,b.dataset.program)){save();toast(`${PROGRAMS[b.dataset.program].name} built!`);renderPanel();updateUI();}});
    p.querySelectorAll('[data-assignment]').forEach(b=>b.onclick=()=>{if(assignCollector(state,b.dataset.assignment||null,content,exploration.known)){save();renderPanel();}});
    if($('call-courier-home'))$('call-courier-home').onclick=callCourier;
    $('explore').onclick=closePanel;updateBaseUI();
  }else if(panel==='gate'){
    p.innerHTML=`<span class="eyebrow">SHARED NETWORK ACCESS</span><h2 id="panel-title">A key for the next little leap.</h2><p>${state.unlocked?'Your travel vat is ready. The Training Terminal has a new assignment; follow it to meet PATCH and receive a guest key.':'Pass Data Trials to earn a travel vat. Your next assignment will lead to a guest key for the shared network.'}</p>${storyCard(state)}${!state.unlocked?`<div id="chapter-work">${chapterShop()}</div>`:''}<button class="primary" data-story-go>Go to current assignment ↗</button><button class="restart-button" id="keep-learning">Keep exploring</button>`;
    $('keep-learning').onclick=closePanel;
  }else if(panel==='map'){
    const mx=x=>20+(x-layout.minX)/(layout.maxX-layout.minX)*280,my=z=>20+(z-layout.minZ)/(layout.maxZ-layout.minZ)*330;
    const pin=(name,x,z,color)=>!exploration.known(x,z)?'':`<circle cx="${mx(x)}" cy="${my(z)}" r="5" fill="${color}"/><text x="${mx(x)+9}" y="${my(z)+4}">${name}</text>`;

    const mapRect=(b,color)=>`<rect x="${mx(b.minX)}" y="${my(b.minZ)}" width="${mx(b.maxX)-mx(b.minX)}" height="${my(b.maxZ)-my(b.minZ)}" fill="${color}" fill-opacity=".4" stroke="${color}" stroke-width=".7"/>`;
    const networkMap=content.areas[1].corridors.map(b=>mapRect(b,'#7896a6')).join('')+content.areas[1].districts.map(d=>mapRect(d.bounds,d.color)).join('');
    const mapMask=[...exploration.cells].map(key=>{const [x,z]=key.split(',').map(Number);return `<rect x="${mx(x)}" y="${my(z)}" width="${280/(layout.maxX-layout.minX)+.1}" height="${330/(layout.maxZ-layout.minZ)+.1}" fill="white"/>`;}).join('');
    p.innerHTML=`<span class="eyebrow">YOUR LOCAL COMPUTER</span><h2 id="panel-title">Explore the network</h2><p>Explore to reveal connected devices and corridors. Red rooms contain malware. Discovered places stay on your map.</p>${storyCard(state)}${codeGuideCard()}<svg class="network-map" viewBox="0 0 340 380" role="img" aria-label="Map of explored ground, discovered feeds, home, and Byte"><defs><mask id="explored-map">${mapMask}</mask></defs><rect x="12" y="12" width="300" height="350" rx="12" fill="#10252d"/><g mask="url(#explored-map)">${networkMap}${mapRect(content.areas[0].bounds,'#558968')}<text x="25" y="34">SHARED NETWORK ${networkAccess(state)?'':'· LOCKED'}</text><path d="M 12 ${my(gateZ)} H 312" stroke="#b5a2eb" stroke-width="3" stroke-dasharray="7 5"/><text x="25" y="${my(gateZ)+27}">SANDBOX</text>${emitters.map(e=>pin(e.name,e.x,e.z,'#'+TYPES[e.type].color.toString(16))).join('')}</g>${Object.values(NETWORK_DEVICES).map(d=>pin(d.name,d.x,d.z,'#'+d.color.toString(16))).join('')}${pin('Home',-3,5,'#d5f4a3')}${pin('Training Terminal',4,0,'#d5f4a3')}${['infected','backup','relay'].map(id=>pin(STORY_SITES[id].name,STORY_SITES[id].x,STORY_SITES[id].z,'#ffc18a')).join('')}<circle cx="${mx(player.x)}" cy="${my(player.z)}" r="7" fill="#fff" stroke="#c995f0" stroke-width="3"/><text x="${mx(player.x)+10}" y="${my(player.z)-10}">Byte</text></svg><div class="map-destinations">${emitters.map((e,i)=>{const discovered=exploration.known(e.x,e.z);return `<button data-place="${e.id}" ${(discovered||i===0)&&feedAvailable(state,e.type)?'':'disabled'}>${discovered||i===0?`${e.name} · ${e.packetSize} KB`:e.x<0?'Unexplored western feed':'Unexplored eastern feed'}</button>`;}).join('')}${state.unlocked?content.areas[1].districts.map(d=>{const c=districtCenter(d),known=exploration.known(c.x,c.z)||(NETWORK_DEVICES[d.id]&&exploration.known(NETWORK_DEVICES[d.id].x,NETWORK_DEVICES[d.id].z));return `<button data-place="room-${d.id}" ${known?'':'disabled'}>${known?`${d.safe?'':'⚠ '}${d.name}${d.id==='developer'?(codeAvailable(state)?' · Code':' · Guest key needed'):''}`:'Undiscovered device'}</button>`;}).join(''):''}<button data-place="gate" ${exploration.known(0,gateZ)?'':'disabled'}>Northern gateway · explore ↑</button></div><p class="panel-note">Tap a destination to travel there. Drag to take control.</p>`;
    const places={gate:{x:0,z:gateZ-3}};for(const d of content.areas[1].districts)places['room-'+d.id]=deviceApproach(d.id)||districtCenter(d);for(const [id,d] of Object.entries(NETWORK_DEVICES))places[id]={x:d.x,z:d.z+3};for(const e of emitters)places[e.id]={x:e.x,z:e.z+2.3};
    p.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>{closePanel();navigateTo(places[b.dataset.place]);});
  }else if(panel==='debug'){
    p.innerHTML=`<span class="eyebrow">DEBUG TOOLS</span><h2 id="panel-title">Choose a test starting point</h2><p>Test runs use a separate save. Your normal game stays untouched.</p><button class="primary" data-debug="sandbox">Fresh sandbox · one hose</button><button class="primary" data-debug="after-trial">After Data Trials · meet PATCH</button><button class="primary" data-debug="network">Start Local Network · sandbox complete</button><p>Vat, four hoses, maximum sandbox memory/range/decoding and analysis, Image Analyzer, 120 text / 60 image knowledge, 250 points, and expanded libraries. Network programs are still yours to earn.</p><button class="primary" data-debug="tools">Test all network tools</button><p>Also builds protection, cleaner, both agents and Auto Sort; gives 24 code knowledge and 1,000 points.</p><button class="primary" data-debug="repairs">Server repaired · build Web Bridge</button>${debugActive?'<a class="restart-button preview-link" href="'+location.pathname+'">Return to normal save ↗</a>':''}<button class="restart-button" id="back-pause">Back to pause</button>`;
    p.querySelectorAll('[data-debug]').forEach(b=>b.onclick=()=>{try{save();startDebug(normalStorage,b.dataset.debug);replacingSave=true;const url=new URL(location.href);url.searchParams.set('debug','1');location.assign(url.href);}catch{toast('Unable to create the debug save. Your current game is unchanged.');}});
    $('back-pause').onclick=()=>showPanel('pause');
  }else{
    p.innerHTML=`<span class="eyebrow">TAKE A BREATHER</span><h2 id="panel-title">Thoughts on pause.</h2><div class="knowledge-card"><strong>What Byte knows</strong><span>${$('knowledge-progress').textContent}</span><small>Saved knowledge unlocks upgrades. Processing points are yours to spend.</small></div><div class="knowledge-card"><strong>Carrying ${used(state)} / ${capacity(state)} KB</strong><span>${Object.keys(TYPES).filter(type=>state.cargo.some(item=>item.type===type)).map(type=>`${dataNames[type]} ${state.cargo.filter(item=>item.type===type).reduce((n,item)=>n+item.size,0)} KB`).join(' · ')||'Ready for data'}</span><small>${haulValue(state)} points after processing · Drop off at home.</small></div><details><summary>Controls & tips</summary><p>Drag to steer, tap the ground to move, or use WASD / arrow keys. Hoses collect nearby data automatically. Pinch to zoom.</p><p>Walk onto the home pad to unload, then explore while your analyzers work. Open assignments for your next task.</p></details><button class="restart-button" id="menu-sound">${soundOn?'Mute sound':'Enable sound'}</button><div class="menu-zoom" role="group" aria-label="Camera zoom settings"><button id="menu-zoom-out" aria-label="Zoom out">−</button><button id="menu-zoom-reset">Reset zoom</button><button id="menu-zoom-in" aria-label="Zoom in">+</button></div><p class="panel-note">Banked points and upgrades save on this device. Unbanked data is part of the current run.</p><button class="primary" id="resume">Keep thinking <span>↗</span></button><button class="restart-button" id="debug-tools">Debug tools</button><button class="restart-button" id="performance-toggle">${perf.visible?'Hide':'Show'} performance monitor</button>${['localhost','127.0.0.1'].includes(location.hostname)&&window.top===window?'<a class="restart-button preview-link" href="/preview.html">Phone & tablet preview ↗</a>':''}<button class="restart-button" id="restart">Restart from scratch</button>${hasRestartBackup(storage)?'<button class="restart-button" id="restore-run">Restore previous run</button>':''}`;
    const replaceRun=restore=>{try{replacingSave=true;if(restore)restoreProgress(storage);else restartProgress(storage,state);location.reload();}catch{replacingSave=false;toast('Could not save the new run. Your current game is still here.');}};
    $('menu-sound').onclick=()=>{$('sound').click();$('menu-sound').textContent=soundOn?'Mute sound':'Enable sound';};
    for(const id of ['in','out','reset'])$('menu-zoom-'+id).onclick=()=>$('zoom-'+id).click();
    $('debug-tools').onclick=()=>showPanel('debug');
    $('performance-toggle').onclick=()=>{perf.setEnabled(!perf.visible);$('performance-toggle').textContent=`${perf.visible?'Hide':'Show'} performance monitor`;};
    $('restart').onclick=()=>{p.innerHTML=`<span class="eyebrow">A FRESH LITTLE BRAIN</span><h2 id="panel-title">Start with one sprout?</h2><p>Start again with no upgrades, no knowledge, and one collector. Your current permanent progress and home processing queue will be kept as a backup. Carried data is not saved.</p><p>Grow up to four head sprouts, then earn the vat and build toward ten hoses.</p><button class="primary" id="confirm-restart">Start new game</button><button class="restart-button" id="cancel-restart">Keep this run</button>`;$('confirm-restart').onclick=()=>replaceRun(false);$('cancel-restart').onclick=renderPanel;$('cancel-restart').focus();};
    if($('restore-run'))$('restore-run').onclick=()=>replaceRun(true);
    $('resume').onclick=()=>{paused=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');closePanel();};
  }
}
$('panel-content').addEventListener('click',event=>{
  const actionButton=event.target.closest('[data-story-next],[data-story-begin],[data-story-go],[data-story-log]');
  if(actionButton){
    if(actionButton.hasAttribute('data-story-next')){const completed=advanceStory(state);save();if(completed==='guest'){world.burst(new THREE.Vector3(player.x,1,player.z),0xcaf3a2,24);toast('Guest key received! The shared-network gate is open.');}if(completed==='complete')toast('Shared Network complete! Open Web comes in a future chapter.');renderPanel();updateUI();$('panel').querySelector('[data-story-next], [data-story-begin], [data-story-go]')?.focus();}
    else if(actionButton.dataset.storyBegin){if(beginStory(state,actionButton.dataset.storyBegin)){save();renderPanel();}}
    else if(actionButton.hasAttribute('data-story-go'))goToStoryObjective();
    else openStoryLog();
    return;
  }
  const guideButton=event.target.closest('[data-code-guide]');if(guideButton){const guide=codeGuide(state);if(guide){closePanel();navigateTo(guide.destination);}return;}
  const button=event.target.closest('[data-chapter]');if(!button||button.disabled)return;
  const action=button.dataset.chapter;
  if(action==='trial'){if(startTrial(state))save();if(state.trial.started&&!trialPassed(state))showPanel('benchmark');}
  else if(action==='connect')claimVat();
  else if(buildProgram(state,action)){if(action==='photoSorter')world.burst(new THREE.Vector3(BASE_MACHINES.image.x,1.8,BASE_MACHINES.image.z),0xc9b8ff,20);obstacles.splice(0,obstacles.length,...solidObstacles(content,state.base));save();tone(850);toast(action==='photoSorter'?'Photo Sorter installed on the Image Analyzer! New image jobs run twice as fast. It is an optional speed upgrade.':'Auto Sort built! A second text and code worker is now running.');renderPanel();updateUI();}
});
function claimVat(){if(!unlock(state))return;save();closePanel();tone(800);toast('Animal Recognition learned! Vat equipped! Libraries gain 48 text / 96 image KB for the Local Network.');toast('Travel vat equipped! A real assignment is waiting at the Training Terminal.');navigateTo(STORY_SITES.terminal.approach);}
let zoomSaveTimer;
function changeZoom(value){
  state.zoom=world.setZoom(value);$('zoom-reset').textContent=Math.round(state.zoom*100)+'%';
  $('zoom-in').disabled=state.zoom>=MAX_ZOOM;$('zoom-out').disabled=state.zoom<=MIN_ZOOM;
  clearTimeout(zoomSaveTimer);zoomSaveTimer=setTimeout(save,300);
}
$('zoom-in').onclick=()=>changeZoom(world.getZoom()*1.2);
$('zoom-out').onclick=()=>changeZoom(world.getZoom()/1.2);
$('zoom-reset').onclick=()=>changeZoom(1);
changeZoom(state.zoom);
$('world').addEventListener('wheel',e=>{if(panel)return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?window.innerHeight:1);changeZoom(world.getZoom()*Math.exp(-delta*.0015));},{passive:false});
$('close-panel').onclick=()=>{if(panel==='pause'||panel==='debug'){paused=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');}closePanel();};
$('pause').onclick=()=>{if(panel)return;paused=true;$('pause').textContent='▷';$('pause').setAttribute('aria-label','Resume game');showPanel('pause');};
function openStoryLog(){if(paused)return;terminalMode=nearbyStorySite(state,player)==='terminal';showPanel('story',terminalMode?'terminal':null);}
function goToStoryObjective(){
  const q=storyObjective(state);
  if(state.story.active){openStoryLog();return;}
  if(q.message){if(beginStory(state,q.message)){save();terminalMode=false;showPanel('story');}return;}
  const near=nearbyStorySite(state,player);
  if(q.site&&near===q.site){if(q.site==='photos'||q.site==='archive'){closePanel();toast('Collect the nearby '+(q.site==='photos'?'cyan sound':'pink video')+' clips, then bring them home to analyze.');}else interactStory(near);return;}
  closePanel();if(q.destination)navigateTo(q.destination);
}
function interactStory(id){
  const event=siteEvent(state,id);terminalMode=id==='terminal';
  if(event){beginStory(state,event);save();showPanel('story',id);}
  else if(id==='home'){dockTab='base';showPanel('dock');}
  else if(id==='photos'||id==='archive'){toast('Download the nearby '+(id==='photos'?'cyan sound':'pink video')+' clips and drop them off at home.');}
  else if(id==='terminal'||id==='relay')showPanel('story',id);
  else toast(id==='infected'&&!state.programs.firewall?'Build a Malware Shield at home before reading this infected node.':id==='backup'&&!state.programs.cleaner?'Build a Malware Cleaner at home to recover this corrupted node.':'Follow your current assignment. This connection will be useful soon.');
}
$('assignments').onclick=openStoryLog;
$('mission-guide').onclick=goToStoryObjective;
$('story-interact').onclick=()=>{if(storySite&&!panel)interactStory(storySite);};
$('map').onclick=()=>{if(!panel)showPanel('map');};
$('sound').onclick=()=>{soundOn=!soundOn;$('sound').setAttribute('aria-label',soundOn?'Mute sound':'Enable sound');$('sound').style.color=soundOn?'#bbf5a4':'';tone();toast(soundOn?'Tiny thinking noises enabled.':'Sound off. Quiet thoughts.');};
$('base-status').onclick=()=>{dockTab='base';if(Math.hypot(player.x+3,player.z-5)<=2.1)showPanel('dock');else $('dock-guide').click();};
$('dock-guide').onclick=()=>{if(panel)return;if(atHomeDock(player)){dockTab='base';showPanel('dock');return;}returning=true;navigateTo({x:-3,z:5});toast('Heading home. Move to take control.');};
$('dock-action').onclick=()=>{if(Math.hypot(player.x+3,player.z-5)>2.1)return;dockTab='base';showPanel('dock');};
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(panel){$('close-panel').click();}else $('pause').click();return;}
  if(panel){if(e.key==='Tab'){const items=[...$('panel').querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden&&b.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
  if(e.key.toLowerCase()==='e'&&storySite){e.preventDefault();interactStory(storySite);return;}
  if(['+','=','-','0'].includes(e.key)){e.preventDefault();changeZoom(e.key==='0'?1:world.getZoom()*(e.key==='-'?1/1.2:1.2));return;}
  if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();keys.add(e.key);destination=null;route=[];returning=false;}
});
window.addEventListener('keyup',e=>keys.delete(e.key));
window.addEventListener('blur',clearInput);
window.addEventListener('orientationchange',()=>{clearInput();player.vx=0;player.vz=0;});
document.addEventListener('visibilitychange',()=>{clearInput();last=0;if(document.hidden)save();});
window.addEventListener('pagehide',save);
$('world').addEventListener('pointerdown',e=>{if(panel||paused)return;if(e.pointerType==='touch')touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touchPoints.size>=2){const [a,b]=[...touchPoints.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:world.getZoom()};pointer=null;joystick.hidden=true;destination=null;route=[];player.vx=player.vz=0;$('world').setPointerCapture(e.pointerId);return;}if(pinch)return;pointer={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,drag:false};$('world').setPointerCapture(e.pointerId);destination=null;route=[];returning=false;});
$('world').addEventListener('pointermove',e=>{if(touchPoints.has(e.pointerId))touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch){if(touchPoints.size>=2){const [a,b]=[...touchPoints.values()];changeZoom(pinchZoom(pinch.zoom,pinch.distance,Math.hypot(a.x-b.x,a.y-b.y)));}return;}if(!pointer||pointer.id!==e.pointerId)return;pointer.x=e.clientX;pointer.y=e.clientY;if(Math.hypot(pointer.x-pointer.sx,pointer.y-pointer.sy)>8)pointer.drag=true;if(pointer.drag){joystick.hidden=false;joystick.style.left=pointer.sx+'px';joystick.style.top=pointer.sy+'px';const dx=pointer.x-pointer.sx,dy=pointer.y-pointer.sy,m=Math.max(1,Math.hypot(dx,dy)/28);joystick.firstElementChild.style.transform=`translate(${dx/m}px,${dy/m}px)`;}});
$('world').addEventListener('pointerup',e=>{touchPoints.delete(e.pointerId);if(pinch){if(!touchPoints.size)pinch=null;pointer=null;joystick.hidden=true;return;}if(!pointer||pointer.id!==e.pointerId)return;if(!pointer.drag){const p=world.worldPoint(e.clientX,e.clientY);if(p)navigateTo({x:Math.max(layout.minX,Math.min(layout.maxX,p.x)),z:Math.max(layout.minZ,Math.min(layout.maxZ,p.z))});}clearInput();});
$('world').addEventListener('pointercancel',clearInput);
$('world').addEventListener('lostpointercapture',e=>{if(pointer?.id===e.pointerId)clearInput();});

function chapterShop(){
  const card=(title,detail,action,caption,enabled)=>`<div class="knowledge-card"><strong>${title}</strong><span>${detail}</span>${action?`<button class="primary" data-chapter="${action}" ${enabled?'':'disabled'}>${caption}</button>`:''}</div>`;
  if(!state.unlocked){
    if(trialPassed(state))return card('Animal Recognition passed!','Animal Recognition learned! Equip the travel vat, then visit the Training Terminal for your first real assignment.','connect','Equip travel vat',true);
    if(state.trial.started){const score=benchmarkScore(state.trial);return card('Data Trials · Cats & dogs',score.complete?`Last score: ${score.correct}/12. Practice pictures, words and paragraphs. Free retries.`:`${state.trial.answers.length}/12 sorted. Your answers are saved. Swipe left for cats, right for dogs.`,'trial',score.complete?'Retry Data Trials · Free':'Resume Data Trials',true);}
    return card('Earn your travel vat',`Text knowledge ${goalProgress(state.knowledge.text,CHAPTER.sandboxText)} · Image knowledge ${goalProgress(state.knowledge.image,CHAPTER.sandboxImages)}. Then swipe cat/dog pictures, words and paragraphs. Pass ${BENCHMARK.passScore}/12, with ${BENCHMARK.minimumPerKind}/4 in each category.`,'trial','Start Data Trials',sandboxReady(state));
  }
  let cards='';
  if(!state.base.photoSorter)cards+=card('Photo Sorter · Install on Image Analyzer',`Cats ${goalProgress(state.samples.cat,CHAPTER.photoGoal)} · Dogs ${goalProgress(state.samples.dog,CHAPTER.photoGoal)} analyzed and saved. ${!photoReady(state)&&storageCapacity(state,'image')-storageUsed(state,'image')<6?'IMAGE LIBRARY TOO FULL: new photos earn points but will not teach cats or dogs. Expand image storage, then collect more photos. ':''}${!state.base.imageMuncher?'Build the Image Analyzer first. ':''}Collect 6 KB photos at the Photo Library; leave library space to save them. ${state.points<CHAPTER.photoCost?`Need ${CHAPTER.photoCost-state.points} more points. `:''}Install on the Image Analyzer: pictures process 2× faster. Optional: no story, code, or agent unlock depends on this.`,'photoSorter',`Install Photo Sorter · ${CHAPTER.photoCost} ✦`,photoReady(state)&&state.points>=CHAPTER.photoCost);
  if(!state.base.autoSort)cards+=card('Vibe Lab · Auto Sort',`Developer Workstation ${state.network.developerVisited?'✓':'not visited'} · Routing ${goalProgress(state.samples.routing,CHAPTER.codeGoal)}. Build an optional second worker for text and code.`,'autoSort',`Build Auto Sort · ${CHAPTER.autoSortCost} ✦`,autoSortReady(state)&&state.points>=CHAPTER.autoSortCost);
  return cards||card('Your network workshop','Your optional processing upgrades are installed. Keep exploring and building.');
}
function codeGuideCard(){
  const guide=codeGuide(state);return guide?`<div class="knowledge-card"><strong>${guide.title}</strong><span>${guide.detail}</span><button class="primary" data-code-guide>${guide.action} ↗</button></div>`:'';
}
function networkShop(){
  const programs=Object.entries(PROGRAMS).map(([id,p])=>`<button class="upgrade" data-program="${id}"><span class="upgrade-copy"><strong>${p.name}</strong><span class="upgrade-effect">${p.detail}</span><span class="upgrade-level">Requires ${p.knowledge} code knowledge · knowledge stays</span><small></small></span><span class="upgrade-price">${state.programs[id]?'BUILT':p.cost+' ✦'}</span></button>`).join('');
  const rooms=content.areas[1].districts.filter(d=>d.safe&&d.id!=='router');
  return `<details class="network-workshop" open><summary>Network workshop · protection & agents</summary>${codeGuideCard()}<p>Each helper carries real files home; your analyzers turn them into points and knowledge.</p>${programs}${state.programs.courier?'<p id="courier-status"></p><button id="call-courier-home" class="restart-button">Call courier for pickup</button>':''}${state.programs.harvester?`<p id="harvester-status"></p><strong>Collector assignment</strong><div class="map-destinations">${rooms.map(d=>{const c=districtCenter(d),known=exploration.known(c.x,c.z);return `<button data-assignment="${d.id}" ${known?'':'disabled'} aria-pressed="${state.agents.harvester.assignment===d.id}">${known?d.name:'Explore to discover'}${state.agents.harvester.assignment===d.id?' ✓':''}</button>`;}).join('')}<button data-assignment="">Stop & bring data home</button></div>`:''}</details>`;
}
function baseShop(){
  return `${storyCard(state)}${state.story.done.email?`<div class="knowledge-card"><strong>Media server repairs</strong><span>Sound ${state.story.done.infected?'restored ✓':'offline'} · Local video ${state.story.done.backup?'restored ✓':'offline'}</span><small>${state.story.done.backup?'Missing decoder: source is outside the shared network.':'Learn sound and video, then use maintenance code to restore the server.'}</small></div>`:''}<p class="panel-note">Drop-off pad → Data sorter → Analyzers → Storage folders</p><div id="chapter-work">${chapterShop()}</div>${state.unlocked&&state.base.photoSorter?'<div class="knowledge-card"><strong>Photo Sorter · Installed ✓</strong><span>Installed on your Image Analyzer. Pictures process 2× faster. Code is available at the Developer Workstation.</span></div>':''}${state.unlocked?networkShop():''}<div id="base-work"></div>${STORAGE_TYPES.filter(type=>type==='text'||picturesUnlocked(state)).map(type=>`<button class="upgrade" data-storage="${type}"><span class="upgrade-copy"><strong>Expand ${type} library</strong><small>Make room for more ${type==='text'?'text examples':'pictures'}. Knowledge increases when new files are analyzed and saved.</small><span class="upgrade-effect" id="${type}-storage-effect"></span><small id="${type}-storage-hint"></small><span class="upgrade-level">Expansion ${state.base.storageLevels[type]} · Points only</span></span><span class="upgrade-price" id="${type}-storage-price"></span></button>`).join('')}<button class="upgrade" id="speed-upgrade"><span class="upgrade-copy"><strong>Faster analysis</strong><small>Process data faster with every analyzer. Earn points sooner; gain knowledge while the library has room.</small><span class="upgrade-effect" id="speed-effect"></span><span class="upgrade-level">Level ${state.base.speedLevel} of ${analyzerMaxLevel(state)}</span></span><span class="upgrade-price" id="speed-price"></span></button><button class="upgrade" id="build-muncher"><span class="upgrade-copy"><strong>Image Analyzer</strong><small>A faster picture lane. Your Starter Analyzer keeps working alongside it.</small><span class="upgrade-effect" id="image-unlock"></span></span><span class="upgrade-price">${state.base.imageMuncher?'BUILT':PROCESSING.imageMuncherCost+' ✦'}<small id="muncher-price-note"></small></span></button>`;
}
function machineRow(name,job,description){
  const progress=job?Math.round((1-job.remaining/job.duration)*100):0;
  return `<div class="machine-row"><div><strong>${name}</strong><span>${job?`${PROFILES[job.profile]?.name||dataNames[job.type]} · ${job.size} KB · ${Math.ceil(job.remaining/analyzerRate(state))}s · +${job.value} points · ${canRetain(state,job)?'+1 knowledge if saved':'points only · expand library'}`:'Ready for data'}</span></div><div class="machine-progress" role="progressbar" aria-label="${name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div><small>${description}</small></div>`;
}
function libraryRow(type){
  const space=storageCapacity(state,type),usedKB=storageUsed(state,type),free=space-usedKB,minimum=type==='image'&&state.unlocked?6:TYPES[type].size,blocked=free<minimum;
  const knowledge=state.knowledge[type],title=dataNames[type];
  const goal=type==='text'?(picturesUnlocked(state)?CHAPTER.sandboxText:PROCESSING.textKnowledgeGoal):CHAPTER.sandboxImages;
  const milestone=type==='text'&&!picturesUnlocked(state)?'Unlock images':'Travel vat';
  return `<section class="library-learning ${blocked?'library-full':''}" aria-label="${title} library"><div class="library-heading"><strong>${title} library</strong><span>${knowledge} knowledge</span></div><p>${knowledge} saved ${knowledge===1?'example':'examples'} · 1 knowledge each</p>${!state.unlocked?`<p class="library-goal">${milestone}: ${goalProgress(knowledge,goal)} ${type} knowledge</p>`:''}<div class="library-space"><span>Storage used</span><strong>${usedKB} / ${space} KB</strong></div><progress aria-label="${title} storage used" max="${space}" value="${usedKB}"></progress><small class="library-outcome">${blocked?`<strong>${type==='image'&&state.unlocked?'6 KB photo learning paused.':'Knowledge growth paused.'}</strong> ${free===0?'Library full.':`Only ${free} KB free; ${type==='image'&&state.unlocked?'a cat or dog photo':'a file'} needs ${minimum} KB.`} ${type==='image'&&state.unlocked&&!state.base.photoSorter?'Cat/dog photos that do not fit earn points, but do not count toward Photo Sorter. Expand the library, then collect and analyze more photos.':'New files still earn points. Expand this library to save more examples.'}`:`${free} KB free. Files that fit add +1 knowledge after analysis; files that do not fit earn points only.`}</small></section>`;
}
function updateBaseUI(){
  const summary=processingSummary(state);
  for(const type of STORAGE_TYPES){storageLabels[type].style.visibility=type==='image'&&!picturesUnlocked(state)?'hidden':'visible';storageLabels[type].innerHTML=`${type.toUpperCase()} LIBRARY<small>${storageUsed(state,type)} / ${storageCapacity(state,type)} KB saved${storageUsed(state,type)>=storageCapacity(state,type)?' · Full · points only':''}${type==='image'&&!picturesUnlocked(state)?' · Learn text first':''}</small>`;}
  $('base-status').textContent=`⌂ Home · ${summary.count?`${summary.count} at home · ${summary.value} ✦ pending`:'ready for data'} ↗`;
  for(const e of emitters)e.label.innerHTML=`${e.name.toUpperCase()}<small>${feedAvailable(state,e.type)?`${e.packetSize} KB · ${e.members.filter(c=>c.wait<=0).length>=e.members.length?"Feed full":`every ${e.interval}s`}`:e.type==='image'?`Learn text first · ${goalProgress(state.knowledge.text,PROCESSING.textKnowledgeGoal)}`:'Code is on the shared network'}</small>`;
  muncherLabel.innerHTML=`STARTER ANALYZER<small>${state.base.basic?`${dataNames[state.base.basic.type]} · ${Math.ceil(state.base.basic.remaining/analyzerRate(state))}s`:'Ready for data'}</small>`;
  imageMuncherLabel.style.visibility=picturesUnlocked(state)?'visible':'hidden';
  imageMuncherLabel.innerHTML=`IMAGE ANALYZER<small>${state.base.photoSorter?'Photo Sorter ✓ · 2× pictures':''}${state.base.photoSorter?'<br>':''}${!state.base.imageMuncher?'Build at home':state.base.image?`Picture · ${Math.ceil(state.base.image.remaining/analyzerRate(state))}s`:'Ready for pictures'}</small>`;
  extraLabel.style.visibility=state.base.autoSort?'visible':'hidden';
  for(const [id,d] of Object.entries(NETWORK_DEVICES))deviceLabels[id].innerHTML=`${d.name.toUpperCase()}<small>${id==='photos'?mediaUnlocked(state)?'Cat / dog pictures · Sound clips nearby':'Cat / dog pictures':id==='documents'?(state.story.done.email?'Repair request accepted ✓':'Unread email · Read nearby'):`CODE SOURCE · 3 KB snippets / 6 KB scripts`}</small>`;
  if($('chapter-work')){
    const container=$('chapter-work'),template=document.createElement('template');template.innerHTML=chapterShop();
    const nextCards=[...template.content.children],currentCards=[...container.children];
    if(nextCards.length!==currentCards.length)container.replaceChildren(...nextCards);
    else nextCards.forEach((next,i)=>{
      const current=currentCards[i];if(current.isEqualNode(next))return;
      const button=current.querySelector('button'),nextButton=next.querySelector('button');
      if(button&&nextButton&&button.dataset.chapter===nextButton.dataset.chapter){
        current.querySelector('strong').textContent=next.querySelector('strong').textContent;
        current.querySelector('span').textContent=next.querySelector('span').textContent;
        button.textContent=nextButton.textContent;button.disabled=nextButton.disabled;
      }else current.replaceWith(next);
    });
  }
  for(const el of document.querySelectorAll('[data-agent]')){const id=el.dataset.agent;el.style.visibility=state.programs[id]?'visible':'hidden';el.textContent=`${id==='courier'?'COURIER':'COLLECTOR'} · ${agentLoad(state.agents[id])}/${AGENT_CAPACITY[id]} KB`;}
  if(panel!=='dock')return;
  for(const b of document.querySelectorAll('[data-program]')){const id=b.dataset.program,missing=programRequirements(state,id);b.disabled=state.programs[id]||missing.length>0;b.querySelector('small').textContent=state.programs[id]?'Built ✓':missing.length?missing.join(' · '):'Ready to build';}
  for(const id of ['courier','harvester'])if($(id+'-status'))$(id+'-status').textContent=state.agents[id].status||'Ready at home';
  $('dock-points').textContent=state.points+' ✦';
  if($('base-work'))$('base-work').innerHTML=`<div class="queue-summary"><strong>${summary.count?`${summary.count} ${summary.count===1?'example':'examples'} to process`:'Your home is ready'}</strong><span>${summary.count?`${summary.types.text} text · ${summary.types.image} images${['code','audio','video'].filter(type=>summary.types[type]).map(type=>` · ${summary.types[type]} ${dataNames[type].toLowerCase()}`).join('')} · ${summary.value} ✦ after analysis${!state.base.imageMuncher&&summary.types.image?' · Starter Analyzer handles pictures too':''}`:'Drop off data to earn points. Files saved in a library also add knowledge.'}</span></div><div class="knowledge-card"><strong>How Byte learns</strong><span>Analyze a file → save it in the library → +1 knowledge</span><small>A 1 KB word and a 3 KB paragraph each teach 1 example. Bigger files use more space and earn more points, but still add just 1 knowledge.</small><small>When a file does not fit, it earns points only. Your existing knowledge stays.</small></div><div class="storage-summary">${STORAGE_TYPES.filter(type=>type==='text'||picturesUnlocked(state)).map(libraryRow).join('')}</div>${mediaUnlocked(state)?'<div class="knowledge-card"><strong>Media learning</strong><span>Sound and video clips use carried KB and are analyzed at home. The Starter Analyzer streams these lessons: each finished clip earns points and +1 knowledge, without using text or image library space.</span></div>':''}${machineRow('Starter Analyzer',state.base.basic,`Processes any data for free. Larger files take longer · ${analyzerRate(state)}× analysis speed.`)}${state.base.imageMuncher?machineRow('Image Analyzer',state.base.image,state.base.photoSorter?'Photo Sorter · new jobs run 2× faster.':'Pictures go here automatically.'):''}${state.base.autoSort?machineRow('Auto Sort',state.base.extra,'A second worker for text and code.'):''}`;
  document.querySelectorAll('[data-storage]').forEach(button=>{
    const type=button.dataset.storage,price=storageCost(state,type),capacityKB=storageCapacity(state,type);
    button.disabled=state.points<price;
    $(type+'-storage-effect').textContent=`+${STORAGE.upgradeKB} KB library space · ${capacityKB} → ${capacityKB+STORAGE.upgradeKB} KB`;
    $(type+'-storage-hint').textContent=`${state.knowledge[type]} knowledge stays. Expansion adds space, not knowledge. Next saved file: +1 knowledge.`;
    $(type+'-storage-price').innerHTML=`${price} ✦<small>${state.points<price?`Need ${price-state.points} more points`:'Points only'}</small>`;
  });
  if($('build-muncher')){
    const locked=!picturesUnlocked(state),built=state.base.imageMuncher;
    $('build-muncher').disabled=locked||built||state.points<PROCESSING.imageMuncherCost;
    $('muncher-price-note').textContent=locked?'Locked':!built&&state.points<PROCESSING.imageMuncherCost?`Need ${PROCESSING.imageMuncherCost-state.points} more`:'';
    $('image-unlock').textContent=locked?`Unlock at ${PROCESSING.textKnowledgeGoal} text knowledge · ${goalProgress(state.knowledge.text,PROCESSING.textKnowledgeGoal)}`:built?'Built! Pictures route here automatically.':`Pictures process ${(PROCESSING.secondsPerKB/PROCESSING.imageSecondsPerKB).toFixed(0)}× faster, alongside the Starter Analyzer.`;
    const maxed=state.base.speedLevel>=analyzerMaxLevel(state),price=analyzerSpeedCost(state);
    $('speed-upgrade').disabled=maxed||state.points<price;
    $('speed-effect').textContent=maxed?(state.unlocked?'Analyzers running at full speed':'Sandbox limit · Equip the vat for faster analysis'):`${analyzerRate(state)}× → ${analyzerRate(state)+.5}× speed · applies to current jobs too`;
    $('speed-price').innerHTML=maxed?(state.unlocked?'MAX':'VAT'):`${price} ✦${state.points<price?`<small>Need ${price-state.points} more</small>`:''}`;
  }
  document.querySelectorAll('[data-upgrade]').forEach(button=>{const id=button.dataset.upgrade,maxed=state.levels[id]>=maxLevel(id,state),locked=!upgradeUnlocked(state,id),price=cost(state,id);button.disabled=maxed||locked||state.points<price;const note=button.querySelector('.upgrade-price small');if(note)note.textContent=locked?'Locked':!maxed&&state.points<price?`Need ${price-state.points} more`:'';if(id==='parallel'&&!maxed)button.querySelector('.upgrade-effect').textContent=!state.unlocked&&state.levels.parallel>=3?'Four head sprouts grown. Equip the travel vat to add more hoses.':locked?`Unlocks after ${BALANCE.parallelTraining} lifetime processing points · ${goalProgress(state.total,BALANCE.parallelTraining)}`:`${connections(state)} → ${connections(state)+1} creatures at once · each downloads at full speed`;});
}
function updateUI(){
  updateBaseUI();
  $('knowledge-goal').textContent=state.unlocked?'KNOWLEDGE':picturesUnlocked(state)?'KNOWLEDGE → TRAVEL VAT':'KNOWLEDGE → UNLOCK IMAGES';
  $('knowledge-progress').textContent=!picturesUnlocked(state)?`Text ${goalProgress(state.knowledge.text,PROCESSING.textKnowledgeGoal)}`:!state.unlocked?`Text ${goalProgress(state.knowledge.text,CHAPTER.sandboxText)} · Images ${goalProgress(state.knowledge.image,CHAPTER.sandboxImages)}`:`Text ${state.knowledge.text} · Images ${state.knowledge.image}${codeAvailable(state)?` · Code ${state.knowledge.code}`:''}${mediaUnlocked(state)?` · Sound ${goalProgress(state.knowledge.audio,3)} · Video ${goalProgress(state.knowledge.video,3)}`:''}`;
  nearby=null;let nearest=4.5;
  for(const c of creatures){if(c.wait>0||c.zone!==state.zone||!c.view.group.visible)continue;const d=Math.hypot(c.x-player.x,c.z-player.z);if(d<nearest){nearest=d;nearby=c;}}
  nearbyLabel.style.visibility=nearby?'visible':'hidden';
  if(nearby){nearbyLabel.textContent=`${nearby.packetName||dataNames[nearby.type]} · ${nearby.packetSize??TYPES[nearby.type].size} KB${nearby.progress>0?' · '+Math.floor(nearby.progress*100)+'%':''}${PROFILES[nearby.profile]?.size?` · ${Math.ceil(PROFILES[nearby.profile].decode/(1+state.levels.decode*.4))}s · ${PROFILES[nearby.profile].value} points`:''}`;nearbyLabel.style.color='#'+TYPES[nearby.type].color.toString(16).padStart(6,'0');}
  const load=used(state),cap=capacity(state),lv=level(state);
  $('points').textContent=state.points;$('cargo').textContent=load;$('capacity').textContent=cap;
  $('context-fill').style.width=load/cap*100+'%';$('context-fill').style.background=load>=cap?'#efc68d':'#bbf5a4';
  const storageBlocked=state.cargo.some(item=>STORAGE_TYPES.includes(item.type)&&!canRetain(state,item));
  $('haul').textContent=storageBlocked?'Some data will earn points only · Expand its library to learn':noise(state)?`${noise(state)} KB noise · purge at the dock`:load?`${haulValue(state)} points to drop off`:'A little room for big ideas.';
  $('health-hud').hidden=!state.unlocked;$('health-value').textContent=Math.ceil(state.health)+' / 100';$('health-fill').style.width=state.health+'%';$('health-trail').style.width=state.health+'%';
  $('call-courier').hidden=!state.programs.courier;$('call-courier').disabled=state.agents.courier.requested||state.agents.courier.cargo.length>0||!state.cargo.some(c=>c.type!=='noise');$('call-courier').textContent=state.agents.courier.status&&state.agents.courier.mode!=='idle'?state.agents.courier.status:'Call courier · up to 24 KB';
  $('debug-badge').hidden=!debugActive;
  $('health').style.width=state.health+'%';$('health').style.background=state.health<35?'#ef9a9a':'#bbf5a4';
  $('stage').textContent=!state.unlocked?'STAGE 01 · SANDBOX BRAIN':lv>=5?'STAGE 03 · LEARNING':'STAGE 02 · PROTECTED';
  $('mood').textContent=noise(state)>0?'is confidently wrong.':state.health<40?'is mildly concerned.':load>=cap?'has a full brain.':load>0?'is thinking.':'is curious.';
  $('dock-action').hidden=Math.hypot(player.x+3,player.z-5)>2.1;
  $('dock-action').innerHTML='Build & upgrade at home <span>↗</span>';
  $('image-legend').hidden=!picturesUnlocked(state);
  $('image-legend').querySelector('span').textContent=state.zone?'6–12 KB':'2–12 KB';
  $('code-legend').querySelector('span').textContent='3–8 KB';
  $('image-kb').parentElement.hidden=!picturesUnlocked(state)&&!state.cargo.some(item=>item.type==='image');
  $('code-legend').hidden=!codeAvailable(state);
  $('code-kb').parentElement.hidden=!codeAvailable(state)&&!state.cargo.some(item=>item.type==='code');
  for(const type of Object.keys(dataNames))$(type+'-kb').textContent=state.cargo.filter(c=>c.type===type).reduce((sum,c)=>sum+c.size,0)+' KB';
  for(const type of ['audio','video']){ $(type+'-legend').hidden=!mediaUnlocked(state);$(type+'-kb').parentElement.hidden=!mediaUnlocked(state)&&!state.cargo.some(c=>c.type===type);}
  $('noise-summary').hidden=noise(state)===0;$('noise-summary').textContent=`Noise ${noise(state)} KB`;
  $('app').dataset.network=state.zone?'true':'false';
  const district=state.zone?districtAt(content,player.x,player.z):null;
  $('zone-title').textContent=district?.name||content.areas[state.zone].name;$('zone-number').textContent=state.zone?'LOCAL NETWORK · 02':'LOCAL COMPUTER · 01';
  $('zone-desc').textContent=state.zone?(district?.safe===false?'Danger: malware attacks; corrupted files fill context.':district?'Explore this device. Bring useful data home.':'Follow the corridors to discover more devices.'):'Safe training feeds inside your computer.';
  const objective=storyObjective(state),mission=[objective.title,objective.detail];
  if(!state.unlocked&&!terminalEvent(state)&&!trialPassed(state)){
    const blockedType=state.knowledge.text<CHAPTER.sandboxText&&storageCapacity(state,'text')-storageUsed(state,'text')<1?'text':picturesUnlocked(state)&&state.knowledge.image<CHAPTER.sandboxImages&&storageCapacity(state,'image')-storageUsed(state,'image')<2?'image':null;
    if(blockedType){mission[0]=`Expand your ${blockedType} library`;mission[1]=`Keep processing for points · ${storageCost(state,blockedType)} points buys more space at home`;}
  }
  $('mission-text').textContent=mission[0];$('mission-detail').textContent=mission[1];
  $('assignments').classList.toggle('has-message',!!state.story.active||!!terminalEvent(state)||storyEventAvailable(state,'lesson'));
  storySite=nearbyStorySite(state,player);
  $('story-interact').hidden=!!panel||!storySite;
  if(storySite){const event=siteEvent(state,storySite);const prompt=storySite==='terminal'?(terminalEvent(state)?'Training Terminal · New assignment ↗':'Training Terminal ↗'):event==='bridge'?'Assemble Web Bridge · 3 parts ✓':event==='complete'?'Connect Web Bridge ↗':event==='email'?'Read unread email ↗':event?(event==='infected'?'Repair ':event==='backup'?'Clean ':'Read ')+STORY_SITES[storySite].name+' ↗':storySite==='home'?'Build & upgrade at home ↗':STORY_SITES[storySite].name+' · Inspect';if($('story-interact').textContent!==prompt)$('story-interact').textContent=prompt;}
  for(const [id,el] of Object.entries(storyLabels))el.innerHTML=STORY_SITES[id].name.toUpperCase()+`<small>${id==='terminal'?(terminalEvent(state)?'New assignment ●':'Assignments · Help Board'):state.story.done[id]?'Recovered ✓':id==='relay'?(state.story.done.bridge?'Connector ready':'Web service · access required'):'Read nearby · E or tap'}</small>`;
  gateLabel.innerHTML=networkAccess(state)?'SHARED NETWORK<small>Guest key accepted ✓</small>':state.unlocked?'SHARED NETWORK<small>Guest key required · Visit Training Terminal</small>':'SHARED NETWORK<small>Travel vat + guest key required</small>';
  webLabel.innerHTML=state.story.done.complete?'OPEN WEB<small>Route found ✓ · Future chapter</small>':state.story.done.bridge?'WEB RELAY<small>Connector ready · Connect nearby</small>':'WEB RELAY<small>Open port · Build a connector</small>';
  if(panel==='story'&&!state.story.active){const signature=[terminalEvent(state),storyEventAvailable(state,'lesson'),sandboxReady(state)].join(':');if(signature!==storyPanelSignature){storyPanelSignature=signature;renderPanel();}}
  bossLabel.innerHTML=`${bossDef.name}<small>${Math.ceil(boss.hp)} integrity · ${boss.charge>0?'CHARGING':'keep moving'}</small>`;bossLabel.style.visibility=boss.alive?'':'hidden';
}

function step(dt){
  time+=dt;gateCooldown=Math.max(0,gateCooldown-dt);player.hurt=Math.max(0,player.hurt-dt);player.munch=Math.max(0,player.munch-dt);
  let dx=0,dz=0;
  if(pointer?.drag){dx=(pointer.x-pointer.sx)/45;dz=(pointer.y-pointer.sy)/45;}
  if(keys.has('a')||keys.has('ArrowLeft'))dx-=1;if(keys.has('d')||keys.has('ArrowRight'))dx+=1;if(keys.has('w')||keys.has('ArrowUp'))dz-=1;if(keys.has('s')||keys.has('ArrowDown'))dz+=1;
  ({x:dx,z:dz}=screenMovement(dx,dz));
  if(destination){dx=destination.x-player.x;dz=destination.z-player.z;if(Math.hypot(dx,dz)<.13){destination=route.shift()||null;if(!destination)returning=false;dx=0;dz=0;}}
  steerVelocity(player,dx,dz,dt,movementSpeed(state));
  if(player.vx||player.vz){let nx=Math.max(layout.minX,Math.min(layout.maxX,player.x+player.vx*dt)),nz=Math.max(layout.minZ,Math.min(layout.maxZ,player.z+player.vz*dt));
    if(nx===layout.minX||nx===layout.maxX)player.vx=0;if(nz===layout.minZ||nz===layout.maxZ)player.vz=0;
    if((player.z>gateZ&&nz<=gateZ+.8)||(player.z<gateZ&&nz>=gateZ-.8)){if(Math.abs(nx)>2.1){nz=player.z;player.vz=0;destination=null;route=[];returning=false;}else if(!networkAccess(state)){nz=Math.max(nz,gateZ+1.1);player.vz=0;destination=null;route=[];returning=false;if(gateCooldown===0)showPanel('gate');}}
    const resolved=moveWithCollisions(player,{x:nx,z:nz},obstacles,bodyRadius(state));
    if(Math.abs(resolved.x-nx)>.001)player.vx=0;
    if(Math.abs(resolved.z-nz)>.001)player.vz=0;
    player.x=resolved.x;player.z=resolved.z;
  }
  if(Math.hypot(player.x-revealX,player.z-revealZ)>.35||range(state)!==revealRange){revealRange=range(state);exploredDirty=exploration.reveal(player.x,player.z,Math.max(REVEAL_RADIUS,revealRange+1))||exploredDirty;revealX=player.x;revealZ=player.z;}
  explorationSaveTime+=dt;if(exploredDirty&&explorationSaveTime>=3){save();exploredDirty=false;explorationSaveTime=0;}
  state.zone=player.z<gateZ?1:0;if(state.zone&&!state.visited){state.visited=true;save();toast('Guest key accepted. PATCH: Check the Shared Inbox, east of the router.');}
  if(Math.hypot(player.x+3,player.z-5)<2)state.health=Math.min(100,state.health+dt*18);
  for(const [id,d] of Object.entries(NETWORK_DEVICES))if(Math.hypot(player.x-d.x,player.z-d.z)<4.5&&visitDevice(state,id)){save();toast(id==='photos'?'Photo Library found! Cat/dog pictures and sound clips live here.':'Code unlocked! Collect orange snippets and scripts, then drop them off. 6 code knowledge unlocks the Courier Agent.');}
  const targets=[];let occupiedConnections=0;
  for(const e of emitters){if(!feedAvailable(state,e.type))continue;const c=nextPipePacket(e,dt);if(c){c.x=e.x+random(-.1,.1);c.z=e.z+.85;c.angle=Math.PI/2+random(-.15,.15);c.wait=0;c.life=0;c.progress=0;c.view.group.visible=true;c.view.group.position.set(c.x,0,c.z);world.pulseEmitter(e.id);}}
  for(const c of creatures){
    if((c.zone===1&&!networkAccess(state))||!feedAvailable(state,c.type)){c.view.group.visible=false;continue;}
    if(c.wait<=0)c.view.group.visible=true;
    if(c.wait>0){c.wait-=dt;c.view.group.visible=c.wait<=0;continue;}
    if(c.emitter)c.life+=dt;
    const t=packetStats(c.type,c.packetSize,c.profile),bounds=c.habitat||content.areas[c.zone].bounds;let distance=Math.hypot(c.x-player.x,c.z-player.z);
    const active=!c.agentOwner&&!(c.corrupt&&state.programs.firewall&&!state.programs.cleaner)&&!atHomeDock(player)&&!(c.mimic&&state.levels.clarity>=3)&&c.zone===state.zone&&distance<range(state)&&used(state)+t.size<=capacity(state)&&occupiedConnections<connections(state);
    c.angle+=Math.sin(time*.6+c.phase)*dt*.7;
    const flee=c.rich&&c.type!=='text'&&distance<3.5;
    let vx=Math.cos(c.angle),vz=Math.sin(c.angle);
    if(flee){vx=(c.x-player.x)/Math.max(distance,.1);vz=(c.z-player.z)/Math.max(distance,.1);}
    const speed=(c.emitter&&c.life<.6?1.6:t.speed)*(active?.12:1);
    const next={x:c.x+vx*dt*speed,z:c.z+vz*dt*speed};
    const moved=(!c.emitter||c.life>.6)?moveWithCollisions(c,next,obstacles,PROFILES[c.profile]?.size ? .65 : .25):next;
    if(Math.hypot(moved.x-next.x,moved.z-next.z)>.001)c.angle+=Math.PI/2;
    c.x=moved.x;c.z=moved.z;
    if(c.x<bounds.minX||c.x>bounds.maxX){c.angle=Math.PI-c.angle;c.x=Math.max(bounds.minX,Math.min(bounds.maxX,c.x));}
    if(c.z<bounds.minZ||c.z>bounds.maxZ){c.angle=-c.angle;c.z=Math.max(bounds.minZ,Math.min(bounds.maxZ,c.z));}
    if(active){occupiedConnections++;c.progress+=dt*(1+state.levels.decode*.4)/t.decode;targets.push(c);if(c.progress>=1&&captureSpecimen(c,t)){if(c.corrupt)toast(state.programs.cleaner?`Cleaned corrupted data into ${t.size} useful code KB.`:'Corrupted file! It occupies context with noise. Home purges it; a Malware Shield prevents this.');if(c.mimic)toast('Hallucination! Context filled with noise. Upgrade Hallucination detection.');$('last-download').textContent=c.corrupt?(state.programs.cleaner?`Cleaned ${t.size} KB · ${cleanPacket(t).value} points after analysis`:`Corrupted data · ${t.size} KB noise · purged at home`):c.mimic?`Fake ${dataNames[c.type]} · +${t.size} KB noise · no reward`:`Downloaded ${c.packetName||dataNames[c.type]} · +${t.size} KB · ${t.value*(c.rich?2:1)} points`;world.completeDownload(c);player.munch=.32;world.absorb(new THREE.Vector3(c.x,.6,c.z),c.type);tone(420+used(state)*26);targets.pop();respawn(c);c.view.group.visible=false;if(used(state)>=capacity(state))toast('Context full. Time to digest at the server dock.');}}
    else c.progress=Math.max(0,c.progress-dt*.8);
    c.view.group.position.set(c.x,0,c.z);c.view.model.position.y=Math.sin(time*(c.type==='image'?5:3)+c.phase)*.08+(c.emitter?Math.max(0,1-c.life/.6)*.45:0);c.view.model.rotation.y=Math.sin(time+c.phase)*.3;c.view.model.rotation.z=active?Math.sin(time*19+c.phase)*.075:c.type==='audio'?Math.sin(time*4+c.phase)*.13:0;c.view.model.scale.setScalar((PROFILES[c.profile]?.scale??(1+(t.size/TYPES[c.type].size-1)*.25))*(1-Math.min(.6,c.progress*.5)));
    c.downloadHeight=c.view.model.position.y+.55*c.view.model.scale.y;
    c.view.tell.visible=c.corrupt||(!!c.mimic&&state.levels.clarity>=1);c.view.tell.scale.setScalar(state.levels.clarity>=2?1.2:.8);if(c.mimic&&state.levels.clarity>=1)c.view.model.rotation.z=Math.sin(time*18+c.phase)*(state.levels.clarity>=2?.18:.05);
    c.view.wings.forEach((w,i)=>w.rotation.y=Math.sin(time*15+c.phase)*.7*(i?1:-1));
  }
  const delivery=autoDropOff(state,player);
  if(delivery){world.deliverData(delivery.items);save();tone(700,.12);toast(delivery.value?`Dropped off ${delivery.count} examples! ${delivery.items.some(item=>!canRetain(state,item))?'Library space is limited: overflow earns points only.':'Home will analyze them while you explore.'}`:'Noise cleared. Ready for a fresh run.');}
  function hurt(amount){if(player.hurt>0)return;const damage=Math.min(state.health,malwareDamage(state,amount));state.health=Math.max(0,state.health-damage);damageFeedback.hit(damage,player,state.programs.firewall);player.hurt=1.2;tone(130,.15);world.burst(new THREE.Vector3(player.x,0,player.z),0xf0a4ae,8);if(state.health<=0){const lost=defeat(state);player.x=-3;player.z=5;player.vx=0;player.vz=0;destination=null;route=[];returning=false;save();toast(`Emergency reboot. Lost ${lost} carried points. Your upgrades are safe.`);}}
  for(const e of enemies){
    e.view.visible=networkAccess(state)&&e.wait<=0;if(!networkAccess(state))continue;
    if(e.wait>0){e.wait-=dt;continue;}
    const dist=Math.hypot(e.x-player.x,e.z-player.z),h=e.habitat;
    if(dist<5&&!state.programs.firewall&&!state.story.done.danger&&!state.story.active){beginStory(state,'danger');save();toast('PATCH sent a warning about malware. Open your assignment log to read it.');}
    let tx=e.homeX+Math.cos(time*.4+e.phase),tz=e.homeZ+Math.sin(time*.4+e.phase);
    const inside=player.x>h.minX&&player.x<h.maxX&&player.z>h.minZ&&player.z<h.maxZ;
    if(inside&&dist<e.detection){tx=player.x;tz=player.z;}
    const d=Math.hypot(tx-e.x,tz-e.z)||1;
    const p=moveWithCollisions(e,{x:e.x+(tx-e.x)/d*dt*e.speed,z:e.z+(tz-e.z)/d*dt*e.speed},obstacles,.4);
    e.x=Math.max(h.minX,Math.min(h.maxX,p.x));e.z=Math.max(h.minZ,Math.min(h.maxZ,p.z));
    e.view.position.set(e.x,Math.sin(time*4+e.phase)*.06,e.z);
    if(state.programs.cleaner&&dist<range(state)&&used(state)+6<=capacity(state)&&occupiedConnections<connections(state)){
      occupiedConnections++;e.progress+=dt*(1+state.levels.decode*.4)/18;targets.push(e);
      if(e.progress>=1){state.cargo.push({type:'code',size:6,value:60,profile:'cleaned'});state.collected++;world.completeDownload(e);world.absorb(new THREE.Vector3(e.x,.7,e.z),'code');targets.pop();e.wait=45;e.progress=0;e.x=e.homeX;e.z=e.homeZ;e.view.visible=false;toast('Malware cleaned! +6 useful code KB. Drop it off for analysis.');}
    }else e.progress=Math.max(0,e.progress-dt*.2);
    if(e.wait<=0&&dist<bodyRadius(state)+.45)hurt(e.damage);
  }
  if(boss.alive){const dist=Math.hypot(player.x-boss.x,player.z-boss.z);const phase=bossDef.phases.find(p=>boss.hp/bossDef.integrity>p.untilHealth)||bossDef.phases.at(-1);boss.timer-=dt;
    const chase=phase.behaviors.find(b=>b.type==='chase'),charge=phase.behaviors.find(b=>b.type==='charge');
    if(state.zone===1&&dist<8){
      if(charge&&boss.timer<=0&&dist>1.5){boss.charge=charge.duration;boss.dx=(player.x-boss.x)/dist;boss.dz=(player.z-boss.z)/dist;boss.timer=charge.interval;}
      if(boss.charge>0){boss.charge-=dt;boss.x+=boss.dx*charge.speed*dt;boss.z+=boss.dz*charge.speed*dt;}else if(chase&&dist>.1){boss.x+=(player.x-boss.x)/dist*chase.speed*dt;boss.z+=(player.z-boss.z)/dist*chase.speed*dt;}
      if(dist<range(state)&&occupiedConnections<connections(state)){occupiedConnections++;boss.hp-=dt*bossDef.decodeRate*(1+state.levels.decode*.4);boss.progress=Math.min(1,1-boss.hp/bossDef.integrity);if(boss.hp>0)targets.push(boss);}
      if(dist<1.3)hurt(bossDef.damage);
    }
    boss.x=Math.max(layout.hard.minX+1,Math.min(layout.hard.maxX-1,boss.x));boss.z=Math.max(layout.hard.minZ,Math.min(layout.hard.maxZ,boss.z));boss.view.position.set(boss.x,Math.sin(time*2)*.1,boss.z);
    if(boss.hp<=0){world.completeDownload(boss);boss.hp=0;boss.alive=false;state.stressPassed=true;boss.view.visible=false;state.points+=bossDef.reward;save();world.burst(new THREE.Vector3(boss.x,.5,boss.z),0xe5c1ff,36);toast(`Stress Test passed! +${bossDef.reward} processing points. Delicious firewall.`);tone(900,.3);}
  }
  return targets;
}
let targets=[];
function frame(ms){
  if(document.hidden){last=0;return;}
  const frameMs=last?ms-last:0,dt=Math.min(frameMs/1000,.05);last=ms;
  const measuring=perf.enabled,start=measuring?performance.now():0;
  if(!paused){
    agentSystem.update(dt,player);
    if(storyEventAvailable(state,'lesson')&&lastStoryNotice!=='lesson'){lastStoryNotice='lesson';save();toast('Sound and video basics learned! Your media analysis report is ready. Open your assignment log.');}
    const pending=state.base.queue.length||state.base.basic||state.base.image||state.base.extra;
    const earned=processBase(state,dt,(item,worker,retained)=>{
      world.storeData(item,worker,retained);
      if(!retained&&['cat','dog'].includes(item.profile)&&!state.base.photoSorter&&time-lastLearningWarning>8){lastLearningWarning=time;toast(`${item.profile==='cat'?'Cat':'Dog'} photo earned points, but wasn't learned: image library too full. Expand it, then collect more photos.`);}
    });processingSaveTime+=dt;
    if(earned){
      save();tone(540,.04);
      if(!pictureMilestoneSeen&&picturesUnlocked(state)){pictureMilestoneSeen=true;toast('Picture training unlocked! Drop pictures at home; the Starter Analyzer can process them too.');if(panel==='dock')renderPanel();}
    }else if((pending||state.programs.courier||state.programs.harvester)&&processingSaveTime>=1)save();
    if(processingSaveTime>=1)processingSaveTime=0;
    if(panel==='gate'&&earned)renderPanel();
  }
  if(!paused&&!panel)targets=step(dt);else targets=[];
  const logicEnd=measuring?performance.now():0;
  world.draw(player,targets,dt,time,destination,interactionDevice);
  damageFeedback.update(paused?0:dt,state.health,!!panel||!state.unlocked);
  const sceneEnd=measuring?performance.now():0,w=world.viewport.width;
  for(const l of labels){
    const position=l.pos(),p=world.project(position);
    l.el.style.left=p.x+'px';l.el.style.top=p.y+'px';
    const obscured=p.y<90||(w<=600?p.y<150:(p.x<330&&p.y<390));
    l.el.style.display=p.visible&&!obscured&&exploration.known(position.x,position.z)?'':'none';
  }
  for(const c of creatures)if(c.warning)c.warning.style.visibility=state.levels.clarity>=2&&c.wait<=0?'visible':'hidden';
  uiTime+=dt;if(uiTime>.1){updateUI();uiTime=0;}
  if(measuring)perf.record({frame:frameMs,logic:logicEnd-start,scene:sceneEnd-logicEnd,ui:performance.now()-sceneEnd},ms);
}
updateUI();world.renderer.setAnimationLoop(frame);
if(debugActive&&state.programs.harvester)for(const d of content.areas[1].districts){const p=districtCenter(d);exploration.reveal(p.x,p.z);}
if(content.fallback)toast('Using the bundled starter network.');
