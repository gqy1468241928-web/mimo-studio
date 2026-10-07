import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../server/db.mjs';
import {hashPassword} from '../server/security.mjs';
const mod=await import('../server/app.mjs').catch(()=>({}));
test('private CRUD, secret masking, origin checks, and password changes work together',async()=>{
 assert.equal(typeof mod.createApp,'function','Authenticated API is required');
 const store=await openStore({dialect:'sqlite'});
 const config={sessionKey:'a'.repeat(64),encryptionKey:'b'.repeat(64),cronSecret:'private-cron',initialHash:hashPassword('real-test-password'),appUrl:'https://mimo-studio.top',production:false};
 const synchronizer={syncOne:async()=>({ok:true}),tick:async()=>({results:[]})};
 const app=await mod.createApp({store,config,synchronizer}),server=app.listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const request=(path,method='GET',body,extra={})=>fetch(base+path,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
 try{
 assert.equal((await request('/api/records?kind=tasks')).status,401);
 const login=await request('/api/auth/login','POST',{password:'real-test-password'});assert.equal(login.status,200);
 cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);
 assert.equal((await request('/api/records','POST',{kind:'tasks',title:'A',site:'',status:'todo'},{origin:'https://attacker.example'})).status,403);
 const created=await (await request('/api/records','POST',{kind:'tasks',title:'A',site:'',status:'todo'})).json();
 assert.equal(created.title,'A');
 assert.equal((await (await request('/api/records?kind=tasks')).json()).total,1);
 const saved=await request('/api/sources','POST',{name:'API source',type:'api',site:'',enabled:true,config:{endpoint:'https://api.example.com/items',listPath:'data.items',kind:'inquiries'},secret:'very-private-key'});
 assert.equal(saved.status,200);
 const all=await (await request('/api/sources')).text();assert.ok(!all.includes('very-private-key'));assert.match(all,/hasSecret/);
 assert.equal((await request('/api/auth/password','POST',{currentPassword:'real-test-password',password:'new-test-password'})).status,200);
 assert.equal((await request('/api/records?kind=tasks')).status,401);
 assert.equal((await request('/api/auth/login','POST',{password:'real-test-password'})).status,401);
 assert.equal((await request('/api/auth/login','POST',{password:'new-test-password'})).status,200);
 cookie='';assert.equal((await request('/api/sync','POST',{}, {'x-cron-secret':'private-cron'})).status,200);
 assert.equal((await request('/api/sync','POST',{}, {'x-cron-secret':'wrong'})).status,401);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});
