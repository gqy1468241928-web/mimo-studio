import {build} from 'esbuild';
import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const [source,target] of [['server/index.mjs','dist/server.mjs'],['server/sync-cli.mjs','dist/sync.mjs']]){
 await build({entryPoints:[source],outfile:target,bundle:true,platform:'node',target:'node22',format:'esm',packages:'external'});
}
// Hostinger deploys only the output directory. Keep runtime packages beside it.
await cp('node_modules','dist/node_modules',{recursive:true,dereference:true});
const pkg=JSON.parse(await readFile('package.json','utf8'));
await writeFile('dist/package.json',JSON.stringify({name:pkg.name,version:pkg.version,private:true,type:'module',main:'server.mjs'},null,2));
const keys=['NODE_ENV','APP_URL','DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD','SESSION_SECRET','CONFIG_ENCRYPTION_KEY','CRON_SECRET','INITIAL_PASSWORD_HASH'];
if(process.env.DB_NAME){
 for(const key of keys)if(!process.env[key])throw new Error('Missing runtime environment: '+key);
 // This file stays in Hostinger's private Node application folder.
 // Express exposes only the public/ subdirectory. It is never part of source exports.
 await writeFile('dist/.env',keys.map(key=>key+'='+JSON.stringify(process.env[key])).join('\n')+'\n',{mode:0o600});
}
// LiteSpeed watches this marker when current switches to a new private build.
await mkdir('dist/tmp',{recursive:true});
await writeFile('dist/tmp/restart.txt',String(Date.now())+'\n');
console.log('Self-contained Node runtime and background sync built');
