<template>
  <div class="dashboard">
    <n-grid :cols="4" :x-gap="16" :y-gap="16">
      <n-grid-item>
        <n-card>
          <n-statistic label="可用模型" :value="modelStore.modelStats.total">
            <template #prefix>
              <n-icon color="#18a058"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="今日对话" :value="chatStats.sessions">
            <template #prefix>
              <n-icon color="#2080f0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="Token 使用" :value="chatStats.tokens">
            <template #prefix>
              <n-icon color="#f0a020"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="TTS 调用" :value="chatStats.ttsCalls">
            <template #prefix>
              <n-icon color="#d03050"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-grid :cols="2" :x-gap="16" style="margin-top: 16px">
      <n-grid-item>
        <n-card title="快速开始">
          <n-space vertical>
            <n-button type="primary" block @click="$router.push('/chat')">
              <template #icon>
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></n-icon>
              </template>
              开始对话
            </n-button>
            <n-button block @click="$router.push('/models')">
              <template #icon>
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></n-icon>
              </template>
              查看模型
            </n-button>
            <n-button block @click="$router.push('/tts')">
              <template #icon>
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></n-icon>
              </template>
              语音合成
            </n-button>
          </n-space>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="模型分布">
          <n-space vertical>
            <n-space justify="space-between" align="center">
              <n-tag type="success">对话模型</n-tag>
              <n-text>{{ modelStore.modelStats.chat }} 个</n-text>
            </n-space>
            <n-space justify="space-between" align="center">
              <n-tag type="info">语音模型</n-tag>
              <n-text>{{ modelStore.modelStats.tts }} 个</n-text>
            </n-space>
            <n-space justify="space-between" align="center">
              <n-tag type="warning">识别模型</n-tag>
              <n-text>{{ modelStore.modelStats.asr }} 个</n-text>
            </n-space>
          </n-space>
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import {
  NGrid, NGridItem, NCard, NStatistic, NSpace, NButton, NIcon, NTag, NText
} from 'naive-ui'
import { useModelStore } from '@/stores/model'

const modelStore = useModelStore()

// 模拟统计数据
const chatStats = reactive({
  sessions: 0,
  tokens: 0,
  ttsCalls: 0,
})
</script>
