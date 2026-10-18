// Opt-in local diagnostics. No telemetry, save data, or background sampling.
export function summarizeFrames(samples){
  if(!samples.length)return null;
  const intervals=samples.map(s=>s.frame).sort((a,b)=>a-b);
  const mean=key=>samples.reduce((n,s)=>n+s[key],0)/samples.length;
  const frame=mean('frame');
  return {samples:samples.length,fps:1000/frame,frame,p95:intervals[Math.ceil(intervals.length*.95)-1],worst:intervals.at(-1),slow:samples.filter(s=>s.frame>33.4).length,logic:mean('logic'),scene:mean('scene'),ui:mean('ui')};
}
export function createPerformanceMonitor(renderer,context){
  const panel=document.createElement('aside');panel.className='performance-monitor';panel.hidden=true;
  panel.setAttribute('aria-label','Performance monitor');
  panel.innerHTML=`<div class="perf-heading"><strong>Performance</strong><button data-perf="close" aria-label="Hide performance monitor">×</button></div><pre>Collecting frames…</pre><div class="perf-actions"><button data-perf="shadows">Shadows on</button><button data-perf="resolution">Native scale</button><button data-perf="reset">Reset sample</button><button data-perf="download">Save report</button></div><small>60 FPS ≈ 16.7 ms/frame. Scene time is CPU work, not GPU time. Settings are temporary.</small>`;
  document.body.append(panel);
  const output=panel.querySelector('pre'),normalRatio=renderer.getPixelRatio();
  let enabled=false,samples=[],history=[],updated=0,lastReport=null,longTasks=0,longestTask=0,observer=null;
  const supportsLongTasks=typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes?.includes('longtask');
  const reset=()=>{samples=[];history=[];lastReport=null;updated=0;longTasks=0;longestTask=0;output.textContent='Collecting frames…';};
  function setEnabled(value){
    enabled=value;panel.hidden=!enabled;observer?.disconnect();observer=null;
    if(enabled){reset();if(supportsLongTasks){observer=new PerformanceObserver(list=>{for(const task of list.getEntries()){longTasks++;longestTask=Math.max(longestTask,task.duration);}});observer.observe({type:'longtask'});}}
  }
  function record(sample,now){
    if(!enabled)return;
    // Ignore the first frame after a visibility change; main resets its timestamp.
    if(sample.frame>0){samples.push(sample);if(samples.length>300)samples.shift();}
    if(now-updated<1000||!samples.length)return;updated=now;
    const stats=summarizeFrames(samples),info=renderer.info;
    lastReport={time:new Date().toISOString(),...context(),...stats,drawCalls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures,programs:info.programs?.length??0,pixelRatio:renderer.getPixelRatio(),width:renderer.domElement.width,height:renderer.domElement.height,shadows:renderer.shadowMap.enabled,longTasks:supportsLongTasks?longTasks:null,longestTask:supportsLongTasks?longestTask:null};
    history.push(lastReport);if(history.length>60)history.shift();
    const n=v=>v.toFixed(1);
    output.textContent=`${n(stats.fps)} FPS · frame ${n(stats.frame)} ms\np95 ${n(stats.p95)} ms · worst ${n(stats.worst)} ms\n${stats.slow}/${stats.samples} frames > 33 ms\nCPU: logic ${n(stats.logic)} · scene ${n(stats.scene)} · UI ${n(stats.ui)} ms\nDraw calls ${lastReport.drawCalls} · triangles ${lastReport.triangles.toLocaleString()}\nGPU resources: ${lastReport.geometries} geometries · ${lastReport.textures} textures\n${lastReport.zone} · ${lastReport.collectors} hoses · queue ${lastReport.queue}\n${lastReport.width}×${lastReport.height} · scale ${n(lastReport.pixelRatio)}\nLong tasks (>50 ms): ${supportsLongTasks?longTasks+' · max '+n(longestTask)+' ms':'unavailable in this browser'}`;
  }
  panel.addEventListener('click',event=>{
    const button=event.target.closest('[data-perf]');if(!button)return;
    switch(button.dataset.perf){
      case 'close':setEnabled(false);break;
      case 'reset':reset();break;
      case 'shadows':renderer.shadowMap.enabled=!renderer.shadowMap.enabled;button.textContent=`Shadows ${renderer.shadowMap.enabled?'on':'off'}`;reset();break;
      case 'resolution':renderer.setPixelRatio(renderer.getPixelRatio()===normalRatio?Math.min(1,normalRatio*.75):normalRatio);button.textContent=renderer.getPixelRatio()===normalRatio?'Native scale':'Lower scale';reset();break;
      case 'download':{
        const report={version:1,userAgent:navigator.userAgent,capturedAt:new Date().toISOString(),note:'CPU timings do not measure GPU execution. Last 60 summaries; each uses up to 300 frames. No saved game data.',latest:lastReport,history};
        const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download='data-hungry-performance.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break;
      }
    }
  });
  document.addEventListener('visibilitychange',()=>{if(enabled)reset();});
  if(new URLSearchParams(location.search).get('perf')==='1')setEnabled(true);
  return {get enabled(){return enabled;},setEnabled,record};
}
