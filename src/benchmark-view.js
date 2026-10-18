import {goalProgress} from './goal-progress.js';
import {BENCHMARK,BENCHMARK_KINDS,benchmarkCard,benchmarkScore,answerBenchmark,advanceTrialTime} from './benchmark.js';
import {startTrial} from './chapter.js';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={picture:'Pictures',word:'Words',paragraph:'Paragraphs'};
function animalPicture(card){
  const cat=card.answer==='cat',fur=card.variant?'#bec5df':'#e8b47d',dark=card.variant?'#7e89ac':'#b9784f';
  return `<svg class="animal-picture" viewBox="0 0 300 230" role="img" aria-label="${cat?'A cat with pointed ears and whiskers':'A dog with floppy ears'}"><ellipse cx="150" cy="205" rx="86" ry="10" fill="#153639" opacity=".12"/><path d="M199 184 Q270 148 250 115" fill="none" stroke="${fur}" stroke-width="20" stroke-linecap="round"/><ellipse cx="151" cy="167" rx="53" ry="40" fill="${fur}"/><ellipse cx="126" cy="197" rx="24" ry="11" fill="${dark}"/><ellipse cx="178" cy="197" rx="24" ry="11" fill="${dark}"/>${cat?`<path d="M89 87 L90 27 L133 61 M169 61 L214 27 L213 93" fill="${fur}" stroke="${dark}" stroke-width="5" stroke-linejoin="round"/><path d="M99 62 L99 43 L119 65 M188 65 L204 44 L204 66" fill="#eaa8a5"/>`:`<ellipse cx="92" cy="94" rx="23" ry="51" transform="rotate(15 92 94)" fill="${dark}"/><ellipse cx="208" cy="94" rx="23" ry="51" transform="rotate(-15 208 94)" fill="${dark}"/>`}<ellipse cx="150" cy="105" rx="65" ry="59" fill="${fur}"/><ellipse cx="150" cy="132" rx="35" ry="25" fill="#fff2d8"/><ellipse cx="124" cy="103" rx="7" ry="10" fill="#203339"/><ellipse cx="178" cy="103" rx="7" ry="10" fill="#203339"/><circle cx="126" cy="100" r="2.5" fill="white"/><circle cx="180" cy="100" r="2.5" fill="white"/><path d="M141 123 Q150 118 159 123 L150 132 Z" fill="#4d434b"/><path d="M150 132 L150 138 M150 138 Q139 149 133 138 M150 138 Q161 149 167 138" fill="none" stroke="#4d434b" stroke-width="3" stroke-linecap="round"/>${cat?'<path d="M112 125 L70 116 M112 134 L68 137 M188 125 L230 116 M188 134 L232 137" stroke="#725c61" stroke-width="3" stroke-linecap="round"/>':'<path d="M143 143 Q151 138 158 143 L158 153 Q150 165 143 153 Z" fill="#e69ca3"/><path d="M108 164 Q150 184 193 164" stroke="#669e91" stroke-width="9" fill="none"/><circle cx="152" cy="176" r="8" fill="#eecf82"/>'}</svg>`;
}

const pictureURLs={cat:new URL('../assets/trials/cat-v1.png',import.meta.url).href,dog:new URL('../assets/trials/dog-v1.png',import.meta.url).href};
const loadedPictures=new Set();
let picturesLoading;
function preloadPictures(){
  return picturesLoading??=Promise.all(Object.entries(pictureURLs).map(([animal,url])=>new Promise(resolve=>{
    const img=new Image();img.onload=()=>{loadedPictures.add(animal);resolve();};img.onerror=()=>resolve();img.src=url;
  })));
}

export function mountBenchmark(container,state,{onChange,onClaim,onExit,onPersist=onChange}){
  let feedback=null,drag=null,disposed=false,paused=true,running=false,ready=false,frame=0,last=performance.now(),savedTime=0;
  let feedbackTime=0;
  const stopSpeech=()=>{if('speechSynthesis' in window)window.speechSynthesis.cancel();};
  function pause(){paused=true;drag=null;stopSpeech();onChange();updatePause();}
  function updatePause(){
    const overlay=container.querySelector('#trial-overlay');if(overlay)overlay.hidden=!paused;
    const button=container.querySelector('#trial-pause');if(button)button.textContent=paused?'Resume':'Pause';
    for(const b of container.querySelectorAll('.benchmark-choices button'))b.disabled=paused||!!feedback;
  }
  function begin(){if(!ready||feedback)return;paused=false;running=true;last=performance.now();updatePause();focusCard();}
  function render(){
    if(disposed)return;
    const trial=state.trial,score=benchmarkScore(trial),index=trial.answers.length;
    if(score.complete&&!feedback){
      container.innerHTML=`<span class="eyebrow">DATA TRIAL 01 · CATS &amp; DOGS</span><h2 id="panel-title">${score.passed?'I know cats and dogs!':'A little more practice.'}</h2><p>${score.passed?'You connected pictures, words and stories. Byte can now recognize animal pictures in the Local Network.':'Try another shuffle. Every mistake is a clue; retrying costs nothing.'}</p><div class="benchmark-score"><strong>${score.correct}<small> / ${trial.deck.length}</small></strong><span>correct · best ${trial.best}/${trial.deck.length}</span></div><div class="benchmark-results">${BENCHMARK_KINDS.map(kind=>`<div><span>${names[kind]}</span><strong>${goalProgress(score.byKind[kind],BENCHMARK.minimumPerKind)}${score.byKind[kind]<BENCHMARK.minimumPerKind?' · practice':''}</strong></div>`).join('')}</div><p class="panel-note">Pass with ${BENCHMARK.passScore}/12 and at least ${BENCHMARK.minimumPerKind}/4 in each category. Knowledge and points are never spent.</p>${score.passed?'<div class="knowledge-card"><strong>Animal Recognition unlocked</strong><span>Travel vat · Local Network · Cat and dog pictures</span></div><button class="primary" id="benchmark-claim">Equip vat & enter Local Network ↗</button>':'<button class="primary" id="benchmark-retry">Try again · Free</button>'}<button class="restart-button" id="benchmark-exit">Back to Home</button>`;
      container.querySelector('#benchmark-claim')?.addEventListener('click',onClaim);
      container.querySelector('#benchmark-retry')?.addEventListener('click',()=>{if(startTrial(state)){running=false;paused=true;onChange();render();}});
      container.querySelector('#benchmark-exit').onclick=onExit;
      container.querySelector('.primary')?.focus({preventScroll:true});return;
    }

    const card=benchmarkCard(trial.deck[index]);if(!card){onExit();return;}
    const visual=card.kind==='picture'?(loadedPictures.has(card.answer)?`<img class="animal-picture" src="${pictureURLs[card.answer]}" alt="${card.answer==='cat'?'An orange cat with pointed ears and whiskers':'A golden dog with floppy ears'}" draggable="false">`:animalPicture(card)):`<p>${escape(card.text)}</p>`;
    container.innerHTML=`<span class="eyebrow">DATA TRIAL 01 · CATS &amp; DOGS</span><h2 id="panel-title">Catch the right idea.</h2><p class="benchmark-instructions">Swipe ← for cat, → for dog before the card reaches the line.</p><div class="benchmark-progress"><span>Card ${index+1} / ${trial.deck.length}</span><span>${score.correct} correct</span></div><div class="trial-clock"><div class="trial-time-track"><i id="trial-time-fill"></i></div><span id="trial-seconds" role="timer" aria-label="Time remaining"></span></div><div class="trial-arena" id="trial-arena"><span class="trial-lane cat">← CAT</span><span class="trial-lane dog">DOG →</span><div class="benchmark-card ${card.kind}" id="benchmark-card" tabindex="-1"><span class="benchmark-kind">${names[card.kind]}</span>${visual}</div><div class="trial-deadline">DEADLINE</div><div class="trial-overlay" id="trial-overlay" ${paused?'':'hidden'}><strong>${running?'Paused':'Ready to sort?'}</strong><p>Pictures: 6 seconds · Words: 8 seconds<br>Paragraphs: 14 seconds. You can pause anytime.</p><button class="primary" id="trial-begin" ${ready?'':'disabled'}>${ready?(running?'Resume falling cards':'Let’s play'):'Loading pictures…'}</button></div></div><div class="benchmark-choices"><button id="answer-cat" ${paused?'disabled':''}>← Cat</button><button id="answer-dog" ${paused?'disabled':''}>Dog →</button></div><div class="benchmark-feedback" role="status" aria-live="polite">Sort the falling card. Buttons and arrow keys work too.</div><div class="trial-tools"><button id="trial-pause">${paused?'Resume':'Pause'}</button><button id="benchmark-read" ${!('speechSynthesis' in window)||card.kind==='picture'?'hidden':''}>Pause & read aloud</button></div><p class="benchmark-footer">${BENCHMARK.passScore}/12 to pass · ${BENCHMARK.minimumPerKind}/4 in each category · free retries</p>`;
    container.querySelector('#answer-cat').onclick=()=>answer('cat');
    container.querySelector('#answer-dog').onclick=()=>answer('dog');
    container.querySelector('#trial-begin').onclick=begin;
    container.querySelector('#trial-pause').onclick=()=>{if(feedback)return;paused?begin():pause();};
    container.querySelector('#benchmark-read').onclick=()=>{if(feedback)return;pause();if('speechSynthesis' in window){const speech=new SpeechSynthesisUtterance(card.text);speech.lang='en-US';speech.rate=.85;window.speechSynthesis.speak(speech);}};
    const element=container.querySelector('#benchmark-card');
    const resetDrag=()=>{drag=null;element.style.setProperty('--swipe','0px');element.style.setProperty('--tilt','0deg');};
    element.onpointerdown=e=>{if(paused||feedback||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};element.setPointerCapture(e.pointerId);};
    element.onpointermove=e=>{if(drag?.id!==e.pointerId)return;const x=Math.max(-150,Math.min(150,e.clientX-drag.x));element.style.setProperty('--swipe',x+'px');element.style.setProperty('--tilt',x/14+'deg');};
    element.onpointerup=e=>{if(drag?.id!==e.pointerId)return;const x=e.clientX-drag.x,y=e.clientY-drag.y;resetDrag();if(Math.abs(x)>=Math.min(60,element.clientWidth*.2)&&Math.abs(x)>Math.abs(y))answer(x<0?'cat':'dog');};
    element.onpointercancel=element.onlostpointercapture=()=>{if(drag)resetDrag();};
    drawTime(advanceTrialTime(state,0));last=performance.now();
  }
  function focusCard(){container.querySelector('#benchmark-card')?.focus({preventScroll:true});}
  function drawTime(clock){
    if(!clock)return;const card=container.querySelector('#benchmark-card'),arena=container.querySelector('#trial-arena');
    if(card&&arena)card.style.setProperty('--drop',Math.max(0,arena.clientHeight-card.offsetHeight-46)*clock.progress+'px');
    const fill=container.querySelector('#trial-time-fill');if(fill){fill.style.width=(1-clock.progress)*100+'%';fill.classList.toggle('urgent',clock.remaining<2);}
    const seconds=container.querySelector('#trial-seconds');if(seconds)seconds.textContent=clock.remaining.toFixed(1)+'s';
  }
  function answer(choice){
    if(feedback||disposed||paused)return;
    const card=benchmarkCard(state.trial.deck[state.trial.answers.length]);if(!card)return;
    const result=answerBenchmark(state,card.id,choice);if(!result)return;
    stopSpeech();drag=null;feedback={...result,card};feedbackTime=choice==='missed'?1.1:.8;onChange();
    const element=container.querySelector('#benchmark-card');
    element.classList.add('departing');element.style.opacity='0';
    if(choice!=='missed'){element.style.setProperty('--swipe',(choice==='cat'?-420:420)+'px');element.style.setProperty('--tilt',(choice==='cat'?-25:25)+'deg');}
    container.querySelector('.benchmark-feedback').textContent=choice==='missed'?`Time’s up! That one was ${card.answer==='cat'?'a cat':'a dog'}. Next card…`:result.matched?'✓ Nice catch!':`That belongs with ${card.answer==='cat'?'cats':'dogs'}. Try the next one!`;
    for(const button of container.querySelectorAll('.benchmark-choices button,.trial-tools button'))button.disabled=true;
  }
  function tick(now){
    if(disposed)return;const dt=Math.max(0,(now-last)/1000);last=now;
    if(!paused&&!document.hidden){
      if(feedback){feedbackTime-=dt;if(feedbackTime<=0){feedback=null;render();focusCard();}}
      else if(!benchmarkScore(state.trial).complete){
        const clock=advanceTrialTime(state,dt);drawTime(clock);
        if(clock?.expired)answer('missed');
        else {savedTime+=dt;if(savedTime>=1){savedTime=0;onChange();}}
      }
    }
    frame=requestAnimationFrame(tick);
  }
  const keydown=e=>{if(e.repeat)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();answer(e.key==='ArrowLeft'?'cat':'dog');}};
  const visibility=()=>{if(document.hidden){stopSpeech();if(!feedback)pause();else onChange();}last=performance.now();};
  container.addEventListener('keydown',keydown);document.addEventListener('visibilitychange',visibility);
  render();preloadPictures().then(()=>{if(disposed)return;ready=true;render();});frame=requestAnimationFrame(tick);
  return {destroy(){disposed=true;drag=null;stopSpeech();cancelAnimationFrame(frame);container.removeEventListener('keydown',keydown);document.removeEventListener('visibilitychange',visibility);onPersist();}};
}
