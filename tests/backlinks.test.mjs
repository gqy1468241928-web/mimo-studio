import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {hashPassword} from '../server/security.mjs';
import {parseImport} from '../server/import.mjs';

test('backlink records retain contact, outreach, fees, message and completion through edits, filtering and backup restore',async()=>{
 const store=await openStore({dialect:'sqlite'});
 const config={sessionKey:'a'.repeat(64),encryptionKey:'b'.repeat(64),cronSecret:'test-cron',initialHash:hashPassword('test-only-password'),appUrl:'https://mimo-studio.top',production:false};
 const app=await createApp({store,config,synchronizer:{tick:async()=>({results:[]}),syncOne:async()=>({ok:true})}}),server=app.listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const request=(path,method='GET',body)=>fetch(base+path,{method,headers:{'content-type':'application/json',...(cookie?{cookie}: {})},...(body?{body:JSON.stringify(body)}:{})});
 try{
  const login=await request('/api/auth/login','POST',{password:'test-only-password'});cookie=login.headers.get('set-cookie').split(';')[0];
  const created=await request('/api/records','POST',{kind:'backlinks',site:'apexcomponent.com',title:'Electronics publication',url:'https://publication.example/contact',contact:'Editor · editor@example.com',outreachSent:true,feeStatus:'paid',content:'Hello editor,\nHere is our article proposal.',status:'new'});
  assert.equal(created.status,200,'Backlink records must be accepted');
  const row=await created.json();
  assert.equal(row.contact,'Editor · editor@example.com');assert.equal(row.outreachSent,true);assert.equal(row.feeStatus,'paid');assert.equal(row.status,'new');
  const changed=await request('/api/records/'+row.id,'PUT',{...row,status:'done',outreachSent:false});
  assert.equal(changed.status,200);const done=await changed.json();assert.equal(done.status,'done');assert.equal(done.outreachSent,false);
  const detail=await (await request('/api/records/'+row.id)).json();assert.equal(detail.content,'Hello editor,\nHere is our article proposal.');assert.equal(detail.contact,'Editor · editor@example.com');
  const other=await request('/api/records','POST',{kind:'backlinks',site:'globalwellpcb.com',title:'PCB publication'});assert.equal(other.status,200);
  const fresh=await other.json();assert.equal(fresh.outreachSent,false);assert.equal(fresh.feeStatus,'unknown');
  const scoped=await (await request('/api/records?kind=backlinks&site=apexcomponent.com&status=done')).json();assert.equal(scoped.total,1);assert.equal(scoped.items[0].id,row.id);
  const searched=await (await request('/api/records?kind=backlinks&search=editor%40example.com')).json();assert.equal(searched.total,1);
  const backup=await (await request('/api/backup')).json();assert.equal(backup.records.find(r=>r.id===row.id).feeStatus,'paid');
  assert.equal((await request('/api/records/'+row.id,'DELETE',{version:done.version})).status,200);
  const restored=await request('/api/import','POST',{format:'json',text:JSON.stringify(backup),site:''});assert.equal(restored.status,200);
  const restoredRow=await (await request('/api/records/'+row.id)).json();assert.equal(restoredRow.outreachSent,false);assert.equal(restoredRow.status,'done');assert.equal(restoredRow.contact,'Editor · editor@example.com');
  for(const invalid of [{feeStatus:'maybe'},{outreachSent:'false'},{status:'published'},{url:'javascript:alert(1)'}]){
   assert.equal((await request('/api/records','POST',{kind:'backlinks',site:'',title:'Invalid',...invalid})).status,400);
  }
  assert.equal((await request('/api/records?kind=articles')).status,200);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});
test('backlink CSV normalizes explicit yes and no instead of treating a false string as sent',()=>{
 const rows=parseImport({kind:'backlinks',format:'csv',text:'title,contact,outreachSent,feeStatus,status,url,content\nA,editor@example.com,false,free,new,https://a.example,First message\nB,team@example.com,true,paid,done,https://b.example,Second message'});
 assert.equal(rows[0].outreachSent,false);assert.equal(rows[1].outreachSent,true);assert.equal(rows[0].feeStatus,'free');assert.equal(rows[1].status,'done');
 const chinese=parseImport({kind:'backlinks',format:'csv',text:'外链网站,外链联系人,是否发送请求,是否需要费用,发送信息内容,是否完成,网站地址\n资源网站,联系人,否,待确认,请求正文,是,https://resource.example'});
 assert.equal(chinese[0].title,'资源网站');assert.equal(chinese[0].contact,'联系人');assert.equal(chinese[0].outreachSent,false);assert.equal(chinese[0].feeStatus,'unknown');assert.equal(chinese[0].content,'请求正文');assert.equal(chinese[0].status,'done');assert.equal(chinese[0].url,'https://resource.example');
 assert.throws(()=>parseImport({kind:'backlinks',format:'csv',text:'title,outreachSent\nInvalid,sometimes'}),/发送/);
});
