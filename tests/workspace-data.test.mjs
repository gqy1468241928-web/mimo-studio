import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {spawn} from 'node:child_process';
import {openStore} from '../server/db.mjs';
const data=await import('../server/workspace-data.mjs').catch(()=>({}));
const rec=(id,kind='tasks',extra={})=>({id,kind,title:id,site:'',status:'todo',...extra});
async function using(fn){const s=await openStore({dialect:'sqlite'});try{await fn(s);}finally{await s.close();}}
async function handles(fn){const dir=await mkdtemp(join(tmpdir(),'mimo-store-')),filename=join(dir,'db.sqlite');const a=await openStore({dialect:'sqlite',filename}),b=await openStore({dialect:'sqlite',filename});try{await fn(a,b,filename);}finally{await a.close();await b.close();await rm(dir,{recursive:true,force:true});}}
const reply=(id,extra={})=>({inquiryId:id,sourceId:'mail',subject:'Re: RFQ',body:'Hello',from:'sales@example.com',to:'buyer@example.com',sourceIds:['kb'],missingInfo:[],readyToSend:true,isInquiry:true,model:'fixture',...extra});
test('all-status pagination and project filter include archive without changing history',()=>using(async s=>{
 for(const [id,status,projectId] of [['a','todo','p'],['b','done','p'],['c','archived','p'],['d','todo','q']])await s.save(rec(id,'tasks',{status,projectId}),0);
 assert.equal((await s.list('tasks',{includeArchived:true,projectId:'p',limit:1})).total,3);
 const ids=[];for(let offset=0;offset<3;offset++)ids.push((await s.list('tasks',{includeArchived:true,projectId:'p',limit:1,offset})).items[0].id);
 assert.deepEqual(new Set(ids),new Set(['a','b','c']));assert.equal((await s.list('tasks',{history:true})).total,1);assert.equal((await s.list('tasks')).total,3);
}));
test('task completion timestamps and journal survive restore archive and deletion',()=>using(async s=>{
 let task=await s.save(rec('t'),0);task=await s.save({...task,status:'done'},task.version);assert.ok(task.completedAt);
 const completedAt=task.completedAt;task=await s.save({...task,title:'Updated'},task.version);assert.equal(task.completedAt,completedAt);
 task=await s.save({...task,status:'todo'},task.version);assert.equal(task.completedAt,undefined);
 task=await s.save({...task,status:'archived'},task.version);await s.remove(task.id,task.version);
 const events=(await s.listEvents({from:0,to:Date.now()+1000})).items;
 assert.equal(events.filter(e=>e.type==='task_completed').length,1);assert.ok(events.some(e=>e.type==='record_deleted'));assert.ok(events.every(e=>e.recordId==='t'&&e.kind==='tasks'));
 assert.equal((await s.listEvents({from:events[0].at,to:events[0].at})).total,0);
}));
test('identical external refresh is not a modification or version change',()=>using(async s=>{
 const external=rec('mail','inquiries',{status:'new',receivedAt:'2026-10-08T00:00:00Z',content:'body'});const first=await s.upsertExternal(external);const next=await s.upsertExternal(external);
 assert.equal(next.version,first.version);assert.equal((await s.listEvents({from:0,to:Date.now()+1000})).total,1);
}));
test('Shanghai windows validate actual calendar dates and exclusive end',()=>{
 assert.equal(typeof data.dayWindow,'function');assert.deepEqual(data.dayWindow('2026-10-08'),{date:'2026-10-08',timeZone:'Asia/Shanghai',start:1791388800000,end:1791475200000});
 for(const date of ['2026-02-29','2026-13-01','2026-10-8','invalid'])assert.throws(()=>data.dayWindow(date));
 assert.equal(data.dayWindow('2024-02-29').end-data.dayWindow('2024-02-29').start,86400000);
});
test('overview uses original dates with archive and reports legacy unknown completion',()=>handles(async(s,b,filename)=>{
 assert.equal(typeof data.dailyOverview,'function');
 await s.save(rec('planned','tasks',{due:'2026-10-08',projectId:'p'}),0);
 await s.save(rec('at-start','articles',{status:'published',publishedAt:'2026-10-07T16:00:00Z',projectId:'p'}),0);
 await s.save(rec('at-end','articles',{status:'published',publishedAt:'2026-10-08T16:00:00Z',projectId:'p'}),0);
 await s.save(rec('old','articles',{status:'published',publishedAt:'2020-01-01',projectId:'p'}),0);
 await s.save(rec('invalid','articles',{status:'published',publishedAt:'bad',projectId:'p'}),0);
 await s.save(rec('archived','inquiries',{status:'archived',receivedAt:'2026-10-08T00:00:00Z',projectId:'p'}),0);
 const raw=new DatabaseSync(filename);raw.prepare('INSERT INTO wb_records VALUES(?,?,?,?,?,?,?,?,?)').run('legacy','tasks','','done','Legacy',JSON.stringify(rec('legacy','tasks',{status:'done',projectId:'p'})),1,1,1);raw.close();
 const legacy=await s.get('legacy');await s.save({...legacy,title:'Legacy edited'},legacy.version);assert.equal((await s.get('legacy')).completedAt,undefined);
 await s.saveSource({id:'secret-source',type:'api',name:'Source',enabled:true,site:'',config:{key:'TOPSECRET'},secret:'TOPSECRET',state:{lastSuccess:100,lastAttempt:200,error:'failed https://example.com?key=TOPSECRET',remaining:8,hasMore:true}});
 const overview=await data.dailyOverview(s,{date:'2026-10-08',projectId:'p'});
 assert.deepEqual(overview.articles.map(r=>r.id),['at-start']);assert.deepEqual(overview.inquiries.map(r=>r.id),['archived']);assert.equal(overview.counts.unknownCompleted,1);assert.equal(overview.counts.planned,1);
 assert.equal(overview.coverage.missingDates.articles,1);assert.equal(overview.sources[0].remaining,8);assert.equal(JSON.stringify(overview).includes('TOPSECRET'),false);
}));
test('overview reads every page and exposes capped arrays without hiding counts',()=>using(async s=>{
 assert.equal(typeof data.dailyOverview,'function');for(let i=0;i<112;i++)await s.save(rec('task-'+i,'tasks',{due:'2026-10-08',status:i%2?'archived':'todo'}),0);
 const result=await data.dailyOverview(s,{date:'2026-10-08'});assert.equal(result.counts.planned,112);assert.equal(result.plans.length,100);assert.equal(result.coverage.omitted.plans,12);
}));
test('knowledge searches the full shared archived set and paginates real matches',()=>using(async s=>{
 assert.equal(typeof data.searchKnowledge,'function');for(let i=0;i<45;i++)await s.save(rec('kb-'+i,'resources',{status:i%2?'archived':'active',site:i%3?'':'site-a',title:'MOSFET selection '+i,content:'PCB impedance 阻抗'.repeat(300)}),0);
 await s.save(rec('other','notes',{site:'site-b',title:'MOSFET'}),0);await s.save(rec('irrelevant','notes',{title:'Most ordinary notes'}),0);
 const result=await data.searchKnowledge(s,{query:'MOSFET',site:'site-a',limit:10,offset:30});assert.equal(result.total,45);assert.equal(result.items.length,10);assert.ok(result.items.every(i=>i.id.startsWith('kb-')&&i.snippet.length<=2500));
 assert.equal((await data.searchKnowledge(s,{query:'阻抗',site:'site-a'})).total,45);assert.equal((await data.searchKnowledge(s,{query:'mosfet nonexistent',site:'site-a'})).total,0);
 assert.equal((await data.searchKnowledge(s,{site:'site-a',limit:100})).total,46);
}));
test('reply versions reject stale edits and persist immutable attempted sends',()=>using(async s=>{
 assert.equal(typeof s.saveReply,'function');const draft=await s.saveReply(reply('i'),0);assert.equal(draft.version,1);assert.equal(draft.status,'draft');
 await assert.rejects(s.saveReply(reply('i'),0));const updated=await s.saveReply({...draft,body:'Updated'},1);const claim=await s.claimReply('i',updated.version);
 assert.equal(claim.reply.status,'sending');assert.ok(claim.reply.attemptedAt);await assert.rejects(s.saveReply({...updated,body:'Replace'},updated.version));await assert.rejects(s.claimReply('i',claim.reply.version));
 await assert.rejects(s.finishReply('i','wrong',{status:'sent'}));const sent=await s.finishReply('i',claim.lease,{status:'sent',providerId:'p-id'});assert.ok(sent.sentAt);assert.equal(sent.providerId,'p-id');
 await assert.rejects(s.finishReply('i',claim.lease,{status:'failed'}));await assert.rejects(s.saveReply({...sent,status:'draft'},sent.version));
 assert.equal((await s.listReplies({status:'sent',inquiryId:'i'})).total,1);assert.equal((await s.listEvents({from:0,to:Date.now()+1000})).items.filter(e=>e.type==='mail_reply_sent').length,1);
}));
test('different DB handles allow only one simultaneous claim of a reply',()=>handles(async(a,b)=>{
 assert.equal(typeof a.saveReply,'function');const draft=await a.saveReply(reply('one'),0);const claims=await Promise.allSettled([a.claimReply('one',draft.version),b.claimReply('one',draft.version)]);assert.equal(claims.filter(r=>r.status==='fulfilled').length,1);assert.equal((await b.getReply('one')).status,'sending');
}));
test('automatic quota is shared across handles and uncertain sends retain their slot',()=>handles(async(a,b)=>{
 assert.equal(typeof a.saveReply,'function');for(const id of ['one','two','three'])await a.saveReply(reply(id),0);
 const claims=await Promise.allSettled([a.claimReply('one',1,{automatic:true,dayStart:0,maxPerDay:1}),b.claimReply('two',1,{automatic:true,dayStart:0,maxPerDay:1})]);assert.equal(claims.filter(r=>r.status==='fulfilled').length,1);
 const won=claims.find(r=>r.status==='fulfilled').value;await a.finishReply(won.reply.inquiryId,won.lease,{status:'uncertain',error:'timeout'});
 await assert.rejects(b.claimReply('three',1,{automatic:true,dayStart:0,maxPerDay:1}));await assert.rejects(a.saveReply({...won.reply,status:'draft'},won.reply.version+1));
 assert.equal((await b.listReplies({automatic:true,from:0})).total,1);
 const manual=await b.claimReply('three',1,{automatic:false});assert.equal(manual.reply.status,'sending');
}));
test('persisted jobs release only a matching token and expire across handles',()=>handles(async(a,b)=>{
 assert.equal(typeof a.claimJob,'function');const token=await a.claimJob('job',1000,100);assert.ok(token);assert.equal(await b.claimJob('job',1001,100),null);
 await b.releaseJob('job','wrong');assert.equal(await b.claimJob('job',1002,100),null);assert.ok(await b.claimJob('job',1100,100));await a.releaseJob('job',token);assert.equal(await a.claimJob('job',1101,100),null);
 assert.equal((await a.listSources()).length,0);
}));

test('record and journal write roll back together when journaling fails',()=>handles(async(a,b,filename)=>{
 const raw=new DatabaseSync(filename);raw.exec("CREATE TRIGGER deny_event BEFORE INSERT ON wb_events BEGIN SELECT RAISE(ABORT,'event-write-denied'); END");
 try{await assert.rejects(a.save(rec('atomic'),0),/event-write-denied/);assert.equal(await b.get('atomic'),null);assert.equal((await a.listEvents()).total,0);}finally{raw.exec('DROP TRIGGER deny_event');raw.close();}
 const task=await a.save(rec('atomic'),0);const journal=new DatabaseSync(filename);journal.exec("CREATE TRIGGER deny_event BEFORE INSERT ON wb_events BEGIN SELECT RAISE(ABORT,'event-write-denied'); END");
 try{await assert.rejects(a.save({...task,status:'done'},task.version));assert.equal((await b.get('atomic')).status,'todo');assert.equal((await a.listEvents()).total,1);}finally{journal.close();}
}));
test('daily completion includes restored and deleted tasks from the persisted journal',()=>handles(async(a,b,filename)=>{
 const raw=new DatabaseSync(filename);const at=1791388800000;
 const rows=[['restored','todo'],['deleted','todo'],['new-done','done']];
 for(const [id,status] of rows){const value=rec(id,'tasks',{status,completedAt:status==='done'?at:undefined});raw.prepare('INSERT INTO wb_records VALUES(?,?,?,?,?,?,?,?,?)').run(id,'tasks','',''+status,id,JSON.stringify(value),1,at,at);const event={id:'event-'+id,recordId:id,kind:'tasks',site:'',projectId:'',title:id,type:'task_completed',at};raw.prepare('INSERT INTO wb_events VALUES(?,?,?,?,?,?,?,?)').run(event.id,id,'tasks','','',event.type,at,JSON.stringify(event));}
 raw.prepare('DELETE FROM wb_records WHERE id=?').run('deleted');raw.close();
 const result=await data.dailyOverview(a,{date:'2026-10-08'});assert.equal(result.counts.completed,3);assert.equal(result.counts.unplanned,3-1);assert.ok(result.completed.some(t=>t.id==='deleted'&&t.deleted));assert.ok(result.completed.some(t=>t.id==='restored'&&t.status==='todo'));
}));
test('created-done task completes once and stale mutation produces no new event',()=>using(async s=>{
 const task=await s.save(rec('done','tasks',{status:'done'}),0);assert.ok(task.completedAt);assert.equal((await s.listEvents()).items.filter(e=>e.type==='task_completed').length,1);
 await assert.rejects(s.save({...task,status:'todo'},0));assert.equal((await s.get('done')).status,'done');assert.equal((await s.listEvents()).total,2);
}));
test('independent Node processes share the persisted automatic quota',()=>handles(async(a,b,filename)=>{
 for(const id of ['proc-a','proc-b'])await a.saveReply(reply(id),0);
 const url=new URL('../server/db.mjs',import.meta.url).href;
 const run=id=>new Promise((resolve,reject)=>{
  const script="import {openStore} from "+JSON.stringify(url)+";const s=await openStore({dialect:'sqlite',filename:process.argv[1]});try{await s.claimReply(process.argv[2],1,{automatic:true,dayStart:0,maxPerDay:1});process.stdout.write('claimed');}catch(e){if(e.status!==429)throw e;process.stdout.write('quota');}finally{await s.close();}";
  const child=spawn(process.execPath,['--input-type=module','-e',script,filename,id],{windowsHide:true});let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('error',reject);child.on('close',code=>code?reject(new Error(err)):resolve(out));
 });
 const outputs=await Promise.all([run('proc-a'),run('proc-b')]);assert.deepEqual(outputs.sort(),['claimed','quota']);assert.equal((await a.listReplies({status:'sending'})).total,1);
}));
test('failed sends can be revised but uncertainty cannot become a new automatic attempt',()=>using(async s=>{
 const first=await s.saveReply(reply('retry'),0),claim=await s.claimReply('retry',first.version);const failed=await s.finishReply('retry',claim.lease,{status:'failed',error:'offline'});
 const revised=await s.saveReply({...failed,status:'draft',body:'Edited'},failed.version);assert.equal(revised.status,'draft');assert.equal(revised.body,'Edited');
}));
test('project-scoped knowledge includes shared resources and excludes other project knowledge',()=>using(async s=>{
 for(const [id,site,projectId] of [['global','',''],['project','site-a','p'],['other-project','site-a','q'],['other-site','site-b','']])await s.save(rec(id,'resources',{title:'RFQ capability',site,projectId,status:'archived'}),0);
 const result=await data.searchKnowledge(s,{query:'RFQ',site:'site-a',projectId:'p'});assert.deepEqual(new Set(result.items.map(r=>r.id)),new Set(['global','project']));assert.equal(result.total,2);
}));
test('sent reply journal uses readable subject and original inquiry fallback with scope',()=>using(async s=>{
 for(const [id,subject,expectedTitle] of [['named','Re: PCB RFQ','Re: PCB RFQ'],['fallback','','Original PCB inquiry']]){
  await s.save(rec(id,'inquiries',{site:'site-a',projectId:'p',status:'new',title:'Original PCB inquiry',receivedAt:'2026-10-08T00:00:00Z'}),0);
  const draft=await s.saveReply(reply(id,{subject}),0),claim=await s.claimReply(id,draft.version);await s.finishReply(id,claim.lease,{status:'sent'});
  const event=(await s.listEvents({site:'site-a',projectId:'p'})).items.find(e=>e.type==='mail_reply_sent'&&e.recordId===id);
  assert.equal(event.title,expectedTitle);assert.equal(event.site,'site-a');assert.equal(event.projectId,'p');
 }
}));
