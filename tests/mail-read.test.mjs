import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {hashPassword} from '../server/security.mjs';
const password='mail-read-fixture-password';
async function setup(){
 const store=await openStore({dialect:'sqlite'});
 const config={sessionKey:'a'.repeat(64),encryptionKey:'b'.repeat(64),cronSecret:'fixture',initialHash:hashPassword(password),appUrl:'https://mimo-studio.top',production:false};
 const app=await createApp({store,config,synchronizer:{tick:async()=>({results:[]})}}),server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const request=(url,method='GET',body,auth=true)=>fetch(base+'/api'+url,{method,headers:{...(auth?{cookie}:{}),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 return {store,request,close:async()=>{await new Promise(resolve=>server.close(resolve));await store.close();}};
}

test('opening synced mail records the read state without losing its date, source, notes or archived status',async()=>{
 const ctx=await setup();
 try{
  const mail={id:'synced-mail',kind:'inquiries',sourceId:'source-mail',mailbox:'info@example.com',site:'globalwellpcb.com',title:'RFQ',status:'new',sender:'buyer@example.com',receivedAt:'2026-10-07T23:00:00.000Z',content:'Original message',userNotes:'Keep my notes',tags:'PCB'};
  await ctx.store.upsertExternal(mail);
  assert.equal((await ctx.request('/mail/synced-mail/read','POST',{},false)).status,401);
  const opened=await ctx.request('/mail/synced-mail/read','POST',{});assert.equal(opened.status,200);
  const read=await opened.json();assert.ok(read.readAt>0);
  assert.equal(read.receivedAt,'2026-10-07T23:00:00.000Z');assert.equal(read.mailbox,'info@example.com');assert.equal(read.userNotes,'Keep my notes');
  const repeated=await (await ctx.request('/mail/synced-mail/read','POST',{})).json();assert.equal(repeated.readAt,read.readAt);assert.equal(repeated.version,read.version);
  const saved=await ctx.request('/records/synced-mail','PUT',{...read,userNotes:'Reviewed',readAt:0});assert.equal(saved.status,200);assert.equal((await saved.json()).readAt,read.readAt);
  await ctx.store.upsertExternal({...mail,readAt:0,content:'Updated message'});
  let current=await ctx.store.get(mail.id);assert.equal(current.readAt,read.readAt);assert.equal(current.userNotes,'Reviewed');assert.equal(current.mailbox,'info@example.com');
  await ctx.store.save({...current,status:'archived'},current.version);
  assert.equal((await ctx.request('/mail/synced-mail/read','POST',{})).status,200);
  await ctx.store.upsertExternal(mail);
  assert.equal((await ctx.store.list('inquiries')).total,0);assert.equal((await ctx.store.list('inquiries',{history:true})).items[0].readAt,read.readAt);
 }finally{await ctx.close();}
});

test('the mail read endpoint rejects unrelated and missing records',async()=>{
 const ctx=await setup();
 try{
  await ctx.store.save({id:'article',kind:'articles',sourceId:'source-a',title:'Article',site:'',status:'published'},0);
  await ctx.store.save({id:'manual-inquiry',kind:'inquiries',title:'Manual',site:'',status:'new'},0);
  for(const id of ['article','manual-inquiry','missing'])assert.equal((await ctx.request('/mail/'+id+'/read','POST',{})).status,404);
  assert.equal((await ctx.store.get('article')).readAt,undefined);
 }finally{await ctx.close();}
});
