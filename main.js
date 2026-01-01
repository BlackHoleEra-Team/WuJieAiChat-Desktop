const { app, BrowserWindow, ipcMain, Menu } = require('electron')




const createWindow = () => {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    frame: false, // 移除原生标题栏
    titleBarStyle: 'hidden', // 隐藏标题栏样式
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      enableRemoteModule: true,
      webSecurity: false
    },

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