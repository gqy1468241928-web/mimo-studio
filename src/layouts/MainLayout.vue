<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar glass" :class="{ collapsed: sidebarCollapsed }">
      <!-- Logo -->
      <div class="sidebar-header">
        <div class="logo" @click="sidebarCollapsed = !sidebarCollapsed">
          <div class="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span v-if="!sidebarCollapsed" class="logo-text gradient-text">MiMo Studio</span>
        </div>
      </div>

      <!-- 菜单 -->
      <nav class="sidebar-nav">
        <!-- 对话模块 -->
        <div class="nav-group">
          <div class="nav-group-label" v-if="!sidebarCollapsed">对话</div>
          <router-link to="/chat" class="nav-item glass-hover" :class="{ active: $route.name === 'chat' }">
            <span class="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-text">对话</span>
          </router-link>
          <router-link to="/tts" class="nav-item glass-hover" :class="{ active: $route.name === 'tts' }">
            <span class="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-text">语音合成</span>
          </router-link>
        </div>

        <!-- 工具模块 -->
        <div class="nav-group">
          <div class="nav-group-label" v-if="!sidebarCollapsed">工具</div>
          <router-link to="/models" class="nav-item glass-hover" :class="{ active: $route.name === 'models' }">
            <span class="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8"/>
                <path d="M12 17v4"/>
              </svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-text">模型</span>
          </router-link>
          <router-link to="/files" class="nav-item glass-hover" :class="{ active: $route.name === 'files' }">
            <span class="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-text">文件</span>
          </router-link>
          <router-link to="/statistics" class="nav-item glass-hover" :class="{ active: $route.name === 'statistics' }">
            <span class="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-text">用量</span>
          </router-link>
        </div>

        <!-- 系统模块 -->
        <div class="nav-group">
          <div class="nav-group-label" v-if="!sidebarCollapsed">系统</div>
          <router-link to="/settings" class="nav-item glass-hover" :class="{ active: $route.name === 'settings' }">
            <span class="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-text">设置</span>
          </router-link>
        </div>
      </nav>

      <!-- 底部信息 -->
      <div class="sidebar-footer">
        <!-- 用户 -->
        <div class="footer-item user-info glass-hover">
          <div class="user-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span v-if="!sidebarCollapsed" class="nav-text">{{ username }}</span>
        </div>

        <!-- 连接状态 -->
        <div class="footer-item">
          <span class="status-dot connected"></span>
          <span v-if="!sidebarCollapsed" class="nav-text">已连接</span>
        </div>

        <!-- 版本 -->
        <div v-if="!sidebarCollapsed" class="footer-item version">
          MiMo Studio v1.0.0
        </div>

        <!-- 退出 -->
        <div class="footer-item logout glass-hover" @click="logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span v-if="!sidebarCollapsed" class="nav-text">退出登录</span>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 顶部栏 -->
      <header class="top-bar glass">
        <div class="top-bar-left">
          <button class="btn-icon glass-hover" @click="sidebarCollapsed = !sidebarCollapsed">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h1 class="page-title">{{ currentTitle }}</h1>
        </div>
        <div class="top-bar-right">
          <button class="btn-gradient" @click="$router.push('/chat')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新建对话
          </button>
        </div>
      </header>

      <!-- 页面内容 -->
      <div class="page-content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const sidebarCollapsed = ref(false)
const username = ref(localStorage.getItem('mimo-user') || 'Admin')

const titleMap: Record<string, string> = {
  dashboard: '仪表板',
  models: '模型管理',
  chat: '对话',
  tts: '语音合成',
  statistics: '使用统计',
  files: '文件管理',
  settings: '设置'
}

const currentTitle = computed(() => titleMap[route.name as string] || 'MiMo Studio')

const logout = () => {
  localStorage.removeItem('mimo-token')
  localStorage.removeItem('mimo-user')
  router.push('/login')
}
</script>

<style lang="scss" scoped>
@import '@/styles/design-system.scss';

.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
  color: var(--text-primary);
  font-family: var(--font-sans);
}

// 侧边栏
.sidebar {
  width: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  overflow: hidden;
  z-index: 10;

  &.collapsed {
    width: var(--sidebar-collapsed-width);
  }
}

.sidebar-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  user-select: none;

  .logo-icon {
    width: 32px;
    height: 32px;
    background: var(--color-primary-gradient);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
  }

  .logo-text {
    font-size: var(--text-lg);
    font-weight: 600;
    white-space: nowrap;
  }
}

// 导航
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;
}

.nav-group {
  margin-bottom: var(--space-1);
}

.nav-group-label {
  padding: var(--space-2) var(--space-4) var(--space-1);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  cursor: pointer;
  margin: 0 var(--space-2);
  border-radius: var(--radius-md);

  &:hover {
    color: var(--text-primary);
  }

  &.active {
    background: rgba(6, 182, 212, 0.15);
    color: var(--color-primary-light);
    box-shadow: inset 3px 0 0 var(--color-primary);
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .nav-text {
    font-size: var(--text-sm);
    white-space: nowrap;
  }
}

// 底部
.sidebar-footer {
  border-top: 1px solid var(--border-color);
  padding: var(--space-2) 0;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: 0 var(--space-2);
  border-radius: var(--radius-md);

  &.user-info {
    color: var(--text-secondary);
  }

  &.version {
    justify-content: center;
    padding: var(--space-1) var(--space-4);
  }

  &.logout {
    cursor: pointer;
    color: var(--text-tertiary);

    &:hover {
      background: rgba(239, 68, 68, 0.1);
      color: var(--color-error);
    }
  }

  .user-avatar {
    width: 24px;
    height: 24px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--text-disabled);
    flex-shrink: 0;

    &.connected {
      background: var(--color-success);
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
    }
  }
}

// 主内容区
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-5);
  flex-shrink: 0;
  z-index: 5;

  .top-bar-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .top-bar-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
}

.page-title {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.btn-icon {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--text-primary);
  }
}

.btn-gradient {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-glow);
  }
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
}
</style>
