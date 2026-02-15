const { ipcRenderer } = require('electron')

// 引入 jQuery、Cropper.js 和加密库
const $ = require('jquery')
const Cropper = require('cropperjs')
const CryptoJS = require('crypto-js')

// 启动动画管理
class SplashScreen {
  constructor() {
    this.splashElement = document.getElementById('splash-screen');
    this.isVisible = true;
    this.minimumDisplayTime = 2000; // 最少显示2秒
    this.startTime = Date.now();
    this.hideRequested = false;
    console.log('启动动画初始化完成');
  }

  // 显示启动动画
  show() {
    if (this.splashElement) {
      this.splashElement.classList.remove('hidden');
      this.isVisible = true;
      this.startTime = Date.now();
      this.hideRequested = false;
      console.log('启动动画显示');
    }
  }

  // 隐藏启动动画
  hide() {
    console.log('收到隐藏请求');
    
    if (!this.splashElement || !this.isVisible) {
      console.log('启动动画元素不存在或不可见，无需隐藏');
      return;
    }
    
    this.hideRequested = true;
    
    const elapsedTime = Date.now() - this.startTime;
    const remainingTime = Math.max(0, this.minimumDisplayTime - elapsedTime);
    
    console.log(`已显示时间: ${elapsedTime}ms, 还需等待: ${remainingTime}ms`);
    
    // 确保至少显示最小时间
    setTimeout(() => {
      if (this.hideRequested && this.isVisible) {
        this.splashElement.classList.add('hidden');
        this.isVisible = false;
        console.log('启动动画已隐藏');
        
        // 动画完成后移除元素，释放资源
        setTimeout(() => {
          if (this.splashElement && this.splashElement.parentNode) {
            this.splashElement.parentNode.removeChild(this.splashElement);
            console.log('启动动画元素已移除');
          }
        }, 500); // 等待过渡动画完成
      }
    }, remainingTime);
  }
  
  // 强制立即隐藏（用于超时情况）
  forceHide() {
    console.log('强制隐藏启动动画');
    this.hideRequested = true;
    
    if (this.splashElement && this.isVisible) {
      this.splashElement.classList.add('hidden');
      this.isVisible = false;
      console.log('启动动画已强制隐藏');
      
      setTimeout(() => {
        if (this.splashElement && this.splashElement.parentNode) {
          this.splashElement.parentNode.removeChild(this.splashElement);
          console.log('启动动画元素已移除');
        }
      }, 500);
    }
  }
}

// 创建全局启动动画实例
const splashScreen = new SplashScreen();

// 安全机制：确保启动动画不会永远显示
setTimeout(() => {
  if (splashScreen.isVisible) {
    console.warn('启动动画超时（10秒），强制隐藏');
    splashScreen.forceHide();
  }
}, 10000); // 10秒后强制隐藏

// 保存背景图片到文件系统
async function saveBackgroundImage(imageBase64) {
  console.log('开始保存背景图片到文件系统');
  try {
    if (!imageBase64 || !imageBase64.startsWith('data:image')) {
      console.log('无效的图片数据，无法保存');
      return null; // 返回null表示没有自定义背景
    }
    
    console.log('获取用户数据目录...');
    // 获取用户数据目录
    const userDataDirs = await ipcRenderer.invoke('get-user-data-dirs');
    console.log('用户数据目录:', userDataDirs);
    
    // 生成唯一的文件名
    const fileName = `background_${Date.now()}.png`;
    console.log('保存文件名:', fileName);
    console.log('保存路径:', userDataDirs.userImgsPath);
    
    const result = await ipcRenderer.invoke('save-image', imageBase64, userDataDirs.userImgsPath, fileName);
    console.log('保存结果:', result);
    
    if (result.success) {
      console.log('背景图片保存成功，路径:', `UserData/imgs/User/${fileName}`);
      // 返回相对于用户图片目录的路径
      return `UserData/imgs/User/${fileName}`;
    } else {
      console.error('保存背景图片失败:', result.error);
      return null; // 返回null表示没有自定义背景
    }
  } catch (error) {
    console.error('保存背景图片失败:', error);
    return null; // 返回null表示没有自定义背景
  }
}

// 从文件系统加载背景图片
async function loadBackgroundImage(backgroundPath) {
  // 如果路径是相对路径（来自文件系统存储），则构建完整路径
  if (backgroundPath && backgroundPath.startsWith('UserData/')) {
    return await getUserDataPath(backgroundPath);
  }
  // 如果没有路径，返回null
  return null;
}

// 用于构建文件路径的辅助函数
async function getUserDataPath(relativePath) {
  if (relativePath && relativePath.startsWith('UserData/')) {
    // 通过IPC获取用户数据目录
    const userDataDirs = await ipcRenderer.invoke('get-user-data-dirs');
    // 构建完整路径
    return `file://${userDataDirs.userDataPath.replace(/\\/g, '/')}/${relativePath.substring(9)}`; // 移除 'UserData/' 前缀
  }
  return relativePath || 'images/app-icon.png';
}

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
        } else {
          // 如果没有选中的联系人，清理聊天内容
          clearChatMessages();
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
        } else {
          // 头部显示的联系人已被删除，清理聊天内容
          console.log('切换到聊天页面：头部联系人不存在，清理内容');
          clearChatMessages();
        }
      } else {
        // 如果没有选中的联系人，更新聊天页面状态
        updateChatPage();
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
  console.log('DOM内容加载完成，开始初始化应用');
  
  try {
    // 立即初始化所有功能，确保数据能正确加载
    console.log('开始初始化功能模块...');
    initSidebarTabs()
    initProfilePage()
    initContactsPage()
    initSettingsPage()
    initBackgroundImage()
    initBackgroundOpacity()
    initMessageInputKeyboard()
    
    console.log('所有功能模块初始化完成');
    
    // 尝试加载用户数据，但不等待它完成
    loadUserData().then(() => {
      console.log('用户数据加载完成');
    }).catch(error => {
      console.error('用户数据加载失败:', error);
    }).finally(() => {
      // 无论用户数据加载是否成功，都隐藏启动动画
      console.log('准备隐藏启动动画');
      setTimeout(() => {
        splashScreen.hide();
      }, 300);
    });
    
  } catch (error) {
    console.error('应用初始化过程中出现错误:', error);
    // 即使出现错误也要强制隐藏启动动画
    setTimeout(() => {
      splashScreen.hide();
    }, 300);
  }
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
  loadUserData().catch(error => {
    console.error('加载用户数据失败:', error);
  });
  
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
  async function updateAvatar(imageUrl) {
    profileAvatar.src = imageUrl
    sidebarAvatar.src = imageUrl
    
    // 保存到本地存储
    const userData = await getUserData()
    userData.avatar = imageUrl
    saveUserData(userData)
    
    // 输出头像存放路径
    console.log('头像已更新:')
    console.log('  头像URL:', imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''))
    console.log('  存放位置: localStorage - userData.avatar')
    console.log('  数据类型:', imageUrl.startsWith('data:image/') ? 'Data URL' : '普通URL')
    console.log('  数据大小:', imageUrl.length, '字符')
  }
  
  // 更新头像（使用文件路径）
  async function updateAvatarWithFilePath(filePath) {
    // 获取完整文件URL
    const fullUrl = await getUserDataPath(filePath);
    profileAvatar.src = fullUrl;
    sidebarAvatar.src = fullUrl;
    
    // 保存到本地存储 - 只保存路径而非完整URL
    const userData = await getUserData();
    userData.avatar = filePath;  // 只保存相对路径
    saveUserData(userData);
    
    // 输出头像存放路径
    console.log('头像已更新:');
    console.log('  头像路径:', filePath);
    console.log('  存放位置: localStorage - userData.avatar 和 文件系统');
    console.log('  完整URL:', fullUrl);
  }
  
  // 移除头像函数
  async function removeAvatar() {
    const defaultAvatar = 'images/app-icon.png'
    profileAvatar.src = defaultAvatar
    sidebarAvatar.src = defaultAvatar
    
    // 保存到本地存储
    const userData = await getUserData()
    userData.avatar = defaultAvatar
    saveUserData(userData)
    
    console.log('头像已重置为默认头像')
  }
  
  // 更新用户名函数
  async function updateUsername(username) {
    sidebarUsername.textContent = username
    usernameInput.value = username
    
    // 保存到本地存储
    const userData = await getUserData()
    userData.username = username
    saveUserData(userData)
    
    console.log('用户名已更新为：' + username)
    customModal.alert('用户名保存成功！')
  }
  
  // 获取用户数据
  async function getUserData() {
    const defaultData = {
      username: '我的',
      avatar: 'images/app-icon.png',
      userId: 'user_' + Math.random().toString(36).substr(2, 8),
      registerTime: new Date().toISOString().split('T')[0]
    }
    
    try {
      const savedData = localStorage.getItem('userData')
      const userData = savedData ? JSON.parse(savedData) : defaultData
      
      // 如果头像是文件系统路径，则转换为可用的文件URL
      if (userData.avatar && userData.avatar.startsWith('UserData/')) {
        userData.avatar = await loadUserAvatar(userData.avatar);
      }
      
      return userData
    } catch (error) {
      console.error('加载用户数据失败：', error)
      return defaultData
    }
  }
  
  // 保存用户头像到文件系统
  async function saveUserAvatar(avatarBase64) {
    try {
      if (!avatarBase64 || !avatarBase64.startsWith('data:image')) {
        return 'images/app-icon.png'; // 返回默认头像路径
      }
      
      // 获取用户数据目录
      const userDataDirs = await ipcRenderer.invoke('get-user-data-dirs');
      
      // 生成唯一的文件名
      const fileName = `user_avatar_${Date.now()}.png`;
      const result = await ipcRenderer.invoke('save-image', avatarBase64, userDataDirs.userImgsPath, fileName);
      
      if (result.success) {
        // 返回相对于用户图片目录的路径
        return `UserData/imgs/User/${fileName}`;
      } else {
        console.error('保存用户头像失败:', result.error);
        return 'images/app-icon.png'; // 返回默认头像路径
      }
    } catch (error) {
      console.error('保存用户头像失败:', error);
      return 'images/app-icon.png'; // 返回默认头像路径
    }
  }
  
  // 从文件系统加载用户头像
  async function loadUserAvatar(avatarPath) {
    // 如果路径是相对路径（来自文件系统存储），则构建完整路径
    if (avatarPath && avatarPath.startsWith('UserData/')) {
      return await getUserDataPath(avatarPath);
    }
    // 如果是默认或其他路径，直接返回
    return avatarPath || 'images/app-icon.png';
  }
  
  // 保存用户数据
  async function saveUserData(userData) {
    try {
      // 如果有头像数据，先保存到文件系统
      let userDataToSave = {...userData};
      if (userData.avatar && userData.avatar.startsWith('data:image')) {
        const avatarPath = await saveUserAvatar(userData.avatar);
        userDataToSave.avatar = avatarPath;
      }
      
      localStorage.setItem('userData', JSON.stringify(userDataToSave))
    } catch (error) {
      console.error('保存用户数据失败：', error)
    }
  }
  
  // 加载用户数据 - 修复头像和用户名加载
async function loadUserData() {
  const userData = await getUserData()
  
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
  async function saveCroppedAvatar(canvas, avatarType) {
    try {
      // 将canvas转换为base64数据URL
      const dataUrl = canvas.toDataURL('image/png')
      
      console.log('头像已生成，准备保存')
      
      if (avatarType === 'contact') {
        // 获取当前编辑的联系人ID（通常在编辑模式下会有一个隐藏字段）
        const contactIdInput = document.getElementById('contact-id');
        const contactId = contactIdInput ? contactIdInput.value : null;
        
        if (contactId) {
          // 保存联系人头像到文件系统并获取路径
          const avatarPath = await saveContactAvatar(dataUrl, contactId);
          
          // 更新联系人头像预览
          const contactAvatarPreview = document.getElementById('contact-avatar-preview');
          if (contactAvatarPreview && contactAvatarPreview.querySelector('img')) {
            // 使用文件路径而非base64数据URL
            const fullUrl = await getUserDataPath(avatarPath);
            contactAvatarPreview.querySelector('img').src = fullUrl;
          }
        } else {
          // 如果没有联系人ID（新建联系人），暂时使用dataUrl
          const contactAvatarPreview = document.getElementById('contact-avatar-preview');
          if (contactAvatarPreview && contactAvatarPreview.querySelector('img')) {
            contactAvatarPreview.querySelector('img').src = dataUrl;
          }
        }
        
        // 关闭裁剪页面
        document.querySelectorAll('.content-area').forEach(area => {
          area.style.display = 'none'
        })
        
        // 返回到联系人创建/编辑弹窗
        // 弹窗应该已经在显示状态，不需要重新显示
        
        customModal.alert('头像裁剪完成！')
      } else {
        // 保存头像到文件系统并获取路径
        const avatarPath = await saveUserAvatar(dataUrl);
        
        // 更新用户头像显示
        if (avatarPath) {
          // 使用文件路径而非base64数据URL
          updateAvatarWithFilePath(avatarPath);
        } else {
          // 如果保存失败，仍然使用dataUrl作为备选方案
          updateAvatar(dataUrl);
        }
        
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

// 聊天设置功能
function initChatSettings() {
  // 获取DOM元素
  const enableDelaySwitch = document.getElementById('enable-delay-switch')
  const enableDelayCheckbox = document.getElementById('enable-delay-checkbox')
  const delayTimeInput = document.getElementById('delay-time-input')
  const saveChatConfigBtn = document.getElementById('save-chat-config')
  
  if (!enableDelaySwitch || !enableDelayCheckbox || !delayTimeInput || !saveChatConfigBtn) {
    return
  }
  
  // 检查是否已经初始化过，避免重复绑定事件
  if (enableDelaySwitch.dataset.initialized === 'true') {
    // 只更新UI，不重新绑定事件
    loadChatSettings()
    return
  }
  
  // 标记为已初始化
  enableDelaySwitch.dataset.initialized = 'true'
  
  // 从本地存储加载聊天设置
  function loadChatSettings() {
    const chatSettings = JSON.parse(localStorage.getItem('chatSettings') || '{}')
    const isEnabled = chatSettings.enableDelay || false
    const delayTime = chatSettings.delayTime || 3
    
    // 更新UI
    enableDelayCheckbox.checked = isEnabled
    if (isEnabled) {
      enableDelaySwitch.classList.add('active')
    } else {
      enableDelaySwitch.classList.remove('active')
    }
    
    delayTimeInput.value = delayTime
    
    // 根据开关状态更新输入框和保存按钮的禁用状态
    updateChatSettingControls(isEnabled)
  }
  
  // 更新控制元素的禁用状态
  function updateChatSettingControls(isEnabled) {
    delayTimeInput.disabled = !isEnabled
    saveChatConfigBtn.disabled = !isEnabled
  }
  
  // 保存聊天设置到本地存储
  function saveChatSettings() {
    const isEnabled = enableDelayCheckbox.checked
    const delayTime = parseInt(delayTimeInput.value) || 3
    
    const chatSettings = {
      enableDelay: isEnabled,
      delayTime: delayTime
    }
    
    localStorage.setItem('chatSettings', JSON.stringify(chatSettings))
    customModal.alert('聊天配置已保存！')
  }
  
  // 处理开关点击事件
  enableDelaySwitch.addEventListener('click', () => {
    const isEnabled = !enableDelayCheckbox.checked
    enableDelayCheckbox.checked = isEnabled
    
    if (isEnabled) {
      enableDelaySwitch.classList.add('active')
    } else {
      enableDelaySwitch.classList.remove('active')
    }
    
    updateChatSettingControls(isEnabled)
  })
  
  // 处理保存按钮点击事件
  saveChatConfigBtn.addEventListener('click', () => {
    saveChatSettings()
  })
  
  // 初始化加载设置
  loadChatSettings()
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
    // 如果切换到聊天设置标签页，重新初始化聊天设置
    if (targetTab === 'chat-settings') {
      // 延迟初始化，确保DOM已经更新
      setTimeout(() => {
        // 先检查DOM元素是否存在
        const enableDelaySwitch = document.getElementById('enable-delay-switch')
        if (enableDelaySwitch) {
          initChatSettings()
          console.log('切换到聊天设置标签页，重新初始化聊天设置')
        } else {
          console.warn('聊天设置元素未找到，延迟重试')
          setTimeout(() => {
            initChatSettings()
            console.log('延迟重试：切换到聊天设置标签页，重新初始化聊天设置')
          }, 100)
        }
      }, 50)
    }
  }
  
  // 开关切换功能 - 只处理没有特定ID的开关
  const toggleSwitches = document.querySelectorAll('.toggle-switch:not(#enable-delay-switch):not(#system-theme-switch)')
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
      // 获取当前系统主题开关状态
      const isSystemThemeEnabled = localStorage.getItem('isSystemThemeEnabled') === 'true'
      
      // 只有在系统主题开关关闭时，才激活固定模式
      if (!isSystemThemeEnabled) {
        // 移除所有模式的激活状态
        modeItems.forEach(mode => {
          mode.classList.remove('active')
        })
        // 激活当前模式
        item.classList.add('active')
        
        // 获取选中的模式
        const mode = item.getAttribute('data-mode')
        
        // 切换主题
        toggleTheme(mode, false)
      }
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
  
  // 初始化发送消息快捷键选择器的默认值
  const sendShortcutSelected = document.getElementById('send-shortcut-selected')
  if (sendShortcutSelected) {
    const savedShortcut = localStorage.getItem('sendMessageShortcut') || 'ctrl+enter'
    // 将快捷键类型映射为显示文本
    const shortcutTextMap = {
      'ctrl+enter': 'Ctrl+Enter',
      'enter': 'Enter'
    }
    sendShortcutSelected.textContent = shortcutTextMap[savedShortcut] || 'Ctrl+Enter'
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
        
        // 如果是发送消息快捷键选择器，保存到localStorage
        if (selected.id === 'send-shortcut-selected') {
          localStorage.setItem('sendMessageShortcut', value)
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

// 初始化消息输入框的键盘事件监听
function initMessageInputKeyboard() {
  const messageInput = document.getElementById('message-input')
  if (!messageInput) return
  
  messageInput.addEventListener('keydown', (e) => {
    // 获取用户选择的发送消息快捷键
    const sendShortcut = localStorage.getItem('sendMessageShortcut') || 'ctrl+enter'
    
    // 根据用户选择的快捷键处理发送消息
    if (
      (sendShortcut === 'enter' && e.key === 'Enter' && !e.ctrlKey) ||
      (sendShortcut === 'ctrl+enter' && e.key === 'Enter' && e.ctrlKey)
    ) {
      // 阻止默认行为
      e.preventDefault()
      // 触发发送按钮点击事件
      const sendBtn = document.getElementById('send-btn')
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click()
      }
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

// 检测系统主题
function isSystemDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

// 初始化主题
function initTheme() {
  // 从本地存储获取主题设置
  const savedMode = localStorage.getItem('appTheme') || 'light'
  const isSystemThemeEnabled = localStorage.getItem('isSystemThemeEnabled') === 'true'
  
  // 应用主题
  toggleTheme(savedMode, isSystemThemeEnabled)
  
  // 更新UI状态
  const modeItems = document.querySelectorAll('.mode-item')
  modeItems.forEach(item => {
    item.classList.remove('active')
  })
  
  // 如果启用了系统主题，不激活任何固定模式
  if (!isSystemThemeEnabled) {
    const activeModeItem = document.querySelector(`[data-mode="${savedMode}"]`)
    if (activeModeItem) {
      activeModeItem.classList.add('active')
    }
  }
  
  // 更新系统主题开关状态
  const systemThemeSwitch = document.getElementById('system-theme-switch')
  const systemThemeCheckbox = document.getElementById('system-theme-checkbox')
  if (systemThemeSwitch && systemThemeCheckbox) {
    systemThemeCheckbox.checked = isSystemThemeEnabled
    if (isSystemThemeEnabled) {
      systemThemeSwitch.classList.add('active')
    } else {
      systemThemeSwitch.classList.remove('active')
    }
  }
  
  // 添加系统主题变化监听器
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    // 只有当启用了系统主题时，才跟随系统变化
    const isSystemEnabled = localStorage.getItem('isSystemThemeEnabled') === 'true'
    if (isSystemEnabled) {
      const savedMode = localStorage.getItem('appTheme') || 'light'
      toggleTheme(savedMode, true)
    }
  })
  
  // 初始化系统主题开关事件
  initSystemThemeSwitch()
}

// 初始化系统主题开关
function initSystemThemeSwitch() {
  // 使用setTimeout确保DOM元素已经完全加载
  setTimeout(() => {
    const systemThemeSwitch = document.getElementById('system-theme-switch')
    const systemThemeCheckbox = document.getElementById('system-theme-checkbox')
    
    if (!systemThemeSwitch || !systemThemeCheckbox) {
      console.warn('系统主题开关元素未找到')
      return
    }
    
    // 确保只添加一次事件监听器
    if (systemThemeSwitch.dataset.initialized) {
      return
    }
    systemThemeSwitch.dataset.initialized = 'true'
    
    systemThemeSwitch.addEventListener('click', () => {
      const isEnabled = !systemThemeCheckbox.checked
      systemThemeCheckbox.checked = isEnabled
      
      if (isEnabled) {
        systemThemeSwitch.classList.add('active')
      } else {
        systemThemeSwitch.classList.remove('active')
      }
      
      // 保存设置
      localStorage.setItem('isSystemThemeEnabled', isEnabled)
      
      // 应用主题
      const savedMode = localStorage.getItem('appTheme') || 'light'
      toggleTheme(savedMode, isEnabled)
      
      // 更新模式选择项的激活状态
      const modeItems = document.querySelectorAll('.mode-item')
      modeItems.forEach(item => {
        if (isEnabled) {
          item.classList.remove('active')
        } else {
          const currentMode = localStorage.getItem('appTheme') || 'light'
          if (item.getAttribute('data-mode') === currentMode) {
            item.classList.add('active')
          } else {
            item.classList.remove('active')
          }
        }
      })
    })
  }, 100)
}

// 初始化背景图片功能
function initBackgroundImage() {
  const backgroundInput = document.getElementById('background-input')
  const backgroundPreview = document.getElementById('background-preview')
  const removeBackgroundBtn = document.getElementById('remove-background-btn')
  
  if (!backgroundInput || !backgroundPreview || !removeBackgroundBtn) {
    return
  }
  
  // 从本地存储加载背景图片路径
  const savedBackgroundPath = localStorage.getItem('customBackground')
  console.log('初始化加载背景图片，localStorage中的路径:', savedBackgroundPath);
  if (savedBackgroundPath) {
    // 如果是文件路径，需要转换为完整路径
    if (savedBackgroundPath.startsWith('UserData/')) {
      console.log('检测到文件路径格式，正在加载:', savedBackgroundPath);
      // 使用 Promise 来处理异步操作
      loadBackgroundImage(savedBackgroundPath).then(fullImagePath => {
        console.log('加载文件路径结果:', fullImagePath);
        if (fullImagePath) {
          applyBackgroundImage(fullImagePath)
          updateBackgroundPreview(fullImagePath)
        }
      });
    } else {
      // 如果不是文件路径（可能是旧数据或base64），直接使用
      console.log('检测到base64或其他格式，直接应用:', savedBackgroundPath.substring(0, 100) + '...');
      applyBackgroundImage(savedBackgroundPath)
      updateBackgroundPreview(savedBackgroundPath)
    }
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
  backgroundInput.addEventListener('change', async (e) => {
    console.log('背景图片选择事件触发');
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.target.files[0]
    if (!file) {
      console.log('没有选择文件');
      return
    }
    
    console.log('选择的文件:', file.name, file.size, 'bytes');
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      console.log('文件读取完成，开始处理背景图片');
      const imageDataUrl = event.target.result
      console.log('生成的dataURL长度:', imageDataUrl.length);
      
      applyBackgroundImage(imageDataUrl)
      updateBackgroundPreview(imageDataUrl)
      
      // 保存背景图片到文件系统，仅保存路径到localStorage
      console.log('调用saveBackgroundImage保存到文件系统');
      const backgroundPath = await saveBackgroundImage(imageDataUrl)
      console.log('后台返回的路径:', backgroundPath);
      
      if (backgroundPath) {
        console.log('保存路径到localStorage:', backgroundPath);
        localStorage.setItem('customBackground', backgroundPath)
      } else {
        console.log('保存失败，清除localStorage中的背景图片路径');
        localStorage.removeItem('customBackground') // 如果保存失败，移除现有项
      }
    }
    reader.readAsDataURL(file)
    console.log('开始读取文件...');
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
  // 获取所有聊天页面的相关元素
  const chatHeaders = document.querySelectorAll('.chat-header')
  const chatMessagesBgs = document.querySelectorAll('.chat-messages-bg')
  const chatInputAreas = document.querySelectorAll('.chat-input-area')
  
  // 检查是否为深色模式
  const isDarkMode = document.body.classList.contains('dark-mode')
  
  // 深色模式下的正常颜色值
  const darkModeHeaderColor = `rgba(30, 30, 30, ${opacity})`
  const darkModeMessagesColor = `linear-gradient(135deg, rgba(30, 30, 30, ${opacity}) 0%, rgba(40, 40, 40, ${opacity}) 100%)`
  
  // 浅色模式下的颜色值
  const lightModeHeaderColor = `rgba(255, 255, 255, ${opacity})`
  const lightModeMessagesColor = `linear-gradient(135deg, rgba(255, 255, 255, ${opacity}) 0%, rgba(240, 240, 240, ${opacity}) 100%)`
  
  // 更新所有聊天头部
  chatHeaders.forEach(chatHeader => {
    if (isDarkMode) {
      chatHeader.style.background = darkModeHeaderColor
    } else {
      chatHeader.style.background = lightModeHeaderColor
    }
  })
  
  // 更新所有聊天消息背景
  chatMessagesBgs.forEach(chatMessagesBg => {
    if (isDarkMode) {
      chatMessagesBg.style.background = darkModeMessagesColor
    } else {
      chatMessagesBg.style.background = lightModeMessagesColor
    }
  })
  
  // 更新所有聊天输入区域
  chatInputAreas.forEach(chatInputArea => {
    if (isDarkMode) {
      chatInputArea.style.background = darkModeHeaderColor
    } else {
      chatInputArea.style.background = lightModeHeaderColor
    }
  })
  
  // 移除对消息输入框的背景色设置，让它继承容器背景，保持与容器融为一体
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
  // 清空背景图片相关样式
  document.body.style.backgroundImage = ''
  document.body.style.backgroundSize = ''
  document.body.style.backgroundPosition = ''
  document.body.style.backgroundRepeat = ''
  document.body.style.backgroundAttachment = ''
  
  // 根据当前主题模式设置正确的背景色
  const isDarkMode = document.body.classList.contains('dark-mode')
  if (isDarkMode) {
    // 深色模式下设置深色背景
    document.body.style.background = '#1e1e1e'
  } else {
    // 浅色模式下设置浅色背景
    document.body.style.background = '#e8e8e8'
  }
  
  // 移除背景预览
  const backgroundPreview = document.getElementById('background-preview')
  if (backgroundPreview) {
    const previewImg = backgroundPreview.querySelector('img')
    if (previewImg) {
      previewImg.remove()
    }
    backgroundPreview.classList.remove('has-image')
  }
  
  // 移除本地存储的背景图片
  localStorage.removeItem('customBackground')
}

// 切换主题函数
function toggleTheme(mode, isSystemThemeEnabled = false) {
  // 移除所有过渡效果，防止快速切换时的动画冲突
  document.body.style.transition = 'none'
  
  // 确定实际应用的主题
  let actualMode = mode
  if (isSystemThemeEnabled) {
    actualMode = isSystemDarkMode() ? 'dark' : 'light'
  }
  
  // 应用主题
  if (actualMode === 'dark') {
    document.body.classList.add('dark-mode')
  } else {
    document.body.classList.remove('dark-mode')
  }
  
  // 保存主题设置到本地存储
  localStorage.setItem('appTheme', mode)
  
  // 检查是否有自定义背景图片（更严格的判断）
  const customBackground = localStorage.getItem('customBackground')
  const hasCustomBackground = customBackground && customBackground !== ''
  
  // 如果没有自定义背景图片，根据主题设置正确的背景色
  if (!hasCustomBackground) {
    if (actualMode === 'dark') {
      // 深色模式下设置深色背景
      document.body.style.backgroundColor = '#1e1e1e'
      // 确保背景图片被清空
      document.body.style.backgroundImage = ''
    } else {
      // 浅色模式下设置浅色背景
      document.body.style.backgroundColor = '#e8e8e8'
      // 确保背景图片被清空
      document.body.style.backgroundImage = ''
    }
  } else {
    // 如果有自定义背景图片，确保背景色不影响显示
    document.body.style.backgroundColor = 'transparent'
  }
  
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
  
  // 获取当前选中的联系人
  const currentContact = document.querySelector('.contact-item.active');
  const currentContactId = currentContact ? currentContact.getAttribute('data-contact-id') : null;
  
  // 检查当前聊天头部显示的联系人是否还存在
  const chatHeader = document.querySelector('.chat-header');
  const headerContactId = chatHeader ? chatHeader.getAttribute('data-contact-id') : null;
  const isHeaderContactDeleted = headerContactId && !contacts.find(c => c.id === headerContactId);
  
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
    if (messageInput) {
      messageInput.disabled = true;
      messageInput.placeholder = '请先创建联系人才能发送消息...';
    }
    if (sendBtn) sendBtn.disabled = true;
    if (chatInputArea) chatInputArea.classList.add('disabled');
    
    // 更新聊天头部
    const chatName = document.querySelector('.chat-name');
    const chatStatus = document.querySelector('.chat-status');
    if (chatName) chatName.textContent = '选择联系人';
    if (chatStatus) chatStatus.textContent = '请先创建联系人';
    
    // 清理聊天头部数据
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader) {
      chatHeader.removeAttribute('data-contact-id');
      chatHeader.removeAttribute('data-contact-name');
    }
  } else {
    // 隐藏无联系人提示
    noContactPrompt.style.display = 'none';
    
    // 如果头部显示的联系人被删除，需要清理聊天内容
    if (isHeaderContactDeleted) {
      console.log('头部联系人已被删除，清理聊天内容');
      clearChatMessages();
    }
    
    // 检查当前选中的联系人是否还存在
    if (currentContactId && !contacts.find(c => c.id === currentContactId)) {
      // 当前选中的联系人已被删除，清理聊天内容
      if (!isHeaderContactDeleted) { // 如果上面已经清理过了，这里就不需要重复清理
        clearChatMessages();
      }
      
      // 禁用输入区域直到选择新的联系人
      if (messageInput) {
        messageInput.disabled = true;
        messageInput.placeholder = '请先选择联系人才能发送消息...';
      }
      if (sendBtn) sendBtn.disabled = true;
      if (chatInputArea) chatInputArea.classList.add('disabled');
    } else if (currentContactId) {
      // 当前选中的联系人仍然存在，启用输入区域
      if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = '输入消息...';
      }
      if (sendBtn) sendBtn.disabled = false;
      if (chatInputArea) chatInputArea.classList.remove('disabled');
    } else {
      // 没有选中的联系人，检查是否有联系人可以自动选择
      if (contacts.length > 0) {
        // 自动选择第一个联系人，这会启用输入区域
        switchToContactChat(contacts[0].id);
      } else {
        // 确实没有联系人，禁用输入区域
        if (messageInput) {
          messageInput.disabled = true;
          messageInput.placeholder = '请先选择联系人才能发送消息...';
        }
        if (sendBtn) sendBtn.disabled = true;
        if (chatInputArea) chatInputArea.classList.add('disabled');
      }
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
async function saveContact(contactData) {
  // 如果有头像数据，先保存到文件系统
  let processedContactData = {...contactData};
  if (contactData.avatar && contactData.avatar.startsWith('data:image')) {
    const avatarPath = await saveContactAvatar(contactData.avatar, contactData.id);
    processedContactData.avatar = avatarPath;
  }
  
  // 加密敏感数据
  const encryptedContact = {
    ...processedContactData,
    apikey: CryptoJS.AES.encrypt(processedContactData.apikey, AES_CONFIG.key, {
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
  await saveContacts();
  
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
      if (chatAvatar) chatAvatar.src = await loadContactAvatar(contact.avatar);
    }
  }
  
  // 判断是创建还是更新联系人
  const isUpdate = !!currentContactId;
  
  // 关闭弹窗
  closeContactModal();
  
  // 如果是创建新联系人，自动切换到该联系人
  if (!isUpdate && encryptedContact.id) {
    // 延迟一点时间，确保UI更新完成
    setTimeout(async () => {
      await switchToContactChat(encryptedContact.id);
    }, 100);
  }
  
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
async function loadContacts() {
  try {
    // 从文件系统加载所有联系人配置
    const contactConfigs = await ipcRenderer.invoke('get-all-contact-configs');
    contacts = contactConfigs;
  } catch (error) {
    console.error('加载联系人失败:', error);
    contacts = [];
  }
  
  // 更新UI
  updatePopupContacts(); // 新增
  updateChatPage(); // 新增
}

// 保存联系人到本地存储
async function saveContacts() {
  try {
    // 保存每个联系人的配置到单独的JSON文件
    for (const contact of contacts) {
      const result = await ipcRenderer.invoke('save-contact-config', contact.id, contact);
      if (!result.success) {
        console.error(`保存联系人配置失败: ${contact.id}`, result.error);
      }
    }
    
    // 删除不再存在的联系人配置文件
    await cleanupContactConfigs();
  } catch (error) {
    console.error('保存联系人失败:', error);
  }
}

// 清理不再存在的联系人配置文件
async function cleanupContactConfigs() {
  try {
    // 这里我们可以获取当前存在的配置文件并删除不再需要的
    // 暂时留空，后续可扩展
  } catch (error) {
    console.error('清理联系人配置失败:', error);
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
      // 获取被删除的联系人信息
      const deletedContact = contacts.find(c => c.id === id);
      
      // 检查当前是否在聊天页面，以及是否正在与被删除的联系人聊天
      const currentActiveTab = document.querySelector('.sidebar-tab.active');
      const chatHeader = document.querySelector('.chat-header');
      const currentContactId = chatHeader ? chatHeader.getAttribute('data-contact-id') : null;
      const isCurrentlyChattingWithDeleted = currentContactId === id;
      const isInChatPage = currentActiveTab && currentActiveTab.getAttribute('data-tab') === 'chat';
      
      // 删除联系人
      contacts = contacts.filter(c => c.id !== id);
      saveContacts();
      renderContacts();
      updatePopupContacts(); // 新增
      
      // 如果在聊天页面且正在与被删除的联系人聊天
      if (isInChatPage && isCurrentlyChattingWithDeleted) {
        // 立即清理当前聊天内容
        clearChatMessages();
        
        // 如果有其他联系人，自动切换到第一个
        if (contacts.length > 0) {
          // 延迟一点时间，确保UI更新完成
          setTimeout(() => {
            switchToContactChat(contacts[0].id);
          }, 100);
        }
        // 如果没有其他联系人，clearChatMessages已经处理了无联系人状态
      } else {
        // 正常更新聊天页面状态
        updateChatPage();
      }
      
      // 如果在联系人页面，切换到聊天页面
      if (currentActiveTab && currentActiveTab.getAttribute('data-tab') === 'contacts') {
        // 延迟一点再切换，确保删除操作完成
        setTimeout(() => {
          switchTab('chat', true);
        }, 100);
      }
    }
  });
}

// 切换到联系人聊天
async function switchToContactChat(contactId) {
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
  const chatStatus = document.querySelector('.chat-status');
  const chatAvatar = document.querySelector('.chat-avatar img');
  const chatHeader = document.querySelector('.chat-header');
  
  if (chatName) chatName.textContent = contact.nickname;
  if (chatStatus) chatStatus.textContent = ''; // 移除提供商和模型名显示
  if (chatAvatar) chatAvatar.src = await loadContactAvatar(contact.avatar);
  if (chatHeader) chatHeader.setAttribute('data-contact-id', contact.id);
  
  // 更新输入框的placeholder并启用输入功能
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const chatInputArea = document.querySelector('.chat-input-area');
  
  if (messageInput) {
    messageInput.placeholder = '输入消息...';
    messageInput.disabled = false;
  }
  
  if (sendBtn) {
    sendBtn.disabled = false;
  }
  
  if (chatInputArea) {
    chatInputArea.classList.remove('disabled');
  }
  
  // 加载聊天历史
  await loadContactChatHistory(contactId);
  
  // 更新最后活跃时间
  contact.lastActive = new Date().toISOString();
  await saveContacts();
  
  // 更新联系人列表的激活状态
  document.querySelectorAll('.contact-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // 激活当前联系人
  const currentContactItem = document.querySelector(`.contact-item[data-id="${contactId}"]`);
  if (currentContactItem) {
    currentContactItem.classList.add('active');
  }
  
  // 更新UI
  renderContacts();
  updatePopupContacts();
}

// 加载联系人聊天历史
async function loadContactChatHistory(contactId) {
  const chatMessagesContainer = document.getElementById('chat-messages');
  if (!chatMessagesContainer) return;
  
  // 清空现有聊天记录
  chatMessagesContainer.innerHTML = '';
  
  // 从本地文件加载聊天记录
  const messages = await loadChatHistoryFromStorage(contactId);
  console.log('加载聊天记录:', contactId, messages.length, '条消息');
  
  if (messages.length === 0) {
    // 没有聊天记录，直接返回
    return;
  }
  
  // 渲染聊天记录 - 使用 Promise.all 等待所有异步操作完成
  const promises = messages.map(async (message) => {
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
      // 处理AI消息的头像
      let avatarSrc = message.avatar || 'images/app-icon.png';
      if (avatarSrc && avatarSrc.startsWith('UserData/')) {
        avatarSrc = await getUserDataPath(avatarSrc);
      }
      
      let thinkingHTML = '';
      if (message.thinkingContent) {
        thinkingHTML = `
          <div class="thinking-content">
            <div class="thinking-header">
              <div class="thinking-title">
                <svg class="thinking-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                  <path d="M2 17L12 22L22 17"/>
                  <path d="M2 12L12 17L22 12"/>
                </svg>
                <span>深度思考</span>
              </div>
              <button class="thinking-toggle">收起</button>
            </div>
            <div class="thinking-text">${message.thinkingContent.replace(/\n/g, '<br>')}</div>
          </div>
        `;
      }
      
      messageHTML = `
        <div class="message ai-message" id="${message.id || 'msg-' + Date.now() + '-' + Math.random()}">
          <div class="message-avatar">
            <img src="${avatarSrc}" alt="AI" width="32" height="32">
          </div>
          <div class="message-content">
            ${thinkingHTML}
            <div class="message-text">${message.content.replace(/\n/g, '<br>')}</div>
            <div class="message-time">${message.time}</div>
          </div>
        </div>
      `;
    } else if (message.type === 'user') {
      // 处理用户消息的头像
      let avatarSrc = message.avatar || 'images/app-icon.png';
      if (avatarSrc && avatarSrc.startsWith('UserData/')) {
        avatarSrc = await getUserDataPath(avatarSrc);
      }
      
      messageHTML = `
        <div class="message user-message" id="${message.id || 'msg-' + Date.now() + '-' + Math.random()}">
          <div class="message-content">
            <div class="message-text">${message.content.replace(/\n/g, '<br>')}</div>
            <div class="message-time">${message.time}</div>
          </div>
          <div class="message-avatar">
            <img src="${avatarSrc}" alt="我" width="32" height="32">
          </div>
        </div>
      `;
    }
    
    if (messageHTML) {
      chatMessagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    }
  });
  
  // 等待所有消息渲染完成
  await Promise.all(promises);
  
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
  initMessageInputKeyboard();
  
  // 初始化联系人功能
  setTimeout(() => {
    initContacts();
    initChatSendButton();
    console.log('联系人功能初始化完成');
  }, 100);
  
  // 全局事件委托：处理思考容器的收起/展开
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('thinking-toggle')) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('思考切换按钮被点击', e.target);
      
      const thinkingDiv = e.target.closest('.thinking-content');
      if (!thinkingDiv) {
        console.error('找不到思考容器');
        return;
      }
      
      const thinkingText = thinkingDiv.querySelector('.thinking-text');
      if (!thinkingText) {
        console.error('找不到思考文本元素');
        return;
      }
      
      console.log('当前思考文本类名:', thinkingText.className);
      console.log('当前思考文本样式:', thinkingText.style.cssText);
      
      // 使用类名来控制显示/隐藏
      if (thinkingText.classList.contains('thinking-text-hidden')) {
        thinkingText.classList.remove('thinking-text-hidden');
        e.target.textContent = '收起';
        console.log('展开思考内容');
      } else {
        thinkingText.classList.add('thinking-text-hidden');
        e.target.textContent = '展开';
        console.log('收起思考内容');
      }
    }
  });
});

// 聊天功能实现
let currentChatHistory = [];
let isSendingMessage = false;

// 初始化发送按钮
function initChatSendButton() {
  const sendBtn = document.getElementById('send-btn');
  const messageInput = document.getElementById('message-input');
  
  if (!sendBtn || !messageInput) {
    console.warn('发送按钮或消息输入框未找到');
    return;
  }
  
  sendBtn.addEventListener('click', handleSendMessage);
  
  // 添加输入框回车发送支持
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
}

// 处理发送消息
async function handleSendMessage() {
  if (isSendingMessage) {
    return;
  }
  
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const message = messageInput.value.trim();
  
  if (!message) {
    return;
  }
  
  // 获取当前选中的联系人
  const chatHeader = document.querySelector('.chat-header');
  const contactId = chatHeader ? chatHeader.getAttribute('data-contact-id') : null;
  
  if (!contactId) {
    customModal.alert('请先选择联系人');
    return;
  }
  
  const contact = contacts.find(c => c.id === contactId);
  if (!contact) {
    customModal.alert('联系人不存在');
    return;
  }
  
  console.log('读取的联系人数据:', contact);
  
  // 解密API密钥
  let apiKey;
  try {
    apiKey = CryptoJS.AES.decrypt(contact.apikey, AES_CONFIG.key, {
      iv: AES_CONFIG.iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8);
  } catch (error) {
    customModal.alert('API密钥解密失败');
    return;
  }
  
  if (!apiKey) {
    customModal.alert('API密钥无效');
    return;
  }
  
  isSendingMessage = true;
  sendBtn.disabled = true;
  messageInput.disabled = true;
  
  // 添加用户消息到聊天界面
  addMessageToChat('user', message);
  
  // 清空输入框
  messageInput.value = '';
  
  try {
    // 构建消息历史
    const messages = [
      {
        role: 'user',
        content: message
      }
    ];
    
    // 创建阿里云API实例
    const aliyunAPI = new AliyunAPI(apiKey);
    
    // 构建联系人配置
    const contactConfig = {
      model: contact.model,
      enableSearch: contact.websearch,
      enableThinking: contact.deepthink,
      systemPrompt: contact.systemPrompt,
      isRolePlay: contact.roleplay
    };
    
    console.log('联系人配置:', contactConfig);
    
    let response;
    let aiMessageId = null;
    
    if (contact.deepthink && contact.websearch) {
      // 深度思考 + 联网搜索模式
      console.log('深度思考+联网搜索模式');
      let thinkingContent = '';
      let aiContent = '';
      
      // 根据是否角色扮演决定流式处理
      const isStreaming = !contact.roleplay;
      
      if (isStreaming) {
        // 流式传输：创建占位符
        aiMessageId = await addMessageToChat('ai', '', true);
        
        response = await aliyunAPI.chatCompletionWithThinkingAndSearch(
          contactConfig,
          messages,
          (content) => {
            // 处理AI回复内容
            aiContent += content;
            updateMessageContent(aiMessageId, aiContent);
          },
          (thinking) => {
            // 处理深度思考内容
            thinkingContent += thinking;
            console.log('调用updateThinkingContent:', aiMessageId, thinkingContent);
            updateThinkingContent(aiMessageId, thinkingContent);
          },
          () => {
            // 完成回调
            console.log('深度思考+联网搜索完成');
            // 保存完整的AI回复（包括思考内容）
            saveMessageToHistory('ai', aiContent, new Date().toLocaleTimeString(), thinkingContent);
          }
        );
      } else {
        // 非流式传输：等待完整响应
        response = await aliyunAPI.chatCompletionWithThinkingAndSearch(
          contactConfig,
          messages,
          null, // 不传回调，等待完整响应
          null,
          null
        );
        
        // 收到完整响应后创建消息
        if (response.choices && response.choices.length > 0) {
          const choice = response.choices[0];
          let finalContent = '';
          
          // 先创建基本消息内容
          if (choice.message && choice.message.content) {
            finalContent += choice.message.content;
          }
          
          // 创建AI消息
          aiMessageId = await addMessageToChat('ai', finalContent, false);
          
          // 如果有思考内容，单独添加思考容器
          if (choice.message && choice.message.reasoning_content) {
            console.log('非流式模式：准备添加思考内容', aiMessageId, choice.message.reasoning_content);
            updateThinkingContent(aiMessageId, choice.message.reasoning_content);
            console.log('非流式模式：思考内容添加完成');
          }
        }
      }
    } else if (contact.deepthink) {
      // 仅深度思考模式 - 合并到一个聊天气泡中
      let thinkingContent = '';
      let aiContent = '';
      
      // 根据是否角色扮演决定流式处理
      const isStreaming = !contact.roleplay;
      
      if (isStreaming) {
        // 流式传输：创建占位符
        aiMessageId = await addMessageToChat('ai', '', true);
        
        response = await aliyunAPI.chatCompletionWithThinking(
          contactConfig,
          messages,
          (content) => {
            // 处理AI回复内容
            aiContent += content;
            updateMessageContent(aiMessageId, aiContent);
          },
          (thinking) => {
            // 处理深度思考内容
            thinkingContent += thinking;
            console.log('调用updateThinkingContent:', aiMessageId, thinkingContent);
            updateThinkingContent(aiMessageId, thinkingContent);
          },
          () => {
            // 完成回调
            console.log('深度思考完成');
            // 保存完整的AI回复（包括思考内容）
            saveMessageToHistory('ai', aiContent, new Date().toLocaleTimeString(), thinkingContent);
          }
        );
      } else {
        // 非流式传输：等待完整响应
        response = await aliyunAPI.chatCompletionWithThinking(
          contactConfig,
          messages,
          null, // 不传回调，等待完整响应
          null,
          null
        );
        
        // 收到完整响应后创建消息
        if (response.choices && response.choices.length > 0) {
          const choice = response.choices[0];
          let finalContent = '';
          let hasThinkingContent = false;
          
          // 先创建基本消息内容
          if (choice.message && choice.message.content) {
            finalContent += choice.message.content;
          }
          
          // 创建AI消息
          aiMessageId = await addMessageToChat('ai', finalContent, false);
          
          // 如果有思考内容，单独添加思考容器
          if (choice.message && choice.message.reasoning_content) {
            hasThinkingContent = true;
            console.log('非流式模式：准备添加思考内容', aiMessageId, choice.message.reasoning_content);
            updateThinkingContent(aiMessageId, choice.message.reasoning_content);
            console.log('非流式模式：思考内容添加完成');
          }
        }
      }
    } else if (contact.websearch) {
      // 仅联网搜索模式
      const isStreaming = !contactConfig.isRolePlay;
      console.log('联网搜索模式，流式传输:', isStreaming, '角色扮演:', contactConfig.isRolePlay);
      
      if (isStreaming) {
        // 流式传输：先创建空消息占位符
        console.log('联网搜索：使用流式传输');
        aiMessageId = await addMessageToChat('ai', '', true);
        
        let aiContent = '';
        response = await aliyunAPI.chatCompletionWithSearch(contactConfig, messages, (content) => {
          console.log('联网搜索流式更新:', content);
          aiContent += content;
          updateMessageContent(aiMessageId, content);
        });
        
        // 流式传输完成后保存AI回复
        if (aiContent) {
          saveMessageToHistory('ai', aiContent, new Date().toLocaleTimeString());
        }
      } else {
        // 非流式传输：等待响应后再创建消息
        console.log('联网搜索：使用非流式传输');
        response = await aliyunAPI.chatCompletionWithSearch(contactConfig, messages);
        
        if (response.choices && response.choices.length > 0) {
          const aiContent = response.choices[0].message.content;
          aiMessageId = await addMessageToChat('ai', aiContent);
        }
      }
    } else {
      // 普通模式
      const isStreaming = !contactConfig.isRolePlay;
      
      if (isStreaming) {
        // 流式传输：先创建空消息占位符
        aiMessageId = await addMessageToChat('ai', '', true);
        
        let aiContent = '';
        response = await aliyunAPI.chatCompletion(contactConfig, messages, (content) => {
          // 流式传输时的实时更新
          aiContent += content;
          updateMessageContent(aiMessageId, content);
        });
        
        // 流式传输完成后保存AI回复
        if (aiContent) {
          saveMessageToHistory('ai', aiContent, new Date().toLocaleTimeString());
        }
      } else {
        // 非流式传输：等待响应后再创建消息
        response = await aliyunAPI.chatCompletion(contactConfig, messages);
        
        if (response.choices && response.choices.length > 0) {
          const aiContent = response.choices[0].message.content;
          aiMessageId = await addMessageToChat('ai', aiContent);
        }
      }
    }
    
    // 更新联系人最后活跃时间
    contact.lastActive = new Date().toISOString();
    saveContacts();
    
  } catch (error) {
    console.error('发送消息失败:', error);
    // 如果还没有创建AI消息，先创建错误消息
    if (!aiMessageId) {
      aiMessageId = await addMessageToChat('ai', '抱歉，消息发送失败，请稍后重试。');
    } else {
      updateMessageContent(aiMessageId, '抱歉，消息发送失败，请稍后重试。');
    }
  } finally {
    isSendingMessage = false;
    sendBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  }
}

// 添加消息到聊天界面
async function addMessageToChat(role, content, isPlaceholder = false) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return null;
  
  const messageId = 'msg-' + Date.now();
  const messageClass = role === 'user' ? 'user-message' : 'ai-message';
  const currentTime = new Date().toLocaleTimeString();
  
  // 获取头像URL
  let avatarSrc;
  if (role === 'user') {
    // 对于用户消息，获取用户头像
    const userData = await getUserData();
    avatarSrc = userData.avatar || 'images/app-icon.png';
  } else {
    // 对于AI消息，获取联系人头像
    avatarSrc = await getCurrentContactAvatar();
  }
  
  const messageHTML = `
    <div class="message ${messageClass}" id="${messageId}">
      <div class="message-avatar">
        <img src="${avatarSrc}" alt="${role}" width="32" height="32">
      </div>
      <div class="message-content">
        ${role === 'ai' && isPlaceholder ? `
          <div class="thinking-content" style="display: none;">
            <div class="thinking-header">
              <div class="thinking-title">
                <svg class="thinking-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                  <path d="M2 17L12 22L22 17"/>
                  <path d="M2 12L12 17L22 12"/>
                </svg>
                <span>深度思考</span>
              </div>
              <button class="thinking-toggle">收起</button>
            </div>
            <div class="thinking-text"></div>
          </div>
        ` : ''}
        <div class="message-text">${content}</div>
        <div class="message-time">${currentTime}</div>
      </div>
    </div>
  `;
  
  chatMessages.insertAdjacentHTML('beforeend', messageHTML);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // 保存消息到聊天记录（占位符消息不保存）
  if (!isPlaceholder) {
    await saveMessageToHistory(role, content, currentTime);
  }
  
  return messageId;
}

// 更新消息内容
function updateMessageContent(messageId, content) {
  console.log('updateMessageContent called:', messageId, content);
  
  const messageElement = document.getElementById(messageId);
  if (!messageElement) {
    console.error('找不到消息元素:', messageId);
    return;
  }
  
  // 检查是否是用户消息，防止错误更新
  if (messageElement.classList.contains('user-message')) {
    console.error('试图更新用户消息内容，这是不允许的:', messageId);
    return;
  }
  
  const messageText = messageElement.querySelector('.message-text');
  if (messageText) {
    messageText.innerHTML = content.replace(/\n/g, '<br>');
  }
  
  // 滚动到底部
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

// 保存单条消息到聊天记录
async function saveMessageToHistory(role, content, time, thinkingContent = null) {
  try {
    const chatHeader = document.querySelector('.chat-header');
    const contactId = chatHeader ? chatHeader.getAttribute('data-contact-id') : null;
    
    if (!contactId) {
      console.warn('没有当前联系人，无法保存聊天记录');
      return;
    }
    
    // 加载现有聊天记录
    const messages = await loadChatHistoryFromStorage(contactId);
    
    // 获取头像URL
    let avatar;
    if (role === 'user') {
      // 对于用户消息，获取用户头像
      const userData = await getUserData();
      avatar = userData.avatar || 'images/app-icon.png';
    } else {
      // 对于AI消息，获取联系人头像
      avatar = await getCurrentContactAvatar();
    }
    
    // 添加新消息
    const message = {
      id: 'msg-' + Date.now(),
      type: role,
      content: content,
      time: time,
      avatar: avatar
    };
    
    // 如果是AI消息且有思考内容，添加思考内容
    if (role === 'ai' && thinkingContent) {
      message.thinkingContent = thinkingContent;
    }
    
    messages.push(message);
    
    // 限制聊天记录数量，避免存储过多数据（最多保存100条）
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }
    
    // 保存到本地存储
    await saveChatHistory(contactId, messages);
    console.log('消息已保存到聊天记录:', message);
    
  } catch (error) {
    console.error('保存消息到聊天记录失败:', error);
  }
}

// 保存聊天记录到本地文件
async function saveChatHistory(contactId, messages) {
  try {
    const result = await ipcRenderer.invoke('save-chat-history', contactId, messages);
    if (result.success) {
      console.log('聊天记录已保存:', contactId, messages.length, '条消息', '路径:', result.filePath);
    } else {
      console.error('保存聊天记录失败:', result.error);
    }
  } catch (error) {
    console.error('保存聊天记录失败:', error);
  }
}

// 从本地文件加载聊天记录
async function loadChatHistoryFromStorage(contactId) {
  try {
    const messages = await ipcRenderer.invoke('load-chat-history', contactId);
    return Array.isArray(messages) ? messages : [];
  } catch (error) {
    console.error('加载聊天记录失败:', error);
    return [];
  }
}

// 更新深度思考内容
function updateThinkingContent(messageId, thinkingContent) {
  console.log('updateThinkingContent called:', messageId, thinkingContent);
  
  const messageElement = document.getElementById(messageId);
  if (!messageElement) {
    console.error('找不到消息元素:', messageId);
    return;
  }
  
  // 检查是否是用户消息，防止错误更新
  if (messageElement.classList.contains('user-message')) {
    console.error('试图更新用户消息的思考内容，这是不允许的:', messageId);
    return;
  }
  
  let thinkingDiv = messageElement.querySelector('.thinking-content');
  let isNewlyCreated = false;
  
  if (!thinkingDiv) {
    console.log('创建新的深度思考容器');
    thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking-content';
    thinkingDiv.innerHTML = `
      <div class="thinking-header">
        <div class="thinking-title">
          <svg class="thinking-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
            <path d="M2 17L12 22L22 17"/>
            <path d="M2 12L12 17L22 12"/>
          </svg>
          <span>深度思考</span>
        </div>
        <button class="thinking-toggle">收起</button>
      </div>
      <div class="thinking-text"></div>
    `;
    
    // 找到message-content元素，将思考内容插入到消息文本上方
    const messageContent = messageElement.querySelector('.message-content');
    const messageText = messageElement.querySelector('.message-text');
    if (messageContent && messageText) {
      messageContent.insertBefore(thinkingDiv, messageText);
      isNewlyCreated = true;
    } else {
      console.error('找不到message-content或message-text元素');
      return;
    }
  }
  
  const thinkingText = thinkingDiv.querySelector('.thinking-text');
  const toggleBtn = thinkingDiv.querySelector('.thinking-toggle');
  
  console.log('思考容器元素:', thinkingDiv);
  console.log('思考文本元素:', thinkingText);
  console.log('切换按钮元素:', toggleBtn);
  
  if (thinkingText) {
    console.log('更新深度思考文本内容');
    thinkingText.innerHTML = thinkingContent.replace(/\n/g, '<br>');
    
    // 只有在内容为空或者新创建时才显示，否则保持当前的收起/展开状态
    if (thinkingText.innerHTML.trim() === '' || isNewlyCreated) {
      thinkingText.classList.remove('thinking-text-hidden');
      toggleBtn.textContent = '收起';
      console.log('设置思考文本为显示状态，按钮文本为收起');
    }
    
    // 确保思考容器可见
    thinkingDiv.style.display = 'block';
    console.log('思考容器显示状态:', thinkingDiv.style.display);
  } else {
    console.error('找不到thinking-text元素');
  }
  
  // 显示思考容器
  thinkingDiv.style.display = 'block';
  
  // 收起/展开事件处理已经通过全局事件委托实现，这里不需要重复绑定
}

// 获取当前联系人头像
// 保存联系人头像到文件系统
async function saveContactAvatar(avatarBase64, contactId) {
  try {
    if (!avatarBase64 || !avatarBase64.startsWith('data:image')) {
      return 'images/app-icon.png'; // 返回默认头像路径
    }
    
    // 获取用户数据目录
    const userDataDirs = await ipcRenderer.invoke('get-user-data-dirs');
    
    // 使用联系人ID作为文件名
    const fileName = `${contactId}.png`;
    const result = await ipcRenderer.invoke('save-image', avatarBase64, userDataDirs.contactImgsPath, fileName);
    
    if (result.success) {
      // 返回相对于联系人图片目录的路径
      return `UserData/imgs/Contact/${fileName}`;
    } else {
      console.error('保存联系人头像失败:', result.error);
      return 'images/app-icon.png'; // 返回默认头像路径
    }
  } catch (error) {
    console.error('保存联系人头像失败:', error);
    return 'images/app-icon.png'; // 返回默认头像路径
  }
}

// 从文件系统加载联系人头像
async function loadContactAvatar(avatarPath) {
  // 如果路径是相对路径（来自文件系统存储），则构建完整路径
  if (avatarPath && avatarPath.startsWith('UserData/')) {
    return await getUserDataPath(avatarPath);
  }
  // 如果是默认或其他路径，直接返回
  return avatarPath || 'images/app-icon.png';
}

async function getCurrentContactAvatar() {
  const chatHeader = document.querySelector('.chat-header');
  const contactId = chatHeader ? chatHeader.getAttribute('data-contact-id') : null;
  
  if (contactId) {
    const contact = contacts.find(c => c.id === contactId);
    if (contact && contact.avatar) {
      return await loadContactAvatar(contact.avatar);
    }
    return 'images/app-icon.png';
  }
  
  return 'images/app-icon.png';
}

// 清理聊天消息
function clearChatMessages() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  
  // 移除所有消息，但保留无联系人提示（如果存在）
  const messages = chatMessages.querySelectorAll('.message');
  const noContactPrompt = document.getElementById('no-contact-chat-prompt');
  
  messages.forEach(msg => {
    if (msg !== noContactPrompt) {
      msg.remove();
    }
  });
  
  // 清理聊天头部信息
  const chatHeader = document.querySelector('.chat-header');
  if (chatHeader) {
    chatHeader.removeAttribute('data-contact-id');
    chatHeader.removeAttribute('data-contact-name');
  }
  
  const chatName = document.querySelector('.chat-name');
  const chatStatus = document.querySelector('.chat-status');
  const chatAvatar = document.querySelector('.chat-avatar img');
  
  if (chatName) chatName.textContent = '选择联系人';
  if (chatStatus) chatStatus.textContent = '请先选择联系人';
  if (chatAvatar) chatAvatar.src = 'images/app-icon.png';
  
  // 重置输入框状态
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const chatInputArea = document.querySelector('.chat-input-area');
  
  if (messageInput) {
    messageInput.value = '';
    messageInput.disabled = true;
    messageInput.placeholder = '请先选择联系人才能发送消息...';
  }
  
  if (sendBtn) {
    sendBtn.disabled = true;
  }
  
  if (chatInputArea) {
    chatInputArea.classList.add('disabled');
  }
  
  // 清理当前聊天历史记录
  currentChatHistory = [];
  
  // 如果有无联系人提示，确保它显示
  if (noContactPrompt) {
    noContactPrompt.style.display = 'flex';
  }
}