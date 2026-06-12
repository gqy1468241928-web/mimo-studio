<template>
  <div class="skills-view">
    <div class="page-header">
      <h2 class="header-title">技能</h2>
      <div class="header-actions">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="searchQuery" placeholder="搜索技能..." />
        </div>
      </div>
    </div>

    <div class="skills-content">
      <!-- 分类筛选 -->
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

      <!-- 技能列表 -->
      <div class="skills-grid">
        <div v-for="skill in filteredSkills" :key="skill.name" class="skill-card">
          <div class="skill-header">
            <div class="skill-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <div class="skill-info">
              <span class="skill-name">{{ skill.name }}</span>
              <span class="skill-version">v{{ skill.version }}</span>
            </div>
            <div class="skill-status" :class="skill.installed ? 'installed' : 'available'">
              {{ skill.installed ? '已安装' : '可用' }}
            </div>
          </div>
          <p class="skill-desc">{{ skill.description }}</p>
          <div class="skill-tags">
            <span v-for="tag in skill.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div class="skill-actions">
            <button v-if="!skill.installed" class="btn-install" @click="installSkill(skill)">
              安装
            </button>
            <button v-else class="btn-uninstall" @click="uninstallSkill(skill)">
              卸载
            </button>
            <button class="btn-detail" @click="showDetail(skill)">
              详情
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredSkills.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        <p>没有找到匹配的技能</p>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="selectedSkill" class="modal-overlay" @click.self="selectedSkill = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ selectedSkill.name }}</h3>
          <button class="modal-close" @click="selectedSkill = null">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span class="detail-label">版本</span>
            <span class="detail-value">{{ selectedSkill.version }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">分类</span>
            <span class="detail-value">{{ selectedSkill.category }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">描述</span>
            <span class="detail-value">{{ selectedSkill.description }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">标签</span>
            <div class="detail-tags">
              <span v-for="tag in selectedSkill.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
          <div class="detail-row" v-if="selectedSkill.triggers">
            <span class="detail-label">触发条件</span>
            <div class="detail-triggers">
              <div v-for="trigger in selectedSkill.triggers" :key="trigger" class="trigger-item">
                {{ trigger }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Skill {
  name: string
  description: string
  version: string
  category: string
  tags: string[]
  installed: boolean
  triggers?: string[]
}

const searchQuery = ref('')
const activeCategory = ref('all')
const selectedSkill = ref<Skill | null>(null)

const categories = [
  { key: 'all', label: '全部' },
  { key: 'coding', label: '编程' },
  { key: 'writing', label: '写作' },
  { key: 'research', label: '研究' },
  { key: 'design', label: '设计' },
  { key: 'productivity', label: '效率' },
  { key: 'media', label: '媒体' },
]

const skills = ref<Skill[]>([
  {
    name: 'code-review',
    description: '代码审查技能，自动检测代码质量问题并提供改进建议',
    version: '1.2.0',
    category: 'coding',
    tags: ['代码质量', '审查', '最佳实践'],
    installed: true,
    triggers: ['审查代码', 'code review', '检查代码']
  },
  {
    name: 'article-writing',
    description: '文章写作技能，支持多种风格和格式的文章生成',
    version: '2.0.1',
    category: 'writing',
    tags: ['写作', '文章', '内容生成'],
    installed: true,
    triggers: ['写文章', 'write article', '生成内容']
  },
  {
    name: 'deep-research',
    description: '深度研究技能，多源信息收集和分析',
    version: '1.5.0',
    category: 'research',
    tags: ['研究', '分析', '信息收集'],
    installed: false,
    triggers: ['研究', 'research', '分析']
  },
  {
    name: 'ui-design',
    description: 'UI设计技能，生成现代化的界面设计方案',
    version: '1.0.3',
    category: 'design',
    tags: ['UI', '设计', '界面'],
    installed: false,
    triggers: ['设计界面', 'UI design', '创建UI']
  },
  {
    name: 'task-management',
    description: '任务管理技能，帮助规划和跟踪项目进度',
    version: '1.1.0',
    category: 'productivity',
    tags: ['任务', '管理', '项目'],
    installed: true,
    triggers: ['管理任务', 'task management', '项目管理']
  },
  {
    name: 'image-generation',
    description: '图像生成技能，根据描述创建高质量图像',
    version: '2.1.0',
    category: 'media',
    tags: ['图像', '生成', 'AI绘画'],
    installed: false,
    triggers: ['生成图片', 'image generation', '创建图像']
  },
  {
    name: 'data-analysis',
    description: '数据分析技能，处理和可视化数据',
    version: '1.3.2',
    category: 'research',
    tags: ['数据', '分析', '可视化'],
    installed: true,
    triggers: ['分析数据', 'data analysis', '数据处理']
  },
  {
    name: 'email-composer',
    description: '邮件撰写技能，生成专业的商务邮件',
    version: '1.0.0',
    category: 'writing',
    tags: ['邮件', '商务', '沟通'],
    installed: false,
    triggers: ['写邮件', 'compose email', '撰写邮件']
  },
])

const filteredSkills = computed(() => {
  let result = skills.value

  if (activeCategory.value !== 'all') {
    result = result.filter(s => s.category === activeCategory.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      s.tags.some(t => t.toLowerCase().includes(query))
    )
  }

  return result
})

const getCategoryCount = (key: string) => {
  if (key === 'all') return skills.value.length
  return skills.value.filter(s => s.category === key).length
}

const installSkill = (skill: Skill) => {
  skill.installed = true
}

const uninstallSkill = (skill: Skill) => {
  skill.installed = false
}

const showDetail = (skill: Skill) => {
  selectedSkill.value = skill
}
</script>

<style lang="scss" scoped>
@import '@/styles/hermes-vars.scss';

.skills-view {
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

.skills-content {
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

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.skill-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  transition: all .15s;

  &:hover {
    border-color: var(--accent-muted);
  }
}

.skill-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.skill-icon {
  width: 36px;
  height: 36px;
  background: rgba(var(--accent-primary-rgb), .1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  flex-shrink: 0;
}

.skill-info {
  flex: 1;
  min-width: 0;
}

.skill-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.skill-version {
  font-size: 11px;
  color: var(--text-muted);
}

.skill-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;

  &.installed {
    background: rgba(var(--success-rgb), .1);
    color: var(--success);
  }

  &.available {
    background: rgba(var(--accent-primary-rgb), .1);
    color: var(--accent-primary);
  }
}

.skill-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.skill-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(var(--accent-primary-rgb), .06);
  border-radius: 4px;
  color: var(--text-muted);
}

.skill-actions {
  display: flex;
  gap: 8px;
}

.btn-install, .btn-uninstall, .btn-detail {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
}

.btn-install {
  background: var(--accent-primary);
  color: var(--text-on-accent);
  border: none;

  &:hover {
    background: var(--accent-hover);
  }
}

.btn-uninstall {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);

  &:hover {
    border-color: var(--error);
    color: var(--error);
  }
}

.btn-detail {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);

  &:hover {
    border-color: var(--accent-muted);
    color: var(--text-primary);
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

.detail-row {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.detail-label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.detail-value {
  font-size: 14px;
  color: var(--text-primary);
}

.detail-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.detail-triggers {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trigger-item {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 4px 8px;
  background: rgba(var(--accent-primary-rgb), .06);
  border-radius: 4px;
}
</style>
