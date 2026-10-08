import {createHmac,createHash,createPrivateKey,createPublicKey,generateKeyPairSync,diffieHellman,hkdfSync,randomBytes,randomUUID,createCipheriv,createDecipheriv} from 'node:crypto';
const context='mimo-source-recovery-v1';
const pkcs8=Buffer.from('302e020100300506032b656e04220420','hex');
const originOf=url=>new URL(url).origin;
function privateKey(key,url){
 if(!/^[a-f0-9]{64}$/i.test(key||''))throw new Error('服务器加密密钥无效');
 const bytes=createHmac('sha256',Buffer.from(key,'hex')).update(context+'\0'+originOf(url)).digest();
 return createPrivateKey({key:Buffer.concat([pkcs8,bytes]),format:'der',type:'pkcs8'});
}
const publicBytes=key=>createPublicKey(key).export({format:'der',type:'spki'});
function importedPublic(encoded){
 if(typeof encoded!=='string'||encoded.length>100||!/^[A-Za-z0-9_-]+$/.test(encoded))throw new Error();
 const key=createPublicKey({key:Buffer.from(encoded,'base64url'),format:'der',type:'spki'});
 if(key.asymmetricKeyType!=='x25519')throw new Error();return key;
}
const transportKey=(secret,publicData)=>Buffer.from(hkdfSync('sha256',secret,createHash('sha256').update(publicData).digest(),Buffer.from(context),32));
const aad=value=>Buffer.from(JSON.stringify([context,value.kid,value.epk,value.origin]));
export function recoveryRecipient(key,url){
 const pub=publicBytes(privateKey(key,url));
 return {version:1,origin:originOf(url),kid:createHash('sha256').update(pub).digest('hex'),publicKey:pub.toString('base64url')};
}
export function encryptRecovery(recipient,sources,{now=Date.now(),id=randomUUID()}={}){
 const target=importedPublic(recipient.publicKey),ephemeral=generateKeyPairSync('x25519');
 const pub=target.export({format:'der',type:'spki'});
 if(createHash('sha256').update(pub).digest('hex')!==recipient.kid)throw new Error('服务器公钥不一致');
 const value={v:1,kid:recipient.kid,epk:ephemeral.publicKey.export({format:'der',type:'spki'}).toString('base64url'),origin:recipient.origin};
 const iv=randomBytes(12),key=transportKey(diffieHellman({privateKey:ephemeral.privateKey,publicKey:target}),pub),cipher=createCipheriv('aes-256-gcm',key,iv);
 cipher.setAAD(aad(value));
 const plaintext=Buffer.from(JSON.stringify({v:1,id,expiresAt:now+3600000,sources}));
 const bytes=Buffer.concat([cipher.update(plaintext),cipher.final()]);
 return Buffer.from(JSON.stringify({...value,iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),data:bytes.toString('base64url')})).toString('base64url');
}
export function decryptRecovery(bundle,key,url,{now=Date.now()}={}){
 try{
  if(typeof bundle!=='string'||bundle.length>24000||!/^[A-Za-z0-9_-]+$/.test(bundle))throw new Error();
  const value=JSON.parse(Buffer.from(bundle,'base64url').toString('utf8')),recipient=recoveryRecipient(key,url);
  if(value.v!==1||value.kid!==recipient.kid||value.origin!==recipient.origin)throw new Error();
  const remote=importedPublic(value.epk),iv=Buffer.from(value.iv,'base64url'),tag=Buffer.from(value.tag,'base64url');
  if(iv.length!==12||tag.length!==16)throw new Error();
  const shared=diffieHellman({privateKey:privateKey(key,url),publicKey:remote}),transport=transportKey(shared,Buffer.from(recipient.publicKey,'base64url'));
  const decipher=createDecipheriv('aes-256-gcm',transport,iv);decipher.setAAD(aad(value));decipher.setAuthTag(tag);
  const plaintext=Buffer.concat([decipher.update(Buffer.from(value.data,'base64url')),decipher.final()]);
  const result=JSON.parse(plaintext.toString('utf8'));
  if(result.v!==1||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(result.id)||!Number.isFinite(result.expiresAt)||result.expiresAt<now||result.expiresAt>now+3600001||!Array.isArray(result.sources)||result.sources.length<1||result.sources.length>8)throw new Error();
  return result;
 }catch{throw new Error('恢复链接无效或已过期，请重新生成');}
}
// These fingerprints restrict this migration to the two connections the owner approved.
// Actual credentials are never included in the repository.
export const recoverySources=[
 {id:'b5ceb7f0-1750-4e63-b8c9-cf81510d3524',name:'Hostinger · info@globalwellpcb.com',type:'hostinger',site:'globalwellpcb.com',config:{mailboxId:'AC3e8dbdd2baf158fa793de9473f63',user:'info@globalwellpcb.com',folder:'INBOX'},secretHash:'2edd29e49ad2240d1346efbfa912de019c6d7617555d58ab6e8dea05577c954c'},
 {id:'d8dec322-af0b-472a-abbe-2239d00378c3',name:'得到大脑（原 Get 笔记）',type:'get',site:'',config:{clientId:'cli_b5e462e282a5def7c2912f81'},secretHash:'48d37cae49c1d41b6685c23f337b5b9f7aad70700c2f87c899be34a1c1121da6'}
];
