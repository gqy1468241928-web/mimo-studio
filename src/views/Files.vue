<template>
  <div class="files-page">
    <!-- 左侧：分类面板 -->
    <div class="files-sidebar">
      <n-card size="small" class="category-card">
        <template #header>
          <n-text strong>文件分类</n-text>
        </template>
        <n-menu
          :value="fileStore.categoryFilter"
          :options="categoryMenuOptions"
          @update:value="handleCategoryChange"
        />
        <n-divider />
        <n-statistic label="总文件数" :value="fileStore.files.length" />
        <n-statistic label="总大小" :value="formatSize(fileStore.totalSize)" style="margin-top: 8px" />
      </n-card>

      <!-- 文件夹列表 -->
      <n-card size="small" title="文件夹" style="margin-top: 12px">
        <n-menu
          :value="fileStore.currentFolder"
          :options="folderMenuOptions"
          @update:value="handleFolderChange"
        />
      </n-card>
    </div>

    <!-- 右侧：文件列表 -->
    <div class="files-main">
      <n-card>
        <template #header>
          <n-space align="center" justify="space-between" style="width: 100%">
            <n-space align="center">
              <n-text strong style="font-size: 18px">
                {{ currentCategoryLabel }}
              </n-text>
              <n-tag size="small" type="info">
                {{ fileStore.filteredFiles.length }} 个文件
              </n-tag>
            </n-space>
            <n-space>
              <n-input
                v-model:value="fileStore.searchQuery"
                placeholder="搜索文件名或标签..."
                clearable
                style="width: 240px"
              >
                <template #prefix>
                  <n-icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></n-icon>
                </template>
              </n-input>
              <n-select
                v-model:value="fileStore.sortBy"
                :options="sortOptions"
                style="width: 120px"
                size="small"
              />
              <n-button-group size="small">
                <n-button :type="fileStore.viewMode === 'list' ? 'primary' : 'default'" @click="fileStore.viewMode = 'list'">
                  <template #icon><n-icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></n-icon></template>
                </n-button>
                <n-button :type="fileStore.viewMode === 'grid' ? 'primary' : 'default'" @click="fileStore.viewMode = 'grid'">
                  <template #icon><n-icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></n-icon></template>
                </n-button>
              </n-button-group>
            </n-space>
          </n-space>
        </template>

        <!-- 操作栏 -->
        <n-space style="margin-bottom: 16px" align="center" justify="space-between">
          <n-space>
            <n-upload :custom-request="handleUpload" :show-file-list="false" multiple>
              <n-button type="primary">
                <template #icon>
                  <n-icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></n-icon>
                </template>
                上传文件
              </n-button>
            </n-upload>
            <n-upload :custom-request="handleUploadFolder" :show-file-list="false" directory>
              <n-button>
                <template #icon>
                  <n-icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></n-icon>
                </template>
                上传文件夹
              </n-button>
            </n-upload>
            <n-button @click="fileStore.load()">
              <template #icon>
                <n-icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></n-icon>
                </template>
              刷新
            </n-button>
          </n-space>
          <n-space v-if="fileStore.selectedFiles.length > 0">
            <n-text type="info">已选 {{ fileStore.selectedFiles.length }} 个</n-text>
            <n-button size="small" @click="batchDownload">批量下载</n-button>
            <n-button size="small" type="error" @click="batchDelete">批量删除</n-button>
            <n-button size="small" @click="fileStore.clearSelection()">取消选择</n-button>
          </n-space>
        </n-space>

        <!-- 拖拽上传区域 -->
        <div
          class="drop-zone"
          :class="{ 'drop-zone-active': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          v-if="fileStore.viewMode === 'list'"
        >
          <!-- 列表视图 -->
          <n-data-table
            v-if="fileStore.filteredFiles.length > 0"
            :columns="listColumns"
            :data="fileStore.filteredFiles"
            :row-key="(row: FileItem) => row.id"
            :checked-row-keys="fileStore.selectedFiles"
            @update:checked-row-keys="handleSelectionChange"
            :pagination="pagination"
            :row-class-name="rowClassName"
            size="small"
          />

          <!-- 空状态 -->
          <n-empty v-else description="暂无文件" style="padding: 60px 0">
            <template #extra>
              <n-text depth="3">拖拽文件到此处上传，或点击"上传文件"按钮</n-text>
            </template>
          </n-empty>
        </div>

        <!-- 网格视图 -->
        <div
          v-else
          class="grid-view drop-zone"
          :class="{ 'drop-zone-active': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <div v-if="fileStore.filteredFiles.length > 0" class="grid-container">
            <div
              v-for="file in paginatedGridFiles"
              :key="file.id"
              class="grid-item"
              :class="{ 'grid-item-selected': fileStore.selectedFiles.includes(file.id) }"
              @click="fileStore.toggleSelect(file.id)"
              @dblclick="previewFile(file)"
            >
              <div class="grid-item-icon">{{ getCategoryIcon(file.category) }}</div>
              <n-image
                v-if="file.category === 'image' && file.dataUrl"
                :src="file.dataUrl"
                :width="80"
                :height="80"
                object-fit="cover"
                style="border-radius: 4px; margin-bottom: 8px"
                :preview-disabled="true"
              />
              <n-text class="grid-item-name" :title="file.name">{{ file.name }}</n-text>
              <n-text depth="3" style="font-size: 11px">{{ formatSize(file.size) }}</n-text>
            </div>
          </div>
          <n-empty v-else description="暂无文件" style="padding: 60px 0" />
        </div>
      </n-card>
    </div>

    <!-- 文件预览弹窗 -->
    <n-modal v-model:show="showPreview" preset="card" :title="previewFileItem?.name" style="width: 700px; max-height: 80vh">
      <template v-if="previewFileItem">
        <n-scrollbar style="max-height: 60vh">
          <n-descriptions bordered :column="2" size="small">
            <n-descriptions-item label="文件名">{{ previewFileItem.name }}</n-descriptions-item>
            <n-descriptions-item label="大小">{{ formatSize(previewFileItem.size) }}</n-descriptions-item>
            <n-descriptions-item label="类型">{{ previewFileItem.type }}</n-descriptions-item>
            <n-descriptions-item label="分类">{{ getCategoryLabel(previewFileItem.category) }}</n-descriptions-item>
            <n-descriptions-item label="修改时间">{{ previewFileItem.modified }}</n-descriptions-item>
            <n-descriptions-item label="添加时间">{{ previewFileItem.addedAt }}</n-descriptions-item>
            <n-descriptions-item label="文件夹">{{ previewFileItem.folder }}</n-descriptions-item>
            <n-descriptions-item label="标签">
              <n-space v-if="previewFileItem.tags.length > 0">
                <n-tag v-for="tag in previewFileItem.tags" :key="tag" size="small" closable @close="fileStore.removeTag(previewFileItem.id, tag)">{{ tag }}</n-tag>
              </n-space>
              <n-text v-else depth="3">无</n-text>
            </n-descriptions-item>
          </n-descriptions>

          <!-- 图片预览 -->
          <div v-if="previewFileItem.category === 'image' && previewFileItem.dataUrl" style="margin-top: 16px; text-align: center">
            <n-image :src="previewFileItem.dataUrl" :max-width="600" />
          </div>

          <!-- 文本/代码预览 -->
          <div v-else-if="previewFileItem.content" style="margin-top: 16px">
            <n-code :code="previewFileItem.content" :language="getPreviewLanguage(previewFileItem)" />
          </div>

          <!-- 其他类型 -->
          <div v-else style="margin-top: 16px; text-align: center; padding: 40px 0">
            <n-text depth="3">此文件类型不支持预览</n-text>
          </div>

          <!-- 标签管理 -->
          <n-divider />
          <n-space align="center">
            <n-text strong>标签：</n-text>
            <n-input
              v-model:value="newTag"
              placeholder="添加标签"
              size="small"
              style="width: 160px"
              @keyup.enter="addTagToPreview"
            />
            <n-button size="small" @click="addTagToPreview">添加</n-button>
          </n-space>
        </n-scrollbar>
      </template>
      <template #action>
        <n-space>
          <n-button @click="showPreview = false">关闭</n-button>
          <n-button type="info" @click="shareToChat(previewFileItem!)">分享到对话</n-button>
          <n-button type="primary" @click="fileStore.downloadFile(previewFileItem!)">下载</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 重命名弹窗 -->
    <n-modal v-model:show="showRename" preset="dialog" title="重命名">
      <n-input v-model:value="renameName" placeholder="新文件名" @keyup.enter="confirmRename" />
      <template #action>
        <n-button @click="showRename = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>

    <!-- 移动弹窗 -->
    <n-modal v-model:show="showMove" preset="dialog" title="移动到文件夹">
      <n-select v-model:value="moveTarget" :options="moveFolderOptions" placeholder="选择文件夹" />
      <template #action>
        <n-button @click="showMove = false">取消</n-button>
        <n-button type="primary" @click="confirmMove">确定</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import {
  NCard, NSpace, NButton, NIcon, NUpload, NDataTable, NModal,
  NDescriptions, NDescriptionsItem, NCode, NEmpty, NText, NTag,
  NInput, NMenu, NSelect, NDivider, NStatistic, NButtonGroup,
  NImage, NScrollbar, useMessage
} from 'naive-ui'
import type { DataTableColumns, MenuOption } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useFileStore, formatSize, FILE_CATEGORIES } from '@/stores/file'
import type { FileItem, FileCategory } from '@/stores/file'

const fileStore = useFileStore()
const router = useRouter()
const message = useMessage()

// Drag state
const isDragging = ref(false)

// Preview
const showPreview = ref(false)
const previewFileItem = ref<FileItem | null>(null)
const newTag = ref('')

// Rename
const showRename = ref(false)
const renameTarget = ref<FileItem | null>(null)
const renameName = ref('')

// Move
const showMove = ref(false)
const moveTargetId = ref('')
const moveTarget = ref('/')

// Pagination
const pagination = ref({ page: 1, pageSize: 20 })

// Sort options
const sortOptions = [
  { label: '添加时间', value: 'addedAt' },
  { label: '文件名', value: 'name' },
  { label: '大小', value: 'size' },
  { label: '修改时间', value: 'modified' },
]

// Category menu
const categoryMenuOptions = computed<MenuOption[]>(() =>
  FILE_CATEGORIES.map(c => ({
    key: c.key,
    label: `${c.icon} ${c.label} (${fileStore.categoryCounts[c.key as FileCategory] ?? fileStore.files.length})`,
    disabled: c.key !== 'all' && (fileStore.categoryCounts[c.key as FileCategory] ?? 0) === 0,
  }))
)

// Folder menu
const folderMenuOptions = computed<MenuOption[]>(() => {
  const options: MenuOption[] = [{ key: '/', label: '📁 根目录' }]
  for (const folder of fileStore.folders) {
    if (folder !== '/') {
      const count = fileStore.files.filter(f => f.folder === folder).length
      options.push({ key: folder, label: `📂 ${folder} (${count})` })
    }
  }
  return options
})

// Move folder options
const moveFolderOptions = computed(() => {
  const options = [{ label: '根目录', value: '/' }]
  for (const folder of fileStore.folders) {
    if (folder !== '/') {
      options.push({ label: folder, value: folder })
    }
  }
  return options
})

// Current category label
const currentCategoryLabel = computed(() => {
  const cat = FILE_CATEGORIES.find(c => c.key === fileStore.categoryFilter)
  return cat ? `${cat.icon} ${cat.label}` : '📁 全部文件'
})

// Grid pagination
const paginatedGridFiles = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  return fileStore.filteredFiles.slice(start, start + pagination.value.pageSize)
})

// Table columns
const listColumns: DataTableColumns<FileItem> = [
  { type: 'selection' },
  {
    title: '',
    key: 'icon',
    width: 40,
    render: (row) => h('span', { style: 'font-size: 18px' }, getCategoryIcon(row.category)),
  },
  {
    title: '文件名',
    key: 'name',
    ellipsis: { tooltip: true },
    sorter: true,
    render: (row) => h('span', {
      style: 'cursor: pointer; color: var(--n-text-color)',
      onClick: () => previewFile(row),
    }, row.name),
  },
  {
    title: '大小',
    key: 'size',
    width: 100,
    sorter: (a, b) => a.size - b.size,
    render: (row) => formatSize(row.size),
  },
  {
    title: '类型',
    key: 'category',
    width: 80,
    render: (row) => h(NTag, { size: 'small', bordered: false }, { default: () => getCategoryLabel(row.category) }),
  },
  {
    title: '标签',
    key: 'tags',
    width: 150,
    render: (row) => row.tags.length > 0
      ? h(NSpace, { size: 4 }, { default: () => row.tags.map(t => h(NTag, { size: 'tiny', bordered: false }, { default: () => t })) })
      : h(NText, { depth: 3 }, { default: () => '-' }),
  },
  {
    title: '添加时间',
    key: 'addedAt',
    width: 160,
    sorter: (a, b) => a.addedAt.localeCompare(b.addedAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) => h(NSpace, { size: 4 }, {
      default: () => [
        h(NButton, { size: 'tiny', quaternary: true, type: 'info', onClick: () => previewFile(row) }, { default: () => '预览' }),
        h(NButton, { size: 'tiny', quaternary: true, type: 'primary', onClick: () => fileStore.downloadFile(row) }, { default: () => '下载' }),
        h(NButton, { size: 'tiny', quaternary: true, onClick: () => startRename(row) }, { default: () => '重命名' }),
        h(NButton, { size: 'tiny', quaternary: true, type: 'error', onClick: () => confirmDelete(row) }, { default: () => '删除' }),
      ]
    }),
  },
]

// Helpers
function getCategoryIcon(category: FileCategory): string {
  const icons: Record<FileCategory, string> = {
    document: '📄', image: '🖼️', audio: '🎵', video: '🎬',
    code: '💻', archive: '📦', other: '📎',
  }
  return icons[category] || '📎'
}

function getCategoryLabel(category: FileCategory): string {
  const labels: Record<FileCategory, string> = {
    document: '文档', image: '图片', audio: '音频', video: '视频',
    code: '代码', archive: '压缩包', other: '其他',
  }
  return labels[category] || '其他'
}

function getPreviewLanguage(file: FileItem): string {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  const map: Record<string, string> = {
    '.js': 'javascript', '.ts': 'typescript', '.py': 'python', '.java': 'java',
    '.c': 'c', '.cpp': 'cpp', '.cs': 'csharp', '.go': 'go', '.rb': 'ruby',
    '.rs': 'rust', '.swift': 'swift', '.kt': 'kotlin', '.php': 'php',
    '.html': 'html', '.css': 'css', '.scss': 'scss', '.json': 'json',
    '.xml': 'xml', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
    '.sh': 'bash', '.sql': 'sql', '.vue': 'vue', '.jsx': 'jsx', '.tsx': 'tsx',
    '.md': 'markdown', '.txt': 'text',
  }
  return map[ext] || 'text'
}

function rowClassName(_row: FileItem, index: number): string {
  return index % 2 === 0 ? 'row-even' : 'row-odd'
}

// Handlers
function handleCategoryChange(key: string) {
  fileStore.categoryFilter = key as FileCategory | 'all'
}

function handleFolderChange(key: string) {
  fileStore.currentFolder = key
}

function handleSelectionChange(keys: Array<string | number>) {
  fileStore.selectedFiles = keys.map(k => String(k))
}

async function handleUpload({ file }: any) {
  const newFiles = await fileStore.addFiles([file.file as File])
  if (newFiles.length > 0 && newFiles[0]) {
    message.success(`已上传: ${newFiles[0]!.name}`)
  }
}

async function handleUploadFolder({ file }: any) {
  const newFiles = await fileStore.addFiles([file.file as File])
  if (newFiles.length > 0 && newFiles[0]) {
    message.success(`已上传: ${newFiles[0]!.name}`)
  }
}

async function handleDrop(e: DragEvent) {
  isDragging.value = false
  const items = e.dataTransfer?.items
  if (items) {
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item) continue
      const entry = item.webkitGetAsEntry?.()
      if (entry) {
        if (entry.isFile) {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
    }
    if (files.length > 0) {
      const newFiles = await fileStore.addFiles(files)
      message.success(`已上传 ${newFiles.length} 个文件`)
    }
  }
}

function previewFile(file: FileItem) {
  previewFileItem.value = file
  showPreview.value = true
}

function addTagToPreview() {
  if (previewFileItem.value && newTag.value.trim()) {
    fileStore.addTag(previewFileItem.value.id, newTag.value.trim())
    newTag.value = ''
    message.success('标签已添加')
  }
}

function shareToChat(file: FileItem) {
  const content = fileStore.getFileContent(file)
  // Navigate to chat and pass file content
  router.push({ path: '/chat', query: { fileContent: content, fileName: file.name } })
  showPreview.value = false
  message.success('已分享到对话')
}

function startRename(file: FileItem) {
  renameTarget.value = file
  renameName.value = file.name
  showRename.value = true
}

function confirmRename() {
  if (renameTarget.value && renameName.value.trim()) {
    fileStore.renameFile(renameTarget.value.id, renameName.value.trim())
    showRename.value = false
    message.success('重命名成功')
  }
}

function confirmDelete(file: FileItem) {
  fileStore.deleteFile(file.id)
  message.success(`已删除: ${file.name}`)
}

function batchDelete() {
  const count = fileStore.selectedFiles.length
  fileStore.deleteFiles([...fileStore.selectedFiles])
  message.success(`已删除 ${count} 个文件`)
}

function batchDownload() {
  for (const id of fileStore.selectedFiles) {
    const file = fileStore.files.find(f => f.id === id)
    if (file) fileStore.downloadFile(file)
  }
  message.success(`开始下载 ${fileStore.selectedFiles.length} 个文件`)
}

function confirmMove() {
  if (moveTargetId.value && moveTarget.value) {
    fileStore.moveFile(moveTargetId.value, moveTarget.value)
    showMove.value = false
    message.success('移动成功')
  }
}
</script>

<style scoped>
.files-page {
  display: flex;
  gap: 16px;
  height: calc(100vh - 140px);
}

.files-sidebar {
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
}

.files-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.category-card {
  min-height: 200px;
}

.drop-zone {
  min-height: 300px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.drop-zone-active {
  background-color: rgba(0, 122, 255, 0.05);
  border: 2px dashed rgba(0, 122, 255, 0.3);
}

.grid-view {
  padding: 8px;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  padding: 8px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
}

.grid-item:hover {
  background: rgba(0, 122, 255, 0.05);
}

.grid-item-selected {
  background: rgba(0, 122, 255, 0.1);
  border-color: rgba(0, 122, 255, 0.3);
}

.grid-item-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.grid-item-name {
  font-size: 12px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

:deep(.row-even) {
  background-color: rgba(0, 0, 0, 0.01);
}

:deep(.row-odd) {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>
