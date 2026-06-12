<template>
  <div class="chat-view">
    <!-- 会话列表 -->
    <div class="session-sidebar">
      <div class="session-header">
        <button class="new-chat-btn" @click="createSession">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新建对话
        </button>
      </div>

      <div class="session-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-item"
          :class="{ active: session.id === activeSessionId }"
          @click="selectSession(session.id)"
        >
          <div class="session-content">
            <span class="session-title">{{ session.title }}</span>
            <span class="session-meta">{{ session.messages.length }} 条消息</span>
          </div>
          <button class="session-delete" @click.stop="deleteSession(session.id)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 对话区域 -->
    <div class="chat-main">
      <!-- 模型选择 -->
      <div class="model-selector">
        <span class="model-label">模型</span>
        <button class="model-trigger" @click="showModelSelect = !showModelSelect">
          <span class="model-name">{{ currentModelName }}</span>
          <svg class="model-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <div v-if="showModelSelect" class="model-dropdown">
          <div class="model-list">
            <div
              v-for="model in chatModels"
              :key="model.id"
              class="model-item"
              :class="{ active: model.id === selectedModelId }"
              @click="selectModel(model.id)"
            >
              <span class="model-item-name">{{ model.name }}</span>
              <svg v-if="model.id === selectedModelId" class="model-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="messages-container" ref="messagesContainer">
        <div v-if="messages.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>开始新的对话</p>
          <span>选择一个模型，输入消息开始</span>
        </div>

        <div v-for="msg in messages" :key="msg.id" class="message" :class="msg.role">
          <div class="message-avatar">
            <svg v-if="msg.role === 'user'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="message-body">
            <div class="message-header">
              <span class="message-sender">{{ msg.role === 'user' ? '你' : 'MiMo' }}</span>
            </div>
            <div class="message-content">{{ msg.content }}</div>
            <div class="message-actions">
              <button class="action-btn" @click="copyMessage(msg.content)">复制</button>
            </div>
          </div>
        </div>

        <div v-if="loading" class="message assistant">
          <div class="message-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="message-body">
            <div class="message-content loading-message">
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <div class="input-wrapper">
          <textarea
            v-model="inputText"
            placeholder="输入消息..."
            rows="1"
            @keydown.enter.exact.prevent="sendMessage"
            @keydown.enter.shift.exact="newline"
            ref="inputRef"
          ></textarea>
          <button class="send-btn" @click="sendMessage" :disabled="!inputText.trim() || loading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div class="input-hint">
          Enter 发送，Shift+Enter 换行
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useModelStore } from '@/stores/model'
import { createChatCompletion, type ChatMessage } from '@/api/chat'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Session {
  id: number
  title: string
  messages: Message[]
}

const modelStore = useModelStore()

const sessions = ref<Session[]>([
  { id: 1, title: '新对话', messages: [] },
])
const activeSessionId = ref(1)
const messages = ref<Message[]>([])
const inputText = ref('')
const loading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const showModelSelect = ref(false)
const selectedModelId = ref('mimo-v2.5')
let msgId = 0

const chatModels = computed(() => modelStore.models.filter(m => m.type === 'chat'))
const currentModelName = computed(() => {
  const model = chatModels.value.find(m => m.id === selectedModelId.value)
  return model?.name || '选择模型'
})

const createSession = () => {
  const id = Date.now()
  sessions.value.unshift({ id, title: '新对话', messages: [] })
  selectSession(id)
}

const selectSession = (id: number) => {
  const currentSession = sessions.value.find(s => s.id === activeSessionId.value)
  if (currentSession) {
    currentSession.messages = [...messages.value]
  }
  activeSessionId.value = id
  const newSession = sessions.value.find(s => s.id === id)
  messages.value = newSession?.messages || []
  scrollToBottom()
}

const deleteSession = (id: number) => {
  if (sessions.value.length <= 1) return
  sessions.value = sessions.value.filter(s => s.id !== id)
  if (activeSessionId.value === id && sessions.value.length > 0) {
    selectSession(sessions.value[0]!.id)
  }
}

const selectModel = (id: string) => {
  selectedModelId.value = id
  showModelSelect.value = false
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const newline = () => {
  inputText.value += '\n'
}

const sendMessage = async () => {
  if (!inputText.value.trim() || loading.value) return

  const userMessage: Message = {
    id: ++msgId,
    role: 'user',
    content: inputText.value,
    timestamp: new Date(),
  }

  messages.value.push(userMessage)
  const userMsg = inputText.value
  inputText.value = ''
  loading.value = true
  scrollToBottom()

  const session = sessions.value.find(s => s.id === activeSessionId.value)
  if (session && session.title === '新对话') {
    session.title = userMsg.substring(0, 20) + (userMsg.length > 20 ? '...' : '')
  }

  try {
    const chatMessages: ChatMessage[] = messages.value.map(m => ({
      role: m.role,
      content: m.content,
    }))

    const response = await createChatCompletion(chatMessages, selectedModelId.value)
    const data = response as any

    const assistantMessage: Message = {
      id: ++msgId,
      role: 'assistant',
      content: data.choices?.[0]?.message?.content || '抱歉，我没有收到回复。',
      timestamp: new Date(),
    }

    messages.value.push(assistantMessage)
  } catch (error: any) {
    const errorMessage: Message = {
      id: ++msgId,
      role: 'assistant',
      content: `错误: ${error.message || '请求失败，请检查 API 配置。'}`,
      timestamp: new Date(),
    }
    messages.value.push(errorMessage)
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

const copyMessage = (content: string) => {
  navigator.clipboard.writeText(content)
}
</script>

<style lang="scss" scoped>
@import '@/styles/hermes-vars.scss';

.chat-view {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

// 会话列表
.session-sidebar {
  width: 260px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.session-header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
}

.new-chat-btn {
  width: 100%;
  padding: 10px 12px;
  background: var(--accent-primary);
  color: var(--text-on-accent);
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all .15s;

  &:hover {
    background: var(--accent-hover);
  }
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;
  margin-bottom: 2px;

  &:hover {
    background: rgba(var(--accent-primary-rgb), .06);

    .session-delete {
      opacity: 1;
    }
  }

  &.active {
    background: rgba(var(--accent-primary-rgb), .12);
  }
}

.session-content {
  flex: 1;
  min-width: 0;
}

.session-title {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.session-delete {
  opacity: 0;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all .15s;

  &:hover {
    color: var(--error);
    background: rgba(var(--error-rgb), .1);
  }
}

// 对话区域
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 模型选择
.model-selector {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  position: relative;
}

.model-label {
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  display: block;
}

.model-trigger {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  width: 100%;
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 6px;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 13px;
  transition: border-color .15s;
  display: flex;

  &:hover {
    border-color: var(--accent-muted);
  }
}

.model-name {
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  flex: 1;
  overflow: hidden;
}

.model-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
}

.model-dropdown {
  position: absolute;
  top: 100%;
  left: 16px;
  right: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  margin-top: 4px;
}

.model-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;

  &:hover {
    background: rgba(var(--accent-primary-rgb), .06);
  }

  &.active {
    color: var(--accent-primary);
  }
}

.model-item-name {
  font-size: 13px;
}

.model-check {
  color: var(--accent-primary);
  flex-shrink: 0;
}

// 消息列表
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);

  svg {
    opacity: .5;
    margin-bottom: 16px;
  }

  p {
    font-size: 16px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  span {
    font-size: 13px;
  }
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  max-width: 80%;

  &.user {
    margin-left: auto;
    flex-direction: row-reverse;

    .message-body {
      align-items: flex-end;
    }

    .message-content {
      background: var(--msg-user-bg);
    }
  }

  &.assistant {
    margin-right: auto;
  }
}

.message-avatar {
  width: 32px;
  height: 32px;
  background: var(--bg-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.message-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-sender {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.message-content {
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--msg-assistant-bg);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.loading-message {
  display: flex;
  gap: 4px;
  padding: 14px;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: var(--text-muted);
  border-radius: 50%;
  animation: loading 1.4s infinite both;

  &:nth-child(2) {
    animation-delay: .2s;
  }

  &:nth-child(3) {
    animation-delay: .4s;
  }
}

@keyframes loading {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: .5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.message-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity .15s;

  .message:hover & {
    opacity: 1;
  }
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  transition: all .15s;

  &:hover {
    color: var(--text-primary);
    background: rgba(var(--accent-primary-rgb), .06);
  }
}

// 输入区域
.input-area {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 12px;
  transition: border-color .15s;

  &:focus-within {
    border-color: var(--accent-muted);
  }

  textarea {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    resize: none;
    min-height: 24px;
    max-height: 120px;
    line-height: 1.5;

    &::placeholder {
      color: var(--text-muted);
    }
  }
}

.send-btn {
  width: 36px;
  height: 36px;
  background: var(--accent-primary);
  color: var(--text-on-accent);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all .15s;

  &:hover {
    background: var(--accent-hover);
  }

  &:disabled {
    opacity: .4;
    cursor: not-allowed;
  }
}

.input-hint {
  text-align: center;
  color: var(--text-muted);
  font-size: 11px;
  margin-top: 8px;
}
</style>
