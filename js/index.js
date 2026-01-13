const { ipcRenderer } = require('electron')

// 引入 jQuery、Cropper.js 和加密库
const $ = require('jquery')
const Cropper = require('cropperjs')
const CryptoJS = require('crypto-js')

// 获取窗口控制按钮和图标
const minimizeBtn = document.getElementById('minimizeBtn')
const maximizeBtn = document.getElementById('maximizeBtn')
const closeBtn = document.getElementById('closeBtn')
const titleBar = document.getElementById('titleBar')
const appIcon = document.getElementById('appIcon')

// 自定义弹窗对象
const customModal = {
  // 显示alert弹窗
  alert: function(message, title = '提示') {
    return new Promise((resolve) => {
      const modal = document.getElementById('custom-modal')
      const modalTitle = document.getElementById('custom-modal-title')
      const modalMessage = document.getElementById('custom-modal-message')
      const cancelBtn = document.getElementById('custom-modal-cancel')
      const confirmBtn = document.getElementById('custom-modal-confirm')
      const closeBtn = modal.querySelector('.custom-modal-close')
      
      // 设置弹窗内容
      modalTitle.textContent = title
      modalMessage.textContent = message
      
      // 隐藏取消按钮，只显示确认按钮
      cancelBtn.style.display = 'none'
      confirmBtn.textContent = '确定'
      
      // 显示弹窗
      modal.style.display = 'flex'
      
      // 绑定确认按钮事件
      const handleConfirm = () => {
        modal.style.display = 'none'
        confirmBtn.removeEventListener('click', handleConfirm)
        closeBtn.removeEventListener('click', handleConfirm)
        resolve()
      }
      
      confirmBtn.addEventListener('click', handleConfirm)
      closeBtn.addEventListener('click', handleConfirm)
    })
  },
  
  // 显示confirm弹窗
  confirm: function(message, title = '确认') {
    return new Promise((resolve) => {
      const modal = document.getElementById('custom-modal')
      const modalTitle = document.getElementById('custom-modal-title')
      const modalMessage = document.getElementById('custom-modal-message')
      const cancelBtn = document.getElementById('custom-modal-cancel')
      const confirmBtn = document.getElementById('custom-modal-confirm')
      const closeBtn = modal.querySelector('.custom-modal-close')
      
      // 设置弹窗内容
      modalTitle.textContent = title
      modalMessage.textContent = message
      
      // 显示取消和确认按钮
      cancelBtn.style.display = 'inline-flex'
      confirmBtn.textContent = '确认'
      
      // 显示弹窗
      modal.style.display = 'flex'
      
      // 绑定取消按钮事件
      const handleCancel = () => {
        modal.style.display = 'none'
        cancelBtn.removeEventListener('click', handleCancel)
        confirmBtn.removeEventListener('click', handleConfirm)
        closeBtn.removeEventListener('click', handleCancel)
        resolve(false)
      }
      
      // 绑定确认按钮事件
      const handleConfirm = () => {
        modal.style.display = 'none'
        cancelBtn.removeEventListener('click', handleCancel)
        confirmBtn.removeEventListener('click', handleConfirm)
        closeBtn.removeEventListener('click', handleCancel)
        resolve(true)
      }
      
      cancelBtn.addEventListener('click', handleCancel)
      confirmBtn.addEventListener('click', handleConfirm)
      closeBtn.addEventListener('click', handleCancel)
    })
  }
}

// 处理图标加载失败
appIcon.addEventListener('error', () => {
  console.warn('应用图标加载失败，使用备用图标')
  // 创建备用SVG图标
  const fallbackIcon = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1"/>
      <circle cx="12" cy="12" r="4" fill="currentColor"/>
      <path d="M12 6 L12 2 M12 22 L12 18 M18 12 L22 12 M2 12 L6 12" stroke="currentColor" stroke-width="1"/>
    </svg>
  `
  appIcon.src = 'data:image/svg+xml;base64,' + btoa(fallbackIcon)
})

// 添加按钮悬停音效（可选）
function playHoverSound() {
  // 这里可以添加音效代码
  // const audio = new Audio('sounds/hover.mp3')
  // audio.volume = 0.1
  // audio.play().catch(() => {})
}

// 窗口控制事件监听
minimizeBtn.addEventListener('click', () => {
  ipcRenderer.send('minimize-window')
})

minimizeBtn.addEventListener('mouseenter', playHoverSound)

maximizeBtn.addEventListener('click', () => {
  ipcRenderer.send('maximize-window')
})

maximizeBtn.addEventListener('mouseenter', playHoverSound)

closeBtn.addEventListener('click', () => {
  ipcRenderer.send('close-window')
})

closeBtn.addEventListener('mouseenter', playHoverSound)

// 双击标题栏最大化/还原窗口
titleBar.addEventListener('dblclick', () => {
  ipcRenderer.send('maximize-window')
})

// 添加标题栏悬停效果（统一毛玻璃主题）
function updateTitleBarHoverEffect() {
  // 移除之前的事件监听器
  titleBar.removeEventListener('mouseenter', handleMouseEnter)
  titleBar.removeEventListener('mouseleave', handleMouseLeave)
  
  // 根据当前主题模式设置不同的悬停效果
  const isDarkMode = document.body.classList.contains('dark-mode')
  
  function handleMouseEnter() {
    if (isDarkMode) {
      titleBar.style.background = 'rgba(55, 55, 55, 0.9)'
      titleBar.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)'
      document.querySelector('.main-content').style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'
    } else {
      titleBar.style.background = 'rgba(235, 235, 235, 0.9)'
      titleBar.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)'
      document.querySelector('.main-content').style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.12)'
    }
  }
  
  function handleMouseLeave() {
    if (isDarkMode) {
      titleBar.style.background = 'rgba(45, 45, 45, 0.85)'
      titleBar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)'
      document.querySelector('.main-content').style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'
    } else {
      titleBar.style.background = 'rgba(240, 240, 240, 0.85)'
      titleBar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
      document.querySelector('.main-content').style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)'
    }
  }
  
  // 添加新的事件监听器
  titleBar.addEventListener('mouseenter', handleMouseEnter)
  titleBar.addEventListener('mouseleave', handleMouseLeave)
}

// 初始化标题栏悬停效果
updateTitleBarHoverEffect()

// 在主题切换时更新标题栏悬停效果
function updateTitleBarStyleAfterThemeChange() {
  const isDarkMode = document.body.classList.contains('dark-mode')
  
  // 重置标题栏样式，确保使用当前主题的默认样式
  if (isDarkMode) {
    titleBar.style.background = 'rgba(45, 45, 45, 0.85)'
    titleBar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)'
  } else {
    titleBar.style.background = 'rgba(240, 240, 240, 0.85)'
    titleBar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
  }
  
  // 更新悬停效果
  updateTitleBarHoverEffect()
}

// 处理最大化状态变化
window.addEventListener('resize', () => {
  const isMaximized = window.innerWidth === screen.width && 
                     window.innerHeight === screen.height
  
  if (isMaximized) {
    maximizeBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12">
        <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
        <rect x="1" y="1" width="3" height="3" fill="currentColor"/>
      </svg>
    `
    maximizeBtn.title = '还原'
  } else {
    maximizeBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12">
        <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1"/>
      </svg>
    `
    maximizeBtn.title = '最大化'
  }
})

// 添加键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.altKey) {
    switch (e.key) {
      case ' ':
        e.preventDefault()
        // Alt+Space 显示系统菜单（可选）
        break
      case 'F4':
        e.preventDefault()
        // Alt+F4 关闭窗口
        ipcRenderer.send('close-window')
        break
    }
  }
})

// 侧边栏标签切换功能
function initSidebarTabs() {
  const sidebarTabs = document.querySelectorAll('.sidebar-tab')
  const contentAreas = document.querySelectorAll('.content-area')
  
  sidebarTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetTab = tab.getAttribute('data-tab')
      // 每次点击时都读取最新的动画设置，确保切换后立即生效
      const animationType = localStorage.getItem('pageAnimationType') || 'slide'
      // 获取点击位置相对于视口的坐标
      const clickX = e.clientX
      const clickY = e.clientY
      switchTab(targetTab, false, animationType, { x: clickX, y: clickY })
    })
    
    // 添加标签页悬停音效（可选）
    tab.addEventListener('mouseenter', playHoverSound)
  })
  
  // 添加键盘快捷键切换动画效果
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey) {
      switch(e.key) {
        case '1':
          e.preventDefault()
          localStorage.setItem('pageAnimationType', 'fade')
          console.log('页面动画已切换为：淡入淡出')
          break
        case '2':
          e.preventDefault()
          localStorage.setItem('pageAnimationType', 'slide')
          console.log('页面动画已切换为：滑动')
          break
        case '3':
          e.preventDefault()
          localStorage.setItem('pageAnimationType', 'zoom')
          console.log('页面动画已切换为：缩放')
          break
        case '4':
          e.preventDefault()
          localStorage.setItem('pageAnimationType', 'rotate')
          console.log('页面动画已切换为：旋转')
          break
        case '5':
          e.preventDefault()
          localStorage.setItem('pageAnimationType', 'fly')
          console.log('页面动画已切换为：飞入')
          break
      }
    }
  })
  
  // 存储当前正在执行的动画定时器，用于中断动画
  let currentAnimationTimer = null
  
  function switchTab(targetTab, immediate = false, animationType = 'slide', clickPos = null) {
    // 首先清理所有动画状态，确保没有残留的动画效果
    if (currentAnimationTimer) {
      clearTimeout(currentAnimationTimer)
      currentAnimationTimer = null
    }
    
    // 清理所有内容区域的动画状态
    document.querySelectorAll('.content-area').forEach(area => {
      area.classList.remove('page-fade-in', 'page-slide-right', 'page-slide-left', 'page-zoom-in', 'page-rotate-in', 'page-fly-in')
      area.style.transform = ''
      area.style.transformOrigin = ''
      area.style.transition = ''
      area.style.opacity = ''
      area.style.visibility = ''
    })
    
    // 获取当前激活的标签页
    const currentActiveTab = document.querySelector('.sidebar-tab.active')
    const currentActiveContent = document.querySelector('.content-area[style*="display: block"]')
    
    // 检查是否已经在目标标签页，如果是则直接返回，不再执行动画
    if (currentActiveTab && currentActiveTab.getAttribute('data-tab') === targetTab) {
      return
    }
    
    // 移除所有标签页的激活状态
    sidebarTabs.forEach(tab => {
      tab.classList.remove('active')
    })
    
    // 激活目标标签页
    const activeTab = document.querySelector(`[data-tab="${targetTab}"]`)
    if (activeTab) {
      activeTab.classList.add('active')
    }
    
    // 目标内容区域
    const targetContent = document.getElementById(`${targetTab}-content`)
    if (!targetContent) {
      return
    }
    
    // 更新窗口标题
    const tabNames = {
      'chat': '聊天',
      'contacts': '联系人',
      'profile': '我的',
      'settings': '设置'
    }
    document.title = `无界 - ${tabNames[targetTab] || '聊天'}`
    
    // 如果不需要动画，直接显示目标内容区域
    if (immediate) {
      if (currentActiveContent && currentActiveContent.id !== targetContent.id) {
        currentActiveContent.style.display = 'none'
      }
      targetContent.style.display = targetTab === 'chat' ? 'flex' : 'block'
      targetContent.style.opacity = '1'
      targetContent.style.transform = 'translateX(0) scale(1)'
      targetContent.style.visibility = 'visible'
      
      // 当切换到聊天标签页时，检查当前是否有选中的联系人，如果有，更新聊天标题
      if (targetTab === 'chat') {
        const chatHeader = document.querySelector('.chat-header');
        const contactId = chatHeader ? chatHeader.getAttribute('data-contact-id') : null;
        if (contactId) {
          const contact = contacts.find(c => c.id === contactId);
          if (contact) {
            updateChatHeader(contact);
          }
        }
      }
      return
    }
    
    // 确定动画方向
    let animationClass = ''
    // 根据标签页顺序确定滑动方向
    const tabOrder = ['chat', 'contacts', 'profile', 'settings']
    const currentIndex = currentActiveTab ? tabOrder.indexOf(currentActiveTab.getAttribute('data-tab')) : -1
    const targetIndex = tabOrder.indexOf(targetTab)
    
    if (animationType === 'fade') {
      animationClass = 'page-fade-in'
    } else if (animationType === 'zoom') {
      animationClass = 'page-zoom-in'
    } else if (animationType === 'rotate') {
      animationClass = 'page-rotate-in'
    } else if (animationType === 'fly') {
      // 飞入动画效果 - 使用螺旋进入动画
      animationClass = 'page-fly-in'
    } else {
      // 默认滑动效果
      if (currentIndex === -1 || targetIndex > currentIndex) {
        animationClass = 'page-slide-right'
      } else {
        animationClass = 'page-slide-left'
      }
    }
    
    // 立即重置所有内容区域状态
    document.querySelectorAll('.content-area').forEach(area => {
      // 移除所有可能的动画类
      area.classList.remove('page-fade-in', 'page-slide-right', 'page-slide-left', 'page-zoom-in', 'page-rotate-in', 'page-fly-in')
      // 重置所有样式
      area.style.display = 'none'
      area.style.transition = ''
      area.style.transform = ''
      area.style.transformOrigin = ''
      area.style.opacity = ''
      area.style.visibility = ''
    })
    
    // 显示目标内容区域
    targetContent.style.display = targetTab === 'chat' ? 'flex' : 'block'
    
    // 保存原始transition值
    const originalTransition = targetContent.style.transition
    
    // 暂时禁用默认transition，避免与keyframes动画冲突
    targetContent.style.transition = 'none'
    
    // 为不同动画类型设置初始状态
    switch (animationType) {
      case 'fade':
        // 淡入动画初始状态
        targetContent.style.opacity = '0'
        targetContent.style.transform = 'scale(0.95)'
        break
      case 'zoom':
        // 缩放动画初始状态
        targetContent.style.opacity = '0'
        targetContent.style.transform = 'scale(0.8)'
        break
      case 'rotate':
        // 旋转动画初始状态
        targetContent.style.opacity = '0'
        targetContent.style.transform = 'rotate(-10deg) scale(0.9)'
        break
      case 'slide':
        // 滑动动画初始状态
        targetContent.style.opacity = '0'
        if (currentIndex === -1 || targetIndex > currentIndex) {
          // 从右侧滑入
          targetContent.style.transform = 'translateX(50px)'
        } else {
          // 从左侧滑入
          targetContent.style.transform = 'translateX(-50px)'
        }
        break
      case 'fly':
        // 飞入动画效果 - 根据点击位置设置初始位置
        if (clickPos) {
          // 获取目标内容区域的中心位置
          const rect = targetContent.getBoundingClientRect()
          const centerX = rect.left + rect.width / 2
          const centerY = rect.top + rect.height / 2
          
          // 计算点击位置到中心位置的差值
          const deltaX = clickPos.x - centerX
          const deltaY = clickPos.y - centerY
          
          // 设置初始变换原点为点击位置相对于内容区域的位置
          const originX = (clickPos.x - rect.left) / rect.width * 100 + '%'
          const originY = (clickPos.y - rect.top) / rect.height * 100 + '%'
          
          // 设置初始位置
          targetContent.style.transform = `scale(0.2) translate(${deltaX}px, ${deltaY}px)`
          targetContent.style.transformOrigin = `${originX} ${originY}`
        } else {
          // 如果没有点击位置，使用默认飞入效果
          targetContent.style.transform = 'scale(0.2) translate(0, 0)'
        }
        targetContent.style.opacity = '0'
        break
      default:
        // 默认初始状态
        targetContent.style.opacity = '0'
    }
    
    // 强制重排，确保初始状态生效
    targetContent.offsetHeight
    
    // 添加动画类
    targetContent.classList.add(animationClass)
    
    // 动画结束后移除动画类和重置样式
  currentAnimationTimer = setTimeout(() => {
    // 移除动画类
    targetContent.classList.remove(animationClass)
    // 重置所有动画相关样式
    targetContent.style.transform = ''
    targetContent.style.transformOrigin = ''
    // 恢复原始transition值
    targetContent.style.transition = originalTransition
    // 重置其他可能的动画相关属性
    targetContent.style.opacity = ''
    targetContent.style.visibility = ''
    // 确保动画定时器被清除
    currentAnimationTimer = null
    
    // 当切换到聊天标签页时，检查当前是否有选中的联系人，如果有，更新聊天标题
    if (targetTab === 'chat') {
      const chatHeader = document.querySelector('.chat-header');
      const contactId = chatHeader ? chatHeader.getAttribute('data-contact-id') : null;
      if (contactId) {
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
          updateChatHeader(contact);
        }
      }
    }
  }, 600) // 等待600ms，与动画持续时间一致
  }
  
  // 默认激活聊天标签页 - 使用立即模式避免动画延迟
  switchTab('chat', true)
}

// 侧边栏聊天选项卡悬停弹窗功能
document.addEventListener('DOMContentLoaded', function() {
  const chatTab = document.querySelector('.sidebar-tab[data-tab="chat"]');
  const popup = chatTab.querySelector('.chat-tab-popup');
  
  // 模拟联系人数据
  const contactsData = [
    {
      id: 1,
      name: "DeepSeek",
      avatar: "images/app-icon.png",
      lastMessage: "你好，有什么可以帮助你的吗？",
      timestamp: "19:10",
      unread: 0
    },
    {
      id: 2,
      name: "通义千问",
      avatar: "images/app-icon.png",
      lastMessage: "今天天气不错呢！",
      timestamp: "昨天",
      unread: 3
    },
    {
      id: 3,
      name: "Claude",
      avatar: "images/app-icon.png",
      lastMessage: "我是一个AI助手。",
      timestamp: "周六",
      unread: 0
    },
    {
      id: 4,
      name: "GPT-4",
      avatar: "images/app-icon.png",
      lastMessage: "让我们一起解决问题吧！",
      timestamp: "周五",
      unread: 12
    },
    {
      id: 5,
      name: "Gemini",
      avatar: "images/app-icon.png",
      lastMessage: "这是一个很棒的想法！",
      timestamp: "周四",
      unread: 0
    },
    {
      id: 6,
      name: "Llama",
      avatar: "images/app-icon.png",
      lastMessage: "正在处理您的请求...",
      timestamp: "周三",
      unread: 0
    }
  ];
  
  // 渲染联系人列表
  function renderContacts() {
    // 清空现有内容
    popup.innerHTML = '';
    
    // 创建联系人列表
    contactsData.forEach(function(contact) {
      const contactItem = document.createElement('div');
      contactItem.className = 'chat-contact-item';
      
      // 构建未读消息数的HTML
      let unreadBadge = '';
      if (contact.unread > 0) {
        unreadBadge = `<span class="unread-count">${contact.unread}</span>`;
      }
      
      contactItem.innerHTML = `
        <div class="contact-avatar">
          <img src="${contact.avatar}" alt="${contact.name}">
        </div>
        <div class="contact-info">
          <div class="contact-name">${contact.name} ${unreadBadge}</div>
          <div class="contact-preview">
            <span class="last-message">${contact.lastMessage}</span>
            <span class="timestamp">${contact.timestamp}</span>
          </div>
        </div>
      `;
      
      // 添加点击事件
      contactItem.addEventListener('click', function() {
        // 切换到对应的聊天
        switchToChat(contact);
      });
      
      popup.appendChild(contactItem);
    });
  }
  
  // 初始化联系人列表
  renderContacts();
  
  // 添加鼠标悬停事件
  chatTab.addEventListener('mouseenter', function() {
    // 显示弹窗
    showPopup();
  });
  
  // 鼠标离开聊天tab时的处理
  chatTab.addEventListener('mouseleave', function(e) {
    // 检查鼠标是否移到了popup上
    setTimeout(() => {
      if (!popup.matches(':hover')) {
        hidePopup();
      }
    }, 100);
  });
  
  // 鼠标进入popup时保持显示
  popup.addEventListener('mouseenter', function() {
    showPopup();
  });
  
  // 鼠标离开popup时隐藏
  popup.addEventListener('mouseleave', function() {
    hidePopup();
  });
  
  // 显示弹窗的函数
  function showPopup() {
    popup.classList.add('show');
  }
  
  // 隐藏弹窗的函数
  function hidePopup() {
    popup.classList.remove('show');
  }
});

// 切换到指定联系人的聊天
// 联系人聊天记录数据
const chatRecords = {
  'DeepSeek': [
    {
      type: 'system',
      content: '今天 14:30'
    },
    {
      type: 'ai',
      content: '你好！我是 DeepSeek，很高兴为你提供帮助。',
      time: '14:31',
      avatar: 'images/app-icon.png'
    },
    {
      type: 'user',
      content: '你好！我想了解一下如何使用这个聊天应用。',
      time: '14:32',
      avatar: 'images/app-icon.png'
    }
  ],
  '阿里云百炼': [
    {
      type: 'system',
      content: '昨天 10:00'
    },
    {
      type: 'ai',
      content: '欢迎使用阿里云百炼服务，有什么可以帮助你的吗？',
      time: '10:01',
      avatar: 'images/app-icon.png'
    }
  ],
  'Kimi': [
    {
      type: 'system',
      content: '周一 16:45'
    },
    {
      type: 'ai',
      content: '你好，我是 Kimi，有什么想聊的吗？',
      time: '16:46',
      avatar: 'images/app-icon.png'
    }
  ]
};

// 加载聊天记录的函数
function loadChatHistory(contactName) {
  const chatMessagesContainer = document.getElementById('chat-messages');
  if (!chatMessagesContainer) return;
  
  // 清空现有聊天记录
  chatMessagesContainer.innerHTML = '';
  
  // 获取该联系人的聊天记录
  const messages = chatRecords[contactName] || [];
  
  // 渲染聊天记录
  messages.forEach(message => {
    let messageHTML;
    
    if (message.type === 'system') {
      messageHTML = `
        <div class="message system-message">
          <div class="message-content">
            <p>${message.content}</p>
          </div>
        </div>
      `;
    } else if (message.type === 'ai') {
      messageHTML = `
        <div class="message ai-message">
          <div class="message-avatar">
            <img src="${message.avatar || 'images/app-icon.png'}" alt="AI" width="32" height="32">
          </div>
          <div class="message-content">
            <p>${message.content}</p>
            <div class="message-time">${message.time}</div>
          </div>
        </div>
      `;
    } else if (message.type === 'user') {
      messageHTML = `
        <div class="message user-message">
          <div class="message-content">
            <p>${message.content}</p>
            <div class="message-time">${message.time}</div>
          </div>
          <div class="message-avatar">
            <img src="${message.avatar || 'images/app-icon.png'}" alt="我" width="32" height="32">
          </div>
        </div>
      `;
    }
    
    if (messageHTML) {
      chatMessagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    }
  });
  
  // 滚动到底部
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function switchToChat(contact) {
  console.log(`切换到与 ${contact.name} 的聊天`);
  
  // 更新主聊天区域的头部信息
  updateChatHeader(contact);
  
  // 加载该联系人的聊天记录
  loadChatHistory(contact.name);
  
  // 隐藏弹窗（使用class而不是直接修改style，避免覆盖CSS:hover样式）
  const popup = document.querySelector('.chat-contacts-popup');
  if (popup) {
    // 移除任何内联样式，让CSS:hover样式正常工作
    popup.removeAttribute('style');
    // 弹窗会自动关闭，因为鼠标离开了触发区域
  }
}

// 更新主聊天区域头部信息的函数
function updateChatHeader(contact) {
  // 查找聊天头部元素
  const chatNameElement = document.querySelector('.chat-name');
  const chatHeader = document.querySelector('.chat-header');
  if (chatNameElement) {
    chatNameElement.textContent = contact.name || contact.nickname;
  }
  
  // 更新头像
  const chatAvatarImg = document.querySelector('.chat-header .chat-avatar img');
  if (chatAvatarImg) {
    chatAvatarImg.src = contact.avatar;
  }
  
  // 保存当前联系人ID到聊天头部
  if (chatHeader && contact.id) {
    chatHeader.setAttribute('data-contact-id', contact.id);
  }
  
  console.log(`聊天头部已更新为: ${contact.name || contact.nickname}`);
}

// 联系人页面功能
function initContactsPage() {
  const searchInput = document.getElementById('contacts-search')
  if (!searchInput) {
    return
  }
  
  // 实时搜索功能
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim()
    const contactItems = document.querySelectorAll('.contact-item')
    
    contactItems.forEach(item => {
      const contactName = item.querySelector('.contact-name').textContent.toLowerCase()
      if (contactName.includes(searchTerm)) {
        item.style.display = 'flex'
      } else {
        item.style.display = 'none'
      }
    })
    
    // 更新联系人计数
    const visibleContacts = document.querySelectorAll('.contact-item[style*="display: flex"]').length
    const groupCount = document.querySelector('.group-count')
    if (groupCount) {
      groupCount.textContent = visibleContacts
    }
  })
}

// 初始化侧边栏标签功能 - 修复数据加载顺序
document.addEventListener('DOMContentLoaded', () => {
  // 立即初始化所有功能，确保数据能正确加载
  initSidebarTabs()
  initProfilePage()
  initContactsPage()
  initSettingsPage()
  initBackgroundImage()
  initBackgroundOpacity()
})

// 个人资料页面功能
function initProfilePage() {
  // 获取个人资料页面元素
  const changeAvatarBtn = document.getElementById('change-avatar-btn')
  const removeAvatarBtn = document.getElementById('remove-avatar-btn')
  const avatarInput = document.getElementById('avatar-input')
  const profileAvatar = document.getElementById('profile-avatar')
  const sidebarAvatar = document.getElementById('sidebar-avatar')
  const usernameInput = document.getElementById('username-input')
  const saveUsernameBtn = document.getElementById('save-username-btn')
  const sidebarUsername = document.getElementById('sidebar-username')
  
  // 从本地存储加载用户数据
  loadUserData()
  
  // 更换头像按钮现在是label元素，通过for属性关联到文件输入框，不需要额外的点击事件监听
  
  // 文件选择事件
  avatarInput.addEventListener('change', (e) => {
    const files = e.target.files
    if (!files || files.length === 0) {
      return
    }
    
    const file = files[0]
    // 输出选择的图片路径和文件信息
    console.log('选中的文件:')
    console.log('  文件名:', file.name)
    console.log('  文件类型:', file.type)
    console.log('  文件大小:', file.size, 'bytes')
    console.log('  文件路径:', file.path || '无法获取完整路径（安全限制）')
    console.log('  临时文件ID:', file.lastModified)
    
    // 特殊处理PNG格式
    const isPNG = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
    if (isPNG) {
      console.log('检测到PNG格式，将使用特殊处理流程')
    }
    
    // 检查文件是否为图片
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml']
    if (!file.type.startsWith('image/') && !acceptedTypes.includes(file.type)) {
      console.warn('文件类型不是图片:', file.type)
      customModal.alert('请选择有效的图片文件（JPG、PNG、GIF、BMP、WebP、SVG等格式）！')
      return
    }
    
    // 检查文件大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.warn('文件过大:', file.size, 'bytes')
      customModal.alert('图片文件过大，请选择小于10MB的图片！')
      return
    }
    
    // 对于PNG文件，直接使用Blob URL而不经过FileReader
    if (isPNG) {
      console.log('PNG文件：直接使用Blob URL方式加载')
      try {
        const blobUrl = URL.createObjectURL(file)
        console.log('  创建的Blob URL:', blobUrl)
        
        const img = new Image()
        img.onload = () => {
          console.log('PNG Blob URL加载成功:', img.width, 'x', img.height)
          showAvatarCropPage(blobUrl)
        }
        
        img.onerror = () => {
          console.error('PNG Blob URL加载失败，尝试FileReader方式')
          URL.revokeObjectURL(blobUrl)
          // 失败后回退到FileReader方式
          loadImageWithFileReader(file)
        }
        
        img.src = blobUrl
        console.log('PNG Blob URL加载请求已发送')
      } catch (error) {
        console.error('PNG Blob URL处理异常:', error)
        loadImageWithFileReader(file)
      }
    } else {
      // 其他格式使用原有的FileReader方式
      loadImageWithFileReader(file)
    }
  })
  
  // 使用FileReader加载图片的函数
  function loadImageWithFileReader(file) {
    console.log('使用FileReader方式加载图片:', file.name)
    
    // 先验证文件是否可以作为Blob URL访问
    const blobUrl = URL.createObjectURL(file)
    const testImg = new Image()
    
    testImg.onload = () => {
      console.log('Blob URL 测试加载成功:', testImg.width, 'x', testImg.height)
      URL.revokeObjectURL(blobUrl)
      
      // 继续使用FileReader读取文件
      const reader = new FileReader()
      
      // 读取成功事件
      reader.onload = (e) => {
        try {
          const imageUrl = e.target.result
          console.log('FileReader读取成功，准备显示裁剪页面')
          // 显示裁剪页面
          showAvatarCropPage(imageUrl)
        } catch (error) {
          console.error('图片处理失败：', error)
          customModal.alert('图片处理失败，请稍后重试！')
        }
      }
      
      // 读取错误事件
      reader.onerror = (error) => {
        console.error('图片读取失败：', error)
        customModal.alert('图片读取失败，请检查文件是否损坏！')
      }
      
      // 开始读取文件
      try {
        reader.readAsDataURL(file)
      } catch (error) {
        console.error('读取文件时发生错误：', error)
        customModal.alert('读取文件时发生错误，请检查文件是否有效！')
      }
    }
    
    testImg.onerror = () => {
      console.error('Blob URL 测试加载失败，文件可能损坏')
      URL.revokeObjectURL(blobUrl)
      customModal.alert('图片文件可能已损坏或格式不支持，请选择其他图片！')
    }
    
    // 开始测试加载
    testImg.src = blobUrl
  }
  
  // 移除头像按钮点击事件
  removeAvatarBtn.addEventListener('click', () => {
    customModal.confirm('确定要移除当前头像吗？').then((result) => {
      if (result) {
        removeAvatar()
      }
    })
  })
  
  // 保存用户名按钮点击事件
  saveUsernameBtn.addEventListener('click', () => {
    const newUsername = usernameInput.value.trim()
    if (newUsername) {
      if (newUsername.length > 20) {
        customModal.alert('用户名不能超过20个字符！')
        return
      }
      updateUsername(newUsername)
    } else {
      customModal.alert('请输入用户名！')
    }
  })
  
  // 回车键保存用户名
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveUsernameBtn.click()
    }
  })
  
  // 更新头像函数
  function updateAvatar(imageUrl) {
    profileAvatar.src = imageUrl
    sidebarAvatar.src = imageUrl
    
    // 保存到本地存储
    const userData = getUserData()
    userData.avatar = imageUrl
    saveUserData(userData)
    
    // 输出头像存放路径
    console.log('头像已更新:')
    console.log('  头像URL:', imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''))
    console.log('  存放位置: localStorage - userData.avatar')
    console.log('  数据类型:', imageUrl.startsWith('data:image/') ? 'Data URL' : '普通URL')
    console.log('  数据大小:', imageUrl.length, '字符')
  }
  
  // 移除头像函数
  function removeAvatar() {
    const defaultAvatar = 'images/app-icon.png'
    profileAvatar.src = defaultAvatar
    sidebarAvatar.src = defaultAvatar
    
    // 保存到本地存储
    const userData = getUserData()
    userData.avatar = defaultAvatar
    saveUserData(userData)
    
    console.log('头像已重置为默认头像')
  }
  
  // 更新用户名函数
  function updateUsername(username) {
    sidebarUsername.textContent = username
    usernameInput.value = username
    
    // 保存到本地存储
    const userData = getUserData()
    userData.username = username
    saveUserData(userData)
    
    console.log('用户名已更新为：' + username)
    customModal.alert('用户名保存成功！')
  }
  
  // 获取用户数据
  function getUserData() {
    const defaultData = {
      username: '我的',
      avatar: 'images/app-icon.png',
      userId: 'user_' + Math.random().toString(36).substr(2, 8),
      registerTime: new Date().toISOString().split('T')[0]
    }
    
    try {
      const savedData = localStorage.getItem('userData')
      return savedData ? JSON.parse(savedData) : defaultData
    } catch (error) {
      console.error('加载用户数据失败：', error)
      return defaultData
    }
  }
  
  // 保存用户数据
  function saveUserData(userData) {
    try {
      localStorage.setItem('userData', JSON.stringify(userData))
    } catch (error) {
      console.error('保存用户数据失败：', error)
    }
  }
  
  // 加载用户数据 - 修复头像和用户名加载
function loadUserData() {
  const userData = getUserData()
  
  // 立即更新用户名显示，不延迟
  if (sidebarUsername) sidebarUsername.textContent = userData.username
  if (usernameInput) usernameInput.value = userData.username
  
  // 头像加载 - 立即设置，但处理加载状态
  const loadAvatar = () => {
    // 为头像添加加载失败处理，避免空白或延迟
    if (userData.avatar) {
      // 立即设置头像源，不等待加载完成
      if (profileAvatar) {
        profileAvatar.src = userData.avatar
        profileAvatar.style.opacity = '0.5' // 加载中状态
      }
      if (sidebarAvatar) {
        sidebarAvatar.src = userData.avatar
        sidebarAvatar.style.opacity = '0.5' // 加载中状态
      }
      
      // 设置加载事件处理
      if (profileAvatar) {
        profileAvatar.onload = () => {
          profileAvatar.style.opacity = '1'
        }
        profileAvatar.onerror = () => {
          // 使用默认头像
          profileAvatar.src = 'images/app-icon.png'
          profileAvatar.style.opacity = '1'
        }
      }
      
      if (sidebarAvatar) {
        sidebarAvatar.onload = () => {
          sidebarAvatar.style.opacity = '1'
        }
        sidebarAvatar.onerror = () => {
          // 使用默认头像
          sidebarAvatar.src = 'images/app-icon.png'
          sidebarAvatar.style.opacity = '1'
        }
      }
    } else {
      // 如果没有头像数据，使用默认头像
      if (profileAvatar) {
        profileAvatar.src = 'images/app-icon.png'
        profileAvatar.style.opacity = '1'
      }
      if (sidebarAvatar) {
        sidebarAvatar.src = 'images/app-icon.png'
        sidebarAvatar.style.opacity = '1'
      }
    }
  }
  
  // 如果DOM已经加载完成，立即执行；否则等待
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAvatar)
  } else {
    loadAvatar()
  }
}
  
  // 显示头像裁剪页面
  function showAvatarCropPage(imageUrl) {
    console.log('显示裁剪页面，图片URL长度:', imageUrl.length)
    
    // 隐藏所有内容区域
    document.querySelectorAll('.content-area').forEach(area => {
      area.style.display = 'none'
    })
    
    // 显示裁剪页面
    const cropContent = document.getElementById('avatar-crop-content')
    if (!cropContent) {
      console.error('裁剪页面元素不存在')
      customModal.alert('裁剪功能初始化失败，请刷新页面重试')
      return
    }
    
    cropContent.style.display = 'block'
    
    // 初始化裁剪功能
    initAvatarCrop(imageUrl, 'user')
  }
  
  // 显示联系人头像裁剪页面
  function showContactAvatarCropPage(imageUrl) {
    console.log('显示联系人头像裁剪页面，图片URL长度:', imageUrl.length)
    
    // 隐藏所有内容区域
    document.querySelectorAll('.content-area').forEach(area => {
      area.style.display = 'none'
    })
    
    // 显示裁剪页面
    const cropContent = document.getElementById('avatar-crop-content')
    if (!cropContent) {
      console.error('裁剪页面元素不存在')
      customModal.alert('裁剪功能初始化失败，请刷新页面重试')
      return
    }
    
    cropContent.style.display = 'block'
    
    // 初始化裁剪功能
    initAvatarCrop(imageUrl, 'contact')
  }
  
  // 头像裁剪功能 - 使用 Cropper.js 实现
  function initAvatarCrop(imageUrl, avatarType) {
    // 获取DOM元素
    const canvas = document.getElementById('avatar-canvas');
    const clipImg = document.getElementById('clip-img');
    const uploadFile = document.getElementById('avatar-upload-file');
    const saveBtn = document.getElementById('crop-confirm-btn');
    const cancelBtn = document.getElementById('crop-cancel-btn');
    
    let cropper = null;
    
    // 移除可能存在的事件监听器（防止重复绑定）
    // 先克隆元素，然后替换它，这样可以移除所有事件监听器
    const newUploadFile = uploadFile.cloneNode(true);
    uploadFile.parentNode.replaceChild(newUploadFile, uploadFile);
    
    // 使用新的元素引用
    const fileInput = newUploadFile;
    
    // 重置文件输入值
    fileInput.value = '';
    
    // 如果传入了图片URL，直接加载
    if (imageUrl) {
      loadImage(imageUrl);
    }
    
    // 重新选择图片事件
    fileInput.addEventListener('change', (e) => {
      const fileData = e.target.files[0];
      if (fileData) {
        const reader = new FileReader();
        reader.readAsDataURL(fileData);
        reader.onload = function (e) {
          const imgUrl = this.result;
          loadImage(imgUrl);
        };
      }
    });
    
    // 加载图片函数
    function loadImage(imgUrl) {
      // 销毁之前的 cropper 实例
      if (cropper) {
        cropper.destroy();
      }
      
      // 设置图片源
      clipImg.src = imgUrl;
      
      // 图片加载完成后初始化 cropper
      clipImg.onload = function () {
        // 初始化 Cropper.js
        cropper = new Cropper(clipImg, {
          aspectRatio: 1, // 1:1 比例
          viewMode: 1,
          dragMode: 'move',
          cropBoxMovable: true,
          cropBoxResizable: false,
          autoCropArea: 0.8,
          background: true,
          guides: false,
          center: true,
          highlight: true,
          responsive: true,
          restore: true,
          checkCrossOrigin: false,
          // 添加裁剪事件，实时更新预览
          crop: function(event) {
            updatePreview();
          }
        });
        
        // 初始加载时更新预览
        updatePreview();
      };
    }
    
    // 更新预览图像
    function updatePreview() {
      if (cropper) {
        const previewImg = document.getElementById('preview-img');
        
        // 获取裁剪后的画布
        const croppedCanvas = cropper.getCroppedCanvas({
          width: 200,
          height: 200,
          fillColor: '#fff',
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });
        
        // 设置预览图像源
        previewImg.src = croppedCanvas.toDataURL('image/png');
        previewImg.style.display = 'block';
      }
    }
    
    // 保存裁剪后的头像
    function handleSave() {
      if (cropper) {
        // 获取裁剪后的画布
        const croppedCanvas = cropper.getCroppedCanvas({
          width: 300,
          height: 300,
          fillColor: '#fff',
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });
        
        // 保存裁剪后的头像
        saveCroppedAvatar(croppedCanvas, avatarType);
        
        // 销毁 cropper 实例
        cropper.destroy();
      } else {
        customModal.alert('请先选择图片！');
      }
    }
    
    // 取消裁剪
    function handleCancel() {
      // 销毁 cropper 实例
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      
      // 根据头像类型返回不同页面
      document.querySelectorAll('.content-area').forEach(area => {
        area.style.display = 'none'
      })
      
      if (avatarType === 'contact') {
        // 返回联系人创建/编辑弹窗
        // 注意：这里不需要重新显示弹窗，因为弹窗一直是显示状态
        // 只需要关闭裁剪页面即可
      } else {
        // 返回个人资料页面
        document.getElementById('profile-content').style.display = 'block'
        
        // 重新激活个人资料标签
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
          tab.classList.remove('active')
        })
        document.querySelector('[data-tab="profile"]').classList.add('active')
      }
    }
    
    // 绑定按钮事件（只绑定一次）
    saveBtn.onclick = handleSave;
    cancelBtn.onclick = handleCancel;
  }
  
  // 保存裁剪后的头像
  function saveCroppedAvatar(canvas, avatarType) {
    try {
      // 将canvas转换为base64数据URL
      const dataUrl = canvas.toDataURL('image/png')
      
      console.log('头像已生成，准备保存')
      
      if (avatarType === 'contact') {
        // 更新联系人头像预览
        const contactAvatarPreview = document.getElementById('contact-avatar-preview');
        contactAvatarPreview.querySelector('img').src = dataUrl;
        
        // 关闭裁剪页面
        document.querySelectorAll('.content-area').forEach(area => {
          area.style.display = 'none'
        })
        
        // 返回到联系人创建/编辑弹窗
        // 弹窗应该已经在显示状态，不需要重新显示
        
        customModal.alert('头像裁剪完成！')
      } else {
        // 更新用户头像显示
        updateAvatar(dataUrl)
        
        // 返回个人资料页面
        document.querySelectorAll('.content-area').forEach(area => {
          area.style.display = 'none'
        })
        document.getElementById('profile-content').style.display = 'block'
        
        // 重新激活个人资料标签
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
          tab.classList.remove('active')
        })
        document.querySelector('[data-tab="profile"]').classList.add('active')
        
        customModal.alert('头像裁剪完成！')
      }
      
    } catch (error) {
      console.error('保存头像失败：', error)
      customModal.alert('保存头像失败：' + error.message)
    }
  }
}

// 显示联系人头像裁剪弹窗
function showContactAvatarCropModal(imageUrl) {
  console.log('显示联系人头像裁剪弹窗，图片URL长度:', imageUrl.length)
  
  // 显示裁剪弹窗
  const cropModal = document.getElementById('avatar-crop-modal')
  if (!cropModal) {
    console.error('裁剪弹窗元素不存在')
    customModal.alert('裁剪功能初始化失败，请刷新页面重试')
    return
  }
  
  cropModal.style.display = 'flex'
  
  // 初始化裁剪功能
  initModalAvatarCrop(imageUrl)
}

// 弹窗中的头像裁剪功能 - 使用 Cropper.js 实现
function initModalAvatarCrop(imageUrl) {
  // 获取DOM元素
  const canvas = document.getElementById('modal-avatar-canvas');
  const clipImg = document.getElementById('modal-clip-img');
  const uploadFile = document.getElementById('avatar-modal-upload-file');
  const saveBtn = document.getElementById('modal-crop-confirm-btn');
  const cancelBtn = document.getElementById('modal-crop-cancel-btn');
  const closeBtn = document.querySelector('#avatar-crop-modal .custom-modal-close');
  
  let cropper = null;
  
  // 移除可能存在的事件监听器（防止重复绑定）
  // 先克隆元素，然后替换它，这样可以移除所有事件监听器
  const newUploadFile = uploadFile.cloneNode(true);
  uploadFile.parentNode.replaceChild(newUploadFile, uploadFile);
  
  // 使用新的元素引用
  const fileInput = newUploadFile;
  
  // 重置文件输入值
  fileInput.value = '';
  
  // 如果传入了图片URL，直接加载
  if (imageUrl) {
    loadImage(imageUrl);
  }
  
  // 重新选择图片事件
  fileInput.addEventListener('change', (e) => {
    const fileData = e.target.files[0];
    if (fileData) {
      const reader = new FileReader();
      reader.readAsDataURL(fileData);
      reader.onload = function (e) {
        const imgUrl = this.result;
        loadImage(imgUrl);
      };
    }
  });
  
  // 加载图片函数
  function loadImage(imgUrl) {
    // 销毁之前的 cropper 实例
    if (cropper) {
      cropper.destroy();
    }
    
    // 设置图片源
    clipImg.src = imgUrl;
    
    // 图片加载完成后初始化 cropper
    clipImg.onload = function () {
      // 初始化 Cropper.js
      cropper = new Cropper(clipImg, {
        aspectRatio: 1, // 1:1 比例
        viewMode: 1,
        dragMode: 'move',
        cropBoxMovable: true,
        cropBoxResizable: false,
        autoCropArea: 0.8,
        background: true,
        guides: false,
        center: true,
        highlight: true,
        responsive: true,
        restore: true,
        checkCrossOrigin: false,
        // 添加裁剪事件，实时更新预览
        crop: function(event) {
          updatePreview();
        }
      });
      
      // 初始加载时更新预览
      updatePreview();
    };
  }
  
  // 更新预览图像
  function updatePreview() {
    if (cropper) {
      const previewImg = document.getElementById('modal-preview-img');
      
      // 获取裁剪后的画布
      const croppedCanvas = cropper.getCroppedCanvas({
        width: 200,
        height: 200,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });
      
      // 设置预览图像源
      previewImg.src = croppedCanvas.toDataURL('image/png');
      previewImg.style.display = 'block';
    }
  }
  
  // 保存裁剪后的头像
  function handleSave() {
    if (cropper) {
      // 获取裁剪后的画布
      const croppedCanvas = cropper.getCroppedCanvas({
        width: 300,
        height: 300,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });
      
      // 保存裁剪后的头像
      saveModalCroppedAvatar(croppedCanvas);
      
      // 销毁 cropper 实例
      cropper.destroy();
    } else {
      customModal.alert('请先选择图片！');
    }
  }
  
  // 取消裁剪
  function handleCancel() {
    // 销毁 cropper 实例
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    
    // 关闭裁剪弹窗
    const cropModal = document.getElementById('avatar-crop-modal');
    cropModal.style.display = 'none';
  }
  
  // 绑定按钮事件（只绑定一次）
  saveBtn.onclick = handleSave;
  cancelBtn.onclick = handleCancel;
  closeBtn.onclick = handleCancel;
}

// 保存弹窗中裁剪后的头像
function saveModalCroppedAvatar(canvas) {
  try {
    // 将canvas转换为base64数据URL
    const dataUrl = canvas.toDataURL('image/png')
    
    console.log('头像已生成，准备保存')
    
    // 更新联系人头像预览
    const contactAvatarPreview = document.getElementById('contact-avatar-preview');
    contactAvatarPreview.querySelector('img').src = dataUrl;
    
    // 关闭裁剪弹窗
    const cropModal = document.getElementById('avatar-crop-modal');
    cropModal.style.display = 'none';
    
    customModal.alert('头像裁剪完成！')
    
  } catch (error) {
    console.error('保存头像失败：', error)
    customModal.alert('保存头像失败：' + error.message)
  }
}

// 防止意外缩放的保护机制
document.addEventListener('keydown', (e) => {
  // 防止 Ctrl + 加号/减号缩放
  if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
    e.preventDefault()
    console.log('缩放快捷键已被禁用')
  }
  
  // 防止 Ctrl + 0 被意外触发（如果你想保留这个功能，可以注释掉）
  // if (e.ctrlKey && e.key === '0') {
  //   e.preventDefault()
  //   console.log('重置缩放快捷键已被禁用')
  // }
})

// 设置页面功能
function initSettingsPage() {
  // 获取设置页面元素
  const sidebarItems = document.querySelectorAll('.sidebar-item')
  const settingTabs = document.querySelectorAll('.settings-tab')
  
  // 标签页切换功能
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab')
      switchSettingTab(targetTab)
    })
  })
  
  function switchSettingTab(targetTab) {
    // 移除所有标签页的激活状态
    sidebarItems.forEach(item => {
      item.classList.remove('active')
    })
    
    // 每次切换时重新获取所有设置标签页，确保包含最新克隆的元素
    const currentSettingTabs = document.querySelectorAll('.settings-tab')
    
    // 隐藏所有内容区域
    currentSettingTabs.forEach(tab => {
      tab.classList.remove('active')
    })
    
    // 激活目标标签页
    const activeItem = document.querySelector(`[data-tab="${targetTab}"]`)
    if (activeItem) {
      activeItem.classList.add('active')
    }
    
    // 显示目标内容区域
    const activeTab = document.getElementById(`${targetTab}-tab`)
    if (activeTab) {
      activeTab.classList.add('active')
    }
    
    // 如果切换到通用设置标签页，重新初始化自定义下拉菜单
    if (targetTab === 'test') {
      // 延迟初始化，确保DOM已经更新
      setTimeout(() => {
        initCustomDropdowns()
        console.log('切换到通用设置标签页，重新初始化下拉菜单')
      }, 50)
    }
  }
  
  // 开关切换功能
  const toggleSwitches = document.querySelectorAll('.toggle-switch')
  toggleSwitches.forEach(switchEl => {
    switchEl.addEventListener('click', () => {
      switchEl.classList.toggle('active')
    })
  })
  
  // 初始化主题
  initTheme()
  
  // 模式选择功能 - 实现深浅色切换
  const modeItems = document.querySelectorAll('.mode-item')
  
  // 清除数据功能
  function initClearDataFunctions() {
    // 获取清除数据按钮
    const clearAllDataBtn = document.getElementById('clear-all-data-btn')
    const clearContactsBtn = document.getElementById('clear-contacts-btn')
    const clearUserDataBtn = document.getElementById('clear-user-data-btn')
    
    // 清除全部数据
    if (clearAllDataBtn) {
      clearAllDataBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        customModal.confirm('确定要清除所有数据吗？此操作不可逆！').then((result) => {
          if (result) {
            // 清除所有localStorage数据
            localStorage.clear()
            // 重新加载页面
            location.reload()
          }
        })
      })
    }
    
    // 清除联系人数据
    if (clearContactsBtn) {
      clearContactsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        customModal.confirm('确定要清除联系人数据吗？此操作不可逆！').then((result) => {
          if (result) {
            // 清除联系人数据
            localStorage.removeItem('contacts')
            // 重新加载页面
            location.reload()
          }
        })
      })
    }
    
    // 清除用户数据
    if (clearUserDataBtn) {
      clearUserDataBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        customModal.confirm('确定要清除用户数据吗？此操作不可逆！').then((result) => {
          if (result) {
            // 清除用户数据
            localStorage.removeItem('userData')
            localStorage.removeItem('pageAnimationType')
            localStorage.removeItem('backgroundType')
            localStorage.removeItem('theme')
            // 重新加载页面
            location.reload()
          }
        })
      })
    }
  }
  
  // 初始化清除数据功能
  initClearDataFunctions()
  modeItems.forEach(item => {
    item.addEventListener('click', () => {
      // 移除所有模式的激活状态
      modeItems.forEach(mode => {
        mode.classList.remove('active')
      })
      // 激活当前模式
      item.classList.add('active')
      
      // 获取选中的模式
      const mode = item.getAttribute('data-mode')
      
      // 切换主题
      toggleTheme(mode)
    })
  })
  
  // 延迟初始化自定义下拉菜单，确保设置页面的内容区域已经显示
  setTimeout(() => {
    initCustomDropdowns()
  }, 100)
  
  // 初始化API密钥数据管理
  initApiKeysData()
}

// API 密钥数据管理
let apiKeys = []
let currentEditingKeyId = null

// AES加密配置
const AES_CONFIG = {
  // 生成一个基于应用信息的安全密钥（实际项目中应考虑更安全的密钥管理方式）
  key: CryptoJS.SHA256('WuJieAiChat-Desktop').toString(CryptoJS.enc.Hex).substring(0, 32),
  iv: CryptoJS.SHA256('WuJieAiChat-Initialization-Vector').toString(CryptoJS.enc.Hex).substring(0, 16)
}

// AES加密函数
function encryptData(data) {
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(data),
    AES_CONFIG.key,
    {
      iv: AES_CONFIG.iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  )
  return encrypted.toString()
}

// AES解密函数
function decryptData(encryptedData) {
  try {
    const decrypted = CryptoJS.AES.decrypt(
      encryptedData,
      AES_CONFIG.key,
      {
        iv: AES_CONFIG.iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    )
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8))
  } catch (error) {
    console.error('解密失败:', error)
    return []
  }
}

// 初始化API密钥数据 - 修复数据加载
function initApiKeysData() {
  // 立即初始化API配置弹窗（不依赖数据）
  initApiConfigModal()
  
  // 立即尝试加载现有数据
  loadApiKeys()
  
  // 使用requestAnimationFrame延迟渲染，但确保数据能显示
  requestAnimationFrame(() => {
    // 渲染API密钥列表
    renderApiKeys()
    // 绑定事件
    bindApiKeyEvents()
  })
}

// 从本地存储加载API密钥数据（解密）- 修复同步加载
function loadApiKeys() {
  try {
    const savedKeys = localStorage.getItem('apiKeys')
    if (savedKeys) {
      // 立即解密数据，确保能立即显示
      try {
        apiKeys = decryptData(savedKeys)
      } catch (error) {
        console.error('解密API密钥失败:', error)
        apiKeys = []
      }
    } else {
      // 不初始化默认数据，空数组
      apiKeys = []
    }
  } catch (error) {
    console.error('加载API密钥失败:', error)
    apiKeys = []
  }
}

// 保存API密钥数据到本地存储（加密）- 修复同步保存
function saveApiKeys() {
  try {
    // 立即加密并保存数据
    const encryptedData = encryptData(apiKeys)
    localStorage.setItem('apiKeys', encryptedData)
  } catch (error) {
    console.error('保存API密钥失败:', error)
  }
}

// 渲染API密钥列表 - 优化DOM操作
function renderApiKeys() {
  const apiKeysTab = document.getElementById('api-keys-tab')
  if (!apiKeysTab) return
  
  // 更新密钥数量
  const countNumber = document.querySelector('.key-count-card .count-number')
  if (countNumber) {
    countNumber.textContent = apiKeys.length
  }
  
  // 获取密钥列表容器 - 选择最后一个section作为密钥列表容器
  const sections = apiKeysTab.querySelectorAll('.section')
  if (sections.length < 2) return
  
  const keyListSection = sections[1] // 第二个section是密钥列表容器
  
  // 使用DocumentFragment减少DOM重排
  const fragment = document.createDocumentFragment()
  
  // 渲染每个API密钥
  if (apiKeys.length > 0) {
    apiKeys.forEach(key => {
      const keyCard = createKeyCard(key)
      fragment.appendChild(keyCard)
    })
  } else {
    // 如果没有API密钥，显示提示信息
    const emptyState = document.createElement('div')
    emptyState.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #6c757d;">
        <div style="font-size: 48px; margin-bottom: 10px;">🔑</div>
        <div style="font-size: 16px; margin-bottom: 5px;">暂无API密钥</div>
        <div style="font-size: 14px;">点击"添加新密钥"按钮添加API密钥</div>
      </div>
    `
    fragment.appendChild(emptyState)
  }
  
  // 一次性更新DOM，减少重排
  keyListSection.innerHTML = ''
  keyListSection.appendChild(fragment)
}

// 创建密钥卡片元素
function createKeyCard(key) {
  const keyCard = document.createElement('div')
  keyCard.className = 'key-card'
  keyCard.dataset.id = key.id
  
  // 生成脱敏显示的密钥
  const desensitizedKey = desensitizeKey(key.key)
  
  // 密钥状态标签
  const statusText = key.status === 'active' ? '活跃' : '禁用'
  const statusClass = key.status === 'active' ? 'active' : 'inactive'
  
  keyCard.innerHTML = `
    <div class="key-main">
      <div class="key-text">${key.name}</div>
      <div class="status-tag ${statusClass}">${statusText}</div>
    </div>
    <div class="key-desensitize">
      <div class="desensitize-text">${desensitizedKey}</div>
      <button class="copy-btn" data-key="${key.key}">
        <span>📋</span>
      </button>
    </div>
    <div class="key-meta">
      <div>平台: ${key.platform}</div>
      <div>创建于 ${key.createdAt}</div>
    </div>
    <div class="key-actions">
      <button class="edit-btn" data-id="${key.id}">编辑</button>
      <button class="delete-btn" data-id="${key.id}">删除</button>
    </div>
  `
  
  return keyCard
}

// 密钥脱敏处理
function desensitizeKey(key) {
  if (key.length <= 8) return key
  return key.substring(0, 6) + '······' + key.substring(key.length - 6)
}

// 复制密钥到剪贴板
async function copyKeyToClipboard(key) {
  try {
    // 确保文档获得焦点，使用body元素而不是document
    document.body.focus()
    
    await navigator.clipboard.writeText(key)
    customModal.alert('密钥已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    customModal.alert('复制失败，请手动复制')
  }
}

// 初始化API配置弹窗
function initApiConfigModal() {
  const modal = document.getElementById('api-config-modal')
  const closeModalBtn = document.getElementById('close-modal')
  const cancelBtn = document.getElementById('cancel-btn')
  const saveBtn = document.getElementById('save-btn')
  
  // 关闭弹窗的函数
  function closeModal() {
    modal.style.display = 'none'
    // 重置表单
    resetApiConfigForm()
    currentEditingKeyId = null
  }
  
  // 关闭弹窗事件
  closeModalBtn.addEventListener('click', closeModal)
  cancelBtn.addEventListener('click', closeModal)
  
  // 点击弹窗外部关闭弹窗
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal()
    }
  })
  
  // 保存按钮事件
  saveBtn.addEventListener('click', saveApiKey)
  
  // 表单输入事件 - 只重置错误状态，不显示错误信息
  const apiNameInput = document.getElementById('api-name')
  const apiKeyInput = document.getElementById('api-key')
  
  apiNameInput.addEventListener('input', () => {
    apiNameInput.classList.remove('invalid')
    document.getElementById('api-name-error').textContent = ''
  })
  
  apiKeyInput.addEventListener('input', () => {
    apiKeyInput.classList.remove('invalid')
    document.getElementById('api-key-error').textContent = ''
  })
}

// 重置API配置表单
function resetApiConfigForm() {
  document.getElementById('modal-title').textContent = '添加API密钥'
  document.getElementById('api-platform').value = 'DeepSeek'
  
  // 重置API名称
  const apiNameInput = document.getElementById('api-name')
  apiNameInput.value = ''
  apiNameInput.classList.remove('invalid')
  document.getElementById('api-name-error').textContent = ''
  
  // 重置API密钥
  const apiKeyInput = document.getElementById('api-key')
  apiKeyInput.value = ''
  apiKeyInput.classList.remove('invalid')
  document.getElementById('api-key-error').textContent = ''
  
  currentEditingKeyId = null
  
  // 保存按钮始终启用
  document.getElementById('save-btn').disabled = false
}

// 验证表单
function validateForm() {
  const apiNameInput = document.getElementById('api-name')
  const apiKeyInput = document.getElementById('api-key')
  const apiNameError = document.getElementById('api-name-error')
  const apiKeyError = document.getElementById('api-key-error')
  const saveBtn = document.getElementById('save-btn')
  
  const apiName = apiNameInput.value.trim()
  const apiKey = apiKeyInput.value.trim()
  
  let isValid = true
  
  // 验证API名称
  if (!apiName) {
    apiNameInput.classList.add('invalid')
    apiNameError.textContent = '请输入API名称'
    isValid = false
  } else {
    apiNameInput.classList.remove('invalid')
    apiNameError.textContent = ''
  }
  
  // 验证API密钥
  if (!apiKey) {
    apiKeyInput.classList.add('invalid')
    apiKeyError.textContent = '请输入API密钥'
    isValid = false
  } else {
    apiKeyInput.classList.remove('invalid')
    apiKeyError.textContent = ''
  }
  
  return isValid
}

// 显示API配置弹窗
function showApiConfigModal(keyId = null) {
  const modal = document.getElementById('api-config-modal')
  const modalTitle = document.getElementById('modal-title')
  
  if (keyId) {
    // 编辑模式
    modalTitle.textContent = '编辑API密钥'
    currentEditingKeyId = keyId
    
    // 填充现有数据
    const key = apiKeys.find(key => key.id === keyId)
    if (key) {
      document.getElementById('api-platform').value = key.platform
      
      // 填充API名称
      const apiNameInput = document.getElementById('api-name')
      apiNameInput.value = key.name
      apiNameInput.classList.remove('invalid')
      document.getElementById('api-name-error').textContent = ''
      
      // 填充API密钥
      const apiKeyInput = document.getElementById('api-key')
      apiKeyInput.value = key.key
      apiKeyInput.classList.remove('invalid')
      document.getElementById('api-key-error').textContent = ''
    }
  } else {
    // 添加模式
    modalTitle.textContent = '添加API密钥'
    resetApiConfigForm()
  }
  
  modal.style.display = 'block'
}

// 保存API密钥
function saveApiKey() {
  // 先进行表单验证
  if (!validateForm()) {
    return
  }
  
  const platform = document.getElementById('api-platform').value
  const name = document.getElementById('api-name').value.trim()
  const key = document.getElementById('api-key').value.trim()
  
  const now = new Date().toISOString().split('T')[0]
  
  if (currentEditingKeyId) {
    // 编辑现有密钥
    const keyIndex = apiKeys.findIndex(key => key.id === currentEditingKeyId)
    if (keyIndex !== -1) {
      apiKeys[keyIndex] = {
        ...apiKeys[keyIndex],
        platform,
        name,
        key
      }
    }
  } else {
    // 添加新密钥
    const newKey = {
      id: Date.now().toString(),
      platform,
      name,
      key,
      status: 'active',
      createdAt: now
    }
    apiKeys.push(newKey)
  }
  
  // 保存到本地存储
  saveApiKeys()
  
  // 重新渲染密钥列表
  renderApiKeys()
  bindApiKeyEvents()
  
  // 关闭弹窗
  document.getElementById('api-config-modal').style.display = 'none'
  resetApiConfigForm()
  currentEditingKeyId = null
}

// 添加新密钥
function addNewKey() {
  showApiConfigModal()
}

// 编辑密钥
function editKey(id) {
  showApiConfigModal(id)
}

// 删除密钥
function deleteKey(id) {
  customModal.confirm('确定要删除这个API密钥吗？', '确认删除').then((result) => {
    if (result) {
      apiKeys = apiKeys.filter(key => key.id !== id)
      saveApiKeys()
      renderApiKeys()
      bindApiKeyEvents()
    }
  })
}

// 切换密钥状态
function toggleKeyStatus(id) {
  const keyIndex = apiKeys.findIndex(key => key.id === id)
  if (keyIndex === -1) return
  
  apiKeys[keyIndex].status = apiKeys[keyIndex].status === 'active' ? 'inactive' : 'active'
  saveApiKeys()
  renderApiKeys()
  bindApiKeyEvents()
}

// 绑定API密钥相关事件 - 优化事件委托，确保只绑定一次
function bindApiKeyEvents() {
  // 使用事件委托，避免为每个按钮单独绑定事件
  const apiKeysTab = document.getElementById('api-keys-tab')
  if (!apiKeysTab) return
  
  // 先移除所有可能存在的点击事件监听器，避免重复绑定
  // 由于无法直接获取事件监听器列表，我们采用替换元素的方式
  const newApiKeysTab = apiKeysTab.cloneNode(true)
  apiKeysTab.parentNode.replaceChild(newApiKeysTab, apiKeysTab)
  
  // 重新获取引用
  const updatedApiKeysTab = document.getElementById('api-keys-tab')
  
  // 复制按钮事件 - 使用事件委托
  updatedApiKeysTab.addEventListener('click', (e) => {
    if (e.target.closest('.copy-btn')) {
      const btn = e.target.closest('.copy-btn')
      const key = btn.getAttribute('data-key')
      copyKeyToClipboard(key)
    }
  })
  
  // 编辑按钮事件 - 使用事件委托
  updatedApiKeysTab.addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn')) {
      const btn = e.target.closest('.edit-btn')
      const id = btn.getAttribute('data-id')
      editKey(id)
    }
  })
  
  // 删除按钮事件 - 使用事件委托
  updatedApiKeysTab.addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) {
      const btn = e.target.closest('.delete-btn')
      const id = btn.getAttribute('data-id')
      deleteKey(id)
    }
  })
  
  // 添加密钥按钮事件 - 单独绑定，因为不在apiKeysTab内
  const addBtn = document.querySelector('.add-key-btn-small')
  if (addBtn) {
    // 先移除可能存在的点击事件监听器
    const newAddBtn = addBtn.cloneNode(true)
    addBtn.parentNode.replaceChild(newAddBtn, addBtn)
    
    // 重新获取引用并绑定事件
    const updatedAddBtn = document.querySelector('.add-key-btn-small')
    updatedAddBtn.addEventListener('click', addNewKey)
  }
}

// 初始化自定义下拉菜单
function initCustomDropdowns() {
  const customDropdowns = document.querySelectorAll('.custom-dropdown')
  
  // 初始化动画选择器的默认值
  const animationSelected = document.getElementById('animation-type-selected')
  if (animationSelected) {
    const savedAnimation = localStorage.getItem('pageAnimationType') || 'slide'
    // 将动画类型映射为显示文本
    const animationTextMap = {
      'slide': '滑动',
      'fade': '淡入淡出',
      'zoom': '缩放',
      'rotate': '旋转',
      'fly': '飞入'
    }
    animationSelected.textContent = animationTextMap[savedAnimation] || '滑动'
  }
  
  // 初始化背景样式选择器的默认值
  const backgroundSelected = document.getElementById('background-type-selected')
  if (backgroundSelected) {
    const savedBackground = localStorage.getItem('backgroundType') || 'default'
    // 将背景类型映射为显示文本
    const backgroundTextMap = {
      'default': '默认',
      'light': '浅色渐变',
      'dark': '深色渐变',
      'blur': '毛玻璃效果'
    }
    backgroundSelected.textContent = backgroundTextMap[savedBackground] || '默认'
    // 应用背景样式
    applyBackgroundStyle(savedBackground)
  }
  
  // 使用addEventListener绑定事件监听器
  customDropdowns.forEach(dropdown => {
    const selected = dropdown.querySelector('.custom-dropdown-selected')
    const options = dropdown.querySelector('.custom-dropdown-options')
    
    if (!selected || !options) {
      return
    }
    
    // 确保下拉框有足够高的z-index
    selected.style.zIndex = '1001'
    options.style.zIndex = '1001'
    
    // 确保options的样式正确初始化
    options.style.display = 'none'
    options.classList.remove('show')
    
    // 点击选中区域展开/收起下拉菜单
    selected.addEventListener('click', (e) => {
      e.stopPropagation()
      
      // 关闭其他下拉菜单
      document.querySelectorAll('.custom-dropdown-options').forEach(opt => {
        if (opt !== options) {
          opt.classList.remove('show')
          opt.style.display = 'none'
        }
      })
      
      // 切换当前下拉菜单
      if (options.classList.contains('show')) {
        options.classList.remove('show')
        setTimeout(() => {
          options.style.display = 'none'
        }, 300)
      } else {
        options.style.display = 'block'
        // 使用setTimeout确保display属性已经更新，然后添加show类
        setTimeout(() => {
          options.classList.add('show')
        }, 10)
      }
    })
    
    // 点击选项选择
    const optionItems = options.querySelectorAll('.custom-dropdown-option')
    optionItems.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation()
        const value = option.getAttribute('data-value')
        selected.textContent = option.textContent
        
        // 更新选中状态
        optionItems.forEach(opt => {
          opt.classList.remove('selected')
        })
        option.classList.add('selected')
        
        // 关闭下拉菜单
        options.classList.remove('show')
        setTimeout(() => {
          options.style.display = 'none'
        }, 300)
        
        // 如果是动画类型选择器，保存到localStorage并立即更新动画设置
        if (selected.id === 'animation-type-selected') {
          localStorage.setItem('pageAnimationType', value)
          // 清除当前所有内容区域的动画类，确保下次点击标签页时使用新的动画类型
          document.querySelectorAll('.content-area').forEach(area => {
            area.classList.remove('page-fade-in', 'page-slide-right', 'page-slide-left', 'page-zoom-in', 'page-rotate-in', 'page-fly-in-right', 'page-fly-in-left', 'page-fly-in')
          })
        }
        
        // 如果是背景样式选择器，保存到localStorage并立即应用
        if (selected.id === 'background-type-selected') {
          localStorage.setItem('backgroundType', value)
          applyBackgroundStyle(value)
        }
      })
    })
  })
  
  // 点击外部关闭下拉菜单
  // 使用addEventListener而不是document.onclick，避免覆盖其他点击事件
  document.addEventListener('click', (e) => {
    // 检查点击事件是否来自下拉菜单内部
    const isDropdownClick = e.target.closest('.custom-dropdown')
    if (!isDropdownClick) {
      document.querySelectorAll('.custom-dropdown-options').forEach(options => {
        options.classList.remove('show')
        setTimeout(() => {
          options.style.display = 'none'
        }, 300)
      })
    }
  })
}

// 应用背景样式函数
function applyBackgroundStyle(type) {
  const body = document.body
  
  // 移除所有背景样式类
  body.classList.remove('bg-default', 'bg-light', 'bg-dark', 'bg-blur')
  
  // 添加选择的背景样式类
  body.classList.add(`bg-${type}`)
  
  // 根据背景类型调整其他元素样式
  const sidebar = document.querySelector('.sidebar')
  const chatHeader = document.querySelector('.chat-header')
  const chatInputArea = document.querySelector('.chat-input-area')
  
  if (type === 'blur') {
    // 增强毛玻璃效果
    if (sidebar) {
      sidebar.style.backdropFilter = 'blur(20px) saturate(120%)'
      sidebar.style.webkitBackdropFilter = 'blur(20px) saturate(120%)'
    }
    if (chatHeader) {
      chatHeader.style.backdropFilter = 'blur(20px) saturate(120%)'
      chatHeader.style.webkitBackdropFilter = 'blur(20px) saturate(120%)'
    }
    if (chatInputArea) {
      chatInputArea.style.backdropFilter = 'blur(20px) saturate(120%)'
      chatInputArea.style.webkitBackdropFilter = 'blur(20px) saturate(120%)'
    }
  } else {
    // 恢复默认效果
    if (sidebar) {
      sidebar.style.backdropFilter = ''
      sidebar.style.webkitBackdropFilter = ''
    }
    if (chatHeader) {
      chatHeader.style.backdropFilter = ''
      chatHeader.style.webkitBackdropFilter = ''
    }
    if (chatInputArea) {
      chatInputArea.style.backdropFilter = ''
      chatInputArea.style.webkitBackdropFilter = ''
    }
  }
}

// 初始化主题
function initTheme() {
  // 从本地存储获取主题设置
  const savedMode = localStorage.getItem('appTheme') || 'light'
  
  // 应用主题
  toggleTheme(savedMode)
  
  // 更新UI状态
  const modeItems = document.querySelectorAll('.mode-item')
  modeItems.forEach(item => {
    item.classList.remove('active')
  })
  const activeModeItem = document.querySelector(`[data-mode="${savedMode}"]`)
  if (activeModeItem) {
    activeModeItem.classList.add('active')
  }
}

// 初始化背景图片功能
function initBackgroundImage() {
  const backgroundInput = document.getElementById('background-input')
  const backgroundPreview = document.getElementById('background-preview')
  const removeBackgroundBtn = document.getElementById('remove-background-btn')
  
  if (!backgroundInput || !backgroundPreview || !removeBackgroundBtn) {
    return
  }
  
  // 从本地存储加载背景图片
  const savedBackground = localStorage.getItem('customBackground')
  if (savedBackground) {
    applyBackgroundImage(savedBackground)
    updateBackgroundPreview(savedBackground)
  }
  
  // 点击预览区域触发文件选择
  backgroundPreview.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 直接触发文件选择，不处理滚动问题
    // CSS已经确保文件输入框不会影响页面布局
    backgroundInput.click()
  })
  
  // 处理文件选择
  backgroundInput.addEventListener('change', (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const imageDataUrl = event.target.result
      applyBackgroundImage(imageDataUrl)
      updateBackgroundPreview(imageDataUrl)
      localStorage.setItem('customBackground', imageDataUrl)
    }
    reader.readAsDataURL(file)
  })
  
  // 移除背景图片
  removeBackgroundBtn.addEventListener('click', () => {
    removeBackgroundImage()
  })
}

// 初始化背景遮罩透明度控制
function initBackgroundOpacity() {
  const opacitySlider = document.getElementById('bg-opacity-slider')
  const opacityValue = document.getElementById('opacity-value')
  
  if (!opacitySlider || !opacityValue) {
    return
  }
  
  // 从本地存储加载保存的透明度值
  const savedOpacity = localStorage.getItem('backgroundOpacity') || '0.8'
  opacitySlider.value = savedOpacity
  opacityValue.textContent = savedOpacity
  
  // 应用保存的透明度
  updateBackgroundOpacity(parseFloat(savedOpacity))
  
  // 监听滑块变化事件
  opacitySlider.addEventListener('input', (e) => {
    const opacity = parseFloat(e.target.value)
    opacityValue.textContent = opacity.toFixed(1)
    updateBackgroundOpacity(opacity)
    localStorage.setItem('backgroundOpacity', opacity.toFixed(1))
  })
}

// 更新聊天背景遮罩透明度
function updateBackgroundOpacity(opacity) {
  const chatHeader = document.querySelector('.chat-header')
  const chatMessagesBg = document.querySelector('.chat-messages-bg')
  const chatInputArea = document.querySelector('.chat-input-area')
  
  // 检查是否为深色模式
  const isDarkMode = document.body.classList.contains('dark-mode')
  
  if (chatHeader) {
    if (isDarkMode) {
      chatHeader.style.background = `rgba(30, 30, 30, ${opacity})`
    } else {
      chatHeader.style.background = `rgba(255, 255, 255, ${opacity})`
    }
  }
  
  if (chatMessagesBg) {
    if (isDarkMode) {
      chatMessagesBg.style.background = `linear-gradient(135deg, rgba(30, 30, 30, ${opacity * 0.625}) 0%, rgba(40, 40, 40, ${opacity * 0.625}) 100%)`
    } else {
      chatMessagesBg.style.background = `linear-gradient(135deg, rgba(255, 255, 255, ${opacity}) 0%, rgba(240, 240, 240, ${opacity}) 100%)`
    }
  }
  
  if (chatInputArea) {
    if (isDarkMode) {
      chatInputArea.style.background = `rgba(30, 30, 30, ${opacity})`
    } else {
      chatInputArea.style.background = `rgba(255, 255, 255, ${opacity})`
    }
  }
}

// 应用背景图片
function applyBackgroundImage(imageDataUrl) {
  // 确保毛玻璃效果始终存在
  document.body.style.backgroundImage = `url('${imageDataUrl}')`
  document.body.style.backgroundSize = 'cover'
  document.body.style.backgroundPosition = 'center'
  document.body.style.backgroundRepeat = 'no-repeat'
  
  // 移除固定背景设置，避免与overflow: hidden产生冲突
  document.body.style.backgroundAttachment = 'scroll'
  
  // 确保毛玻璃效果始终应用
  const sidebar = document.querySelector('.sidebar')
  const chatHeader = document.querySelector('.chat-header')
  const chatInputArea = document.querySelector('.chat-input-area')
  
  if (sidebar) {
    sidebar.style.backdropFilter = 'blur(20px) saturate(120%)'
    sidebar.style.webkitBackdropFilter = 'blur(20px) saturate(120%)'
  }
  if (chatHeader) {
    chatHeader.style.backdropFilter = 'blur(20px) saturate(120%)'
    chatHeader.style.webkitBackdropFilter = 'blur(20px) saturate(120%)'
  }
  if (chatInputArea) {
    chatInputArea.style.backdropFilter = 'blur(20px) saturate(120%)'
    chatInputArea.style.webkitBackdropFilter = 'blur(20px) saturate(120%)'
  }
}

// 更新背景预览
function updateBackgroundPreview(imageDataUrl) {
  const backgroundPreview = document.getElementById('background-preview')
  if (!backgroundPreview) return
  
  let previewImg = backgroundPreview.querySelector('img')
  if (!previewImg) {
    previewImg = document.createElement('img')
    backgroundPreview.appendChild(previewImg)
  }
  
  previewImg.src = imageDataUrl
  backgroundPreview.classList.add('has-image')
}

// 移除背景图片
function removeBackgroundImage() {
  document.body.style.backgroundImage = ''
  document.body.style.backgroundSize = ''
  document.body.style.backgroundPosition = ''
  document.body.style.backgroundRepeat = ''
  document.body.style.backgroundAttachment = ''
  
  const backgroundPreview = document.getElementById('background-preview')
  if (backgroundPreview) {
    const previewImg = backgroundPreview.querySelector('img')
    if (previewImg) {
      previewImg.remove()
    }
    backgroundPreview.classList.remove('has-image')
  }
  
  localStorage.removeItem('customBackground')
}

// 切换主题函数
function toggleTheme(mode) {
  // 移除所有过渡效果，防止快速切换时的动画冲突
  document.body.style.transition = 'none'
  
  // 应用主题
  if (mode === 'dark') {
    document.body.classList.add('dark-mode')
  } else {
    document.body.classList.remove('dark-mode')
  }
  
  // 保存主题设置到本地存储
  localStorage.setItem('appTheme', mode)
  
  // 强制重排，确保主题立即应用
  document.body.offsetHeight
  
  // 立即恢复过渡效果，移除延迟
  document.body.style.transition = ''
  
  // 更新标题栏样式，确保主题正确应用
  updateTitleBarStyleAfterThemeChange()
  
  // 重新应用背景遮罩透明度，解决主题切换时的残留问题
  const savedOpacity = parseFloat(localStorage.getItem('backgroundOpacity') || '0.8')
  updateBackgroundOpacity(savedOpacity)
}

// 防止鼠标滚轮缩放
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault()
    console.log('鼠标滚轮缩放已被禁用')
  }
}, { passive: false })

// 初始化聊天联系人点击事件
function initChatContactsClick() {
  // 为所有联系人项添加点击事件
  document.addEventListener('click', function(e) {
    const contactItem = e.target.closest('.contact-item');
    if (contactItem) {
      // 阻止事件冒泡，防止弹窗关闭
      e.stopPropagation();
      
      // 获取联系人ID
      const contactId = contactItem.dataset.id;
      if (!contactId) return;
      
      // 检查当前是否已经在聊天页面
      const currentActiveContent = document.querySelector('.content-area[style*="display: block"]');
      if (currentActiveContent && currentActiveContent.id === 'chat-content') {
        // 已经在聊天页面，直接切换联系人
        switchToContactChat(contactId);
      } else {
        // 不在聊天页面，先切换到聊天页面，然后切换联系人
        // 直接修改DOM来切换页面，而不是调用switchTab函数
        
        // 移除所有标签页的激活状态
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
          tab.classList.remove('active');
        });
        
        // 激活聊天标签页
        const chatTab = document.querySelector('.sidebar-tab[data-tab="chat"]');
        if (chatTab) {
          chatTab.classList.add('active');
        }
        
        // 隐藏所有内容区域
        document.querySelectorAll('.content-area').forEach(area => {
          area.style.display = 'none';
        });
        
        // 显示聊天内容区域
        const chatContent = document.getElementById('chat-content');
        if (chatContent) {
          chatContent.style.display = 'flex';
          chatContent.style.opacity = '1';
          chatContent.style.transform = 'translateX(0) scale(1)';
          chatContent.style.visibility = 'visible';
        }
        
        // 更新窗口标题
        document.title = '无界 - 聊天';
        
        // 使用setTimeout确保页面切换完成后再切换联系人
        setTimeout(() => {
          switchToContactChat(contactId);
        }, 100);
      }
    }
  });
}

// 监听DOM加载完成事件
window.addEventListener('DOMContentLoaded', function() {
  // 初始化聊天联系人弹窗点击事件
  initChatContactsClick();
});

// 监听缩放变化并立即重置 - 修复缩放检测
document.addEventListener('DOMContentLoaded', () => {
  const checkZoom = () => {
    try {
      if (window.require) {
        const { webFrame } = window.require('electron')
        if (webFrame) {
          // 使用正确的方法获取缩放级别
          const currentZoom = webFrame.getZoomFactor()
          if (Math.abs(currentZoom - 1) > 0.01) { // 允许小误差
            webFrame.setZoomFactor(1)
          }
        }
      }
    } catch (error) {
      // 忽略错误，避免影响应用正常运行
    }
  }
  
  // 页面加载完成后立即检查
  checkZoom()
  
  // 监听窗口大小变化，间接检测缩放变化
  window.addEventListener('resize', checkZoom)
})

// 模型数据配置
const MODEL_CONFIGS = {
  DeepSeek: {
    models: [
      { id: 'deepseek-chat', name: 'deepseek-chat', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'deepseek-reasoner', name: 'deepseek-reasoner', supportsWebSearch: false, supportsDeepThink: true }
    ],
    hint: 'deepseek-reasoner模型强制打开深度思考功能'
  },
  '阿里云百炼': {
    models: [
      // 支持联网搜索，不支持深度思考
      { id: 'qwen3-max', name: 'qwen3-max', supportsWebSearch: true, supportsDeepThink: false },
      
      // 支持联网搜索和深度思考
      { id: 'qwen3-max-preview', name: 'qwen3-max-preview', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'qwen-plus', name: 'qwen-plus', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'qwen-plus-latest', name: 'qwen-plus-latest', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'qwen-plus-2025-07-14', name: 'qwen-plus-2025-07-14', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'qwen-flash', name: 'qwen-flash', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'qwen-flash-2025-07-28', name: 'qwen-flash-2025-07-28', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'qwen-turbo', name: 'qwen-turbo', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'qwen-turbo-latest', name: 'qwen-turbo-latest', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'qwen-turbo-2025-07-15', name: 'qwen-turbo-2025-07-15', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'qwq-plus', name: 'qwq-plus', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'deepseek-v3.2', name: 'deepseek-v3.2', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'deepseek-v3.2-exp', name: 'deepseek-v3.2-exp', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'deepseek-v3.1', name: 'deepseek-v3.1', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'deepseek-r1-0528', name: 'deepseek-r1-0528', supportsWebSearch: true, supportsDeepThink: true },
      { id: 'deepseek-r1', name: 'deepseek-r1', supportsWebSearch: true, supportsDeepThink: true },
      
      // 仅支持深度思考
      { id: 'qwen3-next-80b-a3b-thinking', name: 'qwen3-next-80b-a3b-thinking', supportsWebSearch: false, supportsDeepThink: true },
      { id: 'qwen3-235b-a22b-thinking-2507', name: 'qwen3-235b-a22b-thinking-2507', supportsWebSearch: false, supportsDeepThink: true },
      { id: 'qwen3-30b-a3b-thinking-2507', name: 'qwen3-30b-a3b-thinking-2507', supportsWebSearch: false, supportsDeepThink: true },
      
      // 仅不支持深度思考
      { id: 'qwen3-next-80b-a3b-instruct', name: 'qwen3-next-80b-a3b-instruct', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'qwen3-235b-a22b-instruct-2507', name: 'qwen3-235b-a22b-instruct-2507', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'qwen3-30b-a3b-instruct-2507', name: 'qwen3-30b-a3b-instruct-2507', supportsWebSearch: false, supportsDeepThink: false },
      
      // 同时支持深度思考和非思考模式
      { id: 'qwen3-235b-a22b', name: 'qwen3-235b-a22b', supportsWebSearch: false, supportsDeepThink: true },
      { id: 'qwen3-32b', name: 'qwen3-32b', supportsWebSearch: false, supportsDeepThink: true },
      { id: 'qwen3-30b-a3b', name: 'qwen3-30b-a3b', supportsWebSearch: false, supportsDeepThink: true },
      
      // 其他不支持功能
      { id: 'qwen3-14b', name: 'qwen3-14b', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'qwen3-8b', name: 'qwen3-8b', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'qwen3-4b', name: 'qwen3-4b', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'qwen3-1.7b', name: 'qwen3-1.7b', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'qwen3-0.6b', name: 'qwen3-0.6b', supportsWebSearch: false, supportsDeepThink: false }
    ]
  },
  Kimi: {
    models: [
      { id: 'kimi-k2-0905-preview', name: 'kimi-k2-0905-preview', supportsWebSearch: true, supportsDeepThink: false },
      { id: 'kimi-k2-0711-preview', name: 'kimi-k2-0711-preview', supportsWebSearch: true, supportsDeepThink: false },
      { id: 'kimi-k2-turbo-preview', name: 'kimi-k2-turbo-preview', supportsWebSearch: true, supportsDeepThink: false },
      { id: 'kimi-k2-thinking', name: 'kimi-k2-thinking', supportsWebSearch: false, supportsDeepThink: true },
      { id: 'kimi-k2-thinking-turbo', name: 'kimi-k2-thinking-turbo', supportsWebSearch: false, supportsDeepThink: true },
      { id: 'moonshot-v1-8k', name: 'moonshot-v1-8k', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'moonshot-v1-32k', name: 'moonshot-v1-32k', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'moonshot-vl-128k', name: 'moonshot-vl-128k', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'moonshot-v1-8k-vision-preview', name: 'moonshot-v1-8k-vision-preview', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'moonshot-v1-32k-vision-preview', name: 'moonshot-v1-32k-vision-preview', supportsWebSearch: false, supportsDeepThink: false },
      { id: 'moonshot-v1-128k-vision-preview', name: 'moonshot-v1-128k-vision-preview', supportsWebSearch: false, supportsDeepThink: false }
    ]
  }
};

// 联系人数据管理
let contacts = [];
let currentContactId = null;

// 更新悬浮弹窗联系人列表
function updatePopupContacts() {
  const popupContent = document.querySelector('.chat-contacts-popup .popup-content');
  if (!popupContent) return;
  
  if (contacts.length === 0) {
    popupContent.innerHTML = `
      <div class="popup-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="7" r="4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>暂无联系人</p>
        <button class="btn btn-small btn-primary" id="popup-add-contact-btn">
          + 添加联系人
        </button>
      </div>
    `;
    
    // 绑定添加联系人按钮事件
    const popupAddBtn = document.getElementById('popup-add-contact-btn');
    if (popupAddBtn) {
      popupAddBtn.addEventListener('click', () => {
        document.getElementById('create-contact-modal').style.display = 'block';
      });
    }
  } else {
    // 渲染联系人列表
    let contactsHTML = '';
    contacts.forEach(contact => {
      contactsHTML += `
        <div class="contact-item" data-id="${contact.id}">
          <div class="contact-avatar">
            <img src="${contact.avatar}" alt="${contact.nickname}" width="40" height="40">
          </div>
          <div class="contact-details">
            <div class="contact-name">${contact.nickname}</div>
            <div class="contact-last-msg">
              <span class="msg-text">${contact.provider} · ${contact.model}</span>
            </div>
          </div>
        </div>
      `;
    });
    
    popupContent.innerHTML = contactsHTML;
    
    // 绑定点击事件
    popupContent.querySelectorAll('.contact-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = item.dataset.id;
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
          switchToContactChat(contactId);
        }
      });
    });
  }
}

// 更新聊天页面状态
function updateChatPage() {
  const chatMessages = document.getElementById('chat-messages');
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const chatInputArea = document.querySelector('.chat-input-area');
  const noContactPrompt = document.getElementById('no-contact-chat-prompt');
  
  if (!chatMessages || !noContactPrompt) return;
  
  if (contacts.length === 0) {
    // 显示无联系人提示
    noContactPrompt.style.display = 'flex';
    
    // 清空聊天消息（除了提示）
    const messages = chatMessages.querySelectorAll('.message');
    messages.forEach(msg => {
      if (msg !== noContactPrompt) {
        msg.remove();
      }
    });
    
    // 禁用输入区域
    if (messageInput) messageInput.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    if (chatInputArea) chatInputArea.classList.add('disabled');
    
    // 更新聊天头部
    const chatName = document.querySelector('.chat-name');
    const chatStatus = document.querySelector('.chat-status');
    if (chatName) chatName.textContent = '选择联系人';
    if (chatStatus) chatStatus.textContent = '请先创建联系人';
  } else {
    // 隐藏无联系人提示
    noContactPrompt.style.display = 'none';
    
    // 启用输入区域
    if (messageInput) messageInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    if (chatInputArea) chatInputArea.classList.remove('disabled');
    
    // 如果当前没有选中联系人，选择第一个
    const currentContact = document.querySelector('.contact-item.active');
    if (!currentContact && contacts.length > 0) {
      switchToContactChat(contacts[0].id);
    }
  }
}

// 初始化创建联系人功能
function initCreateContactModal() {
  const createContactBtn = document.getElementById('create-contact-btn');
  const createContactModal = document.getElementById('create-contact-modal');
  const closeContactModalBtn = document.getElementById('close-contact-modal');
  const cancelContactBtn = document.getElementById('cancel-contact-btn');
  const saveContactBtn = document.getElementById('save-contact-btn');
  const contactAvatarInput = document.getElementById('contact-avatar-input');
  const contactAvatarPreview = document.getElementById('contact-avatar-preview');
  const contactProviderSelect = document.getElementById('contact-provider');
  const contactApikeySelect = document.getElementById('contact-apikey');
  const contactModelSelect = document.getElementById('contact-model');
  const contactModelCustom = document.getElementById('contact-model-custom');
  const contactNicknameInput = document.getElementById('contact-nickname');
  const contactSystemPrompt = document.getElementById('contact-system-prompt');
  
  // 开关元素
  const roleplayToggle = document.getElementById('roleplay-toggle');
  const websearchToggle = document.getElementById('websearch-toggle');
  const deepthinkToggle = document.getElementById('deepthink-toggle');
  const advancedToggle = document.getElementById('advanced-toggle');
  
  // 滑块元素
  const topPSlider = document.getElementById('top-p-slider');
  const temperatureSlider = document.getElementById('temperature-slider');
  const thinkingbudgetSlider = document.getElementById('thinkingbudget-slider');
  
  // 开关初始化
  [roleplayToggle, websearchToggle, deepthinkToggle, advancedToggle].forEach(toggle => {
    toggle.addEventListener('click', function() {
      this.classList.toggle('active');
      if (this === advancedToggle) {
        const advancedOptions = document.getElementById('advanced-options');
        advancedOptions.style.display = this.classList.contains('active') ? 'block' : 'none';
      }
    });
  });
  
  // 滑块事件
  topPSlider.addEventListener('input', function() {
    document.getElementById('top-p-value').textContent = parseFloat(this.value).toFixed(4);
  });
  
  temperatureSlider.addEventListener('input', function() {
    document.getElementById('temperature-value').textContent = parseFloat(this.value).toFixed(4);
  });
  
  thinkingbudgetSlider.addEventListener('input', function() {
    document.getElementById('thinkingbudget-value').textContent = this.value;
  });
  
  // 服务商选择变化
  contactProviderSelect.addEventListener('change', function() {
    updateApikeyOptions(this.value);
    contactApikeySelect.disabled = !this.value;
    contactModelSelect.disabled = true;
    contactModelSelect.innerHTML = '<option value="">请先选择API-Key</option>';
  });
  
  // API-Key 选择变化
  contactApikeySelect.addEventListener('change', function() {
    const provider = contactProviderSelect.value;
    updateModelOptions(provider, this.value);
    contactModelSelect.disabled = !this.value;
  });
  
  // 头像上传
  contactAvatarInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        // 显示裁剪弹窗
        showContactAvatarCropModal(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  });
  
  // 显示弹窗
  createContactBtn.addEventListener('click', function() {
    createContactModal.style.display = 'block';
    document.getElementById('contact-modal-title').textContent = '创建联系人';
    resetContactForm();
  });
  
  // 绑定关闭按钮事件
  closeContactModalBtn.addEventListener('click', closeContactModal);
  cancelContactBtn.addEventListener('click', closeContactModal);
  
  // 点击外部关闭
  window.addEventListener('click', function(e) {
    if (e.target === createContactModal) {
      closeContactModal();
    }
  });
  
  // 保存联系人
  saveContactBtn.addEventListener('click', function() {
    console.log('点击了保存联系人按钮');
    if (!validateContactForm()) {
      console.log('表单验证失败');
      return;
    }
    
    console.log('表单验证成功');
    const contactData = collectContactData();
    console.log('收集到的联系人数据:', contactData);
    saveContact(contactData);
  });
}

// 更新API-Key选项
function updateApikeyOptions(provider) {
  const apikeySelect = document.getElementById('contact-apikey');
  const apikeyHint = document.getElementById('apikey-hint');
  
  apikeySelect.innerHTML = '<option value="">请选择API-Key</option>';
  
  if (!provider) {
    apikeySelect.disabled = true;
    apikeyHint.textContent = '请先选择服务商';
    return;
  }
  
  // 从本地存储获取该服务商的API密钥
  const providerKeys = apiKeys.filter(key => key.platform === provider);
  
  if (providerKeys.length === 0) {
    apikeySelect.innerHTML = '<option value="">暂无API-Key，请先添加</option>';
    apikeyHint.textContent = '请先在API-Keys管理页面添加API密钥';
    apikeySelect.disabled = false;
  } else {
    providerKeys.forEach(key => {
      const option = document.createElement('option');
      option.value = key.id;
      option.textContent = key.name;
      apikeySelect.appendChild(option);
    });
    apikeyHint.textContent = `找到 ${providerKeys.length} 个可用的API-Key`;
    apikeySelect.disabled = false;
  }
}

// 更新模型选项
function updateModelOptions(provider, apikeyId) {
  const modelSelect = document.getElementById('contact-model');
  const modelCustom = document.getElementById('contact-model-custom');
  const websearchHint = document.getElementById('websearch-hint');
  const deepthinkHint = document.getElementById('deepthink-hint');
  
  modelSelect.innerHTML = '<option value="">请选择模型</option>';
  modelCustom.style.display = 'none';
  
  if (!provider || !apikeyId) {
    return;
  }
  
  const providerConfig = MODEL_CONFIGS[provider];
  if (!providerConfig) {
    return;
  }
  
  // 添加预设模型选项
  providerConfig.models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.name;
    option.dataset.supportsWebSearch = model.supportsWebSearch;
    option.dataset.supportsDeepThink = model.supportsDeepThink;
    modelSelect.appendChild(option);
  });
  
  // 添加自定义模型选项
  const customOption = document.createElement('option');
  customOption.value = 'custom';
  customOption.textContent = '自定义模型';
  modelSelect.appendChild(customOption);
  
  // 模型选择变化事件
  modelSelect.addEventListener('change', function() {
    if (this.value === 'custom') {
      modelCustom.style.display = 'block';
      modelCustom.required = true;
      modelCustom.focus();
    } else {
      modelCustom.style.display = 'none';
      modelCustom.required = false;
      
      // 更新功能提示
      const selectedOption = this.options[this.selectedIndex];
      const supportsWebSearch = selectedOption.dataset.supportsWebSearch === 'true';
      const supportsDeepThink = selectedOption.dataset.supportsDeepThink === 'true';
      
      if (supportsWebSearch) {
        websearchHint.textContent = '该模型支持联网搜索功能';
      } else {
        websearchHint.textContent = '该模型疑似不支持此功能，可尝试开启';
      }
      
      if (supportsDeepThink) {
        deepthinkHint.textContent = '该模型支持深度思考功能';
      } else {
        deepthinkHint.textContent = '该模型疑似不支持此功能，可尝试开启';
      }
      
      // 特殊处理 deepseek-reasoner 强制打开深度思考
      if (provider === 'DeepSeek' && this.value === 'deepseek-reasoner') {
        const deepthinkToggle = document.getElementById('deepthink-toggle');
        deepthinkToggle.classList.add('active');
        deepthinkHint.textContent = '该模型强制打开深度思考功能';
      }
    }
  });
}

// 验证表单
function validateContactForm() {
  const provider = document.getElementById('contact-provider').value;
  const apikey = document.getElementById('contact-apikey').value;
  const model = document.getElementById('contact-model').value;
  const modelCustom = document.getElementById('contact-model-custom').value;
  const nickname = document.getElementById('contact-nickname').value.trim();
  
  let isValid = true;
  
  if (!provider) {
    customModal.alert('请选择AI服务提供商');
    isValid = false;
  } else if (!apikey) {
    customModal.alert('请选择API-Key');
    isValid = false;
  } else if (!model) {
    customModal.alert('请选择模型或选择自定义模型');
    isValid = false;
  } else if (model === 'custom' && !modelCustom) {
    customModal.alert('请输入自定义模型名称');
    isValid = false;
  } else if (!nickname) {
    customModal.alert('请输入AI昵称');
    isValid = false;
  }
  
  return isValid;
}

// 收集表单数据
function collectContactData() {
  const provider = document.getElementById('contact-provider').value;
  const apikeyId = document.getElementById('contact-apikey').value;
  const model = document.getElementById('contact-model').value;
  const modelCustom = document.getElementById('contact-model-custom').value;
  const finalModel = model === 'custom' ? modelCustom : model;
  const nickname = document.getElementById('contact-nickname').value.trim();
  const systemPrompt = document.getElementById('contact-system-prompt').value.trim();
  const avatar = document.getElementById('contact-avatar-preview').querySelector('img').src;
  
  // 获取选中的API密钥信息
  const selectedApikey = apiKeys.find(key => key.id === apikeyId);
  
  // 获取功能开关状态
  const roleplay = document.getElementById('roleplay-toggle').classList.contains('active');
  const websearch = document.getElementById('websearch-toggle').classList.contains('active');
  const deepthink = document.getElementById('deepthink-toggle').classList.contains('active');
  const advancedEnabled = document.getElementById('advanced-toggle').classList.contains('active');
  
  // 获取高级参数
  const topP = parseFloat(document.getElementById('top-p-slider').value);
  const temperature = parseFloat(document.getElementById('temperature-slider').value);
  const thinkingBudget = parseInt(document.getElementById('thinkingbudget-slider').value);
  
  return {
    id: currentContactId || Date.now().toString(),
    provider,
    apikey: selectedApikey ? selectedApikey.key : '',
    apikeyId,
    model: finalModel,
    nickname,
    systemPrompt,
    avatar,
    roleplay,
    websearch,
    deepthink,
    advancedEnabled,
    advancedParams: advancedEnabled ? {
      topP,
      temperature,
      thinkingBudget
    } : null,
    createdAt: new Date().toISOString(),
    lastActive: null,
    unreadCount: 0
  };
}

// 重置表单
function resetContactForm() {
  document.getElementById('contact-form').reset();
  
  // 重置头像
  document.getElementById('contact-avatar-preview').querySelector('img').src = 'images/app-icon.png';
  
  // 重置开关
  [document.getElementById('roleplay-toggle'), 
   document.getElementById('websearch-toggle'),
   document.getElementById('deepthink-toggle'),
   document.getElementById('advanced-toggle')].forEach(toggle => {
    toggle.classList.remove('active');
  });
  
  // 隐藏高级选项
  document.getElementById('advanced-options').style.display = 'none';
  
  // 重置滑块值
  document.getElementById('top-p-slider').value = 0.8000;
  document.getElementById('temperature-slider').value = 0.7000;
  document.getElementById('thinkingbudget-slider').value = 4000;
  document.getElementById('top-p-value').textContent = '0.8000';
  document.getElementById('temperature-value').textContent = '0.7000';
  document.getElementById('thinkingbudget-value').textContent = '4000';
  
  // 重置提示
  document.getElementById('apikey-hint').textContent = '请先选择服务商';
  document.getElementById('websearch-hint').textContent = '该功能需要模型支持';
  document.getElementById('deepthink-hint').textContent = '该功能需要模型支持';
  
  // 重置下拉框
  document.getElementById('contact-apikey').innerHTML = '<option value="">请先选择服务商</option>';
  document.getElementById('contact-apikey').disabled = true;
  document.getElementById('contact-model').innerHTML = '<option value="">请先选择API-Key</option>';
  document.getElementById('contact-model').disabled = true;
  document.getElementById('contact-model-custom').style.display = 'none';
}

// 关闭联系人弹窗
function closeContactModal() {
  const createContactModal = document.getElementById('create-contact-modal');
  if (createContactModal) {
    createContactModal.style.display = 'none';
  }
  resetContactForm();
  currentContactId = null;
}

// 保存联系人（加密存储）
function saveContact(contactData) {
  // 加密敏感数据
  const encryptedContact = {
    ...contactData,
    apikey: CryptoJS.AES.encrypt(contactData.apikey, AES_CONFIG.key, {
      iv: AES_CONFIG.iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString()
  };
  
  let isCurrentContactUpdated = false;
  
  if (currentContactId) {
    // 更新现有联系人
    const index = contacts.findIndex(c => c.id === currentContactId);
    if (index !== -1) {
      contacts[index] = encryptedContact;
      // 检查是否更新的是当前正在聊天的联系人
      const currentChatName = document.querySelector('.chat-name');
      if (currentChatName && currentChatName.textContent === contacts[index].nickname) {
        isCurrentContactUpdated = true;
      }
    }
  } else {
    // 添加新联系人
    contacts.push(encryptedContact);
  }
  
  // 保存到本地存储
  saveContacts();
  
  // 重新渲染所有UI
  renderContacts();
  updatePopupContacts(); // 新增
  updateChatPage(); // 新增
  bindApiKeyEvents();
  
  // 如果更新的是当前正在聊天的联系人，更新聊天标题栏
  if (isCurrentContactUpdated) {
    const contact = contacts.find(c => c.id === currentContactId);
    if (contact) {
      const chatName = document.querySelector('.chat-name');
      const chatAvatar = document.querySelector('.chat-avatar img');
      if (chatName) chatName.textContent = contact.nickname;
      if (chatAvatar) chatAvatar.src = contact.avatar;
    }
  }
  
  // 判断是创建还是更新联系人
  const isUpdate = !!currentContactId;
  
  // 关闭弹窗
  closeContactModal();
  
  // 显示成功提示
  const infoBar = document.getElementById('success-info-bar');
  const infoBarMessage = document.getElementById('info-bar-message');
  if (infoBar && infoBarMessage) {
    // 设置提示消息
    infoBarMessage.textContent = isUpdate ? '联系人更新成功' : '联系人创建成功';
    // 显示提示
    infoBar.style.display = 'flex';
    // 3秒后自动隐藏
    setTimeout(() => {
      infoBar.style.display = 'none';
    }, 3000);
  }
}

// 解密联系人数据
function decryptContact(contact) {
  try {
    const decrypted = CryptoJS.AES.decrypt(
      contact.apikey,
      AES_CONFIG.key,
      {
        iv: AES_CONFIG.iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    return {
      ...contact,
      apikey: decrypted.toString(CryptoJS.enc.Utf8)
    };
  } catch (error) {
    console.error('解密联系人数据失败:', error);
    return contact;
  }
}

// 从本地存储加载联系人
function loadContacts() {
  try {
    const savedContacts = localStorage.getItem('contacts');
    if (savedContacts) {
      contacts = JSON.parse(savedContacts);
    } else {
      contacts = [];
    }
  } catch (error) {
    console.error('加载联系人失败:', error);
    contacts = [];
  }
  
  // 更新UI
  updatePopupContacts(); // 新增
  updateChatPage(); // 新增
}

// 保存联系人到本地存储
function saveContacts() {
  try {
    localStorage.setItem('contacts', JSON.stringify(contacts));
  } catch (error) {
    console.error('保存联系人失败:', error);
  }
}

// 渲染联系人列表
function renderContacts() {
  const contactsList = document.querySelector('.group-contacts');
  const groupCount = document.querySelector('.group-count');
  
  if (!contactsList || !groupCount) {
    return;
  }
  
  if (contacts.length === 0) {
    contactsList.className = 'group-contacts empty';
    contactsList.innerHTML = `
      <div class="empty-message">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="7" r="4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>暂无联系人</p>
        <p>点击上方"创建联系人"按钮添加新的AI助手</p>
      </div>
    `;
    groupCount.textContent = '0';
    return;
  }
  
  contactsList.className = 'group-contacts';
  contactsList.innerHTML = '';
  
  contacts.forEach(contact => {
    const contactItem = createContactElement(contact);
    contactsList.appendChild(contactItem);
  });
  
  groupCount.textContent = contacts.length;
}

// 创建联系人元素
function createContactElement(contact) {
  const item = document.createElement('div');
  item.className = 'contact-item';
  item.dataset.id = contact.id;
  
  // 生成状态徽章
  let statusBadge = '';
  if (contact.unreadCount > 0) {
    statusBadge = `<span class="unread-badge">${contact.unreadCount}</span>`;
  }
  
  // 生成最后活跃时间
  let lastActive = '从未聊天';
  if (contact.lastActive) {
    const lastActiveDate = new Date(contact.lastActive);
    const now = new Date();
    const diffMs = now - lastActiveDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      lastActive = `${diffMins}分钟前`;
    } else if (diffHours < 24) {
      lastActive = `${diffHours}小时前`;
    } else {
      lastActive = `${diffDays}天前`;
    }
  }
  
  item.innerHTML = `
    <div class="contact-avatar">
      <img src="${contact.avatar}" alt="${contact.nickname}" width="48" height="48">
    </div>
    <div class="contact-info">
      <div class="contact-name">${contact.nickname} ${statusBadge}</div>
      <div class="contact-status online">${contact.provider} · ${contact.model}</div>
    </div>
    <div class="contact-meta">
      <div class="contact-last-active">${lastActive}</div>
      <div class="contact-actions">
        <button class="contact-action edit-contact" title="编辑">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="1.5"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="1.5"/>
          </svg>
        </button>
        <button class="contact-action delete-contact" title="删除">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  
  // 添加点击事件
  const chatBtn = item.querySelector('.contact-action:not(.edit-contact):not(.delete-contact)');
  if (chatBtn) {
    chatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // 切换到聊天页面并加载该联系人
      switchToContactChat(contact.id);
    });
  }
  
  // 编辑按钮
  const editBtn = item.querySelector('.edit-contact');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editContact(contact.id);
  });
  
  // 删除按钮
  const deleteBtn = item.querySelector('.delete-contact');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteContact(contact.id);
  });
  
  return item;
}

// 编辑联系人
function editContact(id) {
  const contact = contacts.find(c => c.id === id);
  if (!contact) return;
  
  currentContactId = id;
  
  // 解密数据
  const decryptedContact = decryptContact(contact);
  
  // 填充表单
  const modal = document.getElementById('create-contact-modal');
  modal.style.display = 'block';
  document.getElementById('contact-modal-title').textContent = '编辑联系人';
  
  // 填充基础数据
  document.getElementById('contact-provider').value = decryptedContact.provider;
  updateApikeyOptions(decryptedContact.provider);
  
  // 设置API-Key（需要等待选项加载）
  setTimeout(() => {
    document.getElementById('contact-apikey').value = decryptedContact.apikeyId;
    updateModelOptions(decryptedContact.provider, decryptedContact.apikeyId);
    
    // 设置模型
    setTimeout(() => {
      const modelSelect = document.getElementById('contact-model');
      const providerConfig = MODEL_CONFIGS[decryptedContact.provider];
      const isPresetModel = providerConfig?.models.some(m => m.id === decryptedContact.model);
      
      if (isPresetModel) {
        modelSelect.value = decryptedContact.model;
      } else {
        modelSelect.value = 'custom';
        document.getElementById('contact-model-custom').value = decryptedContact.model;
        document.getElementById('contact-model-custom').style.display = 'block';
      }
      
      document.getElementById('contact-nickname').value = decryptedContact.nickname;
      document.getElementById('contact-system-prompt').value = decryptedContact.systemPrompt || '';
      document.getElementById('contact-avatar-preview').querySelector('img').src = decryptedContact.avatar;
      
      // 设置开关
      if (decryptedContact.roleplay) {
        document.getElementById('roleplay-toggle').classList.add('active');
      }
      if (decryptedContact.websearch) {
        document.getElementById('websearch-toggle').classList.add('active');
      }
      if (decryptedContact.deepthink) {
        document.getElementById('deepthink-toggle').classList.add('active');
      }
      if (decryptedContact.advancedEnabled) {
        document.getElementById('advanced-toggle').classList.add('active');
        document.getElementById('advanced-options').style.display = 'block';
        
        // 设置高级参数
        if (decryptedContact.advancedParams) {
          document.getElementById('top-p-slider').value = decryptedContact.advancedParams.topP || 0.8000;
          document.getElementById('temperature-slider').value = decryptedContact.advancedParams.temperature || 0.7000;
          document.getElementById('thinkingbudget-slider').value = decryptedContact.advancedParams.thinkingBudget || 4000;
          
          document.getElementById('top-p-value').textContent = (decryptedContact.advancedParams.topP || 0.8000).toFixed(4);
          document.getElementById('temperature-value').textContent = (decryptedContact.advancedParams.temperature || 0.7000).toFixed(4);
          document.getElementById('thinkingbudget-value').textContent = decryptedContact.advancedParams.thinkingBudget || 4000;
        }
      }
    }, 100);
  }, 100);
}

// 删除联系人
function deleteContact(id) {
  customModal.confirm('确定要删除这个联系人吗？此操作不可撤销。', '确认删除').then((result) => {
    if (result) {
      contacts = contacts.filter(c => c.id !== id);
      saveContacts();
      renderContacts();
      updatePopupContacts(); // 新增
      updateChatPage(); // 新增
    }
  });
}

// 切换到联系人聊天
function switchToContactChat(contactId) {
  const contact = contacts.find(c => c.id === contactId);
  if (!contact) return;
  
  // 检查当前是否已经在聊天页面
  const currentActiveContent = document.querySelector('.content-area[style*="display: block"]');
  if (!currentActiveContent || currentActiveContent.id !== 'chat-content') {
    // 不在聊天页面，先切换到聊天页面
    // 移除所有标签页的激活状态
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // 激活聊天标签页
    const chatTab = document.querySelector('.sidebar-tab[data-tab="chat"]');
    if (chatTab) {
      chatTab.classList.add('active');
    }
    
    // 隐藏所有内容区域
    document.querySelectorAll('.content-area').forEach(area => {
      area.style.display = 'none';
    });
    
    // 显示聊天内容区域
    const chatContent = document.getElementById('chat-content');
    if (chatContent) {
      chatContent.style.display = 'flex';
    }
  }
  
  // 更新聊天头部
  const chatName = document.querySelector('.chat-name');
  const chatAvatar = document.querySelector('.chat-avatar img');
  const chatHeader = document.querySelector('.chat-header');
  
  if (chatName) chatName.textContent = contact.nickname;
  if (chatAvatar) chatAvatar.src = contact.avatar;
  if (chatHeader) chatHeader.setAttribute('data-contact-id', contact.id);
  
  // 加载聊天历史
  loadContactChatHistory(contactId);
  
  // 更新最后活跃时间
  contact.lastActive = new Date().toISOString();
  saveContacts();
  
  // 更新UI
  renderContacts();
  updatePopupContacts();
}

// 加载联系人聊天历史
function loadContactChatHistory(contactId) {
  const chatMessagesContainer = document.getElementById('chat-messages');
  if (!chatMessagesContainer) return;
  
  // 清空现有聊天记录
  chatMessagesContainer.innerHTML = '';
  
  // 滚动到底部
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// 初始化联系人功能
function initContacts() {
  loadContacts();
  renderContacts();
  initCreateContactModal();
  
  // 绑定聊天页面的添加联系人按钮
  const addContactFromChatBtn = document.getElementById('add-contact-from-chat-btn');
  if (addContactFromChatBtn) {
    addContactFromChatBtn.addEventListener('click', () => {
      document.getElementById('create-contact-modal').style.display = 'block';
    });
  }
}

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 确保其他初始化函数先运行
  initSidebarTabs();
  initProfilePage();
  initSettingsPage();
  
  // 初始化联系人功能
  setTimeout(() => {
    initContacts();
    console.log('联系人功能初始化完成');
  }, 100);
});