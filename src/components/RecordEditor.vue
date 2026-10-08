<script setup>
import {reactive,ref,computed} from 'vue';
import Modal from './Modal.vue';
import Icon from './Icon.vue';
import {sites,labels,statusLabels,safeLink} from '../api.js';
const props=defineProps({record:Object,kind:String,category:String,projects:Array,busy:Boolean});
const emit=defineEmits(['close','save','remove','task','detail','copy']);
const form=reactive({title:'',kind:props.kind,site:'',status:props.kind==='tasks'?'todo':props.kind==='articles'?'draft':'new',content:'',due:'',url:'',sender:'',company:'',country:'',category:props.category||'',tags:'',keyword:'',intent:'',volume:'',userNotes:'',projectId:'',...props.record});
const inquiry=computed(()=>['inquiries','mic'].includes(form.kind));
const states=computed(()=>form.kind==='tasks'?['todo','done']:form.kind==='articles'?['draft','writing','published']:form.kind==='projects'?['new','following','done']:inquiry.value?['new','following','archived']:['new']);
const confirmDelete=ref(false);
function save(){emit('save',{...form,title:form.title.trim()});}
</script>
<template>
<Modal :title="record?.id ? labels[kind]+'详情' : '新建'+labels[kind]" wide @close="emit('close')">
 <form id="record-form" class="stack" @submit.prevent="save">
  <label>标题<input v-model="form.title" required maxlength="300" autofocus :placeholder="kind==='prompts'?'给模板起个容易找到的名字':'填写标题'"></label>
  <div class="field-grid"><label>关联网站<select v-model="form.site"><option value="">不指定网站</option><option v-for="s in sites.slice(1)" :key="s.value" :value="s.value">{{s.label}}</option></select></label>
  <label v-if="states.length>1">状态<select v-model="form.status"><option v-for="s in states" :value="s" :key="s">{{statusLabels[s]}}</option></select></label>
  <label v-else>标签<input v-model="form.tags" placeholder="用逗号分隔，例如 SEO, 选词"></label></div>
  <div v-if="kind==='tasks'" class="field-grid"><label>截止日期<input v-model="form.due" type="date"></label><label>关联项目<select v-model="form.projectId"><option value="">不关联项目</option><option v-for="p in projects" :key="p.id" :value="p.id">{{p.title}}</option></select></label></div>
  <div v-if="inquiry" class="field-grid"><label>联系人 / 邮箱<input v-model="form.sender" :readonly="!!record?.sourceId"></label><label>公司<input v-model="form.company"></label><label>国家 / 地区<input v-model="form.country" placeholder="未确认可留空"></label><label>标签<input v-model="form.tags" placeholder="询盘类型、下一步"></label></div>
  <div v-if="kind==='keywords'" class="field-grid"><label>搜索意图<input v-model="form.intent" placeholder="采购、选型、学习…"></label><label>搜索量<input v-model="form.volume" placeholder="没有数据可留空"></label></div>
  <label v-if="['articles','resources','notes','keywords'].includes(kind)">链接<input v-model="form.url" type="url" placeholder="https://"><a v-if="safeLink(form.url)" :href="safeLink(form.url)" target="_blank" rel="noopener noreferrer" class="text-link">打开链接 ↗</a></label>
  <label>{{kind==='prompts'?'提示词模板':inquiry?'询盘原文':kind==='keywords'?'选词说明':kind==='tasks'?'备注':'内容'}}<textarea v-model="form.content" :readonly="!!record?.sourceId" :rows="kind==='tasks'?4:10" :placeholder="kind==='prompts'?'把提示词粘贴在这里，用 {{主题}} 等标记可替换的部分。':'填写内容或直接粘贴文本'"></textarea></label>
  <p v-if="record?.truncated" class="hint">正文较长，当前内容已截断。附件及完整原文请在原邮箱查看。</p>
  <label v-if="record?.sourceId||inquiry">我的处理备注<textarea v-model="form.userNotes" rows="3" placeholder="记录你的判断和下一步，原文会保留。"></textarea></label>
  <div class="row-actions">
   <button v-if="inquiry&&record" type="button" class="button secondary" @click="emit('task',form)"><Icon name="plus" :size="16"/>加入待办</button>
   <button v-if="kind==='prompts'&&form.content" type="button" class="button secondary" @click="emit('copy',form.content)"><Icon name="copy" :size="16"/>复制模板</button>
   <button v-if="record?.sourceId&&kind==='inquiries'&&record?.externalId?.startsWith('hostinger:')" type="button" class="button secondary" :disabled="busy" @click="emit('detail',record)">读取邮件正文</button>
   <a v-if="inquiry&&safeLink(form.url)" :href="safeLink(form.url)" target="_blank" rel="noopener noreferrer" class="text-link">在原邮箱查看 ↗</a>
   <button v-if="record?.sourceId&&kind==='notes'" type="button" class="button secondary" :disabled="busy" @click="emit('detail',record)">获取完整笔记</button>
  </div>
  <p v-if="record?.externalId?.startsWith('hostinger:')" class="hint">读取正文会在 Hostinger 邮箱标记为已读；审核归档只改变工作台记录。</p>
 </form>
 <template #footer>
  <div v-if="record?.id&&!record.sourceId" class="delete-actions"><button type="button" class="text-button danger-text" @click="confirmDelete=!confirmDelete">{{confirmDelete?'取消删除':'删除'}}</button><button v-if="confirmDelete" type="button" class="button danger" :disabled="busy" @click="emit('remove',record)">确认删除</button></div>
  <span v-else></span><div class="row-actions"><button type="button" class="button secondary" @click="emit('close')">取消</button><button type="submit" form="record-form" class="button primary" :disabled="busy">{{busy?'保存中…':'保存'}}</button></div>
 </template>
</Modal>
</template>
