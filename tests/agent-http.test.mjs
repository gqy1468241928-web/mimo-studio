import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {seal,hashPassword} from '../server/security.mjs';
const key='b'.repeat(64);
test('new overview, reply and automation routes are private and sending requires explicit confirmation',async()=>{
 const store=await openStore({dialect:'sqlite'}),config={sessionKey:'a'.repeat(64),encryptionKey:key,cronSecret:'test-cron',initialHash:hashPassword('test-password-for-agent'),appUrl:'https://mimo-studio.top',production:false};
 await store.setSetting('agent',{endpoint:'https://api.example.com/v1',model:'fixture',secret:seal('fake-agent-key',key,'agent')});
 await store.saveSource({id:'box',name:'Mailbox',type:'hostinger',enabled:true,site:'globalwellpcb.com',config:{mailboxId:'ACtest',user:'info@globalwellpcb.com',folder:'INBOX'},secret:seal('fake',key,'box')});
 await store.save({id:'mail',kind:'inquiries',title:'PCB quote',status:'new',site:'globalwellpcb.com',sender:'buyer@example.com',sourceId:'box',externalId:'hostinger:ACtest:INBOX:41',content:'Need PCB'},0);
 await store.saveReply({inquiryId:'mail',sourceId:'box',from:'info@globalwellpcb.com',to:'buyer@example.com',subject:'Re: PCB',body:'Please provide files',status:'draft'},0);
 const calls=[],app=await createApp({store,config,synchronizer:{tick:async()=>({results:[]})},mailRequest:async(url)=>{calls.push(url);if(url.endsWith('/me'))return {data:{mailboxes:[{resourceId:'ACtest',address:'info@globalwellpcb.com'}]}};return null;}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const request=(path,body)=>fetch(base+'/api'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',cookie},...(body?{body:JSON.stringify(body)}:{})});
 try{
  for(const route of ['/agent/overview','/mail/mail/reply','/agent/automation'])assert.equal((await request(route)).status,401);
  const login=await request('/auth/login',{password:'test-password-for-agent'});cookie=login.headers.get('set-cookie').split(';')[0];
  const overview=await request('/agent/overview?date=2026-10-08');assert.equal(overview.status,200);assert.equal((await overview.json()).timeZone,'Asia/Shanghai');
  assert.equal((await request('/agent/overview?date=2026-02-30')).status,400);
  const rule=await (await request('/agent/automation')).json();assert.equal(rule.enabled,false);
  assert.equal((await request('/agent/automation',{enabled:true,sourceIds:['box'],matchTerms:['pcb']})).status,400);
  const enabled=await request('/agent/automation',{enabled:true,sourceIds:['box'],matchTerms:['pcb'],confirm:true});assert.equal(enabled.status,200);assert.ok((await enabled.json()).enabledAt>0);
  assert.equal((await request('/agent/automation',{enabled:false,sourceIds:['box'],matchTerms:['pcb']})).status,200);
  const reply=await (await request('/mail/mail/reply')).json();
  assert.equal((await request('/mail/mail/reply/send',{version:reply.version})).status,400);assert.equal(calls.length,0);
  const sent=await request('/mail/mail/reply/send',{version:reply.version,confirm:true});assert.equal(sent.status,200);assert.equal((await sent.json()).status,'sent');assert.equal(calls.filter(u=>u.endsWith('/send')).length,1);
  assert.equal((await request('/mail/mail/reply/send',{version:reply.version,confirm:true})).status,409);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});
