const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')




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
app.commandLine.appendSwitch('aggressive-cache-discard');

app.whenReady().then(() => {
  createWindow()
  
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
  
  // 创建目录结构
  const dirsToCreate = [documentsPath, userDataPath, msgPath, contactConfigPath, imgsPath, userImgsPath, contactImgsPath];
  
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
    contactImgsPath
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
    
    // 简单加密：将消息转换为JSON字符串，然后进行字符变换
    let jsonString = JSON.stringify(messages);
    // 使用简单的字符偏移加密
    let encrypted = '';
    for (let i = 0; i < jsonString.length; i++) {
      encrypted += String.fromCharCode(jsonString.charCodeAt(i) + 10);
    }
    
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
    
    // 解密：将字符偏移还原
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(encrypted.charCodeAt(i) - 10);
    }
    
    return JSON.parse(decrypted);
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

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})