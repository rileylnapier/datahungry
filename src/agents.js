import {validItem} from './processing.js';
import {planPath,moveWithCollisions} from './collision.js';
import {routeThroughGate} from './world-layout.js';
import {districtAt} from './network-layout.js';
export const AGENT_CAPACITY={courier:24,harvester:18};
export const agentLoad=agent=>agent.cargo.reduce((n,c)=>n+c.size,0);
const home={x:-3,z:3};
const parking={courier:{x:-5.5,z:1},harvester:{x:-.5,z:1}};
export function createAgents(saved){
  return Object.fromEntries(Object.keys(AGENT_CAPACITY).map(id=>{
    const data=saved?.[id],cargo=[];let load=0;
    for(const item of Array.isArray(data?.cargo)?data.cargo:[]){if(validItem(item)&&load+item.size<=AGENT_CAPACITY[id]){cargo.push({...item});load+=item.size;}}
    return [id,{x:Number.isFinite(data?.x)?Math.max(-36,Math.min(36,data.x)):parking[id].x,z:Number.isFinite(data?.z)?Math.max(-112,Math.min(14,data.z)):parking[id].z,cargo,assignment:typeof data?.assignment==='string'?data.assignment:null,requested:data?.requested===true,mode:cargo.length?'return':'idle'}];
  }));
}
export const saveAgents=agents=>Object.fromEntries(Object.entries(agents).map(([id,a])=>[id,{x:a.x,z:a.z,cargo:a.cargo,assignment:a.assignment,requested:a.requested}]));
export function requestCourier(state){
  const a=state.agents.courier;
  if(!state.programs.courier||a.mode==='return'||a.cargo.length||!state.cargo.some(validItem))return false;
  a.requested=true;return true;
}
export function assignCollector(state,id,content,known){
  if(!state.programs.harvester)return false;
  const d=content.areas[1].districts.find(d=>d.id===id);
  if(id!==null&&(!d||!d.safe||d.id==='router'||!known((d.bounds.minX+d.bounds.maxX)/2,(d.bounds.minZ+d.bounds.maxZ)/2)))return false;
  const a=state.agents.harvester;if(a.assignment!==id&&a.cargo.length)a.mode='return';
  a.assignment=id;return true;
}

export function createAgentSystem(state,{content,layout,obstacles,creatures,packetStats,respawn,onDelivery=()=>{},onChange=()=>{}}){
  const runtimes={courier:{route:[],timer:0},harvester:{route:[],timer:0,target:null,progress:0}};
  const release=()=>{const r=runtimes.harvester;if(r.target)r.target.agentOwner=false;r.target=null;r.progress=0;state.agents.harvester.targetPosition=null;};
  function move(id,goal,dt){
    const a=state.agents[id],r=runtimes[id];
    if(Math.hypot(a.x-goal.x,a.z-goal.z)<.8)return true;
    r.timer-=dt;
    if(r.timer<=0&&(!r.goal||Math.hypot(r.goal.x-goal.x,r.goal.z-goal.z)>2||!r.route.length)){
      r.timer=2;r.goal={...goal};r.route=[];let start=a;
      for(const waypoint of routeThroughGate(a,goal,layout.gateZ)){
        const segment=planPath(start,waypoint,layout,obstacles,.38);
        if(!segment.length){r.route=[];a.status='Route blocked';return false;}
        r.route.push(...segment);start=segment.at(-1);
      }
    }
    let distance=dt*(id==='courier'?7:5);
    while(distance>0&&r.route.length){
      const next=r.route[0],d=Math.hypot(next.x-a.x,next.z-a.z),step=Math.min(distance,d);
      if(d<.05){r.route.shift();continue;}
      a.heading=Math.atan2(next.x-a.x,next.z-a.z);
      const resolved=moveWithCollisions(a,{x:a.x+(next.x-a.x)/d*step,z:a.z+(next.z-a.z)/d*step},obstacles,.38);
      a.x=resolved.x;a.z=resolved.z;distance-=step;
      if(step===d)r.route.shift();
    }
    return Math.hypot(a.x-goal.x,a.z-goal.z)<.8;
  }
  function deliver(id,dt){
    const a=state.agents[id];a.mode='return';a.status=`Delivering ${agentLoad(a)} KB`;
    if(!move(id,home,dt))return;
    const items=a.cargo.splice(0);state.base.queue.push(...items);state.banks++;
    a.mode='idle';runtimes[id].route=[];runtimes[id].timer=0;
    onDelivery(items,id);onChange();
  }
  return {update(dt,player){
    if(!state.unlocked||!Number.isFinite(dt)||dt<=0)return;
    const courier=state.agents.courier;
    if(state.programs.courier){
      if(courier.cargo.length)deliver('courier',dt);
      else if(courier.requested){
        if(districtAt(content,player.x,player.z)?.safe===false&&!state.programs.firewall)courier.status='Meet on safe ground';
        else{
          courier.mode='meet';courier.status='Coming to Byte';
          if(move('courier',player,dt)){
            let load=0;
            state.cargo=state.cargo.filter(item=>{if(!validItem(item)||load+item.size>AGENT_CAPACITY.courier)return true;courier.cargo.push({...item});load+=item.size;return false;});
            courier.requested=false;courier.mode=load?'return':'idle';runtimes.courier.timer=0;runtimes.courier.route=[];onChange();
          }
        }
      }else {courier.mode='idle';courier.status='Ready · call for pickup';move('courier',parking.courier,dt);}
    }
    if(!state.programs.harvester)return;
    const a=state.agents.harvester,r=runtimes.harvester,room=content.areas[1].districts.find(d=>d.id===a.assignment&&d.safe);
    if(a.mode==='return'||!room){release();if(a.cargo.length)deliver('harvester',dt);else {a.mode='idle';a.status='Choose a safe room';move('harvester',parking.harvester,dt);}return;}
    a.mode='harvest';a.status=`Harvesting · ${room.name}`;
    const available=c=>c.wait<=0&&!c.mimic&&!c.malware&&!c.progress&&c.zone===1&&!c.corrupt&&districtAt(content,c.x,c.z)?.id===room.id&&agentLoad(a)+packetStats(c.type,c.packetSize,c.profile).size<=AGENT_CAPACITY.harvester&&(c.type!=='code'||state.network.developerVisited);
    if(r.target&&!available(r.target))release();
    if(!r.target){r.target=creatures.filter(available).sort((c,d)=>Math.hypot(c.x-a.x,c.z-a.z)-Math.hypot(d.x-a.x,d.z-a.z))[0];r.progress=0;}
    if(!r.target){
      if(a.cargo.length)deliver('harvester',dt);
      else {a.status='Waiting for data';move('harvester',{x:(room.bounds.minX+room.bounds.maxX)/2,z:(room.bounds.minZ+room.bounds.maxZ)/2},dt);}
      return;
    }
    const c=r.target;
    if(!move('harvester',c,dt)){c.agentOwner=false;a.targetPosition=null;return;}
    c.agentOwner=true;a.targetPosition={x:c.x,z:c.z};
    const stats=packetStats(c.type,c.packetSize,c.profile);r.progress+=dt/Math.max(1,stats.decode*1.5);
    a.status=`Downloading ${Math.floor(Math.min(1,r.progress)*100)}% · ${room.name}`;
    if(r.progress>=1){
      a.cargo.push({type:c.type,size:stats.size,value:stats.value,...(c.profile?{profile:c.profile}:{})});
      respawn(c);c.view&&(c.view.group.visible=false);release();onChange();
      if(agentLoad(a)>=AGENT_CAPACITY.harvester)a.mode='return';
    }
  }};
}
