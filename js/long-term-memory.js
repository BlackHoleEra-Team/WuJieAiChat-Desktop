/**
 * Copyright (C) 2026 BlackHoleEra-Team All Rights Reserved
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use of this software is strictly prohibited.
 */

const { ipcRenderer } = require('electron')

// 状态变量
let currentContactId = null
let currentContact = null
let memories = []
let currentMemoryId = null

// DOM 元素
const elements = {
  contactAvatar: document.getElementById('contact-avatar-img'),
  contactName: document.getElementById('contact-name'),
  memoryCount: document.getElementById('memory-count'),
  memoryList: document.getElementById('memory-list'),
  emptyState: document.getElementById('empty-state'),
  minimizeBtn: document.getElementById('minimizeBtn'),
  closeBtn: document.getElementById('closeBtn'),
  memoryDetailModal: document.getElementById('memory-detail-modal'),
  detailSummary: document.getElementById('detail-summary'),
  detailMessages: document.getElementById('detail-messages'),
  modalClose: document.getElementById('modal-close'),
  detailCloseBtn: document.getElementById('detail-close-btn'),
  detailDeleteBtn: document.getElementById('detail-delete-btn'),
  confirmModal: document.getElementById('confirm-modal'),
  confirmCancel: document.getElementById('confirm-cancel'),
  confirmDelete: document.getElementById('confirm-delete'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message')
}

// 初始化
async function init() {
  // 获取 URL 参数
  const urlParams = new URLSearchParams(window.location.search)
  currentContactId = urlParams.get('contactId')

  if (!currentContactId) {
    showToast('未指定联系人')
    return
  }

  // 初始化主题
  await initTheme()

  // 加载联系人信息和长期记忆
  await loadContactInfo()
  await loadMemories()

  // 绑定事件
  bindEvents()
}

// 初始化主题
async function initTheme() {
  try {
    const theme = await ipcRenderer.invoke('get-app-theme')
    applyTheme(theme)

    ipcRenderer.on('theme-changed', (event, newTheme) => {
      applyTheme(newTheme)
    })
  } catch (error) {
    console.error('初始化主题失败:', error)
  }
}

// 应用主题
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode')
  } else {
    document.body.classList.remove('dark-mode')
  }
}

// 加载联系人信息
async function loadContactInfo() {
  try {
    const contacts = await ipcRenderer.invoke('get-contacts')
    currentContact = contacts.find(c => c.id === currentContactId)

    if (currentContact) {
      elements.contactName.textContent = currentContact.nickname || currentContact.name || '未知联系人'

      // 加载头像
      if (currentContact.avatar) {
        const avatarPath = await resolveAvatarPath(currentContact.avatar)
        elements.contactAvatar.src = avatarPath
      }
    }
  } catch (error) {
    console.error('加载联系人信息失败:', error)
  }
}

// 解析头像路径
async function resolveAvatarPath(avatarPath) {
  if (!avatarPath) return 'images/app-icon.png'

  if (avatarPath.startsWith('UserData/')) {
    const userDataDirs = await ipcRenderer.invoke('get-user-data-dirs')
    return `file://${userDataDirs.userDataPath.replace(/\\/g, '/')}/${avatarPath.substring(9)}`
  }

  if (avatarPath.startsWith('file://')) {
    return avatarPath
  }

  return avatarPath
}

// 加载长期记忆
async function loadMemories() {
  try {
    const result = await ipcRenderer.invoke('get-long-term-memories', currentContactId)

    if (result.success) {
      memories = result.memories || []
      updateMemoryCount()
      renderMemories()
    } else {
      showToast('加载长期记忆失败: ' + result.error)
    }
  } catch (error) {
    console.error('加载长期记忆失败:', error)
    showToast('加载长期记忆失败')
  }
}

// 更新记忆数量
function updateMemoryCount() {
  elements.memoryCount.textContent = `共 ${memories.length} 条记忆`
}

// 渲染记忆列表
function renderMemories() {
  if (memories.length === 0) {
    elements.memoryList.innerHTML = ''
    elements.emptyState.classList.add('show')
    return
  }

  elements.emptyState.classList.remove('show')

  // 按时间倒序排列
  const sortedMemories = [...memories].sort((a, b) => {
    return new Date(b.createTime) - new Date(a.createTime)
  })

  const html = sortedMemories.map(memory => {
    const createTime = new Date(memory.createTime).toLocaleString('zh-CN')
    const messageCount = memory.originalMessages ? memory.originalMessages.length : 0

    return `
      <div class="memory-item" data-id="${memory.id}">
        <div class="memory-header">
          <div class="memory-time">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ${createTime}
          </div>
          <div class="memory-actions">
            <button class="memory-action-btn delete" data-id="${memory.id}" title="删除">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="memory-summary">${escapeHtml(memory.summary)}</div>
        <div class="memory-footer">
          <span class="memory-message-count">${messageCount} 条原始消息</span>
          <button class="memory-view-btn" data-id="${memory.id}">
            查看详情
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    `
  }).join('')

  elements.memoryList.innerHTML = html

  // 绑定事件
  bindMemoryItemEvents()
}

// 绑定记忆项事件
function bindMemoryItemEvents() {
  // 点击查看详情
  document.querySelectorAll('.memory-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const memoryId = parseInt(btn.dataset.id)
      showMemoryDetail(memoryId)
    })
  })

  // 点击整个卡片查看详情
  document.querySelectorAll('.memory-item').forEach(item => {
    item.addEventListener('click', () => {
      const memoryId = parseInt(item.dataset.id)
      showMemoryDetail(memoryId)
    })
  })

  // 删除按钮
  document.querySelectorAll('.memory-action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const memoryId = parseInt(btn.dataset.id)
      showDeleteConfirmation(memoryId)
    })
  })
}

// 显示记忆详情
function showMemoryDetail(memoryId) {
  const memory = memories.find(m => m.id === memoryId)
  if (!memory) return

  currentMemoryId = memoryId

  // 显示AI总结
  elements.detailSummary.textContent = memory.summary

  // 显示原始消息
  const messagesHtml = memory.originalMessages.map(msg => {
    const roleClass = msg.type === 'user' ? 'user' : 'ai'
    const roleText = msg.type === 'user' ? '用户' : 'AI'

    return `
      <div class="message-item-detail ${roleClass}">
        <span class="message-role">${roleText}</span>
        <div class="message-content-detail">${escapeHtml(msg.content)}</div>
      </div>
    `
  }).join('')

  elements.detailMessages.innerHTML = messagesHtml

  // 显示模态框
  elements.memoryDetailModal.classList.add('show')
}

// 关闭记忆详情
function closeMemoryDetail() {
  elements.memoryDetailModal.classList.remove('show')
  currentMemoryId = null
}

// 显示删除确认
function showDeleteConfirmation(memoryId) {
  currentMemoryId = memoryId
  elements.confirmModal.classList.add('show')
}

// 关闭删除确认
function closeConfirmModal() {
  elements.confirmModal.classList.remove('show')
  currentMemoryId = null
}

// 删除记忆
async function deleteMemory() {
  if (!currentMemoryId) return

  try {
    const result = await ipcRenderer.invoke('delete-long-term-memory', currentContactId, currentMemoryId)

    if (result.success) {
      showToast('记忆已删除')
      // 重新加载记忆列表
      await loadMemories()
      // 关闭所有模态框
      closeConfirmModal()
      closeMemoryDetail()
    } else {
      showToast('删除失败: ' + result.error)
    }
  } catch (error) {
    console.error('删除记忆失败:', error)
    showToast('删除记忆失败')
  }
}

// 绑定事件
function bindEvents() {
  // 窗口控制
  elements.minimizeBtn.addEventListener('click', () => {
    ipcRenderer.send('minimize-chat-history-window')
  })

  elements.closeBtn.addEventListener('click', () => {
    ipcRenderer.send('close-chat-history-window')
  })

  // 模态框关闭
  elements.modalClose.addEventListener('click', closeMemoryDetail)
  elements.detailCloseBtn.addEventListener('click', closeMemoryDetail)

  // 详情页删除按钮
  elements.detailDeleteBtn.addEventListener('click', () => {
    if (currentMemoryId) {
      showDeleteConfirmation(currentMemoryId)
    }
  })

  // 确认删除
  elements.confirmDelete.addEventListener('click', deleteMemory)
  elements.confirmCancel.addEventListener('click', closeConfirmModal)

  // 点击模态框背景关闭
  elements.memoryDetailModal.addEventListener('click', (e) => {
    if (e.target === elements.memoryDetailModal) {
      closeMemoryDetail()
    }
  })

  elements.confirmModal.addEventListener('click', (e) => {
    if (e.target === elements.confirmModal) {
      closeConfirmModal()
    }
  })
}

// 转义 HTML
function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 显示 Toast
function showToast(message) {
  elements.toastMessage.textContent = message
  elements.toast.classList.add('show')

  setTimeout(() => {
    elements.toast.classList.remove('show')
  }, 3000)
}

// 启动
init()
