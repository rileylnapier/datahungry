// Development-only transport: the dev server must explicitly advertise support.
// Queue sizes, upload frequency and retries are bounded to avoid adding frame lag.
export function takeLogBatch(pending,maxBytes=48000){
  const batch=[],encoder=new TextEncoder();let bytes=0;
  while(pending.length&&batch.length<40){
    const size=encoder.encode(JSON.stringify(pending[0])).length+1;
    if(size>maxBytes){pending.shift();continue;}
    if(bytes+size>maxBytes)break;
    bytes+=size;batch.push(pending.shift());
  }
  return batch;
}
export function createPerformanceLog(){
  const endpoint='/__diagnostics/performance',session=globalThis.crypto?.randomUUID?.()??`session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  let available=false,active=false,pending=[],sending=false,retryAfter=0,status='Connecting to local log…';
  const now=()=>new Date().toISOString();
  function enqueue(type,data){
    if(!active)return;
    const detail={time:now(),...data};
    if(typeof detail.message==='string')detail.message=detail.message.slice(0,500);
    if(typeof detail.stack==='string')detail.stack=detail.stack.slice(0,2500);
    const event={type,data:detail};
    if(type==='error'||type==='event')pending.unshift(event);else pending.push(event);
    if(pending.length>120){const oldestSample=pending.findIndex(item=>item.type!=='error'&&item.type!=='event');pending.splice(oldestSample>=0?oldestSample:pending.length-1,1);}
  }
  async function flush(){
    if(!active||sending||!pending.length||Date.now()<retryAfter)return;
    sending=true;const batch=takeLogBatch(pending);
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,events:batch}),signal:AbortSignal.timeout(4000)});
      if(!response.ok)throw Error('Log unavailable');
      status=`Local log saved · ${new Date().toLocaleTimeString()}`;
    }catch{
      pending=[...batch,...pending].slice(-120);retryAfter=Date.now()+15000;status='Local log disconnected · retrying';
    }finally{sending=false;}
  }
  function beacon(){
    if(!active||!pending.length)return;
    const remaining=[...pending],batch=takeLogBatch(remaining),body=new Blob([JSON.stringify({session,events:batch})],{type:'application/json'});
    if(navigator.sendBeacon(endpoint,body))pending=remaining;
  }
  fetch(endpoint,{signal:AbortSignal.timeout(4000)}).then(response=>response.ok?response.json():null).then(result=>{
    if(result?.enabled!==true){status='Local logging unavailable · restart npm run dev';return;}
    available=active=true;status='Local logging active';
    enqueue('event',{name:'session-start',userAgent:navigator.userAgent});void flush();
  }).catch(()=>{status='Local logging unavailable · restart npm run dev';});
  setInterval(()=>void flush(),5000);
  window.addEventListener('error',event=>{enqueue('error',{kind:'error',message:event.message||'Resource failed to load',stack:event.error?.stack,line:event.lineno,column:event.colno});void flush();});
  window.addEventListener('unhandledrejection',event=>{enqueue('error',{kind:'unhandledrejection',message:String(event.reason?.message??event.reason),stack:event.reason?.stack});void flush();});
  document.addEventListener('visibilitychange',()=>{enqueue('event',{name:'visibility',hidden:document.hidden});if(document.hidden)beacon();});
  window.addEventListener('pagehide',beacon);
  return {get active(){return active;},get available(){return available;},get status(){return status;},enqueue,flush,
    setActive(value){if(!available)return;active=value;status=active?'Local logging active':'Local logging paused';if(active)enqueue('event',{name:'logging-resumed'});else pending=[];}
  };
}
