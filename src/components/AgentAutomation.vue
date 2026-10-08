<script setup>
import {ref,computed,onMounted} from 'vue';
import {api,mailDate} from '../api.js';
const props=defineProps({sources:Array});const emit=defineEmits(['notice','error','reply']);
const form=ref({enabled:false,sourceIds:[],maxPerDay:5,instructions:''}),terms=ref('rfq, quote, pcb, pcba'),confirmed=ref(false),busy=ref(false),error=ref(''),state=ref(null),recent=ref([]);
const boxes=computed(()=>(props.sources||[]).filter(s=>s.type==='hostinger'&&s.enabled&&s.hasSecret&&(s.config.folder||'INBOX').toUpperCase()==='INBOX'));
function update(value){form.value={enabled:value.enabled,sourceIds:value.sourceIds||[],maxPerDay:value.maxPerDay||5,instructions:value.instructions||'',enabledAt:value.enabledAt||0};terms.value=(value.matchTerms||[]).join(', ');state.value=value.state||null;recent.value=value.recent||[];confirmed.value=false;}
async function load(){try{update(await api('/agent/automation'));}catch(e){error.value=e.message;if(e.status===401)emit('error',e);}}
async function save(){busy.value=true;error.value='';try{
 const matchTerms=terms.value.split(/[,，\n]+/).map(s=>s.trim()).filter(Boolean);
 const value=await api('/agent/automation',{method:'POST',body:{enabled:form.value.enabled,sourceIds:form.value.sourceIds,maxPerDay:Number(form.value.maxPerDay),instructions:form.value.instructions,matchTerms,confirm:confirmed.value}});
 update(value);emit('notice',value.enabled?'自动回复规则已启用，仅处理启用后的新询盘':'自动回复已暂停');
}catch(e){error.value=e.message;if(e.status===401)emit('error',e);}finally{busy.value=false;}}
async function check(){busy.value=true;error.value='';try{const result=await api('/agent/automation/check',{method:'POST',body:{}});await load();emit('notice',result.failed?'本次自动处理未完成，请查看邮件回复状态':result.sent?'已按规则发送 '+result.sent+' 封回复':result.needsReview?'已生成草稿，资料不足，需要人工查看':result.limitReached?'今天的自动发送已达到上限':'检查完成，暂无符合规则的新询盘');}catch(e){error.value=e.message;if(e.status===401)emit('error',e);}finally{busy.value=false;}}
onMounted(load);
</script>
<template>
<section class="settings-section panel stack automation-settings">
 <div class="subheading"><div><h2>询盘自动回复</h2><p class="muted">读取知识库后，按你保存的邮箱与规则处理新询盘。</p></div><span class="status-chip">{{form.enabled?'已启用':'已关闭'}}</span></div>
 <form class="stack" @submit.prevent="save">
  <label class="check-label"><input v-model="form.enabled" type="checkbox" @change="confirmed=false">启用自动回复</label>
  <fieldset class="automation-boxes"><legend>发送邮箱</legend><p v-if="!boxes.length" class="hint">先接入并启用 Hostinger 收件箱，才能自动发送。</p><label v-for="box in boxes" :key="box.id" class="check-label"><input v-model="form.sourceIds" type="checkbox" :value="box.id" @change="confirmed=false">{{box.config.user}} <span class="hint">{{box.site}}</span></label></fieldset>
  <div class="field-grid"><label>询盘匹配词<input v-model="terms" maxlength="3000" placeholder="rfq, quote, pcb, pcba" @input="confirmed=false"></label><label>每日自动发送上限<input v-model.number="form.maxPerDay" type="number" min="1" max="50" required @input="confirmed=false"></label></div>
  <label>回复规则<textarea v-model="form.instructions" rows="4" maxlength="4000" placeholder="例如：使用客户来信语言；先说明知识库支持的能力，再询问 Gerber、BOM 和数量；涉及价格或交期交给人工。" @input="confirmed=false"></textarea></label>
  <p class="hint">仅处理启用后收到、正文或主题匹配任一词的新询盘。系统跳过历史记录、机器人邮件和已有回复；知识不足、存在待确认项或发信结果不明确时留给人工。每天按北京时间计数。</p>
  <label v-if="form.enabled" class="check-label automation-consent"><input v-model="confirmed" type="checkbox">我确认所选邮箱、回复规则和每日上限，允许系统自动发送符合条件的回复。</label>
  <p v-if="form.enabledAt" class="hint">当前规则开始时间：{{mailDate(form.enabledAt)}}</p>
  <p v-if="error" class="inline-message error" role="alert">{{error}}</p>
  <div class="row-actions align-end"><button v-if="form.enabled" type="button" class="button secondary" :disabled="busy" @click="check">按已保存规则检查一次</button><button type="submit" class="button primary" :disabled="busy||(form.enabled&&!confirmed)">{{busy?'处理中…':'保存自动回复设置'}}</button></div>
 </form>
 <p v-if="state" class="hint">最近检查：{{mailDate(state.checkedAt)}} · 处理 {{state.processed||0}} 封 · 发送 {{state.sent||0}} 封<span v-if="state.needsReview"> · {{state.needsReview}} 封需人工查看</span><span v-if="state.error" class="danger-text"> · {{state.error}}</span></p>
 <div v-if="recent.length" class="automation-history"><h3>最近自动处理</h3><div v-for="reply in recent" :key="reply.inquiryId"><span>{{reply.subject}} · {{({draft:'待人工查看',sent:'已发送',sending:'发送中',failed:'发送未完成',uncertain:'需核对已发送'})[reply.status]||reply.status}}</span><button class="text-button" @click="emit('reply',reply.inquiryId)">查看回复</button></div></div>
</section>
</template>
