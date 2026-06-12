<template>
  <div class="settings-page">
    <n-card title="设置">
      <n-tabs type="line" v-model:value="activeTab">
        <!-- API 配置 -->
        <n-tab-pane name="api" tab="API 配置">
          <n-form label-placement="left" label-width="120" style="max-width: 600px">
            <n-form-item label="API Base URL">
              <n-input v-model:value="settings.baseUrl" placeholder="https://token-plan-cn.xiaomimimo.com/v1" />
            </n-form-item>
            <n-form-item label="API Key">
              <n-input v-model:value="settings.apiKey" type="password" show-password-on="click" placeholder="tp-..." />
            </n-form-item>
            <n-form-item label="默认模型">
              <n-select v-model:value="settings.defaultModel" :options="modelOptions" />
            </n-form-item>
            <n-form-item>
              <n-space>
                <n-button type="primary" @click="saveSettings">保存设置</n-button>
                <n-button @click="testConnection" :loading="testing">测试连接</n-button>
              </n-space>
            </n-form-item>
          </n-form>
        </n-tab-pane>

        <!-- 对话设置 -->
        <n-tab-pane name="chat" tab="对话设置">
          <n-form label-placement="left" label-width="120" style="max-width: 600px">
            <n-form-item label="系统提示词">
              <n-input
                v-model:value="chatSettings.systemPrompt"
                type="textarea"
                :rows="4"
                placeholder="设置AI助手的行为和角色..."
              />
            </n-form-item>
            <n-form-item label="Temperature">
              <n-slider v-model:value="chatSettings.temperature" :min="0" :max="2" :step="0.1" />
              <span style="margin-left: 8px">{{ chatSettings.temperature }}</span>
            </n-form-item>
            <n-form-item label="Max Tokens">
              <n-input-number v-model:value="chatSettings.maxTokens" :min="1" :max="32768" />
            </n-form-item>
            <n-form-item label="Top P">
              <n-slider v-model:value="chatSettings.topP" :min="0" :max="1" :step="0.05" />
              <span style="margin-left: 8px">{{ chatSettings.topP }}</span>
            </n-form-item>
            <n-form-item label="流式输出">
              <n-switch v-model:value="chatSettings.stream" />
            </n-form-item>
            <n-form-item label="自动滚动">
              <n-switch v-model:value="chatSettings.autoScroll" />
            </n-form-item>
            <n-form-item label="发送快捷键">
              <n-select v-model:value="chatSettings.sendKey" :options="sendKeyOptions" />
            </n-form-item>
            <n-form-item>
              <n-button type="primary" @click="saveChatSettings">保存对话设置</n-button>
            </n-form-item>
          </n-form>
        </n-tab-pane>

        <!-- 外观设置 -->
        <n-tab-pane name="appearance" tab="外观">
          <n-form label-placement="left" label-width="120" style="max-width: 600px">
            <n-form-item label="深色模式">
              <n-switch v-model:value="appearance.darkMode" />
            </n-form-item>
            <n-form-item label="语言">
              <n-select v-model:value="appearance.language" :options="langOptions" />
            </n-form-item>
            <n-form-item label="字体大小">
              <n-select v-model:value="appearance.fontSize" :options="fontSizeOptions" />
            </n-form-item>
            <n-form-item label="代码主题">
              <n-select v-model:value="appearance.codeTheme" :options="codeThemeOptions" />
            </n-form-item>
            <n-form-item label="消息显示">
              <n-radio-group v-model:value="appearance.messageStyle">
                <n-radio-button value="modern">现代</n-radio-button>
                <n-radio-button value="classic">经典</n-radio-button>
                <n-radio-button value="compact">紧凑</n-radio-button>
              </n-radio-group>
            </n-form-item>
            <n-form-item>
              <n-button type="primary" @click="saveAppearance">保存外观设置</n-button>
            </n-form-item>
          </n-form>
        </n-tab-pane>

        <!-- 快捷键设置 -->
        <n-tab-pane name="shortcuts" tab="快捷键">
          <n-table :bordered="false" :single-line="false">
            <thead>
              <tr>
                <th>功能</th>
                <th>快捷键</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="shortcut in shortcuts" :key="shortcut.action">
                <td>{{ shortcut.label }}</td>
                <td><n-tag size="small">{{ shortcut.key }}</n-tag></td>
              </tr>
            </tbody>
          </n-table>
        </n-tab-pane>

        <!-- 数据管理 -->
        <n-tab-pane name="data" tab="数据管理">
          <n-space vertical>
            <n-card title="导出数据">
              <n-text>导出所有设置和对话历史</n-text>
              <n-button style="margin-top: 8px" @click="exportData">导出</n-button>
            </n-card>
            <n-card title="导入数据">
              <n-text>从文件导入设置和对话历史</n-text>
              <n-upload style="margin-top: 8px" :custom-request="importData">
                <n-button>选择文件</n-button>
              </n-upload>
            </n-card>
            <n-card title="使用统计">
              <n-descriptions bordered>
                <n-descriptions-item label="总对话数">{{ stats.totalSessions }}</n-descriptions-item>
                <n-descriptions-item label="总消息数">{{ stats.totalMessages }}</n-descriptions-item>
                <n-descriptions-item label="总Token使用">{{ stats.totalTokens }}</n-descriptions-item>
                <n-descriptions-item label="TTS调用次数">{{ stats.ttsCalls }}</n-descriptions-item>
                <n-descriptions-item label="ASR调用次数">{{ stats.asrCalls }}</n-descriptions-item>
              </n-descriptions>
              <n-button style="margin-top: 8px" @click="resetStats">重置统计</n-button>
            </n-card>
            <n-card title="清除数据">
              <n-text type="error">清除所有本地数据，此操作不可恢复</n-text>
              <n-button type="error" style="margin-top: 8px" @click="clearData">清除所有数据</n-button>
            </n-card>
          </n-space>
        </n-tab-pane>

        <!-- 关于 -->
        <n-tab-pane name="about" tab="关于">
          <n-space vertical>
            <n-card>
              <div style="text-align: center">
                <h2 style="color: #18a058; margin-bottom: 8px">MiMo 工作台</h2>
                <n-text depth="3">版本 {{ version }}</n-text>
              </div>
            </n-card>
            <n-card title="功能特性">
              <n-list bordered>
                <n-list-item>
                  <n-thing title="多模型支持" description="支持MiMo全系列模型，包括对话、语音合成、语音识别" />
                </n-list-item>
                <n-list-item>
                  <n-thing title="流式对话" description="实时流式输出，打字机效果" />
                </n-list-item>
                <n-list-item>
                  <n-thing title="语音功能" description="TTS语音合成、ASR语音识别、音色克隆" />
                </n-list-item>
                <n-list-item>
                  <n-thing title="会话管理" description="多会话支持、历史记录、导入导出" />
                </n-list-item>
              </n-list>
            </n-card>
            <n-card title="技术栈">
              <n-space>
                <n-tag>Vue 3</n-tag>
                <n-tag>TypeScript</n-tag>
                <n-tag>Vite</n-tag>
                <n-tag>Naive UI</n-tag>
                <n-tag>Pinia</n-tag>
              </n-space>
            </n-card>
            <n-card title="链接">
              <n-space>
                <n-button tag="a" href="https://mimo.xiaomi.com" target="_blank" quaternary>
                  MiMo 官网
                </n-button>
                <n-button tag="a" href="https://github.com/XiaomiMiMo/MiMo-Code" target="_blank" quaternary>
                  GitHub
                </n-button>
                <n-button tag="a" href="https://platform.xiaomimimo.com" target="_blank" quaternary>
                  API 平台
                </n-button>
              </n-space>
            </n-card>
          </n-space>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  NCard, NTabs, NTabPane, NForm, NFormItem, NInput, NSelect, NButton,
  NSwitch, NSlider, NInputNumber, NSpace, NText, NUpload, NTable, NTag,
  NRadioGroup, NRadioButton, NList, NListItem, NThing, NDescriptions,
  NDescriptionsItem
} from 'naive-ui'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const version = '0.1.0'

const activeTab = ref('api')
const testing = ref(false)

const settings = reactive({
  baseUrl: settingsStore.baseUrl,
  apiKey: settingsStore.apiKey,
  defaultModel: settingsStore.defaultModel,
})

const chatSettings = reactive({
  systemPrompt: '你是一个有用的AI助手。',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1.0,
  stream: true,
  autoScroll: true,
  sendKey: 'ctrl+enter',
})

const appearance = reactive({
  darkMode: true,
  language: 'zh-CN',
  fontSize: 'medium',
  codeTheme: 'github-dark',
  messageStyle: 'modern',
})

const stats = reactive({
  totalSessions: 0,
  totalMessages: 0,
  totalTokens: 0,
  ttsCalls: 0,
  asrCalls: 0,
})

const modelOptions = [
  { label: 'MiMo v2.5', value: 'mimo-v2.5' },
  { label: 'MiMo v2.5 Pro', value: 'mimo-v2.5-pro' },
  { label: 'MiMo v2.5 Auto', value: 'mimo-v2.5-auto' },
]

const langOptions = [
  { label: '中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
]

const fontSizeOptions = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
]

const codeThemeOptions = [
  { label: 'GitHub Dark', value: 'github-dark' },
  { label: 'Monokai', value: 'monokai' },
  { label: 'Dracula', value: 'dracula' },
  { label: 'Solarized', value: 'solarized' },
]

const sendKeyOptions = [
  { label: 'Ctrl + Enter', value: 'ctrl+enter' },
  { label: 'Enter', value: 'enter' },
  { label: 'Shift + Enter (换行)', value: 'shift+enter' },
]

const shortcuts = [
  { action: 'send', label: '发送消息', key: 'Ctrl + Enter' },
  { action: 'newSession', label: '新建对话', key: 'Ctrl + N' },
  { action: 'clearChat', label: '清空对话', key: 'Ctrl + Shift + D' },
  { action: 'toggleSidebar', label: '切换侧边栏', key: 'Ctrl + B' },
  { action: 'settings', label: '打开设置', key: 'Ctrl + ,' },
  { action: 'search', label: '搜索', key: 'Ctrl + K' },
  { action: 'export', label: '导出对话', key: 'Ctrl + Shift + E' },
]

const saveSettings = () => {
  settingsStore.baseUrl = settings.baseUrl
  settingsStore.apiKey = settings.apiKey
  settingsStore.defaultModel = settings.defaultModel
  settingsStore.saveSettings()
  alert('设置已保存')
}

const testConnection = async () => {
  testing.value = true
  try {
    const response = await fetch(`${settings.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
      },
    })
    if (response.ok) {
      alert('连接成功')
    } else {
      alert('连接失败: ' + response.statusText)
    }
  } catch (error: any) {
    alert('连接失败: ' + error.message)
  } finally {
    testing.value = false
  }
}

const saveChatSettings = () => {
  localStorage.setItem('mimo-chat-settings', JSON.stringify(chatSettings))
  alert('对话设置已保存')
}

const saveAppearance = () => {
  localStorage.setItem('mimo-appearance', JSON.stringify(appearance))
  alert('外观设置已保存')
}

const exportData = () => {
  const data = {
    settings: {
      baseUrl: settings.baseUrl,
      defaultModel: settings.defaultModel,
    },
    chatSettings,
    appearance,
    exportTime: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `mimo-workstation-backup-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const importData = ({ file }: any) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      if (data.settings) {
        settings.baseUrl = data.settings.baseUrl || settings.baseUrl
        settings.defaultModel = data.settings.defaultModel || settings.defaultModel
      }
      if (data.chatSettings) {
        Object.assign(chatSettings, data.chatSettings)
      }
      if (data.appearance) {
        Object.assign(appearance, data.appearance)
      }
      alert('数据导入成功')
    } catch (error) {
      alert('数据格式错误')
    }
  }
  reader.readAsText(file.file)
}

const resetStats = () => {
  if (confirm('确定要重置使用统计吗？')) {
    localStorage.removeItem('mimo-stats')
    stats.totalSessions = 0
    stats.totalMessages = 0
    stats.totalTokens = 0
    stats.ttsCalls = 0
    stats.asrCalls = 0
    alert('统计已重置')
  }
}

const clearData = () => {
  if (confirm('确定要清除所有本地数据吗？此操作不可恢复。')) {
    localStorage.clear()
    alert('数据已清除')
  }
}

const loadSettings = () => {
  // 加载对话设置
  const savedChatSettings = localStorage.getItem('mimo-chat-settings')
  if (savedChatSettings) {
    Object.assign(chatSettings, JSON.parse(savedChatSettings))
  }

  // 加载外观设置
  const savedAppearance = localStorage.getItem('mimo-appearance')
  if (savedAppearance) {
    Object.assign(appearance, JSON.parse(savedAppearance))
  }

  // 加载统计数据
  const savedStats = localStorage.getItem('mimo-stats')
  if (savedStats) {
    Object.assign(stats, JSON.parse(savedStats))
  }

  // 加载系统提示词
  const savedPrompt = localStorage.getItem('mimo-system-prompt')
  if (savedPrompt) {
    chatSettings.systemPrompt = savedPrompt
  }
}

onMounted(() => {
  loadSettings()
})
</script>
