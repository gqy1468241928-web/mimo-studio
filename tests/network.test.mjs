import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {requestJSON} from '../server/network.mjs';
const addresses=[{address:'93.184.216.34',family:4},{address:'93.184.216.35',family:4}];
function transport(seen,{httpStatus=200,errorFirst=true}={}){
 return (url,options,callback)=>{const req=new EventEmitter();req.write=()=>{};req.setTimeout=()=>{};req.destroy=e=>queueMicrotask(()=>req.emit('error',e));req.end=()=>{options.lookup(url.hostname,{all:true},(err,found)=>{seen.push({address:found[0].address,method:options.method,host:options.servername});queueMicrotask(()=>{
 if(errorFirst&&found[0].address===addresses[0].address){req.emit('error',new Error('connect ECONNREFUSED'));return;}
 const res=new EventEmitter();res.statusCode=httpStatus;res.headers={'x-wp-total':'1'};res.resume=()=>{};callback(res);res.emit('data',Buffer.from('[{"id":1}]'));res.emit('end');
 });});};return req;};
}
test('article GET retries another verified public address after a connection failure and keeps response metadata',async()=>{
 const seen=[];const result=await requestJSON('https://articles.example/posts',{retryAddresses:true,metadata:true},{resolve:async()=>addresses,send:transport(seen)});
 assert.equal(seen.length,2);assert.deepEqual(seen.map(s=>s.address),addresses.map(a=>a.address));assert.ok(seen.every(s=>s.host==='articles.example'));assert.equal(result.json[0].id,1);assert.equal(result.headers['x-wp-total'],'1');
});
test('address retry never repeats a POST, bypasses HTTP rejection, or accepts a private DNS answer',async()=>{
 let seen=[];
 await assert.rejects(requestJSON('https://articles.example/posts',{method:'POST',body:{query:'read'},retryAddresses:true},{resolve:async()=>addresses,send:transport(seen)}));assert.equal(seen.length,1);
 seen=[];await assert.rejects(requestJSON('https://articles.example/posts',{retryAddresses:true},{resolve:async()=>addresses,send:transport(seen,{httpStatus:403,errorFirst:false})}),/HTTP 403/);assert.equal(seen.length,1);
 seen=[];await assert.rejects(requestJSON('https://articles.example/posts',{retryAddresses:true},{resolve:async()=>[{address:'127.0.0.1',family:4}],send:transport(seen)}),/内网/);assert.equal(seen.length,0);
});
