import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../server/db.mjs';
import {seal} from '../server/security.mjs';
import {createSynchronizer,mapApiItems,SYNC_INTERVAL} from '../server/sources.mjs';
import {parseProposal,runAgent} from '../server/agent.mjs';
const key='a'.repeat(64);
test('API mapping requires stable IDs and respects configured nested paths',()=>{
 const source={id:'s',type:'api',site:'apexcomponent.com',config:{listPath:'data.rows',titleField:'subject',contentField:'body.text',kind:'inquiries'}};
 const a=mapApiItems(source,{data:{rows:[{id:42,subject:'RFQ',body:{text:'Real request'}}]}});
 assert.equal(a[0].title,'RFQ');assert.equal(a[0].content,'Real request');
 assert.equal(a[0].id,mapApiItems(source,{data:{rows:[{id:42,subject:'updated'}]}})[0].id);
 assert.throws(()=>mapApiItems(source,{data:{rows:[{subject:'no id'}]}}),/唯一 ID/);
});
test('background sync isolates provider failure and uses durable next-run time',async()=>{
 const store=await openStore({dialect:'sqlite'});
 for(const id of ['bad','good'])await store.saveSource({id,type:'api',enabled:true,nextRun:0,config:{},secret:seal('private',key,id)});
 let calls=0;
 const sync=createSynchronizer(store,key,{reader:async(source,secret)=>{
 calls++;assert.equal(secret,'private');if(source.id==='bad')throw new Error('provider failed');
 return {records:[{id:'remote',kind:'inquiries',title:'RFQ',site:'',status:'new',content:'original'}],state:{cursor:1}};
 }});
 const result=await sync.tick();assert.equal(result.results.length,2);assert.equal((await store.list('inquiries')).total,1);
 assert.equal((await store.getSource('bad')).state.error,'provider failed');
 assert.ok((await store.getSource('good')).nextRun>Date.now()+SYNC_INTERVAL-5000);
 await sync.tick();assert.equal(calls,2);
 const item=await store.get('remote');await store.save({...item,status:'archived'},item.version);
 await sync.tick({force:true});assert.equal((await store.list('inquiries')).total,0);
 sync.stop();await store.close();
});
test('Agent output is validated before saving and never directly creates tasks',async()=>{
 assert.throws(()=>parseProposal('plain invented response'),/返回格式/);
 const store=await openStore({dialect:'sqlite'});
 await store.setSetting('agent',{endpoint:'https://api.example.com/v1',model:'configured-model',secret:seal('secret',key,'agent')});
 const result=await runAgent(store,key,{action:'emails',prompt:'整理'}, {request:async(_url,input)=>{
 assert.equal(input.headers.Authorization,'Bearer secret');assert.match(input.body.messages[0].content,/不可信/);
 return {choices:[{message:{content:JSON.stringify({summary:'无询盘',tasks:[]})}}]};
 }});
 assert.equal(result.summary,'无询盘');assert.equal((await store.list('tasks')).total,0);
 assert.equal((await store.listRuns()).length,1);await store.close();
});

test('Get notes uses documented IDs and reads latest plus cursor pages',async()=>{
 const {readApiSource}=await import('../server/sources.mjs');
 const seen=[],source={id:'get-a',type:'get',site:'',config:{clientId:'cli-configured'},state:{}};
 const result=await readApiSource(source,'configured-key',{request:async(url,options)=>{
 assert.equal(options.headers.Authorization,'configured-key');assert.equal(options.headers['X-Client-ID'],'cli-configured');seen.push(url);
 const cursor=new URL(url).searchParams.get('cursor');
 return {success:true,data:{notes:[{note_id:cursor==='next'?'200':'100',title:'note',content:'body'}],has_more:cursor!=='next',cursor:cursor==='next'?'':'next'}};
 }});
 assert.equal(result.records.length,2);assert.equal(result.records[0].externalId,'100');
 assert.equal(seen.length,2);assert.equal(new URL(seen[1]).searchParams.get('cursor'),'next');
 assert.equal(result.state.backfillCursor,'');
});
