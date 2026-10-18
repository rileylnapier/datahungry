import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,serialize,readSave,unlock,defeat,collect,bank} from '../src/state.js';
import {STORY_SITES,DIALOGUES,networkAccess,terminalEvent,beginStory,advanceStory,storyObjective,siteEvent,createStory} from '../src/story.js';
import {CHAPTER,startTrial,codeAvailable,buildProgram,visitDevice} from '../src/chapter.js';
import {benchmarkCard,answerBenchmark} from '../src/benchmark.js';
import {processBase,storageCapacity} from '../src/processing.js';
import {buyProgram} from '../src/network-programs.js';
import {solidObstacles,worldLayout} from '../src/world-layout.js';
import {planPath,overlapsCircle} from '../src/collision.js';
import starter from '../src/starter-content.js';
const finish=(s,id)=>{assert.equal(beginStory(s,id),true,`can start ${id}`);let result;for(let i=s.story.cursor;i<DIALOGUES[id].lines.length;i++)result=advanceStory(s);assert.equal(result,id);assert.equal(s.story.done[id],true);};
const reload=s=>readSave({getItem:()=>serialize(s)});

test('new run earns vat and guest key separately, dialogue resumes without early rewards',()=>{
  let s=createState();assert.equal(networkAccess(s),false);assert.equal(terminalEvent(s),'intro');
  assert.equal(beginStory(s,'guest'),false);finish(s,'intro');assert.equal(terminalEvent(s),null);
  s.knowledge.text=60;finish(s,'words');s.knowledge.text=CHAPTER.sandboxText;s.knowledge.image=CHAPTER.sandboxImages;finish(s,'pictures');
  assert.equal(startTrial(s),true);for(const id of s.trial.deck)answerBenchmark(s,id,benchmarkCard(id).answer);
  assert.equal(unlock(s),true);assert.equal(networkAccess(s),false);assert.equal(codeAvailable(s),false);
  finish(s,'assignment');finish(s,'search');assert.equal(beginStory(s,'guest'),true);advanceStory(s);
  s=reload(s);assert.equal(s.story.active,'guest');assert.equal(s.story.cursor,1);assert.equal(networkAccess(s),false);
  finish(s,'guest');assert.equal(networkAccess(s),true);assert.equal(codeAvailable(s),true);assert.equal(beginStory(s,'guest'),false);
  assert.equal(networkAccess(reload(s)),true);assert.equal(s.base.photoSorter,false);
});
test('media learning, code, repairs, and bridge form a complete quest without photo quotas',()=>{
  let s=createState({unlocked:true,points:600,levels:{capacity:5},base:{imageMuncher:true},knowledge:{text:120,image:60}});
  assert.equal(networkAccess(s),true);assert.equal(storyObjective(s).site,'inbox');
  s.base.libraryUsed.image=storageCapacity(s,'image');
  finish(s,'email');assert.equal(siteEvent(s,'developer'),null);
  for(let i=0;i<3;i++){assert.equal(collect(s,'audio'),true);assert.equal(collect(s,'video'),true);}
  bank(s);assert.equal(s.knowledge.audio,0);processBase(s,1);
  s=reload(s);defeat(s);assert.equal(s.story.done.email,true);
  processBase(s,100);assert.equal(s.knowledge.audio,3);assert.equal(s.knowledge.video,3);
  finish(s,'lesson');finish(s,'developer');assert.equal(siteEvent(s,'infected'),null);
  for(let i=0;i<8;i++)collect(s,'code',false,3,'routing');bank(s);processBase(s,100);
  assert.equal(s.knowledge.code,8);assert.equal(buyProgram(s,'firewall'),true);finish(s,'infected');assert.equal(siteEvent(s,'backup'),null);
  for(let i=0;i<8;i++)collect(s,'code',false,3,'routing');bank(s);processBase(s,100);
  assert.equal(buyProgram(s,'cleaner'),true);finish(s,'backup');assert.equal(beginStory(s,'bridge'),false);
  finish(s,'firewall');const before=s.points;s=reload(s);finish(s,'bridge');assert.equal(s.points,before);finish(s,'complete');
  assert.equal(s.base.photoSorter,false);assert.equal(s.samples.cat,0);assert.equal(s.samples.dog,0);
  assert.match(storyObjective(reload(s)).title,/complete/);assert.equal(beginStory(s,'complete'),false);
});
test('all story approaches are reachable and clear for the largest vat',()=>{
  const obstacles=solidObstacles(starter,{imageMuncher:true,autoSort:true}),layout=worldLayout(starter),r=1.54;
  for(const [id,site] of Object.entries(STORY_SITES)){
    const p=site.approach;assert.ok(Math.hypot(p.x-site.x,p.z-site.z)<4.5,id+' interaction radius');
    assert.ok(!obstacles.some(b=>overlapsCircle(p,b,r)),id+' clear destination');
    const path=planPath({x:0,z:id==='terminal'||id==='home'?3:-44},p,layout,obstacles,r);
    assert.ok(path.length,id+' path exists');assert.deepEqual(path.at(-1),p);
  }
});
test('old saves keep access, new vat saves stay locked on reload, and malformed dialogue is bounded',()=>{
  assert.equal(networkAccess(createState({unlocked:true})),true);
  const fresh=createState();fresh.unlocked=true;assert.equal(networkAccess(reload(fresh)),false);
  const bad=createStory({version:2,active:'guest',cursor:9999});assert.equal(bad.cursor,DIALOGUES.guest.lines.length-1);
  assert.equal(createStory({active:'not-a-dialogue',done:{guest:'true'}}).done.guest,false);
  assert.equal(createStory({active:'not-a-dialogue'}).active,null);
});
test('optional Auto Sort no longer depends on Photo Sorter',()=>{
  const s=createState({unlocked:true,points:80,samples:{routing:8}});visitDevice(s,'developer');
  assert.equal(s.base.photoSorter,false);assert.equal(buildProgram(s,'autoSort'),true);
});

test('old story previews keep their guest key but restart the revised repair quest',()=>{
  const old=createState({unlocked:true,story:{version:1,done:{guest:true,intro:true,photo:true,clue:true,complete:true},active:'photo'}});
  assert.equal(networkAccess(old),true);assert.equal(old.story.active,null);assert.equal(old.story.done.complete,false);assert.equal(old.story.done.email,false);
  assert.equal(createStory({version:2,active:'constructor'}).active,null);
});


test('malware warning gives an early shield goal and does not interrupt protected players',()=>{
  const s=createState({unlocked:true});finish(s,'email');finish(s,'danger');
  assert.equal(storyObjective(s).site,'developer');
  s.knowledge.code=8;assert.equal(storyObjective(s).site,'home');
  s.points=100;assert.equal(buyProgram(s,'firewall'),true);
  assert.equal(storyObjective(s).site,'photos');
  const protectedState=createState({unlocked:true,programs:{firewall:true}});
  assert.equal(beginStory(protectedState,'danger'),false);
});
