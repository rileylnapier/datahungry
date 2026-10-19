import {DIALOGUES} from './story-dialogue.js';
import {PROCESSING,picturesUnlocked,storageCapacity,storageUsed,storageCost} from './processing.js';
import {goalProgress} from './goal-progress.js';
import {CHAPTER,sandboxReady,trialPassed} from './chapter.js';
import {PROGRAMS} from './network-programs.js';

// Story items live outside cargo/libraries. They cannot be recycled or lost on defeat.
export const STORY_SITES={
  terminal:{name:'Training Terminal',x:4,z:0,approach:{x:4,z:3},color:0xcaf3a2},
  photos:{name:'Sound clips',x:-24,z:-42,approach:{x:-24,z:-46}},
  inbox:{name:'Shared Inbox',x:24,z:-42,approach:{x:24,z:-46}},
  archive:{name:'Video clips',x:24,z:-76,approach:{x:24,z:-73}},
  firewall:{name:'Firewall console',x:5.5,z:-40,approach:{x:5.5,z:-43}},
  developer:{name:'Maintenance node · Server tools',x:-6,z:-68,approach:{x:-6,z:-72}},
  infected:{name:'Media server · Sound service',x:-26,z:-84,approach:{x:-26,z:-81},color:0xf3b77f},
  backup:{name:'Backup · Video index',x:7,z:-105,approach:{x:7,z:-102},color:0xf3b77f},
  relay:{name:'Web relay · Open port',x:0,z:-109,approach:{x:0,z:-106},color:0x86cdd5},
  home:{name:'Byte’s Home',x:-3,z:5,approach:{x:-3,z:5}},
};
export const STORY_NODES=['developer','infected','backup'];
export {DIALOGUES} from './story-dialogue.js';
const flags=Object.keys(DIALOGUES);
export const MEDIA_GOAL=3;
export const mediaReady=s=>s.knowledge.audio>=MEDIA_GOAL&&s.knowledge.video>=MEDIA_GOAL;
export function createStory(saved,legacyUnlocked=false){
  const legacy=!saved&&legacyUnlocked,done=Object.fromEntries(flags.map(id=>[id,legacy&&['intro','words','pictures','assignment','search','guest'].includes(id)||saved?.done?.[id]===true]));
  // Earlier prototype's dog quest is replaced; retain the earned key and hardware.
  if(saved&&saved.version!==2){
    for(const id of ['email','lesson','developer','infected','backup','firewall','bridge','complete'])done[id]=false;
  }
  const active=saved?.version===2&&Object.hasOwn(DIALOGUES,saved?.active)&&!done[saved.active]?saved.active:null;
  return {version:2,done,active,cursor:active?Math.max(0,Math.min(DIALOGUES[active].lines.length-1,Number.isInteger(saved?.cursor)?saved.cursor:0)):0};
}
export const networkAccess=s=>s.unlocked&&s.story.done.guest;
export function terminalEvent(s){
  const d=s.story.done;
  if(!d.intro)return 'intro';
  if(!d.words&&s.knowledge.text>=PROCESSING.textKnowledgeGoal)return 'words';
  if(!d.pictures&&sandboxReady(s))return 'pictures';
  if((trialPassed(s)||s.unlocked)&&!d.assignment)return 'assignment';
  if(d.assignment&&!d.search)return 'search';
  if(d.search&&!d.guest)return 'guest';
  return null;
}
export function storyEventAvailable(s,id){
  const d=s.story.done;if(d[id]||!Object.hasOwn(DIALOGUES,id))return false;
  if(['intro','words','pictures','assignment','search','guest'].includes(id))return terminalEvent(s)===id;
  if(!networkAccess(s))return false;
  return ({email:true,lesson:d.email&&mediaReady(s),developer:d.lesson,danger:!s.programs.firewall,infected:d.developer&&s.programs.firewall,backup:d.infected&&s.programs.cleaner,firewall:d.backup,bridge:d.firewall,complete:d.bridge})[id]===true;
}
export function beginStory(s,id){
  if(s.story.active)return s.story.active===id;
  if(!storyEventAvailable(s,id))return false;
  s.story.active=id;s.story.cursor=0;return true;
}
export function advanceStory(s){
  const id=s.story.active;if(!id)return null;
  if(++s.story.cursor<DIALOGUES[id].lines.length)return null;
  s.story.done[id]=true;s.story.active=null;s.story.cursor=0;return id;
}
export function siteEvent(s,id){
  if(id==='terminal')return terminalEvent(s);
  const event={inbox:'email',firewall:'firewall',developer:'developer',infected:'infected',backup:'backup',home:'bridge',relay:'complete'}[id];
  return event&&storyEventAvailable(s,event)?event:null;
}
export function nearbyStorySite(s,p){
  return Object.entries(STORY_SITES).filter(([id])=>id==='terminal'||id==='home'||networkAccess(s)).filter(([id,site])=>Math.hypot(p.x-site.x,p.z-site.z)<(id==='home'?2.2:4.5)).sort((a,b)=>Math.hypot(p.x-a[1].x,p.z-a[1].z)-Math.hypot(p.x-b[1].x,p.z-b[1].z))[0]?.[0]??null;
}
export function storyObjective(s){
  const d=s.story.done,at=(title,detail,site)=>({title,detail,destination:STORY_SITES[site]?.approach,site});
  if(!d.intro)return at('Visit the Training Terminal','Your first assignment is waiting beside home.','terminal');
  if(terminalEvent(s))return at(terminalEvent(s)==='guest'?'Read PATCH’s reply':'New assignment at the terminal','Visit the Training Terminal beside home.','terminal');
  if(!s.unlocked){
    if(trialPassed(s))return at('Equip your travel vat','Protection for outside the sandbox · equip PATCH’s vat at home.','home');
    if(sandboxReady(s)||s.trial.started)return at('Start Data Trials','Cats left · dogs right · open Home or the Training Terminal.','terminal');
    const blocked= s.knowledge.text<CHAPTER.sandboxText&&storageCapacity(s,'text')-storageUsed(s,'text')<1?'text':picturesUnlocked(s)&&s.knowledge.image<CHAPTER.sandboxImages&&storageCapacity(s,'image')-storageUsed(s,'image')<2?'image':null;
    if(blocked)return at(`Expand your ${blocked} library`,`Keep processing for points · ${storageCost(s,blocked)} points buys more space at home.`,'home');
    if(s.knowledge.text<PROCESSING.textKnowledgeGoal)return {title:'First words',detail:`Save text examples: ${s.knowledge.text}/${PROCESSING.textKnowledgeGoal} · drop off at home.`,destination:{x:-12,z:-5}};
    return {title:'Picture practice',detail:`Text ${s.knowledge.text>=CHAPTER.sandboxText?'✓':s.knowledge.text+'/'+CHAPTER.sandboxText} · Images ${s.knowledge.image>=CHAPTER.sandboxImages?'✓':s.knowledge.image+'/'+CHAPTER.sandboxImages} knowledge · analyze and save.`,destination:s.knowledge.image<CHAPTER.sandboxImages?{x:6,z:-4}:{x:-12,z:-5}};
  }
  if(!d.email)return at('Read the unread email','Shared Inbox · east of the router. Someone needs help.','inbox');
  if(!mediaReady(s)&&!d.lesson){
    if(d.danger&&!s.programs.firewall)return at('Build a Malware Shield',`Learn ${goalProgress(s.knowledge.code,8)} code examples · 100 points at home. Return to media learning once protected.`,s.knowledge.code<8?'developer':'home');
    const type=s.knowledge.audio<MEDIA_GOAL?'audio':'video',site=type==='audio'?'photos':'archive';
    return at(`Learn how the world ${type==='audio'?'sounds':'moves'}`,`Sound ${goalProgress(s.knowledge.audio,MEDIA_GOAL)} · Video ${goalProgress(s.knowledge.video,MEDIA_GOAL)} analyzed. Collect clips, then drop them at home.`,site);
  }
  if(!d.lesson)return {title:'Read your media analysis',detail:'Sound and movement basics learned ✓ · open the report.',message:'lesson'};
  if(!d.developer)return at('Find maintenance code','Read the node at the Developer Workstation.','developer');
  const programGoal=id=>at(`Build ${PROGRAMS[id].name}`,`Home workshop · ${goalProgress(s.knowledge.code,PROGRAMS[id].knowledge)} code knowledge · ${PROGRAMS[id].cost} points. Safe code: Developer Workstation.`,s.knowledge.code<PROGRAMS[id].knowledge?'developer':'home');
  if(!s.programs.firewall)return programGoal('firewall');
  if(!d.infected)return at('Repair the media server','Shield ready ✓ · connect to the Infected Computer’s sound service.','infected');
  if(!s.programs.cleaner)return programGoal('cleaner');
  if(!d.backup)return at('Recover the video index','Cleaner ready ✓ · clean the copy in the Corrupted Backup.','backup');
  if(!d.firewall)return at('Find the missing decoder','Check the firewall console · the support server is outside.','firewall');
  if(!d.bridge)return at('Build the Web Bridge','Connector components recovered ✓ · assemble at home, no extra cost.','home');
  if(!d.complete)return at('Connect to the open port','Use the Web Bridge at the northern web relay.','relay');
  return at('Shared Network complete ✓','Sound and local video repaired ✓ · the missing decoder awaits in the future Open Web chapter.','relay');
}
