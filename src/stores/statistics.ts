import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UsageRecord {
  id: number
  type: 'chat' | 'tts' | 'asr'
  model: string
  tokens: number
  timestamp: Date
  duration?: number
}

export interface DailyUsage {
  date: string
  chat: number
  tts: number
  asr: number
  tokens: number
}

const STORAGE_KEY = 'mimo-statistics'

export const useStatisticsStore = defineStore('statistics', () => {
  const records = ref<UsageRecord[]>([])

  // 从 localStorage 加载
  const load = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        records.value = data.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        }))
      } catch { /* ignore */ }
    }
  }

  // 保存到 localStorage
  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value))
  }

  // 添加记录
  const addRecord = (record: Omit<UsageRecord, 'id' | 'timestamp'>) => {
    records.value.push({
      ...record,
      id: Date.now(),
      timestamp: new Date(),
    })
    save()
  }

  // 统计汇总
  const stats = computed(() => {
    const chatRecords = records.value.filter(r => r.type === 'chat')
    const ttsRecords = records.value.filter(r => r.type === 'tts')
    const asrRecords = records.value.filter(r => r.type === 'asr')
    const totalTokens = records.value.reduce((sum, r) => sum + r.tokens, 0)

    return {
      totalSessions: chatRecords.length,
      totalTokens,
      estimatedCost: totalTokens * 0.00002, // 粗略估算
      ttsCalls: ttsRecords.length,
      asrCalls: asrRecords.length,
      totalRecords: records.value.length,
    }
  })

  // 模型使用分布
  const modelUsage = computed(() => {
    const counts: Record<string, number> = {}
    records.value.forEach(r => {
      counts[r.model] = (counts[r.model] || 0) + 1
    })
    const total = records.value.length || 1
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  })

  // 每日使用趋势（最近7天）
  const dailyUsage = computed((): DailyUsage[] => {
    const days: DailyUsage[] = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
      const dayRecords = records.value.filter(r => {
        const rd = r.timestamp
        return rd.getFullYear() === d.getFullYear()
          && rd.getMonth() === d.getMonth()
          && rd.getDate() === d.getDate()
      })
      days.push({
        date: dateStr,
        chat: dayRecords.filter(r => r.type === 'chat').length,
        tts: dayRecords.filter(r => r.type === 'tts').length,
        asr: dayRecords.filter(r => r.type === 'asr').length,
        tokens: dayRecords.reduce((sum, r) => sum + r.tokens, 0),
      })
    }
    return days
  })

  // 最近活动
  const recentActivities = computed(() => {
    return [...records.value]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
      .map(r => {
        const typeLabel = r.type === 'chat' ? '对话' : r.type === 'tts' ? '语音合成' : '语音识别'
        return {
          title: typeLabel,
          description: `使用 ${r.model}，消耗 ${r.tokens} tokens`,
          time: formatTime(r.timestamp),
        }
      })
  })

  // 重置
  const resetStats = () => {
    records.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  return { records, stats, modelUsage, dailyUsage, recentActivities, addRecord, resetStats, load }
})

function formatTime(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString('zh-CN')
}
