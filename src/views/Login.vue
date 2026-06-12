<template>
  <div class="login-page">
    <n-card title="MiMo 工作台" style="width: 400px">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="用户名">
          <n-input v-model:value="username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="密码">
          <n-input v-model:value="password" type="password" placeholder="请输入密码" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" block @click="login">登录</n-button>
        </n-form-item>
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

const login = () => {
  // TODO: 实现登录逻辑
  router.push('/')
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
