<template>
  <div class="login-page">
    <div class="login-container glass">
      <div class="login-header">
        <div class="login-logo">
          <div class="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 class="gradient-text">MiMo Studio</h1>
        </div>
        <p class="login-subtitle">输入用户名和密码以继续</p>
      </div>

      <form class="login-form" @submit.prevent="login">
        <div class="form-group">
          <label for="username">用户名</label>
          <div class="input-wrapper glass">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <input
              id="username"
              v-model="username"
              type="text"
              placeholder="请输入用户名"
              autocomplete="username"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <div class="input-wrapper glass">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="请输入密码"
              autocomplete="current-password"
            />
          </div>
        </div>

        <div v-if="error" class="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {{ error }}
        </div>

        <button type="submit" class="btn-login btn-gradient" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          <span v-else>登录</span>
        </button>

        <div class="login-hint">
          默认账号: admin / admin123
        </div>
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

  // 模拟登录
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
@import '@/styles/design-system.scss';

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
  padding: var(--space-5);
}

.login-container {
  width: 100%;
  max-width: 400px;
  padding: var(--space-8);
  border-radius: var(--radius-xl);
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.login-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);

  .logo-icon {
    width: 56px;
    height: 56px;
    background: var(--color-primary-gradient);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  h1 {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin: 0;
  }
}

.login-subtitle {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  label {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    font-weight: 500;
  }
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);

  &:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
  }

  svg {
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: var(--text-base);
    font-family: var(--font-sans);

    &::placeholder {
      color: var(--text-disabled);
    }
  }
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-error);
  font-size: var(--text-sm);
  padding: var(--space-3);
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-md);
}

.btn-login {
  width: 100%;
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-base);
  font-weight: 600;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.login-hint {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
</style>
