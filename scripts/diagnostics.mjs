import {appendFile, mkdir, rename, rm, stat} from 'node:fs/promises';
import {join} from 'node:path';

export const DIAGNOSTICS_PATH='/__diagnostics/performance';
const numbers=['fps','frame','p95','worst','slow','samples','logic','scene','ui','drawCalls','triangles','geometries','textures','programs','pixelRatio','width','height','collectors','queue','creatures','zoom','longTasks','longestTask','duration','start','line','column'];
const strings={time:40,zone:80,panel:40,name:40,kind:40,message:500,stack:2500,userAgent:300};
const types=new Set(['sample','spike','error','longtask','event']);
export function cleanBatch(input){
  if(!input||typeof input.session!=='string'||!/^[-\w]{1,64}$/.test(input.session)||!Array.isArray(input.events)||input.events.length>40)throw Error('Invalid batch');
  return input.events.map(event=>{
    if(!event||!types.has(event.type)||!event.data||typeof event.data!=='object')throw Error('Invalid event');
    const data={};
    for(const key of numbers)if(Number.isFinite(event.data[key])&&event.data[key]>=0)data[key]=Math.min(1e12,event.data[key]);
    for(const [key,max] of Object.entries(strings))if(typeof event.data[key]==='string')data[key]=event.data[key].slice(0,max).replace(/(https?:\/\/[^\s?#]+)[?#][^\s)]*/g,'$1');
    if(typeof event.data.shadows==='boolean')data.shadows=event.data.shadows;
    if(typeof event.data.hidden==='boolean')data.hidden=event.data.hidden;
    return {receivedAt:new Date().toISOString(),session:input.session,type:event.type,data};
  });
}
export function createLogWriter(directory,{maxBytes=2*1024*1024}={}){
  let pending=0,chain=Promise.resolve();
  const file=join(directory,'performance.jsonl');
  return async records=>{
    if(pending>=20)throw Error('Log busy');pending++;
    const write=chain.then(async()=>{
      await mkdir(directory,{recursive:true});
      const body=records.map(record=>JSON.stringify(record)).join('\n')+'\n';
      const bytes=Buffer.byteLength(body);
      const size=await stat(file).then(s=>s.size).catch(()=>0);
      if(size+bytes>maxBytes){
        await rm(file+'.2',{force:true});
        await rename(file+'.1',file+'.2').catch(error=>{if(error.code!=='ENOENT')throw error;});
        await rename(file,file+'.1').catch(error=>{if(error.code!=='ENOENT')throw error;});
      }
      await appendFile(file,body);
    });
    chain=write.catch(()=>{});
    try{await write;}finally{pending--;}
  };
}
export function createDiagnosticsHandler(directory,{enabled=true}={}){
  const write=createLogWriter(directory);
  return async(req,res)=>{
    if(new URL(req.url,'http://localhost').pathname!==DIAGNOSTICS_PATH)return false;
    res.setHeader('Cache-Control','no-store');
    if(!enabled){res.writeHead(404);res.end();return true;}
    // Dev clients on localhost or the LAN use the same origin. No cross-origin API.
    if((req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)||req.headers['sec-fetch-site']==='cross-site'){
      res.writeHead(403);res.end();return true;
    }
    if(req.method==='GET'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({enabled:true,version:1}));return true;}
    if(req.method!=='POST'){res.writeHead(405);res.end();return true;}
    if(!req.headers['content-type']?.startsWith('application/json')){res.writeHead(415);res.end();return true;}
    try{
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413);res.end();return true;}chunks.push(chunk);}
      const records=cleanBatch(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      if(records.length)await write(records);
      res.writeHead(204);res.end();
    }catch(error){res.writeHead(error.message==='Log busy'?503:400);res.end('Diagnostic batch rejected');}
    return true;
  };
}
