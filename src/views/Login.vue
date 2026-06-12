<template>
  <div class="login-page">
    <n-card title="MiMo 工作台" style="width: 400px">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="用户名">
          <n-input v-model:value="username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="密码">
          <n-input v-model:value="password" type="password" placeholder="请输入密码" show-password-on="click" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" block @click="login" :loading="loading">登录</n-button>
        </n-form-item>
        <div style="text-align: center; color: var(--n-text-color-3); font-size: 12px;">
          默认账号：admin / admin123
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NForm, NFormItem, NInput, NButton } from 'naive-ui'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)

const login = () => {
  if (!username.value || !password.value) {
    alert('请输入用户名和密码')
    return
  }

  loading.value = true

  // 简单验证（后续可改为真实认证）
  setTimeout(() => {
    if (username.value === 'admin' && password.value === 'admin123') {
      localStorage.setItem('mimo-token', 'authenticated')
      localStorage.setItem('mimo-user', username.value)
      router.push('/')
    } else {
      alert('用户名或密码错误')
    }
    loading.value = false
  }, 500)
}
</script>

<style lang="scss" scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1e2e;
}
</style>
