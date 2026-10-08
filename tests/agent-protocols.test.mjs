import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../server/db.mjs';
import {seal} from '../server/security.mjs';
import {runAgent,testAgent} from '../server/agent.mjs';
import {openCodeGo} from '../shared/agent-providers.mjs';
const key='b'.repeat(64),endpoint=openCodeGo.endpoint,text=JSON.stringify({summary:'连接正常',tasks:[]});
test('the Go catalog covers confirmed model families and declares each native protocol',()=>{
 assert.ok(openCodeGo.models.length>=33);
 for(const id of ['gpt-6-luna','grok-4.7','minimax-m3','qwen3.8-max','kimi-k3','glm-5.3','deepseek-v4-pro','mimo-v2.6-pro'])assert.ok(openCodeGo.models.some(m=>m.id===id));
 assert.ok(openCodeGo.models.every(m=>['chat','messages','responses'].includes(m.protocol)));
});
test('Go Messages models use their native authorization, system prompt, token limit and text blocks',async()=>{
 for(const model of ['minimax-m3','qwen3.8-max']){
 const store=await openStore({dialect:'sqlite'});try{
 await store.setSetting('agent',{endpoint,model,secret:seal('test-go-key',key,'agent')});
 const run=await runAgent(store,key,{action:'emails'},{request:async(url,options)=>{
 assert.equal(url,endpoint+'/messages');assert.equal(options.headers['x-api-key'],'test-go-key');assert.equal(options.headers['anthropic-version'],'2023-06-01');assert.ok(!options.headers.Authorization);
 assert.match(options.body.system,/不可信/);assert.ok(options.body.max_tokens>0);assert.deepEqual(options.body.messages.map(m=>m.role),['user']);
 return {content:[{type:'thinking',thinking:'do not expose this'},{type:'text',text}]};
 }});
 assert.equal(run.summary,'连接正常');assert.equal((await store.list('tasks')).total,0);
 }finally{await store.close();}
 }
});
test('Go Responses models use stateless native input and ignore reasoning blocks in output',async()=>{
 for(const model of ['gpt-6-luna','grok-4.7']){
 const store=await openStore({dialect:'sqlite'});try{
 await store.setSetting('agent',{endpoint,model,secret:seal('test-go-key',key,'agent')});
 const result=await testAgent(store,key,{request:async(url,options)=>{
 assert.equal(url,endpoint+'/responses');assert.equal(options.headers.Authorization,'Bearer test-go-key');assert.ok(options.headers['x-opencode-session']);
 assert.equal(options.body.store,false);assert.equal(options.body.temperature,undefined);assert.ok(options.body.instructions);assert.deepEqual(options.body.input.map(m=>m.role),['user']);assert.ok(options.body.max_output_tokens<=1024);
 return {output:[{type:'reasoning',summary:[{text:'do not expose this'}]},{type:'message',role:'assistant',content:[{type:'output_text',text}]}]};
 }});
 assert.equal(result.ok,true);assert.equal((await store.listRuns()).length,0);
 }finally{await store.close();}
 }
});
