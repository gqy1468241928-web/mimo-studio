import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['server/index.mjs'],outfile:'dist/server.mjs',bundle:true,platform:'node',target:'node22',format:'esm',packages:'external'});
console.log('Server built: dist/server.mjs');
