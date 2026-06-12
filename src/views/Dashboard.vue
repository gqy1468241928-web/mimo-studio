<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card glass" v-for="stat in stats" :key="stat.label">
        <div class="stat-icon" :style="{ background: stat.gradient }">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="stat.iconPath"></svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <h2 class="section-title">快速开始</h2>
      <div class="actions-grid">
        <button
          v-for="action in actions"
          :key="action.label"
          class="action-card glass glass-hover"
          @click="$router.push(action.route)"
        >
          <div class="action-icon" :style="{ background: action.gradient }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="action.iconPath"></svg>
          </div>
          <span class="action-label">{{ action.label }}</span>
          <span class="action-desc">{{ action.description }}</span>
        </button>
      </div>
    </div>

    <!-- 最近活动 -->
    <div class="recent-activity">
      <h2 class="section-title">最近活动</h2>
      <div class="activity-list glass">
        <div v-if="recentActivities.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>暂无活动记录</p>
          <span>开始使用 MiMo Studio 后，这里会显示你的操作历史</span>
        </div>
        <div v-else class="activity-item" v-for="(activity, index) in recentActivities" :key="index">
          <div class="activity-dot"></div>
          <div class="activity-content">
            <span class="activity-text">{{ activity.text }}</span>
            <span class="activity-time">{{ activity.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 统计数据
const stats = [
  {
    label: '可用模型',
    value: '6',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    iconPath: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>'
  },
  {
    label: '今日对话',
    value: '0',
    gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    iconPath: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
  },
  {
    label: 'Token 使用',
    value: '0',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    iconPath: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
  },
  {
    label: 'TTS 调用',
    value: '0',
    gradient: 'linear-gradient(135deg, #22c55e, #4ade80)',
    iconPath: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
  }
]

// 快速操作
const actions = [
  {
    label: '开始对话',
    description: '与 MiMo 模型进行智能对话',
    route: '/chat',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    iconPath: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
  },
  {
    label: '语音合成',
    description: '将文本转换为自然语音',
    route: '/tts',
    gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    iconPath: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
  },
  {
    label: '模型管理',
    description: '查看和管理可用模型',
    route: '/models',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    iconPath: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>'
  }
]

// 最近活动
const recentActivities: Array<{ text: string; time: string }> = []
</script>

<style lang="scss" scoped>
@import '@/styles/design-system.scss';

.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

// 统计卡片
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

// 快速操作
.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-4) 0;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-4);
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;

  &:hover {
    transform: translateY(-2px);
  }
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.action-label {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.action-desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

// 最近活动
.activity-list {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  color: var(--text-tertiary);

  svg {
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: var(--text-base);
    color: var(--text-secondary);
  }

  span {
    font-size: var(--text-sm);
    text-align: center;
  }
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;

  &:not(:last-child) {
    border-bottom: 1px solid var(--border-color);
  }
}

.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  margin-top: 6px;
  flex-shrink: 0;
}

.activity-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.activity-text {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.activity-time {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
</style>
