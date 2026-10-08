import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {createSynchronizer} from '../server/sources.mjs';
import {hashPassword} from '../server/security.mjs';
const password='queue-fixture-password',delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function setup(reader){
 const store=await openStore({dialect:'sqlite'}),sync=createSynchronizer(store,'b'.repeat(64),{reader});
 const config={sessionKey:'a'.repeat(64),encryptionKey:'b'.repeat(64),cronSecret:'fixture',initialHash:hashPassword(password),appUrl:'https://mimo-studio.top',production:false};
 const app=await createApp({store,config,synchronizer:sync}),server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});const cookie=login.headers.get('set-cookie').split(';')[0];
 const request=(url,body,auth=true)=>fetch(base+'/api'+url,{method:'POST',headers:{'content-type':'application/json',...(auth?{cookie}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(600)});
 return {store,sync,request,close:async()=>{sync.stop();await new Promise(resolve=>server.close(resolve));await store.close();}};
}
async function waitFor(fn){for(let i=0;i<100;i++){if(await fn())return;await delay(15);}throw Error('Background sync did not finish');}
const source=(id,site='apexcomponent.com',kind='articles',enabled=true)=>({id,name:id,site,type:'api',enabled,nextRun:Date.now()+600000,secret:'',config:{endpoint:'https://example.com/items',kind},state:{}});

test('manual collection acknowledges before the provider finishes and duplicate clicks share the running work',async()=>{
 let release,started;const gate=new Promise(resolve=>release=resolve),began=new Promise(resolve=>started=resolve),calls=[];
 const ctx=await setup(async s=>{calls.push(s.id);started();await gate;return {records:[{id:'article-result',kind:'articles',sourceId:s.id,site:s.site,status:'published',title:'Synced',publishedAt:'2026-10-08T00:00:00Z'}],state:{}};});
 try{
  await ctx.store.saveSource(source('selected'));await ctx.store.saveSource(source('other-site','globalwellpcb.com'));await ctx.store.saveSource(source('mailbox','apexcomponent.com','inquiries'));
  assert.equal((await ctx.request('/content/sync',{kind:'articles',site:'apexcomponent.com'},false)).status,401);
  let accepted;await assert.doesNotReject(async()=>{accepted=await ctx.request('/content/sync',{kind:'articles',site:'apexcomponent.com'});});
  assert.equal(accepted.status,202);const result=await accepted.json();assert.equal(result.queued,true);assert.deepEqual(result.results.map(r=>r.id),['selected']);
  await began;assert.equal((await ctx.store.getSource('selected')).nextRun,0);assert.ok((await ctx.store.getSource('mailbox')).nextRun>Date.now());
  const repeated=await ctx.request('/sources/selected/fetch',{});assert.equal(repeated.status,202);assert.equal((await repeated.json()).queued,true);assert.deepEqual(calls,['selected']);
  release();await waitFor(async()=>!!(await ctx.store.getSource('selected')).state.lastSuccess);
  assert.equal((await ctx.store.list('articles')).total,1);assert.deepEqual(calls,['selected']);
 }finally{release();await waitFor(async()=>!!(await ctx.store.getSource('selected'))?.state.lastAttempt);await ctx.close();}
});
test('provider failure is recorded in source state after acknowledgement and paused sources stay paused',async()=>{
 let calls=0;const ctx=await setup(async()=>{calls++;throw new Error('Fixture provider unavailable');});
 try{
  await ctx.store.saveSource(source('failed'));await ctx.store.saveSource(source('paused','', 'articles',false));
  assert.equal((await ctx.request('/sources/failed/fetch',{})).status,202);
  await waitFor(async()=>!!(await ctx.store.getSource('failed')).state.error);assert.equal((await ctx.store.getSource('failed')).state.error,'Fixture provider unavailable');
  assert.equal((await ctx.request('/sources/paused/fetch',{})).status,400);assert.equal((await ctx.request('/sources/missing/fetch',{})).status,404);assert.equal(calls,1);
  assert.equal((await ctx.store.getSource('paused')).enabled,false);
 }finally{await ctx.close();}
});
