<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- Logo -->
      <div class="sidebar-header">
        <div class="logo" @click="sidebarCollapsed = !sidebarCollapsed">
          <span class="logo-icon">M</span>
          <span v-if="!sidebarCollapsed" class="logo-text">MiMo Studio</span>
        </div>
      </div>

      <!-- 菜单 -->
      <nav class="sidebar-nav">
        <!-- 对话模块 -->
        <div class="nav-group">
          <div class="nav-group-label" v-if="!sidebarCollapsed">对话</div>
          <router-link to="/chat" class="nav-item" :class="{ active: $route.name === 'chat' }">
            <span class="nav-icon">💬</span>
            <span v-if="!sidebarCollapsed" class="nav-text">对话</span>
          </router-link>
          <router-link to="/tts" class="nav-item" :class="{ active: $route.name === 'tts' }">
            <span class="nav-icon">🔊</span>
            <span v-if="!sidebarCollapsed" class="nav-text">语音合成</span>
          </router-link>
        </div>

        <!-- 工具模块 -->
        <div class="nav-group">
          <div class="nav-group-label" v-if="!sidebarCollapsed">工具</div>
          <router-link to="/models" class="nav-item" :class="{ active: $route.name === 'models' }">
            <span class="nav-icon">🤖</span>
            <span v-if="!sidebarCollapsed" class="nav-text">模型</span>
          </router-link>
          <router-link to="/files" class="nav-item" :class="{ active: $route.name === 'files' }">
            <span class="nav-icon">📁</span>
            <span v-if="!sidebarCollapsed" class="nav-text">文件</span>
          </router-link>
          <router-link to="/statistics" class="nav-item" :class="{ active: $route.name === 'statistics' }">
            <span class="nav-icon">📊</span>
            <span v-if="!sidebarCollapsed" class="nav-text">用量</span>
          </router-link>
        </div>

        <!-- 系统模块 -->
        <div class="nav-group">
          <div class="nav-group-label" v-if="!sidebarCollapsed">系统</div>
          <router-link to="/settings" class="nav-item" :class="{ active: $route.name === 'settings' }">
            <span class="nav-icon">⚙️</span>
            <span v-if="!sidebarCollapsed" class="nav-text">设置</span>
          </router-link>
        </div>
      </nav>

      <!-- 底部信息 -->
      <div class="sidebar-footer">
        <!-- 用户 -->
        <div class="footer-item user-info">
          <span class="nav-icon">👤</span>
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
        <div class="footer-item logout" @click="logout">
          <span class="nav-icon">🚪</span>
          <span v-if="!sidebarCollapsed" class="nav-text">退出登录</span>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 顶部栏 -->
      <header class="top-bar">
        <div class="top-bar-left">
          <button class="btn-icon" @click="sidebarCollapsed = !sidebarCollapsed">
            ☰
          </button>
          <h1 class="page-title">{{ currentTitle }}</h1>
        </div>
        <div class="top-bar-right">
          <button class="btn-primary" @click="$router.push('/chat')">
            + 新建对话
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
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #0d0d14;
  color: #e0e0e0;
}

// 侧边栏
.sidebar {
  width: 220px;
  background: #111118;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  overflow: hidden;

  &.collapsed {
    width: 56px;
  }
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;

  .logo-icon {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    color: #fff;
    flex-shrink: 0;
  }

  .logo-text {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
  }
}

// 导航
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
}

.nav-group {
  margin-bottom: 4px;
}

.nav-group-label {
  padding: 8px 16px 4px;
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  color: #999;
  text-decoration: none;
  transition: all 0.15s ease;
  cursor: pointer;
  border-radius: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    color: #ccc;
  }

  &.active {
    background: rgba(124, 58, 237, 0.15);
    color: #a78bfa;
    border-right: 2px solid #7c3aed;
  }

  .nav-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  .nav-text {
    font-size: 13px;
    white-space: nowrap;
  }
}

// 底部
.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 8px 0;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 12px;
  color: #666;

  &.user-info {
    color: #999;
  }

  &.version {
    justify-content: center;
    padding: 4px 16px;
    font-size: 11px;
  }

  &.logout {
    cursor: pointer;
    color: #666;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #f87171;
    }
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #666;
    flex-shrink: 0;

    &.connected {
      background: #22c55e;
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
  height: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #111118;
  flex-shrink: 0;

  .top-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .top-bar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.page-title {
  font-size: 14px;
  font-weight: 500;
  color: #e0e0e0;
  margin: 0;
}

.btn-icon {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
  }
}

.btn-primary {
  background: #7c3aed;
  color: #fff;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #6d28d9;
  }
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
}
</style>
