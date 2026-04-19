// 自定义协议处理模块
// 用于处理应用内部的自定义协议链接（如 wujie://）
//
// ============================================
// 支持的协议列表：
// ============================================
// 1. wujie://open
//    功能：打开主窗口（如果已最小化则恢复，如果未显示则显示）
//    示例：wujie://open
//
// 2. wujie://chat?action=openChat&contactId=xxx
//    功能：打开指定联系人的聊天页面
//    参数：
//      - contactId: 联系人ID（必需）
//    示例：wujie://chat?action=openChat&contactId=contact_123
//
// ============================================

var { ipcRenderer } = require('electron')

/**
 * 初始化自定义协议处理器
 * 监听来自主进程的协议消息
 */
function initProtocolHandler() {
  // 监听主进程发送的协议 URL
  ipcRenderer.on('protocol-url', (event, url) => {
    console.log('从主进程接收到协议 URL:', url)
    handleCustomProtocol(url)
  })
}

/**
 * 处理自定义协议 URL
 * @param {string} url - 自定义协议 URL
 */
function handleCustomProtocol(url) {
  try {
    // 解析 URL 路径和参数
    const urlObj = new URL(url)
    const pathname = urlObj.pathname // 例如 "/chat" 或 "//open"
    const params = new URLSearchParams(urlObj.search)
    const action = params.get('action')

    // 根据路径处理不同的协议
    if (pathname === '//open' || pathname === '/open') {
      // wujie://open - 打开主窗口
      openMainWindow()
    } else if (pathname === '//chat' || pathname === '/chat') {
      // wujie://chat?action=openChat&contactId=xxx - 打开聊天页面
      switch(action) {
        case 'openChat':
          const contactId = params.get('contactId')
          openContactChatById(contactId)
          break
        default:
          console.log('Unknown chat action:', action)
      }
    } else {
      console.log('Unknown protocol path:', pathname)
    }
  } catch (error) {
    console.error('处理自定义协议失败:', error)
  }
}

/**
 * 打开主窗口
 * 如果窗口已最小化则恢复，如果未显示则显示
 */
function openMainWindow() {
  console.log('通过协议打开主窗口')
  
  // 通知主进程打开窗口
  ipcRenderer.send('open-main-window')
  
  // 切换到聊天标签页
  if (typeof switchTab === 'function') {
    switchTab('chat', true)
    console.log('已切换到聊天页面')
  }
}

/**
 * 通过联系人 ID 打开聊天页面
 * @param {string} contactId - 联系人 ID
 */
function openContactChatById(contactId) {
  console.log('通过协议打开聊天页面，联系人ID:', contactId)

  if (!contactId) {
    console.warn('联系人ID为空，无法打开聊天页面')
    return
  }

  // 先打开主窗口
  openMainWindow()

  // 检查是否已加载联系人列表
  if (typeof contacts === 'undefined' || !contacts || contacts.length === 0) {
    console.warn('联系人列表未加载，延迟执行')
    // 延迟执行，等待联系人列表加载完成
    setTimeout(() => openContactChatById(contactId), 500)
    return
  }

  // 查找联系人
  const contact = contacts.find(c => c.id === contactId)
  if (!contact) {
    console.warn('未找到联系人:', contactId)
    return
  }

  // 调用全局的 switchToContactChat 函数（在 index.js 中定义）
  if (typeof switchToContactChat === 'function') {
    switchToContactChat(contactId)
    console.log('已切换到联系人聊天页面:', contact.nickname || contactId)
  } else {
    console.error('switchToContactChat 函数未找到')
  }
}

// 初始化协议处理器
initProtocolHandler()
