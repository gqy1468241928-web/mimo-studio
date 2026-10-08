import express from 'express';
import {randomUUID,createHash} from 'node:crypto';
import {recoveryRecipient,decryptRecovery,recoverySources} from './source-recovery.mjs';
import {z} from 'zod';
import {seal,unseal,equal,signSession,verifySession,cookieValue,hashPassword,checkPassword,publicUrl} from './security.mjs';
import {runAgent} from './agent.mjs';
import {getNoteDetail} from './sources.mjs';
import {parseImport} from './import.mjs';
import {hostingerMailboxes,validateHostingerConfig,readHostingerBody} from './hostinger-mail.mjs';
export const kinds=['tasks','articles','inquiries','mic','keywords','resources','notes','prompts','projects'];
const site=z.enum(['','apexcomponent.com','globalwellpcb.com']).default('');
const small=z.string().max(500).default('');
const recordSchema=z.object({
 id:z.string().max(160).optional(),kind:z.enum(kinds),site,title:z.string().trim().min(1,'请填写标题').max(300),
 status:z.enum(['todo','done','new','draft','writing','published','following','archived']).default('new'),
 content:z.string().max(200000).default(''),due:z.string().max(20).default(''),url:z.string().max(2000).default(''),
 sender:small,company:small,country:small,userNotes:z.string().max(10000).default(''),category:small,tags:small,keyword:small,intent:small,volume:small,projectId:small,
 sourceId:z.string().max(100).optional(),externalId:small,messageId:small,receivedAt:small,truncated:z.boolean().optional(),reviewedAt:z.number().optional()
});
const sourceSchema=z.object({id:z.string().max(100).optional(),name:z.string().trim().min(1).max(100),type:z.enum(['imap','api','get','hostinger']),site,enabled:z.boolean().default(true),secret:z.string().max(8192).optional(),
 config:z.object({mailboxId:z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).optional(),host:z.string().max(255).optional(),user:z.string().max(300).optional(),folder:z.string().max(200).optional(),days:z.coerce.number().min(1).max(90).optional(),
 endpoint:z.string().max(2000).optional(),headerName:z.string().regex(/^[A-Za-z0-9-]{1,80}$/).optional(),authMode:z.enum(['raw','bearer']).optional(),clientId:z.string().max(500).optional(),
 listPath:z.string().max(100).optional(),idField:z.string().max(100).optional(),titleField:z.string().max(100).optional(),contentField:z.string().max(100).optional(),senderField:z.string().max(100).optional(),urlField:z.string().max(100).optional(),dateField:z.string().max(100).optional(),kind:z.enum(kinds).optional()}).default({})
});
const safeSource=({secret,...s})=>({...s,hasSecret:!!secret});
const safeAgent=config=>config?{endpoint:config.endpoint,model:config.model,hasSecret:!!config.secret}:{endpoint:'https://api.openai.com/v1',model:'',hasSecret:false};
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
export async function createApp({store,config,synchronizer,publicDir}){
 const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
 if(!await store.getSetting('auth')){
 if(!config.initialHash)throw new Error('INITIAL_PASSWORD_HASH 尚未设置');
 await store.setSetting('auth',{hash:config.initialHash,revision:0});
 }
 app.use((req,res,next)=>{
 res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','same-origin');res.setHeader('x-frame-options','DENY');
 if(config.production)res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 if(req.path.startsWith('/api/'))res.setHeader('cache-control','no-store');next();
 });
 app.use((req,res,next)=>{
 if(config.production&&req.protocol!=='https'&&req.path!=='/api/health'){
 if(['GET','HEAD'].includes(req.method))return res.redirect(308,config.appUrl.replace(/\/$/,'')+req.originalUrl);
 return res.status(400).json({error:'请通过 HTTPS 访问工作台'});
 }next();
 });
 app.use(express.json({limit:'3mb'}));
 app.use('/api',(req,res,next)=>{
 if(['POST','PUT','PATCH','DELETE'].includes(req.method)){
 if(!req.is('application/json'))return res.status(415).json({error:'请使用 JSON 请求'});
 const origin=req.get('origin');
 const allowed=new Set([config.appUrl,new URL(config.appUrl).origin]);
 if(!config.production)allowed.add('http://localhost:5173');
 if(origin&&!allowed.has(origin)||req.get('sec-fetch-site')==='cross-site')return res.status(403).json({error:'请求来源不被允许'});
 }next();
 });
 const authenticated=async req=>{
 const value=verifySession(cookieValue(req),config.sessionKey);
 if(!value)return false;const auth=await store.getSetting('auth');return auth&&value.revision===auth.revision;
 };
 const requireAuth=asyncRoute(async(req,res)=>{if(!await authenticated(req))return res.status(401).json({error:'请先登录'});req.authenticated=true;});
 // Normal middleware must call next when authenticated.
 const guard=(req,res,next)=>authenticated(req).then(ok=>ok?next():res.status(401).json({error:'请先登录'})).catch(next);
 app.get('/api/health',asyncRoute(async(_req,res)=>{await store.getSetting('auth');res.json({ok:true,version:'1.0.0'});}));
 app.get('/api/auth/session',asyncRoute(async(req,res)=>res.json({authenticated:!!await authenticated(req)})));
 const attempts=new Map();
 app.post('/api/auth/login',asyncRoute(async(req,res)=>{
 const ip=req.ip,now=Date.now(),old=attempts.get(ip);
 if(old&&old.until>now&&old.count>=10)return res.status(429).json({error:'登录尝试过多，请 15 分钟后再试'});
 const input=z.object({password:z.string().min(1).max(256)}).parse(req.body),auth=await store.getSetting('auth');
 if(!checkPassword(input.password,auth.hash)){attempts.set(ip,{count:old&&old.until>now?old.count+1:1,until:now+900000});if(attempts.size>1000)for(const [k,v]of attempts)if(v.until<now)attempts.delete(k);return res.status(401).json({error:'密码不正确'});}
 attempts.delete(ip);res.cookie('mimo_session',signSession(config.sessionKey,now,86400,auth.revision),{httpOnly:true,secure:config.production,sameSite:'strict',maxAge:86400000,path:'/'});
 res.json({ok:true});
 }));
 app.post('/api/auth/logout',(_req,res)=>{res.clearCookie('mimo_session',{path:'/',secure:config.production,httpOnly:true,sameSite:'strict'});res.json({ok:true});});
 app.post('/api/sync',asyncRoute(async(req,res)=>{
 if(!equal(req.get('x-cron-secret'),config.cronSecret)&&!await authenticated(req))return res.status(401).json({error:'请先登录'});
 res.json(await synchronizer.tick({force:false}));
 }));
 app.get('/api/source-recovery/key',(_req,res)=>res.json(recoveryRecipient(config.encryptionKey,config.appUrl)));
 app.get('/api/source-recovery/receipt/:id',asyncRoute(async(req,res)=>{
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(req.params.id))return res.status(404).json({error:'恢复记录不存在'});
  const receipt=await store.getSetting('source-recovery:'+req.params.id);
  if(!receipt||receipt.expiresAt<Date.now())return res.status(404).json({error:'恢复记录不存在'});
  res.json({done:receipt.done,count:receipt.count,synced:receipt.synced,failed:receipt.failed});
 }));
 app.use('/api',guard);
 let recoveryWork=Promise.resolve();
 app.post('/api/source-recovery',asyncRoute(async(req,res)=>{
  const bundle=z.object({bundle:z.string().max(24000)}).parse(req.body).bundle;
  const payload=decryptRecovery(bundle,config.encryptionKey,config.appUrl);
  const allowed=config.recoverySources||recoverySources;
  const values=payload.sources.map(raw=>{
   const approved=allowed.find(s=>s.id===raw.id);
   if(!approved||raw.type!==approved.type||typeof raw.secret!=='string'||!equal(createHash('sha256').update(raw.secret).digest('hex'),approved.secretHash))throw new Error('仅支持本次授权的原连接');
   const input=sourceSchema.parse({...approved,secret:raw.secret,enabled:raw.enabled===true});
   if(!input.secret||!['hostinger','get'].includes(input.type))throw new Error('恢复配置无效');
   if(input.type==='hostinger')validateHostingerConfig(input);
   if(input.type==='get'&&!input.config.clientId)throw new Error('恢复配置无效');
   return input;
  });
  if(new Set(values.map(s=>s.id)).size!==values.length)throw new Error('恢复配置重复');
  const receiptId='source-recovery:'+payload.id;
  const operation=recoveryWork.then(async()=>{
   const receipt=await store.getSetting(receiptId);
   if(receipt)return {count:receipt.count};
   const existing=await store.listSources(),saved=[];
   for(const input of values){
    const old=existing.find(s=>s.id===input.id||s.type===input.type&&(input.type==='hostinger'?s.config.mailboxId===input.config.mailboxId:s.config.clientId===input.config.clientId));
    if(old?.secret){saved.push(old);continue;}
    const id=old?.id||input.id,secret=seal(input.secret,config.encryptionKey,id);
    saved.push(await store.saveSource({...old,...input,id,secret,state:old?.state||{},nextRun:0}));
   }
   const receiptValue={count:saved.length,expiresAt:payload.expiresAt,done:false,synced:0,failed:0};
   await store.setSetting(receiptId,receiptValue);
   Promise.allSettled(saved.filter(s=>s.enabled).map(s=>synchronizer.syncOne(s.id,{force:true}))).then(async(results)=>{
    await store.setSetting(receiptId,{...receiptValue,done:true,synced:results.filter(r=>r.status==='fulfilled'&&r.value?.ok).length,failed:results.filter(r=>r.status==='rejected'||r.value?.ok===false).length});
   }).catch(()=>{});
   return {count:saved.length};
  });
  recoveryWork=operation.catch(()=>{});res.json(await operation);
 }));

 app.post('/api/auth/password',asyncRoute(async(req,res)=>{
 const input=z.object({currentPassword:z.string().max(256),password:z.string().min(12,'新密码至少 12 位').max(256)}).parse(req.body),auth=await store.getSetting('auth');
 if(!checkPassword(input.currentPassword,auth.hash))return res.status(400).json({error:'当前密码不正确'});
 await store.setSetting('auth',{hash:hashPassword(input.password),revision:auth.revision+1});
 res.clearCookie('mimo_session',{path:'/'});res.json({ok:true});
 }));
 app.get('/api/records',asyncRoute(async(req,res)=>{
 const kind=z.enum(kinds).parse(req.query.kind),options={site:site.parse(req.query.site||''),history:req.query.history==='1',status:String(req.query.status||''),category:String(req.query.category||'').slice(0,30),search:String(req.query.search||'').slice(0,100),limit:Number(req.query.limit||50),offset:Number(req.query.offset||0)};
 res.json(await store.list(kind,options));
 }));
 app.get('/api/records/:id',asyncRoute(async(req,res)=>{
 const record=await store.get(req.params.id);if(!record)return res.status(404).json({error:'内容不存在'});res.json(record);
 }));
 app.post('/api/records',asyncRoute(async(req,res)=>{
 const value=recordSchema.parse({...req.body,id:randomUUID()});res.json(await store.save(value,0));
 }));
 app.put('/api/records/:id',asyncRoute(async(req,res)=>{
 const old=await store.get(req.params.id);if(!old)return res.status(404).json({error:'内容不存在'});
 const input=recordSchema.parse({...old,...req.body,id:old.id,kind:old.kind});
 if(input.status==='archived'&&old.status!=='archived')input.reviewedAt=Date.now();
 res.json(await store.save(input,Number(req.body.version)));
 }));
 app.delete('/api/records/:id',asyncRoute(async(req,res)=>{
 const record=await store.get(req.params.id);
 if(!record)return res.status(404).json({error:'内容不存在'});
 if(record.sourceId)return res.status(400).json({error:'同步内容请使用归档，避免再次收取时重复出现'});
 await store.remove(record.id,Number(req.body.version));res.json({ok:true});
 }));
 app.get('/api/backup',asyncRoute(async(_req,res)=>res.json(await store.backup())));
 app.post('/api/import',asyncRoute(async(req,res)=>{
 const input=z.object({text:z.string().max(2097152),kind:z.enum(kinds).optional(),site,category:z.string().max(30).default(''),format:z.enum(['csv','json'])}).parse(req.body);
 const rows=parseImport(input),valid=rows.map(row=>recordSchema.parse({...row,volume:String(row.volume||'')}));
 for(const row of valid)await store.upsertExternal(row);res.json({count:valid.length});
 }));
 app.post('/api/hostinger/mailboxes',asyncRoute(async(req,res)=>{
 const input=z.object({sourceId:z.string().max(100).optional(),secret:z.string().max(8192).optional()}).parse(req.body);
 const saved=input.sourceId?await store.getSource(input.sourceId):null;
 if(input.sourceId&&saved?.type!=='hostinger')return res.status(404).json({error:'Hostinger 来源不存在'});
 const secret=input.secret|| (saved?.secret?unseal(saved.secret,config.encryptionKey,saved.id):'');
 res.json(await hostingerMailboxes(secret));
 }));
 app.post('/api/mail/:id/detail',asyncRoute(async(req,res)=>{
 const item=await store.get(req.params.id),source=item?.sourceId?await store.getSource(item.sourceId):null;
 if(item?.kind!=='inquiries'||source?.type!=='hostinger')return res.status(400).json({error:'这条记录不是 Hostinger 邮件'});
 const detail=await readHostingerBody(source,unseal(source.secret,config.encryptionKey,source.id),item.externalId);
 res.json(await store.save({...item,...detail},item.version));
 }));
 app.get('/api/sources',asyncRoute(async(_req,res)=>res.json((await store.listSources()).map(safeSource))));
 app.post('/api/sources',asyncRoute(async(req,res)=>{
 const input=sourceSchema.parse(req.body),old=input.id?await store.getSource(input.id):null;
 if(input.id&&!old)return res.status(404).json({error:'来源不存在'});
 const id=old?.id||randomUUID();
 if(input.type==='imap'){
 if(!input.config.host||!input.config.user)throw new Error('请填写 IMAP 主机和邮箱地址');
 publicUrl('https://'+input.config.host);
 }
 if(input.type==='api'){if(!input.config.endpoint)throw new Error('请填写 API 列表地址');publicUrl(input.config.endpoint);}
 if(input.type==='hostinger')validateHostingerConfig(input);
 if(input.type==='get'&&!input.config.clientId)throw new Error('请填写得到大脑 Client ID');
 const secret=input.secret?seal(input.secret,config.encryptionKey,id):old?.secret||'';
 if(input.type!=='api'&&input.enabled&&!secret)throw new Error('请填写授权码或 API Key');
 const value={...old,...input,id,secret,state:old?.state||{},nextRun:0};
 const saved=await store.saveSource(value);res.json(safeSource(saved));
 }));
 app.delete('/api/sources/:id',asyncRoute(async(req,res)=>{await store.deleteSource(req.params.id);res.json({ok:true});}));
 app.post('/api/sources/:id/test',asyncRoute(async(req,res)=>res.json(await synchronizer.syncOne(req.params.id,{testOnly:true}))));
 app.post('/api/sources/:id/fetch',asyncRoute(async(req,res)=>res.json(await synchronizer.syncOne(req.params.id,{force:true}))));
 app.post('/api/notes/:id/detail',asyncRoute(async(req,res)=>{
 const item=await store.get(req.params.id);if(!item?.sourceId)return res.status(400).json({error:'不是来自得到大脑的笔记'});
 const source=await store.getSource(item.sourceId);if(!source)return res.status(404).json({error:'来源配置已移除'});
 const note=await getNoteDetail(source,config.encryptionKey,item.externalId);
 const body=typeof note.content==='string'?note.content:JSON.stringify(note,null,2);
 res.json(await store.save({...item,content:body.slice(0,200000)},item.version));
 }));
 app.get('/api/agent/config',asyncRoute(async(_req,res)=>res.json(safeAgent(await store.getSetting('agent')))));
 app.post('/api/agent/config',asyncRoute(async(req,res)=>{
 const input=z.object({endpoint:z.string().max(2000),model:z.string().trim().min(1).max(200),secret:z.string().max(8192).optional()}).parse(req.body);
 publicUrl(input.endpoint);const old=await store.getSetting('agent'),secret=input.secret?seal(input.secret,config.encryptionKey,'agent'):old?.secret||'';
 if(!secret)throw new Error('请填写 Agent API Key');
 await store.setSetting('agent',{endpoint:input.endpoint,model:input.model,secret});res.json(safeAgent({ ...input,secret}));
 }));
 app.get('/api/agent/runs',asyncRoute(async(_req,res)=>res.json(await store.listRuns())));
 let agentRunning=false;
 app.post('/api/agent/run',asyncRoute(async(req,res)=>{
 if(agentRunning)return res.status(409).json({error:'Agent 正在整理，请等待本次完成'});
 const input=z.object({action:z.enum(['emails','keywords','project','custom']),site,prompt:z.string().max(10000).default(''),projectId:z.string().max(100).default('')}).parse(req.body);
 agentRunning=true;try{res.json(await runAgent(store,config.encryptionKey,input));}finally{agentRunning=false;}
 }));
 app.post('/api/agent/runs/:id/apply',asyncRoute(async(req,res)=>res.json(await store.applyRun(req.params.id))));
 app.use('/api',(_req,res)=>res.status(404).json({error:'接口不存在'}));
 if(publicDir){app.use(express.static(publicDir,{index:false,maxAge:3600000}));app.get('/{*path}',(_req,res)=>res.sendFile('index.html',{root:publicDir}));}
 app.use((error,_req,res,_next)=>{
 if(error instanceof z.ZodError)return res.status(400).json({error:error.issues[0]?.message||'字段格式有误'});
 if(error.type==='entity.too.large')return res.status(413).json({error:'请求数据过大'});
 const known=error.status||400;
 if(error.code||error.sqlMessage){console.error('Storage request failed:',error.code||'unknown');return res.status(503).json({error:'数据服务暂时不可用，请稍后重试'});}
 res.status(known).json({error:error.message||'操作失败，请重试'});
 });
 return app;
}
