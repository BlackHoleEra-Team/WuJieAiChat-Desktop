const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const fs = require('fs')




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
  
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    frame: false, // 移除原生标题栏
    titleBarStyle: 'hidden', // 隐藏标题栏样式
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
    partition: 'persist:main'
  })

  win.loadFile('index.html')

  // 设置缩放限制
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(1.0)
    win.webContents.setVisualZoomLevelLimits(1, 1)
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
    win.minimize()
  })

  ipcMain.on('maximize-window', () => {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on('close-window', () => {
    win.close()
  })
}

// 配置应用启动参数，避免缓存错误
app.commandLine.appendSwitch('disable-gpu-disk-cache')
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('disk-cache-dir', cachePath)
app.commandLine.appendSwitch('aggressive-cache-discard')

app.whenReady().then(() => {
  createWindow()
  
  // 在 macOS 上，当没有窗口打开时，通常在单击 dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})