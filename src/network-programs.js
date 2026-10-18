export const PROGRAMS={
  firewall:{name:'Malware Shield',knowledge:8,cost:100,detail:'Take 60% less malware damage. Skip corrupted files until you can clean them.'},
  cleaner:{name:'Malware Cleaner',knowledge:16,cost:180,requires:'firewall',detail:'Download malware and corrupted files as useful code KB. Drop them off for analysis.'},
  courier:{name:'Courier Agent',knowledge:6,cost:90,detail:'Call a courier to take up to 24 KB from Byte and deliver it home. Analysis still happens at base.'},
  harvester:{name:'Collector Agent',knowledge:14,cost:180,requires:'courier',detail:'Assign a discovered safe room. Collects up to 18 KB, then carries it home for analysis.'},
};
export const createPrograms=saved=>Object.fromEntries(Object.keys(PROGRAMS).map(id=>[id,saved?.[id]===true]));
export function programRequirements(state,id){
  const p=PROGRAMS[id];if(!p)return ['Unknown program'];
  const missing=[];
  if(!state.unlocked)missing.push('Earn the travel vat');
  if(state.knowledge.code<p.knowledge)missing.push(`Learn ${p.knowledge-state.knowledge.code} more code examples`);
  if(p.requires&&!state.programs[p.requires])missing.push(`Build ${PROGRAMS[p.requires].name}`);
  if(state.points<p.cost)missing.push(`Earn ${p.cost-state.points} more points`);
  return missing;
}
export function buyProgram(state,id){
  if(!PROGRAMS[id]||state.programs[id]||programRequirements(state,id).length)return false;
  state.points-=PROGRAMS[id].cost;state.programs[id]=true;return true;
}
export const malwareDamage=(state,amount)=>amount*(state.programs.firewall ? 0.4 : 1);
export function cleanPacket(item){
  return {type:'code',size:item.size,value:Math.max(item.value,10*item.size),profile:'cleaned'};
}
