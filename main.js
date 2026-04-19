/**
 * Copyright (C) 2026 BlackHoleEra-Team All Rights Reserved
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use of this software is strictly prohibited.
 */

const { app, BrowserWindow, BrowserView, ipcMain, Menu, Tray, nativeImage, Notification, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')

// 设置应用名称（用于通知等场景）
app.name = '无界'

// 设置应用用户模型 ID（Windows 通知显示正确标题）
if (process.platform === 'win32') {
  app.setAppUserModelId('team.bhe.wujie')
}

// 加密配置 - 使用固定密钥
const ENCRYPTION_KEY = crypto.scryptSync('Bhe-wujie-desktop-1024BlackHole', 'wujie-salt', 32);
const ENCRYPTION_IV = Buffer.alloc(16, 0);

// 系统托盘实例
let tray = null
let mainWindow = null
let trayWindow = null
let trayWindowVisible = false
let browserWindow = null // 内置浏览器窗口

// 协议处理相关
let protocolUrl = null // 存储通过协议传入的 URL

// 请求单实例锁（处理协议启动）
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // 如果获取锁失败，说明已有实例在运行，退出当前实例
  app.quit()
} else {
  // 监听第二个实例启动（通过协议打开时）
  app.on('second-instance', (event, argv) => {
    // Windows 下通过协议打开时，URL 会作为参数传入
    const url = argv.find(arg => arg.startsWith('wujie://'))
    if (url) {
      handleProtocolUrl(url)
    }
    
    // 聚焦到主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

/**
 * 处理自定义协议 URL
 * @param {string} url - 协议 URL，如 wujie://chat?action=openChat&contactId=xxx
 */
function handleProtocolUrl(url) {
  console.log('接收到协议 URL:', url)
  
  if (!mainWindow) {
    // 如果主窗口还未创建，先存储 URL
    protocolUrl = url
    return
  }
  
  // 发送给渲染进程处理
  mainWindow.webContents.send('protocol-url', url)
}

// macOS 下处理协议打开
app.on('open-url', (event, url) => {
  if (url.startsWith('wujie://')) {
    event.preventDefault()
    handleProtocolUrl(url)
  }
})

// 通知相关
let lastMessageContact = null
let hasNewMessageWhileHidden = false




// 配置缓存目录，避免权限问题
const userDataPath = app.getPath('userData')
const cachePath = path.join(userDataPath, 'cache')

// 确保缓存目录存在
try {
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true })
  }
} catch (error) {
  console.warn('无法创建缓存目录:', error)
}

const createWindow = () => {
  // 如果窗口已存在，直接显示
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }
  
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    frame: false, // 移除原生标题栏
    titleBarStyle: 'hidden', // 隐藏标题栏样式
    icon: path.join(__dirname, 'images', 'WuJieAiChat.png'), // 设置任务栏图标
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      enableRemoteModule: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // 配置缓存目录
      partition: 'persist:main',
      // 禁用GPU缓存以避免相关错误
      additionalArguments: ['--disable-gpu-disk-cache', '--disable-gpu-shader-disk-cache']
    },
    // 禁用硬件加速以避免GPU缓存错误
    webSecurity: true,
    // 配置缓存路径
    partition: 'persist:main',
    // 关闭时最小化到托盘
    show: false
  })

  mainWindow.loadFile('index.html')
  
  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
  
  // 窗口显示时重置通知状态
  mainWindow.on('show', () => {
    hasNewMessageWhileHidden = false
    lastMessageContact = null
  })

  // 设置缩放限制
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(1.0)
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1)
  })

  // 创建自定义菜单，移除缩放选项
  const template = [
    {
      label: '查看',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom', visible: false }, // 隐藏重置缩放
        { role: 'zoomIn', visible: false },    // 隐藏放大
        { role: 'zoomOut', visible: false },  // 隐藏缩小
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]
  
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // 处理窗口控制事件
  ipcMain.on('minimize-window', () => {
    mainWindow.minimize()
  })

  ipcMain.on('maximize-window', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.on('close-window', () => {
    mainWindow.hide()
  })
  
  // 处理窗口关闭事件 - 最小化到托盘而不是退出
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault()
      mainWindow.hide()
    }
    return false
  })
  
  // 拦截新窗口打开请求 - 使用内置浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    createBrowserWindow(url)
    return { action: 'deny' }
  })

  // 拦截导航请求
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // 只允许导航到本地文件
    if (!url.startsWith('file://')) {
      event.preventDefault()
      createBrowserWindow(url)
    }
  })

  return mainWindow
}

// 浏览器窗口管理器 - 支持多标签页
class BrowserWindowManager {
  constructor() {
    // 存储窗口实例: Map<windowId, {browserWindow, tabs, activeTabId, downloads}>
    this.windows = new Map()
    // 存储所有进行中的下载项: Map<downloadId, {item, windowId}>
    this.activeDownloads = new Map()
    this.titleBarHeight = 40
    this.progressBarHeight = 2
    this.tabBarHeight = 36 // 标签栏高度
  }

  // 生成唯一ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  // 安全发送消息到渲染进程
  safeSend(window, channel, ...args) {
    try {
      if (window && !window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
        window.webContents.send(channel, ...args)
        return true
      }
    } catch (error) {
      console.error(`发送消息失败 [${channel}]:`, error.message)
    }
    return false
  }

  // 安全设置 BrowserView 边界
  safeSetBounds(browserView, bounds) {
    try {
      if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
        browserView.setBounds(bounds)
        return true
      }
    } catch (error) {
      console.error('设置 BrowserView 边界失败:', error.message)
    }
    return false
  }

  // 创建浏览器窗口
  create(url) {
    const windowId = this.generateId()

    const browserWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      titleBarStyle: 'hidden',
      icon: path.join(__dirname, 'images', 'WuJieAiChat.png'),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: false,
        webSecurity: false,
        allowRunningInsecureContent: true
      },
      show: false
    })

    // 先存储窗口实例（不包含标签页）
    this.windows.set(windowId, {
      browserWindow,
      tabs: new Map(),
      activeTabId: null,
      downloads: new Map()
    })

    // 创建第一个标签页
    const firstTab = this.createTab(windowId, url)

    // 更新窗口的活动标签页
    const win = this.windows.get(windowId)
    win.activeTabId = firstTab.tabId

    // 设置 BrowserView
    browserWindow.setBrowserView(firstTab.browserView)
    this.updateBrowserViewBounds(windowId)

    // 绑定事件
    this.bindWindowEvents(windowId)

    // 加载外壳页面
    browserWindow.loadFile('browser.html')
    browserWindow.webContents.on('did-finish-load', () => {
      // 发送初始标签页信息
      this.safeSend(browserWindow, 'tabs-updated', {
        tabs: this.getTabsData(windowId),
        activeTabId: firstTab.tabId
      })
      browserWindow.show()
    })

    return browserWindow
  }

  // 创建新标签页
  createTab(windowId, url, title = '新标签页') {
    const tabId = this.generateId()

    const browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true
      }
    })

    const tab = {
      tabId,
      browserView,
      url,
      title,
      favicon: null,
      isLoading: false
    }

    // 先存储到 windows 中，这样 bindTabEvents 可以访问
    const win = this.windows.get(windowId)
    if (win) {
      win.tabs.set(tabId, tab)
    }

    // 绑定标签页事件（必须在加载URL之前设置 setWindowOpenHandler）
    this.bindTabEvents(windowId, tabId)

    // 加载URL
    if (url) {
      browserView.webContents.loadURL(url)
    }

    return tab
  }

  // 绑定标签页事件
  bindTabEvents(windowId, tabId) {
    const win = this.windows.get(windowId)
    if (!win) {
      console.error('绑定事件失败：窗口不存在', windowId)
      return
    }

    const tab = win.tabs.get(tabId)
    if (!tab) {
      console.error('绑定事件失败：标签页不存在', tabId)
      return
    }

    const { browserWindow } = win
    const { browserView } = tab

    // 页面标题更新
    browserView.webContents.on('page-title-updated', (event, title) => {
      console.log('页面标题更新:', tabId, title)
      tab.title = title
      this.safeSend(browserWindow, 'tab-title-updated', { tabId, title })
      
      // 如果是当前活动标签页，也更新窗口标题
      if (win.activeTabId === tabId) {
        this.safeSend(browserWindow, 'page-title-updated', title)
      }
    })

    // favicon 更新
    browserView.webContents.on('page-favicon-updated', (event, favicons) => {
      console.log('favicon 更新:', tabId, favicons)
      if (favicons && favicons.length > 0) {
        tab.favicon = favicons[0]
        this.safeSend(browserWindow, 'tab-favicon-updated', { tabId, favicon: favicons[0] })
        
        // 如果是当前活动标签页，也更新窗口favicon
        if (win.activeTabId === tabId) {
          this.safeSend(browserWindow, 'page-favicon-updated', favicons[0])
        }
      }
    })

    // 加载状态
    browserView.webContents.on('did-start-loading', () => {
      console.log('开始加载:', tabId)
      tab.isLoading = true
      if (win.activeTabId === tabId) {
        this.safeSend(browserWindow, 'loading-started')
      }
    })

    browserView.webContents.on('did-stop-loading', () => {
      console.log('停止加载:', tabId)
      tab.isLoading = false
      if (win.activeTabId === tabId) {
        this.safeSend(browserWindow, 'loading-stopped')
      }
    })

    // 导航事件
    browserView.webContents.on('did-navigate', (event, newUrl) => {
      console.log('导航:', tabId, newUrl)
      tab.url = newUrl
      if (win.activeTabId === tabId) {
        this.safeSend(browserWindow, 'did-navigate', newUrl)
      }
    })

    // 下载事件
    browserView.webContents.session.on('will-download', (event, item, webContents) => {
      this.handleDownload(windowId, item)
    })

    // 拦截新窗口打开请求（target="_blank"）- 在当前窗口打开新标签页
    browserView.webContents.setWindowOpenHandler((details) => {
      console.log('拦截到新窗口请求:', details.url, 'disposition:', details.disposition)
      
      // 在当前浏览器窗口打开新标签页
      this.openNewTab(windowId, details.url)
      
      // 阻止 Electron 创建新窗口
      return { action: 'deny' }
    })
  }

  // 打开新标签页
  openNewTab(windowId, url) {
    const win = this.windows.get(windowId)
    if (!win) {
      console.error('打开新标签页失败：窗口不存在', windowId)
      return null
    }

    console.log('打开新标签页:', url)
    const newTab = this.createTab(windowId, url)
    
    // 切换到新标签页
    this.switchTab(windowId, newTab.tabId)

    // 通知渲染进程更新标签页
    this.safeSend(win.browserWindow, 'tabs-updated', {
      tabs: this.getTabsData(windowId),
      activeTabId: newTab.tabId
    })

    return newTab
  }

  // 切换标签页
  switchTab(windowId, tabId) {
    const win = this.windows.get(windowId)
    if (!win) return false

    const tab = win.tabs.get(tabId)
    if (!tab) return false

    // 更新活动标签页
    win.activeTabId = tabId

    // 切换 BrowserView
    win.browserWindow.setBrowserView(tab.browserView)
    this.updateBrowserViewBounds(windowId)

    // 发送标签页切换事件
    this.safeSend(win.browserWindow, 'tab-switched', {
      tabId,
      title: tab.title,
      url: tab.url,
      favicon: tab.favicon,
      isLoading: tab.isLoading
    })

    return true
  }

  // 关闭标签页
  closeTab(windowId, tabId) {
    const win = this.windows.get(windowId)
    if (!win) return false

    const tab = win.tabs.get(tabId)
    if (!tab) return false

    // 销毁 BrowserView
    try {
      if (tab.browserView && tab.browserView.webContents) {
        tab.browserView.webContents.destroy()
      }
    } catch (error) {
      console.error('销毁标签页失败:', error.message)
    }

    // 从 Map 中移除
    win.tabs.delete(tabId)

    // 如果关闭的是当前活动标签页，切换到另一个
    if (win.activeTabId === tabId && win.tabs.size > 0) {
      const nextTabId = win.tabs.keys().next().value
      this.switchTab(windowId, nextTabId)
    }

    // 通知渲染进程
    this.safeSend(win.browserWindow, 'tabs-updated', {
      tabs: this.getTabsData(windowId),
      activeTabId: win.activeTabId
    })

    return true
  }

  // 获取标签页数据（用于发送到渲染进程）
  getTabsData(windowId) {
    const win = this.windows.get(windowId)
    if (!win) return []

    return Array.from(win.tabs.values()).map(tab => ({
      tabId: tab.tabId,
      title: tab.title,
      url: tab.url,
      favicon: tab.favicon,
      isLoading: tab.isLoading,
      isActive: tab.tabId === win.activeTabId
    }))
  }

  // 更新 BrowserView 边界
  updateBrowserViewBounds(windowId, downloadPanelHeight = 0) {
    const win = this.windows.get(windowId)
    if (!win) return false

    const tab = win.tabs.get(win.activeTabId)
    if (!tab) return false

    try {
      const bounds = win.browserWindow.getBounds()
      return this.safeSetBounds(tab.browserView, {
        x: 0,
        y: this.titleBarHeight + this.tabBarHeight + this.progressBarHeight + downloadPanelHeight,
        width: bounds.width,
        height: bounds.height - this.titleBarHeight - this.tabBarHeight - this.progressBarHeight - downloadPanelHeight
      })
    } catch (error) {
      console.error('更新 BrowserView 边界失败:', error.message)
      return false
    }
  }

  // 绑定窗口事件
  bindWindowEvents(windowId) {
    const win = this.windows.get(windowId)
    if (!win) return

    const { browserWindow } = win

    // 窗口大小变化
    browserWindow.on('resize', () => {
      this.updateBrowserViewBounds(windowId)
    })

    // 窗口关闭
    browserWindow.on('closed', () => {
      this.cleanup(windowId)
    })
  }

  // 处理下载
  handleDownload(windowId, item) {
    const win = this.windows.get(windowId)
    if (!win) return

    const { browserWindow } = win
    const downloadId = this.generateId()
    const fileName = item.getFilename()
    const totalBytes = item.getTotalBytes()

    console.log('开始下载:', fileName, 'ID:', downloadId)

    // 存储下载项
    this.activeDownloads.set(downloadId, { item, windowId })
    win.downloads.set(downloadId, {
      downloadId,
      fileName,
      totalBytes,
      receivedBytes: 0,
      state: 'progressing'
    })

    // 发送开始事件
    this.safeSend(browserWindow, 'download-started', {
      downloadId,
      fileName,
      totalBytes
    })

    // 速度计算
    let lastReceivedBytes = 0
    let lastUpdateTime = Date.now()

    // 进度更新
    item.on('updated', (event, state) => {
      const receivedBytes = item.getReceivedBytes()
      const currentTime = Date.now()
      const timeDiff = (currentTime - lastUpdateTime) / 1000

      let speed = 0
      if (timeDiff > 0) {
        speed = Math.round((receivedBytes - lastReceivedBytes) / timeDiff)
        lastReceivedBytes = receivedBytes
        lastUpdateTime = currentTime
      }

      const progress = totalBytes > 0 ? (receivedBytes / totalBytes * 100).toFixed(1) : 0

      // 更新存储的数据
      const download = win.downloads.get(downloadId)
      if (download) {
        download.receivedBytes = receivedBytes
        download.speed = speed
      }

      this.safeSend(browserWindow, 'download-progress', {
        downloadId,
        fileName,
        progress,
        receivedBytes,
        totalBytes,
        speed,
        state
      })
    })

    // 下载完成
    item.on('done', (event, state) => {
      console.log('下载完成:', fileName, '状态:', state)

      this.activeDownloads.delete(downloadId)

      const download = win.downloads.get(downloadId)
      if (download) {
        download.state = state
        download.savePath = item.getSavePath()
      }

      this.safeSend(browserWindow, 'download-completed', {
        downloadId,
        fileName,
        state,
        savePath: item.getSavePath()
      })
    })

    // 设置保存路径
    try {
      const downloadPath = path.join(app.getPath('downloads'), fileName)
      item.setSavePath(downloadPath)
    } catch (error) {
      console.error('设置下载路径失败:', error.message)
    }
  }

  // 取消下载
  cancelDownload(downloadId) {
    const downloadInfo = this.activeDownloads.get(downloadId)
    if (!downloadInfo) return false

    const { item } = downloadInfo
    try {
      console.log('取消下载:', downloadId)
      item.cancel()
      this.activeDownloads.delete(downloadId)
      return true
    } catch (error) {
      console.error('取消下载失败:', error.message)
      return false
    }
  }

  // 调整下载面板
  adjustDownloadPanel(windowId, isVisible, itemCount) {
    const height = isVisible ? Math.min(300, Math.max(100, (itemCount || 1) * 60 + 50)) : 0
    return this.updateBrowserViewBounds(windowId, height)
  }

  // 清理窗口
  cleanup(windowId) {
    const win = this.windows.get(windowId)
    if (!win) return

    // 清理所有标签页
    for (const [tabId, tab] of win.tabs.entries()) {
      try {
        if (tab.browserView && tab.browserView.webContents) {
          tab.browserView.webContents.destroy()
        }
      } catch (error) {
        console.error('销毁标签页失败:', error.message)
      }
    }

    // 清理相关下载
    for (const [downloadId, info] of this.activeDownloads.entries()) {
      if (info.windowId === windowId) {
        try {
          if (info.item && !info.item.isDestroyed) {
            info.item.cancel()
          }
        } catch (e) {
          // 忽略错误
        }
        this.activeDownloads.delete(downloadId)
      }
    }

    this.windows.delete(windowId)
  }

  // 获取窗口实例
  getWindow(windowId) {
    return this.windows.get(windowId)
  }

  // 获取所有窗口
  getAllWindows() {
    return Array.from(this.windows.values())
  }
}

// 创建全局浏览器窗口管理器
const browserManager = new BrowserWindowManager()

// 创建内置浏览器窗口（兼容原有接口）
function createBrowserWindow(url) {
  return browserManager.create(url)
}

// 注册 IPC 处理器
ipcMain.on('cancel-download', (event, downloadId) => {
  browserManager.cancelDownload(downloadId)
})

ipcMain.on('download-panel-toggled', (event, isVisible, itemCount) => {
  // 找到发送消息的窗口
  const sender = event.sender
  for (const [windowId, win] of browserManager.windows.entries()) {
    if (win.browserWindow.webContents === sender) {
      browserManager.adjustDownloadPanel(windowId, isVisible, itemCount)
      break
    }
  }
})

// 标签页相关 IPC
ipcMain.on('switch-tab', (event, tabId) => {
  const sender = event.sender
  for (const [windowId, win] of browserManager.windows.entries()) {
    if (win.browserWindow.webContents === sender) {
      browserManager.switchTab(windowId, tabId)
      break
    }
  }
})

ipcMain.on('close-tab', (event, tabId) => {
  const sender = event.sender
  for (const [windowId, win] of browserManager.windows.entries()) {
    if (win.browserWindow.webContents === sender) {
      browserManager.closeTab(windowId, tabId)
      break
    }
  }
})

// 配置应用启动参数，避免缓存错误
app.commandLine.appendSwitch('disable-gpu-disk-cache')
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('disk-cache-dir', cachePath)
app.commandLine.appendSwitch('aggressive-cache-discard');

// 创建托盘弹出窗口
function createTrayWindow() {
  if (trayWindow) {
    return trayWindow
  }
  
  trayWindow = new BrowserWindow({
    width: 140,
    height: 90,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    transparent: true,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  
  trayWindow.loadFile('tray-popup.html')
  
  // 窗口失去焦点时隐藏
  trayWindow.on('blur', () => {
    hideTrayWindow()
  })
  
  // 窗口关闭时清理
  trayWindow.on('closed', () => {
    trayWindow = null
    trayWindowVisible = false
  })
  
  return trayWindow
}

// 显示托盘窗口
async function showTrayWindow(mousePosition = null) {
  // 如果窗口不存在，先创建
  if (!trayWindow) {
    createTrayWindow()
    // 等待窗口加载完成
    await new Promise(resolve => {
      trayWindow.once('ready-to-show', resolve)
    })
  }
  
  if (!tray || !trayWindow) return
  
  // 从主窗口获取当前主题
  let currentTheme = 'light'
  if (mainWindow) {
    try {
      currentTheme = await mainWindow.webContents.executeJavaScript(
        `localStorage.getItem('appTheme') || 'light'`
      )
    } catch (e) {
      console.log('获取主题失败:', e)
    }
  }
  
  // 发送主题到托盘窗口
  if (trayWindow) {
    trayWindow.webContents.send('theme-changed', currentTheme)
  }
  
  const windowBounds = trayWindow.getBounds()
  
  let x, y
  
  if (mousePosition) {
    // 使用鼠标位置，窗口显示在鼠标左上方
    x = Math.round(mousePosition.x - windowBounds.width / 2)
    y = Math.round(mousePosition.y - windowBounds.height - 5)
  } else {
    // 使用托盘图标位置
    const trayBounds = tray.getBounds()
    x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2))
    y = Math.round(trayBounds.y - windowBounds.height - 8)
  }
  
  // 确保窗口不超出屏幕边界
  const screen = require('electron').screen
  const display = screen.getPrimaryDisplay()
  const workArea = display.workArea
  
  if (x < workArea.x) {
    x = workArea.x + 4
  } else if (x + windowBounds.width > workArea.x + workArea.width) {
    x = workArea.x + workArea.width - windowBounds.width - 4
  }
  
  if (y < workArea.y) {
    // 如果上方空间不足，显示在鼠标下方
    y = mousePosition ? Math.round(mousePosition.y + 10) : Math.round(trayBounds.y + trayBounds.height + 8)
  }
  
  // 先设置位置，再显示窗口（避免闪烁）
  trayWindow.setPosition(x, y)
  trayWindow.show()
  trayWindowVisible = true
}

// 隐藏托盘窗口
function hideTrayWindow() {
  if (trayWindow && trayWindowVisible) {
    trayWindow.hide()
    trayWindowVisible = false
  }
}

// 切换托盘窗口显示/隐藏
function toggleTrayWindow(mousePosition = null) {
  if (trayWindowVisible) {
    hideTrayWindow()
  } else {
    showTrayWindow(mousePosition)
  }
}

// 创建系统托盘
function createTray() {
  // 使用应用图标作为托盘图标
  const iconPath = path.join(__dirname, 'images', 'WuJieAiChat.png')

  // 创建托盘图标
  let trayIcon
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    // 使用 32x32 尺寸，Windows 会自动处理缩放，比 16x16 更清晰
    if (process.platform === 'win32') {
      trayIcon = trayIcon.resize({ width: 32, height: 32, quality: 'good' })
    }
  } catch (error) {
    console.error('创建托盘图标失败:', error)
    // 使用默认空图标
    trayIcon = nativeImage.createEmpty()
  }
  
  tray = new Tray(trayIcon)
  
  // 设置托盘提示
  tray.setToolTip('无界')
  
  // 右键点击显示自定义菜单
  tray.on('right-click', (event, bounds) => {
    // 获取鼠标位置
    const mousePosition = require('electron').screen.getCursorScreenPoint()
    toggleTrayWindow(mousePosition)
  })
  
  // 点击托盘图标显示/隐藏主窗口
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    } else {
      createWindow()
    }
  })
  
  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
}

// 托盘窗口 IPC 通信
ipcMain.on('tray-show-window', () => {
  hideTrayWindow()
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
})

ipcMain.on('tray-quit', () => {
  app.isQuiting = true
  app.quit()
})

// 获取应用主题设置
ipcMain.handle('get-app-theme', async () => {
  // 尝试从主窗口的 localStorage 读取主题设置
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      const theme = await mainWindow.webContents.executeJavaScript(
        `localStorage.getItem('appTheme') || 'light'`
      )
      return theme
    } catch (error) {
      console.log('获取主题失败:', error)
    }
  }
  return 'light'
})

// 显示 Windows 通知
function showNotification(title, body, icon = null) {
  // 检查通知权限
  if (!Notification.isSupported()) {
    console.log('系统不支持通知')
    return
  }
  
  const notification = new Notification({
    title: title,
    body: body,
    icon: icon || path.join(__dirname, 'images', 'app-icon.png'),
    silent: false
  })
  
  notification.on('click', () => {
    // 点击通知时显示主窗口
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      // 如果有特定联系人，可以切换到该联系人
      if (lastMessageContact) {
        mainWindow.webContents.send('switch-to-contact', lastMessageContact)
      }
    } else {
      createWindow()
    }
  })
  
  notification.show()
}

// 处理 AI 消息通知
ipcMain.on('ai-message-received', (event, data) => {
  const { contactName, message, contactId, contactAvatar } = data
  
  // 保存最后消息的联系人
  lastMessageContact = contactId
  
  // 如果窗口不可见，显示通知
  if (mainWindow && !mainWindow.isVisible()) {
    hasNewMessageWhileHidden = true
    
    // 截断消息内容
    const truncatedMessage = message.length > 50 
      ? message.substring(0, 50) + '...' 
      : message
    
    // 使用联系人头像作为通知图标
    let notificationIcon = null
    if (contactAvatar) {
      // 处理头像路径
      let avatarPath = contactAvatar
      
      // 处理 file:// 协议路径
      if (avatarPath.startsWith('file://')) {
        avatarPath = avatarPath.replace('file://', '')
        // 处理 Windows 路径 file:///C:/xxx -> C:/xxx
        if (avatarPath.startsWith('/')) {
          avatarPath = avatarPath.substring(1)
        }
      } else if (avatarPath.startsWith('UserData/')) {
        // 转换为实际文件路径: UserData/imgs/Contact/xxx.png -> userDataPath/imgs/Contact/xxx.png
        avatarPath = path.join(userDataDirs.userDataPath, avatarPath.substring(9)) // 移除 'UserData/' 前缀
      } else if (avatarPath.startsWith('custom://')) {
        avatarPath = avatarPath.replace('custom://', '')
      } else if (!path.isAbsolute(avatarPath)) {
        // 其他相对路径，从应用目录开始
        avatarPath = path.join(__dirname, avatarPath)
      }
      
      console.log('通知头像路径:', avatarPath)
      
      if (fs.existsSync(avatarPath)) {
        notificationIcon = avatarPath
      } else {
        console.log('头像文件不存在，使用默认图标')
        notificationIcon = path.join(__dirname, 'images', 'WuJieAiChat.png')
      }
    } else {
      notificationIcon = path.join(__dirname, 'images', 'WuJieAiChat.png')
    }
    
    showNotification(
      `${contactName} 发来新消息`,
      truncatedMessage,
      notificationIcon
    )
  }
})

// 窗口显示时重置通知标记
ipcMain.on('window-shown', () => {
  hasNewMessageWhileHidden = false
  lastMessageContact = null
})

// 通过协议打开主窗口
ipcMain.on('open-main-window', () => {
  if (mainWindow) {
    // 如果窗口已最小化，恢复它
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    // 显示窗口并聚焦
    mainWindow.show()
    mainWindow.focus()
    console.log('通过协议打开/聚焦主窗口')
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  
  // 处理通过协议传入的 URL（应用在关闭时通过协议打开）
  if (protocolUrl) {
    handleProtocolUrl(protocolUrl)
    protocolUrl = null
  }
  
  // 在 macOS 上，当没有窗口打开时，通常在单击 dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 创建用户数据目录
function createUserDataDir() {
  const documentsPath = path.join(os.homedir(), 'Documents', 'WuJie');
  const userDataPath = path.join(documentsPath, 'UserData');
  const msgPath = path.join(userDataPath, 'msg');
  const contactConfigPath = path.join(userDataPath, 'ContactConfig');
  const imgsPath = path.join(userDataPath, 'imgs');
  const userImgsPath = path.join(imgsPath, 'User');
  const contactImgsPath = path.join(imgsPath, 'Contact');
  const longTermMemoryPath = path.join(userDataPath, 'long-term-memories');

  // 创建目录结构
  const dirsToCreate = [documentsPath, userDataPath, msgPath, contactConfigPath, imgsPath, userImgsPath, contactImgsPath, longTermMemoryPath];

  dirsToCreate.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  return {
    userDataPath,
    msgPath,
    contactConfigPath,
    userImgsPath,
    contactImgsPath,
    longTermMemoryPath
  };
}

// 初始化用户数据目录
const userDataDirs = createUserDataDir();

// IPC通信处理
ipcMain.handle('get-user-data-dirs', (event) => {
  return userDataDirs;
});

ipcMain.handle('save-chat-history', async (event, contactId, messages) => {
  try {
    const fileName = `${contactId}.wjm`;
    const filePath = path.join(userDataDirs.msgPath, fileName);
    
    // 将消息转换为JSON字符串
    let jsonString = JSON.stringify(messages);
    
    // 使用AES-256-CBC加密
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, ENCRYPTION_IV);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    await fs.promises.writeFile(filePath, encrypted, 'utf8');
    return { success: true, filePath };
  } catch (error) {
    console.error('保存聊天历史失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-chat-history', async (event, contactId) => {
  try {
    const fileName = `${contactId}.wjm`;
    const filePath = path.join(userDataDirs.msgPath, fileName);
    
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    let encrypted = await fs.promises.readFile(filePath, 'utf8');
    
    // 使用AES-256-CBC解密
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, ENCRYPTION_IV);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const messages = JSON.parse(decrypted);
    
    return messages;
  } catch (error) {
    console.error('加载聊天历史失败:', error);
    return [];
  }
});

ipcMain.handle('save-contact-config', async (event, contactId, config) => {
  try {
    const fileName = `${contactId}.json`; // 使用JSON格式存储配置
    const filePath = path.join(userDataDirs.contactConfigPath, fileName);
    
    await fs.promises.writeFile(filePath, JSON.stringify(config, null, 2), 'utf8');
    return { success: true, filePath };
  } catch (error) {
    console.error('保存联系人配置失败:', error);
    return { success: false, error: error.message };
  }
});

// 删除联系人配置
ipcMain.handle('delete-contact-config', async (event, contactId) => {
  try {
    const fileName = `${contactId}.json`;
    const filePath = path.join(userDataDirs.contactConfigPath, fileName);
    
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log(`删除联系人配置成功: ${contactId}`);
    }
    
    // 同时删除该联系人的聊天记录
    const msgFileName = `${contactId}.wjm`;
    const msgFilePath = path.join(userDataDirs.msgPath, msgFileName);
    
    if (fs.existsSync(msgFilePath)) {
      await fs.promises.unlink(msgFilePath);
      console.log(`删除联系人聊天记录成功: ${contactId}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('删除联系人配置失败:', error);
    return { success: false, error: error.message };
  }
});

// 删除所有联系人配置
ipcMain.handle('delete-all-contact-configs', async (event) => {
  try {
    const userDataDirs = createUserDataDir();
    
    // 删除所有联系人配置文件
    if (fs.existsSync(userDataDirs.contactConfigPath)) {
      const configFiles = await fs.promises.readdir(userDataDirs.contactConfigPath);
      for (const file of configFiles) {
        if (file.endsWith('.json')) {
          await fs.promises.unlink(path.join(userDataDirs.contactConfigPath, file));
        }
      }
    }
    
    // 删除所有聊天记录文件
    if (fs.existsSync(userDataDirs.msgPath)) {
      const msgFiles = await fs.promises.readdir(userDataDirs.msgPath);
      for (const file of msgFiles) {
        if (file.endsWith('.wjm')) {
          await fs.promises.unlink(path.join(userDataDirs.msgPath, file));
        }
      }
    }
    
    console.log('删除所有联系人数据和聊天记录成功');
    return { success: true };
  } catch (error) {
    console.error('删除所有联系人配置失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-contact-config', async (event, contactId) => {
  try {
    const fileName = `${contactId}.json`;
    const filePath = path.join(userDataDirs.contactConfigPath, fileName);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const content = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('加载联系人配置失败:', error);
    return null;
  }
});

ipcMain.handle('save-image', async (event, imageBase64, targetDir, imageName) => {
  try {
    const imagePath = path.join(targetDir, imageName);
    
    // 解码base64图像数据
    const base64Data = imageBase64.replace(/^data:image\/png;base64,|^data:image\/jpg;base64,|^data:image\/jpeg;base64,|^data:image\/gif;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    await fs.promises.writeFile(imagePath, imageBuffer);
    return { success: true, imagePath };
  } catch (error) {
    console.error('保存图像失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('copy-file', async (event, sourcePath, targetPath) => {
  try {
    await fs.promises.copyFile(sourcePath, targetPath);
    return { success: true, targetPath };
  } catch (error) {
    console.error('复制文件失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-all-contact-configs', async (event) => {
  try {
    const userDataDirs = createUserDataDir(); // 确保目录存在
    const contactConfigPath = userDataDirs.contactConfigPath;
    
    if (!fs.existsSync(contactConfigPath)) {
      return [];
    }
    
    const files = await fs.promises.readdir(contactConfigPath);
    const contactConfigs = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(contactConfigPath, file);
        const content = await fs.promises.readFile(filePath, 'utf8');
        try {
          const config = JSON.parse(content);
          contactConfigs.push(config);
        } catch (parseError) {
          console.error(`解析联系人配置失败: ${file}`, parseError);
        }
      }
    }
    
    return contactConfigs;
  } catch (error) {
    console.error('获取所有联系人配置失败:', error);
    return [];
  }
});

// 获取联系人列表（用于聊天记录管理页面）
ipcMain.handle('get-contacts', async (event) => {
  try {
    const userDataDirs = createUserDataDir();
    const contactConfigPath = userDataDirs.contactConfigPath;
    
    if (!fs.existsSync(contactConfigPath)) {
      return [];
    }
    
    const files = await fs.promises.readdir(contactConfigPath);
    const contactConfigs = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(contactConfigPath, file);
        const content = await fs.promises.readFile(filePath, 'utf8');
        try {
          const config = JSON.parse(content);
          contactConfigs.push(config);
        } catch (parseError) {
          console.error(`解析联系人配置失败: ${file}`, parseError);
        }
      }
    }
    
    return contactConfigs;
  } catch (error) {
    console.error('获取联系人列表失败:', error);
    return [];
  }
});

// 获取用户数据（用于聊天记录管理页面）
ipcMain.handle('get-user-data', async (event) => {
  try {
    const userDataDirs = createUserDataDir();
    const userDataPath = path.join(userDataDirs.userDataPath, 'userData.json');
    
    if (!fs.existsSync(userDataPath)) {
      return { username: '我的', avatar: 'images/app-icon.png' };
    }
    
    const content = await fs.promises.readFile(userDataPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('获取用户数据失败:', error);
    return { username: '我的', avatar: 'images/app-icon.png' };
  }
});

// 保存用户数据（从主窗口同步到其他窗口）
ipcMain.handle('save-user-data', async (event, userData) => {
  try {
    const userDataDirs = createUserDataDir();
    const userDataPath = path.join(userDataDirs.userDataPath, 'userData.json');
    
    await fs.promises.writeFile(userDataPath, JSON.stringify(userData, null, 2), 'utf8');
    console.log('用户数据已保存到文件:', userDataPath);
    return { success: true };
  } catch (error) {
    console.error('保存用户数据失败:', error);
    return { success: false, error: error.message };
  }
});

// 清空聊天记录
ipcMain.handle('clear-chat-history', async (event, contactId) => {
  try {
    const fileName = `${contactId}.wjm`;
    const filePath = path.join(userDataDirs.msgPath, fileName);
    
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log(`清空聊天记录成功: ${contactId}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('清空聊天记录失败:', error);
    return { success: false, error: error.message };
  }
});

// 导出聊天记录
ipcMain.handle('export-chat-history', async (event, contactId, messages) => {
  try {
    const { dialog } = require('electron');
    
    const result = await dialog.showSaveDialog({
      title: '导出聊天记录',
      defaultPath: `chat_history_${contactId}_${Date.now()}.txt`,
      filters: [
        { name: '文本文件', extensions: ['txt'] },
        { name: 'JSON文件', extensions: ['json'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, error: '用户取消' };
    }
    
    const filePath = result.filePath;
    let content;
    
    if (filePath.endsWith('.json')) {
      content = JSON.stringify(messages, null, 2);
    } else {
      // 格式化为文本
      content = messages.map(msg => {
        const time = new Date(msg.timestamp).toLocaleString('zh-CN');
        const sender = msg.role === 'user' ? '用户' : 'AI';
        return `[${time}] ${sender}:\n${msg.content}\n`;
      }).join('\n---\n\n');
    }
    
    await fs.promises.writeFile(filePath, content, 'utf8');
    console.log(`导出聊天记录成功: ${filePath}`);
    
    return { success: true, filePath };
  } catch (error) {
    console.error('导出聊天记录失败:', error);
    return { success: false, error: error.message };
  }
});

// 长期记忆存储路径（使用 Documents/WuJie/UserData/long-term-memories）
const longTermMemoryPath = userDataDirs.longTermMemoryPath;

// 加密长期记忆数据
function encryptLongTermMemory(data) {
  const jsonString = JSON.stringify(data);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, ENCRYPTION_IV);
  let encrypted = cipher.update(jsonString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// 解密长期记忆数据
function decryptLongTermMemory(encryptedData) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, ENCRYPTION_IV);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// 添加到长期记忆（带AI总结，加密存储）
ipcMain.handle('add-long-term-memory', async (event, contactId, memoryData) => {
  try {
    const memoryFileName = `${contactId}_memories.json`;
    const memoryFilePath = path.join(longTermMemoryPath, memoryFileName);

    // 读取现有记忆
    let memories = [];
    if (fs.existsSync(memoryFilePath)) {
      const encryptedData = await fs.promises.readFile(memoryFilePath, 'utf8');
      memories = decryptLongTermMemory(encryptedData);
    }

    // 添加新记忆
    const newMemory = {
      id: Date.now(),
      contactId: contactId,
      summary: memoryData.summary,
      originalMessages: memoryData.originalMessages,
      createTime: new Date().toISOString()
    };

    memories.push(newMemory);

    // 加密并保存到文件
    const encrypted = encryptLongTermMemory(memories);
    await fs.promises.writeFile(memoryFilePath, encrypted, 'utf8');

    console.log(`添加长期记忆成功: ${contactId}, 记忆ID: ${newMemory.id}`);
    return { success: true, memory: newMemory };
  } catch (error) {
    console.error('添加长期记忆失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取长期记忆列表（解密读取）
ipcMain.handle('get-long-term-memories', async (event, contactId) => {
  try {
    const memoryFileName = `${contactId}_memories.json`;
    const memoryFilePath = path.join(longTermMemoryPath, memoryFileName);

    if (!fs.existsSync(memoryFilePath)) {
      return { success: true, memories: [] };
    }

    const encryptedData = await fs.promises.readFile(memoryFilePath, 'utf8');
    const memories = decryptLongTermMemory(encryptedData);

    return { success: true, memories: memories };
  } catch (error) {
    console.error('获取长期记忆失败:', error);
    return { success: false, error: error.message, memories: [] };
  }
});

// 删除长期记忆（加密保存）
ipcMain.handle('delete-long-term-memory', async (event, contactId, memoryId) => {
  try {
    const memoryFileName = `${contactId}_memories.json`;
    const memoryFilePath = path.join(longTermMemoryPath, memoryFileName);

    if (!fs.existsSync(memoryFilePath)) {
      return { success: false, error: '记忆文件不存在' };
    }

    const encryptedData = await fs.promises.readFile(memoryFilePath, 'utf8');
    let memories = decryptLongTermMemory(encryptedData);

    // 删除指定记忆
    memories = memories.filter(m => m.id !== memoryId);

    // 加密并保存回文件
    const encrypted = encryptLongTermMemory(memories);
    await fs.promises.writeFile(memoryFilePath, encrypted, 'utf8');

    console.log(`删除长期记忆成功: ${contactId}, 记忆ID: ${memoryId}`);
    return { success: true };
  } catch (error) {
    console.error('删除长期记忆失败:', error);
    return { success: false, error: error.message };
  }
});

// 聊天记录管理窗口实例
let chatHistoryWindow = null;

// 创建聊天记录管理窗口
function createChatHistoryWindow(contactId) {
  // 如果窗口已存在，聚焦并返回
  if (chatHistoryWindow && !chatHistoryWindow.isDestroyed()) {
    chatHistoryWindow.focus();
    return chatHistoryWindow;
  }

  chatHistoryWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    title: '聊天记录管理',
    icon: path.join(__dirname, 'images', 'WuJieAiChat.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false,
    show: false
  });

  // 加载页面，传递联系人ID
  chatHistoryWindow.loadFile('chat-history.html', {
    query: { contactId: contactId }
  });

  chatHistoryWindow.once('ready-to-show', () => {
    if (chatHistoryWindow && !chatHistoryWindow.isDestroyed()) {
      chatHistoryWindow.show();
    }
  });

  chatHistoryWindow.on('closed', () => {
    chatHistoryWindow = null;
  });

  return chatHistoryWindow;
}

// 打开聊天记录管理窗口的IPC处理
ipcMain.on('open-chat-history-window', (event, contactId) => {
  createChatHistoryWindow(contactId);
});

// 长期记忆管理窗口实例
let longTermMemoryWindow = null;

// 创建长期记忆管理窗口
function createLongTermMemoryWindow(contactId) {
  // 如果窗口已存在，聚焦并返回
  if (longTermMemoryWindow && !longTermMemoryWindow.isDestroyed()) {
    longTermMemoryWindow.focus();
    return longTermMemoryWindow;
  }

  longTermMemoryWindow = new BrowserWindow({
    width: 700,
    height: 600,
    minWidth: 500,
    minHeight: 400,
    title: '长期记忆管理',
    icon: path.join(__dirname, 'images', 'WuJieAiChat.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false,
    show: false
  });

  // 加载页面，传递联系人ID
  longTermMemoryWindow.loadFile('long-term-memory.html', {
    query: { contactId: contactId }
  });

  longTermMemoryWindow.once('ready-to-show', () => {
    if (longTermMemoryWindow && !longTermMemoryWindow.isDestroyed()) {
      longTermMemoryWindow.show();
    }
  });

  longTermMemoryWindow.on('closed', () => {
    longTermMemoryWindow = null;
  });

  return longTermMemoryWindow;
}

// 打开长期记忆管理窗口的IPC处理
ipcMain.on('open-long-term-memory-window', (event, contactId) => {
  createLongTermMemoryWindow(contactId);
});

// 聊天记录窗口控制
ipcMain.on('minimize-chat-history-window', () => {
  if (chatHistoryWindow) {
    chatHistoryWindow.minimize();
  }
});

ipcMain.on('close-chat-history-window', () => {
  if (chatHistoryWindow) {
    chatHistoryWindow.close();
  }
  // 关闭聊天记录窗口时同时关闭长期记忆窗口
  if (longTermMemoryWindow) {
    longTermMemoryWindow.close();
  }
});

// 长期记忆窗口控制
ipcMain.on('minimize-long-term-memory-window', () => {
  if (longTermMemoryWindow) {
    longTermMemoryWindow.minimize();
  }
});

ipcMain.on('close-long-term-memory-window', () => {
  if (longTermMemoryWindow) {
    longTermMemoryWindow.close();
  }
});

// 浏览器窗口控制
ipcMain.on('minimize-browser-window', (event) => {
  const sender = event.sender
  for (const [windowId, win] of browserManager.windows.entries()) {
    if (win.browserWindow.webContents === sender) {
      win.browserWindow.minimize()
      break
    }
  }
})

ipcMain.on('maximize-browser-window', (event) => {
  const sender = event.sender
  for (const [windowId, win] of browserManager.windows.entries()) {
    if (win.browserWindow.webContents === sender) {
      if (win.browserWindow.isMaximized()) {
        win.browserWindow.unmaximize()
      } else {
        win.browserWindow.maximize()
      }
      break
    }
  }
})

ipcMain.on('close-browser-window', (event) => {
  const sender = event.sender
  for (const [windowId, win] of browserManager.windows.entries()) {
    if (win.browserWindow.webContents === sender) {
      win.browserWindow.close()
      break
    }
  }
})

// 打开下载文件夹
ipcMain.on('open-downloads-folder', () => {
  shell.openPath(app.getPath('downloads'));
});

// 聊天记录更新通知 - 转发给主窗口
ipcMain.on('chat-history-updated', (event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('chat-history-updated', data);
  }
});

// 主题变化通知 - 转发给聊天记录窗口
ipcMain.on('theme-changed', (event, theme) => {
  if (chatHistoryWindow && !chatHistoryWindow.isDestroyed()) {
    chatHistoryWindow.webContents.send('theme-changed', theme);
  }
});

// ============================================
// 自动更新功能
// ============================================

const https = require('https')
const http = require('http')

// 更新下载状态
let updateDownloadItem = null
let updateFilePath = null

/**
 * 下载更新文件
 * @param {string} url - 下载链接
 * @param {string} version - 版本号
 * @returns {Promise<string>} - 下载文件路径
 */
function downloadUpdateFile(url, version) {
  return new Promise((resolve, reject) => {
    const downloadsPath = app.getPath('downloads')
    const fileName = `无界AI聊天-Update-v${version}.exe`
    const filePath = path.join(downloadsPath, fileName)

    // 如果文件已存在，先删除
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(filePath)

    const request = protocol.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadUpdateFile(response.headers.location, version)
          .then(resolve)
          .catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }

      const totalSize = parseInt(response.headers['content-length'], 10) || 0
      let downloadedSize = 0

      response.on('data', (chunk) => {
        downloadedSize += chunk.length
        file.write(chunk)

        // 发送进度给渲染进程
        if (totalSize > 0 && mainWindow) {
          const progress = (downloadedSize / totalSize) * 100
          mainWindow.webContents.send('update-download-progress', progress)
        }
      })

      response.on('end', () => {
        file.end()
        updateFilePath = filePath
        resolve(filePath)
      })

      response.on('error', (error) => {
        file.destroy()
        fs.unlinkSync(filePath)
        reject(error)
      })
    })

    request.on('error', (error) => {
      file.destroy()
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      reject(error)
    })

    // 设置超时
    request.setTimeout(300000, () => {
      request.destroy()
      file.destroy()
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      reject(new Error('下载超时'))
    })
  })
}

// 处理下载更新请求
ipcMain.on('download-update', async (event, { url, version }) => {
  try {
    console.log('开始下载更新:', url)
    const filePath = await downloadUpdateFile(url, version)
    console.log('更新下载完成:', filePath)
    
    // 通知渲染进程下载完成
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', filePath)
    }
  } catch (error) {
    console.error('下载更新失败:', error)
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message)
    }
  }
})

// 处理安装更新请求
ipcMain.on('install-update', (event) => {
  if (!updateFilePath || !fs.existsSync(updateFilePath)) {
    console.error('更新文件不存在')
    return
  }

  console.log('开始安装更新:', updateFilePath)

  // 使用 /UPDATE 参数启动安装程序，实现自动更新
  const { spawn } = require('child_process')
  const child = spawn(updateFilePath, ['/UPDATE'], {
    detached: true,
    stdio: 'ignore'
  })

  child.unref()

  // 退出当前应用
  app.quit()
})

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})