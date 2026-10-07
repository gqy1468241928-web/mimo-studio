import test from 'node:test';
import assert from 'node:assert/strict';
const mod = await import('../server/db.mjs').catch(() => ({}));
async function open() { assert.equal(typeof mod.openStore,'function','Durable record store is required'); return mod.openStore({dialect:'sqlite',filename:':memory:'}); }
const record=(id,kind='tasks',extra={})=>({id,kind,site:'',title:id,status:'todo',...extra});
test('records persist, paginate, and reject stale edits',async()=>{
 const s=await open(); await s.save(record('a'),0); await s.save(record('b'),0);
 assert.equal((await s.list('tasks',{limit:1})).total,2);
 const old=await s.get('a'); await s.save({...old,title:'edited'},old.version);
 await assert.rejects(s.save({...old,title:'stale'},old.version),/已更新/);
 assert.equal((await s.get('a')).title,'edited'); await s.close();
});
test('reviewed imported mail stays in history with its original body',async()=>{
 const s=await open(); const input=record('mail-a','inquiries',{status:'new',content:'body 1',sender:'sender'});
 await s.upsertExternal(input); const item=await s.get('mail-a');
 await s.save({...item,status:'archived',reviewedAt:100},item.version);
 await s.upsertExternal({...input,title:'new title',content:'body 2'});
 assert.equal((await s.list('inquiries')).total,0);
 assert.equal((await s.list('inquiries',{history:true})).items[0].content,'body 1');
 const row=await s.get('mail-a');await s.save({...row,status:'new'},row.version);
 assert.equal((await s.list('inquiries')).total,1);await s.close();
});
test('duplicate fetching updates a pending message without duplicating it',async()=>{
 const s=await open();await s.upsertExternal(record('same','inquiries',{status:'new',content:'a'}));
 await s.upsertExternal(record('same','inquiries',{status:'new',content:'b'}));
 assert.equal((await s.list('inquiries')).total,1);assert.equal((await s.get('same')).content,'b');await s.close();
});
test('database lease permits one source reader and preserves its next due time',async()=>{
 const s=await open();await s.saveSource({id:'source-a',type:'api',enabled:true,nextRun:0,config:{},secret:''});
 const claims=await Promise.all([s.claimSource('source-a',1000),s.claimSource('source-a',1000)]);
 assert.equal(claims.filter(Boolean).length,1);const lease=claims.find(Boolean);
 await s.finishSource('source-a',lease,{fetchedAt:1000},601000);
 assert.equal(await s.claimSource('source-a',2000),null);
 assert.ok(await s.claimSource('source-a',602000));await s.close();
});
test('an accepted agent task proposal is applied exactly once',async()=>{
 const s=await open();await s.saveRun({id:'run-a',summary:'summary',tasks:[{title:'Follow up',site:'apexcomponent.com'}]});
 await s.applyRun('run-a');await s.applyRun('run-a');
 assert.equal((await s.list('tasks')).total,1);await s.close();
});
