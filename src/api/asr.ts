import { useSettingsStore } from '@/stores/settings'

export interface ASRRequest {
  model?: string
  audio: File | Blob
  language?: string
}

export interface ASRResponse {
  text: string
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
}

// 语音识别
export const transcribe = async (request: ASRRequest): Promise<ASRResponse> => {
  const settings = useSettingsStore()
  const formData = new FormData()
  formData.append('model', request.model || 'mimo-v2.5-asr')
  formData.append('file', request.audio)
  if (request.language) {
    formData.append('language', request.language)
  }

  const response = await fetch(`${settings.baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`语音识别失败: ${error}`)
  }

  return response.json()
}

// 实时语音识别（流式）
export async function* streamTranscribe(
  audioStream: ReadableStream,
  model = 'mimo-v2.5-asr'
): AsyncGenerator<string> {
  const settings = useSettingsStore()

  // 将音频流转换为FormData
  const chunks: Blob[] = []
  const reader = audioStream.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(new Blob([value]))
  }

  const audioBlob = new Blob(chunks, { type: 'audio/webm' })
  const formData = new FormData()
  formData.append('model', model)
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('stream', 'true')

  const response = await fetch(`${settings.baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`实时语音识别失败: ${error}`)
  }

  const result = await response.json()
  yield result.text
}

// 录音工具类
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private stream: MediaStream | null = null

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.mediaRecorder = new MediaRecorder(this.stream)
    this.chunks = []

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data)
      }
    }

    this.mediaRecorder.start()
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob())
        return
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' })
        this.chunks = []
        this.stream?.getTracks().forEach(track => track.stop())
        resolve(blob)
      }

      this.mediaRecorder.stop()
    })
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }
}
