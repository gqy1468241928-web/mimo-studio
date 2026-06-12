import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const baseUrl = ref('https://token-plan-cn.xiaomimimo.com/v1')
  const apiKey = ref('')
  const defaultModel = ref('mimo-v2.5')
  const darkMode = ref(true)
  const language = ref('zh-CN')

  const loadSettings = () => {
    const saved = localStorage.getItem('mimo-settings')
    if (saved) {
      const data = JSON.parse(saved)
      baseUrl.value = data.baseUrl || baseUrl.value
      apiKey.value = data.apiKey || ''
      defaultModel.value = data.defaultModel || defaultModel.value
      darkMode.value = data.darkMode ?? true
      language.value = data.language || 'zh-CN'
    }
  }

  const saveSettings = () => {
    localStorage.setItem('mimo-settings', JSON.stringify({
      baseUrl: baseUrl.value,
      apiKey: apiKey.value,
      defaultModel: defaultModel.value,
      darkMode: darkMode.value,
      language: language.value,
    }))
  }

  return { baseUrl, apiKey, defaultModel, darkMode, language, loadSettings, saveSettings }
})
