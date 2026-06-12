import client from './client'
import { useSettingsStore } from '@/stores/settings'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatCompletion {
  id: string
  choices: Array<{
    message: ChatMessage
    finish_reason: string
  }>
}

// 非流式调用
export const createChatCompletion = (messages: ChatMessage[], model = 'mimo-v2.5') => {
  return client.post<ChatCompletion>('/chat/completions', {
    model,
    messages,
  })
}

// 流式调用
export const createChatCompletionStream = async (
  messages: ChatMessage[],
  model: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: Error) => void
) => {
  const settings = useSettingsStore()

  try {
    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        try {
          const data = JSON.parse(trimmed.slice(6))
          const content = data.choices?.[0]?.delta?.content
          if (content) {
            onChunk(content)
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    onDone()
  } catch (error: any) {
    onError(error)
  }
}
