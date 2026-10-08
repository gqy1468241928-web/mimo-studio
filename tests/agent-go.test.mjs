import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../server/db.mjs';
import {seal,unseal,hashPassword} from '../server/security.mjs';
import {createApp} from '../server/app.mjs';
import * as agent from '../server/agent.mjs';
const key='b'.repeat(64),endpoint='https://opencode.ai/zen/go/v1',model='glm-5.3-flash';
const response={choices:[{message:{content:JSON.stringify({summary:'连接正常',tasks:[]})}}]};
test('OpenCode Go agent uses its subscription endpoint, real client identity and one session per saved run',async()=>{
 const store=await openStore({dialect:'sqlite'});try{
 await store.setSetting('agent',{endpoint,model,secret:seal('fake-go-key',key,'agent')});
 let session;
 const run=await agent.runAgent(store,key,{action:'emails'}, {request:async(url,options)=>{
 assert.equal(url,endpoint+'/chat/completions');assert.equal(options.headers.Authorization,'Bearer fake-go-key');
 assert.match(options.headers['User-Agent'],/^MiMo-Workbench\//);session=options.headers['x-opencode-session'];assert.match(session,/^[a-f0-9-]{36}$/);assert.equal(options.body.model,model);return response;
 }});
 assert.equal(run.id,session);assert.equal((await store.listRuns()).length,1);assert.equal((await store.list('tasks')).total,0);
 }finally{await store.close();}
});
test('connection testing sends no workbench content and creates no runs or tasks',async()=>{
 assert.equal(typeof agent.testAgent,'function');const store=await openStore({dialect:'sqlite'});
 try{
 await store.setSetting('agent',{endpoint,model,secret:seal('fake-go-key',key,'agent')});
 await store.save({id:'private-mail',kind:'inquiries',title:'Private RFQ title',content:'Private buyer details',status:'new'},0);
 const result=await agent.testAgent(store,key,{request:async(url,options)=>{
 assert.equal(url,endpoint+'/chat/completions');assert.ok(options.headers['x-opencode-session']);assert.ok(options.body.max_tokens<=1024);
 assert.ok(!JSON.stringify(options.body).includes('Private'));return response;
 }});
 assert.equal(result.ok,true);assert.ok(result.at>0);assert.equal((await store.listRuns()).length,0);assert.equal((await store.list('tasks')).total,0);
 }finally{await store.close();}
});
test('Go authentication and quota errors do not expose the API key',async()=>{
 assert.equal(typeof agent.testAgent,'function');const store=await openStore({dialect:'sqlite'});
 try{await store.setSetting('agent',{endpoint,model,secret:seal('fake-sensitive-go-key',key,'agent')});
 await assert.rejects(agent.testAgent(store,key,{request:async()=>{throw Object.assign(new Error('fake-sensitive-go-key'),{statusCode:401});}}),e=>/API Key/.test(e.message)&&!e.message.includes('fake-sensitive-go-key'));
 await assert.rejects(agent.testAgent(store,key,{request:async()=>{throw Object.assign(new Error('fake-sensitive-go-key'),{statusCode:429});}}),/额度|频率/);
 }finally{await store.close();}
});
test('Agent settings bind stored credentials to the endpoint and expose an authenticated saved-config test',async()=>{
 const store=await openStore({dialect:'sqlite'}),config={sessionKey:'a'.repeat(64),encryptionKey:key,cronSecret:'test-cron',initialHash:hashPassword('test-only-password'),appUrl:'https://mimo-studio.top',production:false};let calls=0;
 const app=await createApp({store,config,synchronizer:{tick:async()=>({results:[]})},agentRequest:async()=>{calls++;return response;}}),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const req=(path,method='GET',body)=>fetch(base+path,{method,headers:{'content-type':'application/json',...(cookie?{cookie}: {})},...(body?{body:JSON.stringify(body)}:{})});
 try{
 assert.equal((await req('/api/agent/test','POST',{})).status,401);
 const login=await req('/api/auth/login','POST',{password:'test-only-password'});cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await req('/api/agent/test','POST',{})).status,400);assert.equal(calls,0);
 await req('/api/agent/config','POST',{endpoint:'https://api.example.com/v1',model:'old-model',secret:'old-private-key'});
 const switched=await req('/api/agent/config','POST',{endpoint,model});assert.equal(switched.status,400);assert.equal((await store.getSetting('agent')).endpoint,'https://api.example.com/v1');
 const saved=await req('/api/agent/config','POST',{endpoint:endpoint+'/',model,secret:'new-private-key'});assert.equal(saved.status,200);assert.ok(!JSON.stringify(await saved.json()).includes('new-private-key'));
 assert.equal(unseal((await store.getSetting('agent')).secret,key,'agent'),'new-private-key');
 const ping=await req('/api/agent/test','POST',{});assert.equal(ping.status,200);assert.equal((await ping.json()).ok,true);assert.equal(calls,1);
 const publicConfig=await (await req('/api/agent/config')).json();assert.ok(publicConfig.lastTestAt>0);assert.ok(publicConfig.hasSecret);assert.equal(publicConfig.secret,undefined);
 assert.equal((await req('/api/agent/config','POST',{endpoint,model:'minimax-m3'})).status,400);
 assert.equal((await req('/api/agent/config','POST',{endpoint,model:'kimi-k2.7-code'})).status,200);assert.equal((await (await req('/api/agent/config')).json()).lastTestAt,0);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});

test('a connection test cannot validate a configuration changed while its model request is in flight',async()=>{
 const store=await openStore({dialect:'sqlite'}),config={sessionKey:'a'.repeat(64),encryptionKey:key,cronSecret:'test-cron',initialHash:hashPassword('test-only-password'),appUrl:'https://mimo-studio.top',production:false};
 let release,started;const entered=new Promise(r=>started=r),gate=new Promise(r=>release=r);
 const app=await createApp({store,config,synchronizer:{tick:async()=>({results:[]})},agentRequest:async()=>{started();await gate;return response;}}),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const req=(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(cookie?{cookie}: {})},body:JSON.stringify(body)});
 try{
 const login=await req('/api/auth/login',{password:'test-only-password'});cookie=login.headers.get('set-cookie').split(';')[0];
 await req('/api/agent/config',{endpoint,model,secret:'test-go-key'});
 const ping=req('/api/agent/test',{});await entered;
 const change=await req('/api/agent/config',{endpoint,model:'kimi-k2.7-code'});assert.equal(change.status,200);
 release();assert.equal((await ping).status,409);const saved=await store.getSetting('agent');assert.equal(saved.model,'kimi-k2.7-code');assert.equal(saved.lastTestAt,0);
 }finally{release();await new Promise(r=>server.close(r));await store.close();}
});
