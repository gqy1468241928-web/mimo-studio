import { randomUUID } from 'node:crypto';
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
 let queue=Promise.resolve();
 const lock=fn=>{const work=queue.then(fn);queue=work.catch(()=>{});return work;};
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
 // Create indexes once; mysql has no CREATE INDEX IF NOT EXISTS.
 if(sqlite){await query('CREATE INDEX IF NOT EXISTS wb_records_kind ON wb_records(kind,status,updated_at)');}
 else {const rows=await query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wb_records' AND INDEX_NAME='wb_records_kind'");if(!rows.length)await query('CREATE INDEX wb_records_kind ON wb_records(kind,status,updated_at)');}
 const unpack=row=>row?{...JSON.parse(row.payload),id:row.id,version:Number(row.version),createdAt:Number(row.created_at),updatedAt:Number(row.updated_at)}:null;
 async function get(id){return unpack((await query('SELECT * FROM wb_records WHERE id=?',[id]))[0]);}
 async function save(record,expectedVersion) {
  const old=await get(record.id),now=Date.now();
  if(old&&Number(expectedVersion)!==old.version||!old&&Number(expectedVersion)!==0)throw Object.assign(new Error('这条内容已更新，请刷新后再保存'),{status:409});
  const dated=['articles','inquiries'].includes(record.kind),sourceTime=dated?Date.parse(record.kind==='articles'?(record.publishedAt||record.receivedAt):record.receivedAt):NaN;
  const value={...record,...(dated?{sourceTimestamp:Number.isFinite(sourceTime)?sourceTime:now}:{}),version:old?old.version+1:1,createdAt:old?.createdAt||now,updatedAt:now};
  const params=[value.kind,value.site||'',value.status||'new',value.title||'',JSON.stringify(value),value.version,value.updatedAt];
  if(old){const result=await query('UPDATE wb_records SET kind=?,site=?,status=?,title=?,payload=?,version=?,updated_at=? WHERE id=? AND version=?',[...params,value.id,old.version]);if(!result.affectedRows)throw Object.assign(new Error('这条内容已更新，请刷新后再保存'),{status:409});}
  else await query('INSERT INTO wb_records (kind,site,status,title,payload,version,updated_at,id,created_at) VALUES (?,?,?,?,?,?,?,?,?)',[...params,value.id,value.createdAt]);
  return value;
 }
 async function source(id){const row=(await query('SELECT * FROM wb_sources WHERE id=?',[id]))[0];return row?{...JSON.parse(row.payload),enabled:!!row.enabled,nextRun:Number(row.next_run)}:null;}
 return {
  get:id=>read(()=>get(id)),
  save:(record,version)=>lock(()=>save(record,version)),
  markMailRead:id=>lock(async()=>{
   const record=await get(id);
   if(record?.kind!=='inquiries'||!record.sourceId)throw Object.assign(new Error('同步邮件不存在'),{status:404});
   if(record.readAt)return record;
   return save({...record,readAt:Date.now()},record.version);
  }),
  list:(kind,{site='',history=false,limit=50,offset=0,search='',status='',category=''}={})=>read(async()=>{
   const conditions=['kind=?'],params=[kind];
   if(site){conditions.push('site=?');params.push(site);}
   if(history){conditions.push("status='archived'");}else conditions.push("status<>'archived'");
   if(status){conditions.push('status=?');params.push(status);}
   if(category){conditions.push(sqlite?"json_extract(payload,'$.category')=?":"JSON_UNQUOTE(JSON_EXTRACT(payload,'$.category'))=?");params.push(category);}
   if(search){conditions.push("(title LIKE ? OR payload LIKE ?)");const term='%'+String(search).replace(/[%_\\]/g,' ')+'%';params.push(term,term);}
   const where=conditions.join(' AND '),total=Number((await query('SELECT COUNT(*) AS n FROM wb_records WHERE '+where,params))[0].n);
   // Limits are bounded integers interpolated for compatible mysql prepared statements.
   const size=Math.max(1,Math.min(100,Number(limit)||50)),skip=Math.max(0,Math.floor(Number(offset)||0));
   const sourceSort=sqlite?"CAST(json_extract(payload,'$.sourceTimestamp') AS INTEGER)":"CAST(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.sourceTimestamp')) AS SIGNED)";
   const order=['articles','inquiries'].includes(kind)?'COALESCE('+sourceSort+',updated_at) DESC,updated_at DESC,id ASC':'updated_at DESC,id ASC';
   const rows=await query('SELECT * FROM wb_records WHERE '+where+' ORDER BY '+order+' LIMIT '+Math.floor(size)+' OFFSET '+skip,params);
   return {items:rows.map(unpack),total,limit:size,offset:skip};
  }),
  remove:(id,version)=>lock(async()=>{const result=await query('DELETE FROM wb_records WHERE id=? AND version=?',[id,Number(version)]);if(!result.affectedRows)throw Object.assign(new Error('这条内容已更新，请刷新后再操作'),{status:409});}),
  upsertExternal:record=>lock(async()=>{
   const old=await get(record.id);
   if(old?.status==='archived')return old;
   const merged=old?{...old,...record,status:old.status,site:old.site,projectId:old.projectId,tags:old.tags,userNotes:old.userNotes,readAt:old.readAt||record.readAt}:record;
   return save(merged,old?.version||0);
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
