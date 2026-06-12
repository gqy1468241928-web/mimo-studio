<template>
  <n-config-provider :theme="theme">
    <n-global-style />
    <n-message-provider>
      <n-notification-provider>
        <router-view />
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  NConfigProvider,
  NGlobalStyle,
  NMessageProvider,
  NNotificationProvider,
  darkTheme,
  type GlobalTheme
} from 'naive-ui'

const theme = ref<GlobalTheme | null>(darkTheme)
</script>

<style lang="scss">
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
</style>
