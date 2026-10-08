<script setup>
import {reactive,ref,computed} from 'vue';
import Modal from './Modal.vue';
import Icon from './Icon.vue';
import MailMeta from './MailMeta.vue';
import {sites,labels,statusLabels,safeLink,feeStatusLabels,displayDate} from '../api.js';
const props=defineProps({record:Object,kind:String,category:String,projects:Array,busy:Boolean,mailbox:String});
const emit=defineEmits(['close','save','remove','task','detail','copy','reply']);
const form=reactive({title:'',kind:props.kind,site:'',status:props.kind==='tasks'?'todo':props.kind==='articles'?'draft':'new',content:'',due:'',url:'',sender:'',company:'',country:'',category:props.category||'',tags:'',keyword:'',intent:'',volume:'',contact:'',outreachSent:false,feeStatus:'unknown',userNotes:'',projectId:'',...props.record});
const inquiry=computed(()=>['inquiries','mic'].includes(form.kind));
const states=computed(()=>form.kind==='tasks'?['todo','done']:form.kind==='articles'?['draft','writing','published']:form.kind==='backlinks'?['new','done']:form.kind==='projects'?['new','following','done']:inquiry.value?['new','following','archived']:['new']);
const confirmDelete=ref(false);
function save(){emit('save',{...form,title:form.title.trim()});}
</script>
<template>
<Modal :title="record?.id ? labels[kind]+'详情' : '新建'+labels[kind]" wide @close="emit('close')">
 <form id="record-form" class="stack" @submit.prevent="save">
  <label>{{kind==='backlinks'?'外链网站':'标题'}}<input v-model="form.title" required maxlength="300" autofocus :placeholder="kind==='backlinks'?'例如 行业媒体或合作网站':kind==='prompts'?'给模板起个容易找到的名字':'填写标题'"></label>
  <div class="field-grid"><label>关联网站<select v-model="form.site"><option value="">不指定网站</option><option v-for="s in sites.slice(1)" :key="s.value" :value="s.value">{{s.label}}</option></select></label>
  <label v-if="states.length>1">{{kind==='backlinks'?'发送内容完成状态':'状态'}}<select v-model="form.status"><option v-for="s in states" :value="s" :key="s">{{kind==='backlinks'&&s==='new'?'未完成':statusLabels[s]}}</option></select></label>
  <label v-else>标签<input v-model="form.tags" placeholder="用逗号分隔，例如 SEO, 选词"></label></div>
  <div v-if="kind==='tasks'" class="field-grid"><label>截止日期<input v-model="form.due" type="date"></label><label>关联项目<select v-model="form.projectId"><option value="">不关联项目</option><option v-for="p in projects" :key="p.id" :value="p.id">{{p.title}}</option></select></label></div>
  <div v-if="inquiry" class="field-grid"><label>联系人 / 邮箱<input v-model="form.sender" :readonly="!!record?.sourceId"></label><label>公司<input v-model="form.company"></label><label>国家 / 地区<input v-model="form.country" placeholder="未确认可留空"></label><label>标签<input v-model="form.tags" placeholder="询盘类型、下一步"></label></div>
  <div v-if="kind==='backlinks'" class="field-grid"><label>外链联系人<input v-model="form.contact" maxlength="500" placeholder="姓名、邮箱或其他联系方法"></label><label>是否已发送外链请求<select v-model="form.outreachSent"><option :value="false">未发送</option><option :value="true">已发送</option></select></label><label>是否需要费用<select v-model="form.feeStatus"><option v-for="(label,value) in feeStatusLabels" :key="value" :value="value">{{label}}</option></select></label></div>
  <div v-if="kind==='keywords'" class="field-grid"><label>搜索意图<input v-model="form.intent" placeholder="采购、选型、学习…"></label><label>搜索量<input v-model="form.volume" placeholder="没有数据可留空"></label></div>
  <label v-if="['articles','resources','notes','keywords','backlinks'].includes(kind)">{{kind==='backlinks'?'外链网站地址':'链接'}}<input v-model="form.url" type="url" placeholder="https://"><a v-if="safeLink(form.url)" :href="safeLink(form.url)" target="_blank" rel="noopener noreferrer" class="text-link">打开链接 ↗</a></label>
  <div v-if="kind==='articles'&&record?.sourceId" class="field-grid"><label>发布时间<span class="hint">{{displayDate(record.publishedAt)}}</span></label><label>原站最近更新<span class="hint">{{displayDate(record.modifiedAt)}}</span></label></div>
  <MailMeta v-if="kind==='inquiries'&&record?.sourceId" :record="record" :mailbox="mailbox"/>
  <label>{{kind==='backlinks'?'发送信息内容':kind==='prompts'?'提示词模板':inquiry?'询盘原文':kind==='keywords'?'选词说明':kind==='tasks'?'备注':'内容'}}<textarea v-model="form.content" :readonly="!!record?.sourceId" :rows="kind==='tasks'?4:10" :placeholder="kind==='backlinks'?'记录准备发送或已经发送的外链请求消息':kind==='prompts'?'把提示词粘贴在这里，用 {{主题}} 等标记可替换的部分。':'填写内容或直接粘贴文本'"></textarea></label>
  <p v-if="record?.truncated" class="hint">{{kind==='articles'?'正文较长，当前内容已截断。完整文章请打开原文链接查看。':'正文较长，当前内容已截断。附件及完整原文请在原邮箱查看。'}}</p>
  <label v-if="record?.sourceId||inquiry">我的处理备注<textarea v-model="form.userNotes" rows="3" placeholder="记录你的判断和下一步，原文会保留。"></textarea></label>
  <div class="row-actions">
   <button v-if="inquiry&&record?.id" type="button" class="button secondary" :disabled="busy" @click="emit('reply',record)"><Icon name="agent" :size="16"/>知识库回复</button>
   <button v-if="inquiry&&record" type="button" class="button secondary" @click="emit('task',form)"><Icon name="plus" :size="16"/>加入待办</button>
   <button v-if="['prompts','backlinks'].includes(kind)&&form.content" type="button" class="button secondary" @click="emit('copy',form.content)"><Icon name="copy" :size="16"/>{{kind==='backlinks'?'复制信息':'复制模板'}}</button>
   <button v-if="record?.sourceId&&kind==='inquiries'&&record?.externalId?.startsWith('hostinger:')" type="button" class="button secondary" :disabled="busy" @click="emit('detail',record)">读取邮件正文</button>
   <a v-if="inquiry&&safeLink(form.url)" :href="safeLink(form.url)" target="_blank" rel="noopener noreferrer" class="text-link">在原邮箱查看 ↗</a>
   <button v-if="record?.sourceId&&kind==='notes'" type="button" class="button secondary" :disabled="busy" @click="emit('detail',record)">获取完整笔记</button>
  </div>
  <p v-if="kind==='backlinks'" class="hint">请求发送状态由你手动记录。</p>
  <p v-if="record?.externalId?.startsWith('hostinger:')" class="hint">读取正文会在 Hostinger 邮箱标记为已读；审核归档只改变工作台记录。</p>
 </form>
 <template #footer>
  <div v-if="record?.id&&!record.sourceId" class="delete-actions"><button type="button" class="text-button danger-text" @click="confirmDelete=!confirmDelete">{{confirmDelete?'取消删除':'删除'}}</button><button v-if="confirmDelete" type="button" class="button danger" :disabled="busy" @click="emit('remove',record)">确认删除</button></div>
  <span v-else></span><div class="row-actions"><button type="button" class="button secondary" @click="emit('close')">取消</button><button type="submit" form="record-form" class="button primary" :disabled="busy">{{busy?'保存中…':'保存'}}</button></div>
 </template>
</Modal>
</template>
