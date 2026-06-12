import client from './client'

export interface Model {
  id: string
  name: string
  type: 'chat' | 'tts' | 'asr'
  description: string
}

export const getModels = () => {
  return client.get<Model[]>('/models')
}

export const getModel = (id: string) => {
  return client.get<Model>(`/models/${id}`)
}
