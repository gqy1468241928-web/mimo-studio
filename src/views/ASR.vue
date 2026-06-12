<template>
  <div class="asr-page">
    <n-grid :cols="2" :x-gap="16">
      <!-- ASR 输入区域 -->
      <n-grid-item>
        <n-card title="语音识别">
          <n-form label-placement="left" label-width="80">
            <n-form-item label="模型">
              <n-select v-model:value="selectedModel" :options="asrModelOptions" />
            </n-form-item>

            <n-form-item label="语言">
              <n-select v-model:value="language" :options="languageOptions" placeholder="自动检测" clearable />
            </n-form-item>

            <n-form-item label="录音">
              <n-space vertical style="width: 100%">
                <n-button
                  :type="isRecording ? 'error' : 'primary'"
                  @click="toggleRecording"
                  block
                >
                  <template #icon>
                    <n-icon>
                      <svg v-if="!isRecording" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                      </svg>
                    </n-icon>
                  </template>
                  {{ isRecording ? '停止录音' : '开始录音' }}
                </n-button>
                <n-text v-if="isRecording" depth="3" style="text-align: center">
                  录音中... {{ recordingTime }}s
                </n-text>
              </n-space>
            </n-form-item>

            <n-divider>或</n-divider>

            <n-form-item label="上传音频">
              <n-upload
                :max="1"
                accept="audio/*"
                :default-upload="false"
                @change="handleAudioUpload"
              >
                <n-button>选择音频文件</n-button>
              </n-upload>
            </n-form-item>

            <n-form-item>
              <n-button
                type="primary"
                @click="transcribe"
                :loading="loading"
                :disabled="!audioFile && !recordedBlob"
                block
              >
                <template #icon>
                  <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></n-icon>
                </template>
                开始识别
              </n-button>
            </n-form-item>
          </n-form>
        </n-card>
      </n-grid-item>

      <!-- ASR 输出区域 -->
      <n-grid-item>
        <n-card title="识别结果">
          <div v-if="transcription" class="result-area">
            <n-input
              v-model:value="transcription"
              type="textarea"
              :rows="10"
              readonly
              placeholder="识别结果将在此显示..."
            />
            <n-space justify="center" style="margin-top: 16px">
              <n-button @click="copyText">
                <template #icon>
                  <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></n-icon>
                </template>
                复制文本
              </n-button>
              <n-button @click="clearResult">清除</n-button>
            </n-space>
          </div>
          <div v-else style="text-align: center; padding: 40px; color: var(--n-text-color-3)">
            <n-empty description="识别语音后将在此显示" />
          </div>

          <!-- 历史记录 -->
          <n-divider />
          <h4>识别历史</h4>
          <n-list v-if="history.length > 0" bordered style="margin-top: 8px">
            <n-list-item v-for="(item, index) in history" :key="index">
              <n-thing :title="item.text.substring(0, 50) + (item.text.length > 50 ? '...' : '')">
                <template #description>
                  <n-space>
                    <n-text depth="3" style="font-size: 12px">{{ item.model }}</n-text>
                    <n-text depth="3" style="font-size: 12px">{{ item.duration }}s</n-text>
                    <n-text depth="3" style="font-size: 12px">{{ item.time }}</n-text>
                  </n-space>
                </template>
                <template #header-extra>
                  <n-button size="small" @click="loadHistory(item)">加载</n-button>
                </template>
              </n-thing>
            </n-list-item>
          </n-list>
          <div v-else style="text-align: center; padding: 20px; color: var(--n-text-color-3)">
            <n-text depth="3">暂无历史记录</n-text>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import {
  NGrid, NGridItem, NCard, NForm, NFormItem, NInput, NSelect,
  NButton, NIcon, NSpace, NText, NEmpty, NDivider, NList, NListItem, NThing, NUpload
} from 'naive-ui'
import { transcribe as asrTranscribe, AudioRecorder } from '@/api/asr'
import { useSettingsStore } from '@/stores/settings'
import { useStatisticsStore } from '@/stores/statistics'

const settingsStore = useSettingsStore()
const statisticsStore = useStatisticsStore()

const selectedModel = ref('mimo-v2.5-asr')
const language = ref<string | null>(null)
const loading = ref(false)
const transcription = ref('')
const audioFile = ref<File | null>(null)
const recordedBlob = ref<Blob | null>(null)
const isRecording = ref(false)
const recordingTime = ref(0)

const recorder = new AudioRecorder()
let recordingInterval: ReturnType<typeof setInterval> | null = null

const asrModelOptions = [
  { label: 'MiMo ASR', value: 'mimo-v2.5-asr' },
]

const languageOptions = [
  { label: '中文', value: 'zh' },
  { label: '英文', value: 'en' },
  { label: '日文', value: 'ja' },
  { label: '韩文', value: 'ko' },
]

interface HistoryItem {
  text: string
  model: string
  duration: number
  time: string
}

const history = ref<HistoryItem[]>([])

const handleAudioUpload = (options: any) => {
  audioFile.value = options.file.file
  recordedBlob.value = null
}

const toggleRecording = async () => {
  if (isRecording.value) {
    // 停止录音
    recordedBlob.value = await recorder.stop()
    isRecording.value = false
    if (recordingInterval) {
      clearInterval(recordingInterval)
      recordingInterval = null
    }
  } else {
    // 开始录音
    try {
      await recorder.start()
      isRecording.value = true
      recordingTime.value = 0
      audioFile.value = null

      recordingInterval = setInterval(() => {
        recordingTime.value++
      }, 1000)
    } catch (error: any) {
      alert(`录音失败: ${error.message || '请检查麦克风权限'}`)
    }
  }
}

const transcribe = async () => {
  const audio = audioFile.value || recordedBlob.value
  if (!audio) return

  if (!settingsStore.apiKey) {
    alert('请先在设置中配置 API Key')
    return
  }

  loading.value = true

  try {
    const result = await asrTranscribe({
      model: selectedModel.value,
      audio,
      language: language.value || undefined,
    })

    transcription.value = result.text

    statisticsStore.addRecord({
      type: 'asr',
      model: selectedModel.value,
      tokens: result.text.length,
      duration: recordingTime.value || 0,
    })

    // 添加到历史记录
    history.value.unshift({
      text: result.text,
      model: selectedModel.value,
      duration: recordingTime.value || 0,
      time: new Date().toLocaleTimeString('zh-CN'),
    })

    // 限制历史记录数量
    if (history.value.length > 10) {
      history.value.pop()
    }
  } catch (error: any) {
    console.error('语音识别失败:', error)
    alert(`识别失败: ${error.message || '请检查 API 配置'}`)
  } finally {
    loading.value = false
  }
}

const copyText = () => {
  if (transcription.value) {
    navigator.clipboard.writeText(transcription.value)
  }
}

const clearResult = () => {
  transcription.value = ''
  audioFile.value = null
  recordedBlob.value = null
  recordingTime.value = 0
}

const loadHistory = (item: HistoryItem) => {
  transcription.value = item.text
}

onUnmounted(() => {
  if (recordingInterval) {
    clearInterval(recordingInterval)
  }
})
</script>

<style lang="scss" scoped>
.asr-page {
  .result-area {
    :deep(textarea) {
      font-size: 16px;
      line-height: 1.8;
    }
  }
}
</style>
