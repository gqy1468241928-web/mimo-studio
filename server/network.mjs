import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { publicUrl, isPublicIP } from './security.mjs';
export async function resolvePublic(hostname) {
 const answers=await lookup(hostname.replace(/^\[|\]$/g,''),{all:true,verbatim:true});
 if(!answers.length||answers.some(x=>!isPublicIP(x.address)))throw new Error('接口解析到内网或不可用地址');
 return answers[0];
}
export async function requestJSON(input,{method='GET',headers={},body,timeout=30000,maxBytes=2097152}={}) {
 const url=publicUrl(input),address=await resolvePublic(url.hostname),outgoing={accept:'application/json',...headers};
 const data=body===undefined?undefined:JSON.stringify(body);
 if(data){outgoing['content-type']='application/json';outgoing['content-length']=Buffer.byteLength(data);}
 return new Promise((resolve,reject)=>{
 const req=https.request(url,{method,headers:outgoing,servername:url.hostname,
 lookup:(_host,options,callback)=>{if(options?.all)callback(null,[address]);else callback(null,address.address,address.family);}
 },res=>{
 if(res.statusCode<200||res.statusCode>=300){res.resume();return reject(Object.assign(new Error('接口返回 HTTP '+res.statusCode+(res.statusCode===401?'，请检查密钥或授权':res.statusCode===403?'，请检查应用读取权限':'')),{statusCode:res.statusCode}));}
 const parts=[];let count=0;
 res.on('data',part=>{count+=part.length;if(count>maxBytes)req.destroy(new Error('接口数据超过大小限制'));else parts.push(part);});
 res.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(parts).toString('utf8')));}catch{reject(new Error('接口没有返回有效 JSON'));}});
 res.on('error',()=>reject(new Error('读取接口响应失败')));
 });
 req.setTimeout(timeout,()=>req.destroy(new Error('接口请求超时，请稍后重试')));
 req.on('error',e=>reject(new Error(['接口请求超时，请稍后重试','接口数据超过大小限制'].includes(e.message)?e.message:'无法连接接口，请检查地址及网络')));
 if(data)req.write(data);req.end();
 });
}
