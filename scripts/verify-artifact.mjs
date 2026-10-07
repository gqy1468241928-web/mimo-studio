import {mkdtemp,cp,mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
// A sibling directory cannot fall back to this project's node_modules.
const scratchBase=path.resolve('../artifact-checks');
await mkdir(scratchBase,{recursive:true});
const target=await mkdtemp(path.join(scratchBase,'mimo-'));
await cp('dist',target,{recursive:true});
const port=3108;
const child=spawn(process.execPath,[path.join(target,'server.mjs')],{cwd:target,env:{...process.env,NODE_ENV:'development',APP_URL:'http://localhost:'+port,PORT:String(port),DEV_PASSWORD:'artifact-test-password',SQLITE_FILE:path.join(target,'check.sqlite')},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);
const base='http://localhost:'+port;
try{
 const deadline=Date.now()+12000;let ready=false;
 while(Date.now()<deadline){
 if(child.exitCode!==null)throw new Error('Artifact stopped: '+output);
 try{const r=await fetch(base+'/api/health');ready=r.status===200;if(ready)break;}catch{}
 await new Promise(r=>setTimeout(r,150));
 }
 assert.ok(ready,'Standalone artifact did not start');
 assert.equal((await fetch(base+'/api/records?kind=tasks')).status,401);
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'artifact-test-password'})});
 assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);
 const create=await fetch(base+'/api/records',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({kind:'tasks',site:'',title:'artifact validation',status:'todo'})});
 assert.equal(create.status,200);
 const result=await (await fetch(base+'/api/records?kind=tasks',{headers:{cookie}})).json();
 assert.equal(result.items[0].title,'artifact validation');assert.equal(result.total,1);
 console.log('Standalone artifact passed: startup, authentication, private CRUD');
}finally{child.kill();await new Promise(r=>child.once('exit',r));}
