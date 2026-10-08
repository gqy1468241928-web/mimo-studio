import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {openStore} from './db.mjs';
import {createSynchronizer} from './sources.mjs';
import {ensureWebsiteSources} from './wordpress.mjs';
import {ensureHostingerRouting} from './hostinger.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
let store,synchronizer;
try{
 // Hostinger creates a private .env for the deployed application.
 // Cron reads it locally; secrets never appear in its command or stdout.
 if(!process.env.DB_NAME){
 for(const candidate of [path.resolve(here,'../.env'),path.resolve(here,'.env')]){
 if(fs.existsSync(candidate)){process.loadEnvFile(candidate);break;}
 }
 }
 if(!process.env.DB_NAME||!process.env.DB_USER||!process.env.DB_PASSWORD||!/^[a-f0-9]{64}$/i.test(process.env.CONFIG_ENCRYPTION_KEY||''))throw Object.assign(new Error('Private sync configuration missing'),{code:'SYNC_CONFIG_MISSING'});
 const routing=await ensureHostingerRouting(here,{production:process.env.NODE_ENV==='production'});
 store=await openStore();
 await ensureWebsiteSources(store);
 synchronizer=createSynchronizer(store,process.env.CONFIG_ENCRYPTION_KEY);
 const sourceKinds=new Map((await store.listSources()).map(s=>[s.id,s.type==='wordpress'?'articles':['imap','hostinger'].includes(s.type)?'inquiries':s.type==='get'?'notes':s.config?.kind||'inquiries']));
 const output=await synchronizer.tick({graceMs:60000,force:process.argv.includes('--force')}),failures=output.results.filter(x=>x.ok===false).length;
 const stored={};for(const kind of ['articles','inquiries','notes'])stored[kind]=(await store.list(kind,{limit:1})).total;
 const articleSources=[];for(const s of (await store.listSources()).filter(s=>s.type==='wordpress'))articleSources.push({site:s.site,stored:(await store.list('articles',{site:s.site,limit:1})).total,total:s.state?.totalCandidates??null,pending:!!s.state?.hasMore,failed:!!s.state?.error});
 const inquiryHistory=(await store.list('inquiries',{history:true,limit:1})).total;
 console.log(JSON.stringify({ok:failures===0,sources:output.results.length,fetched:output.results.reduce((sum,x)=>sum+(x.count||0),0),failures,stored,inquiryHistory,articleSources,counts:output.results.reduce((counts,r)=>{const kind=sourceKinds.get(r.id);counts[kind]=(counts[kind]||0)+(r.count||0);return counts;},{}),routingRepaired:routing.created}));
 process.exitCode=failures?1:0;
}catch(e){console.error(JSON.stringify({ok:false,error:e.code||'SYNC_FAILED'}));process.exitCode=1;}
finally{synchronizer?.stop();await store?.close();}
