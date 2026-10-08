import test from 'node:test';
import assert from 'node:assert/strict';
import {readHostingerSource,hostingerMailboxes,readHostingerBody} from '../server/hostinger-mail.mjs';
import {createSynchronizer} from '../server/sources.mjs';
import {openStore} from '../server/db.mjs';
import {seal,hashPassword} from '../server/security.mjs';
import {createApp} from '../server/app.mjs';
const source={id:'hostinger-source',type:'hostinger',site:'globalwellpcb.com',enabled:true,config:{mailboxId:'ACtest',user:'info@globalwellpcb.com',folder:'INBOX'},state:{}};
const token='test-mail-api-token',key='a'.repeat(64);
function fixture(calls=[]){return async(url,options)=>{
 const u=new URL(url);calls.push(u);
 assert.equal(u.origin,'https://api.mail.hostinger.com');
 assert.equal(options.headers.Authorization,'Bearer '+token);
 if(u.pathname.endsWith('/me'))return {data:{mailboxes:[{resourceId:'ACtest',address:'info@globalwellpcb.com'}]}};
 if(u.pathname.endsWith('/text'))return {data:{text:'',html:'<p>真实询盘</p><script>bad()</script><img src="https://tracking.invalid/pixel"><p>第二段</p>'}};
 return {data:[{uid:41,path:'INBOX',subject:'RFQ',from:{name:'Buyer',address:'buyer@example.com'},date:'2026-10-08T00:00:00Z'}],pagination:{page:1,perPage:50,totalPages:1}};
};}
test('Hostinger sync uses scoped latest metadata and never reads or changes remote message bodies',async()=>{
 const calls=[],result=await readHostingerSource(source,token,{request:fixture(calls)});
 assert.equal(result.records.length,1);assert.equal(result.records[0].title,'RFQ');
 assert.equal(result.records[0].sender,'Buyer <buyer@example.com>');
 assert.equal(result.records[0].externalId,'hostinger:ACtest:INBOX:41');
 assert.equal(calls[1].searchParams.get('sort'),'-uid');assert.equal(calls.length,2);
 assert.ok(!calls.some(u=>u.pathname.endsWith('/text')));
 const again=await readHostingerSource(source,token,{request:fixture()});assert.equal(again.records[0].id,result.records[0].id);
});
test('Hostinger authorization rejects a different mailbox and malformed envelopes',async()=>{
 await assert.rejects(readHostingerSource({...source,config:{...source.config,mailboxId:'ACforeign'}},token,{request:fixture()}),/授权|邮箱/);
 await assert.rejects(hostingerMailboxes(token,{request:async()=>({data:{mailboxes:{}}})}),/格式/);
 await assert.rejects(readHostingerSource(source,'',{request:fixture()}),/令牌/);
});
test('Hostinger body reads stay scoped and convert HTML without loading remote content',async()=>{
 const body=await readHostingerBody(source,token,'hostinger:ACtest:INBOX:41',{request:fixture()});
 assert.match(body.content,/真实询盘/);assert.match(body.content,/第二段/);assert.doesNotMatch(body.content,/bad|tracking|<img/);
 await assert.rejects(readHostingerBody(source,token,'hostinger:ACforeign:INBOX:41',{request:fixture()}),/范围|邮件/);
});
test('repeated Hostinger metadata sync preserves fetched text and reviewed history',async()=>{
 const store=await openStore({dialect:'sqlite'});
 await store.saveSource({...source,nextRun:0,secret:seal(token,key,source.id)});
 const sync=createSynchronizer(store,key,{reader:(s,t)=>readHostingerSource(s,t,{request:fixture()})});
 try{
  await sync.tick();let item=(await store.list('inquiries')).items[0];
  await store.save({...item,content:'完整正文',userNotes:'已核对'},item.version);
  await sync.tick({force:true});item=await store.get(item.id);
  assert.equal(item.content,'完整正文');assert.equal(item.userNotes,'已核对');
  await store.save({...item,status:'archived'},item.version);await sync.tick({force:true});
  assert.equal((await store.list('inquiries')).total,0);assert.equal((await store.list('inquiries',{history:true})).total,1);
 }finally{sync.stop();await store.close();}
});
test('saved connection metadata can be restored paused while missing credentials prevent activation',async()=>{
 const store=await openStore({dialect:'sqlite'}),config={sessionKey:'a'.repeat(64),encryptionKey:key,cronSecret:'fixture',initialHash:hashPassword('restore-test-password'),appUrl:'https://mimo-studio.top',production:false};
 const app=await createApp({store,config,synchronizer:{tick:async()=>({results:[]})}}),server=app.listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'restore-test-password'})});
  const cookie=login.headers.get('set-cookie').split(';')[0],post=value=>fetch(base+'/api/sources',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(value)});
  const restored=await post({name:'Hostinger · info@globalwellpcb.com',type:'hostinger',site:source.site,enabled:false,config:source.config});
  assert.equal(restored.status,200);const entry=await restored.json();assert.equal(entry.hasSecret,false);assert.equal(entry.enabled,false);
  assert.equal((await post({...entry,enabled:true})).status,400);
  const get=await post({name:'得到大脑',type:'get',site:'',enabled:false,config:{clientId:'cli-existing'}});assert.equal(get.status,200);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});
