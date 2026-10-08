import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {openStore} from '../server/db.mjs';
import {hashPassword,unseal} from '../server/security.mjs';
import {createApp} from '../server/app.mjs';
const recovery=await import('../server/source-recovery.mjs').catch(()=>({}));
const key='c'.repeat(64),origin='https://mimo-studio.top';
const sources=[{id:'b5ceb7f0-1750-4e63-b8c9-cf81510d3524',name:'Recovered mailbox',type:'hostinger',site:'globalwellpcb.com',enabled:true,config:{mailboxId:'scoped-box',user:'info@example.com',folder:'INBOX'},secret:'test-only-mail-token'},{id:'d8dec322-af0b-472a-abbe-2239d00378c3',name:'Recovered notes',type:'get',site:'',enabled:true,config:{clientId:'test-client-id'},secret:'test-only-note-token'}];
test('recovery transport encrypts credentials for only the target server and rejects altered or expired links',()=>{
 assert.equal(typeof recovery.encryptRecovery,'function');
 const recipient=recovery.recoveryRecipient(key,origin),now=Date.now(),id=randomUUID();
 const bundle=recovery.encryptRecovery(recipient,sources,{now,id});
 assert.ok(!bundle.includes('test-only-mail-token'));
 const transport=JSON.parse(Buffer.from(bundle,'base64url').toString());
 assert.ok(!JSON.stringify(transport).includes('test-only-note-token'));
 assert.deepEqual(recovery.decryptRecovery(bundle,key,origin,{now}).sources,sources);
 assert.throws(()=>recovery.decryptRecovery(bundle,'d'.repeat(64),origin,{now}),/恢复链接/);
 assert.throws(()=>recovery.decryptRecovery(bundle,key,'https://other.example',{now}),/恢复链接/);
 assert.throws(()=>recovery.decryptRecovery(bundle,key,origin,{now:now+3600001}),/恢复链接/);
 transport.data=Buffer.alloc(32).toString('base64url');
 assert.throws(()=>recovery.decryptRecovery(Buffer.from(JSON.stringify(transport)).toString('base64url'),key,origin,{now}),/恢复链接/);
 assert.throws(()=>recovery.decryptRecovery('a'.repeat(24001),key,origin,{now}),/恢复链接/);
});
test('recovery keeps owner login, checks origin, seals secrets, does not overwrite newer connections, and acknowledges only a random receipt',async()=>{
 const store=await openStore({dialect:'sqlite'});
 const config={sessionKey:'a'.repeat(64),encryptionKey:key,cronSecret:'test-cron',initialHash:hashPassword('new-workbench-password'),appUrl:origin,production:false,recoverySources:sources.map(({secret,...s})=>({...s,secretHash:createHash('sha256').update(secret).digest('hex')}))};
 const synchronizer={syncOne:async()=>({ok:true,count:2}),tick:async()=>({results:[]})};
 const app=await createApp({store,config,synchronizer}),server=app.listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 let cookie='';
 const request=(path,method='GET',body,extra={})=>fetch(base+path,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
 try{
  const keyResponse=await request('/api/source-recovery/key');assert.equal(keyResponse.status,200);
  const recipient=await keyResponse.json(),id=randomUUID(),bundle=recovery.encryptRecovery(recipient,sources,{id});
  assert.equal((await request('/api/source-recovery','POST',{bundle})).status,401);
  assert.equal((await request('/api/source-recovery/receipt/'+id)).status,404);
  const login=await request('/api/auth/login','POST',{password:'new-workbench-password'});
  cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/source-recovery','POST',{bundle},{origin:'https://attacker.example'})).status,403);
  const restored=await request('/api/source-recovery','POST',{bundle});assert.equal(restored.status,200);
  const response=await restored.text();assert.ok(!response.includes('test-only-'));assert.equal(JSON.parse(response).count,2);
  const saved=await store.listSources();assert.equal(saved.length,2);
  for(const source of saved){assert.notEqual(source.secret,sources.find(s=>s.id===source.id).secret);assert.equal(unseal(source.secret,key,source.id),sources.find(s=>s.id===source.id).secret);}
  await request('/api/source-recovery','POST',{bundle});assert.equal((await store.listSources()).length,2);
  await store.saveSource({...saved[0],secret:'a-newer-encrypted-secret',enabled:false});
  const newBundle=recovery.encryptRecovery(recipient,sources);
  assert.equal((await request('/api/source-recovery','POST',{bundle:newBundle})).status,200);
  assert.equal((await store.getSource(saved[0].id)).secret,'a-newer-encrypted-secret');
  const badSources=[...sources,{...sources[0],id:randomUUID(),type:'api',config:{endpoint:'https://example.com'}}];
  assert.equal((await request('/api/source-recovery','POST',{bundle:recovery.encryptRecovery(recipient,badSources)})).status,400);
  cookie='';const receipt=await request('/api/source-recovery/receipt/'+id);assert.equal(receipt.status,200);
  const ack=await receipt.text();assert.ok(!ack.includes('example.com'));assert.ok(!ack.includes('secret'));assert.equal(JSON.parse(ack).count,2);
  assert.equal((await request('/api/sources')).status,401);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});
