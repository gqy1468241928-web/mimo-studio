<script setup>
import {ref,onMounted,onBeforeUnmount} from 'vue';
import Icon from './Icon.vue';
defineProps({title:String,wide:Boolean});
const emit=defineEmits(['close']),dialog=ref();
let previous;
onMounted(()=>{previous=document.activeElement;dialog.value.showModal();});
onBeforeUnmount(()=>{dialog.value?.close();previous?.focus();});
</script>
<template>
<dialog ref="dialog" :class="['modal',{'modal-wide':wide}]" @cancel.prevent="emit('close')" aria-labelledby="dialog-title">
 <header class="modal-header"><h2 id="dialog-title">{{title}}</h2><button class="icon-button" aria-label="关闭窗口" @click="emit('close')"><Icon name="close"/></button></header>
 <div class="modal-body"><slot/></div>
 <footer v-if="$slots.footer" class="modal-footer"><slot name="footer"/></footer>
</dialog>
</template>
