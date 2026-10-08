import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {parse,compileScript} from '@vue/compiler-sfc';
import {createSSRApp,h} from 'vue';
import {renderToString} from 'vue/server-renderer';
import {pathToFileURL} from 'node:url';
const root=path.resolve('.'),out=path.join(root,'work','ui-check');
async function render(name,props={}){
 const file=path.join(root,'src','components',name+'.vue');
 assert.ok(await fs.access(file).then(()=>true,()=>false),'Agent workflow component is required');
 await fs.mkdir(out,{recursive:true});
 const target=path.join(out,name+'.mjs');
 await build({entryPoints:[file],outfile:target,bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'vue-test',setup(b){
  b.onLoad({filter:/\.vue$/},async({path:file})=>{const source=await fs.readFile(file,'utf8'),parsed=parse(source,{filename:file});assert.equal(parsed.errors.length,0);
   const script=compileScript(parsed.descriptor,{id:name,inlineTemplate:true});return {contents:script.content,loader:'js',resolveDir:path.dirname(file)};
  });
 }}]});
 const {default:component}=await import(pathToFileURL(target).href+'?v='+Date.now());
 return renderToString(createSSRApp({render:()=>h(component,props)}));
}
test('workspace entry renders its date, overview, and real workspace request controls',async()=>{
 const html=await render('AgentWorkspace',{config:{hasSecret:true},projects:[]});
 assert.match(html,/每日概览/);assert.match(html,/知识库/);assert.match(html,/type="date"/);assert.match(html,/全工作台/);assert.match(html,/textarea/);
});
test('reply workflow shows original inquiry and offers knowledge drafting before sending',async()=>{
 const html=await render('ReplyEditor',{record:{id:'mail',kind:'inquiries',title:'PCB RFQ',sender:'Buyer &lt;buyer@example.com&gt;',sourceId:'box',externalId:'hostinger:ACtest:INBOX:41',mailbox:'info@globalwellpcb.com'}});
 assert.match(html,/PCB RFQ/);assert.match(html,/知识库/);assert.match(html,/生成回复/);assert.doesNotMatch(html,/测试成功|已经发送/);
});
test('automation starts disabled and displays explicit rule and mailbox scope controls',async()=>{
 const html=await render('AgentAutomation',{sources:[]});
 assert.match(html,/自动回复/);assert.match(html,/每日/);assert.match(html,/匹配/);assert.match(html,/checkbox/);assert.match(html,/保存/);
 assert.doesNotMatch(html,/type="checkbox"[^>]*checked/);
});
async function editorHarness(){
 const file=path.join(root,'src','components','ReplyEditor.vue'),source=await fs.readFile(file,'utf8');
 const script=parse(source,{filename:file}).descriptor.scriptSetup.content.replace(/^import .*;\r?\n/gm,'');
 const {ref,computed}=await import('vue');const calls=[];
 let resolve;const api=()=>new Promise(done=>{resolve=done;});
 const make=new Function('ref','computed','onMounted','defineProps','defineEmits','api','mailDate','Modal','Icon',script+'\nreturn {draft,subject,body,busy,confirmSend,locked,dirty,setDraft,save,prepare,generate,send};');
 const vm=make(ref,computed,()=>{},()=>({record:{id:'mail',kind:'inquiries',externalId:'hostinger:ACtest:INBOX:41'}}),()=>((...args)=>calls.push(args)),api,()=>'',null,null);
 return {vm,source,calls,resolve:value=>resolve(value)};
}
const uiDraft={version:1,status:'draft',from:'info@example.com',to:'buyer@example.com',subject:'Subject',body:'original'};
test('reply fields are readonly while save or generate replaces draft state',async()=>{
 const {source}=await editorHarness();assert.match(source,/v-model="subject"[^>]*:readonly="(?:locked\|\|busy|busy\|\|locked)"/);assert.match(source,/v-model="body"[^>]*:readonly="(?:locked\|\|busy|busy\|\|locked)"/);
});
test('preview retains newer edits and never confirms the older persisted body',async()=>{
 const {vm,resolve}=await editorHarness();vm.setDraft(uiDraft);vm.body.value='first edit';const pending=vm.prepare();assert.equal(vm.busy.value,true);
 vm.body.value='latest edit';resolve({...uiDraft,version:2,body:'first edit'});await pending;
 assert.equal(vm.body.value,'latest edit');assert.equal(vm.draft.value.body,'first edit');assert.equal(vm.confirmSend.value,false);assert.equal(vm.dirty.value,true);
});
test('preview only confirms the exact draft text that finished saving',async()=>{
 const {vm,resolve}=await editorHarness();vm.setDraft(uiDraft);vm.subject.value='Saved subject';vm.body.value='saved edit';const pending=vm.prepare();
 resolve({...uiDraft,version:2,subject:'Saved subject',body:'saved edit'});await pending;assert.equal(vm.confirmSend.value,true);assert.equal(vm.dirty.value,false);
});
test('model generation preserves edits made while awaiting its response',async()=>{
 const {vm,resolve}=await editorHarness();vm.setDraft(uiDraft);const pending=vm.generate();vm.body.value='latest edit';
 resolve({...uiDraft,version:2,body:'generated body'});await pending;assert.equal(vm.body.value,'latest edit');assert.equal(vm.confirmSend.value,false);assert.equal(vm.dirty.value,true);
});
test('an edited draft cannot reuse an older send confirmation',async()=>{
 const {vm}=await editorHarness();vm.setDraft(uiDraft);vm.confirmSend.value=true;vm.body.value='changed after confirmation';
 await vm.send();assert.equal(vm.busy.value,false);assert.equal(vm.confirmSend.value,false);
});
