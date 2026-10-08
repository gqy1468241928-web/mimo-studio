<script setup>
import {reactive,watch,computed,ref} from 'vue';
import {openCodeGo,isOpenCodeGo} from '../../shared/agent-providers.mjs';
import {displayDate} from '../api.js';
const props=defineProps({config:{type:Object,required:true},busy:Boolean,preset:String});
const emit=defineEmits(['save','test']);
const form=reactive({endpoint:'',model:'',secret:'',hasSecret:false}),savedEndpoint=ref('');
const canonical=value=>String(value||'').trim().replace(/\/+$/,'').replace(/\/chat\/completions$/,'');
watch([()=>props.config,()=>props.preset],([value,preset])=>{Object.assign(form,{...value,secret:''});savedEndpoint.value=canonical(value.endpoint);if(preset==='opencode-go'&&!isOpenCodeGo(value.endpoint)){form.endpoint=openCodeGo.endpoint;form.model=openCodeGo.defaultModel;}},{immediate:true});
const isGo=computed(()=>isOpenCodeGo(form.endpoint));
const reuseKey=computed(()=>props.config.hasSecret&&canonical(form.endpoint)===savedEndpoint.value);
const unchanged=computed(()=>reuseKey.value&&form.model===props.config.model&&!form.secret);
function chooseProvider(value){
 form.secret='';
 if(value==='opencode-go'){form.endpoint=openCodeGo.endpoint;form.model=openCodeGo.defaultModel;}
 else{form.endpoint=isOpenCodeGo(props.config.endpoint)?'':props.config.endpoint;form.model=isOpenCodeGo(props.config.endpoint)?'':props.config.model;}
}
function save(){emit('save',{endpoint:form.endpoint,model:form.model,secret:form.secret});}
</script>
<template>
<section class="settings-section panel">
 <div class="subheading"><div><h2>Agent API</h2><p class="muted">选择服务商，填写 API Key 即可接入。</p></div><span v-if="config.hasSecret" class="connected-label">{{!unchanged?'有未保存更改':config.lastTestAt?'连接已验证':'已保存配置'}}</span></div>
 <form class="stack" @submit.prevent="save">
  <label>服务商<select :value="isGo?'opencode-go':'custom'" :disabled="busy" @change="chooseProvider($event.target.value)"><option value="custom">其它兼容 API</option><option value="opencode-go">OpenCode Go 订阅</option></select></label>
  <p v-if="isGo" class="hint">已预设 Go 专用地址和兼容模型。Go 主要面向编程 Agent，其他用途请核对<a href="https://opencode.ai/docs/go/#where-can-i-use-it" target="_blank" rel="noopener noreferrer">订阅使用范围</a>。</p>
  <div class="field-grid">
   <label>API 地址<input v-model="form.endpoint" type="url" :readonly="isGo" :disabled="busy" required placeholder="https://api.example.com/v1"></label>
   <label v-if="isGo">模型<select v-model="form.model" :disabled="busy" required><option v-for="model in openCodeGo.models" :key="model.id" :value="model.id">{{model.name}}</option></select></label>
   <label v-else>模型名称<input v-model="form.model" :disabled="busy" required placeholder="填写服务商提供的模型 ID"></label>
  </div>
  <label>API Key<input v-model="form.secret" type="password" autocomplete="new-password" :disabled="busy" :required="!reuseKey" :placeholder="reuseKey?'留空保留已保存的密钥':'粘贴此服务的 API Key'"></label>
  <p v-if="config.hasSecret&&!reuseKey" class="hint">切换接口时，请填写对应服务的 API Key。</p>
  <p v-if="config.lastTestAt&&unchanged" class="hint">最近验证：{{displayDate(config.lastTestAt)}}。连接测试只发送测试内容。</p>
  <div class="align-end row-actions"><button type="button" class="button secondary" :disabled="busy||!config.hasSecret" @click="emit('test')">测试已保存配置</button><button class="button primary" :disabled="busy">{{busy?'正在连接…':'保存并测试'}}</button></div>
 </form>
</section>
</template>
