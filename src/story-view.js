import {trialPassed} from './chapter.js';
import {goalProgress} from './goal-progress.js';
import {DIALOGUES,storyObjective,terminalEvent,storyEventAvailable,MEDIA_GOAL} from './story.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function storyCard(s,actions=true){
  const q=storyObjective(s);
  return `<div class="knowledge-card story-assignment"><small>ACTIVE ASSIGNMENT</small><strong>${escape(q.title)}</strong><span>${escape(q.detail)}</span>${actions?'<button class="primary" data-story-go>Go to objective ↗</button><button class="restart-button" data-story-log>Assignments & Help Board ↗</button>':''}</div>`;
}
function storyInventory(s){
  const d=s.story.done,items=[];
  if(d.guest)items.push('Guest key ✓');
  if(d.email)items.push(`Media lessons · Sound ${goalProgress(s.knowledge.audio,MEDIA_GOAL)} · Video ${goalProgress(s.knowledge.video,MEDIA_GOAL)}`);
  if(d.developer)items.push('Server tools recovered ✓');
  if(d.lesson)items.push(`Server sound ${d.infected?'restored ✓':'needs repair'}`);
  if(d.infected)items.push(`Video index ${d.backup?'restored ✓':'needs recovery'}`);
  if(d.firewall)items.push(`Web Bridge ${d.bridge?'assembled ✓':'parts ready · assemble at home'}`);
  return items.length?`<div class="story-inventory"><strong>Your discoveries · saved</strong>${items.map(item=>`<span>${escape(item)}</span>`).join('')}</div>`:'';
}
export function renderStory(s,atTerminal=false){
  const active=s.story.active;
  if(active){
    const dialogue=DIALOGUES[active],current=dialogue.lines[s.story.cursor],last=s.story.cursor===dialogue.lines.length-1;
    return `<div class="story-reader"><span class="eyebrow">${current.speaker==='PATCH'?'HELP BOARD · REPLY RECEIVED':'TRAINING CONNECTION · ONLINE'}</span><h2 id="panel-title">${escape(dialogue.title)}</h2>${active==='email'?'<div class="mail-reference"><span aria-hidden="true">✉</span><div><strong>UNREAD · SHARED INBOX</strong><p>The videos won’t open</p></div></div>':''}<div class="story-message ${current.speaker==='BYTE'?'byte-message':''}"><span class="story-avatar" aria-hidden="true">${current.speaker==='BYTE'?'◉':current.speaker==='PATCH'?'P':'⌁'}</span><div><strong>${escape(current.speaker)}</strong><p>${escape(current.text)}</p></div></div><div class="story-pagination"><span>${s.story.cursor+1} / ${dialogue.lines.length}</span><small>Close anytime · your place is saved</small></div><button class="primary" data-story-next>${escape(last?dialogue.button:'Continue')} <span>→</span></button></div>`;
  }
  const q=storyObjective(s),event=atTerminal?terminalEvent(s):null,lesson=storyEventAvailable(s,'lesson');
  const completed=Object.entries(DIALOGUES).filter(([id])=>s.story.done[id]);
  return `<span class="eyebrow">${atTerminal?'TRAINING TERMINAL':'BYTE’S ASSIGNMENT LOG'}</span><h2 id="panel-title">A little brain. A real assignment.</h2>${storyCard(s,false)}${event?`<button class="primary" data-story-begin="${event}">${event==='guest'?'Read PATCH’s reply':event==='search'?'Open the Help Board':'Read assignment'} →</button>`:lesson?'<button class="primary" data-story-begin="lesson">Read media analysis →</button>':`<button class="primary" data-story-go>${q.destination?'Go to objective':'Keep exploring'} ↗</button>`}${atTerminal&&!s.unlocked&&!trialPassed(s)?' <div class="story-trial" id="story-trial"></div>':''}${storyInventory(s)}<details class="story-history"><summary>Assignment history${s.story.done.search?' & Help Board':''} · ${completed.length} ${completed.length===1?'entry':'entries'}</summary>${completed.map(([id,d])=>`<article><h3>${escape(d.title)} ✓</h3>${d.lines.map(l=>`<p><strong>${escape(l.speaker)}</strong> ${escape(l.text)}</p>`).join('')}</article>`).join('')||'<p>Your first assignment is waiting at the Training Terminal beside home.</p>'}</details>`;
}
