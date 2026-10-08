import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../server/db.mjs';
import {seal} from '../server/security.mjs';
import {runAgent,parseProposal} from '../server/agent.mjs';
import {openCodeGo} from '../shared/agent-providers.mjs';
const key='b'.repeat(64),endpoint=openCodeGo.endpoint;
const module=await import('../server/agent-tools.mjs').catch(()=>({}));
async function setup(model='glm-5.3-flash') {const store=await openStore({dialect:'sqlite'});await store.setSetting('agent',{endpoint,model,secret:seal('never-output-fixture-key',key,'agent')});return store;}
async function record(store,id,kind='resources',extra={}) {return store.save({id,kind,title:id,content:'PCB capability copper assembly',site:'globalwellpcb.com',status:'new',...extra},0);}
function response(model,value) {const content=JSON.stringify(value),protocol=openCodeGo.models.find(m=>m.id===model).protocol;return protocol==='messages'?{content:[{type:'text',text:content}]}:protocol==='responses'?{output:[{type:'message',role:'assistant',content:[{type:'output_text',text:content}]}]}:{choices:[{message:{content}}]};}
function turns(options){return options.body.messages||options.body.input;}
function tools(store,input={}) {assert.equal(typeof module.createAgentTools,'function','read-only workspace tool factory must exist');return module.createAgentTools(store,{key,...input});}

test('tools retrieve the 51st record and archived rows with continuation offsets',async()=>{
 const store=await setup();try {for(let i=0;i<55;i++)await record(store,'row-'+String(i).padStart(2,'0'),'tasks',{status:i===0?'archived':'todo'});
 const api=tools(store),page=await api.execute('list_records',{kind:'tasks',limit:50});assert.equal(page.total,55);assert.equal(page.items.length,50);assert.equal(page.nextOffset,50);
 const end=await api.execute('list_records',{kind:'tasks',offset:50,limit:50});assert.equal(end.items.length,5);assert.equal(end.nextOffset,null);assert.ok([...page.items,...end.items].some(r=>r.status==='archived'));
 }finally{await store.close();}
});
test('record bodies page through all 200k characters and suppress untrusted fields',async()=>{
 const store=await setup();try {await record(store,'long','notes',{content:'x'.repeat(199990)+'END-OF-DOC',secret:'record-private-value',config:{token:'hidden'},url:'https://user:pass@example.com/info'});
 const api=tools(store);let offset=0,body='';do {const part=await api.execute('read_record',{id:'long',offset,maxChars:12000});body+=part.content;offset=part.nextCharOffset;if(body.length===12000){assert.equal(part.remainingChars,188000);assert.ok(!JSON.stringify(part).includes('record-private-value'));assert.equal(part.url,'');}}while(offset!==null);
 assert.equal(body.length,200000);assert.ok(body.endsWith('END-OF-DOC'));assert.equal(api.evidence.get('long').complete,true);
 }finally{await store.close();}
});
test('tools reject unknown names and malformed or widening arguments',async()=>{
 const store=await setup();try {const api=tools(store,{site:'globalwellpcb.com',projectId:'project-a'});
 for(const [name,args] of [['send_email',{}],['read_record',{id:'x',maxChars:12001}],['list_records',{kind:'invalid'}],['list_records',{kind:'tasks',offset:-1}],['source_status',{secret:true}],['list_records',{kind:'tasks',site:''}],['search_knowledge',{query:'PCB',projectId:'other'}]])await assert.rejects(api.execute(name,args));
 }finally{await store.close();}
});
test('site and project scopes apply to lists, ID reads and shared knowledge',async()=>{
 const store=await setup();try {await record(store,'allowed','tasks',{projectId:'project-a'});await record(store,'wrong-site','tasks',{projectId:'project-a',site:'apexcomponent.com'});await record(store,'wrong-project','tasks',{projectId:'project-b'});await record(store,'shared','resources',{site:'',projectId:''});
 const api=tools(store,{site:'globalwellpcb.com',projectId:'project-a'});assert.deepEqual((await api.execute('list_records',{kind:'tasks'})).items.map(r=>r.id),['allowed']);
 await assert.rejects(api.execute('read_record',{id:'wrong-site'}));await assert.rejects(api.execute('read_record',{id:'wrong-project'}));assert.equal((await api.execute('read_record',{id:'shared'})).id,'shared');
 }finally{await store.close();}
});
test('source status returns health metadata without secrets, config or raw state',async()=>{
 const store=await setup();try {await store.saveSource({id:'source-a',name:'Mail',type:'hostinger',site:'globalwellpcb.com',enabled:true,secret:'sealed-source-value',config:{token:'private-config-value'},state:{lastSuccess:123,error:'private-config-value sealed-source-value',raw:'raw-state-value',count:5}});
 const api=tools(store),result=await api.execute('source_status',{}),json=JSON.stringify(result);assert.equal(result.items[0].lastSuccess,123);for(const hidden of ['sealed-source-value','private-config-value','raw-state-value','secret','config'])assert.ok(!json.includes(hidden));assert.equal(api.evidence.size,0);
 }finally{await store.close();}
});
test('empty synchronized bodies fetch only from their trusted stored source and cache the detail',async()=>{
 const store=await setup();try {await store.saveSource({id:'mail-source',name:'mail',type:'hostinger',enabled:true,secret:'private-value',site:'globalwellpcb.com'});await record(store,'mail','inquiries',{sourceId:'mail-source',externalId:'trusted-external',content:''});let count=0;
 const api=tools(store,{readExternal:async(source,record)=>{assert.equal(source.id,'mail-source');assert.equal(record.externalId,'trusted-external');count++;return {content:'Fetched customer body',truncated:false,mayMarkRead:true};}});
 const result=await api.execute('read_record',{id:'mail'});assert.equal(result.content,'Fetched customer body');assert.equal(result.mayMarkRead,true);assert.equal((await store.get('mail')).content,'Fetched customer body');await api.execute('read_record',{id:'mail'});assert.equal(count,1);assert.ok(!JSON.stringify(api.trace).includes('Fetched customer body'));
 }finally{await store.close();}
});
test('proposal accepts backward compatible tasks plus strict grounded reply fields',()=>{
 const old=parseProposal('{"summary":"ok","tasks":[]}');assert.deepEqual(old.sourceIds,[]);
 const parsed=parseProposal(JSON.stringify({summary:'analysis',sourceIds:['ref'],reply:{subject:'RFQ',body:'Please provide BOM',sourceIds:['ref'],missingInfo:['BOM']}}));assert.equal(parsed.reply.readyToSend,false);assert.equal(parsed.reply.isInquiry,false);
 for(const value of ['not json',JSON.stringify({summary:'ok',sourceIds:[2]}),JSON.stringify({summary:'ok',reply:{subject:'a',body:'b',missingInfo:'BOM'}})])assert.throws(()=>parseProposal(value));
});
for(const model of ['glm-5.3-flash','minimax-m3','gpt-6-luna'])test(model+' continues text tool envelopes across native protocol turns',async()=>{
 const store=await setup(model);try {await record(store,'exact-record','notes',{content:'Verified copper evidence'});let round=0;
 const run=await runAgent(store,key,{action:'custom',prompt:'Read exact-record'},{request:async(_url,options)=>{const messages=turns(options);assert.ok(!JSON.stringify(options.body).includes('never-output-fixture-key'));
 if(round++===0){assert.equal(messages.at(-1).role,'user');const context=JSON.parse(messages.at(-1).content);assert.equal(context.data.length,10);assert.ok(context.tools.length>=5);return response(model,{toolCalls:[{name:'read_record',arguments:{id:'exact-record'}}]});}
 assert.deepEqual(messages.slice(-3).map(m=>m.role),['user','assistant','user']);assert.match(messages.at(-1).content,/Verified copper evidence/);return response(model,{summary:'Evidence retrieved',tasks:[],sourceIds:['exact-record']});}});
 assert.equal(round,2);assert.equal(run.sources[0].id,'exact-record');assert.equal(run.toolTrace[0].name,'read_record');assert.ok(!JSON.stringify(run.toolTrace).includes('Verified copper evidence'));
 }finally{await store.close();}
});
test('fabricated citations fail without saving a run or accepting model URLs',async()=>{
 const store=await setup();try {await assert.rejects(runAgent(store,key,{action:'custom'},{request:async()=>response('glm-5.3-flash',{summary:'fake',sourceIds:['invented'],sources:[{id:'invented',url:'https://evil.example'}]})}),/来源|引用/);assert.equal((await store.listRuns()).length,0);}finally{await store.close();}
});
test('reply automatically reads the original inquiry and verified matched knowledge',async()=>{
 const store=await setup();try {await record(store,'customer','inquiries',{title:'PCB capability',content:'Can you offer PCB copper assembly?',sender:'buyer@example.com'});await record(store,'knowledge','resources',{title:'PCB capability',content:'PCB copper assembly capabilities verified',url:'https://example.com/capabilities'});
 const run=await runAgent(store,key,{action:'reply',inquiryId:'customer',site:'globalwellpcb.com'},{request:async(_url,options)=>{const context=JSON.parse(turns(options).find(m=>m.role==='user').content);assert.match(JSON.stringify(context),/Can you offer PCB/);assert.match(JSON.stringify(context),/capabilities verified/);return response('glm-5.3-flash',{summary:'中文分析',sourceIds:['customer'],reply:{subject:'Re: PCB',body:'Please provide BOM.',sourceIds:['knowledge'],missingInfo:[],isInquiry:true,readyToSend:true}});}});
 assert.equal(run.reply.readyToSend,true);assert.deepEqual(run.reply.sourceIds,['knowledge']);assert.equal(run.sources.find(r=>r.id==='knowledge').url,'https://example.com/capabilities');
 }finally{await store.close();}
});
test('reply cannot cite an unread knowledge snippet returned from list_records',async()=>{
 const store=await setup();try {await record(store,'customer','mic',{title:'Unrelated',content:'Hello'});await record(store,'listed-only','resources',{title:'unmatched',content:'unmatched'});let round=0;
 await assert.rejects(runAgent(store,key,{action:'reply',inquiryId:'customer',site:'globalwellpcb.com'},{request:async()=>round++===0?response('glm-5.3-flash',{toolCalls:[{name:'list_records',arguments:{kind:'resources'}}]}):response('glm-5.3-flash',{summary:'draft',reply:{subject:'Hi',body:'hello',sourceIds:['listed-only'],missingInfo:[],isInquiry:true,readyToSend:true}})}),/来源|引用|知识/);
 assert.equal((await store.listRuns()).length,0);
 }finally{await store.close();}
});
test('no knowledge, missing information, non-inquiry or truncated evidence keeps replies unready',async()=>{
 for(const variant of ['none','missing','not-inquiry','original-truncated','knowledge-truncated']){const store=await setup();try {await record(store,'customer','inquiries',{title:'PCB',content:'PCB',truncated:variant==='original-truncated'});if(variant!=='none')await record(store,'knowledge','resources',{title:'PCB',content:'PCB',truncated:variant==='knowledge-truncated'});
 const run=await runAgent(store,key,{action:'reply',inquiryId:'customer'},{request:async()=>response('glm-5.3-flash',{summary:'draft',reply:{subject:'RFQ',body:'Please share BOM',sourceIds:variant==='none'?['customer']:['knowledge'],missingInfo:variant==='missing'?['BOM']:[],isInquiry:variant!=='not-inquiry',readyToSend:true}})});assert.equal(run.reply.readyToSend,false,variant);
 }finally{await store.close();}}
});
test('reply requires a real inquiry and bounded rounds cannot save an unfinished tool loop',async()=>{
 const store=await setup();try {await record(store,'not-mail','articles');await assert.rejects(runAgent(store,key,{action:'reply'},{request:async()=>response('glm-5.3-flash',{summary:'x'})}),/询盘/);await assert.rejects(runAgent(store,key,{action:'reply',inquiryId:'not-mail'},{request:async()=>response('glm-5.3-flash',{summary:'x'})}),/询盘/);
 let calls=0;await assert.rejects(runAgent(store,key,{action:'custom'},{request:async()=>{calls++;return response('glm-5.3-flash',{toolCalls:[{name:'source_status',arguments:{}}]});}}),/轮|次数/);assert.equal(calls,6);assert.equal((await store.listRuns()).length,0);
 await assert.rejects(runAgent(store,key,{action:'custom'},{request:async()=>response('glm-5.3-flash',{toolCalls:Array.from({length:4},()=>({name:'source_status',arguments:{}}))})}),/工具|格式/);
 }finally{await store.close();}
});
test('daily action automatically uses the selected Shanghai date and knowledge action searches its prompt',async()=>{
 const store=await setup();try {await record(store,'article-today','articles',{status:'published',publishedAt:'2026-10-07T16:05:00Z'});await record(store,'article-yesterday','articles',{status:'published',publishedAt:'2026-10-07T15:59:00Z'});await record(store,'kb','resources',{title:'copper',content:'copper guidance'});
 const daily=await runAgent(store,key,{action:'daily',date:'2026-10-08'},{request:async(_url,options)=>{const context=JSON.parse(turns(options).find(m=>m.role==='user').content);assert.equal(context.initialTools[0].result.date,'2026-10-08');assert.equal(context.initialTools[0].result.counts.articles,1);return response('glm-5.3-flash',{summary:'2026-10-08: 1 article'});}});assert.equal(daily.date,'2026-10-08');assert.equal(daily.toolTrace[0].name,'daily_overview');
 const knowledge=await runAgent(store,key,{action:'knowledge',prompt:'copper'},{request:async(_url,options)=>{assert.match(turns(options).find(m=>m.role==='user').content,/copper guidance/);return response('glm-5.3-flash',{summary:'Found',sourceIds:['kb']});}});assert.equal(knowledge.sources[0].id,'kb');
 }finally{await store.close();}
});


test('knowledge search includes the matching snippet beyond the first body excerpt',async()=>{
 const store=await setup();try{await record(store,'deep-match','resources',{title:'Long guide',content:'x'.repeat(5000)+'needle evidence'});const result=await tools(store).execute('search_knowledge',{query:'needle'});assert.match(result.items[0].snippet,/needle evidence/);assert.equal(result.nextOffset,null);}finally{await store.close();}
});
test('reply tool pagination can fully read long cited knowledge before it becomes ready',async()=>{
 const store=await setup();try{await record(store,'customer','inquiries',{title:'PCB',content:'PCB'});await record(store,'long-kb','resources',{title:'PCB',content:'PCB '+'x'.repeat(15000)});let round=0;
 const run=await runAgent(store,key,{action:'reply',inquiryId:'customer'},{request:async()=>round++===0?response('glm-5.3-flash',{toolCalls:[{name:'read_record',arguments:{id:'long-kb',offset:12000,maxChars:12000}}]}):response('glm-5.3-flash',{summary:'draft',reply:{subject:'PCB',body:'draft',sourceIds:['long-kb'],missingInfo:[],isInquiry:true,readyToSend:true}})});assert.equal(run.reply.readyToSend,true);assert.equal(run.coverage.records.find(row=>row.id==='long-kb').complete,true);}finally{await store.close();}
});


test('project knowledge search includes global shared records and excludes another project',async()=>{
 const store=await setup();try{await record(store,'project-kb','resources',{title:'PCB',content:'PCB',projectId:'project-a'});await record(store,'shared-kb','notes',{title:'PCB',content:'PCB',site:'',projectId:''});await record(store,'other-kb','resources',{title:'PCB',content:'PCB',projectId:'project-b'});await record(store,'other-site-kb','resources',{title:'PCB',content:'PCB',site:'apexcomponent.com',projectId:'project-a'});
 const result=await tools(store,{site:'globalwellpcb.com',projectId:'project-a'}).execute('search_knowledge',{query:'PCB'});assert.deepEqual(result.items.map(row=>row.id).sort(),['project-kb','shared-kb']);}finally{await store.close();}
});
test('daily event journal IDs cannot be fabricated into record citations',async()=>{
 const store=await setup();try{await record(store,'done-task','tasks',{status:'done',completedAt:'2026-10-07T17:00:00Z'});const api=tools(store),result=await api.execute('daily_overview',{date:'2026-10-08'});assert.ok(result.events.length>0);assert.ok(api.evidence.has('done-task'));for(const event of result.events)assert.equal(api.evidence.has(event.id),false);assert.ok(!JSON.stringify(result.events).includes('PCB capability copper assembly'));}finally{await store.close();}
});
test('a scoped reply can retrieve global knowledge and cannot widen scope in later model turns',async()=>{
 const store=await setup();try{await record(store,'customer','inquiries',{title:'PCB',content:'PCB',projectId:'project-a'});await record(store,'shared','resources',{title:'PCB',content:'PCB',site:'',projectId:''});const run=await runAgent(store,key,{action:'reply',inquiryId:'customer',site:'globalwellpcb.com',projectId:'project-a'},{request:async()=>response('glm-5.3-flash',{summary:'draft',reply:{subject:'PCB',body:'draft',sourceIds:['shared'],missingInfo:[],isInquiry:true,readyToSend:true}})});assert.equal(run.reply.readyToSend,true);
 await assert.rejects(runAgent(store,key,{action:'custom',site:'globalwellpcb.com',projectId:'project-a'},{request:async()=>response('glm-5.3-flash',{toolCalls:[{name:'list_records',arguments:{kind:'tasks',projectId:''}}]})}),/范围/);}finally{await store.close();}
});
test('missing Get note body fetches trusted detail, while external errors are sanitized',async()=>{
 const store=await setup();try{await store.saveSource({id:'get-source',name:'Get',type:'get',enabled:true,secret:'sealed-private',site:'globalwellpcb.com'});await record(store,'note','notes',{content:'',sourceId:'get-source',externalId:'note-external'});const api=tools(store,{readExternal:async(source,row)=>{assert.equal(source.id,'get-source');assert.equal(row.externalId,'note-external');return {content:'Verified note detail'};}});assert.equal((await api.execute('read_record',{id:'note'})).content,'Verified note detail');await record(store,'note-fail','notes',{content:'',sourceId:'get-source',externalId:'note-fail'});const failing=tools(store,{readExternal:async()=>{throw new Error('sealed-private');}});await assert.rejects(failing.execute('read_record',{id:'note-fail'}),error=>!error.message.includes('sealed-private')&&/详情/.test(error.message));}finally{await store.close();}
});
test('reply action rejects a final summary without a usable reply draft',async()=>{
 const store=await setup();try{await record(store,'customer','mic',{title:'PCB',content:'PCB'});await assert.rejects(runAgent(store,key,{action:'reply',inquiryId:'customer'},{request:async()=>response('glm-5.3-flash',{summary:'Only analysis',tasks:[]})}),/回复/);assert.equal((await store.listRuns()).length,0);}finally{await store.close();}
});
test('parseProposal validates supplied citation evidence instead of trusting model IDs',()=>{
 assert.throws(()=>parseProposal('{"summary":"x","sourceIds":["source-id"]}',new Map()),/引用|来源/);
});


test('an inquiry with no available body cannot qualify a reply as ready',async()=>{
 const store=await setup();try{await record(store,'customer-empty','inquiries',{title:'PCB',content:''});await record(store,'knowledge','resources',{title:'PCB',content:'PCB verified guidance'});const run=await runAgent(store,key,{action:'reply',inquiryId:'customer-empty'},{request:async()=>response('glm-5.3-flash',{summary:'draft',reply:{subject:'PCB',body:'draft',sourceIds:['knowledge'],missingInfo:[],isInquiry:true,readyToSend:true}})});assert.equal(run.reply.readyToSend,false);}finally{await store.close();}
});


test('scoped knowledge reads permit either blank shared dimension while rejecting conflicting assignments',async()=>{
 const store=await setup();try{
  await record(store,'shared-site','resources',{site:'',projectId:'project-a',title:'PCB',content:'PCB verified shared site guidance'});
  await record(store,'shared-project','notes',{site:'globalwellpcb.com',projectId:'',title:'PCB',content:'PCB verified shared project guidance'});
  await record(store,'wrong-shared-site','resources',{site:'',projectId:'project-b',title:'PCB',content:'PCB'});
  await record(store,'wrong-shared-project','notes',{site:'apexcomponent.com',projectId:'',title:'PCB',content:'PCB'});
  const api=tools(store,{site:'globalwellpcb.com',projectId:'project-a'}),matches=await api.execute('search_knowledge',{query:'PCB'});
  assert.deepEqual(matches.items.map(row=>row.id).sort(),['shared-project','shared-site']);
  for(const id of ['shared-site','shared-project']){const result=await api.execute('read_record',{id});assert.equal(result.id,id);assert.equal(api.evidence.get(id).complete,true);}
  for(const id of ['wrong-shared-site','wrong-shared-project'])await assert.rejects(api.execute('read_record',{id}),/范围/);
 }finally{await store.close();}
});
test('scoped reply reads and cites knowledge shared in either site or project without aborting',async()=>{
 const store=await setup();try{
  await record(store,'scoped-customer','inquiries',{site:'globalwellpcb.com',projectId:'project-a',title:'PCB',content:'PCB'});
  await record(store,'partial-site','resources',{site:'',projectId:'project-a',title:'PCB',content:'PCB verified site guidance'});
  await record(store,'partial-project','notes',{site:'globalwellpcb.com',projectId:'',title:'PCB',content:'PCB verified project guidance'});
  const run=await runAgent(store,key,{action:'reply',inquiryId:'scoped-customer',site:'globalwellpcb.com',projectId:'project-a'},{request:async()=>response('glm-5.3-flash',{summary:'draft',reply:{subject:'PCB',body:'draft',sourceIds:['partial-site','partial-project'],missingInfo:[],isInquiry:true,readyToSend:true}})});
  assert.equal(run.reply.readyToSend,true);assert.deepEqual(run.reply.sourceIds,['partial-site','partial-project']);assert.equal(run.coverage.records.filter(row=>row.complete).length,3);
 }finally{await store.close();}
});
