<template>
  <div class="statistics-page">
    <n-grid :cols="4" :x-gap="16" :y-gap="16">
      <n-grid-item>
        <n-card>
          <n-statistic label="总对话数" :value="stats.totalSessions">
            <template #prefix>
              <n-icon color="#18a058"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="总 Token 数" :value="stats.totalTokens">
            <template #prefix>
              <n-icon color="#2080f0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="预估费用" :value="stats.estimatedCost" prefix="¥" :precision="2" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="TTS 调用" :value="stats.ttsCalls">
            <template #prefix>
              <n-icon color="#f0a020"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-grid :cols="2" :x-gap="16" style="margin-top: 16px">
      <!-- 使用趋势图 -->
      <n-grid-item>
        <n-card title="使用趋势（近7天）">
          <div ref="trendChartRef" style="height: 300px"></div>
        </n-card>
      </n-grid-item>
      <!-- 模型使用分布图 -->
      <n-grid-item>
        <n-card title="模型使用分布">
          <div ref="pieChartRef" style="height: 300px"></div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- Token消耗趋势 -->
    <n-card title="Token 消耗趋势（近7天）" style="margin-top: 16px">
      <div ref="tokenChartRef" style="height: 250px"></div>
    </n-card>

    <!-- 最近活动 -->
    <n-card title="最近活动" style="margin-top: 16px">
      <n-list v-if="recentActivities.length > 0" bordered>
        <n-list-item v-for="(activity, index) in recentActivities" :key="index">
          <n-thing :title="activity.title" :description="activity.description">
            <template #header-extra>
              <n-text depth="3" style="font-size: 12px">{{ activity.time }}</n-text>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
      <div v-else style="text-align: center; padding: 40px; color: var(--n-text-color-3)">
        <n-empty description="暂无使用记录" />
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, shallowRef } from 'vue'
import {
  NGrid, NGridItem, NCard, NStatistic, NIcon, NText, NEmpty,
  NList, NListItem, NThing
} from 'naive-ui'
import { useStatisticsStore } from '@/stores/statistics'
import * as echarts from 'echarts/core'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GraphicComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 注册必要的组件
echarts.use([
  BarChart,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GraphicComponent,
  CanvasRenderer,
])

const statisticsStore = useStatisticsStore()

const trendChartRef = ref<HTMLElement | null>(null)
const pieChartRef = ref<HTMLElement | null>(null)
const tokenChartRef = ref<HTMLElement | null>(null)

const trendChart = shallowRef<echarts.ECharts | null>(null)
const pieChart = shallowRef<echarts.ECharts | null>(null)
const tokenChart = shallowRef<echarts.ECharts | null>(null)

const stats = computed(() => statisticsStore.stats)
const recentActivities = computed(() => statisticsStore.recentActivities)

const initCharts = () => {
  // 使用趋势图 - 柱状图
  if (trendChartRef.value) {
    trendChart.value = echarts.init(trendChartRef.value)
    const daily = statisticsStore.dailyUsage
    trendChart.value.setOption({
      tooltip: { trigger: 'axis' },
      legend: { 
        data: ['对话', '语音合成', '语音识别'], 
        textStyle: { color: '#aaa' },
        top: 0,
        right: 0,
      },
      grid: { left: '10%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: daily.map(d => d.date),
        axisLabel: { 
          color: '#aaa',
          rotate: 0,
          interval: 0,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#aaa' },
        minInterval: 1,
      },
      series: [
        { 
          name: '对话', 
          type: 'bar', 
          stack: 'total', 
          data: daily.map(d => d.chat), 
          itemStyle: { color: '#18a058' },
          barWidth: '40%',
        },
        { 
          name: '语音合成', 
          type: 'bar', 
          stack: 'total', 
          data: daily.map(d => d.tts), 
          itemStyle: { color: '#2080f0' },
        },
        { 
          name: '语音识别', 
          type: 'bar', 
          stack: 'total', 
          data: daily.map(d => d.asr), 
          itemStyle: { color: '#f0a020' },
        },
      ],
    })
  }

  // 模型使用分布 - 饼图
  if (pieChartRef.value) {
    pieChart.value = echarts.init(pieChartRef.value)
    const usage = statisticsStore.modelUsage
    if (usage.length > 0) {
      pieChart.value.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
        legend: { orient: 'vertical', left: 'left', textStyle: { color: '#aaa' } },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['60%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#1a1a2e', borderWidth: 2 },
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
          data: usage.map(u => ({ name: u.name, value: u.count })),
        }],
      })
    } else {
      pieChart.value.setOption({
        graphic: {
          type: 'text',
          left: 'center',
          top: 'center',
          style: { text: '暂无数据', fontSize: 16, fill: '#666' },
        },
      })
    }
  }

  // Token消耗趋势 - 折线图
  if (tokenChartRef.value) {
    tokenChart.value = echarts.init(tokenChartRef.value)
    const daily = statisticsStore.dailyUsage
    tokenChart.value.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: daily.map(d => d.date),
        axisLabel: { color: '#aaa' },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#aaa' },
      },
      series: [{
        name: 'Tokens',
        type: 'line',
        smooth: true,
        data: daily.map(d => d.tokens),
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 160, 88, 0.4)' },
              { offset: 1, color: 'rgba(24, 160, 88, 0.05)' },
            ],
          },
        },
        itemStyle: { color: '#18a058' },
      }],
    })
  }
}

const handleResize = () => {
  trendChart.value?.resize()
  pieChart.value?.resize()
  tokenChart.value?.resize()
}

onMounted(() => {
  statisticsStore.load()
  nextTick(() => {
    initCharts()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart.value?.dispose()
  pieChart.value?.dispose()
  tokenChart.value?.dispose()
})
</script>

<style lang="scss" scoped>
.statistics-page {
  :deep(.n-statistic-value__content) {
    font-variant-numeric: tabular-nums;
  }
}
</style>
