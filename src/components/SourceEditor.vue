<script setup>
import {reactive,ref} from 'vue';
import Modal from './Modal.vue';
import {sites,api} from '../api.js';
const props=defineProps({source:Object,busy:Boolean}),emit=defineEmits(['close','save']);
const form=reactive({name:'',type:'imap',site:'',enabled:true,secret:'',...props.source,secret:'',config:{host:'imap.qq.com',user:'',mailboxId:'',folder:'INBOX',days:14,listPath:'data.items',idField:'id',titleField:'title',contentField:'content',senderField:'sender',dateField:'created_at',urlField:'url',kind:'inquiries',authMode:'raw',headerName:'Authorization',endpoint:'',clientId:'',...props.source?.config}});
const preset=ref(props.source?'custom':'qq'),discovering=ref(false),connectionError=ref('');
const mailboxes=ref(form.config.mailboxId&&form.config.user?[{id:form.config.mailboxId,address:form.config.user}]:[]);
const providers={qq:['QQ 邮箱','imap.qq.com'],163:['网易 163','imap.163.com'],126:['网易 126','imap.126.com'],gmail:['Gmail','imap.gmail.com'],hostinger:['Hostinger IMAP','imap.hostinger.com'],custom:['其他 IMAP 邮箱','']};
function changePreset(){const p=providers[preset.value];form.config.host=p[1];if(!props.source)form.name=p[0];}
function changeType(){if(!props.source)form.name=form.type==='get'?'得到大脑':form.type==='hostinger'?'Hostinger 邮箱':form.type==='api'?'API 来源':'';if(form.type==='get'){form.config.listPath='data.notes';form.config.idField='note_id';}}
function selectMailbox(){form.config.user=mailboxes.value.find(x=>x.id===form.config.mailboxId)?.address||'';}
async function discoverMailboxes(){discovering.value=true;connectionError.value='';try{mailboxes.value=await api('/hostinger/mailboxes',{method:'POST',body:{sourceId:form.id,secret:form.secret||undefined}});if(!mailboxes.value.some(x=>x.id===form.config.mailboxId))form.config.mailboxId=mailboxes.value[0]?.id||'';selectMailbox();}catch(e){connectionError.value=e.message;}finally{discovering.value=false;}}
function save(){emit('save',{id:form.id,name:form.name,type:form.type,site:form.site,enabled:form.enabled,secret:form.secret||undefined,config:{...form.config}});}
</script>
<template>
<Modal :title="source?'编辑来源':'添加信息来源'" @close="emit('close')">
 <form id="source-form" class="stack" @submit.prevent="save">
  <label>来源类型<select v-model="form.type" :disabled="!!source" @change="changeType"><option value="imap">IMAP 邮箱</option><option value="hostinger">Hostinger 邮箱（API）</option><option value="get">得到大脑（Get 笔记）</option><option value="api">自定义 API</option></select></label>
  <label v-if="form.type==='imap'">邮箱服务商<select v-model="preset" @change="changePreset"><option v-for="(p,key) in providers" :key="key" :value="key">{{p[0]}}</option></select></label>
  <label>名称<input v-model="form.name" required maxlength="100" placeholder="例如 Apex 询盘邮箱"></label>
  <label>关联网站<select v-model="form.site"><option value="">不指定网站</option><option v-for="s in sites.slice(1)" :key="s.value" :value="s.value">{{s.label}}</option></select></label>
  <template v-if="form.type==='imap'">
   <label>邮箱地址<input v-model="form.config.user" type="email" required autocomplete="off" placeholder="name@example.com"></label>
   <label>IMAP 主机<input v-model="form.config.host" required placeholder="imap.example.com"></label>
   <label>授权码 / 应用密码<input v-model="form.secret" type="password" :required="form.enabled&&!source?.hasSecret" autocomplete="new-password" :placeholder="source?.hasSecret?'留空保留已保存的密码':'填写邮箱的 IMAP 授权码'"></label>
   <p class="hint">先在邮箱设置里开启 IMAP。Gmail 使用应用密码；QQ / 网易通常使用授权码。仅支持允许 IMAP 授权码或应用密码的账号，OAuth-only 邮箱请使用 API 来源。</p>
   <details><summary>更多设置</summary><div class="stack compact"><label>文件夹<input v-model="form.config.folder" placeholder="INBOX"></label><label>首次读取最近几天<input v-model.number="form.config.days" type="number" min="1" max="90"></label><p class="hint">首次取最近 50 封，后续从新增邮件的进度继续。连接使用加密端口 993。</p></div></details>
  </template>
  <template v-else-if="form.type==='hostinger'">
   <label>Hostinger 邮件 API 令牌<input v-model="form.secret" type="password" autocomplete="new-password" :required="form.enabled&&!source?.hasSecret" :placeholder="source?.hasSecret?'留空保留已保存的令牌':'填写原来的邮件 API 令牌'"></label>
   <button type="button" class="button secondary" :disabled="discovering||(!form.secret&&!source?.hasSecret)" @click="discoverMailboxes">{{discovering?'正在获取…':'获取可用邮箱'}}</button>
   <p v-if="connectionError" class="error-text" role="alert">{{connectionError}}</p>
   <label>邮箱<select v-model="form.config.mailboxId" required @change="selectMailbox"><option value="" disabled>填写令牌后获取邮箱</option><option v-for="box in mailboxes" :key="box.id" :value="box.id">{{box.address}}</option></select></label>
   <p class="hint">使用 Hostinger Agentic Mail 的邮件 API 令牌，直接接入已授权邮箱。自动收取最新 50 封邮件的标题和发件人；打开邮件后可读取正文。</p>
   <details><summary>更多设置</summary><label>文件夹<input v-model="form.config.folder" placeholder="INBOX"></label></details>
  </template>
  <template v-else-if="form.type==='get'">
   <label>Client ID<input v-model="form.config.clientId" required autocomplete="off" placeholder="cli_…"></label>
   <label>API Key<input v-model="form.secret" type="password" autocomplete="new-password" :required="form.enabled&&!source?.hasSecret" :placeholder="source?.hasSecret?'留空保留已保存的密钥':'gk_live_…'"></label>
   <p class="hint">使用同一应用的 Client ID 与 API Key，应用需有 note.content.read 读取权限。笔记收进“资源库 → 笔记”。</p><a class="text-link" href="https://doc.biji.com/docs/WOxgwObNNiyMHWk1dl0cJqSxnEd" target="_blank" rel="noopener noreferrer">查看官方说明 ↗</a>
  </template>
  <template v-else>
   <label>列表接口地址<input v-model="form.config.endpoint" type="url" required placeholder="https://api.example.com/items"></label>
   <label>API Key（公开接口可留空）<input v-model="form.secret" type="password" autocomplete="new-password" :placeholder="source?.hasSecret?'留空保留已保存的密钥':'填写访问密钥'"></label>
   <div class="field-grid"><label>鉴权方式<select v-model="form.config.authMode"><option value="raw">直接填写 API Key</option><option value="bearer">Bearer Token</option></select></label><label>收取到<select v-model="form.config.kind"><option value="inquiries">邮件询盘</option><option value="mic">中国制造询盘</option><option value="articles">文章</option><option value="keywords">关键词</option><option value="notes">资源库 / 笔记</option><option value="resources">资源库 / SEO</option></select></label></div>
   <label>列表路径<input v-model="form.config.listPath" placeholder="data.items（数组在根部时留空）"></label>
   <details><summary>字段对应</summary><div class="field-grid compact"><label>唯一 ID 字段<input v-model="form.config.idField" placeholder="id"></label><label>标题字段<input v-model="form.config.titleField" placeholder="title"></label><label>正文字段<input v-model="form.config.contentField" placeholder="content"></label><label>发件人字段<input v-model="form.config.senderField" placeholder="sender"></label><label>日期字段<input v-model="form.config.dateField" placeholder="created_at"></label><label>鉴权请求头<input v-model="form.config.headerName" placeholder="Authorization"></label></div></details>
   <p class="hint">读取公开 HTTPS 接口返回的 JSON 列表，每次最多 100 条；接口应按时间从新到旧排序。短期 Token 到期后需要更新。</p>
  </template>
  <label class="checkbox-label"><input v-model="form.enabled" type="checkbox">每 10 分钟自动收取</label>
 </form>
 <template #footer><span></span><div class="row-actions"><button class="button secondary" @click="emit('close')">取消</button><button class="button primary" form="source-form" type="submit" :disabled="busy">{{busy?'保存中…':form.enabled?'保存并收取':'保存配置'}}</button></div></template>
</Modal>
</template>
