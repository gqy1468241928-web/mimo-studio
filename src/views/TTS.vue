<template>
  <div class="tts-page">
    <n-grid :cols="2" :x-gap="16">
      <!-- TTS 输入区域 -->
      <n-grid-item>
        <n-card title="文本转语音">
          <n-form label-placement="left" label-width="80">
            <n-form-item label="模型">
              <n-select v-model:value="selectedModel" :options="ttsModelOptions" />
            </n-form-item>

            <!-- Voice Clone 参考音频上传 -->
            <n-form-item v-if="selectedModel === 'mimo-v2.5-tts-voiceclone'" label="参考音频">
              <n-upload
                :show-file-list="false"
                :custom-request="handleReferenceAudio"
                accept=".mp3,.wav"
              >
                <n-button>上传参考音频</n-button>
              </n-upload>
              <n-text v-if="referenceAudioName" depth="3" style="margin-left: 8px">
                {{ referenceAudioName }}
              </n-text>
            </n-form-item>

            <!-- Voice Design 音色描述 -->
            <n-form-item v-if="selectedModel === 'mimo-v2.5-tts-voicedesign'" label="音色描述">
              <n-input
                v-model:value="voiceDescription"
                type="textarea"
                :rows="2"
                placeholder="描述你想要的音色，例如：温柔的女声、低沉的男声..."
              />
            </n-form-item>

            <n-form-item label="文本">
              <n-input
                v-model:value="text"
                type="textarea"
                :rows="6"
                placeholder="输入要合成的文本..."
                :maxlength="5000"
                show-count
              />
            </n-form-item>
            <n-form-item label="语速">
              <n-slider v-model:value="config.speed" :min="0.5" :max="2" :step="0.1" />
              <span style="margin-left: 8px">{{ config.speed }}x</span>
            </n-form-item>
            <n-form-item label="音调">
              <n-slider v-model:value="config.pitch" :min="0.5" :max="2" :step="0.1" />
              <span style="margin-left: 8px">{{ config.pitch }}x</span>
            </n-form-item>
            <n-form-item label="音量">
              <n-slider v-model:value="config.volume" :min="0" :max="1" :step="0.1" />
              <span style="margin-left: 8px">{{ Math.round(config.volume * 100) }}%</span>
            </n-form-item>
            <n-form-item>
              <n-button type="primary" @click="synthesize" :loading="loading" :disabled="!text.trim()">
                <template #icon>
                  <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></n-icon>
                </template>
                合成语音
              </n-button>
            </n-form-item>
          </n-form>
        </n-card>
      </n-grid-item>

      <!-- TTS 输出区域 -->
      <n-grid-item>
        <n-card title="合成结果">
          <div v-if="audioSrc" class="audio-player">
            <audio :src="audioSrc" controls style="width: 100%"></audio>
            <n-space justify="center" style="margin-top: 16px">
              <n-button @click="downloadCurrentAudio">
                <template #icon>
                  <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></n-icon>
                </template>
                下载音频
              </n-button>
              <n-button @click="clearAudio">清除</n-button>
            </n-space>
          </div>
          <div v-else style="text-align: center; padding: 40px; color: var(--n-text-color-3)">
            <n-empty description="合成语音后将在此显示" />
          </div>

          <!-- 历史记录 -->
          <n-divider />
          <h4>合成历史</h4>
          <n-scrollbar style="max-height: 300px">
            <n-list v-if="history.length > 0" bordered style="margin-top: 8px">
              <n-list-item v-for="(item, index) in history" :key="index">
                <n-thing :title="item.text.substring(0, 50) + (item.text.length > 50 ? '...' : '')">
                  <template #description>
                    <n-space>
                      <n-text depth="3" style="font-size: 12px">{{ getModelName(item.model) }}</n-text>
                      <n-text depth="3" style="font-size: 12px">{{ item.time }}</n-text>
                    </n-space>
                  </template>
                  <template #header-extra>
                    <n-space>
                      <n-button size="small" @click="playHistory(item)">播放</n-button>
                      <n-button size="small" @click="downloadHistory(item)">下载</n-button>
                    </n-space>
                  </template>
                </n-thing>
              </n-list-item>
            </n-list>
            <div v-else style="text-align: center; padding: 20px; color: var(--n-text-color-3)">
              <n-text depth="3">暂无历史记录</n-text>
            </div>
          </n-scrollbar>
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
  NGrid, NGridItem, NCard, NForm, NFormItem, NInput, NSelect, NSlider,
  NButton, NIcon, NSpace, NText, NEmpty, NDivider, NList, NListItem,
  NThing, NUpload, NScrollbar
} from 'naive-ui'
import { useStatisticsStore } from '@/stores/statistics'
import {
  synthesize as ttsSynthesize,
  voiceClone as ttsVoiceClone,
  voiceDesign as ttsVoiceDesign,
  createAudioUrl,
  downloadAudio
} from '@/api/tts'

const statisticsStore = useStatisticsStore()
const text = ref('')
const selectedModel = ref('mimo-v2.5-tts')
const loading = ref(false)
const audioSrc = ref('')
const referenceAudioBase64 = ref('')
const referenceAudioName = ref('')
const voiceDescription = ref('')
const currentAudioBase64 = ref('')

const config = reactive({
  speed: 1.0,
  pitch: 1.0,
  volume: 1.0,
})

const ttsModelOptions = [
  { label: 'MiMo TTS', value: 'mimo-v2.5-tts' },
  { label: 'Voice Clone', value: 'mimo-v2.5-tts-voiceclone' },
  { label: 'Voice Design', value: 'mimo-v2.5-tts-voicedesign' },
]

interface HistoryItem {
  text: string
  model: string
  audioBase64: string
  format: string
  time: string
}

const history = ref<HistoryItem[]>([])

const getModelName = (modelId: string) => {
  const model = ttsModelOptions.find(m => m.value === modelId)
  return model?.label || modelId
}

const handleReferenceAudio = ({ file }: any) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = (e.target?.result as string).split(',')[1] || ''
    referenceAudioBase64.value = base64
    referenceAudioName.value = file.name
  }
  reader.readAsDataURL(file.file)
}

const synthesize = async () => {
  if (!text.value.trim()) return

  loading.value = true

  try {
    let result

    switch (selectedModel.value) {
      case 'mimo-v2.5-tts':
        result = await ttsSynthesize({
          model: selectedModel.value,
          input: text.value,
          speed: config.speed,
          pitch: config.pitch,
          volume: config.volume,
        })
        break

      case 'mimo-v2.5-tts-voiceclone':
        if (!referenceAudioBase64.value) {
          alert('请先上传参考音频')
          return
        }
        result = await ttsVoiceClone(text.value, referenceAudioBase64.value)
        break

      case 'mimo-v2.5-tts-voicedesign':
        if (!voiceDescription.value.trim()) {
          alert('请输入音色描述')
          return
        }
        result = await ttsVoiceDesign(text.value, voiceDescription.value)
        break

      default:
        throw new Error('未知的模型')
    }

    if (result) {
      currentAudioBase64.value = result.audio
      audioSrc.value = createAudioUrl(result.audio, result.format)

      statisticsStore.addRecord({
        type: 'tts',
        model: selectedModel.value,
        tokens: text.value.length,
      })

      // 添加到历史记录
      history.value.unshift({
        text: text.value,
        model: selectedModel.value,
        audioBase64: result.audio,
        format: result.format,
        time: new Date().toLocaleTimeString('zh-CN'),
      })

      // 限制历史记录数量
      if (history.value.length > 20) {
        history.value.pop()
      }
    }
  } catch (error: any) {
    console.error('TTS 合成失败:', error)
    alert(`合成失败: ${error.message || '请检查 API 配置'}`)
  } finally {
    loading.value = false
  }
}

const downloadCurrentAudio = () => {
  if (currentAudioBase64.value) {
    downloadAudio(currentAudioBase64.value, `tts_${Date.now()}`, 'wav')
  }
}

const clearAudio = () => {
  audioSrc.value = ''
  currentAudioBase64.value = ''
}

const playHistory = (item: HistoryItem) => {
  currentAudioBase64.value = item.audioBase64
  audioSrc.value = createAudioUrl(item.audioBase64, item.format)
  text.value = item.text
  selectedModel.value = item.model
}

const downloadHistory = (item: HistoryItem) => {
  downloadAudio(item.audioBase64, `tts_${Date.now()}`, item.format)
}
</script>

<style lang="scss" scoped>
.tts-page {
  .audio-player {
    audio {
      border-radius: 8px;
    }
  }
}
</style>
