import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Model, ModelConfig, TTSModelConfig, ASRModelConfig } from '@/types/model'

export const useModelStore = defineStore('model', () => {
  // 模型列表
  const models = ref<Model[]>([
    {
      id: 'mimo-v2.5',
      name: 'MiMo v2.5',
      type: 'chat',
      description: '通用对话模型，适用于日常问答和文本生成',
      version: '2.5.0',
      capabilities: ['文本生成', '对话', '翻译', '总结'],
      maxTokens: 4096,
      pricing: { input: 0.01, output: 0.02 }
    },
    {
      id: 'mimo-v2.5-pro',
      name: 'MiMo v2.5 Pro',
      type: 'chat',
      description: '专业对话模型，适用于复杂推理和专业领域',
      version: '2.5.0',
      capabilities: ['文本生成', '对话', '翻译', '总结', '推理', '分析'],
      maxTokens: 8192,
      pricing: { input: 0.02, output: 0.04 }
    },
    {
      id: 'mimo-v2.5-tts',
      name: 'MiMo TTS',
      type: 'tts',
      description: '高质量文本转语音模型',
      version: '2.5.0',
      capabilities: ['文本转语音', '多语言支持', '情感控制'],
    },
    {
      id: 'mimo-v2.5-asr',
      name: 'MiMo ASR',
      type: 'asr',
      description: '高精度语音识别模型',
      version: '2.5.0',
      capabilities: ['语音识别', '实时转写', '多语言支持'],
    },
    {
      id: 'mimo-v2.5-tts-voiceclone',
      name: 'Voice Clone',
      type: 'tts',
      description: '语音克隆模型，可复制特定说话人的声音',
      version: '2.5.0',
      capabilities: ['语音克隆', '声音复制', '个性化语音'],
    },
    {
      id: 'mimo-v2.5-tts-voicedesign',
      name: 'Voice Design',
      type: 'tts',
      description: '语音设计模型，可自定义语音特征',
      version: '2.5.0',
      capabilities: ['语音设计', '特征调整', '风格定制'],
    },
  ])

  // 当前选中的模型
  const selectedModel = ref<Model | null>(null)

  // 模型配置
  const chatConfig = ref<ModelConfig>({
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
  })

  const ttsConfig = ref<TTSModelConfig>({
    voice: 'default',
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
  })

  const asrConfig = ref<ASRModelConfig>({
    language: 'zh-CN',
    format: 'wav',
    sampleRate: 16000,
  })

  // 搜索关键词
  const searchQuery = ref('')

  // 筛选类型
  const filterType = ref<string>('')

  // 计算属性：过滤后的模型列表
  const filteredModels = computed(() => {
    let result = models.value

    // 按类型筛选
    if (filterType.value && filterType.value !== '') {
      result = result.filter(m => m.type === filterType.value)
    }

    // 按搜索关键词筛选
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query)
      )
    }

    return result
  })

  // 计算属性：按类型分组的模型
  const modelsByType = computed(() => {
    const grouped: Record<string, Model[]> = {
      chat: [],
      tts: [],
      asr: [],
    }
    filteredModels.value.forEach(model => {
      const type = model.type as keyof typeof grouped
      if (grouped[type]) {
        grouped[type].push(model)
      }
    })
    return grouped
  })

  // 计算属性：模型统计
  const modelStats = computed(() => ({
    total: models.value.length,
    chat: models.value.filter(m => m.type === 'chat').length,
    tts: models.value.filter(m => m.type === 'tts').length,
    asr: models.value.filter(m => m.type === 'asr').length,
  }))

  // 选择模型
  const selectModel = (modelId: string) => {
    selectedModel.value = models.value.find(m => m.id === modelId) || null
  }

  // 更新聊天配置
  const updateChatConfig = (config: Partial<ModelConfig>) => {
    chatConfig.value = { ...chatConfig.value, ...config }
  }

  // 更新 TTS 配置
  const updateTTSConfig = (config: Partial<TTSModelConfig>) => {
    ttsConfig.value = { ...ttsConfig.value, ...config }
  }

  // 更新 ASR 配置
  const updateASRConfig = (config: Partial<ASRModelConfig>) => {
    asrConfig.value = { ...asrConfig.value, ...config }
  }

  // 重置配置
  const resetConfig = (type: 'chat' | 'tts' | 'asr') => {
    switch (type) {
      case 'chat':
        chatConfig.value = {
          temperature: 0.7,
          maxTokens: 2048,
          topP: 1.0,
          frequencyPenalty: 0,
          presencePenalty: 0,
        }
        break
      case 'tts':
        ttsConfig.value = {
          voice: 'default',
          speed: 1.0,
          pitch: 1.0,
          volume: 1.0,
        }
        break
      case 'asr':
        asrConfig.value = {
          language: 'zh-CN',
          format: 'wav',
          sampleRate: 16000,
        }
        break
    }
  }

  return {
    models,
    selectedModel,
    chatConfig,
    ttsConfig,
    asrConfig,
    searchQuery,
    filterType,
    filteredModels,
    modelsByType,
    modelStats,
    selectModel,
    updateChatConfig,
    updateTTSConfig,
    updateASRConfig,
    resetConfig,
  }
})
