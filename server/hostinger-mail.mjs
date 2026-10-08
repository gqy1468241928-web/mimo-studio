import {createHash} from 'node:crypto';
import {requestJSON} from './network.mjs';
const base='https://api.mail.hostinger.com/api/v1';
const clip=(value,max=200000)=>typeof value==='string'?value.slice(0,max):'';
const hide=(value,token)=>clip(value).split(token).join('[凭据已隐藏]');
const stable=(source,id)=>'src_'+createHash('sha256').update(source+':'+id).digest('hex').slice(0,48);
function checkedToken(value){
 if(typeof value!=='string'||!value.trim()||value.length>8192||/\s/.test(value.trim()))throw new Error('请填写 Hostinger 邮件 API 令牌');
 return value.trim();
}
export function validateHostingerConfig(source){
 const cfg=source.config||{},folder=cfg.folder||'INBOX';
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(cfg.mailboxId||'')||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.user||''))throw new Error('请获取并选择 Hostinger 邮箱');
 if(folder.length>200||/[\x00-\x1f\x7f]/.test(folder)||folder==='.'||folder==='..')throw new Error('邮箱文件夹格式无效');
 return {mailboxId:cfg.mailboxId,user:cfg.user,folder};
}
async function call(token,path,{request=requestJSON}={}){
 return request(base+path,{headers:{Authorization:'Bearer '+checkedToken(token),Accept:'application/json'}});
}
export async function hostingerMailboxes(token,options={}){
 const json=await call(token,'/me',options),rows=json?.data?.mailboxes;
 if(!Array.isArray(rows)||rows.length>1000)throw new Error('Hostinger 邮箱列表格式异常');
 const result=rows.map(row=>{
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(row.resourceId||'')||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.address||''))throw new Error('Hostinger 邮箱信息格式异常');
 if(row.resourceId.includes(token)||row.address.includes(token))throw new Error('Hostinger 邮箱信息格式异常');
 return {id:row.resourceId,address:row.address};
 });
 if(!result.length)throw new Error('此令牌没有授权的 Hostinger 邮箱');
 return result;
}
async function authorized(source,token,options){
 const cfg=validateHostingerConfig(source),boxes=await hostingerMailboxes(token,options);
 if(!boxes.some(row=>row.id===cfg.mailboxId&&row.address.toLowerCase()===cfg.user.toLowerCase()))throw new Error('所选邮箱不在令牌的授权范围内');
 return cfg;
}
export async function readHostingerSource(source,token,options={}){
 const cfg=await authorized(source,token,options);
 const json=await call(token,'/mailboxes/'+cfg.mailboxId+'/folders/'+encodeURIComponent(cfg.folder)+'/messages?page=1&perPage=50&sort=-uid',options);
 if(!Array.isArray(json?.data)||json.data.length>50||json.pagination?.page!==1||json.pagination?.perPage!==50)throw new Error('Hostinger 邮件列表格式异常');
 const records=json.data.map(row=>{
 if(typeof row.uid==='string'&&!/^\d+$/.test(row.uid)||!Number.isSafeInteger(Number(row.uid))||Number(row.uid)<1||row.path&&row.path!==cfg.folder)throw new Error('邮件标识或文件夹范围异常');
 const externalId='hostinger:'+cfg.mailboxId+':'+encodeURIComponent(cfg.folder)+':'+row.uid;
 const from=row.from||{},sender=(clip(from.name,200)?clip(from.name,200)+' <'+clip(from.address,300)+'>':clip(from.address,300));
 return {id:stable(source.id,externalId),kind:'inquiries',sourceId:source.id,externalId,site:source.site||'',status:'new',title:hide(row.subject||'无主题邮件',token).slice(0,300),content:'',sender:hide(sender,token).slice(0,300),mailbox:cfg.user,receivedAt:clip(row.date,100),messageId:clip(row.messageId,500),url:'https://mail.hostinger.com/'};
 });
 if(new Set(records.map(row=>row.id)).size!==records.length)throw new Error('Hostinger 返回了重复邮件');
 return {records,state:{...source.state,mailbox:cfg.user}};
}
function htmlText(html){
 return html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<\s*br\b[^>]*>|<\/(?:p|div|li|tr|h[1-6])\s*>/gi,'\n').replace(/<[^>]*>/g,'')
 .replace(/&(?:nbsp|amp|lt|gt|quot|apos);|&#(?:x[0-9a-f]+|\d+);/gi,entity=>{
 const named={'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};
 if(named[entity.toLowerCase()])return named[entity.toLowerCase()];
 const hex=entity[2]?.toLowerCase()==='x',n=Number.parseInt(entity.slice(hex?3:2,-1),hex?16:10);
 return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';
 }).replace(/\n{3,}/g,'\n\n').trim();
}
export async function readHostingerBody(source,token,externalId,options={}){
 const cfg=validateHostingerConfig(source),prefix='hostinger:'+cfg.mailboxId+':'+encodeURIComponent(cfg.folder)+':';
 const value=typeof externalId==='string'&&externalId.startsWith(prefix)?externalId.slice(prefix.length):'';
 if(!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value)))throw new Error('所选邮件不在当前邮箱范围内');
 await authorized(source,token,options);
 const json=await call(token,'/mailboxes/'+cfg.mailboxId+'/folders/'+encodeURIComponent(cfg.folder)+'/messages/'+value+'/text',options),data=json?.data;
 if(typeof data?.text!=='string'&&typeof data?.html!=='string')throw new Error('Hostinger 未返回有效邮件正文');
 const content=hide(data.text||htmlText(data.html||''),token);
 return {content:content.slice(0,160000),truncated:content.length>160000};
}

export async function sendHostingerReply(source,token,externalId,message,{request=requestJSON,beforeSend}={}) {
 const cfg=validateHostingerConfig(source),prefix='hostinger:'+cfg.mailboxId+':'+encodeURIComponent(cfg.folder)+':';
 const uid=typeof externalId==='string'&&externalId.startsWith(prefix)?externalId.slice(prefix.length):'';
 if(!/^[1-9]\d*$/.test(uid)||!Number.isSafeInteger(Number(uid)))throw new Error('所选邮件不在当前邮箱范围内');
 if(typeof message.to!=='string'||! /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(message.to)||/[\r\n]/.test(message.to))throw new Error('收件人格式无效');
 if(typeof message.subject!=='string'||!message.subject.trim()||message.subject.length>500||/[\r\n]/.test(message.subject))throw new Error('邮件主题格式无效');
 if(typeof message.body!=='string'||!message.body.trim()||message.body.length>20000)throw new Error('回复正文格式无效');
 let started=false;
 try {
  await authorized(source,token,{request});
  if(beforeSend)await beforeSend();
  started=true;
  await request(base+'/mailboxes/'+cfg.mailboxId+'/send',{method:'POST',headers:{Authorization:'Bearer '+checkedToken(token),Accept:'application/json'},timeout:45000,body:{to:[message.to],subject:message.subject,text:message.body,inReplyTo:{uid:Number(uid),folder:cfg.folder}}});
  return {accepted:true};
 }catch(error){throw Object.assign(new Error(started?'邮件发送未得到明确结果，请先在原邮箱已发送文件夹核对':'未发送邮件，请检查邮箱授权或自动回复规则'),{noSend:!started,statusCode:error.statusCode});}
}
