import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 60000, // 增加超时时间到60秒
})

client.interceptors.request.use((config) => {
  const settings = localStorage.getItem('mimo-settings')
  if (settings) {
    const { apiKey, baseUrl } = JSON.parse(settings)
    if (apiKey) {
      config.headers.Authorization = `Bearer ${apiKey}`
    }
    if (baseUrl) {
      config.baseURL = baseUrl
    }
  }
  return config
})

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export default client

// 流式请求专用函数
export async function* streamRequest(url: string, data: any, apiKey: string, baseUrl: string) {
  const response = await fetch(`${baseUrl}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...data, stream: true }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HTTP ${response.status}: ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取流')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            yield content
          }
        } catch (e) {
          // 跳过无法解析的行
        }
      }
    }
  }
}
