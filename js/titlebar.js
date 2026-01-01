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
      // 默认使用滑动动画，可以通过设置切换其他动画
      const animationType = localStorage.getItem('pageAnimationType') || 'slide'
      switchTab(targetTab, false, animationType)
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
      }
    }
  })
  
  function switchTab(targetTab, immediate = false, animationType = 'slide') {
    // 获取当前激活的标签页
    const currentActiveTab = document.querySelector('.sidebar-tab.active')
    const currentActiveContent = document.querySelector('.content-area[style*="display: block"]')
    
    // 移除所有标签页的激活状态
    sidebarTabs.forEach(tab => {
      tab.classList.remove('active')
    })
    
    // 激活目标标签页
    const activeTab = document.querySelector(`[data-tab="${targetTab}"]`)
    if (activeTab) {
      activeTab.classList.add('active')
    }
    
    // 确定动画方向
    let animationClass = ''
    if (!immediate) {
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
      } else {
        // 默认滑动效果
        if (currentIndex === -1 || targetIndex > currentIndex) {
          animationClass = 'page-slide-right'
        } else {
          animationClass = 'page-slide-left'
        }
      }
    }
    
    // 处理当前内容区域的淡出效果
    if (currentActiveContent && currentActiveContent.id !== `${targetTab}-content`) {
      currentActiveContent.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      currentActiveContent.style.opacity = '0'
      currentActiveContent.style.transform = 'translateX(-30px) scale(0.95)'
      currentActiveContent.style.visibility = 'hidden'
      
      // 立即处理内容切换，避免延迟
      currentActiveContent.style.display = 'none'
      showNewContent()
    } else {
      showNewContent()
    }
    
    function showNewContent() {
      // 显示目标内容区域
      const activeContent = document.getElementById(`${targetTab}-content`)
      if (activeContent) {
        activeContent.style.display = 'block'
        
        if (immediate) {
          // 立即显示，无动画
          activeContent.style.transition = 'none'
          activeContent.style.opacity = '1'
          activeContent.style.transform = 'translateX(0) scale(1)'
          activeContent.style.visibility = 'visible'
        } else {
          // 添加动画类
          if (animationClass) {
            activeContent.classList.add(animationClass)
          }
          
          // 设置最终状态
          activeContent.style.opacity = '1'
          activeContent.style.transform = 'translateX(0) scale(1)'
          activeContent.style.visibility = 'visible'
          
          // 动画结束后移除类 - 使用 requestAnimationFrame 替代 setTimeout
          requestAnimationFrame(() => {
            if (animationClass) {
              activeContent.classList.remove(animationClass)
            }
          })
        }
      }
    }
    
    // 更新窗口标题
    const tabNames = {
      'chat': '聊天',
      'contacts': '联系人',
      'profile': '我的',
      'settings': '设置'
    }
    document.title = `无界 - ${tabNames[targetTab] || '聊天'}`
  }
  
  // 默认激活聊天标签页 - 使用立即模式避免动画延迟
  switchTab('chat', true)
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
    
    // 隐藏所有内容区域
    settingTabs.forEach(tab => {
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
  
  // 初始化自定义下拉菜单
  initCustomDropdowns()
  
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
    await navigator.clipboard.writeText(key)
    alert('密钥已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    alert('复制失败，请手动复制')
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
  if (confirm('确定要删除这个API密钥吗？')) {
    apiKeys = apiKeys.filter(key => key.id !== id)
    saveApiKeys()
    renderApiKeys()
    bindApiKeyEvents()
  }
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

// 绑定API密钥相关事件 - 优化事件委托
function bindApiKeyEvents() {
  // 使用事件委托，避免为每个按钮单独绑定事件
  const apiKeysTab = document.getElementById('api-keys-tab')
  if (!apiKeysTab) return
  
  // 复制按钮事件 - 使用事件委托
  apiKeysTab.addEventListener('click', (e) => {
    if (e.target.closest('.copy-btn')) {
      const btn = e.target.closest('.copy-btn')
      const key = btn.getAttribute('data-key')
      copyKeyToClipboard(key)
    }
  })
  
  // 添加密钥按钮事件
  const addBtn = document.querySelector('.add-key-btn-small')
  if (addBtn) {
    addBtn.addEventListener('click', addNewKey)
  }
  
  // 编辑按钮事件 - 使用事件委托
  apiKeysTab.addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn')) {
      const btn = e.target.closest('.edit-btn')
      const id = btn.getAttribute('data-id')
      editKey(id)
    }
  })
  
  // 删除按钮事件 - 使用事件委托
  apiKeysTab.addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) {
      const btn = e.target.closest('.delete-btn')
      const id = btn.getAttribute('data-id')
      deleteKey(id)
    }
  })
}

// 初始化自定义下拉菜单
function initCustomDropdowns() {
  const customDropdowns = document.querySelectorAll('.custom-dropdown')
  
  customDropdowns.forEach(dropdown => {
    const selected = dropdown.querySelector('.custom-dropdown-selected')
    const options = dropdown.querySelector('.custom-dropdown-options')
    
    // 点击选中区域展开/收起下拉菜单
    selected.addEventListener('click', (e) => {
      e.stopPropagation()
      
      // 关闭其他下拉菜单
      document.querySelectorAll('.custom-dropdown-options').forEach(opt => {
        if (opt !== options) {
          opt.classList.remove('show')
        }
      })
      
      // 切换当前下拉菜单
      options.classList.toggle('show')
    })
    
    // 点击选项选择
    const optionItems = options.querySelectorAll('.custom-dropdown-option')
    optionItems.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.getAttribute('data-value')
        selected.textContent = value
        
        // 更新选中状态
        optionItems.forEach(opt => {
          opt.classList.remove('selected')
        })
        option.classList.add('selected')
        
        // 关闭下拉菜单
        options.classList.remove('show')
      })
    })
  })
  
  // 点击外部关闭下拉菜单
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown-options').forEach(options => {
      options.classList.remove('show')
    })
  })
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
}

// 防止鼠标滚轮缩放
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault()
    console.log('鼠标滚轮缩放已被禁用')
  }
}, { passive: false })

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