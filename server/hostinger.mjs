import path from 'node:path';
import {access,writeFile} from 'node:fs/promises';

// Derive only the private runtime layouts used by Hostinger, never API input.
export function hostingerRouting(runtimeDirectory){
 const match=/^(\/home\/u\d+\/domains\/[a-z0-9.-]+)\/(hbuilds\/(?:current|versions\/[a-z0-9_-]+)\/)?nodejs$/i.exec(runtimeDirectory);
 if(!match)return null;
 const root=match[1],appRoot=root+(match[2]?'/hbuilds/current/nodejs':'/nodejs');
 return {publicDirectory:root+'/public_html',content:[
  '# MiMo Node.js routing: application files remain outside public_html.',
  'PassengerAppRoot '+appRoot,
  'PassengerBaseURI /',
  'PassengerAppType node',
  'PassengerNodejs /opt/alt/alt-nodejs24/root/usr/bin/node',
  'PassengerStartupFile server.mjs',
  'PassengerAppEnv production',''
 ].join('\n')};
}
export async function restoreMissingRoute(publicDirectory,content){
 try{
  await writeFile(path.join(publicDirectory,'.htaccess'),content,{flag:'wx',mode:0o644});
  return {created:true};
 }catch(error){
  if(error.code==='EEXIST')return {created:false};
  throw error;
 }
}
export async function ensureHostingerRouting(runtimeDirectory,{production=false,platform=process.platform}={}){
 if(!production||platform!=='linux')return {created:false,skipped:true};
 const routing=hostingerRouting(runtimeDirectory);
 if(!routing)return {created:false,skipped:true};
 await access(path.join(runtimeDirectory,'server.mjs'));
 return restoreMissingRoute(routing.publicDirectory,routing.content);
}
