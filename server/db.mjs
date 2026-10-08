import { randomUUID } from 'node:crypto';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
const sqliteQueues=new Map();
const conflict=(message='这条内容已更新，请刷新后再保存')=>Object.assign(new Error(message),{status:409});
const bounded=(value,fallback,max=100)=>Math.max(1,Math.min(max,Math.floor(Number(value)||fallback)));
const offsetOf=value=>Math.max(0,Math.floor(Number(value)||0));
const shanghaiStart=now=>Math.floor((now+28800000)/86400000)*86400000-28800000;
const semantic=value=>JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key])=>!['version','createdAt','updatedAt','sourceTimestamp'].includes(key)))));
export async function openStore(options={}) {
 const sqlite=options.dialect==='sqlite';
 let pool,db;
 if(sqlite){const {DatabaseSync}=await import('node:sqlite');db=new DatabaseSync(options.filename||':memory:');db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');}
 else {const {createPool}=await import('mysql2/promise');pool=createPool({host:options.host||process.env.DB_HOST||'127.0.0.1',port:Number(options.port||process.env.DB_PORT||3306),database:options.database||process.env.DB_NAME,user:options.user||process.env.DB_USER,password:options.password||process.env.DB_PASSWORD,waitForConnections:true,connectionLimit:4,charset:'utf8mb4',timezone:'Z',enableKeepAlive:true});}
 let current;
 async function query(sql,params=[]) {
  if(sqlite){const stmt=db.prepare(sql);if(/^\s*(SELECT|PRAGMA)/i.test(sql))return stmt.all(...params);const r=stmt.run(...params);return {affectedRows:Number(r.changes)};}
  const [rows]=await (current||pool).execute(sql,params);return rows;
 }
 const queueKey=sqlite&&options.filename&&options.filename!==':memory:'?resolve(options.filename).toLowerCase():null;
 let queue=Promise.resolve();
 const lock=fn=>{const work=Promise.all([queue,queueKey?sqliteQueues.get(queueKey):null]).then(fn);queue=work.catch(()=>{});if(queueKey){sqliteQueues.set(queueKey,queue);const pending=queue;pending.then(()=>{if(sqliteQueues.get(queueKey)===pending)sqliteQueues.delete(queueKey);});}return work;};
 const read=fn=>queue.then(fn);
 async function transaction(fn) {
  if(sqlite)db.exec('BEGIN IMMEDIATE');else{current=await pool.getConnection();await current.beginTransaction();}
  try {const value=await fn();if(sqlite)db.exec('COMMIT');else await current.commit();return value;}
  catch(e){if(sqlite)db.exec('ROLLBACK');else await current.rollback();throw e;}
  finally{if(current){current.release();current=null;}}
 }
 const text=sqlite?'TEXT':'LONGTEXT',int=sqlite?'INTEGER':'BIGINT';
 await query('CREATE TABLE IF NOT EXISTS wb_records (id VARCHAR(160) PRIMARY KEY,kind VARCHAR(24) NOT NULL,site VARCHAR(80) NOT NULL,status VARCHAR(24) NOT NULL,title VARCHAR(300) NOT NULL,payload '+text+' NOT NULL,version INTEGER NOT NULL,created_at '+int+' NOT NULL,updated_at '+int+' NOT NULL)');
 await query('CREATE TABLE IF NOT EXISTS wb_sources (id VARCHAR(100) PRIMARY KEY,payload '+text+' NOT NULL,enabled INTEGER NOT NULL,next_run '+int+' NOT NULL,lease VARCHAR(80),lease_until '+int+' NOT NULL)');
 await query('CREATE TABLE IF NOT EXISTS wb_settings (id VARCHAR(80) PRIMARY KEY,payload '+text+' NOT NULL)');
 await query('CREATE TABLE IF NOT EXISTS wb_runs (id VARCHAR(100) PRIMARY KEY,payload '+text+' NOT NULL,applied INTEGER NOT NULL,created_at '+int+' NOT NULL)');
 await query('CREATE TABLE IF NOT EXISTS wb_events (id VARCHAR(100) PRIMARY KEY,record_id VARCHAR(160) NOT NULL,kind VARCHAR(24) NOT NULL,site VARCHAR(80) NOT NULL,project_id VARCHAR(160) NOT NULL,type VARCHAR(40) NOT NULL,at '+int+' NOT NULL,payload '+text+' NOT NULL)');
 await query('CREATE TABLE IF NOT EXISTS wb_jobs (id VARCHAR(160) PRIMARY KEY,lease VARCHAR(80),lease_until '+int+' NOT NULL)');
 await query('CREATE TABLE IF NOT EXISTS wb_replies (inquiry_id VARCHAR(160) PRIMARY KEY,payload '+text+' NOT NULL,version INTEGER NOT NULL,status VARCHAR(24) NOT NULL,automatic INTEGER NOT NULL,attempted_at '+int+',created_at '+int+' NOT NULL,updated_at '+int+' NOT NULL,lease VARCHAR(80))');
 // Create indexes once; mysql has no CREATE INDEX IF NOT EXISTS.
 if(sqlite){await query('CREATE INDEX IF NOT EXISTS wb_records_kind ON wb_records(kind,status,updated_at)');}
 else {const rows=await query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wb_records' AND INDEX_NAME='wb_records_kind'");if(!rows.length)await query('CREATE INDEX wb_records_kind ON wb_records(kind,status,updated_at)');}
 const unpack=row=>row?{...JSON.parse(row.payload),id:row.id,version:Number(row.version),createdAt:Number(row.created_at),updatedAt:Number(row.updated_at)}:null;
 async function get(id){return unpack((await query('SELECT * FROM wb_records WHERE id=?',[id]))[0]);}
 async function event(record,type,at=Date.now()) {
  const value={id:randomUUID(),recordId:record.id||record.inquiryId,kind:record.kind||'inquiries',title:record.title||record.subject||'',site:record.site||'',projectId:record.projectId||'',type,at};
  await query('INSERT INTO wb_events(id,record_id,kind,site,project_id,type,at,payload) VALUES(?,?,?,?,?,?,?,?)',[value.id,value.recordId,value.kind,value.site,value.projectId,type,at,JSON.stringify(value)]);
 }
 async function save(record,expectedVersion) {
  const old=await get(record.id),now=Date.now();
  if(old&&Number(expectedVersion)!==old.version||!old&&Number(expectedVersion)!==0)throw Object.assign(new Error('这条内容已更新，请刷新后再保存'),{status:409});
  const dated=['articles','inquiries'].includes(record.kind),sourceTime=dated?Date.parse(record.kind==='articles'?(record.publishedAt||record.receivedAt):record.receivedAt):NaN;
  const value={...record,...(dated?{sourceTimestamp:Number.isFinite(sourceTime)?sourceTime:old?.sourceTimestamp??now}:{}),version:old?old.version+1:1,createdAt:old?.createdAt??now,updatedAt:now};
  const completed=value.kind==='tasks'&&value.status==='done'&&old?.status!=='done';
  if(value.kind==='tasks'){
   if(completed)value.completedAt=now;
   else if(value.status==='todo')delete value.completedAt;
   else if(old?.completedAt)value.completedAt=old.completedAt;
   else delete value.completedAt;
  }
  if(old&&isDeepStrictEqual(semantic(old),semantic(value)))return old;
  const params=[value.kind,value.site||'',value.status||'new',value.title||'',JSON.stringify(value),value.version,value.updatedAt];
  if(old){const result=await query('UPDATE wb_records SET kind=?,site=?,status=?,title=?,payload=?,version=?,updated_at=? WHERE id=? AND version=?',[...params,value.id,old.version]);if(!result.affectedRows)throw Object.assign(new Error('这条内容已更新，请刷新后再保存'),{status:409});}
  else await query('INSERT INTO wb_records (kind,site,status,title,payload,version,updated_at,id,created_at) VALUES (?,?,?,?,?,?,?,?,?)',[...params,value.id,value.createdAt]);
  await event(value,!old?'record_created':old.status!==value.status?'record_status_changed':'record_updated',now);
  if(completed)await event(value,'task_completed',now);
  return value;
 }
 async function source(id){const row=(await query('SELECT * FROM wb_sources WHERE id=?',[id]))[0];return row?{...JSON.parse(row.payload),enabled:!!row.enabled,nextRun:Number(row.next_run)}:null;}
 const unpackReply=row=>row?{...JSON.parse(row.payload),inquiryId:row.inquiry_id,version:Number(row.version),status:row.status,automatic:!!row.automatic,createdAt:Number(row.created_at),updatedAt:Number(row.updated_at)}:null;
 async function replyRow(id,forUpdate=false){return (await query('SELECT * FROM wb_replies WHERE inquiry_id=?'+(forUpdate&&!sqlite?' FOR UPDATE':''),[id]))[0];}
 async function writeReply(value,lease=null){
  await query('UPDATE wb_replies SET payload=?,version=?,status=?,automatic=?,attempted_at=?,updated_at=?,lease=? WHERE inquiry_id=?',[JSON.stringify(value),value.version,value.status,value.automatic?1:0,value.attemptedAt??null,value.updatedAt,lease,value.inquiryId]);
 }
 async function ensureJob(name){await query((sqlite?'INSERT OR IGNORE':'INSERT IGNORE')+' INTO wb_jobs(id,lease,lease_until) VALUES(?,NULL,0)',[name]);}
 return {
  listEvents:({from=0,to=Date.now()+1,site='',projectId='',limit=100,offset=0}={})=>read(async()=>{
   const clauses=['at>=?','at<?'],params=[Number(from),Number(to)];if(site){clauses.push('site=?');params.push(site);}if(projectId){clauses.push('project_id=?');params.push(projectId);}
   const where=clauses.join(' AND '),size=bounded(limit,100),skip=offsetOf(offset),total=Number((await query('SELECT COUNT(*) AS n FROM wb_events WHERE '+where,params))[0].n);
   const rows=await query('SELECT payload FROM wb_events WHERE '+where+' ORDER BY at DESC,id ASC LIMIT '+size+' OFFSET '+skip,params);
   return {items:rows.map(r=>JSON.parse(r.payload)),total,limit:size,offset:skip};
  }),
  getReply:id=>read(async()=>unpackReply(await replyRow(id))),
  saveReply:(input,expectedVersion)=>lock(()=>transaction(async()=>{
   if(!input?.inquiryId)throw Object.assign(new Error('必须指定询盘 ID'),{status:400});
   const row=await replyRow(input.inquiryId,true),old=unpackReply(row),now=Date.now();
   if(old?Number(expectedVersion)!==old.version:Number(expectedVersion)!==0)throw conflict();
   if(old&&['sending','sent','uncertain'].includes(old.status))throw conflict('回复已进入发送流程，不能覆盖');
   if(input.status&&input.status!=='draft')throw Object.assign(new Error('只能保存草稿回复'),{status:400});
   const value={...old,...input,status:'draft',automatic:!!input.automatic,version:(old?.version||0)+1,createdAt:old?.createdAt??now,updatedAt:now};
   delete value.lease;delete value.sentAt;delete value.providerId;
   if(old)await writeReply(value);else await query('INSERT INTO wb_replies(inquiry_id,payload,version,status,automatic,attempted_at,created_at,updated_at,lease) VALUES(?,?,?,?,?,?,?, ?,NULL)',[value.inquiryId,JSON.stringify(value),value.version,value.status,value.automatic?1:0,value.attemptedAt??null,value.createdAt,now]);
   return value;
  })),
  claimReply:(id,version,{automatic=false,now=Date.now(),dayStart=shanghaiStart(now),maxPerDay=5}={})=>lock(()=>transaction(async()=>{
   if(automatic){await ensureJob('reply-auto-quota');await query('SELECT id FROM wb_jobs WHERE id=?'+(sqlite?'':' FOR UPDATE'),['reply-auto-quota']);}
   const row=await replyRow(id,true),old=unpackReply(row);if(!old||old.version!==Number(version)||old.status!=='draft')throw conflict('回复已更新或已进入发送流程，请刷新后重试');
   if(automatic){const cap=Math.max(0,Math.min(50,Math.floor(Number(maxPerDay)||0)));const count=Number((await query("SELECT COUNT(*) AS n FROM wb_replies WHERE automatic=1 AND status IN ('sending','sent','uncertain') AND attempted_at>=?",[Number(dayStart)]))[0].n);if(count>=cap)throw Object.assign(new Error('今日自动回复数量已达上限'),{status:429});}
   const lease=randomUUID(),value={...old,status:'sending',automatic:!!automatic,attemptedAt:Number(now),updatedAt:Number(now),version:old.version+1};
   await writeReply(value,lease);return {reply:value,lease};
  })),
  finishReply:(id,lease,{status,error,providerId}={})=>lock(()=>transaction(async()=>{
   if(!['sent','failed','uncertain'].includes(status))throw Object.assign(new Error('回复发送结果无效'),{status:400});
   const row=await replyRow(id,true),old=unpackReply(row);if(!old||old.status!=='sending'||!lease||row.lease!==lease)throw conflict('回复发送凭证已失效，请刷新后检查状态');
   const now=Date.now(),value={...old,status,updatedAt:now,version:old.version+1,...(error?{error:String(error)}:{}),...(providerId?{providerId:String(providerId)}:{}),...(status==='sent'?{sentAt:now}:{})};
   await writeReply(value);if(status==='sent'){const inquiry=await get(id);await event({...value,id,kind:'inquiries',title:value.subject||inquiry?.title||'',site:inquiry?.site||'',projectId:inquiry?.projectId||''},'mail_reply_sent',now);}return value;
  })),
  listReplies:({limit=50,offset=0,status='',inquiryId='',from,automatic}={})=>read(async()=>{
   const clauses=[],params=[];if(status){clauses.push('status=?');params.push(status);}if(inquiryId){clauses.push('inquiry_id=?');params.push(inquiryId);}if(from!==undefined){clauses.push('attempted_at>=?');params.push(Number(from));}if(automatic!==undefined){clauses.push('automatic=?');params.push(automatic?1:0);}
   const where=clauses.length?' WHERE '+clauses.join(' AND '):'',size=bounded(limit,50),skip=offsetOf(offset),total=Number((await query('SELECT COUNT(*) AS n FROM wb_replies'+where,params))[0].n);
   const rows=await query('SELECT * FROM wb_replies'+where+' ORDER BY updated_at DESC,inquiry_id ASC LIMIT '+size+' OFFSET '+skip,params);return {items:rows.map(unpackReply),total,limit:size,offset:skip};
  }),
  claimJob:(name,now=Date.now(),ttl=1200000)=>lock(()=>transaction(async()=>{await ensureJob(name);const token=randomUUID(),result=await query('UPDATE wb_jobs SET lease=?,lease_until=? WHERE id=? AND lease_until<=?',[token,Number(now)+Math.max(1,Number(ttl)||1200000),name,Number(now)]);return result.affectedRows?token:null;})),
  releaseJob:(name,token)=>lock(async()=>{await query('UPDATE wb_jobs SET lease=NULL,lease_until=0 WHERE id=? AND lease=?',[name,token]);}),
  get:id=>read(()=>get(id)),
  save:(record,version)=>lock(()=>transaction(()=>save(record,version))),
  markMailRead:id=>lock(()=>transaction(async()=>{
   const record=await get(id);
   if(record?.kind!=='inquiries'||!record.sourceId)throw Object.assign(new Error('同步邮件不存在'),{status:404});
   if(record.readAt)return record;
   return save({...record,readAt:Date.now()},record.version);
  })),
  list:(kind,{site='',projectId='',includeArchived=false,history=false,limit=50,offset=0,search='',status='',category=''}={})=>read(async()=>{
   const conditions=['kind=?'],params=[kind];
   if(site){conditions.push('site=?');params.push(site);}
   if(!includeArchived){if(history){conditions.push("status='archived'");}else conditions.push("status<>'archived'");}
   if(projectId){conditions.push("COALESCE("+(sqlite?"json_extract(payload,'$.projectId')":"JSON_UNQUOTE(JSON_EXTRACT(payload,'$.projectId'))")+",'')=?");params.push(projectId);}
   if(status){conditions.push('status=?');params.push(status);}
   if(category){conditions.push(sqlite?"json_extract(payload,'$.category')=?":"JSON_UNQUOTE(JSON_EXTRACT(payload,'$.category'))=?");params.push(category);}
   if(search){conditions.push("(title LIKE ? OR payload LIKE ?)");const term='%'+String(search).replace(/[%_\\]/g,' ')+'%';params.push(term,term);}
   const where=conditions.join(' AND '),total=Number((await query('SELECT COUNT(*) AS n FROM wb_records WHERE '+where,params))[0].n);
   // Limits are bounded integers interpolated for compatible mysql prepared statements.
   const size=bounded(limit,50),skip=offsetOf(offset);
   const sourceSort=sqlite?"CAST(json_extract(payload,'$.sourceTimestamp') AS INTEGER)":"CAST(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.sourceTimestamp')) AS SIGNED)";
   const order=['articles','inquiries'].includes(kind)?'COALESCE('+sourceSort+',updated_at) DESC,updated_at DESC,id ASC':'updated_at DESC,id ASC';
   const rows=await query('SELECT * FROM wb_records WHERE '+where+' ORDER BY '+order+' LIMIT '+Math.floor(size)+' OFFSET '+skip,params);
   return {items:rows.map(unpack),total,limit:size,offset:skip};
  }),
  remove:(id,version)=>lock(()=>transaction(async()=>{const old=await get(id);const result=await query('DELETE FROM wb_records WHERE id=? AND version=?',[id,Number(version)]);if(!result.affectedRows)throw conflict('这条内容已更新，请刷新后再操作');await event(old,'record_deleted');})),
  upsertExternal:record=>lock(()=>transaction(async()=>{
   const old=await get(record.id);
   if(old?.status==='archived')return old;
   const merged=old?{...old,...record,status:old.status,site:old.site,projectId:old.projectId,tags:old.tags,userNotes:old.userNotes,readAt:old.readAt||record.readAt}:record;
   return save(merged,old?.version||0);
  })),
  scheduleSource:id=>lock(async()=>{
   await query('UPDATE wb_sources SET next_run=0 WHERE id=? AND enabled=1',[id]);
   return !!(await source(id))?.enabled;
  }),
  listSources:()=>read(async()=>{const rows=await query('SELECT * FROM wb_sources ORDER BY id');return rows.map(r=>({...JSON.parse(r.payload),enabled:!!r.enabled,nextRun:Number(r.next_run)}));}),
  getSource:id=>read(()=>source(id)),
  saveSource:value=>lock(async()=>{
   const old=await source(value.id),payload=JSON.stringify({...old,...value});
   if(old)await query('UPDATE wb_sources SET payload=?,enabled=?,next_run=? WHERE id=?',[payload,value.enabled?1:0,Number(value.nextRun??old.nextRun??0),value.id]);
   else await query('INSERT INTO wb_sources(id,payload,enabled,next_run,lease,lease_until) VALUES(?,?,?,?,NULL,0)',[value.id,payload,value.enabled?1:0,Number(value.nextRun||0)]);
   return source(value.id);
  }),
  deleteSource:id=>lock(async()=>{await query('DELETE FROM wb_sources WHERE id=?',[id]);}),
  claimSource:(id,now=Date.now(),force=false,graceMs=0)=>lock(async()=>{
   const lease=randomUUID();const result=await query('UPDATE wb_sources SET lease=?,lease_until=? WHERE id=? AND enabled=1 AND lease_until<=?'+(force?'':' AND next_run<=?'),[lease,now+300000,id,now,...(force?[]:[now+Math.max(0,Math.min(60000,graceMs))])]);return result.affectedRows?lease:null;
  }),
  finishSource:(id,lease,state,nextRun)=>lock(async()=>{
   const value=await source(id);if(!value)return;
   await query('UPDATE wb_sources SET payload=?,next_run=?,lease=NULL,lease_until=0 WHERE id=? AND lease=?',[JSON.stringify({...value,state}),nextRun,id,lease]);
  }),
  getSetting:id=>read(async()=>{const row=(await query('SELECT payload FROM wb_settings WHERE id=?',[id]))[0];return row?JSON.parse(row.payload):null;}),
  setSetting:(id,value)=>lock(async()=>{const rows=await query('SELECT id FROM wb_settings WHERE id=?',[id]);if(rows.length)await query('UPDATE wb_settings SET payload=? WHERE id=?',[JSON.stringify(value),id]);else await query('INSERT INTO wb_settings(id,payload) VALUES(?,?)',[id,JSON.stringify(value)]);}),
  saveRun:run=>lock(async()=>{await query('INSERT INTO wb_runs (id,payload,applied,created_at) VALUES(?,?,0,?)',[run.id,JSON.stringify({...run,createdAt:Date.now()}),Date.now()]);return run;}),
  listRuns:()=>read(async()=>{const rows=await query('SELECT * FROM wb_runs ORDER BY created_at DESC LIMIT 30');return rows.map(r=>({...JSON.parse(r.payload),applied:!!r.applied}));}),
  applyRun:id=>lock(()=>transaction(async()=>{
   const row=(await query('SELECT * FROM wb_runs WHERE id=?'+(sqlite?'':' FOR UPDATE'),[id]))[0];
   if(!row)throw Object.assign(new Error('建议不存在'),{status:404});
   const run=JSON.parse(row.payload);
   if(!row.applied){for(const [i,task] of (run.tasks||[]).entries())await save({id:'agent_'+id+'_'+i,kind:'tasks',site:task.site||'',title:task.title,status:'todo',due:task.due||'',content:task.content||'',projectId:run.projectId||''},0);await query('UPDATE wb_runs SET applied=1 WHERE id=?',[id]);}
   return {...run,applied:true};
  })),
  backup:()=>read(async()=>{const rows=await query('SELECT * FROM wb_records ORDER BY created_at');return {format:'mimo-backup-v1',exportedAt:Date.now(),records:rows.map(unpack)};}),
  close:async()=>{await queue;if(sqlite)db.close();else await pool.end();}
 };
}
