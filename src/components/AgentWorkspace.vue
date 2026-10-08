<script setup>
import {ref,computed,onMounted,watch} from 'vue';
import {api,sites,labels,mailDate,safeLink} from '../api.js';
import Icon from './Icon.vue';
const props=defineProps({config:Object,projects:Array});
const emit=defineEmits(['open','reply','notice','error','settings']);
const date=ref(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
const overview=ref(null),overviewBusy=ref(false),running=ref(false),runs=ref([]),error=ref('');
const input=ref({action:'workspace',prompt:'',site:'',projectId:''});let token=0;
const sections=computed(()=>overview.value?[
 ['plans','当日计划',overview.value.plans],['completed','实际完成',overview.value.completed],
 ['articles','当天发布的文章',overview.value.articles],['inquiries','当天收到的邮件',overview.value.inquiries],
 ['unplanned','当天新增、尚未安排日期的任务',overview.value.unplanned],
 ['events','其他工作记录',overview.value.events],['unknownCompleted','完成日期缺少记录的旧任务',overview.value.unknownCompleted]
 ].filter(([, ,items])=>items?.length):[]);
const omitted=computed(()=>Object.values(overview.value?.coverage?.omitted||{}).reduce((sum,n)=>sum+Number(n||0),0));
const actionLabels={workspace:'全工作台问答',daily:'每日总结',knowledge:'知识库查询',emails:'询盘整理',keywords:'关键词整理',project:'项目计划',custom:'自定义任务',reply:'询盘回复'};
async function loadOverview(){const current=++token;overviewBusy.value=true;try{
 const value=await api('/agent/overview?'+new URLSearchParams({date:date.value,site:input.value.site,projectId:input.value.projectId}));
 if(current===token){overview.value=value;error.value='';}
}catch(e){if(current===token)error.value=e.message;if(e.status===401)emit('error',e);}finally{if(current===token)overviewBusy.value=false;}}
async function open(id){try{emit('open',await api('/records/'+encodeURIComponent(id)));}catch(e){emit('error',e);}}
async function run(){running.value=true;error.value='';try{
 const result=await api('/agent/run',{method:'POST',body:{...input.value,date:date.value}});
 runs.value=[result,...runs.value].slice(0,30);emit('notice','答复已保存');
}catch(e){error.value=e.message;if(e.status===401)emit('error',e);}finally{running.value=false;}}
async function apply(run){try{await api('/agent/runs/'+run.id+'/apply',{method:'POST',body:{}});run.applied=true;emit('notice','建议已加入待办');await loadOverview();}catch(e){emit('error',e);}}
async function reply(id){try{emit('reply',await api('/records/'+encodeURIComponent(id)));}catch(e){emit('error',e);}}
function question(text,action='workspace'){input.value.prompt=text;input.value.action=action;}
watch([date,()=>input.value.site,()=>input.value.projectId],loadOverview);
onMounted(async()=>{await loadOverview();try{runs.value=await api('/agent/runs');}catch(e){emit('error',e);}});
</script>
<template>
<section class="agent-day panel stack">
 <div class="subheading"><div><h2>每日概览</h2><p class="muted">按北京时间核对计划与实际工作。</p></div><div class="row-actions"><input v-model="date" type="date" aria-label="查看日期"><button type="button" class="button secondary small" :disabled="overviewBusy" @click="loadOverview">{{overviewBusy?'读取中…':'刷新概览'}}</button></div></div>
 <div v-if="overview" class="agent-counts">
  <div><strong>{{overview.counts?.planned??'未知'}}</strong><span>计划任务</span></div><div><strong>{{overview.counts?.completed??'未知'}}</strong><span>实际完成</span></div><div><strong>{{overview.counts?.articles??'未知'}}</strong><span>发布文章</span></div><div><strong>{{overview.counts?.inquiries??'未知'}}</strong><span>收到邮件</span></div>
 </div>
 <p v-if="overview?.coverage?.partial" class="inline-message">部分资料尚未完整读取，请结合来源状态核对。{{omitted?'有 '+omitted+' 条记录未在概览展开，可通过全工作台问答继续查询。':''}}</p>
 <details v-for="[key,label,items] in sections" :key="key" class="day-section" :open="key==='plans'||key==='completed'"><summary>{{label}} <span class="muted">· {{items.length}} 条</span></summary><ul><li v-for="item in items" :key="item.id"><button class="text-button" @click="open(item.recordId||item.id)">{{item.title||item.id}}</button><span class="hint">{{item.site||''}}<span v-if="item.mailbox"> · {{item.mailbox}}</span><span v-if="item.sender"> · {{item.sender}}</span><span v-if="item.at||item.completedAt||item.publishedAt||item.receivedAt"> · {{mailDate(item.at||item.completedAt||item.publishedAt||item.receivedAt)}}</span></span></li></ul></details>
 <p v-if="overview&&!sections.length" class="muted">该日期暂未记录计划或业务动态。</p>
 <div v-if="overview?.sources?.length" class="day-sources"><span v-for="source in overview.sources" :key="source.id" :class="['hint',{'danger-text':source.error}]">{{source.name}} · {{!source.enabled?'已暂停':source.error?'收取失败':source.lastSuccess?'最近收取 '+mailDate(source.lastSuccess):'等待收取'}}</span></div>
</section>
<div v-if="!config?.hasSecret" class="setup-callout"><Icon name="agent" :size="24"/><div><strong>先接入你的模型</strong><p>保存 Agent 配置后，可以查询工作台和知识库。</p></div><button class="button secondary" @click="emit('settings')">前往设置</button></div>
<form class="agent-form panel stack" @submit.prevent="run">
 <div class="field-grid"><label>使用能力<select v-model="input.action"><option value="workspace">全工作台问答</option><option value="daily">每日总结</option><option value="knowledge">知识库查询</option><option value="emails">询盘整理</option><option value="keywords">关键词整理</option><option value="project">项目计划</option><option value="custom">自定义任务</option></select></label><label>网站范围<select v-model="input.site"><option v-for="site in sites" :key="site.value" :value="site.value">{{site.label}}</option></select></label></div>
 <label>项目范围<select v-model="input.projectId"><option value="">全部项目</option><option v-for="project in projects||[]" :key="project.id" :value="project.id">{{project.title}}</option></select></label>
 <div class="agent-questions"><button type="button" class="button secondary small" @click="question('今天计划做什么？哪些已经完成？','daily')">核对今日计划</button><button type="button" class="button secondary small" @click="question('这一天哪个网站新增了文章，哪些邮箱收到询盘？','daily')">查看文章与询盘</button><button type="button" class="button secondary small" @click="question('查询知识库中有关 PCB 和 PCBA 询盘回复的说明，给出出处。','knowledge')">查知识库</button></div>
 <label>你的要求<textarea v-model="input.prompt" rows="4" maxlength="10000" placeholder="例如：查看今天全部工作，或找到知识库中支持客户需求的技术资料。" :required="['workspace','knowledge','custom'].includes(input.action)"></textarea></label>
 <p v-if="error" class="inline-message error" role="alert">{{error}}</p>
 <div class="agent-form-bottom"><p class="hint">可查询全工作台、历史内容与知识库。邮件回复请在询盘详情中生成并预览；自动回复由设置中的规则控制。</p><button class="button primary" :disabled="running||!config?.hasSecret">{{running?'正在查询与整理…':'开始执行'}}<Icon v-if="!running" name="arrow" :size="16"/></button></div>
</form>
<div class="subheading"><h2>Agent 记录</h2><span class="muted">最近 30 次</span></div>
<div v-if="!runs.length" class="empty-small">运行后，答复和引用会保存在这里。</div>
<details v-for="(run,index) in runs" :key="run.id" :open="index===0" class="agent-result panel"><summary><span>{{actionLabels[run.action]||'工作台整理'}}</span><span class="muted">{{mailDate(run.createdAt)}}</span></summary><div class="result-content">
 <p class="pre-wrap">{{run.summary}}</p>
 <div v-if="run.sources?.length" class="agent-citations"><h3>引用资料</h3><button v-for="source in run.sources" :key="source.id" class="citation-button" @click="open(source.id)">{{labels[source.kind]||'记录'}} · {{source.title}}</button></div>
 <details v-if="run.toolTrace?.length" class="agent-query-trace"><summary>查询过程 · {{run.toolTrace.length}} 次</summary><ul><li v-for="(trace,i) in run.toolTrace" :key="i">{{({list_records:'查询记录',read_record:'读取原文',daily_overview:'查询每日概览',search_knowledge:'检索知识库',source_status:'检查收取状态'})[trace.name]||trace.name}}<span v-if="trace.total!==undefined"> · 共 {{trace.total}} 条</span></li></ul></details>
 <ul v-if="run.tasks?.length" class="suggested-tasks"><li v-for="(task,i) in run.tasks" :key="i"><Icon name="todo" :size="16"/><div><strong>{{task.title}}</strong><p v-if="task.content">{{task.content}}</p></div></li></ul>
 <button v-if="run.tasks?.length" class="button primary" :disabled="run.applied" @click="apply(run)">{{run.applied?'已加入待办':'确认加入待办 · '+run.tasks.length+' 项'}}</button>
 <button v-if="run.inquiryId" class="button secondary" @click="reply(run.inquiryId)">打开询盘回复</button>
</div></details>
</template>
