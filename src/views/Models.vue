<template>
  <div class="models-page">
    <!-- 顶部统计卡片 -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16" style="margin-bottom: 16px">
      <n-grid-item>
        <n-card size="small">
          <n-statistic label="总模型" :value="modelStore.modelStats.total" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card size="small">
          <n-statistic label="对话模型" :value="modelStore.modelStats.chat">
            <template #prefix>
              <n-icon color="#18a058"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card size="small">
          <n-statistic label="语音模型" :value="modelStore.modelStats.tts">
            <template #prefix>
              <n-icon color="#2080f0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card size="small">
          <n-statistic label="识别模型" :value="modelStore.modelStats.asr">
            <template #prefix>
              <n-icon color="#f0a020"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 搜索和筛选 -->
    <n-card size="small" style="margin-bottom: 16px">
      <n-space align="center" justify="space-between">
        <n-input
          v-model:value="modelStore.searchQuery"
          placeholder="搜索模型名称、描述..."
          clearable
          style="width: 280px"
        >
          <template #prefix>
            <n-icon size="16"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></n-icon>
          </template>
        </n-input>
        <n-radio-group v-model:value="modelStore.filterType">
          <n-radio-button value="">全部</n-radio-button>
          <n-radio-button value="chat">对话</n-radio-button>
          <n-radio-button value="tts">语音</n-radio-button>
          <n-radio-button value="asr">识别</n-radio-button>
        </n-radio-group>
      </n-space>
    </n-card>

    <!-- 模型列表 -->
    <n-grid :cols="3" :x-gap="16" :y-gap="16">
      <n-grid-item v-for="model in modelStore.filteredModels" :key="model.id">
        <n-card size="small" hoverable @click="showModelDetail(model)">
          <template #header>
            <n-space align="center" :size="8">
              <n-text strong>{{ model.name }}</n-text>
              <n-tag :type="getTagType(model.type)" size="small">
                {{ getTypeLabel(model.type) }}
              </n-tag>
            </n-space>
          </template>
          <template #header-extra>
            <n-text depth="3" style="font-size: 12px">v{{ model.version }}</n-text>
          </template>
          <n-text depth="3" style="font-size: 13px; display: block; margin-bottom: 8px">
            {{ model.description }}
          </n-text>
          <n-space :size="4" wrap>
            <n-tag v-for="cap in model.capabilities.slice(0, 3)" :key="cap" size="small" bordered>
              {{ cap }}
            </n-tag>
            <n-tag v-if="model.capabilities.length > 3" size="small" bordered type="info">
              +{{ model.capabilities.length - 3 }}
            </n-tag>
          </n-space>
          <template #action>
            <n-space justify="end">
              <n-button size="small" type="primary" @click.stop="useModel(model)">使用</n-button>
              <n-button size="small" @click.stop="showModelDetail(model)">详情</n-button>
            </n-space>
          </template>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 空状态 -->
    <n-empty v-if="modelStore.filteredModels.length === 0" description="没有找到匹配的模型" style="margin-top: 60px" />

    <!-- 模型详情弹窗 -->
    <n-modal v-model:show="showDetail" preset="card" :title="detailModel?.name" style="width: 600px">
      <template v-if="detailModel">
        <n-descriptions bordered :column="2">
          <n-descriptions-item label="模型 ID">{{ detailModel.id }}</n-descriptions-item>
          <n-descriptions-item label="版本">{{ detailModel.version }}</n-descriptions-item>
          <n-descriptions-item label="类型">{{ getTypeLabel(detailModel.type) }}</n-descriptions-item>
          <n-descriptions-item label="最大 Token">{{ detailModel.maxTokens || 'N/A' }}</n-descriptions-item>
        </n-descriptions>

        <n-divider />

        <h4>能力特性</h4>
        <n-space style="margin-top: 8px">
          <n-tag v-for="cap in detailModel.capabilities" :key="cap">{{ cap }}</n-tag>
        </n-space>

        <template v-if="detailModel.pricing">
          <n-divider />
          <h4>定价信息</h4>
          <n-descriptions bordered :column="2" style="margin-top: 8px">
            <n-descriptions-item label="输入价格">¥{{ detailModel.pricing.input }}/1K tokens</n-descriptions-item>
            <n-descriptions-item label="输出价格">¥{{ detailModel.pricing.output }}/1K tokens</n-descriptions-item>
          </n-descriptions>
        </template>

        <n-divider />
        <h4>模型配置</h4>
        <template v-if="detailModel.type === 'chat'">
          <n-form label-placement="left" label-width="100" style="margin-top: 8px">
            <n-form-item label="Temperature">
              <n-slider v-model:value="modelStore.chatConfig.temperature" :min="0" :max="2" :step="0.1" />
            </n-form-item>
            <n-form-item label="Max Tokens">
              <n-input-number v-model:value="modelStore.chatConfig.maxTokens" :min="1" :max="detailModel.maxTokens || 4096" />
            </n-form-item>
            <n-form-item label="Top P">
              <n-slider v-model:value="modelStore.chatConfig.topP" :min="0" :max="1" :step="0.05" />
            </n-form-item>
          </n-form>
        </template>
        <template v-else-if="detailModel.type === 'tts'">
          <n-form label-placement="left" label-width="100" style="margin-top: 8px">
            <n-form-item label="语速">
              <n-slider v-model:value="modelStore.ttsConfig.speed" :min="0.5" :max="2" :step="0.1" />
            </n-form-item>
            <n-form-item label="音调">
              <n-slider v-model:value="modelStore.ttsConfig.pitch" :min="0.5" :max="2" :step="0.1" />
            </n-form-item>
            <n-form-item label="音量">
              <n-slider v-model:value="modelStore.ttsConfig.volume" :min="0" :max="1" :step="0.1" />
            </n-form-item>
          </n-form>
        </template>
      </template>
      <template #action>
        <n-space>
          <n-button @click="showDetail = false">关闭</n-button>
          <n-button type="primary" @click="useModel(detailModel!)">使用此模型</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NGrid, NGridItem, NSpace, NInput, NIcon, NRadioGroup, NRadioButton,
  NStatistic, NTag, NButton, NText, NEmpty, NModal, NDescriptions, NDescriptionsItem,
  NDivider, NForm, NFormItem, NSlider, NInputNumber
} from 'naive-ui'
import { useModelStore } from '@/stores/model'
import type { Model } from '@/types/model'

const router = useRouter()
const modelStore = useModelStore()

const showDetail = ref(false)
const detailModel = ref<Model | null>(null)

const getTagType = (type: string) => {
  switch (type) {
    case 'chat': return 'success'
    case 'tts': return 'info'
    case 'asr': return 'warning'
    default: return 'default'
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'chat': return '对话'
    case 'tts': return '语音'
    case 'asr': return '识别'
    default: return type
  }
}

const showModelDetail = (model: Model) => {
  detailModel.value = model
  showDetail.value = true
}

const useModel = (model: Model) => {
  modelStore.selectModel(model.id)
  showDetail.value = false
  switch (model.type) {
    case 'chat': router.push('/chat'); break
    case 'tts': router.push('/tts'); break
    case 'asr': router.push('/tts'); break
  }
}
</script>

<style lang="scss" scoped>
.models-page {
  padding: 0;
}
</style>
