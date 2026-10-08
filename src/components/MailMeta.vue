<script setup>
import {computed} from 'vue';
import {isUnreadMail,mailDate} from '../api.js';
import Icon from './Icon.vue';
const props=defineProps({record:Object,mailbox:String});
const unread=computed(()=>isUnreadMail(props.record));
const date=computed(()=>mailDate(props.record?.receivedAt));
</script>
<template>
 <span class="mail-information">
  <span :class="['mail-read-status',{'is-unread':unread}]" title="以工作台查看记录为准，打开邮件会标记为已读">{{unread?'未读':record.status==='archived'&&!record.readAt?'已归档':'已读'}}</span>
  <span class="mail-source" :title="'来源：'+(record.mailbox||mailbox||'已移除的来源')"><Icon name="mail" :size="13"/>{{record.mailbox||mailbox||'已移除的来源'}}</span>
  <time class="mail-date" :datetime="date==='日期未知'?undefined:record.receivedAt" title="原邮件日期（北京时间）">邮件日期：{{date}}</time>
 </span>
</template>
