import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface FileItem {
  id: string
  name: string
  size: number
  type: string
  category: FileCategory
  modified: string
  addedAt: string
  folder: string
  content?: string
  dataUrl?: string
  tags: string[]
}

export type FileCategory = 'document' | 'image' | 'audio' | 'video' | 'code' | 'archive' | 'other'

export interface FileFolder {
  name: string
  path: string
  children: FileFolder[]
  fileCount: number
}

const CATEGORY_MAP: Record<string, FileCategory> = {
  'text/plain': 'document',
  'text/markdown': 'document',
  'application/json': 'code',
  'text/html': 'code',
  'text/css': 'code',
  'text/javascript': 'code',
  'application/javascript': 'code',
  'text/typescript': 'code',
  'application/typescript': 'code',
  'text/x-python': 'code',
  'text/x-java': 'code',
  'text/x-c': 'code',
  'text/x-csharp': 'code',
  'text/x-go': 'code',
  'text/x-ruby': 'code',
  'text/x-shellscript': 'code',
  'application/xml': 'code',
  'text/xml': 'code',
  'text/yaml': 'code',
  'application/x-yaml': 'code',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/svg+xml': 'image',
  'image/webp': 'image',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/flac': 'audio',
  'audio/mp3': 'audio',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/avi': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/gzip': 'archive',
  'application/x-tar': 'archive',
}

const EXTENSION_CATEGORY_MAP: Record<string, FileCategory> = {
  '.txt': 'document', '.md': 'document', '.doc': 'document', '.docx': 'document',
  '.pdf': 'document', '.rtf': 'document', '.xls': 'document', '.xlsx': 'document',
  '.ppt': 'document', '.pptx': 'document', '.csv': 'document',
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image',
  '.svg': 'image', '.webp': 'image', '.bmp': 'image', '.ico': 'image',
  '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.flac': 'audio', '.aac': 'audio',
  '.mp4': 'video', '.avi': 'video', '.mov': 'video', '.mkv': 'video', '.webm': 'video',
  '.zip': 'archive', '.rar': 'archive', '.7z': 'archive', '.tar': 'archive', '.gz': 'archive',
  '.js': 'code', '.ts': 'code', '.py': 'code', '.java': 'code', '.c': 'code',
  '.cpp': 'code', '.h': 'code', '.cs': 'code', '.go': 'code', '.rb': 'code',
  '.rs': 'code', '.swift': 'code', '.kt': 'code', '.php': 'code',
  '.html': 'code', '.css': 'code', '.scss': 'code', '.less': 'code',
  '.json': 'code', '.xml': 'code', '.yaml': 'code', '.yml': 'code', '.toml': 'code',
  '.sh': 'code', '.bash': 'code', '.zsh': 'code', '.bat': 'code', '.ps1': 'code',
  '.sql': 'code', '.graphql': 'code', '.vue': 'code', '.jsx': 'code', '.tsx': 'code',
}

function guessCategory(mimeType: string, fileName: string): FileCategory {
  if (CATEGORY_MAP[mimeType]) return CATEGORY_MAP[mimeType]
  const ext = fileName.lastIndexOf('.') >= 0
    ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
    : ''
  return EXTENSION_CATEGORY_MAP[ext] || 'other'
}

const STORAGE_KEY = 'mimo-files'

export const useFileStore = defineStore('file', () => {
  const files = ref<FileItem[]>([])
  const currentFolder = ref('/')
  const selectedFiles = ref<string[]>([])
  const searchQuery = ref('')
  const categoryFilter = ref<FileCategory | 'all'>('all')
  const sortBy = ref<'name' | 'size' | 'modified' | 'addedAt'>('addedAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')
  const viewMode = ref<'list' | 'grid'>('list')

  // Load from localStorage
  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        files.value = JSON.parse(raw)
      }
    } catch {
      files.value = []
    }
  }

  // Save to localStorage
  const save = () => {
    try {
      // Don't persist dataUrl and content for large files (keep metadata only)
      const toSave = files.value.map(f => ({
        ...f,
        content: f.size > 102400 ? undefined : f.content,
        dataUrl: f.size > 102400 ? undefined : f.dataUrl,
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch {
      // localStorage full — try without content/dataUrl
      try {
        const toSave = files.value.map(f => ({ ...f, content: undefined, dataUrl: undefined }))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
      } catch {
        // Still full, nothing we can do
      }
    }
  }

  // Add file(s)
  const addFiles = async (fileList: FileList | File[], folder?: string) => {
    const targetFolder = folder || currentFolder.value
    const newFiles: FileItem[] = []

    for (const file of Array.from(fileList)) {
      const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      const category = guessCategory(file.type, file.name)

      const fileItem: FileItem = {
        id,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        category,
        modified: new Date(file.lastModified).toLocaleString('zh-CN'),
        addedAt: new Date().toLocaleString('zh-CN'),
        folder: targetFolder,
        tags: [],
      }

      // Read content for text-like files
      if (category === 'code' || category === 'document' || file.type.startsWith('text/')) {
        if (file.size <= 512 * 1024) {
          try {
            fileItem.content = await file.text()
          } catch {
            // ignore
          }
        }
      }

      // Read dataUrl for images
      if (category === 'image' && file.size <= 5 * 1024 * 1024) {
        try {
          fileItem.dataUrl = await readFileAsDataUrl(file)
        } catch {
          // ignore
        }
      }

      newFiles.push(fileItem)
    }

    files.value.push(...newFiles)
    save()
    return newFiles
  }

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Delete file(s)
  const deleteFiles = (ids: string[]) => {
    files.value = files.value.filter(f => !ids.includes(f.id))
    selectedFiles.value = selectedFiles.value.filter(id => !ids.includes(id))
    save()
  }

  // Delete single file
  const deleteFile = (id: string) => {
    deleteFiles([id])
  }

  // Rename file
  const renameFile = (id: string, newName: string) => {
    const file = files.value.find(f => f.id === id)
    if (file) {
      file.name = newName
      file.modified = new Date().toLocaleString('zh-CN')
      save()
    }
  }

  // Move file to folder
  const moveFile = (id: string, targetFolder: string) => {
    const file = files.value.find(f => f.id === id)
    if (file) {
      file.folder = targetFolder
      save()
    }
  }

  // Create folder (adds a placeholder file to register the folder)
  const createFolder = (folderName: string) => {
    const folderPath = folderName.startsWith('/') ? folderName : `/${folderName}`
    // Check if folder already exists
    if (files.value.some(f => f.folder === folderPath)) {
      return false // Folder already exists
    }
    // Create a placeholder file to register the folder
    const placeholder: FileItem = {
      id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: '.folder',
      size: 0,
      type: 'application/x-folder',
      category: 'other',
      modified: new Date().toLocaleString('zh-CN'),
      addedAt: new Date().toLocaleString('zh-CN'),
      folder: folderPath,
      tags: [],
    }
    files.value.push(placeholder)
    save()
    return true
  }

  // Delete folder and all files in it
  const deleteFolder = (folderPath: string) => {
    files.value = files.value.filter(f => f.folder !== folderPath)
    selectedFiles.value = selectedFiles.value.filter(id => {
      const file = files.value.find(f => f.id === id)
      return file && file.folder !== folderPath
    })
    save()
  }

  // Add tag
  const addTag = (id: string, tag: string) => {
    const file = files.value.find(f => f.id === id)
    if (file && !file.tags.includes(tag)) {
      file.tags.push(tag)
      save()
    }
  }

  // Remove tag
  const removeTag = (id: string, tag: string) => {
    const file = files.value.find(f => f.id === id)
    if (file) {
      file.tags = file.tags.filter(t => t !== tag)
      save()
    }
  }

  // Clear all files
  const clearAll = () => {
    files.value = []
    selectedFiles.value = []
    save()
  }

  // Get unique folders
  const folders = computed(() => {
    const folderSet = new Set(files.value.map(f => f.folder))
    return Array.from(folderSet).sort()
  })

  // Filtered and sorted files
  const filteredFiles = computed(() => {
    let result = [...files.value]

    // Filter by folder
    if (currentFolder.value !== '/') {
      result = result.filter(f => f.folder === currentFolder.value)
    }

    // Filter by category
    if (categoryFilter.value !== 'all') {
      result = result.filter(f => f.category === categoryFilter.value)
    }

    // Filter by search
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortBy.value) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'size': cmp = a.size - b.size; break
        case 'modified': cmp = a.modified.localeCompare(b.modified); break
        case 'addedAt': cmp = a.addedAt.localeCompare(b.addedAt); break
      }
      return sortOrder.value === 'asc' ? cmp : -cmp
    })

    return result
  })

  // Category counts
  const categoryCounts = computed(() => {
    const counts: Record<FileCategory, number> = {
      document: 0, image: 0, audio: 0, video: 0, code: 0, archive: 0, other: 0
    }
    for (const f of files.value) {
      counts[f.category]++
    }
    return counts
  })

  // Total size
  const totalSize = computed(() => files.value.reduce((sum, f) => sum + f.size, 0))

  // Selection
  const toggleSelect = (id: string) => {
    const idx = selectedFiles.value.indexOf(id)
    if (idx >= 0) {
      selectedFiles.value.splice(idx, 1)
    } else {
      selectedFiles.value.push(id)
    }
  }

  const selectAll = () => {
    selectedFiles.value = filteredFiles.value.map(f => f.id)
  }

  const clearSelection = () => {
    selectedFiles.value = []
  }

  const isAllSelected = computed(() =>
    filteredFiles.value.length > 0 && selectedFiles.value.length === filteredFiles.value.length
  )

  const isIndeterminate = computed(() =>
    selectedFiles.value.length > 0 && selectedFiles.value.length < filteredFiles.value.length
  )

  // Download file
  const downloadFile = (file: FileItem) => {
    const content = file.content || file.dataUrl || `File: ${file.name}`
    const blob = new Blob([content], { type: file.type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Get file content for sharing to chat
  const getFileContent = (file: FileItem): string => {
    if (file.content) return file.content
    if (file.dataUrl) return `[图片: ${file.name}]`
    return `[文件: ${file.name} (${formatSize(file.size)})]`
  }

  // Init
  load()

  return {
    files,
    currentFolder,
    selectedFiles,
    searchQuery,
    categoryFilter,
    sortBy,
    sortOrder,
    viewMode,
    filteredFiles,
    folders,
    categoryCounts,
    totalSize,
    isAllSelected,
    isIndeterminate,
    addFiles,
    deleteFile,
    deleteFiles,
    renameFile,
    moveFile,
    createFolder,
    deleteFolder,
    addTag,
    removeTag,
    clearAll,
    toggleSelect,
    selectAll,
    clearSelection,
    downloadFile,
    getFileContent,
    save,
    load,
  }
})

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const FILE_CATEGORIES: { key: FileCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: '全部文件', icon: '📁' },
  { key: 'document', label: '文档', icon: '📄' },
  { key: 'image', label: '图片', icon: '🖼️' },
  { key: 'audio', label: '音频', icon: '🎵' },
  { key: 'video', label: '视频', icon: '🎬' },
  { key: 'code', label: '代码', icon: '💻' },
  { key: 'archive', label: '压缩包', icon: '📦' },
  { key: 'other', label: '其他', icon: '📎' },
]
