import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,unlink,rmdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {hostingerRouting,restoreMissingRoute,ensureHostingerRouting} from '../server/hostinger.mjs';
test('published build routes stay on current version outside the public folder',()=>{
 const root='/home/u888237670/domains/mimo-studio.top';
 const route=hostingerRouting(root+'/hbuilds/versions/build-123/nodejs');
 assert.equal(route.publicDirectory,root+'/public_html');
 assert.match(route.content,/PassengerAppRoot \/home\/u888237670\/domains\/mimo-studio\.top\/hbuilds\/current\/nodejs/);
 assert.match(route.content,/PassengerStartupFile server\.mjs/);
 assert.equal(hostingerRouting('/tmp/other-project'),null);
});
test('restore a missing route once and preserve any existing provider configuration',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'mimo-routing-'));
 const file=path.join(dir,'.htaccess');
 try{
  assert.equal((await restoreMissingRoute(dir,'initial-route\n')).created,true);
  assert.equal(await readFile(file,'utf8'),'initial-route\n');
  await writeFile(file,'provider-route\n');
  assert.equal((await restoreMissingRoute(dir,'replacement-route\n')).created,false);
  assert.equal(await readFile(file,'utf8'),'provider-route\n');
 }finally{await unlink(file).catch(e=>{if(e.code!=='ENOENT')throw e;});await rmdir(dir);}
});
test('local and non-Hostinger environments do not write routing configuration',async()=>{
 assert.equal((await ensureHostingerRouting('/tmp/project',{production:true,platform:'linux'})).skipped,true);
 assert.equal((await ensureHostingerRouting('/home/u888237670/domains/mimo-studio.top/nodejs',{production:false,platform:'linux'})).skipped,true);
});
