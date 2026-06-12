<template>
  <div class="chat-container">
    <n-layout has-sider style="height: calc(100vh - 120px)">
      <!-- 会话列表 -->
      <n-layout-sider bordered :width="260" :native-scrollbar="false">
        <div style="padding: 12px">
          <n-button type="primary" block @click="createSession">
            <template #icon>
              <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></n-icon>
            </template>
            新建对话
          </n-button>
        </div>

        <div style="padding: 0 12px 12px">
          <n-input v-model:value="sessionSearch" placeholder="搜索会话..." clearable size="small" />
        </div>

        <n-scrollbar style="height: calc(100vh - 260px)">
          <div
            v-for="session in filteredSessions"
            :key="session.id"
            class="session-item"
            :class="{ active: session.id === activeSessionId }"
            @click="selectSession(session.id)"
          >
            <div class="session-content">
              <div class="session-title">{{ session.title }}</div>
              <div class="session-meta">
                <n-text depth="3" style="font-size: 11px">{{ session.messages.length }} 条消息</n-text>
                <n-text depth="3" style="font-size: 11px">{{ formatTime(session.updatedAt) }}</n-text>
              </div>
            </div>
            <div class="session-actions">
              <n-button text size="small" @click.stop="renameSession(session)">
                <n-icon size="14"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></n-icon>
              </n-button>
              <n-button text size="small" type="error" @click.stop="deleteSession(session.id)">
                <n-icon size="14"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></n-icon>
              </n-button>
            </div>
          </div>
        </n-scrollbar>
      </n-layout-sider>

      <!-- 对话区域 -->
      <n-layout-content content-style="display: flex; flex-direction: column; height: 100%;">
        <!-- 顶部工具栏 -->
        <div class="toolbar">
          <n-space align="center">
            <n-select
              v-model:value="selectedModelId"
              :options="modelOptions"
              style="width: 180px"
              size="small"
              placeholder="选择模型"
            />
            <n-tag v-if="currentModel" size="small" :type="getTagType(currentModel.type)">
              {{ currentModel.name }}
            </n-tag>
            <n-switch v-model:value="useStream" size="small">
              <template #checked>流式</template>
              <template #unchecked>标准</template>
            </n-switch>
          </n-space>
          <n-space>
            <n-button size="small" @click="stopGeneration" v-if="isGenerating">
              停止生成
            </n-button>
            <n-button size="small" @click="exportChat">
              导出
            </n-button>
            <n-button size="small" @click="clearMessages" :disabled="messages.length === 0">
              清空
            </n-button>
          </n-space>
        </div>

        <!-- 消息列表 -->
        <div class="messages" ref="messagesContainer">
          <div v-if="messages.length === 0" class="empty-state">
            <n-icon size="48" depth="3"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></n-icon>
            <n-text depth="3" style="margin-top: 12px">开始新的对话</n-text>
            <n-text depth="3" style="font-size: 12px">选择一个模型，输入消息开始</n-text>
          </div>

          <div v-for="msg in messages" :key="msg.id" :class="['message', msg.role]">
            <div class="message-avatar">
              <n-avatar v-if="msg.role === 'user'" :size="32" round>U</n-avatar>
              <n-avatar v-else :size="32" round :style="{ backgroundColor: '#18a058' }">M</n-avatar>
            </div>
            <div class="message-body">
              <div class="message-header">
                <n-text strong>{{ msg.role === 'user' ? '你' : 'MiMo' }}</n-text>
                <n-text depth="3" style="font-size: 11px">{{ formatTime(msg.timestamp) }}</n-text>
              </div>
              <div class="message-content" :class="{ 'streaming': msg.isStreaming }">
                {{ msg.content }}<span v-if="msg.isStreaming" class="cursor">|</span>
              </div>
              <!-- 文件附件 -->
              <div v-if="msg.files && msg.files.length > 0" class="message-files">
                <div v-for="file in msg.files" :key="file.name" class="file-item">
                  <n-icon size="16"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></n-icon>
                  <span>{{ file.name }}</span>
                  <n-text depth="3" style="font-size: 11px">({{ formatFileSize(file.size) }})</n-text>
                </div>
              </div>
              <div class="message-actions">
                <n-button text size="tiny" @click="copyMessage(msg.content)">复制</n-button>
                <n-text v-if="msg.tokens" depth="3" style="font-size: 11px; margin-left: 8px">
                  {{ msg.tokens }} tokens
                </n-text>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <!-- 文件预览 -->
          <div v-if="uploadedFiles.length > 0" class="uploaded-files">
            <div v-for="(file, index) in uploadedFiles" :key="index" class="file-preview">
              <n-icon size="16"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></n-icon>
              <span>{{ file.name }}</span>
              <n-button text size="tiny" @click="removeFile(index)">
                <n-icon size="14"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></n-icon>
              </n-button>
            </div>
          </div>

          <div class="input-toolbar">
            <n-upload
              :show-file-list="false"
              :custom-request="handleFileUpload"
              accept=".txt,.md,.json,.csv,.py,.js,.ts,.html,.css"
              multiple
            >
              <n-button text size="small">
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></n-icon>
              </n-button>
            </n-upload>
            <n-text depth="3" style="font-size: 11px">
              {{ useStream ? '流式模式' : '标准模式' }} · Ctrl+Enter 发送
            </n-text>
          </div>
          <n-input
            v-model:value="inputText"
            type="textarea"
            placeholder="输入消息..."
            :rows="3"
            :disabled="isGenerating"
            @keydown.enter.ctrl="sendMessage"
            :autosize="{ minRows: 2, maxRows: 6 }"
          />
          <n-button
            type="primary"
            block
            @click="sendMessage"
            :loading="isGenerating"
            :disabled="!inputText.trim() && uploadedFiles.length === 0"
            style="margin-top: 8px"
          >
            {{ isGenerating ? '生成中...' : '发送' }}
          </n-button>
        </div>
      </n-layout-content>
    </n-layout>

    <!-- 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名会话">
      <n-input v-model:value="newSessionTitle" placeholder="输入新名称" @keydown.enter="confirmRename" />
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  NLayout, NLayoutSider, NLayoutContent, NButton, NInput, NSpace, NSelect,
  NTag, NText, NIcon, NAvatar, NScrollbar, NModal, NSwitch, NUpload
} from 'naive-ui'
import { useModelStore } from '@/stores/model'
import { useStatisticsStore } from '@/stores/statistics'
import { createChatCompletion, createChatCompletionStream, type ChatMessage } from '@/api/chat'

interface FileAttachment {
  name: string
  size: number
  type: string
  content: string
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  tokens?: number
  files?: FileAttachment[]
}

interface Session {
  id: number
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

const modelStore = useModelStore()
const statisticsStore = useStatisticsStore()
const route = useRoute()

const sessions = ref<Session[]>([
  { id: 1, title: '新对话', messages: [], createdAt: new Date(), updatedAt: new Date() },
])
const activeSessionId = ref(1)
const messages = ref<Message[]>([])
const inputText = ref('')
const isGenerating = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const sessionSearch = ref('')
const showRenameModal = ref(false)
const newSessionTitle = ref('')
const renamingSession = ref<Session | null>(null)
const useStream = ref(true)
const uploadedFiles = ref<FileAttachment[]>([])
let msgId = 0

const selectedModelId = ref('mimo-v2.5')

const modelOptions = computed(() =>
  modelStore.models
    .filter(m => m.type === 'chat')
    .map(m => ({ label: m.name, value: m.id }))
)

const currentModel = computed(() =>
  modelStore.models.find(m => m.id === selectedModelId.value)
)

const filteredSessions = computed(() => {
  if (!sessionSearch.value) return sessions.value
  const query = sessionSearch.value.toLowerCase()
  return sessions.value.filter(s => s.title.toLowerCase().includes(query))
})

const getTagType = (type: string) => {
  switch (type) {
    case 'chat': return 'success'
    case 'tts': return 'info'
    case 'asr': return 'warning'
    default: return 'default'
  }
}

const createSession = () => {
  const id = Date.now()
  const newSession: Session = {
    id,
    title: '新对话',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  sessions.value.unshift(newSession)
  selectSession(id)
}

const selectSession = (id: number) => {
  if (isGenerating.value) return
  const currentSession = sessions.value.find(s => s.id === activeSessionId.value)
  if (currentSession) {
    currentSession.messages = [...messages.value]
  }
  activeSessionId.value = id
  const newSession = sessions.value.find(s => s.id === id)
  messages.value = newSession?.messages || []
  scrollToBottom()
}

const renameSession = (session: Session) => {
  renamingSession.value = session
  newSessionTitle.value = session.title
  showRenameModal.value = true
}

const confirmRename = () => {
  if (renamingSession.value && newSessionTitle.value.trim()) {
    renamingSession.value.title = newSessionTitle.value.trim()
    showRenameModal.value = false
  }
}

const deleteSession = (id: number) => {
  if (sessions.value.length <= 1 || isGenerating.value) return
  sessions.value = sessions.value.filter(s => s.id !== id)
  if (activeSessionId.value === id) {
    const firstSession = sessions.value[0]
    if (firstSession) {
      selectSession(firstSession.id)
    }
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const handleFileUpload = ({ file }: any) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    uploadedFiles.value.push({
      name: file.name,
      size: file.size,
      type: file.type || 'text/plain',
      content: e.target?.result as string,
    })
  }
  reader.readAsText(file.file)
}

const removeFile = (index: number) => {
  uploadedFiles.value.splice(index, 1)
}

const sendMessage = async () => {
  if ((!inputText.value.trim() && uploadedFiles.value.length === 0) || isGenerating.value) return

  // 构建消息内容
  let messageContent = inputText.value
  const files = [...uploadedFiles.value]

  if (files.length > 0) {
    const fileContents = files.map(f => `[文件: ${f.name}]\n${f.content}`).join('\n\n')
    messageContent = messageContent
      ? `${messageContent}\n\n${fileContents}`
      : fileContents
  }

  const userMessage: Message = {
    id: ++msgId,
    role: 'user',
    content: messageContent,
    timestamp: new Date(),
    files: files.length > 0 ? files : undefined,
  }

  messages.value.push(userMessage)
  inputText.value = ''
  uploadedFiles.value = []

  const session = sessions.value.find(s => s.id === activeSessionId.value)
  if (session) {
    if (session.title === '新对话') {
      const titleText = inputText.value || files[0]?.name || '新对话'
      session.title = titleText.substring(0, 20) + (titleText.length > 20 ? '...' : '')
    }
    session.updatedAt = new Date()
  }

  if (useStream.value) {
    await sendStreamMessage()
  } else {
    await sendNormalMessage()
  }
}

const sendStreamMessage = async () => {
  isGenerating.value = true

  const assistantMessage: Message = {
    id: ++msgId,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    isStreaming: true,
  }
  messages.value.push(assistantMessage)

  const chatMessages: ChatMessage[] = messages.value
    .filter(m => !m.isStreaming)
    .map(m => ({ role: m.role, content: m.content }))

  scrollToBottom()

  await createChatCompletionStream(
    chatMessages,
    selectedModelId.value,
    (chunk) => {
      assistantMessage.content += chunk
      scrollToBottom()
    },
    () => {
      assistantMessage.isStreaming = false
      isGenerating.value = false
      const tokenEstimate = Math.ceil(assistantMessage.content.length / 2)
      statisticsStore.addRecord({ type: 'chat', model: selectedModelId.value, tokens: tokenEstimate })
      const session = sessions.value.find(s => s.id === activeSessionId.value)
      if (session) session.updatedAt = new Date()
    },
    (error) => {
      assistantMessage.content += `\n\n[错误: ${error.message}]`
      assistantMessage.isStreaming = false
      isGenerating.value = false
    }
  )
}

const sendNormalMessage = async () => {
  isGenerating.value = true

  const chatMessages: ChatMessage[] = messages.value.map(m => ({
    role: m.role,
    content: m.content,
  }))

  try {
    const response = await createChatCompletion(chatMessages, selectedModelId.value)

    const assistantMessage: Message = {
      id: ++msgId,
      role: 'assistant',
      content: response.data.choices[0]?.message?.content || '抱歉，我没有收到回复。',
      timestamp: new Date(),
    }

    messages.value.push(assistantMessage)

    const tokenEstimate = Math.ceil(assistantMessage.content.length / 2)
    statisticsStore.addRecord({ type: 'chat', model: selectedModelId.value, tokens: tokenEstimate })

    const session = sessions.value.find(s => s.id === activeSessionId.value)
    if (session) session.updatedAt = new Date()
  } catch (error: any) {
    const errorMessage: Message = {
      id: ++msgId,
      role: 'assistant',
      content: `错误: ${error.message || '请求失败，请检查 API 配置。'}`,
      timestamp: new Date(),
    }
    messages.value.push(errorMessage)
  } finally {
    isGenerating.value = false
    scrollToBottom()
  }
}

const stopGeneration = () => {
  isGenerating.value = false
  const lastMsg = messages.value[messages.value.length - 1]
  if (lastMsg?.isStreaming) {
    lastMsg.isStreaming = false
  }
}

const clearMessages = () => {
  messages.value = []
  const session = sessions.value.find(s => s.id === activeSessionId.value)
  if (session) session.messages = []
}

const copyMessage = (content: string) => {
  navigator.clipboard.writeText(content)
}

const exportChat = () => {
  const session = sessions.value.find(s => s.id === activeSessionId.value)
  if (!session) return

  const content = messages.value.map(m =>
    `[${m.role === 'user' ? '用户' : 'MiMo'}] ${formatTime(m.timestamp)}\n${m.content}`
  ).join('\n\n')

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${session.title}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  modelStore.selectModel(selectedModelId.value)
  handleRouteQuery()
})

// Handle file content from Files page
function handleRouteQuery() {
  const fileContent = route.query.fileContent as string
  const fileName = route.query.fileName as string
  if (fileContent) {
    inputText.value = `请帮我分析文件 "${fileName}" 的内容：\n\n${fileContent}`
  }
}

watch(() => route.query, () => {
  handleRouteQuery()
})
</script>

<style lang="scss" scoped>
.chat-container {
  .session-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: background-color 0.2s;

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
      .session-actions { opacity: 1; }
    }

    &.active {
      background-color: rgba(24, 160, 88, 0.15);
    }

    .session-content {
      flex: 1;
      min-width: 0;

      .session-title {
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .session-meta {
        display: flex;
        justify-content: space-between;
        margin-top: 4px;
      }
    }

    .session-actions {
      opacity: 0;
      transition: opacity 0.2s;
      display: flex;
      gap: 4px;
    }
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .message {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;

      &.user {
        flex-direction: row-reverse;
        .message-body { align-items: flex-end; }
        .message-content { background-color: rgba(24, 160, 88, 0.1); }
      }

      .message-body {
        display: flex;
        flex-direction: column;
        max-width: 70%;

        .message-header {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 4px;
        }

        .message-content {
          padding: 10px 14px;
          border-radius: 8px;
          background-color: rgba(255, 255, 255, 0.05);
          white-space: pre-wrap;
          line-height: 1.6;

          &.streaming {
            .cursor {
              animation: blink 1s infinite;
            }
          }
        }

        .message-files {
          margin-top: 8px;
          .file-item {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            font-size: 12px;
          }
        }

        .message-actions {
          margin-top: 4px;
          display: flex;
          align-items: center;
        }
      }
    }
  }

  .input-area {
    padding: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.09);

    .uploaded-files {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;

      .file-preview {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background-color: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        font-size: 12px;
      }
    }

    .input-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
