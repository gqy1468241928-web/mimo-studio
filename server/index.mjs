import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {openStore} from './db.mjs';
import {createApp} from './app.mjs';
import {createSynchronizer} from './sources.mjs';
import {hashPassword} from './security.mjs';
const production=process.env.NODE_ENV==='production';
const config={production,appUrl:process.env.APP_URL||'http://localhost:3000',sessionKey:process.env.SESSION_SECRET,encryptionKey:process.env.CONFIG_ENCRYPTION_KEY,cronSecret:process.env.CRON_SECRET,initialHash:process.env.INITIAL_PASSWORD_HASH};
if(!production){config.sessionKey||='a'.repeat(64);config.encryptionKey||='b'.repeat(64);config.cronSecret||='local-development-only';config.initialHash||=hashPassword(process.env.DEV_PASSWORD||'local-workbench');}
if(!/^[a-f0-9]{64}$/i.test(config.encryptionKey||'')||!config.sessionKey||config.sessionKey.length<32||!config.cronSecret||config.cronSecret.length<20) {
 if(production)throw new Error('必须设置服务器会话、加密及定时任务密钥');
}
if(production&&(!process.env.DB_NAME||!process.env.DB_USER||!process.env.DB_PASSWORD))throw new Error('必须设置 MySQL 数据库配置');
const store=await openStore(production||process.env.DB_NAME?{}:{dialect:'sqlite',filename:process.env.SQLITE_FILE||path.resolve('workbench-dev.sqlite')});
const synchronizer=createSynchronizer(store,config.encryptionKey);
const here=path.dirname(fileURLToPath(import.meta.url)),publicDir=path.join(here,'public');
const app=await createApp({store,config,synchronizer,publicDir:fs.existsSync(publicDir)?publicDir:undefined});
const server=app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('MiMo workbench ready'));
synchronizer.start();
async function shutdown(){synchronizer.stop();server.close();await store.close();process.exit(0);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
