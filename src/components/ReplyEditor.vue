<script setup>
import {ref,computed,onMounted} from 'vue';
import {api,mailDate} from '../api.js';
import Modal from './Modal.vue';
import Icon from './Icon.vue';
const props=defineProps({record:Object});const emit=defineEmits(['close','notice','error','open']);
const draft=ref(null),subject=ref(''),body=ref(''),prompt=ref(''),busy=ref(false),error=ref(''),confirmSend=ref(false);
const locked=computed(()=>draft.value&&['sending','sent','uncertain'].includes(draft.value.status));
const supported=computed(()=>props.record?.kind==='inquiries'&&props.record?.externalId?.startsWith('hostinger:'));
const dirty=computed(()=>draft.value&&(subject.value!==draft.value.subject||body.value!==draft.value.body));
const statusText={draft:'待发送草稿',sending:'正在发送，暂勿重复操作',sent:'已发送',failed:'发送未完成',uncertain:'结果不明确，需要核对原邮箱'};
function setDraft(value){draft.value=value;subject.value=value?.subject||'';body.value=value?.body||'';}
const textSnapshot=()=>({subject:subject.value,body:body.value});
const sameText=value=>subject.value===value.subject&&body.value===value.body;
function applyResponse(value,submitted){
 const unchanged=sameText(submitted);
 if(unchanged)setDraft(value);else{draft.value=value;confirmSend.value=false;}
 return unchanged;
}
async function load(){const original=textSnapshot();try{applyResponse(await api('/mail/'+encodeURIComponent(props.record.id)+'/reply'),original);}catch(e){error.value=e.message;if(e.status===401)emit('error',e);}}
async function generate(){if(busy.value||locked.value)return;const original=textSnapshot();busy.value=true;error.value='';confirmSend.value=false;try{applyResponse(await api('/mail/'+encodeURIComponent(props.record.id)+'/reply',{method:'POST',body:{mode:'generate',prompt:prompt.value}}),original);emit('notice','知识库回复草稿已生成');}catch(e){error.value=e.message;if(e.status===401)emit('error',e);}finally{busy.value=false;}}
async function save(){if(busy.value||locked.value||!draft.value)return false;const submitted=textSnapshot();busy.value=true;error.value='';confirmSend.value=false;try{const saved=await api('/mail/'+encodeURIComponent(props.record.id)+'/reply',{method:'POST',body:{mode:'save',version:draft.value.version,...submitted}});const unchanged=applyResponse(saved,submitted);emit('notice','回复草稿已保存');return unchanged&&sameText(saved);}catch(e){error.value=e.message;if(e.status===401)emit('error',e);return false;}finally{busy.value=false;}}
async function prepare(){if(busy.value||locked.value||!draft.value)return;const submitted=textSnapshot();confirmSend.value=false;if(dirty.value&&!await save())return;if(sameText(submitted)&&sameText(draft.value))confirmSend.value=true;}
async function send(){if(busy.value||locked.value||!confirmSend.value||dirty.value){confirmSend.value=false;return;}busy.value=true;error.value='';try{setDraft(await api('/mail/'+encodeURIComponent(props.record.id)+'/reply/send',{method:'POST',body:{version:draft.value.version,confirm:true}}));confirmSend.value=false;emit('notice','回复已发送并保存到原邮箱已发送文件夹');}catch(e){error.value=e.message;confirmSend.value=false;await load();if(e.status===401)emit('error',e);}finally{busy.value=false;}}
async function copy(){try{await navigator.clipboard.writeText(subject.value+'\n\n'+body.value);emit('notice','回复已复制');}catch{error.value='可以直接选中正文复制';}}
async function openSource(id){try{emit('open',await api('/records/'+encodeURIComponent(id)));}catch(e){error.value=e.message;}}
onMounted(load);
</script>
<template>
<Modal title="知识库询盘回复" wide @close="emit('close')">
 <div class="stack reply-editor">
  <div class="reply-original"><strong>{{record.title}}</strong><p>{{record.sender}}</p><p class="hint">来源邮箱：{{record.mailbox||draft?.from||'未明确'}} · {{record.receivedAt?mailDate(record.receivedAt):'收件日期未知'}}</p></div>
  <template v-if="!locked"><label>回复要求<textarea v-model="prompt" :readonly="busy" rows="2" maxlength="10000" placeholder="例如：用英语回复，说明资料要求，并询问采购数量。"></textarea></label><button class="button secondary" :disabled="busy" @click="generate"><Icon name="agent" :size="17"/>{{busy?'正在处理…':draft?'根据知识库重新生成回复':'根据知识库生成回复'}}</button></template>
  <p v-if="draft" class="reply-status">{{statusText[draft.status]||draft.status}}<span v-if="draft.sentAt"> · {{mailDate(draft.sentAt)}}</span></p>
  <p v-if="draft?.status==='uncertain'" class="inline-message error">请先在原邮箱“已发送”中核对。系统已停止重试，避免客户收到重复邮件。</p>
  <template v-if="draft"><div class="field-grid"><label>发件邮箱<input :value="draft.from||'该来源没有发送邮箱'" readonly></label><label>收件人<input :value="draft.to||'原询盘未提供明确邮箱'" readonly></label></div><label>主题<input v-model="subject" maxlength="500" :readonly="locked||busy" @input="confirmSend=false"></label><label>回复正文<textarea v-model="body" rows="13" maxlength="20000" :readonly="locked||busy" @input="confirmSend=false"></textarea></label>
   <div v-if="draft.sources?.length" class="agent-citations"><h3>知识库出处</h3><button v-for="source in draft.sources" :key="source.id" class="citation-button" @click="openSource(source.id)">{{source.title}}</button></div>
   <div v-if="draft.missingInfo?.length" class="reply-missing"><strong>待确认信息</strong><ul><li v-for="(item,i) in draft.missingInfo" :key="i">{{item}}</li></ul><p class="hint">这些内容会阻止自动发送。手动发送前请核对并编辑正文。</p></div>
   <p v-if="!supported" class="hint">该来源当前只支持记录或读取。直接发送支持已接入的 Hostinger 邮箱，也可复制回复到原平台发送。</p>
   <div v-if="confirmSend" class="reply-confirm"><strong>确认从 {{draft.from}} 发送给 {{draft.to}}</strong><p>回复会关联原邮件，并保存到原邮箱“已发送”。</p><div class="row-actions"><button class="button secondary" :disabled="busy" @click="confirmSend=false">取消</button><button class="button primary" :disabled="busy" @click="send">{{busy?'发送中…':'确认发送这封回复'}}</button></div></div>
  </template>
  <p v-if="error" class="inline-message error" role="alert">{{error}}</p>
 </div>
 <template #footer><button class="button secondary" @click="emit('close')">关闭</button><div class="row-actions"><button v-if="draft" class="button secondary" @click="copy">复制回复</button><button v-if="draft&&!locked" class="button secondary" :disabled="busy||!dirty" @click="save">保存草稿</button><button v-if="draft&&!locked&&supported&&draft.to&&draft.from" class="button primary" :disabled="busy||!subject.trim()||!body.trim()||confirmSend" @click="prepare">预览并发送</button></div></template>
</Modal>
</template>
