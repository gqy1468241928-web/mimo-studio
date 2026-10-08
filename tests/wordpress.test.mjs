import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {hashPassword} from '../server/security.mjs';
import {createSynchronizer} from '../server/sources.mjs';
const wp=await import('../server/wordpress.mjs').catch(()=>({}));
const source={id:'wordpress-test',type:'wordpress',site:'apexcomponent.com',enabled:true,config:{origin:'https://apexcomponent.com'},state:{}};
const post=(id,extra={})=>({id,type:'post',status:'publish',link:'https://apexcomponent.com/article-'+id+'/',title:{rendered:'Article &amp; '+id},content:{rendered:'<p>Full <b>article</b> text.</p><script>bad()</script><p>Next line.</p>'},date_gmt:'2026-10-07T00:00:00',modified_gmt:'2026-10-08T00:00:00',meta:{rank_math_focus_keyword:'procurement, sourcing'},...extra});
test('WordPress restores all paginated published articles with safe text, original links and stable IDs',async()=>{
 assert.equal(typeof wp.readWordPressSource,'function');
 const seen=[],request=async(url,options)=>{const u=new URL(url),page=Number(u.searchParams.get('page'));seen.push(page);assert.equal(u.origin,'https://apexcomponent.com');assert.equal(options.metadata,true);assert.equal(u.searchParams.get('status'),'publish');return {json:Array.from({length:page<3?10:1},(_,i)=>post((page-1)*10+i+1)),headers:{'x-wp-totalpages':'3','x-wp-total':'21'}};};
 const result=await wp.readWordPressSource(source,{request});
 assert.deepEqual(seen,[1,2,3]);assert.equal(result.records.length,21);assert.equal(result.state.totalCandidates,21);assert.equal(result.state.hasMore,false);
 assert.equal(result.records[0].kind,'articles');assert.equal(result.records[0].status,'published');assert.equal(result.records[0].title,'Article & 1');assert.equal(result.records[0].content,'Full article text.\nNext line.');assert.equal(result.records[0].publishedAt,'2026-10-07T00:00:00.000Z');assert.equal(result.records[0].keyword,'procurement');
 const again=await wp.readWordPressSource(source,{request});assert.equal(again.records[0].id,result.records[0].id);
 for(const invalid of [{status:'draft'},{link:'https://different.example/article'},{id:0}])assert.throws(()=>wp.mapWordPressPost(source,post(1,invalid)));
});
test('website restoration is idempotent and does not resurrect sources removed or paused by the owner',async()=>{
 assert.equal(typeof wp.ensureWebsiteSources,'function');const store=await openStore({dialect:'sqlite'});
 try{await wp.ensureWebsiteSources(store);const sources=await store.listSources();assert.equal(sources.length,2);assert.ok(sources.every(s=>s.type==='wordpress'&&s.enabled&&!s.secret));await store.saveSource({...sources[0],enabled:false});await store.deleteSource(sources[1].id);await wp.ensureWebsiteSources(store);assert.equal((await store.listSources()).length,1);assert.equal((await store.getSource(sources[0].id)).enabled,false);}finally{await store.close();}
});
test('article and mail synchronization stay in their own content tabs and preserve user organization on repeat reads',async()=>{
 const store=await openStore({dialect:'sqlite'});const key='b'.repeat(64);
 try{
  await store.saveSource(source);await store.saveSource({id:'mail-test',type:'hostinger',site:'globalwellpcb.com',enabled:true,config:{},secret:''});
  const sync=createSynchronizer(store,key,{reader:async s=>s.type==='wordpress'?{records:[wp.mapWordPressPost(s,post(1))],state:{}}:{records:[{id:'received-mail',kind:'inquiries',sourceId:s.id,site:s.site,title:'Real inbox message',sender:'buyer@example.com',content:'',status:'new'}],state:{}}});
  await sync.tick({force:true});assert.equal((await store.list('articles')).total,1);assert.equal((await store.list('inquiries')).total,1);
  const article=(await store.list('articles')).items[0];await store.save({...article,userNotes:'Keep my notes',keyword:'manual focus',status:'writing'},article.version);await sync.tick({force:true});
  const saved=await store.get(article.id);assert.equal(saved.userNotes,'Keep my notes');assert.equal(saved.keyword,'manual focus');assert.equal(saved.status,'writing');
 }finally{await store.close();}
});
test('public WordPress sources need no API key and can be fetched through authenticated content controls',async()=>{
 const store=await openStore({dialect:'sqlite'}),config={sessionKey:'a'.repeat(64),encryptionKey:'b'.repeat(64),cronSecret:'test-cron',initialHash:hashPassword('test-only-password'),appUrl:'https://mimo-studio.top',production:false};
 const app=await createApp({store,config,synchronizer:{tick:async()=>({results:[]}),syncOne:async()=>({ok:true,count:1})}}),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const request=(path,method='GET',body)=>fetch(base+path,{method,headers:{'content-type':'application/json',...(cookie?{cookie}: {})},...(body?{body:JSON.stringify(body)}:{})});
 try{
  assert.equal((await request('/api/content/sync','POST',{kind:'articles'})).status,401);
  const login=await request('/api/auth/login','POST',{password:'test-only-password'});cookie=login.headers.get('set-cookie').split(';')[0];
  const create=await request('/api/sources','POST',{name:'Website articles',type:'wordpress',site:'apexcomponent.com',enabled:true,config:{origin:'https://apexcomponent.com'}});assert.equal(create.status,200);assert.equal((await create.json()).hasSecret,false);
  assert.equal((await request('/api/sources','POST',{name:'Invalid',type:'wordpress',site:'globalwellpcb.com',config:{origin:'https://apexcomponent.com'}})).status,400);
  const sync=await request('/api/content/sync','POST',{kind:'articles',site:''});assert.equal(sync.status,200);assert.equal((await sync.json()).results.length,1);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});

test('article backfill saves completed pages and resumes at a failed network page',async()=>{
 const rows=page=>({json:Array.from({length:page<3?10:1},(_,i)=>post((page-1)*10+i+1)),headers:{'x-wp-totalpages':'3','x-wp-total':'21'}});
 const first=await wp.readWordPressSource(source,{request:async url=>{const page=Number(new URL(url).searchParams.get('page'));if(page===2)throw Object.assign(new Error('temporary network failure'),{code:'NETWORK_ERROR'});return rows(page);}});
 assert.equal(first.records.length,10);assert.equal(first.state.hasMore,true);assert.equal(first.state.nextPage,2);
 const resumed=await wp.readWordPressSource({...source,state:first.state},{request:async url=>rows(Number(new URL(url).searchParams.get('page')))});
 assert.equal(resumed.records.length,21);assert.equal(resumed.state.hasMore,false);assert.equal(resumed.state.partialError,'');
 await assert.rejects(wp.readWordPressSource(source,{request:async()=>{throw Object.assign(new Error('offline'),{code:'NETWORK_ERROR'});}}),/offline/);
});
test('article backfill stops within its run budget and leaves a durable next-page cursor',async()=>{
 const seen=[];const result=await wp.readWordPressSource(source,{budgetMs:0,request:async url=>{const page=Number(new URL(url).searchParams.get('page'));seen.push(page);return {json:Array.from({length:10},(_,i)=>post((page-1)*10+i+1)),headers:{'x-wp-totalpages':'3','x-wp-total':'30'}};}});
 assert.deepEqual(seen,[1]);assert.equal(result.records.length,10);assert.equal(result.state.hasMore,true);assert.equal(result.state.nextPage,2);
});
