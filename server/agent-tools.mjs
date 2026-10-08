import {z} from 'zod';
import {unseal} from './security.mjs';
import {readHostingerBody} from './hostinger-mail.mjs';
import {getNoteDetail} from './sources.mjs';
import {workspaceKinds,knowledgeKinds,dayWindow,dailyOverview,searchKnowledge} from './workspace-data.mjs';

const siteSchema=z.enum(['','apexcomponent.com','globalwellpcb.com']);
const scope={site:siteSchema.optional(),projectId:z.string().max(100).optional()};
const page={limit:z.number().int().min(1).max(100).default(20),offset:z.number().int().min(0).max(1000000).default(0)};
const schemas={
 list_records:z.object({...scope,...page,kind:z.enum(workspaceKinds),includeArchived:z.boolean().default(true),search:z.string().max(500).default(''),status:z.string().max(24).default('')}).strict(),
 read_record:z.object({id:z.string().min(1).max(160),offset:z.number().int().min(0).max(200000).default(0),maxChars:z.number().int().min(1).max(12000).default(12000)}).strict(),
 daily_overview:z.object({...scope,date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()}).strict(),
 search_knowledge:z.object({...scope,...page,query:z.string().min(1).max(1000)}).strict(),
 source_status:z.object({...scope,...page}).strict()
};
const clip=(value,max=300)=>typeof value==='string'?value.slice(0,max):'';
function safeUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}}
function metadata(row){return {id:clip(row.id,160),title:clip(row.title),kind:row.kind,site:clip(row.site,80),url:safeUrl(row.url)};}
function recordText(row){return typeof row.content==='string'?row.content:typeof row.body==='string'?row.body:'';}
function summary(row){const content=recordText(row);return {...metadata(row),status:clip(row.status,24),projectId:clip(row.projectId,100),content:content.slice(0,600),...(row.snippet?{snippet:clip(row.snippet,2500),score:Number(row.score||0)}:{}),totalChars:content.length,truncated:!!row.truncated||content.length>600,sender:clip(row.sender),due:clip(row.due,20),completedAt:row.completedAt||'',publishedAt:row.publishedAt||'',receivedAt:row.receivedAt||'',keyword:clip(row.keyword)};}
async function externalBody(source,row,key){
 if(source.type==='hostinger'&&row.kind==='inquiries')return {...await readHostingerBody(source,unseal(source.secret,key,source.id),row.externalId),mayMarkRead:true};
 if(source.type==='get'&&row.kind==='notes'){const note=await getNoteDetail(source,key,row.externalId);return {content:clip(note.content,200000),truncated:typeof note.content==='string'&&note.content.length>200000};}
 return null;
}

export function createAgentTools(store,{key,site='',projectId='',date,inquiryId,readExternal}={}) {
 const evidence=new Map(),trace=[];
 const descriptions=[
  {name:'list_records',description:'Read any workspace kind, including archives. Continue with nextOffset. Body snippets require read_record for full text.',arguments:{kind:workspaceKinds,limit:'1..100',offset:'integer >=0',includeArchived:'boolean default true',search:'optional text',status:'optional status',site:'optional within inherited scope',projectId:'optional within inherited scope'}},
  {name:'read_record',description:'Read scoped stored record text. Continue with nextCharOffset until null. A missing synchronized body may fetch from its trusted source and may mark upstream mail read.',arguments:{id:'stored record ID',offset:'character offset default 0',maxChars:'1..12000'}},
  {name:'daily_overview',description:'Shanghai calendar day plans/completion/publication/inquiry counts with date evidence.',arguments:{date:'YYYY-MM-DD',site:'optional scope',projectId:'optional scope'}},
  {name:'search_knowledge',description:'Search verified resources, notes and prompts, including shared knowledge. Use read_record before citing knowledge in replies.',arguments:{query:'1..1000 characters',limit:'1..100',offset:'integer >=0',site:'optional scope',projectId:'optional scope'}},
  {name:'source_status',description:'Sanitized source synchronization health; these IDs are not record citations.',arguments:{limit:'1..100',offset:'integer >=0',site:'optional scope',projectId:'optional scope'}}
 ];
 function effective(args){
  if(site&&args.site!==undefined&&args.site!==site||projectId&&args.projectId!==undefined&&args.projectId!==projectId)throw new Error('工具范围不能超出已选择的网站或项目');
  return {site:site||args.site||'',projectId:projectId||args.projectId||''};
 }
 function accessible(row){
  const knowledge=knowledgeKinds.includes(row.kind);
  return workspaceKinds.includes(row.kind)&&(!site||row.site===site||knowledge&&!row.site)&&(!projectId||row.projectId===projectId||knowledge&&!row.projectId);
 }
 function remember(row,read=false,range){
  const old=evidence.get(row.id),intervals=[...(old?.intervals||[]),...(range?[range]:[])].sort((a,b)=>a[0]-b[0]);
  const merged=[];for(const current of intervals){const last=merged.at(-1);if(last&&current[0]<=last[1])last[1]=Math.max(last[1],current[1]);else merged.push([...current]);}
  const length=recordText(row).length,retrievedChars=merged.reduce((n,[start,end])=>n+end-start,0);
  evidence.set(row.id,{...metadata(row),knowledge:knowledgeKinds.includes(row.kind),read:read||old?.read||false,totalChars:length,retrievedChars,intervals:merged,complete:length>0&&!row.truncated&&retrievedChars>=length&&(read||old?.read||false)});
 }
 function mapRows(rows){return rows.map(row=>{remember(row);return summary(row);});}
 const paginate=(result,args)=>{const items=mapRows(result.items||[]),offset=result.offset??args.offset,limit=result.limit??args.limit,total=result.total??items.length;return {items,total,limit,offset,nextOffset:offset+items.length<total?offset+items.length:null,truncatedCount:Math.max(0,total-offset-items.length)};};
 function cleanDaily(result){
  const value={date:result.date,timeZone:result.timeZone,start:result.start,end:result.end,counts:result.counts,coverage:result.coverage};
  for(const name of ['plans','unplanned','completed','articles','inquiries','unknownCompleted']){
   if(Array.isArray(result[name]))value[name]=mapRows(result[name]);
  }
  value.events=(result.events||[]).map(event=>({id:clip(event.id,160),recordId:clip(event.recordId,160),kind:clip(event.kind,24),type:clip(event.type,40),title:clip(event.title),site:clip(event.site,80),projectId:clip(event.projectId,100),at:event.at}));
  value.sources=(result.sources||[]).map(source=>({id:clip(source.id,100),name:clip(source.name,100),type:clip(source.type,24),site:clip(source.site,80),enabled:!!source.enabled,lastSuccess:Number(source.lastSuccess||source.state?.lastSuccess||0),hasError:!!(source.error||source.state?.error)}));
  return value;
 }
 async function execute(name,args={}){
  if(!Object.hasOwn(schemas,name))throw new Error('不支持该工具，只允许读取工作台资料');
  let parsed;try{parsed=schemas[name].parse(args);}catch{throw new Error('工具参数格式无效');}
  const selected=effective(parsed);let result;
  if(name==='list_records')result=paginate(await store.list(parsed.kind,{...parsed,...selected}),parsed);
  if(name==='read_record'){
   let row=await store.get(parsed.id);if(!row||!accessible(row))throw new Error('来源记录不存在或不在当前范围');
   let mayMarkRead=false;
   if(!recordText(row)&&row.sourceId&&row.externalId){
    const source=await store.getSource(row.sourceId);
    if(source&&(!site||!source.site||source.site===site)&&((source.type==='hostinger'&&row.kind==='inquiries')||(source.type==='get'&&row.kind==='notes'))){
     let detail;try{detail=await (readExternal?readExternal(source,row):externalBody(source,row,key));}catch{throw new Error('无法读取来源详情，请检查来源状态或读取权限');}
     if(detail&&typeof detail.content==='string'){
      mayMarkRead=!!detail.mayMarkRead;
      row=await store.save({...row,content:detail.content.slice(0,200000),truncated:!!detail.truncated||detail.content.length>200000},row.version);
     }
    }
   }
   const body=recordText(row),end=Math.min(body.length,parsed.offset+parsed.maxChars);remember(row,true,[Math.min(parsed.offset,body.length),end]);
   result={...summary(row),content:body.slice(parsed.offset,end),offset:parsed.offset,totalChars:body.length,remainingChars:Math.max(0,body.length-end),nextCharOffset:end<body.length?end:null,truncated:!!row.truncated||end<body.length,mayMarkRead};
  }
  if(name==='search_knowledge')result=paginate(await searchKnowledge(store,{...parsed,...selected}),parsed);
  if(name==='daily_overview'){const selectedDate=parsed.date||date||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());dayWindow(selectedDate);result=cleanDaily(await dailyOverview(store,{date:selectedDate,...selected}));}
  if(name==='source_status'){
   const rows=(await store.listSources()).filter(row=>(!selected.site||!row.site||row.site===selected.site)&&(!selected.projectId||!row.projectId||row.projectId===selected.projectId));
   const items=rows.slice(parsed.offset,parsed.offset+parsed.limit).map(row=>({id:clip(row.id,100),name:clip(row.name,100),type:clip(row.type,24),site:clip(row.site,80),enabled:!!row.enabled,nextRun:Number(row.nextRun||0),lastSuccess:Number(row.state?.lastSuccess||0),lastAttempt:Number(row.state?.lastAttempt||0),count:Number(row.state?.count||0),hasError:!!row.state?.error}));
   result={items,total:rows.length,limit:parsed.limit,offset:parsed.offset,nextOffset:parsed.offset+items.length<rows.length?parsed.offset+items.length:null,truncatedCount:Math.max(0,rows.length-parsed.offset-items.length)};
  }
  trace.push({name,arguments:parsed,rowCount:result.items?.length??(name==='read_record'?1:undefined),total:result.total,...(name==='read_record'?{chars:result.content.length,remainingChars:result.remainingChars}:{}),...(name==='daily_overview'?{date:result.date,counts:result.counts}:{})});
  return result;
 }
 return {execute,evidence,trace,descriptions};
}
