import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {openStore} from './db.mjs';
import {createSynchronizer} from './sources.mjs';
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
 store=await openStore();
 synchronizer=createSynchronizer(store,process.env.CONFIG_ENCRYPTION_KEY);
 const output=await synchronizer.tick({graceMs:60000}),failures=output.results.filter(x=>x.ok===false).length;
 console.log(JSON.stringify({ok:failures===0,sources:output.results.length,fetched:output.results.reduce((sum,x)=>sum+(x.count||0),0),failures}));
 process.exitCode=failures?1:0;
}catch(e){console.error(JSON.stringify({ok:false,error:e.code||'SYNC_FAILED'}));process.exitCode=1;}
finally{synchronizer?.stop();await store?.close();}
