import { createHash } from 'node:crypto';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { unseal } from './security.mjs';
import { requestJSON, resolvePublic } from './network.mjs';
import {readHostingerSource} from './hostinger-mail.mjs';
export const SYNC_INTERVAL=600000;
const stable=(source,id)=>'src_'+createHash('sha256').update(source+':'+String(id)).digest('hex').slice(0,48);
const text=(value,max=200000)=>typeof value==='string'?value.slice(0,max):value==null?'':JSON.stringify(value).slice(0,max);
const path=(obj,key)=>!key?obj:key.split('.').reduce((o,k)=>o?.[k],obj);
export function mapApiItems(source,json) {
 const config=source.config,rows=path(json,config.listPath??'data.items');
 if(!Array.isArray(rows))throw new Error('找不到内容列表，请检查列表路径（例如 data.items）');
 return rows.slice(0,100).map(row=>{
 const identifier=path(row,config.idField||'id');
 if(identifier===null||identifier===undefined||identifier==='')throw new Error('内容缺少唯一 ID，请检查 ID 字段');
 const kind=source.type==='get'?'notes':config.kind||'inquiries';
 return {id:stable(source.id,identifier),kind,sourceId:source.id,externalId:String(identifier),site:source.site||'',status:kind==='tasks'?'todo':'new',
 title:text(path(row,config.titleField||'title'),300)||'未命名内容',content:text(path(row,config.contentField||'content')),
 sender:text(path(row,config.senderField||'sender'),300),url:text(path(row,config.urlField||'url'),2000),
 category:source.type==='get'?'notes':kind==='resources'?'seo':undefined,receivedAt:text(path(row,config.dateField||'created_at'),100)};
 });
}
export async function readApiSource(source,secret,{request=requestJSON}={}) {
 if(source.type!=='get'){
 const config=source.config,headers=secret?{[config.headerName||'Authorization']:(config.authMode==='bearer'?'Bearer ':'')+secret}:{};
 const response=await request(config.endpoint,{headers});
 return {records:mapApiItems(source,response),state:{...source.state}};
 }
 const mapped={...source,config:{...source.config,listPath:'data.notes',idField:'note_id',titleField:'title',contentField:'content'}};
 const headers={Authorization:secret,'X-Client-ID':source.config.clientId},records=[];
 const page=async(cursor)=>{
 const response=await request('https://openapi.biji.com/open/api/v1/resource/note/list?cursor='+encodeURIComponent(cursor||0),{headers});
 if(response.success===false||response.code!==undefined&&![0,200].includes(Number(response.code)))throw new Error('得到大脑拒绝读取，请检查同一应用的 Client ID、API Key 和 note.content.read 权限');
 records.push(...mapApiItems(mapped,response));return response.data;
 };
 const first=await page(0);
 let more=first.has_more,cursor=source.state?.backfillCursor||first.cursor||'';
 for(let i=0;i<4&&more&&cursor;i++){const response=await page(cursor);more=response.has_more;cursor=response.cursor||'';}
 return {records,state:{...source.state,backfillCursor:more?String(cursor):'',hasMore:!!more}};
}
async function readMail(source,secret) {
 const cfg=source.config,address=await resolvePublic(cfg.host);
 const client=new ImapFlow({host:address.address,port:993,secure:true,tls:{servername:cfg.host,rejectUnauthorized:true},auth:{user:cfg.user,pass:secret},logger:false,connectionTimeout:20000,greetingTimeout:20000,socketTimeout:30000,disableAutoIdle:true});
 try {
 await client.connect();const lock=await client.getMailboxLock(cfg.folder||'INBOX',{readOnly:true});
 try{
 const validity=String(client.mailbox.uidValidity),last=source.state?.validity===validity?Number(source.state?.lastUid||0):0;
 const since=last?{uid:String(last+1)+':*'}:{since:new Date(Date.now()-Number(cfg.days||14)*86400000)};
 let uids=await client.search(since,{uid:true});uids=(uids||[]).filter(x=>x>last).sort((a,b)=>a-b);
 const chosen=last?uids.slice(0,50):uids.slice(-50),records=[];let lastUid=last;
 if(chosen.length)for await(const mail of client.fetch(chosen,{uid:true,envelope:true,internalDate:true,source:{start:0,maxLength:262144}},{uid:true})){
 const parsed=mail.source?await simpleParser(mail.source,{skipHtmlToText:true,skipTextToHtml:true,skipImageLinks:true}):null;
 const env=mail.envelope||{},sender=parsed?.from?.text||(env.from||[]).map(x=>[x.name,x.address].filter(Boolean).join(' ')).join(', ');
 records.push({id:stable(source.id,validity+':'+mail.uid),kind:'inquiries',sourceId:source.id,site:source.site||'',status:'new',title:text(parsed?.subject||env.subject||'无主题',300),content:text(parsed?.text||'此邮件没有纯文本正文。请在原邮箱查看 HTML 正文和附件。'),sender:text(sender,300),receivedAt:mail.internalDate?.toISOString()||'',messageId:text(parsed?.messageId||env.messageId,500),truncated:!!mail.source&&mail.source.length>=262144});
 lastUid=Math.max(lastUid,mail.uid);
 }
 return {records,state:{...source.state,validity,lastUid,remaining:Math.max(0,uids.length-chosen.length)}};
 }finally{lock.release();}
 }catch(e){if(e.authenticationFailed||/AUTH|LOGIN|credential/i.test(e.message||''))throw new Error('邮箱登录失败，请使用 IMAP 授权码或应用密码，并确认已开启 IMAP');throw new Error('无法读取邮箱，请检查 IMAP 主机、账号与授权码');}
 finally{await client.logout().catch(()=>{});}
}
export function createSynchronizer(store,key,{reader}={}) {
 const read=reader||((s,secret)=>s.type==='imap'?readMail(s,secret):s.type==='hostinger'?readHostingerSource(s,secret):readApiSource(s,secret));let timer,stopping=false;
 async function syncOne(id,{force=false,testOnly=false,graceMs=0}={}) {
 const source=await store.getSource(id);if(!source)throw new Error('来源不存在');
 if(!source.enabled&&!testOnly)throw new Error('请先启用该来源');
 const lease=testOnly?null:await store.claimSource(id,Date.now(),force,graceMs);
 if(!testOnly&&!lease)return {skipped:true,message:'正在收取或尚未到收取时间'};
 const now=Date.now();
 try{
 const secret=source.secret?unseal(source.secret,key,source.id):'',result=await read(source,secret);
 if(!testOnly){for(const item of result.records){
 if(source.type==='hostinger'){const existing=await store.get(item.id);if(existing?.content){item.content=existing.content;item.truncated=existing.truncated;}}
 await store.upsertExternal(item);
 }
 await store.finishSource(id,lease,{...result.state,lastAttempt:now,lastSuccess:now,error:'',count:result.records.length},now+SYNC_INTERVAL);}
 return {ok:true,count:result.records.length,message:testOnly?'连接成功，可读取 '+result.records.length+' 条内容':'已收取 '+result.records.length+' 条内容'};
 }catch(e){if(!testOnly)await store.finishSource(id,lease,{...source.state,lastAttempt:now,error:e.message},now+SYNC_INTERVAL);throw e;}
 }
 async function tick({force=false,graceMs=0}={}) {
 const sources=await store.listSources(),results=[];
 for(const source of sources.filter(s=>s.enabled)){if(stopping)break;try{results.push({id:source.id,...await syncOne(source.id,{force,graceMs})});}catch(e){results.push({id:source.id,ok:false,message:e.message});}}
 return {results,checkedAt:Date.now()};
 }
 return {syncOne,tick,start(){timer=setInterval(()=>tick().catch(()=>{}),30000);timer.unref();tick().catch(()=>{});},stop(){stopping=true;clearInterval(timer);}};
}
export async function getNoteDetail(source,key,id) {
 if(source.type!=='get')throw new Error('来源不支持笔记详情');
 const json=await requestJSON('https://openapi.biji.com/open/api/v1/resource/note/detail?id='+encodeURIComponent(id),{headers:{Authorization:unseal(source.secret,key,source.id),'X-Client-ID':source.config.clientId}});
 if(!json.data?.note)throw new Error('没有找到笔记详情，请检查读取权限');return json.data.note;
}
