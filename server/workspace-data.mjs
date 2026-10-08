export const workspaceKinds=['tasks','articles','inquiries','mic','keywords','backlinks','resources','notes','prompts','projects'];
export const knowledgeKinds=['resources','notes','prompts'];
const timeZone='Asia/Shanghai',dayMs=86400000,zoneMs=28800000;
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function dayWindow(date=today()) {
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Object.assign(new Error('日期必须是有效的 YYYY-MM-DD'),{status:400});
 const midnight=Date.parse(date+'T00:00:00Z');
 if(!Number.isFinite(midnight)||new Date(midnight).toISOString().slice(0,10)!==date)throw Object.assign(new Error('日期必须是有效的 YYYY-MM-DD'),{status:400});
 return {date,timeZone,start:midnight-zoneMs,end:midnight-zoneMs+dayMs};
}
function timestamp(value) {
 if(value===null||value===undefined||value==='')return NaN;
 if(typeof value==='number')return Number.isFinite(value)?value:NaN;
 if(typeof value!=='string')return NaN;
 const date=value.match(/^(\d{4}-\d{2}-\d{2})/);
 if(date){try{dayWindow(date[1]);}catch{return NaN;}}
 return Date.parse(value);
}
const inWindow=(value,window)=>{const at=timestamp(value);return Number.isFinite(at)&&at>=window.start&&at<window.end;};
async function pages(fetch) {
 const items=[];let offset=0,total;
 for(;;){
  const result=await fetch(offset);
  if(!result||!Array.isArray(result.items)||!Number.isFinite(result.total))throw new Error('Incomplete data page');
  total=result.total;items.push(...result.items);offset+=result.items.length;
  if(offset>=total)return items;
  if(!result.items.length)throw new Error('Incomplete data page');
 }
}
const safeSource=source=>({id:source.id,name:source.name||source.id,type:source.type||'',site:source.site||'',enabled:!!source.enabled,mailbox:source.mailbox||source.config?.mailbox||'',lastSuccess:source.state?.lastSuccess??source.lastSuccess??null,lastAttempt:source.state?.lastAttempt??source.lastAttempt??null,error:source.state?.error||source.error?'同步失败，请检查数据源':null,remaining:source.state?.remaining??source.remaining??null,hasMore:source.state?.hasMore??source.hasMore??null});
export async function dailyOverview(store,{date,site='',projectId=''}={}) {
 const window=dayWindow(date),errors=[],records={};
 for(const kind of ['tasks','articles','inquiries']){
  try{records[kind]=await pages(offset=>store.list(kind,{site,projectId,includeArchived:true,limit:100,offset}));}
  catch{records[kind]=null;errors.push({kind,message:'工作台数据读取失败'});}
 }
 let events=null,sources=null;
 try{events=await pages(offset=>store.listEvents({from:window.start,to:window.end,site,projectId,limit:100,offset}));}catch{errors.push({kind:'events',message:'事件记录读取失败'});}
 try{sources=(await store.listSources()).filter(s=>(!site||!s.site||s.site===site)&&(!projectId||!s.projectId||s.projectId===projectId)).map(safeSource);}catch{errors.push({kind:'sources',message:'数据源状态读取失败'});}
 const tasks=records.tasks||[],all={
  plans:tasks.filter(t=>String(t.due||'').slice(0,10)===window.date),
  unplanned:tasks.filter(t=>!t.due&&inWindow(t.createdAt,window)),
  completed:tasks.filter(t=>inWindow(t.completedAt,window)),
  articles:(records.articles||[]).filter(r=>r.status==='published'&&inWindow(r.publishedAt,window)),
  inquiries:(records.inquiries||[]).filter(r=>inWindow(r.receivedAt,window)),
  events:events||[],
  unknownCompleted:tasks.filter(t=>t.status==='done'&&!Number.isFinite(timestamp(t.completedAt)))
 };
 // Completion events retain the original completion time even after a restore or delete.
 const done=new Map(all.completed.map(t=>[t.id,t]));
 for(const e of events||[])if(e.type==='task_completed'&&e.kind==='tasks'&&!done.has(e.recordId)){
  const current=tasks.find(t=>t.id===e.recordId);
  done.set(e.recordId,{...(current||{}),id:e.recordId,kind:e.kind,title:e.title,site:e.site,projectId:e.projectId,completedAt:e.at,completionEventId:e.id,...(!current?{deleted:true}:{})});
 }
 all.completed=[...done.values()].sort((a,b)=>timestamp(b.completedAt)-timestamp(a.completedAt)||a.id.localeCompare(b.id));
 const omitted=Object.fromEntries(Object.entries(all).map(([key,items])=>[key,Math.max(0,items.length-100)]));
 const missingDates={tasks:all.unknownCompleted.length,articles:(records.articles||[]).filter(r=>r.status==='published'&&!Number.isFinite(timestamp(r.publishedAt))).length,inquiries:(records.inquiries||[]).filter(r=>!Number.isFinite(timestamp(r.receivedAt))).length};
 const available=kind=>records[kind]!==null;
 const counts={planned:available('tasks')?all.plans.length:null,completed:available('tasks')&&events!==null?all.completed.length:null,articles:available('articles')?all.articles.length:null,inquiries:available('inquiries')?all.inquiries.length:null,unplanned:available('tasks')?all.unplanned.length:null,events:events===null?null:events.length,unknownCompleted:available('tasks')?all.unknownCompleted.length:null};
 const lastSync=(sources||[]).map(s=>timestamp(s.lastSuccess)).filter(Number.isFinite);
 return {...window,...Object.fromEntries(Object.entries(all).map(([key,items])=>[key,items.slice(0,100)])),counts,sources:(sources||[]).slice(0,100),coverage:{omitted,missingDates,sourcesTruncated:Math.max(0,(sources?.length||0)-100),sourceHasMore:(sources||[]).filter(s=>s.hasMore||Number(s.remaining)>0).map(s=>s.id),lastSync:lastSync.length?Math.max(...lastSync):null,errors,partial:errors.length>0||(sources||[]).some(s=>s.error||s.hasMore||Number(s.remaining)>0),journal:'自启用事件记录后可追溯；旧记录可能缺少完成时间'}};
}
function plain(value){return String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function tokens(query){return [...new Set(String(query).normalize('NFKC').toLowerCase().match(/[a-z0-9]+(?:[-_.][a-z0-9]+)*|[\p{Script=Han}]+/gu)||[])];}
export async function searchKnowledge(store,{query='',site='',projectId='',limit=20,offset=0}={}) {
 const all=[];for(const kind of knowledgeKinds)all.push(...await pages(skip=>store.list(kind,{includeArchived:true,limit:100,offset:skip})));
 const terms=tokens(query),ranked=[];
 for(const record of all){
  if(site&&record.site&&record.site!==site)continue;
  if(projectId&&record.projectId&&record.projectId!==projectId)continue;
  const title=plain(record.title).toLowerCase(),tags=plain(Array.isArray(record.tags)?record.tags.join(' '):record.tags).toLowerCase(),body=plain([record.content,record.body,record.description,record.userNotes].filter(Boolean).join(' ')),lower=body.toLowerCase();
  if(!terms.every(term=>title.includes(term)||tags.includes(term)||lower.includes(term)))continue;
  const score=terms.reduce((sum,term)=>sum+(title.includes(term)?10:0)+(tags.includes(term)?5:0)+(lower.includes(term)?1:0),0);
  const match=terms.map(term=>lower.indexOf(term)).filter(i=>i>=0),start=match.length?Math.max(0,Math.min(...match)-200):0;
  ranked.push({record,score,snippet:body.slice(start,start+2500)});
 }
 ranked.sort((a,b)=>b.score-a.score||Number(b.record.updatedAt)-Number(a.record.updatedAt)||a.record.id.localeCompare(b.record.id));
 const size=Math.max(1,Math.min(100,Math.floor(Number(limit)||20))),skip=Math.max(0,Math.floor(Number(offset)||0));
 return {items:ranked.slice(skip,skip+size).map(({record,score,snippet})=>({...record,snippet,score})),total:ranked.length,limit:size,offset:skip};
}
