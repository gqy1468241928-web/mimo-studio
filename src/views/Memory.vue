<template>
  <div class="memory-view">
    <div class="page-header">
      <h2 class="header-title">记忆</h2>
      <div class="header-actions">
        <button class="btn-add" @click="showAddModal = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          添加记忆
        </button>
        <button class="btn-clear" @click="clearAll">清除全部</button>
      </div>
    </div>

    <div class="memory-content">
      <!-- 分类标签 -->
      <div class="category-tabs">
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="cat-tab"
          :class="{ active: activeCategory === cat.key }"
          @click="activeCategory = cat.key"
        >
          {{ cat.label }}
          <span class="cat-count">{{ getCategoryCount(cat.key) }}</span>
        </button>
      </div>

      <!-- 记忆列表 -->
      <div class="memory-list">
        <div v-for="memory in filteredMemories" :key="memory.id" class="memory-card">
          <div class="memory-header">
            <span class="memory-category">{{ getCategoryLabel(memory.category) }}</span>
            <span class="memory-time">{{ formatTime(memory.createdAt) }}</span>
          </div>
          <div class="memory-content-text">{{ memory.content }}</div>
          <div class="memory-source" v-if="memory.source">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            {{ memory.source }}
          </div>
          <div class="memory-actions">
            <button class="btn-edit" @click="editMemory(memory)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-delete" @click="deleteMemory(memory.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredMemories.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
        <p>暂无记忆</p>
        <span>添加记忆让 AI 更了解你的偏好</span>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div v-if="showAddModal || editingMemory" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingMemory ? '编辑记忆' : '添加记忆' }}</h3>
          <button class="modal-close" @click="closeModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>分类</label>
            <select v-model="formData.category" class="form-select">
              <option v-for="cat in categories.filter(c => c.key !== 'all')" :key="cat.key" :value="cat.key">
                {{ cat.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>内容</label>
            <textarea v-model="formData.content" class="form-textarea" rows="4" placeholder="输入记忆内容..."></textarea>
          </div>
          <div class="form-group">
            <label>来源（可选）</label>
            <input v-model="formData.source" class="form-input" placeholder="例如：用户偏好、对话记录" />
          </div>
          <button class="btn-save" @click="saveMemory">
            {{ editingMemory ? '保存修改' : '添加记忆' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Memory {
  id: number
  category: string
  content: string
  source?: string
  createdAt: Date
}

const activeCategory = ref('all')
const showAddModal = ref(false)
const editingMemory = ref<Memory | null>(null)

const formData = ref({
  category: 'preference',
  content: '',
  source: '',
})

const categories = [
  { key: 'all', label: '全部' },
  { key: 'preference', label: '偏好' },
  { key: 'context', label: '上下文' },
  { key: 'fact', label: '事实' },
  { key: 'instruction', label: '指令' },
  { key: 'history', label: '历史' },
]

const memories = ref<Memory[]>([
  {
    id: 1,
    category: 'preference',
    content: '用户偏好简洁直接的回复，不喜欢冗长的解释',
    source: '对话分析',
    createdAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    id: 2,
    category: 'context',
    content: '用户正在开发 MiMo 工作台项目，使用 Vue 3 + TypeScript',
    source: '项目上下文',
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: 3,
    category: 'fact',
    content: '用户的 API 地址：https://token-plan-cn.xiaomimimo.com/v1',
    source: '设置配置',
    createdAt: new Date(Date.now() - 3600000 * 5),
  },
  {
    id: 4,
    category: 'instruction',
    content: '每次阶段完成后默认通过微信发送汇报',
    source: '用户指令',
    createdAt: new Date(Date.now() - 3600000 * 2),
  },
])

const filteredMemories = computed(() => {
  if (activeCategory.value === 'all') return memories.value
  return memories.value.filter(m => m.category === activeCategory.value)
})

const getCategoryCount = (key: string) => {
  if (key === 'all') return memories.value.length
  return memories.value.filter(m => m.category === key).length
}

const getCategoryLabel = (key: string) => {
  return categories.find(c => c.key === key)?.label || key
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

const editMemory = (memory: Memory) => {
  editingMemory.value = memory
  formData.value = {
    category: memory.category,
    content: memory.content,
    source: memory.source || '',
  }
}

const deleteMemory = (id: number) => {
  memories.value = memories.value.filter(m => m.id !== id)
}

const clearAll = () => {
  if (confirm('确定要清除所有记忆吗？')) {
    memories.value = []
  }
}

const saveMemory = () => {
  if (!formData.value.content.trim()) return

  if (editingMemory.value) {
    const index = memories.value.findIndex(m => m.id === editingMemory.value!.id)
    if (index !== -1) {
      const existing = memories.value[index]!
      memories.value[index] = {
        id: existing.id,
        category: formData.value.category,
        content: formData.value.content,
        source: formData.value.source || undefined,
        createdAt: existing.createdAt,
      }
    }
  } else {
    memories.value.unshift({
      id: Date.now(),
      category: formData.value.category,
      content: formData.value.content,
      source: formData.value.source || undefined,
      createdAt: new Date(),
    })
  }

  closeModal()
}

const closeModal = () => {
  showAddModal.value = false
  editingMemory.value = null
  formData.value = { category: 'preference', content: '', source: '' }
}
</script>

<style lang="scss" scoped>
@import '@/styles/hermes-vars.scss';

.memory-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  justify-content: space-between;
  align-items: center;
  padding: 21px 20px;
  display: flex;
}

.header-title {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--accent-primary);
  color: var(--text-on-accent);
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: var(--accent-hover);
  }
}

.btn-clear {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: var(--error);
    color: var(--error);
  }
}

.memory-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.cat-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all .15s;

  &:hover {
    border-color: var(--accent-muted);
    color: var(--text-primary);
  }

  &.active {
    background: rgba(var(--accent-primary-rgb), .12);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }
}

.cat-count {
  font-size: 11px;
  color: var(--text-muted);
}

.memory-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.memory-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  transition: all .15s;

  &:hover {
    border-color: var(--accent-muted);

    .memory-actions {
      opacity: 1;
    }
  }
}

.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.memory-category {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(var(--accent-primary-rgb), .1);
  color: var(--accent-primary);
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: .5px;
}

.memory-time {
  font-size: 11px;
  color: var(--text-muted);
}

.memory-content-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.memory-source {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.memory-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity .15s;
}

.btn-edit, .btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--text-muted);
}

.btn-edit:hover {
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), .06);
}

.btn-delete:hover {
  color: var(--error);
  background: rgba(var(--error-rgb), .06);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: var(--text-muted);

  svg {
    opacity: .5;
  }

  p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  span {
    font-size: 12px;
  }
}

// 弹窗
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, .5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 480px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: var(--text-primary);
  }
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.form-select, .form-input, .form-textarea {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: var(--accent-muted);
  }
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.btn-save {
  width: 100%;
  padding: 10px 16px;
  background: var(--accent-primary);
  color: var(--text-on-accent);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;

  &:hover {
    background: var(--accent-hover);
  }
}
</style>
