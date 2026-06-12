<template>
  <div class="login-page dark">
    <div class="login-container">
      <div class="login-header">
        <div class="login-logo">
          <div class="logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1>MiMo Studio</h1>
        </div>
        <p class="login-subtitle">输入用户名和密码以继续。</p>
        <p class="login-hint">默认登录名: admin, 默认密码: admin123</p>
      </div>

      <form class="login-form" @submit.prevent="login">
        <div class="form-group">
          <input
            v-model="username"
            type="text"
            placeholder="用户名"
            autocomplete="username"
            class="login-input"
          />
        </div>

        <div class="form-group">
          <input
            v-model="password"
            type="password"
            placeholder="密码"
            autocomplete="current-password"
            class="login-input"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="loading">登录中...</span>
          <span v-else>登录</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const login = async () => {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  error.value = ''

  setTimeout(() => {
    if (username.value === 'admin' && password.value === 'admin123') {
      localStorage.setItem('mimo-token', 'authenticated')
      localStorage.setItem('mimo-user', username.value)
      router.push('/')
    } else {
      error.value = '用户名或密码错误'
    }
    loading.value = false
  }, 500)
}
</script>

<style lang="scss" scoped>
@import '@/styles/hermes-vars.scss';

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 360px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 32px;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .logo-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #4a90d9, #6ba3d6);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  h1 {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
}

.login-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 8px 0;
}

.login-hint {
  color: var(--text-muted);
  font-size: 12px;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.login-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color .15s;

  &:focus {
    border-color: var(--accent-muted);
  }

  &::placeholder {
    color: var(--text-muted);
  }
}

.error-message {
  color: var(--error);
  font-size: 13px;
  padding: 8px 12px;
  background: rgba(var(--error-rgb), .1);
  border-radius: 6px;
}

.login-btn {
  width: 100%;
  padding: 10px 16px;
  background: var(--accent-primary);
  color: var(--text-on-accent);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;

  &:hover {
    background: var(--accent-hover);
  }

  &:disabled {
    opacity: .6;
    cursor: not-allowed;
  }
}
</style>
