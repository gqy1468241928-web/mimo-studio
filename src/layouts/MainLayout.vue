<template>
  <div class="app-layout dark">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- Logo -->
      <div class="sidebar-logo" @click="sidebarCollapsed = !sidebarCollapsed">
        <div class="logo-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span class="logo-text">MiMo Studio</span>
      </div>

      <!-- 折叠按钮 -->
      <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="11 17 6 12 11 7"/>
          <polyline points="18 17 13 12 18 7"/>
        </svg>
      </button>

      <!-- 导航菜单 -->
      <nav class="sidebar-nav">
        <!-- 对话模块 -->
        <div class="nav-group">
          <div class="nav-group-label">
            <span>对话</span>
          </div>
          <div class="nav-group-items">
            <router-link to="/chat" class="nav-item" :class="{ active: $route.name === 'chat' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>对话</span>
            </router-link>
            <router-link to="/tts" class="nav-item" :class="{ active: $route.name === 'tts' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              <span>语音合成</span>
            </router-link>
          </div>
        </div>

        <!-- 工具模块 -->
        <div class="nav-group">
          <div class="nav-group-label">
            <span>工具</span>
          </div>
          <div class="nav-group-items">
            <router-link to="/models" class="nav-item" :class="{ active: $route.name === 'models' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8"/>
                <path d="M12 17v4"/>
              </svg>
              <span>模型</span>
            </router-link>
            <router-link to="/files" class="nav-item" :class="{ active: $route.name === 'files' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span>文件</span>
            </router-link>
            <router-link to="/statistics" class="nav-item" :class="{ active: $route.name === 'statistics' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span>用量</span>
            </router-link>
          </div>
        </div>

        <!-- 扩展模块 -->
        <div class="nav-group">
          <div class="nav-group-label">
            <span>扩展</span>
          </div>
          <div class="nav-group-items">
            <router-link to="/skills" class="nav-item" :class="{ active: $route.name === 'skills' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              <span>技能</span>
            </router-link>
            <router-link to="/plugins" class="nav-item" :class="{ active: $route.name === 'plugins' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              <span>插件</span>
            </router-link>
            <router-link to="/memory" class="nav-item" :class="{ active: $route.name === 'memory' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              <span>记忆</span>
            </router-link>
          </div>
        </div>

        <!-- 系统模块 -->
        <div class="nav-group nav-group-bottom">
          <div class="nav-group-label">
            <span>系统</span>
          </div>
          <div class="nav-group-items">
            <router-link to="/settings" class="nav-item" :class="{ active: $route.name === 'settings' }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>设置</span>
            </router-link>
          </div>
        </div>
      </nav>

      <!-- 底部信息 -->
      <div class="sidebar-footer">
        <div class="logout-item" @click="logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span class="logout-username">{{ username }}</span>
        </div>

        <div class="status-row">
          <div class="status-indicator connected">
            <div class="status-dot"></div>
            <span class="status-text">已连接</span>
          </div>
        </div>

        <div class="version-info">
          <span class="version-text">MiMo Studio v1.0.0</span>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const sidebarCollapsed = ref(false)
const username = ref(localStorage.getItem('mimo-user') || 'Admin')

const logout = () => {
  localStorage.removeItem('mimo-token')
  localStorage.removeItem('mimo-user')
  router.push('/login')
}
</script>

<style lang="scss" scoped>
@import '@/styles/hermes-vars.scss';

.app-layout {
  height: 100vh;
  width: 100%;
  max-width: 100%;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  height: 100vh;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  flex-direction: column;
  flex-shrink: 0;
  padding: 0 12px 20px;
  transition: width .25s;
  display: flex;
  position: relative;

  &.collapsed {
    width: 64px;
    padding: 0 8px 12px;
    overflow: hidden;

    .sidebar-logo {
      justify-content: center;
      gap: 0;
      margin: 0 -8px;
      padding: 12px 4px 8px;

      .logo-text {
        display: none;
      }
    }

    .collapse-btn {
      margin: 0 auto 8px;
      display: flex;
    }

    .nav-group-label {
      letter-spacing: 0;
      justify-content: center;
      gap: 2px;
      padding: 8px 0 4px;

      span {
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 36px;
        overflow: hidden;
      }
    }

    .nav-item {
      justify-content: center;
      gap: 0;
      padding: 10px 4px;

      span {
        display: none;
      }

      svg {
        flex-shrink: 0;
      }
    }

    .sidebar-footer {
      .logout-item {
        border-radius: 6px;
        margin: 0;
        padding: 10px 4px;

        span {
          display: none;
        }
      }

      .status-text {
        display: none;
      }

      .status-row {
        justify-content: center;
      }

      .version-info {
        justify-content: center;
        padding: 4px 0;

        .version-text {
          display: none;
        }
      }
    }
  }
}

.sidebar-logo {
  color: var(--text-primary);
  cursor: pointer;
  background-color: var(--bg-card);
  align-items: center;
  gap: 10px;
  margin: 0 -12px;
  padding: 20px 12px;
  display: flex;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .logo-icon {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #4a90d9, #6ba3d6);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
  }

  .logo-text {
    letter-spacing: .5px;
    white-space: nowrap;
    font-size: 16px;
    font-weight: 600;
  }
}

.collapse-btn {
  appearance: none;
  width: 28px;
  height: 28px;
  color: var(--text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
  flex-shrink: 0;
  justify-content: center;
  align-items: center;
  margin-left: auto;
  margin-right: 0;
  text-decoration: none;
  transition: all .15s;
  display: flex;

  &:hover {
    color: var(--text-primary);
    background-color: rgba(var(--accent-primary-rgb), .08);
  }
}

.sidebar:not(.collapsed) .collapse-btn {
  z-index: 5;
  position: absolute;
  top: 18px;
  right: 16px;
}

.sidebar-nav {
  scrollbar-width: none;
  flex-direction: column;
  flex: 1;
  gap: 6px;
  min-height: 0;
  padding-top: 12px;
  display: flex;
  overflow-y: auto;

  &::-webkit-scrollbar {
    display: none;
  }
}

.nav-group {
  flex-direction: column;
  gap: 2px;
  display: flex;

  &.nav-group-bottom {
    border-top: 1px solid var(--border-color);
    margin-top: auto;
    padding-top: 8px;
  }
}

.nav-group-items {
  flex-direction: column;
  gap: 2px;
  display: flex;
}

.nav-group-label {
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .8px;
  cursor: pointer;
  user-select: none;
  border-radius: 6px;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px 4px;
  font-size: 10px;
  font-weight: 600;
  transition: color .15s;
  display: flex;

  &:hover {
    color: var(--text-secondary);
  }
}

.nav-group:first-child .nav-group-label {
  padding-top: 0;
}

.nav-item {
  appearance: none;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 6px;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  font-size: 14px;
  text-decoration: none;
  transition: all .15s;
  display: flex;

  &:hover {
    background-color: rgba(var(--accent-primary-rgb), .06);
    color: var(--text-primary);
  }

  &.active {
    background-color: rgba(var(--accent-primary-rgb), .12);
    color: var(--accent-primary);
  }

  svg {
    flex-shrink: 0;
  }

  span {
    white-space: nowrap;
  }
}

.sidebar-footer {
  border-top: 1px solid var(--border-color);
  padding-top: 8px;
}

.logout-item {
  color: var(--text-muted);
  border-radius: 0;
  margin: 0 -12px;
  padding: 10px 12px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    color: var(--error);
    background: rgba(var(--error-rgb), .06);
  }

  svg, span:not(.logout-username) {
    flex-shrink: 0;
  }

  .logout-username {
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
    width: 96px;
    min-width: 0;
    max-width: 40%;
    color: var(--text-muted);
    flex: 0 96px;
    margin-left: auto;
    font-size: 12px;
    overflow: hidden;
  }
}

.status-row {
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  display: flex;
}

.status-indicator {
  align-items: center;
  gap: 8px;
  font-size: 12px;
  display: flex;

  &.connected .status-dot {
    background-color: var(--success);
    box-shadow: 0 0 6px rgba(var(--success-rgb), .5);
  }

  .status-dot {
    border-radius: 50%;
    flex-shrink: 0;
    width: 8px;
    height: 8px;
  }

  .status-text {
    color: var(--text-secondary);
  }
}

.version-info {
  color: var(--text-muted);
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  padding: 2px 12px 8px;
  font-size: 11px;
  display: flex;
  overflow: hidden;
}

.app-main {
  background-color: var(--bg-primary);
  flex: 1;
  overflow-y: auto;
}
</style>
