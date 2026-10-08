<script setup>
import {ref,computed,watch,onMounted,onBeforeUnmount} from 'vue';
import {api,sites,labels,statusLabels,displayDate,safeLink} from './api.js';
import Icon from './components/Icon.vue';
import Modal from './components/Modal.vue';
import RecordEditor from './components/RecordEditor.vue';
import SourceEditor from './components/SourceEditor.vue';
const nav=[['todo','待办','todo'],['content','内容管理','content'],['library','资源库','library'],['agent','Agent','agent'],['settings','设置','settings']];
const contentTabs=[['articles','网站文章'],['inquiries','邮件询盘'],['mic','中国制造'],['keywords','关键词']];
const resourceTabs=[['seo','SEO 资料'],['study','学习资料'],['notes','随手笔记'],['prompts','提示词']];
const page=ref(['todo','content','library','agent','settings'].includes(location.hash.slice(1))?location.hash.slice(1):'todo');
const contentTab=ref('articles'),resourceTab=ref('seo'),agentTab=ref('assistant'),todoTab=ref('todo'),siteFilter=ref(''),history=ref(false),search=ref(''),offset=ref(0);
const authenticated=ref(false),checking=ref(true),password=ref(''),loginBusy=ref(false),loading=ref(false),busy=ref(false),busyId=ref(''),mobileOpen=ref(false);
const notice=ref(null),records=ref([]),total=ref(0),sources=ref([]),projects=ref([]),runs=ref([]),editor=ref(null),sourceEditor=ref(null),importOpen=ref(false);
const quickTitle=ref(''),sourceRemove=ref(''),agentRunning=ref(false),applying=ref('');
const agentInput=ref({action:'emails',prompt:'',site:'',projectId:''});
const agentConfig=ref({endpoint:'https://api.openai.com/v1',model:'',secret:'',hasSecret:false});
const passwordForm=ref({currentPassword:'',password:''});
const importForm=ref({format:'csv',text:'',name:''});
const today=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
let noticeTimer,filterTimer,pollTimer,loadToken=0;
const currentKind=computed(()=>page.value==='todo'?'tasks':page.value==='content'?contentTab.value:page.value==='library'?(['notes','prompts'].includes(resourceTab.value)?resourceTab.value:'resources'):'projects');
const title=computed(()=>nav.find(n=>n[0]===page.value)?.[1]||'待办');
const inquiry=computed(()=>['inquiries','mic'].includes(currentKind.value));
const addLabel=computed(()=>page.value==='library'?resourceTabs.find(r=>r[0]===resourceTab.value)?.[1]:labels[currentKind.value]);
const showList=computed(()=>['todo','content','library'].includes(page.value)||page.value==='agent'&&agentTab.value==='projects');
function inform(message,error=false){notice.value={message,error};clearTimeout(noticeTimer);if(!error)noticeTimer=setTimeout(()=>notice.value=null,4500);}
function handle(error){if(error.status===401){authenticated.value=false;password.value='';}inform(error.message||'操作失败',true);}
async function login(){loginBusy.value=true;try{await api('/auth/login',{method:'POST',body:{password:password.value}});password.value='';authenticated.value=true;notice.value=null;await refresh();}catch(e){handle(e);}finally{loginBusy.value=false;}}
async function logout(){try{await api('/auth/logout',{method:'POST',body:{}});}catch{}authenticated.value=false;records.value=[];sources.value=[];runs.value=[];}
function navigate(value){page.value=value;location.hash=value;mobileOpen.value=false;search.value='';history.value=false;}
function chooseContent(value){contentTab.value=value;history.value=false;search.value='';}
function chooseResource(value){resourceTab.value=value;search.value='';history.value=false;}
async function reload(quiet=false){
 if(!authenticated.value||!showList.value)return;
 const token=++loadToken;if(!quiet)loading.value=true;
 const params=new URLSearchParams({kind:currentKind.value,site:siteFilter.value,limit:'50',offset:String(offset.value),search:search.value});
 if(page.value==='todo')params.set('status',todoTab.value);
 if(inquiry.value&&history.value)params.set('history','1');
 if(page.value==='library'&&currentKind.value==='resources')params.set('category',resourceTab.value);
 try{const result=await api('/records?'+params);if(token===loadToken){records.value=result.items;total.value=result.total;}}
 catch(e){handle(e);}finally{if(token===loadToken)loading.value=false;}
}
async function loadSettings(){sources.value=await api('/sources');const config=await api('/agent/config');agentConfig.value={...config,secret:''};}
async function refresh(){try{const p=await api('/records?kind=projects&limit=100');projects.value=p.items;if(page.value==='settings')await loadSettings();if(page.value==='agent'){runs.value=await api('/agent/runs');const config=await api('/agent/config');agentConfig.value={...config,secret:''};}await reload();}catch(e){handle(e);}}
watch([page,contentTab,resourceTab,siteFilter,history,todoTab,agentTab,search],()=>{offset.value=0;clearTimeout(filterTimer);filterTimer=setTimeout(()=>refresh(),180);});
async function paginate(direction){offset.value=Math.max(0,offset.value+direction*50);await reload();}
function openNew(){editor.value={record:null,kind:currentKind.value,category:page.value==='library'?resourceTab.value:''};}
function openRecord(record){editor.value={record:{...record},kind:record.kind,category:record.category||''};}
async function saveRecord(value){
 busy.value=true;
 try{await api(value.id?'/records/'+encodeURIComponent(value.id):'/records',{method:value.id?'PUT':'POST',body:value});editor.value=null;inform('已保存');await refresh();}
 catch(e){handle(e);}finally{busy.value=false;}
}
async function quickAdd(){if(!quickTitle.value.trim())return;busy.value=true;
 try{await api('/records',{method:'POST',body:{kind:'tasks',title:quickTitle.value.trim(),site:'',status:'todo'}});quickTitle.value='';todoTab.value='todo';offset.value=0;await reload();inform('待办已添加');}catch(e){handle(e);}finally{busy.value=false;}
}
async function updateStatus(record,status){
 busyId.value=record.id;try{await api('/records/'+encodeURIComponent(record.id),{method:'PUT',body:{...record,status}});await reload();inform(status==='archived'?'已移至历史记录':status==='done'?'已完成':'已恢复');}catch(e){handle(e);await reload();}finally{busyId.value='';}
}
async function removeRecord(record){busy.value=true;try{await api('/records/'+record.id,{method:'DELETE',body:{version:record.version}});editor.value=null;await refresh();inform('已删除');}catch(e){handle(e);}finally{busy.value=false;}}
function addTask(record){editor.value={record:null,kind:'tasks',category:''};editor.value.record={kind:'tasks',title:('跟进：'+record.title).slice(0,300),site:record.site,status:'todo',content:'来源：'+labels[record.kind]+' / '+record.id+'\n'+(record.sender||'')+'\n'+(record.userNotes||'')};}
async function noteDetail(record){busy.value=true;try{const result=await api((record.kind==='inquiries'?'/mail/':'/notes/')+record.id+'/detail',{method:'POST',body:{}});openRecord(result);inform('完整内容已获取');await reload();}catch(e){handle(e);}finally{busy.value=false;}}
async function copy(text){try{await navigator.clipboard.writeText(text);inform('已复制');}catch{inform('无法访问剪贴板，可直接选中文本复制',true);}}
function newSource(){sourceEditor.value={source:null};}
async function saveSource(value){busy.value=true;
 try{const result=await api('/sources',{method:'POST',body:value});sourceEditor.value=null;await loadSettings();inform(result.enabled?'来源已保存，开始收取':'配置已保存，自动收取已暂停');
 if(result.enabled)await sourceAction(result,'fetch');}
 catch(e){handle(e);}finally{busy.value=false;}
}
async function sourceAction(source,action){busyId.value=source.id;try{const result=await api('/sources/'+source.id+'/'+action,{method:'POST',body:{}});inform(result.message||'已完成');}catch(e){handle(e);}finally{busyId.value='';sources.value=await api('/sources').catch(()=>sources.value);}}
async function toggleSource(source){try{await api('/sources',{method:'POST',body:{...source,enabled:!source.enabled,secret:undefined}});await loadSettings();inform(source.enabled?'自动收取已暂停':'自动收取已启用');}catch(e){handle(e);}}
async function deleteSource(source){try{await api('/sources/'+source.id,{method:'DELETE',body:{}});sourceRemove.value='';await loadSettings();inform('来源已移除，已有内容保留');}catch(e){handle(e);}}
async function saveAgent(){busy.value=true;try{const result=await api('/agent/config',{method:'POST',body:{endpoint:agentConfig.value.endpoint,model:agentConfig.value.model,secret:agentConfig.value.secret||undefined}});agentConfig.value={...result,secret:''};inform('Agent 配置已保存');}catch(e){handle(e);}finally{busy.value=false;}}
async function run(){agentRunning.value=true;try{const result=await api('/agent/run',{method:'POST',body:agentInput.value});runs.value=[result,...runs.value];inform('整理完成，请查看建议');}catch(e){handle(e);}finally{agentRunning.value=false;}}
async function applyRun(run){applying.value=run.id;try{await api('/agent/runs/'+run.id+'/apply',{method:'POST',body:{}});runs.value=await api('/agent/runs');inform('建议已加入待办');}catch(e){handle(e);}finally{applying.value='';}}
async function changePassword(){busy.value=true;try{await api('/auth/password',{method:'POST',body:passwordForm.value});passwordForm.value={currentPassword:'',password:''};authenticated.value=false;inform('密码已修改，请使用新密码登录');}catch(e){handle(e);}finally{busy.value=false;}}
async function readFile(event){const file=event.target.files?.[0];if(!file)return;if(file.size>2097152)return inform('每次最多导入 2MB',true);importForm.value={text:await file.text(),format:file.name.endsWith('.json')?'json':'csv',name:file.name};}
async function importRecords(){busy.value=true;try{const result=await api('/import',{method:'POST',body:{text:importForm.value.text,format:importForm.value.format,kind:currentKind.value,site:siteFilter.value,category:page.value==='library'?resourceTab.value:''}});importOpen.value=false;inform('已导入 '+result.count+' 条内容');await reload();}catch(e){handle(e);}finally{busy.value=false;}}
async function backup(){try{const data=await api('/backup');const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='mimo-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){handle(e);}}
function openBackupImport(){importForm.value={text:'',format:'json',name:''};importOpen.value=true;}
async function restoreBackup(){busy.value=true;try{const result=await api('/import',{method:'POST',body:{text:importForm.value.text,format:'json',site:''}});importOpen.value=false;inform('已恢复 '+result.count+' 条内容');await refresh();}catch(e){handle(e);}finally{busy.value=false;}}
onMounted(async()=>{try{authenticated.value=(await api('/auth/session')).authenticated;if(authenticated.value)await refresh();}catch(e){handle(e);}finally{checking.value=false;}
 pollTimer=setInterval(()=>{if(authenticated.value&&!document.hidden&&!busy.value){reload(true);if(page.value==='settings')api('/sources').then(s=>sources.value=s).catch(()=>{});}},60000);
});
onBeforeUnmount(()=>{clearInterval(pollTimer);clearTimeout(filterTimer);clearTimeout(noticeTimer);});
</script>
<template>
<div v-if="checking" class="boot-state">正在打开工作台…</div>
<div v-else-if="!authenticated" class="login-screen">
 <div class="login-brand"><span class="brand-mark">M</span><span class="wordmark">MiMo<span>我的工作台</span></span></div>
 <div class="login-card"><p class="eyebrow">你的私人工作空间</p><h1>把工作，理清楚。</h1><p class="muted">登录后，从今天的待办开始。</p>
 <form class="stack login-form" @submit.prevent="login"><label>工作台密码<input v-model="password" type="password" required autocomplete="current-password" autofocus placeholder="输入你的密码"></label><p v-if="notice" :class="['inline-message',{'error':notice.error}]" role="alert">{{notice.message}}</p><button class="button primary" type="submit" :disabled="loginBusy">{{loginBusy?'登录中…':'进入工作台'}}<Icon name="arrow" :size="18"/></button></form>
 </div><p class="login-foot"><Icon name="lock" :size="14"/>个人空间 · 需要登录</p>
</div>
<div v-else class="app-shell">
 <aside :class="['sidebar',{'mobile-open':mobileOpen}]">
  <a href="#todo" class="brand" @click.prevent="navigate('todo')"><span class="brand-mark">M</span><span class="wordmark">MiMo<span>我的工作台</span></span></a>
  <p class="nav-caption">工作空间</p>
  <nav aria-label="主导航"><button v-for="n in nav" :key="n[0]" :class="['nav-item',{active:page===n[0]}]" :aria-current="page===n[0]?'page':undefined" @click="navigate(n[0])"><Icon :name="n[2]"/>{{n[1]}}</button></nav>
  <div class="sidebar-bottom"><span class="private-note"><span class="status-dot"></span>私人工作台</span><button class="nav-item logout-button" @click="logout"><Icon name="logout" :size="18"/>退出登录</button></div>
 </aside>
 <button v-if="mobileOpen" class="sidebar-overlay" aria-label="关闭导航" @click="mobileOpen=false"></button>
 <div class="workspace">
  <header class="topbar"><button class="icon-button mobile-toggle" aria-label="打开导航" @click="mobileOpen=!mobileOpen"><Icon name="menu"/></button><span class="breadcrumb">我的空间<span>/</span><strong>{{title}}</strong></span><span class="topbar-note">{{page==='todo'?today:'mimo-studio.top'}}</span></header>
  <div v-if="notice" :class="['notice',{'error':notice.error}]" :role="notice.error?'alert':'status'"><Icon :name="notice.error?'content':'check'" :size="17"/><span>{{notice.message}}</span><button class="icon-button" aria-label="关闭提示" @click="notice=null"><Icon name="close" :size="16"/></button></div>
  <main :class="['main',{ 'main-todo':page==='todo'}]" id="main-content">
   <template v-if="page==='todo'">
    <header class="page-heading"><div><p class="eyebrow">TODAY</p><h1>今天的待办</h1><p class="muted">写下来，一件件完成。</p></div></header>
    <form class="quick-add" @submit.prevent="quickAdd"><Icon name="plus" :size="20"/><input v-model="quickTitle" aria-label="新待办事项" maxlength="300" placeholder="接下来要做什么？" required><button class="button primary" :disabled="busy||!quickTitle.trim()" type="submit">{{busy?'添加中…':'添加待办'}}</button></form>
    <div class="list-top"><div class="tabs" role="tablist" aria-label="待办状态"><button :class="{selected:todoTab==='todo'}" role="tab" :aria-selected="todoTab==='todo'" @click="todoTab='todo'">待完成</button><button :class="{selected:todoTab==='done'}" role="tab" :aria-selected="todoTab==='done'" @click="todoTab='done'">已完成</button></div><span class="count-note">{{total}} 项</span></div>
   </template>
   <template v-else-if="page==='content'||page==='library'">
    <header class="page-heading"><div><p class="eyebrow">{{page==='content'?'CONTENT':'COLLECTION'}}</p><h1>{{title}}</h1><p class="muted">{{page==='content'?'两家网站的文章、询盘和关键词，在这里整理。':'留下值得再用的资料、想法和模板。'}}</p></div><button class="button primary" @click="openNew"><Icon name="plus" :size="17"/>新建{{addLabel}}</button></header>
    <div class="tabs section-tabs" role="tablist" :aria-label="title+'分类'">
     <template v-if="page==='content'"><button v-for="t in contentTabs" :key="t[0]" :class="{selected:contentTab===t[0]}" role="tab" :aria-selected="contentTab===t[0]" @click="chooseContent(t[0])">{{t[1]}}</button></template>
     <template v-else><button v-for="t in resourceTabs" :key="t[0]" :class="{selected:resourceTab===t[0]}" role="tab" :aria-selected="resourceTab===t[0]" @click="chooseResource(t[0])">{{t[1]}}</button></template>
    </div>
    <div class="list-toolbar"><div class="search-field"><Icon name="search" :size="17"/><input v-model="search" :aria-label="'搜索'+addLabel" :placeholder="'搜索'+addLabel"></div><select v-model="siteFilter" aria-label="按网站筛选"><option v-for="s in sites" :key="s.value" :value="s.value">{{s.label}}</option></select><button v-if="['mic','keywords','articles','notes','prompts','resources'].includes(currentKind)" class="button secondary" @click="importForm={text:'',format:'csv',name:''};importOpen=true"><Icon name="upload" :size="16"/>导入</button></div>
    <div v-if="inquiry" class="inquiry-switch"><button :class="{selected:!history}" @click="history=false">待处理</button><button :class="{selected:history}" @click="history=true">历史记录</button><span>审核后移到历史，不会重复进入待处理。</span></div>
   </template>
   <template v-else-if="page==='agent'">
    <header class="page-heading"><div><p class="eyebrow">ASSISTANT</p><h1>Agent</h1><p class="muted">让资料变成清晰的建议和下一步。</p></div><button v-if="agentTab==='projects'" class="button primary" @click="openNew"><Icon name="plus" :size="17"/>新建项目</button></header>
    <div class="tabs section-tabs" role="tablist" aria-label="Agent 分类"><button :class="{selected:agentTab==='assistant'}" role="tab" :aria-selected="agentTab==='assistant'" @click="agentTab='assistant'">整理助手</button><button :class="{selected:agentTab==='projects'}" role="tab" :aria-selected="agentTab==='projects'" @click="agentTab='projects'">项目</button></div>
    <template v-if="agentTab==='assistant'">
     <div v-if="!agentConfig.hasSecret" class="setup-callout"><Icon name="agent" :size="24"/><div><strong>接入你的模型 API</strong><p>填写 API 地址、模型和密钥，即可开始整理。</p></div><button class="button secondary" @click="navigate('settings')">前往设置<Icon name="arrow" :size="15"/></button></div>
     <form class="agent-form panel stack" @submit.prevent="run"><div class="field-grid"><label>整理什么<select v-model="agentInput.action"><option value="emails">邮件与中国制造询盘</option><option value="keywords">关键词</option><option value="project">项目计划</option><option value="custom">自定义任务</option></select></label><label>网站范围<select v-model="agentInput.site"><option v-for="s in sites" :key="s.value" :value="s.value">{{s.label}}</option></select></label></div>
      <label v-if="agentInput.action==='project'">关联项目<select v-model="agentInput.projectId"><option value="">不关联项目</option><option v-for="p in projects" :key="p.id" :value="p.id">{{p.title}}</option></select></label>
      <label>你的要求<textarea v-model="agentInput.prompt" rows="4" maxlength="10000" :required="agentInput.action==='custom'" placeholder="例如：整理待处理询盘，列出需要补充的信息和下一步。"></textarea></label>
      <div class="agent-form-bottom"><p class="hint">建议经你确认后加入待办。邮件不会自动发送。</p><button type="submit" class="button primary" :disabled="agentRunning||!agentConfig.hasSecret">{{agentRunning?'正在整理…':'开始整理'}}<Icon v-if="!agentRunning" name="arrow" :size="16"/></button></div>
     </form>
     <div class="subheading"><h2>整理记录</h2><span class="muted">保留最近 30 次</span></div>
     <div v-if="!runs.length" class="empty-small">整理完成后，结果会保存在这里。</div>
     <details v-for="(r,index) in runs" :key="r.id" :open="index===0" class="agent-result panel"><summary><span>{{r.action==='emails'?'询盘整理':r.action==='keywords'?'关键词整理':r.action==='project'?'项目计划':'自定义整理'}}</span><span class="muted">{{displayDate(r.createdAt)}}</span></summary><div class="result-content"><p class="pre-wrap">{{r.summary}}</p><ul v-if="r.tasks?.length" class="suggested-tasks"><li v-for="(t,i) in r.tasks" :key="i"><Icon name="todo" :size="16"/><div><strong>{{t.title}}</strong><p v-if="t.content">{{t.content}}</p></div></li></ul><button v-if="r.tasks?.length" class="button" :class="r.applied?'secondary':'primary'" :disabled="r.applied||applying===r.id" @click="applyRun(r)">{{r.applied?'已加入待办':applying===r.id?'加入中…':'确认加入待办 · '+r.tasks.length+' 项'}}</button></div></details>
    </template>
   </template>
   <template v-else-if="page==='settings'">
    <header class="page-heading"><div><p class="eyebrow">SETTINGS</p><h1>设置</h1><p class="muted">连接信息来源，管理你的私人空间。</p></div></header>
    <section class="settings-section"><div class="subheading"><div><h2>信息来源</h2><p class="muted">每 10 分钟自动收取，关闭网页后继续运行。</p></div><button class="button primary" @click="newSource"><Icon name="plus" :size="17"/>添加来源</button></div>
     <div v-if="!sources.length" class="empty-source panel"><Icon name="mail" :size="25"/><div><strong>先接入一个邮箱或 API</strong><p>邮箱收进内容管理，笔记收进资源库。</p></div><button class="text-link" @click="newSource">添加第一个来源 →</button></div>
     <article v-for="s in sources" :key="s.id" class="source-card panel"><div class="source-top"><div class="source-symbol"><Icon :name="['imap','hostinger'].includes(s.type)?'mail':s.type==='get'?'library':'link'" :size="20"/></div><div class="source-info"><h3>{{s.name}}</h3><p>{{['imap','hostinger'].includes(s.type)?s.config.user:s.type==='get'?'得到大脑 / 笔记':s.config.endpoint}}<span v-if="s.site"> · {{s.site}}</span></p></div><span :class="['source-status',{'failed':s.state?.error}]"><span class="status-dot"></span>{{!s.hasSecret&&s.type!=='api'?'待恢复密钥':!s.enabled?'已暂停':s.state?.error?'收取失败':s.state?.lastSuccess?'自动收取中':'等待首次收取'}}</span></div>
      <p v-if="s.state?.error" class="source-error">{{s.state.error}}</p><div class="source-bottom"><span class="hint">上次成功：{{displayDate(s.state?.lastSuccess)}}<span v-if="s.state?.count!==undefined"> · {{s.state.count}} 条</span></span><div class="row-actions"><button class="text-button" :disabled="busyId===s.id" @click="sourceAction(s,'test')">{{busyId===s.id?'处理中…':'测试连接'}}</button><button class="text-button" @click="sourceEditor={source:{...s}}">编辑</button><button class="text-button" @click="toggleSource(s)">{{s.enabled?'暂停':'启用'}}</button><button class="text-button" @click="sourceRemove=s.id">移除</button></div></div>
      <div v-if="sourceRemove===s.id" class="inline-confirm"><span>移除连接后，已有内容仍会保留。</span><button class="text-button" @click="sourceRemove=''">取消</button><button class="button danger" @click="deleteSource(s)">确认移除</button></div>
     </article>
    </section>
    <section class="settings-section panel"><div class="subheading"><div><h2>Agent API</h2><p class="muted">支持兼容 Chat Completions 的模型接口。</p></div><span v-if="agentConfig.hasSecret" class="connected-label">已保存配置</span></div>
     <form class="stack" @submit.prevent="saveAgent"><div class="field-grid"><label>API 地址<input v-model="agentConfig.endpoint" type="url" required placeholder="https://api.example.com/v1"></label><label>模型名称<input v-model="agentConfig.model" required placeholder="填写服务商提供的模型 ID"></label></div><label>API Key<input v-model="agentConfig.secret" type="password" autocomplete="new-password" :required="!agentConfig.hasSecret" :placeholder="agentConfig.hasSecret?'留空保留已保存的密钥':'填写 API Key'"></label><div class="align-end"><button class="button primary" :disabled="busy">保存 Agent 配置</button></div></form>
    </section>
    <section class="settings-section panel"><div class="subheading"><div><h2>修改密码</h2><p class="muted">修改后需要重新登录。</p></div></div><form class="stack" @submit.prevent="changePassword"><div class="field-grid"><label>当前密码<input v-model="passwordForm.currentPassword" type="password" autocomplete="current-password" required></label><label>新密码<input v-model="passwordForm.password" type="password" autocomplete="new-password" minlength="12" required placeholder="至少 12 位"></label></div><div class="align-end"><button class="button secondary" :disabled="busy">更新密码</button></div></form></section>
    <section class="settings-section backup-section"><div><h2>备份与恢复</h2><p class="muted">导出待办、内容和资料；连接密钥不包含在备份中。</p></div><div class="row-actions"><button class="button secondary" @click="backup"><Icon name="download" :size="16"/>导出备份</button><button class="button secondary" @click="openBackupImport"><Icon name="upload" :size="16"/>恢复备份</button></div></section>
   </template>
   <template v-if="showList">
    <div v-if="loading" class="loading-state" role="status">正在读取…</div>
    <div v-else-if="!records.length" :class="['empty-state',{'todo-empty':page==='todo'}]"><div class="empty-icon"><Icon :name="page==='todo'?'check':inquiry?'mail':page==='library'?'library':'content'" :size="28"/></div><h2>{{search?'没有找到匹配内容':page==='todo'?(todoTab==='todo'?'今天，从一件事开始。':'完成的待办会留在这里。'):inquiry?(history?'历史记录还是空的':'没有待处理询盘'):page==='library'?'收好值得留下的内容':'还没有'+addLabel}}</h2><p>{{search?'试试更短的关键词。':page==='todo'?'在上方写下待办，完成后勾选即可。':inquiry?(history?'审核归档后，可以在这里找回。':'接入邮箱自动收取，或手动记录询盘。'):'新建一条，或导入已有内容。'}}</p><button v-if="page!=='todo'&&!history" class="text-link" @click="inquiry && currentKind==='inquiries'?navigate('settings'):openNew()">{{inquiry && currentKind==='inquiries'?'接入邮箱 →':'新建'+addLabel+' →'}}</button></div>
    <ul v-else-if="page==='todo'" class="todo-list"><li v-for="item in records" :key="item.id" :class="{'is-done':item.status==='done'}"><button class="todo-check" role="checkbox" :aria-checked="item.status==='done'" :aria-label="(item.status==='done'?'恢复：':'完成：')+item.title" :disabled="busyId===item.id" @click="updateStatus(item,item.status==='done'?'todo':'done')"><Icon v-if="item.status==='done'" name="check" :size="15"/></button><button class="todo-body" @click="openRecord(item)"><span class="todo-title">{{item.title}}</span><span v-if="item.due||item.site" class="todo-meta"><span v-if="item.due" :class="{'overdue':item.due<new Date().toISOString().slice(0,10)&&item.status!=='done'}">{{item.due}}</span><span v-if="item.site">{{item.site==='apexcomponent.com'?'ApexComponent':'GlobalWellPCB'}}</span></span></button><button class="icon-button row-detail" :aria-label="'编辑'+item.title" @click="openRecord(item)"><Icon name="chevron" :size="17"/></button></li></ul>
    <div v-else class="record-list"><div class="record-list-heading"><span>{{inquiry?(history?'已审核询盘':'待处理询盘'):addLabel}}</span><span>{{total}} 条</span></div><article v-for="item in records" :key="item.id" class="record-row"><button class="record-main" @click="openRecord(item)"><span class="record-title">{{item.title}}</span><span class="record-meta"><span v-if="item.site">{{item.site==='apexcomponent.com'?'ApexComponent':'GlobalWellPCB'}}</span><span v-if="item.sender">{{item.sender}}</span><span v-if="item.tags">{{item.tags}}</span><span v-if="!item.site&&!item.sender&&!item.tags">{{displayDate(item.updatedAt)}}</span></span><span v-if="item.content" class="record-excerpt">{{item.content.slice(0,90)}}</span></button><div class="record-row-actions"><span v-if="['articles','projects'].includes(item.kind)" class="status-chip">{{statusLabels[item.status]}}</span><button v-if="inquiry" class="button secondary small" :disabled="busyId===item.id" @click="updateStatus(item,history?'new':'archived')">{{history?'恢复待处理':'审核归档'}}</button><button v-if="item.kind==='prompts'" class="icon-button" aria-label="复制提示词" @click="copy(item.content)"><Icon name="copy" :size="17"/></button><button class="icon-button" :aria-label="'打开'+item.title" @click="openRecord(item)"><Icon name="chevron" :size="18"/></button></div></article></div>
    <div v-if="total>50" class="pagination"><span>第 {{Math.floor(offset/50)+1}} 页 · 共 {{total}} 条</span><div class="row-actions"><button class="button secondary small" :disabled="offset===0||loading" @click="paginate(-1)">上一页</button><button class="button secondary small" :disabled="offset+50>=total||loading" @click="paginate(1)">下一页</button></div></div>
   </template>
  </main>
 </div>
 <RecordEditor v-if="editor" :key="(editor.record?.id||editor.kind)+(editor.record?.version||0)" :record="editor.record" :kind="editor.kind" :category="editor.category" :projects="projects" :busy="busy" @close="editor=null" @save="saveRecord" @remove="removeRecord" @task="addTask" @detail="noteDetail" @copy="copy"/>
 <SourceEditor v-if="sourceEditor" :source="sourceEditor.source" :busy="busy" @close="sourceEditor=null" @save="saveSource"/>
 <Modal v-if="importOpen" :title="page==='settings'?'恢复备份':'导入'+addLabel" @close="importOpen=false"><form id="import-form" class="stack" @submit.prevent="page==='settings'?restoreBackup():importRecords()"><label>选择文件<input type="file" accept=".csv,.json" @change="readFile"></label><p v-if="importForm.name" class="hint">{{importForm.name}}</p><label v-if="page!=='settings'">格式<select v-model="importForm.format"><option value="csv">CSV</option><option value="json">JSON</option></select></label><label>或粘贴内容<textarea v-model="importForm.text" rows="10" required placeholder="title,sender,content,company,country,id"></textarea></label><p class="hint">每次最多 500 条、2MB。CSV 使用 title / content / sender / company / country 等字段。相同 ID 重复导入会合并，已归档内容保留历史。</p></form><template #footer><span></span><div class="row-actions"><button class="button secondary" @click="importOpen=false">取消</button><button class="button primary" form="import-form" type="submit" :disabled="busy">{{busy?'导入中…':page==='settings'?'恢复':'开始导入'}}</button></div></template></Modal>
</div>
</template>
