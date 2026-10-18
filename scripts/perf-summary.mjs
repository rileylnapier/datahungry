import {readFile} from 'node:fs/promises';
const records=[];
for(const suffix of ['.2','.1','']){
  const text=await readFile(`.diagnostics/performance.jsonl${suffix}`,'utf8').catch(()=> '');
  for(const line of text.split('\n'))if(line)try{records.push(JSON.parse(line));}catch{}
}
if(!records.length){console.log('No diagnostics yet. Start npm run dev, refresh the game, and play for a few seconds.');process.exit(0);}
const last=records.at(-1),session=records.filter(r=>r.session===last.session);
const samples=session.filter(r=>r.type==='sample'),latest=samples.at(-1)?.data;
console.log(`Session ${last.session} · last received ${last.receivedAt}`);
if(latest)console.log(`${latest.zone} / ${latest.panel} · ${latest.fps.toFixed(1)} FPS · p95 ${latest.p95.toFixed(1)} ms · ${latest.drawCalls} draw calls\nCPU ms: logic ${latest.logic.toFixed(1)}, scene ${latest.scene.toFixed(1)}, UI ${latest.ui.toFixed(1)} · queue ${latest.queue}`);
console.log(`Recorded ${samples.length} summaries, ${session.filter(r=>r.type==='spike').length} frame spikes, ${session.filter(r=>r.type==='error').length} errors.`);
for(const r of session.filter(r=>r.type==='spike').sort((a,b)=>b.data.frame-a.data.frame).slice(0,5))console.log(`Slow frame ${r.data.time}: ${r.data.frame.toFixed(1)} ms · logic ${r.data.logic.toFixed(1)} / scene ${r.data.scene.toFixed(1)} / UI ${r.data.ui.toFixed(1)} · ${r.data.zone}`);
for(const r of session.filter(r=>r.type==='error'||r.data.name==='user-marked-lag').slice(-10))console.log(JSON.stringify(r));
