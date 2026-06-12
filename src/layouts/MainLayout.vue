<template>
  <n-layout has-sider style="height: 100vh">
    <n-layout-sider
      bordered
      :width="240"
      :collapsed-width="64"
      :native-scrollbar="false"
      show-trigger
    >
      <div class="logo">
        <h2>MiMo 工作台</h2>
      </div>
      <n-menu
        :value="activeKey"
        :options="menuOptions"
        @update:value="handleMenuChange"
      />
    </n-layout-sider>
    <n-layout>
      <n-layout-header bordered style="height: 56px; padding: 0 16px; display: flex; align-items: center; justify-content: space-between;">
        <n-breadcrumb>
          <n-breadcrumb-item @click="$router.push('/')">首页</n-breadcrumb-item>
          <n-breadcrumb-item v-if="currentTitle">{{ currentTitle }}</n-breadcrumb-item>
        </n-breadcrumb>
        <n-space>
          <n-button quaternary circle @click="toggleTheme">
            <template #icon>
              <n-icon>
                <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </n-icon>
            </template>
          </n-button>
        </n-space>
      </n-layout-header>
      <n-layout-content content-style="padding: 16px;" :native-scrollbar="false">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NLayout, NLayoutSider, NLayoutHeader, NLayoutContent, NMenu, NButton,
  NSpace, NIcon, NBreadcrumb, NBreadcrumbItem, type MenuOption
} from 'naive-ui'

const router = useRouter()
const route = useRoute()
const activeKey = ref(route.name as string)
const isDark = ref(true)

const menuOptions: MenuOption[] = [
  { label: '仪表板', key: 'dashboard' },
  { label: '模型管理', key: 'models' },
  { label: '对话', key: 'chat' },
  { label: '语音合成', key: 'tts' },
  { label: '语音识别', key: 'asr' },
  { label: '使用统计', key: 'statistics' },
  { label: '文件管理', key: 'files' },
  { label: '设置', key: 'settings' },
]

const titleMap: Record<string, string> = {
  dashboard: '仪表板',
  models: '模型管理',
  chat: '对话',
  tts: '语音合成',
  asr: '语音识别',
  statistics: '使用统计',
  files: '文件管理',
  settings: '设置',
}

const currentTitle = computed(() => titleMap[route.name as string] || '')

const handleMenuChange = (key: string) => {
  router.push({ name: key })
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  // TODO: 实现主题切换
}
</script>

<style lang="scss" scoped>
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  
  h2 {
    font-size: 18px;
    color: #18a058;
    margin: 0;
  }
}
</style>
