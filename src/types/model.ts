export interface Model {
  id: string
  name: string
  type: 'chat' | 'tts' | 'asr'
  description: string
  version: string
  capabilities: string[]
  maxTokens?: number
  pricing?: {
    input: number
    output: number
  }
}

export interface ModelConfig {
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
}

export interface TTSModelConfig {
  voice: string
  speed: number
  pitch: number
  volume: number
}

export interface ASRModelConfig {
  language: string
  format: string
  sampleRate: number
}
