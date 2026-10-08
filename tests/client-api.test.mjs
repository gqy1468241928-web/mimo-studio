import test from 'node:test';
import assert from 'node:assert/strict';
import * as client from '../src/api.js';
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
async function withFetch(fake,run){const original=globalThis.fetch;globalThis.fetch=fake;try{await run();}finally{globalThis.fetch=original;}}

test('a transient failed read is retried and only a valid response counts as recovery',async()=>{
 let calls=0;
 await withFetch(async()=>{if(++calls===1)throw new TypeError('Failed to fetch');return response({items:[{id:'mail'}]});},async()=>{
  let result;await assert.doesNotReject(async()=>{result=await client.api('/records?kind=inquiries');});
  assert.equal(calls,2);assert.equal(result.items[0].id,'mail');
 });
});
test('a disconnected write is not repeated and reports an unconfirmed result',async()=>{
 let calls=0;
 await withFetch(async()=>{calls++;throw new TypeError('Failed to fetch');},async()=>{
  await assert.rejects(client.api('/records',{method:'POST',body:{title:'Task'}}),error=>{assert.equal(error.code,'NETWORK_ERROR');assert.equal(error.method,'POST');assert.match(error.message,/未能确认|尚未确认/);assert.doesNotMatch(error.message,/Failed to fetch/);return true;});
  assert.equal(calls,1);
 });
});
test('temporary gateway pages are retried for reads while auth rejections remain visible',async()=>{
 let calls=0;
 await withFetch(async()=>++calls===1?new Response('<html>Gateway down</html>',{status:502}):response({total:1}),async()=>{assert.equal((await client.api('/records?kind=articles')).total,1);assert.equal(calls,2);});
 calls=0;
 await withFetch(async()=>{calls++;return response({error:'请先登录'},401);},async()=>{await assert.rejects(client.api('/records?kind=articles'),error=>{assert.equal(error.status,401);assert.equal(error.message,'请先登录');return true;});assert.equal(calls,1);});
});
test('read recovery identifies the exact request and never treats a write as a recovered read',async()=>{
 assert.equal(typeof client.onReadRecovered,'function');
 const recovered=[],unsubscribe=client.onReadRecovered(path=>recovered.push(path));
 try{
  await withFetch(async()=>{throw new TypeError('Failed to fetch');},async()=>{await assert.rejects(client.api('/sources'),error=>{assert.equal(error.requestPath,'/sources');assert.equal(error.method,'GET');return true;});});
  await withFetch(async()=>response({ok:true}),async()=>{await client.api('/sources');await client.api('/records',{method:'POST',body:{title:'Task'}});});
  assert.deepEqual(recovered,['/sources']);
 }finally{unsubscribe();}
 await withFetch(async()=>response({ok:true}),()=>client.api('/sources'));
 assert.deepEqual(recovered,['/sources']);
});
