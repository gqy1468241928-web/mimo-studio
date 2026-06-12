<template>
  <div class="dashboard-view">
    <div class="page-header">
      <h2 class="header-title">仪表板</h2>
    </div>

    <div class="dashboard-content">
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card" v-for="stat in stats" :key="stat.label">
          <div class="stat-info">
            <span class="stat-label">{{ stat.label }}</span>
            <span class="stat-value">{{ stat.value }}</span>
          </div>
          <div class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="stat.iconPath"></svg>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="section">
        <h3 class="section-title">快速开始</h3>
        <div class="actions-grid">
          <button
            v-for="action in actions"
            :key="action.label"
            class="action-card"
            @click="$router.push(action.route)"
          >
            <div class="action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="action.iconPath"></svg>
            </div>
            <span class="action-label">{{ action.label }}</span>
            <span class="action-desc">{{ action.description }}</span>
          </button>
        </div>
      </div>

      <!-- 最近活动 -->
      <div class="section">
        <h3 class="section-title">最近活动</h3>
        <div class="activity-card">
          <div v-if="recentActivities.length === 0" class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <p>暂无活动记录</p>
            <span>开始使用 MiMo Studio 后，这里会显示你的操作历史</span>
          </div>
          <div v-else class="activity-list">
            <div v-for="(activity, index) in recentActivities" :key="index" class="activity-item">
              <div class="activity-dot"></div>
              <div class="activity-content">
                <span class="activity-text">{{ activity.text }}</span>
                <span class="activity-time">{{ activity.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const stats = [
  { label: '可用模型', value: '6', iconPath: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>' },
  { label: '今日对话', value: '0', iconPath: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
  { label: 'Token 使用', value: '0', iconPath: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' },
  { label: 'TTS 调用', value: '0', iconPath: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' },
]

const actions = [
  { label: '开始对话', description: '与 MiMo 模型进行智能对话', route: '/chat', iconPath: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
  { label: '语音合成', description: '将文本转换为自然语音', route: '/tts', iconPath: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' },
  { label: '模型管理', description: '查看和管理可用模型', route: '/models', iconPath: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>' },
]

const recentActivities: Array<{ text: string; time: string }> = []
</script>

<style lang="scss" scoped>
@import '@/styles/hermes-vars.scss';

.dashboard-view {
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

.dashboard-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
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

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .5px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-icon {
  width: 40px;
  height: 40px;
  background: rgba(var(--accent-primary-rgb), .1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.action-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  text-align: left;
  transition: all .15s;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:hover {
    border-color: var(--accent-muted);
    background: var(--bg-card-hover);
  }
}

.action-icon {
  width: 36px;
  height: 36px;
  background: rgba(var(--accent-primary-rgb), .1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
}

.action-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.action-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.activity-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
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
    text-align: center;
  }
}

.activity-list {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;

  &:not(:last-child) {
    border-bottom: 1px solid var(--border-light);
  }
}

.activity-dot {
  width: 8px;
  height: 8px;
  background: var(--accent-primary);
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.activity-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.activity-text {
  font-size: 13px;
  color: var(--text-primary);
}

.activity-time {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
