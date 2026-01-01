const { ipcRenderer } = require('electron')

// 引入 jQuery 和 Cropper.js
const $ = require('jquery')
const Cropper = require('cropperjs')

// 获取窗口控制按钮和图标
const minimizeBtn = document.getElementById('minimizeBtn')
const maximizeBtn = document.getElementById('maximizeBtn')
const closeBtn = document.getElementById('closeBtn')
const titleBar = document.getElementById('titleBar')
const appIcon = document.getElementById('appIcon')

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
titleBar.addEventListener('mouseenter', () => {
  titleBar.style.background = 'rgba(235, 235, 235, 0.9)'
  titleBar.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)'
  document.querySelector('.main-content').style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.12)'
})

titleBar.addEventListener('mouseleave', () => {
  titleBar.style.background = 'rgba(240, 240, 240, 0.85)'
  titleBar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
  document.querySelector('.main-content').style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)'
})

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
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab')
      switchTab(targetTab)
    })
    
    // 添加标签页悬停音效（可选）
    tab.addEventListener('mouseenter', playHoverSound)
  })
  
  function switchTab(targetTab) {
    // 移除所有标签页的激活状态
    sidebarTabs.forEach(tab => {
      tab.classList.remove('active')
    })
    
    // 隐藏所有内容区域
    contentAreas.forEach(area => {
      area.style.display = 'none'
    })
    
    // 激活目标标签页
    const activeTab = document.querySelector(`[data-tab="${targetTab}"]`)
    if (activeTab) {
      activeTab.classList.add('active')
    }
    
    // 显示目标内容区域
    const activeContent = document.getElementById(`${targetTab}-content`)
    if (activeContent) {
      activeContent.style.display = 'block'
      
      // 添加淡入动画
      activeContent.style.opacity = '0'
      activeContent.style.transform = 'translateY(10px)'
      
      setTimeout(() => {
        activeContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
        activeContent.style.opacity = '1'
        activeContent.style.transform = 'translateY(0)'
      }, 10)
    }
    
    // 更新窗口标题
    const tabNames = {
      'chat': '聊天',
      'contacts': '联系人',
      'profile': '我的',
      'settings': '设置'
    }
    document.title = `无界AI聊天 - ${tabNames[targetTab] || '聊天'}`
  }
  
  // 默认激活聊天标签页
  switchTab('chat')
}

// 初始化侧边栏标签功能
document.addEventListener('DOMContentLoaded', () => {
  initSidebarTabs()
  initProfilePage()
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
      alert('请选择有效的图片文件（JPG、PNG、GIF、BMP、WebP、SVG等格式）！')
      return
    }
    
    // 检查文件大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.warn('文件过大:', file.size, 'bytes')
      alert('图片文件过大，请选择小于10MB的图片！')
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
          alert('图片处理失败，请稍后重试！')
        }
      }
      
      // 读取错误事件
      reader.onerror = (error) => {
        console.error('图片读取失败：', error)
        alert('图片读取失败，请检查文件是否损坏！')
      }
      
      // 开始读取文件
      try {
        reader.readAsDataURL(file)
      } catch (error) {
        console.error('读取文件时发生错误：', error)
        alert('读取文件时发生错误，请检查文件是否有效！')
      }
    }
    
    testImg.onerror = () => {
      console.error('Blob URL 测试加载失败，文件可能损坏')
      URL.revokeObjectURL(blobUrl)
      alert('图片文件可能已损坏或格式不支持，请选择其他图片！')
    }
    
    // 开始测试加载
    testImg.src = blobUrl
  }
  
  // 移除头像按钮点击事件
  removeAvatarBtn.addEventListener('click', () => {
    if (confirm('确定要移除当前头像吗？')) {
      removeAvatar()
    }
  })
  
  // 保存用户名按钮点击事件
  saveUsernameBtn.addEventListener('click', () => {
    const newUsername = usernameInput.value.trim()
    if (newUsername) {
      if (newUsername.length > 20) {
        alert('用户名不能超过20个字符！')
        return
      }
      updateUsername(newUsername)
    } else {
      alert('请输入用户名！')
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
    alert('用户名保存成功！')
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
  
  // 加载用户数据
  function loadUserData() {
    const userData = getUserData()
    
    // 更新页面显示
    sidebarUsername.textContent = userData.username
    usernameInput.value = userData.username
    profileAvatar.src = userData.avatar
    sidebarAvatar.src = userData.avatar
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
      alert('裁剪功能初始化失败，请刷新页面重试')
      return
    }
    
    cropContent.style.display = 'block'
    
    // 初始化裁剪功能
    initAvatarCrop(imageUrl)
  }
  
  // 头像裁剪功能 - 使用 Cropper.js 实现
  function initAvatarCrop(imageUrl) {
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
        saveCroppedAvatar(croppedCanvas);
        
        // 销毁 cropper 实例
        cropper.destroy();
      } else {
        alert('请先选择图片！');
      }
    }
    
    // 取消裁剪
    function handleCancel() {
      // 销毁 cropper 实例
      if (cropper) {
        cropper.destroy();
        cropper = null;
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
    }
    
    // 绑定按钮事件（只绑定一次）
    saveBtn.onclick = handleSave;
    cancelBtn.onclick = handleCancel;
  }
  
  // 保存裁剪后的头像
  function saveCroppedAvatar(canvas) {
    try {
      // 将canvas转换为base64数据URL
      const dataUrl = canvas.toDataURL('image/png')
      
      console.log('头像已生成，准备保存')
      
      // 更新头像显示
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
      
      alert('头像裁剪完成！')
      
    } catch (error) {
      console.error('保存头像失败：', error)
      alert('保存头像失败：' + error.message)
    }
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

// 防止鼠标滚轮缩放
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault()
    console.log('鼠标滚轮缩放已被禁用')
  }
}, { passive: false })

// 监听缩放变化并立即重置
document.addEventListener('DOMContentLoaded', () => {
  const checkZoom = () => {
    const zoomLevel = window.devicePixelRatio || 1
    if (zoomLevel !== 1) {
      console.log(`检测到缩放级别: ${zoomLevel}，正在重置...`)
      // 使用Electron的webContents来重置缩放
      if (window.require) {
        const { webFrame } = window.require('electron')
        if (webFrame) {
          webFrame.setZoomFactor(1)
        }
      }
    }
  }
  
  // 定期检查缩放级别
  setInterval(checkZoom, 1000)
  
  // 页面加载完成后立即检查
  setTimeout(checkZoom, 100)
})