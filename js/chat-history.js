/**
 * Copyright (C) 2026 BlackHoleEra-Team All Rights Reserved
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use of this software is strictly prohibited.
 */

const { ipcRenderer } = require('electron')

// AES解密配置（与主窗口一致）
const AES_CONFIG = {
  key: CryptoJS.SHA256('WuJieAiChat-Desktop').toString(CryptoJS.enc.Hex).substring(0, 32),
  iv: CryptoJS.SHA256('WuJieAiChat-Initialization-Vector').toString(CryptoJS.enc.Hex).substring(0, 16)
}

// 解密API密钥函数
function decryptApiKey(encryptedApiKey) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedApiKey, AES_CONFIG.key, {
      iv: AES_CONFIG.iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8)
    return decrypted
  } catch (error) {
    console.error('API密钥解密失败:', error)
    return null
  }
}

// 全局状态
let currentContactId = null
let currentContact = null
let allMessages = []
let filteredMessages = []
let isSelectionMode = false
let selectedMessages = new Set()
let isAscending = false // 默认倒序（最新的在前面）

// DOM 元素
const elements = {
  contactAvatar: document.getElementById('contact-avatar-img'),
  contactName: document.getElementById('contact-name'),
  totalMessages: document.getElementById('total-messages'),
  messagesList: document.getElementById('messages-list'),
  emptyState: document.getElementById('empty-state'),
  selectModeBtn: document.getElementById('select-mode-btn'),
  addToMemoryBtn: document.getElementById('add-to-memory-btn'),
  viewMemoryBtn: document.getElementById('view-memory-btn'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  exportHistoryBtn: document.getElementById('export-history-btn'),
  minimizeBtn: document.getElementById('minimizeBtn'),
  closeBtn: document.getElementById('closeBtn'),
  confirmModal: document.getElementById('confirm-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalMessage: document.getElementById('modal-message'),
  modalCancel: document.getElementById('modal-cancel'),
  modalConfirm: document.getElementById('modal-confirm'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message'),
  searchInput: document.getElementById('search-input'),
  searchClear: document.getElementById('search-clear'),
  searchStats: document.getElementById('search-stats'),
  searchProgressContainer: document.getElementById('search-progress-container'),
  searchProgressFill: document.getElementById('search-progress-fill'),
  searchProgressText: document.getElementById('search-progress-text'),
  sortBtn: document.getElementById('sort-btn'),
  sortText: document.getElementById('sort-text'),
  globalLoadingOverlay: document.getElementById('global-loading-overlay')
}

// 搜索相关状态
let searchKeyword = ''
let searchResults = []
let isSearching = false
let searchAbortController = null

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

  // 加载联系人信息和聊天记录
  await loadContactInfo()
  await loadChatHistory()

  // 绑定事件
  bindEvents()

  // 初始化搜索功能
  initSearch()
}

// 初始化主题
async function initTheme() {
  try {
    // 从主进程获取主题设置
    const theme = await ipcRenderer.invoke('get-app-theme')
    applyTheme(theme)

    // 监听主题变化
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

// 获取用户数据（从主进程）
async function getUserData() {
  const defaultData = {
    username: '我的',
    avatar: 'images/app-icon.png'
  }
  
  try {
    // 通过 IPC 从主进程获取用户数据
    const userData = await ipcRenderer.invoke('get-user-data')
    console.log('从主进程获取的 userData:', userData)
    
    // 如果头像是文件系统路径，则解析为可用的文件URL
    if (userData.avatar && userData.avatar.startsWith('UserData/')) {
      console.log('解析 UserData 头像路径:', userData.avatar)
      userData.avatar = await resolveAvatarPath(userData.avatar)
      console.log('解析后的头像路径:', userData.avatar)
    }
    return userData
  } catch (error) {
    console.error('获取用户数据失败:', error)
  }
  
  return defaultData
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
        currentContact.resolvedAvatar = avatarPath
        elements.contactAvatar.src = avatarPath
      }
    }
  } catch (error) {
    console.error('加载联系人信息失败:', error)
  }
}

// 解析头像路径为可访问的URL
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

// 加载聊天记录
async function loadChatHistory() {
  try {
    const messages = await ipcRenderer.invoke('load-chat-history', currentContactId)
    allMessages = messages || []
    filteredMessages = [...allMessages]

    // 根据当前排序状态排序
    sortMessages()

    updateMessageCount()
    renderMessages()
  } catch (error) {
    console.error('加载聊天记录失败:', error)
    showToast('加载聊天记录失败')
  }
}

// 更新消息数量
function updateMessageCount() {
  elements.totalMessages.textContent = allMessages.length
}

// 获取AI头像路径（同步版本）
function getAiAvatarPath() {
  // 优先使用已解析的头像路径
  if (currentContact?.resolvedAvatar) {
    return currentContact.resolvedAvatar
  }
  
  if (!currentContact || !currentContact.avatar) {
    return 'images/app-icon.png'
  }
  
  const avatarPath = currentContact.avatar
  
  // 如果是 UserData/ 路径，返回默认图标（需要异步解析）
  if (avatarPath.startsWith('UserData/')) {
    return 'images/app-icon.png'
  }
  
  return avatarPath
}

// 渲染消息列表
async function renderMessages() {
  if (filteredMessages.length === 0) {
    elements.messagesList.innerHTML = ''
    elements.emptyState.classList.add('show')
    return
  }
  
  elements.emptyState.classList.remove('show')
  
  // 获取用户数据（异步解析）
  const userData = await getUserData()
  const userAvatar = userData.avatar || 'images/app-icon.png'
  
  const html = filteredMessages.map((msg, index) => {
    const isUser = msg.type === 'user'
    const avatar = isUser ? userAvatar : getAiAvatarPath()
    const sender = isUser ? (userData.username || '我') : (currentContact?.nickname || 'AI')
    const time = formatTime(msg.time || msg.timestamp)
    const isSelected = selectedMessages.has(index)
    
    return `
      <div class="message-item ${isUser ? 'user' : 'ai'} ${isSelected ? 'selected' : ''} ${isSelectionMode ? 'selectable' : ''}" data-index="${index}">
        ${isSelectionMode ? `<div class="message-checkbox"><input type="checkbox" ${isSelected ? 'checked' : ''}></div>` : ''}
        <div class="message-avatar">
          <img src="${avatar}" alt="${sender}" onerror="this.src='images/app-icon.png'">
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">${sender}</span>
            <span class="message-time">${time}</span>
          </div>
          <div class="message-text">${escapeHtml(msg.content)}</div>
        </div>
      </div>
    `
  }).join('')
  
  elements.messagesList.innerHTML = html
  
  // 绑定选择事件
  if (isSelectionMode) {
    bindSelectionEvents()
  }
}

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 转义 HTML
function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML.replace(/\n/g, '<br>')
}



// 进入选择模式（单条选择）
function enterSelectionMode() {
  isSelectionMode = true
  selectedMessages.clear()
  updateButtonStatesForSelectionMode()
  renderMessages()
  showToast('已进入选择模式，点击消息可选择单条')
}

// 退出选择模式
function exitSelectionMode() {
  isSelectionMode = false
  selectedMessages.clear()
  updateButtonStatesForSelectionMode()
  renderMessages()
}

// 更新按钮状态
function updateButtonStatesForSelectionMode() {
  if (isSelectionMode) {
    elements.selectModeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
      <span>退出选择</span>
    `
    elements.selectModeBtn.classList.add('active')

    const selectedCount = selectedMessages.size

    elements.addToMemoryBtn.querySelector('span').textContent = selectedCount > 0 ? `加入长期记忆(${selectedCount}条)` : '加入长期记忆'
    elements.clearHistoryBtn.querySelector('span').textContent = selectedCount > 0 ? `删除选中(${selectedCount}条)` : '删除选中'
    elements.exportHistoryBtn.querySelector('span').textContent = selectedCount > 0 ? `导出选中(${selectedCount}条)` : '导出选中'
  } else {
    elements.selectModeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="9" y1="9" x2="15" y2="9"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
      <span>选择模式</span>
    `
    elements.selectModeBtn.classList.remove('active')
    elements.addToMemoryBtn.querySelector('span').textContent = '加入长期记忆'
    elements.clearHistoryBtn.querySelector('span').textContent = '清空记录'
    elements.exportHistoryBtn.querySelector('span').textContent = '导出记录'
  }
}

// 绑定选择事件（单条选择）
function bindSelectionEvents() {
  const messageItems = elements.messagesList.querySelectorAll('.message-item')
  messageItems.forEach(item => {
    item.addEventListener('click', (e) => {
      // 如果点击的是复选框，让复选框自己处理
      if (e.target.type === 'checkbox') return
      
      const index = parseInt(item.dataset.index)
      toggleSingleMessageSelection(index)
    })
    
    // 复选框变化事件
    const checkbox = item.querySelector('.message-checkbox input')
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        const index = parseInt(item.dataset.index)
        toggleSingleMessageSelection(index)
      })
    }
  })
}

// 切换单条消息选择状态
function toggleSingleMessageSelection(index) {
  if (selectedMessages.has(index)) {
    selectedMessages.delete(index)
  } else {
    selectedMessages.add(index)
  }
  
  // 更新UI
  const item = elements.messagesList.querySelector(`[data-index="${index}"]`)
  if (item) {
    const checkbox = item.querySelector('.message-checkbox input')
    if (checkbox) {
      checkbox.checked = selectedMessages.has(index)
    }
    item.classList.toggle('selected', selectedMessages.has(index))
  }
  
  updateButtonStatesForSelectionMode()
}

// 删除选中的消息
async function deleteSelectedMessages() {
  if (selectedMessages.size === 0) {
    showToast('请先选择要删除的消息')
    return
  }

  const selectedCount = selectedMessages.size

  showConfirmModal(
    '删除选中的消息',
    `确定要删除选中的 ${selectedCount} 条消息吗？此操作不可撤销。`,
    async () => {
      // 获取要删除的消息索引（从大到小排序，避免删除时索引变化）
      const indicesToDelete = Array.from(selectedMessages).sort((a, b) => b - a)

      // 从 allMessages 中删除
      for (const index of indicesToDelete) {
        allMessages.splice(index, 1)
      }

      // 保存到存储
      await saveChatHistory()

      // 刷新显示
      filteredMessages = [...allMessages]

      // 根据当前排序状态排序
      sortMessages()

      renderMessages()

      // 退出选择模式
      exitSelectionMode()

      showToast(`已删除 ${selectedCount} 条消息`)

      // 通知主窗口更新
      ipcRenderer.send('chat-history-updated', { contactId: currentContactId })
    },
    true
  )
}

// 将选中的消息加入长期记忆（带AI总结）
async function addSelectedToLongTermMemory() {
  if (selectedMessages.size === 0) {
    showToast('请先选择要添加的消息')
    return
  }

  // 获取选中的消息并按时间排序
  const selectedIndices = Array.from(selectedMessages).sort((a, b) => a - b)
  const selectedMsgs = selectedIndices.map(index => filteredMessages[index])

  // 构建Prompt并估算Token
  const prompt = buildMemorySummaryPrompt(selectedMsgs)
  const estimatedTokens = estimateTokens(prompt)

  // 显示Token警告
  showTokenWarningDialog(selectedMsgs.length, estimatedTokens, async () => {
    try {
      // 显示全局加载遮罩
      showGlobalLoading()

      // 获取联系人配置
      const contacts = await ipcRenderer.invoke('get-contacts')
      const contact = contacts.find(c => c.id === currentContactId)

      if (!contact) {
        hideGlobalLoading()
        showToast('无法获取联系人信息')
        return
      }

      // 解密API密钥
      const decryptedApiKey = decryptApiKey(contact.apikey)
      if (!decryptedApiKey) {
        hideGlobalLoading()
        showToast('API密钥解密失败')
        return
      }

      console.log('【调试】解密后的API Key:', decryptedApiKey.substring(0, 10) + '...')

      // 调用AI进行总结
      const summary = await callAIForSummary(prompt, {
        apiKey: decryptedApiKey,
        model: contact.model
      })

      // 保存到长期记忆
      const memoryData = {
        summary: summary,
        originalMessages: selectedMsgs.map(msg => ({
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      }

      const result = await ipcRenderer.invoke('add-long-term-memory', currentContactId, memoryData)

      // 隐藏全局加载遮罩
      hideGlobalLoading()

      if (result.success) {
        showToast(`已将 ${selectedMsgs.length} 条消息加入长期记忆`)
        // 退出选择模式
        exitSelectionMode()
      } else {
        showToast('加入长期记忆失败: ' + result.error)
      }
    } catch (error) {
      // 隐藏全局加载遮罩
      hideGlobalLoading()
      console.error('生成AI总结失败:', error)
      showToast('AI总结失败: ' + error.message)
    }
  })
}

// 导出选中的消息
async function exportSelectedMessages() {
  if (selectedMessages.size === 0) {
    showToast('请先选择要导出的消息')
    return
  }

  try {
    // 获取选中的消息并按时间排序
    const selectedIndices = Array.from(selectedMessages).sort((a, b) => a - b)
    const selectedMsgs = selectedIndices.map(index => filteredMessages[index])

    const result = await ipcRenderer.invoke('export-chat-history', currentContactId, selectedMsgs)
    if (result.success) {
      showToast(`已导出 ${selectedMsgs.length} 条消息到: ${result.filePath}`)
    } else {
      showToast('导出失败: ' + result.error)
    }
    
    // 退出选择模式
    exitSelectionMode()
  } catch (error) {
    console.error('导出聊天记录失败:', error)
    showToast('导出聊天记录失败')
  }
}

// 保存聊天记录
async function saveChatHistory() {
  try {
    const result = await ipcRenderer.invoke('save-chat-history', currentContactId, allMessages)
    if (!result.success) {
      console.error('保存聊天记录失败:', result.error)
    }
  } catch (error) {
    console.error('保存聊天记录失败:', error)
  }
}

// 显示确认对话框
function showConfirmModal(title, message, onConfirm, isDanger = false) {
  elements.modalTitle.textContent = title
  elements.modalMessage.textContent = message
  
  elements.modalConfirm.className = `modal-btn ${isDanger ? 'danger' : 'primary'}`
  
  elements.confirmModal.classList.add('show')
  
  const handleConfirm = () => {
    elements.confirmModal.classList.remove('show')
    elements.modalConfirm.removeEventListener('click', handleConfirm)
    elements.modalCancel.removeEventListener('click', handleCancel)
    onConfirm()
  }
  
  const handleCancel = () => {
    elements.confirmModal.classList.remove('show')
    elements.modalConfirm.removeEventListener('click', handleConfirm)
    elements.modalCancel.removeEventListener('click', handleCancel)
  }
  
  elements.modalConfirm.addEventListener('click', handleConfirm)
  elements.modalCancel.addEventListener('click', handleCancel)
}

// 构建AI总结的Prompt
function buildMemorySummaryPrompt(messages) {
  const sortedMessages = [...messages].sort((a, b) => {
    return new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
  })
  
  let prompt = `由于系统限制，我们不得不在新对话中继续，你在新对话中会忘记全部内容，所以你现在的任务是对下面的的对话内容进行智能总结。由于上下文限制，我需要你创建一份高效的记忆辅助文档。以便于你在新对话中能够记忆起我，保留时间等节点

总结要求：
1. 识别并归纳我们的对话的经历的事情
2. 记录已达成的一致意见或重要决定
3. 保留关键数据、时间节点等具体信息
4. 使用易于后续快速理解的格式

以下是全部对话内容：
`
  
  sortedMessages.forEach(msg => {
    const role = msg.type === 'user' ? '我' : '你'
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN') : ''
    prompt += `${time} ${role}：${msg.content}\n`
  })
  
  return prompt
}

// 估算Token数量（粗略估计：1个汉字约等于2个token）
function estimateTokens(text) {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const otherChars = text.length - chineseChars
  return chineseChars * 2 + otherChars
}

// 显示Token消耗警告
function showTokenWarningDialog(messageCount, estimatedTokens, onConfirm) {
  const modal = document.createElement('div')
  modal.className = 'modal-overlay'
  modal.style.display = 'flex'
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 450px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="margin-bottom: 12px;">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h3 class="modal-title" style="color: #f59e0b;">Token消耗警告</h3>
      </div>
      <div class="modal-message" style="text-align: left; line-height: 1.8;">
        <p>您即将使用 AI 对选中的 <strong>${messageCount}</strong> 条消息进行总结。</p>
        <p style="margin-top: 12px;">预计消耗 Token 数量：<strong style="color: #dc3545;">约 ${estimatedTokens.toLocaleString()}</strong></p>
        <p style="margin-top: 12px; color: #888; font-size: 13px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          实际消耗可能因模型和回复长度而有所不同
        </p>
      </div>
      <div class="modal-actions" style="margin-top: 24px;">
        <button class="modal-btn secondary" id="token-warning-cancel">取消</button>
        <button class="modal-btn primary" id="token-warning-confirm" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">确认继续</button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  const handleConfirm = () => {
    modal.remove()
    onConfirm()
  }
  
  const handleCancel = () => {
    modal.remove()
  }
  
  document.getElementById('token-warning-confirm').addEventListener('click', handleConfirm)
  document.getElementById('token-warning-cancel').addEventListener('click', handleCancel)
}

// 调用AI进行总结
async function callAIForSummary(prompt, contactConfig) {
  console.log('【调试】传入的API Key:', contactConfig.apiKey ? contactConfig.apiKey.substring(0, 10) + '...' : 'undefined')
  const path = require('path')
  const { AliyunAPI } = require(path.join(__dirname, 'js', 'aliyun-api.js'))
  const aliyunAPI = new AliyunAPI(contactConfig.apiKey)

  const messages = [
    {
      role: 'user',
      content: prompt
    }
  ]

  const config = {
    model: contactConfig.model,
    enableSearch: false,
    enableThinking: false,
    systemPrompt: '',
    isRolePlay: false
  }

  const response = await aliyunAPI.chatCompletion(config, messages)

  // 提取AI回复的文本内容
  let summary = ''
  if (typeof response === 'string') {
    summary = response
  } else if (response && response.choices && response.choices.length > 0) {
    const choice = response.choices[0]
    if (choice.message && choice.message.content) {
      summary = choice.message.content
    } else if (choice.delta && choice.delta.content) {
      summary = choice.delta.content
    }
  }

  console.log('【调试】AI总结内容:', summary.substring(0, 50) + '...')
  return summary
}

// 加入长期记忆（带AI总结）
async function addToLongTermMemory() {
  if (allMessages.length === 0) {
    showToast('没有可添加的聊天记录')
    return
  }
  
  // 构建Prompt并估算Token
  const prompt = buildMemorySummaryPrompt(allMessages)
  const estimatedTokens = estimateTokens(prompt)
  
  // 显示Token警告
  showTokenWarningDialog(allMessages.length, estimatedTokens, async () => {
    try {
      showToast('正在生成AI总结，请稍候...')
      
      // 获取联系人配置
      const contacts = await ipcRenderer.invoke('get-contacts')
      const contact = contacts.find(c => c.id === currentContactId)

      if (!contact) {
        showToast('无法获取联系人信息')
        return
      }

      // 解密API密钥
      const decryptedApiKey = decryptApiKey(contact.apikey)
      if (!decryptedApiKey) {
        showToast('API密钥解密失败')
        return
      }

      console.log('【调试】解密后的API Key:', decryptedApiKey.substring(0, 10) + '...')

      // 调用AI进行总结
      const summary = await callAIForSummary(prompt, {
        apiKey: decryptedApiKey,
        model: contact.model
      })
      
      // 保存到长期记忆
      const memoryData = {
        summary: summary,
        originalMessages: allMessages.map(msg => ({
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      }
      
      const result = await ipcRenderer.invoke('add-long-term-memory', currentContactId, memoryData)
      
      if (result.success) {
        showToast('已生成AI总结并加入长期记忆')
      } else {
        showToast('加入长期记忆失败: ' + result.error)
      }
    } catch (error) {
      console.error('生成AI总结失败:', error)
      showToast('AI总结失败: ' + error.message)
    }
  })
}

// 清空聊天记录
async function clearChatHistory() {
  if (allMessages.length === 0) {
    showToast('没有可清空的聊天记录')
    return
  }

  showConfirmModal(
    '确认清空',
    '确定要清空所有聊天记录吗？此操作不可恢复。',
    async () => {
      try {
        await ipcRenderer.invoke('clear-chat-history', currentContactId)
        allMessages = []
        filteredMessages = []
        updateMessageCount()
        renderMessages()
        showToast('聊天记录已清空')

        // 通知主窗口更新
        ipcRenderer.send('chat-history-updated', { contactId: currentContactId })
      } catch (error) {
        console.error('清空聊天记录失败:', error)
        showToast('清空聊天记录失败')
      }
    },
    true
  )
}

// 导出聊天记录
async function exportChatHistory() {
  if (allMessages.length === 0) {
    showToast('没有可导出的聊天记录')
    return
  }
  
  try {
    const result = await ipcRenderer.invoke('export-chat-history', currentContactId, allMessages)
    if (result.success) {
      showToast(`已导出到: ${result.filePath}`)
    } else {
      showToast('导出失败: ' + result.error)
    }
  } catch (error) {
    console.error('导出聊天记录失败:', error)
    showToast('导出聊天记录失败')
  }
}

// 显示 Toast 提示
function showToast(message) {
  elements.toastMessage.textContent = message
  elements.toast.classList.add('show')

  setTimeout(() => {
    elements.toast.classList.remove('show')
  }, 3000)
}

// 搜索功能
function initSearch() {
  // 搜索输入事件
  elements.searchInput.addEventListener('input', debounce(async (e) => {
    const keyword = e.target.value.trim()

    if (keyword === searchKeyword) return

    // 如果有正在进行的搜索，取消它
    if (searchAbortController) {
      searchAbortController.abort()
    }

    searchKeyword = keyword

    if (keyword === '') {
      clearSearch()
      return
    }

    // 显示清除按钮
    elements.searchClear.style.display = 'flex'

    // 开始搜索
    await performSearch(keyword)
  }, 300))

  // 清除搜索
  elements.searchClear.addEventListener('click', () => {
    elements.searchInput.value = ''
    clearSearch()
    elements.searchInput.focus()
  })

  // 键盘导航
  elements.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearSearch()
      elements.searchInput.value = ''
      elements.searchInput.blur()
    }
  })
}

// 防抖函数
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 执行搜索
async function performSearch(keyword) {
  if (isSearching) return

  isSearching = true
  searchAbortController = new AbortController()
  const signal = searchAbortController.signal

  // 显示进度条
  elements.searchProgressContainer.style.display = 'block'
  elements.searchProgressFill.style.width = '0%'
  elements.searchProgressText.textContent = '正在搜索...'

  searchResults = []
  const lowerKeyword = keyword.toLowerCase()

  try {
    // 遍历所有消息进行搜索
    const totalMessages = allMessages.length
    const batchSize = 10 // 每批处理的消息数

    for (let i = 0; i < totalMessages; i += batchSize) {
      // 检查是否被取消
      if (signal.aborted) {
        throw new Error('搜索已取消')
      }

      // 处理一批消息
      const batch = allMessages.slice(i, Math.min(i + batchSize, totalMessages))

      for (let j = 0; j < batch.length; j++) {
        const msg = batch[j]
        const actualIndex = i + j

        if (msg.content && msg.content.toLowerCase().includes(lowerKeyword)) {
          searchResults.push({
            index: actualIndex,
            message: msg,
            matches: findMatches(msg.content, keyword)
          })
        }
      }

      // 更新进度
      const progress = Math.min(((i + batchSize) / totalMessages) * 100, 100)
      elements.searchProgressFill.style.width = `${progress}%`
      elements.searchProgressText.textContent = `搜索中... (${Math.min(i + batchSize, totalMessages)}/${totalMessages})`

      // 让出时间片，避免阻塞UI
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    // 搜索完成
    elements.searchProgressFill.style.width = '100%'
    elements.searchProgressText.textContent = `搜索完成，找到 ${searchResults.length} 条结果`

    // 更新搜索统计
    updateSearchStats()

    // 渲染搜索结果
    renderSearchResults()

    // 3秒后隐藏进度条
    setTimeout(() => {
      if (!isSearching) {
        elements.searchProgressContainer.style.display = 'none'
      }
    }, 3000)

  } catch (error) {
    if (error.message !== '搜索已取消') {
      console.error('搜索失败:', error)
      elements.searchProgressText.textContent = '搜索失败'
    }
  } finally {
    isSearching = false
    searchAbortController = null
  }
}

// 查找匹配位置
function findMatches(content, keyword) {
  const matches = []
  const lowerContent = content.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  let pos = 0

  while ((pos = lowerContent.indexOf(lowerKeyword, pos)) !== -1) {
    matches.push({
      start: pos,
      end: pos + keyword.length
    })
    pos += keyword.length
  }

  return matches
}

// 高亮匹配文本
function highlightMatches(content, keyword) {
  if (!keyword) return escapeHtml(content)

  const lowerContent = content.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  let result = ''
  let lastIndex = 0
  let pos = 0

  while ((pos = lowerContent.indexOf(lowerKeyword, pos)) !== -1) {
    // 添加匹配前的文本
    result += escapeHtml(content.substring(lastIndex, pos))
    // 添加高亮的匹配文本
    result += `<span class="highlight-match">${escapeHtml(content.substring(pos, pos + keyword.length))}</span>`

    lastIndex = pos + keyword.length
    pos += keyword.length
  }

  // 添加剩余文本
  result += escapeHtml(content.substring(lastIndex))

  return result
}

// 清除搜索
function clearSearch() {
  searchKeyword = ''
  searchResults = []
  isSearching = false

  if (searchAbortController) {
    searchAbortController.abort()
    searchAbortController = null
  }

  elements.searchClear.style.display = 'none'
  elements.searchStats.textContent = ''
  elements.searchProgressContainer.style.display = 'none'

  // 恢复原始显示
  filteredMessages = [...allMessages]

  // 根据当前排序状态排序
  sortMessages()

  renderMessages()
}

// 更新搜索统计
function updateSearchStats() {
  if (searchResults.length === 0) {
    elements.searchStats.textContent = searchKeyword ? '未找到匹配结果' : ''
  } else {
    elements.searchStats.textContent = `找到 ${searchResults.length} 条匹配结果`
  }
}

// 渲染搜索结果
async function renderSearchResults() {
  if (searchResults.length === 0) {
    elements.messagesList.innerHTML = `
      <div class="empty-state show">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <p>未找到匹配结果</p>
        <span>尝试使用其他关键词搜索</span>
      </div>
    `
    return
  }

  // 获取用户数据
  const userData = await getUserData()
  const userAvatar = userData.avatar || 'images/app-icon.png'

  const html = searchResults.map((result, idx) => {
    const msg = result.message
    const isUser = msg.type === 'user'
    const avatar = isUser ? userAvatar : getAiAvatarPath()
    const sender = isUser ? (userData.username || '我') : (currentContact?.nickname || 'AI')
    const time = formatTime(msg.time || msg.timestamp)
    const highlightedContent = highlightMatches(msg.content, searchKeyword)

    return `
      <div class="message-item ${isUser ? 'user' : 'ai'} search-result" data-index="${result.index}" data-result-index="${idx}">
        <div class="message-avatar">
          <img src="${avatar}" alt="${sender}" onerror="this.src='images/app-icon.png'">
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">${sender}</span>
            <span class="message-time">${time}</span>
          </div>
          <div class="message-text">${highlightedContent}</div>
        </div>
      </div>
    `
  }).join('')

  elements.messagesList.innerHTML = html
  elements.emptyState.classList.remove('show')
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

  // 操作按钮
  elements.selectModeBtn.addEventListener('click', () => {
    if (isSelectionMode) {
      exitSelectionMode()
    } else {
      enterSelectionMode()
    }
  })
  
  elements.addToMemoryBtn.addEventListener('click', () => {
    if (isSelectionMode && selectedMessages.size > 0) {
      addSelectedToLongTermMemory()
    } else {
      addToLongTermMemory()
    }
  })

  // 查看长期记忆
  elements.viewMemoryBtn.addEventListener('click', () => {
    ipcRenderer.send('open-long-term-memory-window', currentContactId)
  })

  elements.clearHistoryBtn.addEventListener('click', () => {
    if (isSelectionMode) {
      deleteSelectedMessages()
    } else {
      clearChatHistory()
    }
  })
  
  elements.exportHistoryBtn.addEventListener('click', () => {
    if (isSelectionMode && selectedMessages.size > 0) {
      exportSelectedMessages()
    } else {
      exportChatHistory()
    }
  })

  // 排序按钮
  elements.sortBtn.addEventListener('click', toggleSortOrder)
}

// 切换排序顺序
async function toggleSortOrder() {
  isAscending = !isAscending

  // 更新按钮状态
  if (isAscending) {
    elements.sortBtn.classList.add('asc')
    elements.sortText.textContent = '正序'
  } else {
    elements.sortBtn.classList.remove('asc')
    elements.sortText.textContent = '倒序'
  }

  // 重新排序并渲染
  sortMessages()
  await renderMessages()

  showToast(isAscending ? '已切换为正序' : '已切换为倒序')
}

// 获取消息时间戳（兼容 time 和 timestamp 字段）
function getMessageTime(msg) {
  return msg.timestamp || msg.time || 0
}

// 将消息按对话组分组（用户-AI 为一组）
function groupMessagesByConversation(messages) {
  const groups = []
  let currentGroup = []

  for (const msg of messages) {
    if (msg.type === 'user') {
      // 遇到用户消息，开始新组
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
      }
      currentGroup = [msg]
    } else {
      // AI 消息加入当前组
      currentGroup.push(msg)
    }
  }

  // 添加最后一组
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
}

// 对消息进行排序（保持对话组内顺序）
function sortMessages() {
  console.log('【调试】排序前:', filteredMessages.map(m => ({ type: m.type, time: getMessageTime(m), content: m.content.substring(0, 20) })))

  // 按对话组分组
  const groups = groupMessagesByConversation(filteredMessages)

  // 按对话组的第一个消息时间排序
  groups.sort((a, b) => {
    const timeA = new Date(getMessageTime(a[0]))
    const timeB = new Date(getMessageTime(b[0]))
    return isAscending ? timeA - timeB : timeB - timeA
  })

  // 重新展开为消息列表
  filteredMessages = groups.flat()

  console.log('【调试】排序后:', filteredMessages.map(m => ({ type: m.type, time: getMessageTime(m), content: m.content.substring(0, 20) })))
}

// 显示全局加载遮罩
function showGlobalLoading() {
  if (elements.globalLoadingOverlay) {
    elements.globalLoadingOverlay.classList.add('show')
  }
}

// 隐藏全局加载遮罩
function hideGlobalLoading() {
  if (elements.globalLoadingOverlay) {
    elements.globalLoadingOverlay.classList.remove('show')
  }
}

// 启动
document.addEventListener('DOMContentLoaded', init)
