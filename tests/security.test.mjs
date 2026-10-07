import test from 'node:test';
import assert from 'node:assert/strict';
const mod=await import('../server/security.mjs').catch(()=>({}));
test('sessions expire and a tampered token cannot authenticate',()=>{
 assert.equal(typeof mod.signSession,'function','Private sessions are required');
 const key='a'.repeat(64),token=mod.signSession(key,1000,60);
 assert.ok(mod.verifySession(token,key,2000));
 assert.equal(mod.verifySession(token+'x',key,2000),false);
 assert.equal(mod.verifySession(token,key,62000),false);
});
test('source credentials are encrypted and bound to the source',()=>{
 assert.equal(typeof mod.seal,'function','Server-side credential encryption is required');
 const key='a'.repeat(64),secret=mod.seal('actual-secret',key,'source-a');
 assert.equal(secret.includes('actual-secret'),false);
 assert.equal(mod.unseal(secret,key,'source-a'),'actual-secret');
 assert.throws(()=>mod.unseal(secret,key,'source-b'));
});
test('private networks, redirects in addresses, and embedded passwords are refused',()=>{
 assert.equal(typeof mod.publicUrl,'function','Public API validation is required');
 for(const input of ['http://example.com','https://127.0.0.1','https://10.0.0.2','https://[::1]','https://user:pass@example.com','https://example.com:8080'])assert.throws(()=>mod.publicUrl(input));
 assert.equal(mod.publicUrl('https://api.example.com/v1').hostname,'api.example.com');
});
