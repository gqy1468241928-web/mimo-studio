import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/Dashboard.vue')
        },
        {
          path: 'models',
          name: 'models',
          component: () => import('@/views/Models.vue')
        },
        {
          path: 'chat',
          name: 'chat',
          component: () => import('@/views/Chat.vue')
        },
        {
          path: 'tts',
          name: 'tts',
          component: () => import('@/views/TTS.vue')
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/Settings.vue')
        },
        {
          path: 'statistics',
          name: 'statistics',
          component: () => import('@/views/Statistics.vue')
        },
        {
          path: 'files',
          name: 'files',
          component: () => import('@/views/Files.vue')
        }
      ]
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('mimo-token')

  if (to.meta.requiresAuth !== false && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
