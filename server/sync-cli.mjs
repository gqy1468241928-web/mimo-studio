import {openStore} from './db.mjs';
import {createSynchronizer} from './sources.mjs';
if(!process.env.DB_NAME||!process.env.DB_USER||!process.env.DB_PASSWORD||!/^[a-f0-9]{64}$/i.test(process.env.CONFIG_ENCRYPTION_KEY||''))throw new Error('Sync environment is missing');
let store,synchronizer;
try{
 store=await openStore();
 synchronizer=createSynchronizer(store,process.env.CONFIG_ENCRYPTION_KEY);
 const output=await synchronizer.tick();
 const failures=output.results.filter(x=>x.ok===false).length;
 console.log(JSON.stringify({ok:failures===0,sources:output.results.length,fetched:output.results.reduce((sum,x)=>sum+(x.count||0),0),failures}));
 process.exitCode=failures?1:0;
}catch(e){console.error(JSON.stringify({ok:false,error:e.code||'SYNC_FAILED'}));process.exitCode=1;}
finally{synchronizer?.stop();await store?.close();}
