import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {openStore} from '../server/db.mjs';
import {seal,hashPassword} from '../server/security.mjs';
import {requestJSON} from '../server/network.mjs';
import * as host from '../server/hostinger-mail.mjs';
const replies=await import('../server/replies.mjs').catch(()=>({}));
const key='b'.repeat(64),token='fake-mail-token';
const src={id:'box',name:'PCB Mail',type:'hostinger',site:'globalwellpcb.com',enabled:true,config:{mailboxId:'ACtest',user:'info@globalwellpcb.com',folder:'INBOX'},secret:seal(token,key,'box')};
async function fixture(){
 const store=await openStore({dialect:'sqlite'});
 await store.saveSource(src);
 await store.save({id:'mail',kind:'inquiries',status:'new',site:src.site,title:'PCB RFQ',sender:'Buyer <buyer@example.com>',content:'Please confirm PCB files needed.',sourceId:'box',externalId:'hostinger:ACtest:INBOX:41',receivedAt:new Date().toISOString(),mailbox:src.config.user},0);
 return store;
}
async function draft(store,extra={}){
 return store.saveReply({inquiryId:'mail',sourceId:'box',from:src.config.user,to:'buyer@example.com',subject:'Re: PCB RFQ',body:'Please provide Gerber files.',sourceIds:['kb'],missingInfo:[],readyToSend:true,isInquiry:true,status:'draft',...extra},0);
}
function provider(calls,fail=false){return async(url,options)=>{
 calls.push({url,options});assert.equal(options.headers.Authorization,'Bearer '+token);
 if(url.endsWith('/me'))return {data:{mailboxes:[{resourceId:'ACtest',address:src.config.user}]}};
 if(url.endsWith('/send')){if(fail)throw Object.assign(new Error('lost response'),{code:'NETWORK_ERROR'});return null;}
 return {data:{text:'Please confirm PCB files needed.'}};
};}
test('a successful empty 204 response is accepted without parsing JSON or replaying POST',async()=>{
 let sent=0;
 const result=await requestJSON('https://mail.example/send',{method:'POST',body:{text:'reply'}},{resolve:async()=>[{address:'93.184.216.34',family:4}],send:(_url,_options,cb)=>{
  const req=new EventEmitter();req.write=()=>{};req.destroy=e=>queueMicrotask(()=>req.emit('error',e));req.end=()=>queueMicrotask(()=>{sent++;const res=new EventEmitter();res.statusCode=204;res.headers={};cb(res);res.emit('end');});return req;
 }});
 assert.equal(result,null);assert.equal(sent,1);
});
test('Hostinger reply sends to one original recipient with native UID threading and enforces mailbox scope',async()=>{
 assert.equal(typeof host.sendHostingerReply,'function','mail sending adapter is required');
 const calls=[],message={to:'buyer@example.com',subject:'Re: PCB RFQ',body:'Please provide Gerber files.'};
 await host.sendHostingerReply(src,token,'hostinger:ACtest:INBOX:41',message,{request:provider(calls)});
 const send=calls.find(c=>c.url.endsWith('/send'));assert.ok(send);
 assert.deepEqual(send.options.body,{to:['buyer@example.com'],subject:message.subject,text:message.body,inReplyTo:{uid:41,folder:'INBOX'}});
 await assert.rejects(host.sendHostingerReply(src,token,'hostinger:Other:INBOX:41',message,{request:provider([])}),/范围|邮件/);
 await assert.rejects(host.sendHostingerReply(src,token,'hostinger:ACtest:INBOX:41',{...message,to:'a@example.com,b@example.com'},{request:provider([])}),/收件|格式/);
});
test('manual sending claims once, binds sender/recipient, and persists the provider result',async()=>{
 assert.equal(typeof replies.sendReply,'function','reply service is required');
 const s=await fixture();try{const d=await draft(s),calls=[];
  const sent=await replies.sendReply(s,key,'mail',{version:d.version},{request:provider(calls)});
  assert.equal(sent.status,'sent');assert.ok(sent.sentAt>0);
  await assert.rejects(replies.sendReply(s,key,'mail',{version:d.version},{request:provider(calls)}));
  assert.equal(calls.filter(c=>c.url.endsWith('/send')).length,1);
 }finally{await s.close();}
});
test('an unknown delivery result prevents re-edit, retry and duplicate sends',async()=>{
 assert.equal(typeof replies.sendReply,'function');const s=await fixture();
 try{const d=await draft(s),calls=[];await assert.rejects(replies.sendReply(s,key,'mail',{version:d.version},{request:provider(calls,true)}),/核对|不明确/);
  const result=await s.getReply('mail');assert.equal(result.status,'uncertain');
  await assert.rejects(s.saveReply({...result,status:'draft'},result.version));
  await assert.rejects(replies.sendReply(s,key,'mail',{version:result.version},{request:provider(calls)}));
  assert.equal(calls.filter(c=>c.url.endsWith('/send')).length,1);
 }finally{await s.close();}
});
test('changing the stored recipient cannot redirect a reply away from its original inquiry',async()=>{
 assert.equal(typeof replies.sendReply,'function');const s=await fixture();try{
  const d=await draft(s,{to:'other@example.com'}),calls=[];await assert.rejects(replies.sendReply(s,key,'mail',{version:d.version},{request:provider(calls)}),/收件|询盘/);
  assert.equal(calls.length,0);
 }finally{await s.close();}
});
test('automation is off by default, excludes history and robot mail, and requires scoped inquiry keywords',()=>{
 assert.equal(typeof replies.autoEligible,'function');
 const now=Date.parse('2026-10-08T03:00:00Z'),rule={enabled:true,enabledAt:now-1000,sourceIds:['box'],matchTerms:['pcb'],maxPerDay:5};
 const mail={sourceId:'box',status:'new',title:'PCB quote',sender:'buyer@example.com',receivedAt:new Date(now).toISOString()};
 assert.equal(replies.autoEligible(mail,src,rule,now),true);
 for(const changed of [{receivedAt:new Date(now-2000).toISOString()},{status:'archived'},{sender:'no-reply@example.com'},{title:'Re: PCB quote'},{title:'Weekly newsletter'},{autoGenerated:true},{sourceId:'other'},{sender:src.config.user}]){
  assert.equal(replies.autoEligible({...mail,...changed},src,rule,now),false);
 }
 assert.equal(replies.autoEligible(mail,src,{...rule,enabled:false},now),false);
});
test('automatic sends stop if owner disables or changes the rule after drafting',async()=>{
 assert.equal(typeof replies.sendReply,'function');const s=await fixture();try{
  const rule={enabled:true,enabledAt:Date.now()-1000,sourceIds:['box'],matchTerms:['pcb'],maxPerDay:5,instructions:''};
  await s.setSetting('agent-automation',rule);
  const d=await draft(s,{automatic:true,policyHash:replies.automationHash(rule)});
  await s.setSetting('agent-automation',{...rule,enabled:false});
  const calls=[];await assert.rejects(replies.sendReply(s,key,'mail',{version:d.version,automatic:true},{request:provider(calls)}),/自动|规则|暂停/);
  assert.equal(calls.length,0);
 }finally{await s.close();}
});
test('automatic processing saves unsupported answers as drafts and never sends them',async()=>{
 assert.equal(typeof replies.runAutoReplies,'function');const s=await fixture();
 try{const rule={enabled:true,enabledAt:Date.now()-1000,sourceIds:['box'],matchTerms:['pcb'],maxPerDay:5,instructions:''};
  await s.setSetting('agent-automation',rule);const calls=[];
  const result=await replies.runAutoReplies(s,key,{request:provider(calls),generate:async(store,_key,input)=>{
    assert.equal(input.inquiryId,'mail');return store.saveReply({inquiryId:'mail',sourceId:'box',from:src.config.user,to:'buyer@example.com',subject:'Re: PCB RFQ',body:'Please provide files.',sourceIds:[],missingInfo:['知识库未明确'],readyToSend:false,isInquiry:true,automatic:true,policyHash:replies.automationHash(rule),status:'draft'},0);
  }});
  assert.equal((await s.getReply('mail')).status,'draft');assert.equal(result.sent,0);assert.equal(calls.filter(c=>c.url.endsWith('/send')).length,0);
  await replies.runAutoReplies(s,key,{request:provider(calls),generate:async()=>{throw new Error('must not regenerate saved draft');}});
 }finally{await s.close();}
});

test('a ready automatic inquiry is sent once and remains reserved across later checks',async()=>{
 const s=await fixture();try{
  await s.save({id:'kb',kind:'resources',site:'globalwellpcb.com',title:'RFQ requirements',status:'new',content:'Please provide Gerber files.'},0);
  const rule={enabled:true,enabledAt:Date.now()-1000,sourceIds:['box'],matchTerms:['pcb'],maxPerDay:5,instructions:''};
  await s.setSetting('agent-automation',rule);const calls=[];
  const result=await replies.runAutoReplies(s,key,{request:provider(calls),generate:async(store,_key,input)=>evaluatedDraft(store,{policyHash:input.policyHash})});
  assert.equal(result.sent,1);assert.equal((await s.getReply('mail')).status,'sent');
  await replies.runAutoReplies(s,key,{request:provider(calls),generate:async()=>{throw new Error('already sent');}});
  assert.equal(calls.filter(c=>c.url.endsWith('/send')).length,1);
 }finally{await s.close();}
});
test('new metadata-only mail is read before applying body matching rules',async()=>{
 const s=await fixture();try{
  const mail=await s.get('mail');await s.save({...mail,title:'Hello',content:''},mail.version);
  const rule={enabled:true,enabledAt:Date.now()-1000,sourceIds:['box'],matchTerms:['pcb'],maxPerDay:5,instructions:''};
  await s.setSetting('agent-automation',rule);const calls=[];
  const result=await replies.runAutoReplies(s,key,{request:provider(calls),generate:async(store,_key,input)=>draft(store,{automatic:true,policyHash:input.policyHash,readyToSend:false,missingInfo:['need review']})});
  assert.equal(result.processed,1);assert.match((await s.get('mail')).content,/PCB/);assert.ok(calls.some(c=>c.url.endsWith('/text')));assert.equal(result.sent,0);
 }finally{await s.close();}
});
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
async function evaluatedDraft(store,{request,...input}={}){
 if(!await store.get('kb'))await store.save({id:'kb',kind:'resources',site:src.site,title:'PCB RFQ requirements',status:'new',content:'PCB RFQ requires Gerber files.'},0);
 await store.setSetting('agent',{endpoint:'https://api.example.com/v1',model:'fixture',secret:seal('fake-agent-key',key,'agent')});
 const rule=await store.getSetting('agent-automation')||{enabled:true,enabledAt:Date.now()-1000,sourceIds:['box'],matchTerms:['pcb'],maxPerDay:5,instructions:''};
 await store.setSetting('agent-automation',rule);
 return replies.createReply(store,key,{inquiryId:'mail',automatic:true,prompt:'RFQ',policyHash:replies.automationHash(rule),...input},{agentRequest:request||(async()=>({choices:[{message:{content:JSON.stringify({summary:'draft',reply:{subject:'Re: PCB RFQ',body:'Please provide Gerber files.',sourceIds:['kb'],missingInfo:[],readyToSend:true,isInquiry:true}})}}]}))});
}
async function reviseMail(store,changes){const row=await store.get('mail');return store.save({...row,...changes},row.version);}
const sendChanges={
 sender:s=>reviseMail(s,{sender:'corrected@example.com'}),
 body:s=>reviseMail(s,{content:'Revised PCB inquiry requiring different files.'}),
 truncation:s=>reviseMail(s,{truncated:true}),
 uid:s=>reviseMail(s,{externalId:'hostinger:ACtest:INBOX:42'}),
 mailbox:async s=>s.saveSource({...await s.getSource('box'),config:{...src.config,mailboxId:'Other'}}),
 folder:async s=>s.saveSource({...await s.getSource('box'),config:{...src.config,folder:'Archive'}}),
 sourceSender:async s=>s.saveSource({...await s.getSource('box'),config:{...src.config,user:'other@globalwellpcb.com'}}),
 sourceIdentity:async s=>{await s.saveSource({...src,id:'replacement',secret:seal(token,key,'replacement')});return reviseMail(s,{sourceId:'replacement'});},
 knowledge:async s=>{const row=await s.get('kb');return s.save({...row,content:'PCB RFQ now needs a BOM.'},row.version);},
};
for(const [name,change] of Object.entries(sendChanges))test('automatic send revalidates '+name+' while provider authorization waits',async()=>{
 const s=await fixture();try{
  const d=await evaluatedDraft(s),entered=deferred(),resume=deferred(),calls=[];assert.equal(d.readyToSend,true);
  const send=replies.sendReply(s,key,'mail',{version:d.version,automatic:true},{request:async(url,options)=>{if(url.endsWith('/me')){entered.resolve();await resume.promise;}return provider(calls)(url,options);}});
  await entered.promise;await change(s);resume.resolve();await assert.rejects(send,/未发送/);
  assert.equal(calls.filter(c=>c.url.endsWith('/send')).length,0);assert.equal((await s.getReply('mail')).status,'failed');
 }finally{await s.close();}
});
test('read markers and synchronization metadata do not invalidate evaluated automatic replies',async()=>{
 const s=await fixture();try{const d=await evaluatedDraft(s),entered=deferred(),resume=deferred(),calls=[];
  const send=replies.sendReply(s,key,'mail',{version:d.version,automatic:true},{request:async(url,options)=>{if(url.endsWith('/me')){entered.resolve();await resume.promise;}return provider(calls)(url,options);}});
  await entered.promise;await reviseMail(s,{readAt:Date.now()});await s.saveSource({...await s.getSource('box'),state:{lastSuccess:Date.now()},nextRun:Date.now()+10000});
  const kb=await s.get('kb');await s.save({...kb,readAt:Date.now()},kb.version);resume.resolve();assert.equal((await send).status,'sent');assert.equal(calls.filter(c=>c.url.endsWith('/send')).length,1);
 }finally{await s.close();}
});
for(const name of ['sender','body','truncation','mailbox','knowledge'])test('a '+name+' change during model generation requires reevaluation',async()=>{
 const s=await fixture();try{const entered=deferred(),resume=deferred();
  const pending=evaluatedDraft(s,{request:async()=>{entered.resolve();await resume.promise;return {choices:[{message:{content:JSON.stringify({summary:'draft',reply:{subject:'Re: PCB RFQ',body:'Please provide Gerber files.',sourceIds:['kb'],missingInfo:[],readyToSend:true,isInquiry:true}})}}]};}});
  await entered.promise;await sendChanges[name](s);resume.resolve();const d=await pending;
  assert.equal(d.readyToSend,false);assert.ok(d.missingInfo.length);const calls=[];await assert.rejects(replies.sendReply(s,key,'mail',{version:d.version,automatic:true},{request:provider(calls)}));assert.equal(calls.length,0);
 }finally{await s.close();}
});
test('manual sending also revalidates the captured outgoing recipient after authorization waits',async()=>{
 const s=await fixture();try{const d=await draft(s),entered=deferred(),resume=deferred(),calls=[];
  const send=replies.sendReply(s,key,'mail',{version:d.version},{request:async(url,options)=>{if(url.endsWith('/me')){entered.resolve();await resume.promise;}return provider(calls)(url,options);}});
  await entered.promise;await sendChanges.sender(s);resume.resolve();await assert.rejects(send,/未发送/);assert.equal(calls.filter(c=>c.url.endsWith('/send')).length,0);
 }finally{await s.close();}
});
