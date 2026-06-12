import { useSettingsStore } from '@/stores/settings'

export interface TTSRequest {
  model: string
  input: string
  voice?: string
  speed?: number
  pitch?: number
  volume?: number
}

export interface TTSResponse {
  audio: string // base64 encoded audio
  format: string // wav, mp3, etc.
}

// MiMo TTS 合成（使用 /chat/completions 端点）
export const synthesize = async (request: TTSRequest): Promise<TTSResponse> => {
  const settings = useSettingsStore()

  // MiMo TTS 使用 /chat/completions 端点
  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      messages: [
        { role: 'user', content: '请朗读以下文本' },
        { role: 'assistant', content: request.input }
      ],
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`TTS合成失败: ${error}`)
  }

  const data = await response.json()
  const audioData = data.choices?.[0]?.message?.audio?.data

  if (!audioData) {
    throw new Error('未收到音频数据')
  }

  return {
    audio: audioData,
    format: 'wav',
  }
}

// Voice Clone - 使用自定义音色
export const voiceClone = async (
  text: string,
  referenceAudioBase64: string,
  model = 'mimo-v2.5-tts-voiceclone'
): Promise<TTSResponse> => {
  const settings = useSettingsStore()

  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'user', content: '请使用参考音色朗读以下文本' },
        { role: 'assistant', content: text }
      ],
      audio: {
        reference_audio: referenceAudioBase64,
      },
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Voice Clone失败: ${error}`)
  }

  const data = await response.json()
  const audioData = data.choices?.[0]?.message?.audio?.data

  if (!audioData) {
    throw new Error('未收到音频数据')
  }

  return {
    audio: audioData,
    format: 'wav',
  }
}

// Voice Design - 自定义音色设计
export const voiceDesign = async (
  text: string,
  description: string,
  model = 'mimo-v2.5-tts-voicedesign'
): Promise<TTSResponse> => {
  const settings = useSettingsStore()

  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'user', content: `请使用以下音色描述朗读文本: ${description}` },
        { role: 'assistant', content: text }
      ],
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Voice Design失败: ${error}`)
  }

  const data = await response.json()
  const audioData = data.choices?.[0]?.message?.audio?.data

  if (!audioData) {
    throw new Error('未收到音频数据')
  }

  return {
    audio: audioData,
    format: 'wav',
  }
}

// 将 base64 转换为音频 Blob
export const base64ToBlob = (base64: string, format = 'wav'): Blob => {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: `audio/${format}` })
}

// 创建音频 URL
export const createAudioUrl = (base64: string, format = 'wav'): string => {
  const blob = base64ToBlob(base64, format)
  return URL.createObjectURL(blob)
}

// 下载音频文件
export const downloadAudio = (base64: string, filename: string, format = 'wav') => {
  const blob = base64ToBlob(base64, format)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}
