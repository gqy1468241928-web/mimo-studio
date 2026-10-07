import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const [source,target] of [['server/index.mjs','dist/server.mjs'],['server/sync-cli.mjs','dist/sync.mjs']]){
 await build({entryPoints:[source],outfile:target,bundle:true,platform:'node',target:'node22',format:'esm',packages:'external'});
}
console.log('Server built: dist/server.mjs; background sync: dist/sync.mjs');
