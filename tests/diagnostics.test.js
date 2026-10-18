import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {cleanBatch,createLogWriter,createDiagnosticsHandler,DIAGNOSTICS_PATH} from '../scripts/diagnostics.mjs';

const input=()=>({session:'test-session',events:[{type:'sample',data:{fps:42,frame:24,zone:'Sandbox',cargo:'PRIVATE',save:'PRIVATE',points:100,shadows:true}}]});
test('diagnostics only retain allowed fields and bounded error messages',()=>{
  const [record]=cleanBatch(input());assert.equal(record.data.fps,42);assert.equal(record.data.zone,'Sandbox');
  assert.equal(record.data.cargo,undefined);assert.equal(record.data.save,undefined);assert.equal(record.data.points,undefined);
  const [error]=cleanBatch({session:'x',events:[{type:'error',data:{message:'x'.repeat(1000),stack:'Error at http://localhost:5173/src/main.js?token=secret#fragment'}}]});
  assert.equal(error.data.message.length,500);assert.equal(error.data.stack,'Error at http://localhost:5173/src/main.js');
  for(const bad of [{}, {...input(),session:'../../outside'}, {...input(),events:Array(41).fill(input().events[0])}, {...input(),events:[{type:'save',data:{}}]}])assert.throws(()=>cleanBatch(bad));
});
test('writes are serialized as valid JSONL and rotate to at most three files',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'dh-logs-'));
  try{
    const write=createLogWriter(directory,{maxBytes:400});
    await Promise.all(Array.from({length:8},(_,i)=>write([{session:'test',type:'event',data:{name:`event-${i}`,message:'x'.repeat(150)}}])));
    const files=await readdir(directory);assert.equal(files.length,3);
    for(const file of files)for(const line of (await readFile(join(directory,file),'utf8')).trim().split('\n'))assert.equal(JSON.parse(line).session,'test');
    const latest=JSON.parse((await readFile(join(directory,'performance.jsonl'),'utf8')).trim());assert.equal(latest.data.name,'event-7');
  }finally{await rm(directory,{recursive:true,force:true});}
});
function request(body,{origin='http://localhost:5173',method='POST',type='application/json'}={}){
  const req=Readable.from([Buffer.from(body)]);Object.assign(req,{url:DIAGNOSTICS_PATH,method,headers:{host:'localhost:5173',origin,'content-type':type}});return req;
}
function response(){return {status:200,headers:{},body:'',setHeader(k,v){this.headers[k]=v;},writeHead(s){this.status=s;},end(body=''){this.body=body;}};}
test('dev endpoint accepts diagnostics, rejects oversized and cross-origin requests, and stays off in preview',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'dh-endpoint-'));
  try{
    const handle=createDiagnosticsHandler(directory);let res=response();
    await handle(request('',{method:'GET'}),res);assert.equal(JSON.parse(res.body).enabled,true);
    res=response();await handle(request(JSON.stringify(input())),res);assert.equal(res.status,204);
    res=response();await handle(request(JSON.stringify(input()),{origin:'https://other.example'}),res);assert.equal(res.status,403);
    res=response();await handle(request('x'.repeat(65537)),res);assert.equal(res.status,413);
    res=response();await handle(request('{}',{type:'text/plain'}),res);assert.equal(res.status,415);
    res=response();await handle(request('invalid'),res);assert.equal(res.status,400);
    res=response();await createDiagnosticsHandler(directory,{enabled:false})(request('',{method:'GET'}),res);assert.equal(res.status,404);
    const lines=(await readFile(join(directory,'performance.jsonl'),'utf8')).trim().split('\n');assert.equal(lines.length,1);
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('client batches fit the endpoint byte limit even with multibyte error stacks',async()=>{
  const {takeLogBatch}=await import('../src/performance-log.js');
  const pending=Array.from({length:40},()=>({type:'error',data:{message:'oops',stack:'猫'.repeat(2500)}}));
  const batch=takeLogBatch(pending);
  assert.ok(batch.length>0&&batch.length<40);
  assert.ok(Buffer.byteLength(JSON.stringify({session:'test',events:batch}))<65536);
  assert.equal(pending.length+batch.length,40);
  const many=Array.from({length:100},()=>({type:'event',data:{name:'test'}}));assert.equal(takeLogBatch(many).length,40);assert.equal(many.length,60);
});
