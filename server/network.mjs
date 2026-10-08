import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { publicUrl, isPublicIP } from './security.mjs';
export async function resolvePublic(hostname,{all=false}={}) {
 const answers=await lookup(hostname.replace(/^\[|\]$/g,''),{all:true,verbatim:true});
 if(!answers.length||answers.some(x=>!isPublicIP(x.address)))throw new Error('接口解析到内网或不可用地址');
 return all?answers:answers[0];
}
export async function requestJSON(input,{method='GET',headers={},body,timeout=30000,connectTimeout=timeout,maxBytes=2097152,metadata=false,retryAddresses=false}={}, {resolve=resolvePublic,send=(...args)=>https.request(...args)}={}) {
 const url=publicUrl(input),resolved=await resolve(url.hostname,{all:true}),addresses=Array.isArray(resolved)?resolved:[resolved];
 if(!addresses.length||addresses.some(x=>!x||!isPublicIP(x.address)))throw new Error('接口解析到内网或不可用地址');
 const outgoing={accept:'application/json',...headers},data=body===undefined?undefined:JSON.stringify(body);
 if(data){outgoing['content-type']='application/json';outgoing['content-length']=Buffer.byteLength(data);}
 const attempts=retryAddresses&&method==='GET'?addresses:[addresses[0]];
 for(let i=0;i<attempts.length;i++){
  try{return await new Promise((accept,reject)=>{
   const address=attempts[i];let req,finished=false,deadline,connecting;
   const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(deadline);clearTimeout(connecting);if(error)reject(error);else accept(value);};
   const fail=(message,code)=>Object.assign(new Error(message),{code});
   deadline=setTimeout(()=>req?.destroy(fail('接口请求超时，请稍后重试','NETWORK_ERROR')),timeout);
   connecting=setTimeout(()=>req?.destroy(fail('接口请求超时，请稍后重试','NETWORK_ERROR')),Math.min(timeout,connectTimeout));
   try{req=send(url,{method,headers:outgoing,servername:url.hostname,
    lookup:(_host,options,callback)=>{if(options?.all)callback(null,[address]);else callback(null,address.address,address.family);}
   },res=>{
    clearTimeout(connecting);
    if(res.statusCode<200||res.statusCode>=300){res.resume();return finish(Object.assign(new Error('接口返回 HTTP '+res.statusCode+(res.statusCode===401?'，请检查密钥或授权':res.statusCode===403?'，请检查应用读取权限':'')),{statusCode:res.statusCode}));}
    const parts=[];let count=0;
    res.on('data',part=>{count+=part.length;if(count>maxBytes){finish(new Error('接口数据超过大小限制'));req.destroy();}else parts.push(part);});
    res.on('end',()=>{try{const json=res.statusCode===204?null:JSON.parse(Buffer.concat(parts).toString('utf8'));finish(null,metadata?{json,headers:res.headers}:json);}catch{finish(new Error('接口没有返回有效 JSON'));}});
    res.on('error',()=>finish(fail('读取接口响应失败','NETWORK_ERROR')));
   });}catch{finish(fail('无法连接接口，请检查地址及网络','NETWORK_ERROR'));return;}
   req.on('socket',socket=>{if(!socket.connecting)clearTimeout(connecting);else socket.once('secureConnect',()=>clearTimeout(connecting));});
   req.on('error',e=>finish(fail(e.message==='接口请求超时，请稍后重试'?e.message:'无法连接接口，请检查地址及网络','NETWORK_ERROR')));
   if(data)req.write(data);req.end();
  });}catch(e){if(e.code!=='NETWORK_ERROR'||i===attempts.length-1)throw e;}
 }
}
