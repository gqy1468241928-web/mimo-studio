import { createHmac, timingSafeEqual, randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { isIP } from 'node:net';
const digest=(key,value)=>createHmac('sha256',key).update(value).digest('base64url');
export function equal(a,b) {
 const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));
 return x.length===y.length && timingSafeEqual(x,y);
}
export function signSession(key,now=Date.now(),lifetime=86400,revision=0) {
 const value=Buffer.from(JSON.stringify({exp:now+lifetime*1000,revision,nonce:randomBytes(12).toString('hex')})).toString('base64url');
 return value+'.'+digest(key,value);
}
export function verifySession(token,key,now=Date.now()) {
 try { const [value,signature,extra]=String(token||'').split('.');
 if(extra||!signature||!equal(signature,digest(key,value)))return false;
 const session=JSON.parse(Buffer.from(value,'base64url').toString());
 return Number.isFinite(session.exp)&&session.exp>now&&session.exp<=now+86400*1000+1000 ? session:false;
 } catch {return false;}
}
function encryptionKey(key) {
 if(!/^[a-f0-9]{64}$/i.test(key||''))throw new Error('服务器加密密钥无效');
 return Buffer.from(key,'hex');
}
export function seal(plaintext,key,id) {
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(key),iv);
 cipher.setAAD(Buffer.from(id));
 const encrypted=Buffer.concat([cipher.update(plaintext,'utf8'),cipher.final()]);
 return [iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
}
export function unseal(value,key,id) {
 const [iv,tag,payload]=value.split('.');
 const decipher=createDecipheriv('aes-256-gcm',encryptionKey(key),Buffer.from(iv,'base64url'));
 decipher.setAAD(Buffer.from(id));decipher.setAuthTag(Buffer.from(tag,'base64url'));
 return Buffer.concat([decipher.update(Buffer.from(payload,'base64url')),decipher.final()]).toString('utf8');
}
export function hashPassword(password) {
 const salt=randomBytes(16).toString('hex');
 return salt+':'+scryptSync(password,salt,64).toString('hex');
}
export function checkPassword(password,hash) {
 try {const [salt,wanted]=hash.split(':');return equal(scryptSync(password,salt,64).toString('hex'),wanted);}catch{return false;}
}
export function isPublicIP(input) {
 let ip=input.replace(/^\[|\]$/g,'').toLowerCase();
 if(isIP(ip)===4){
 const a=ip.split('.').map(Number);
 return !(a[0]===0||a[0]===10||a[0]===127||a[0]>=224||
 a[0]===169&&a[1]===254||a[0]===172&&a[1]>=16&&a[1]<=31||
 a[0]===192&&(a[1]===168||a[1]===0||a[1]===2)||
 a[0]===100&&a[1]>=64&&a[1]<=127||a[0]===198&&(a[1]===18||a[1]===19||a[1]===51)||
 a[0]===203&&a[1]===0&&a[2]===113);
 }
 if(isIP(ip)===6){
 // IPv4-mapped, local, transition, multicast and documentation addresses are refused.
 return /^[23][0-9a-f]{3}:/.test(ip)&&!ip.startsWith('2001:db8:')&&!ip.startsWith('2001:0:')&&!ip.startsWith('2002:');
 }
 return false;
}
export function publicUrl(input) {
 const u=new URL(input);
 if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||u.hash)throw new Error('请使用公开的 HTTPS 地址，地址中不要填写账号密码');
 const host=u.hostname.replace(/^\[|\]$/g,'');
 if(isIP(host)&&!isPublicIP(host)||!isIP(host)&&(!host.includes('.')||/\.localhost$|\.local$|\.internal$/i.test(host)))throw new Error('不支持内网或本机地址');
 return u;
}
export function cookieValue(req,name='mimo_session') {
 const cookies=String(req.headers.cookie||'').split(';');
 for(const item of cookies){const at=item.indexOf('=');if(item.slice(0,at).trim()===name)return item.slice(at+1).trim();}
 return '';
}
