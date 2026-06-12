import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createChatCompletion, type ChatMessage } from '@/api/chat'
import { useSettingsStore } from './settings'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)

  const sendMessage = async (content: string) => {
    const settings = useSettingsStore()
    messages.value.push({ role: 'user', content })
    loading.value = true

    try {
      const response = await createChatCompletion(messages.value, settings.defaultModel)
      const reply = response.data.choices[0]?.message?.content || '无回复'
      messages.value.push({ role: 'assistant', content: reply })
    } catch (error) {
      messages.value.push({ role: 'assistant', content: `错误: ${error}` })
    } finally {
      loading.value = false
    }
  }

  const clearMessages = () => {
    messages.value = []
  }

  return { messages, loading, sendMessage, clearMessages }
})
