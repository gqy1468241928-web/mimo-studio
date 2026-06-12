<template>
  <div class="plugins-view">
    <div class="page-header">
      <h2 class="header-title">插件</h2>
      <div class="header-actions">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="searchQuery" placeholder="搜索插件..." />
        </div>
      </div>
    </div>

    <div class="plugins-content">
      <!-- 插件列表 -->
      <div class="plugins-list">
        <div v-for="plugin in filteredPlugins" :key="plugin.id" class="plugin-card">
          <div class="plugin-main">
            <div class="plugin-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="plugin.icon"></svg>
            </div>
            <div class="plugin-info">
              <div class="plugin-name-row">
                <span class="plugin-name">{{ plugin.name }}</span>
                <span class="plugin-version">v{{ plugin.version }}</span>
                <span v-if="plugin.builtin" class="plugin-badge">内置</span>
              </div>
              <p class="plugin-desc">{{ plugin.description }}</p>
            </div>
          </div>
          <div class="plugin-actions">
            <div class="toggle-switch" :class="{ active: plugin.enabled }" @click="togglePlugin(plugin)">
              <div class="toggle-thumb"></div>
            </div>
            <button class="btn-config" @click="showConfig(plugin)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredPlugins.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        <p>没有找到匹配的插件</p>
      </div>
    </div>

    <!-- 配置弹窗 -->
    <div v-if="selectedPlugin" class="modal-overlay" @click.self="selectedPlugin = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ selectedPlugin.name }} 配置</h3>
          <button class="modal-close" @click="selectedPlugin = null">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div v-for="(value, key) in selectedPlugin.config" :key="key" class="config-item">
            <label class="config-label">{{ key }}</label>
            <input
              v-if="typeof value === 'string'"
              :value="value"
              class="config-input"
              @input="updateConfig(key, ($event.target as HTMLInputElement).value)"
            />
            <div v-else-if="typeof value === 'boolean'" class="toggle-switch" :class="{ active: value }" @click="updateConfig(key, !value)">
              <div class="toggle-thumb"></div>
            </div>
            <input
              v-else
              :value="value"
              type="number"
              class="config-input"
              @input="updateConfig(key, Number(($event.target as HTMLInputElement).value))"
            />
          </div>
          <button class="btn-save" @click="saveConfig">保存配置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Plugin {
  id: string
  name: string
  description: string
  version: string
  icon: string
  enabled: boolean
  builtin: boolean
  config: Record<string, any>
}

const searchQuery = ref('')
const selectedPlugin = ref<Plugin | null>(null)

const plugins = ref<Plugin[]>([
  {
    id: 'mcp-client',
    name: 'MCP 客户端',
    description: 'Model Context Protocol 客户端，连接外部 MCP 服务器扩展功能',
    version: '1.0.0',
    icon: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    enabled: true,
    builtin: true,
    config: {
      'auto_connect': true,
      'timeout_ms': 30000,
      'max_retries': 3,
    }
  },
  {
    id: 'tts-engine',
    name: '语音合成引擎',
    description: '文本转语音插件，支持多种 TTS 服务商',
    version: '2.1.0',
    icon: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
    enabled: true,
    builtin: true,
    config: {
      'provider': 'edge-tts',
      'voice': 'zh-CN-XiaoxiaoNeural',
      'speed': 1.0,
    }
  },
  {
    id: 'web-search',
    name: '网络搜索',
    description: '互联网搜索插件，支持多种搜索引擎',
    version: '1.3.0',
    icon: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    enabled: true,
    builtin: false,
    config: {
      'engine': 'google',
      'max_results': 10,
      'safe_search': true,
    }
  },
  {
    id: 'code-executor',
    name: '代码执行器',
    description: '安全执行代码片段，支持多种编程语言',
    version: '1.1.0',
    icon: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    enabled: false,
    builtin: false,
    config: {
      'language': 'python',
      'timeout_seconds': 30,
      'sandbox': true,
    }
  },
  {
    id: 'file-converter',
    name: '文件转换器',
    description: '文件格式转换插件，支持文档、图片、音频等格式转换',
    version: '1.0.2',
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    enabled: false,
    builtin: false,
    config: {
      'max_file_size_mb': 50,
      'output_dir': './converted',
    }
  },
  {
    id: 'calendar',
    name: '日历集成',
    description: '日历管理插件，支持创建、查询和管理日程',
    version: '1.2.0',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    enabled: false,
    builtin: false,
    config: {
      'sync_interval_min': 15,
      'default_reminder_min': 10,
    }
  },
])

const filteredPlugins = computed(() => {
  if (!searchQuery.value) return plugins.value
  const query = searchQuery.value.toLowerCase()
  return plugins.value.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.description.toLowerCase().includes(query)
  )
})

const togglePlugin = (plugin: Plugin) => {
  plugin.enabled = !plugin.enabled
}

const showConfig = (plugin: Plugin) => {
  selectedPlugin.value = { ...plugin }
}

const updateConfig = (key: string, value: any) => {
  if (selectedPlugin.value) {
    selectedPlugin.value.config[key] = value
  }
}

const saveConfig = () => {
  if (selectedPlugin.value) {
    const index = plugins.value.findIndex(p => p.id === selectedPlugin.value!.id)
    if (index !== -1) {
      const plugin = plugins.value[index]!
      plugin.config = { ...selectedPlugin.value.config }
    }
    selectedPlugin.value = null
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/hermes-vars.scss';

.plugins-view {
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

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 6px 12px;

  input {
    background: none;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 13px;
    width: 200px;

    &::placeholder {
      color: var(--text-muted);
    }
  }

  svg {
    color: var(--text-muted);
    flex-shrink: 0;
  }
}

.plugins-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.plugins-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plugin-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all .15s;

  &:hover {
    border-color: var(--accent-muted);
  }
}

.plugin-main {
  display: flex;
  gap: 16px;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.plugin-icon {
  width: 44px;
  height: 44px;
  background: rgba(var(--accent-primary-rgb), .1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  flex-shrink: 0;
}

.plugin-info {
  flex: 1;
  min-width: 0;
}

.plugin-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.plugin-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.plugin-version {
  font-size: 11px;
  color: var(--text-muted);
}

.plugin-badge {
  font-size: 10px;
  padding: 1px 6px;
  background: rgba(var(--accent-info-rgb), .1);
  color: var(--accent-info);
  border-radius: 4px;
}

.plugin-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.plugin-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.toggle-switch {
  width: 40px;
  height: 22px;
  background: var(--border-color);
  border-radius: 11px;
  cursor: pointer;
  position: relative;
  transition: background .2s;

  &.active {
    background: var(--success);

    .toggle-thumb {
      transform: translateX(18px);
    }
  }
}

.toggle-thumb {
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform .2s;
}

.btn-config {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;

  &:hover {
    color: var(--text-primary);
    background: rgba(var(--accent-primary-rgb), .06);
  }
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
  max-height: 80vh;
  overflow-y: auto;
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

.config-item {
  margin-bottom: 16px;
}

.config-label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
  text-transform: capitalize;
}

.config-input {
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
  margin-top: 20px;

  &:hover {
    background: var(--accent-hover);
  }
}
</style>
