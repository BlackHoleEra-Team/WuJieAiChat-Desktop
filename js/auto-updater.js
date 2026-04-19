/**
 * 自动更新模块
 * 使用 latest.yml 文件检查更新，避免 GitHub API 限制
 */

var { ipcRenderer } = require('electron')

// 将函数挂载到 window 对象，使其全局可用
if (typeof window !== 'undefined') {
  window.checkForUpdates = null
  window.setUpdateSource = null
  window.getUpdateState = null
}

// 更新源配置 - 使用 latest.yml 文件（放在 Release 中）
const UPDATE_SOURCES = {
  github: {
    name: 'GitHub 官方',
    // latest.yml 放在 latest release 中
    ymlUrl: 'https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/latest/download/latest.yml',
    downloadBaseUrl: 'https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/download/',
    enabled: true
  },
  ghproxy: {
    name: 'GH-Proxy 主站',
    ymlUrl: 'https://gh-proxy.com/https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/latest/download/latest.yml',
    downloadBaseUrl: 'https://gh-proxy.com/https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/download/',
    enabled: true
  },
  ghproxy_v6: {
    name: 'GH-Proxy V6 (国内优选)',
    ymlUrl: 'https://v6.gh-proxy.org/https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/latest/download/latest.yml',
    downloadBaseUrl: 'https://v6.gh-proxy.org/https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/download/',
    enabled: true
  },
  ghproxy_hk: {
    name: 'GH-Proxy 香港',
    ymlUrl: 'https://hk.gh-proxy.org/https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/latest/download/latest.yml',
    downloadBaseUrl: 'https://hk.gh-proxy.org/https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/download/',
    enabled: true
  },
  ghproxy_cdn: {
    name: 'GH-Proxy Fastly CDN',
    ymlUrl: 'https://cdn.gh-proxy.org/https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/latest/download/latest.yml',
    downloadBaseUrl: 'https://cdn.gh-proxy.org/https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/download/',
    enabled: true
  },
  ghproxy_edge: {
    name: 'GH-Proxy EdgeOne',
    ymlUrl: 'https://edgeone.gh-proxy.org/https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/latest/download/latest.yml',
    downloadBaseUrl: 'https://edgeone.gh-proxy.org/https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop-Update/releases/download/',
    enabled: true
  }
}

// 当前使用的更新源
let currentUpdateSource = 'github'

// 更新配置
const UPDATE_CONFIG = {
  // 检查更新间隔（毫秒）- 默认24小时
  checkInterval: 24 * 60 * 60 * 1000,
  // 当前版本（从主进程获取）
  currentVersion: '1.0.0'
}

// 更新状态
let updateState = {
  hasUpdate: false,
  updateInfo: null,
  downloadProgress: 0,
  isDownloading: false,
  isInstalling: false
}

/**
 * 初始化自动更新
 */
function initAutoUpdater() {
  // 加载用户设置的更新源
  const savedSource = localStorage.getItem('updateSource')
  if (savedSource && UPDATE_SOURCES[savedSource]) {
    currentUpdateSource = savedSource
  }

  // 启动时检查更新
  setTimeout(() => {
    checkForUpdates(false)
  }, 5000)

  // 定期检测更新
  setInterval(() => {
    checkForUpdates(false)
  }, UPDATE_CONFIG.checkInterval)

  // 监听主进程发送的更新下载进度
  ipcRenderer.on('update-download-progress', (event, progress) => {
    updateState.downloadProgress = progress
    onDownloadProgress(progress)
  })

  // 监听更新下载完成
  ipcRenderer.on('update-downloaded', (event, filePath) => {
    updateState.isDownloading = false
    updateState.isInstalling = true
    onUpdateDownloaded(filePath)
  })

  // 监听更新错误
  ipcRenderer.on('update-error', (event, error) => {
    updateState.isDownloading = false
    console.error('更新错误:', error)
    onUpdateError(error)
  })
}

/**
 * 获取当前更新源配置
 */
function getUpdateSourceConfig() {
  return UPDATE_SOURCES[currentUpdateSource]
}

/**
 * 设置更新源
 * @param {string} source - 更新源 key
 */
function setUpdateSource(source) {
  if (UPDATE_SOURCES[source]) {
    currentUpdateSource = source
    localStorage.setItem('updateSource', source)
    console.log('更新源已切换为:', UPDATE_SOURCES[source].name)
    return true
  }
  return false
}

/**
 * 获取所有可用的更新源
 */
function getAvailableUpdateSources() {
  return Object.entries(UPDATE_SOURCES).map(([key, config]) => ({
    key,
    name: config.name,
    enabled: config.enabled,
    isCurrent: key === currentUpdateSource
  }))
}

/**
 * 解析 latest.yml 文件
 * @param {string} ymlContent - YAML 文件内容
 */
function parseLatestYml(ymlContent) {
  const lines = ymlContent.split('\n')
  const result = {}

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue

    const colonIndex = trimmedLine.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmedLine.substring(0, colonIndex).trim()
    const value = trimmedLine.substring(colonIndex + 1).trim()

    // 处理多行值（简单处理，实际 YAML 可能更复杂）
    if (key === 'files') {
      result.files = []
      continue
    }

    // 文件列表项
    if (trimmedLine.startsWith('- url:')) {
      if (!result.files) result.files = []
      const fileUrl = value
      result.files.push({ url: fileUrl })
      continue
    }

    // 文件属性
    if (trimmedLine.startsWith('size:') || trimmedLine.startsWith('sha512:')) {
      if (result.files && result.files.length > 0) {
        const lastFile = result.files[result.files.length - 1]
        if (trimmedLine.startsWith('size:')) {
          lastFile.size = parseInt(value)
        } else if (trimmedLine.startsWith('sha512:')) {
          lastFile.sha512 = value
        }
      }
      continue
    }

    result[key] = value
  }

  return result
}

/**
 * 从 latest.yml 获取更新信息
 */
async function fetchLatestYml() {
  const sourceConfig = UPDATE_SOURCES[currentUpdateSource]

  const response = await fetch(sourceConfig.ymlUrl, {
    method: 'GET',
    headers: {
      'Accept': 'text/yaml, text/plain, */*',
      'Cache-Control': 'no-cache'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const ymlContent = await response.text()
  const data = parseLatestYml(ymlContent)

  // 解析版本号
  const version = data.version || '0.0.0'

  // 查找 Windows 安装包
  const exeFile = data.files && data.files.find(file =>
    file.url && file.url.endsWith('.exe')
  )

  // 构建下载链接
  let downloadUrl
  if (exeFile) {
    // 如果 URL 是相对路径，拼接完整 URL
    if (exeFile.url.startsWith('http')) {
      downloadUrl = exeFile.url
    } else {
      downloadUrl = `${sourceConfig.downloadBaseUrl}v${version}/${exeFile.url}`
    }
  } else {
    // 默认文件名
    downloadUrl = `${sourceConfig.downloadBaseUrl}v${version}/WuJie-Setup-v${version}.exe`
  }

  return {
    version: version,
    versionCode: parseInt(version.replace(/[^0-9]/g, '')) || 1,
    title: `无界 v${version}`,
    description: data.releaseNotes || data.notes || '新版本发布',
    releaseDate: data.releaseDate || new Date().toISOString().split('T')[0],
    downloadUrl: downloadUrl,
    fileSize: exeFile ? exeFile.size : 0,
    checksum: exeFile ? exeFile.sha512 : '',
    changelog: (data.releaseNotes || data.notes || '新版本发布').split('\n').filter(line => line.trim()).slice(0, 10),
    forceUpdate: data.forceUpdate === 'true' || false,
    updateType: data.updateType || 'normal'
  }
}

/**
 * 检查更新
 * @param {boolean} showNoUpdatePrompt - 是否显示"已是最新"提示
 */
const checkForUpdates = async function(showNoUpdatePrompt = true) {
  try {
    console.log('检查更新，当前源:', UPDATE_SOURCES[currentUpdateSource].name)

    const updateInfo = await fetchLatestYml()

    console.log('获取到的更新信息:', updateInfo)

    // 比较版本号
    const hasUpdate = compareVersions(updateInfo.version, UPDATE_CONFIG.currentVersion) > 0

    if (hasUpdate) {
      updateState.hasUpdate = true
      updateState.updateInfo = updateInfo
      showUpdateDialog(updateInfo)
    } else {
      updateState.hasUpdate = false
      if (showNoUpdatePrompt) {
        showNoUpdateNotification()
      }
    }

    return { hasUpdate, updateInfo }
  } catch (error) {
    console.error('检查更新失败:', error)

    // 如果当前源失败，尝试切换到下一个可用源
    if (showNoUpdatePrompt) {
      const sourceKeys = Object.keys(UPDATE_SOURCES)
      const currentIndex = sourceKeys.indexOf(currentUpdateSource)
      const nextIndex = (currentIndex + 1) % sourceKeys.length
      const nextSource = sourceKeys[nextIndex]

      if (nextSource !== currentUpdateSource) {
        console.log(`尝试切换到 ${UPDATE_SOURCES[nextSource].name}...`)

        try {
          const originalSource = currentUpdateSource
          currentUpdateSource = nextSource
          const result = await checkForUpdates(false)
          currentUpdateSource = originalSource // 恢复原来的源

          if (result.hasUpdate) {
            showUpdateSourceSuggestion(nextSource)
          } else {
            showUpdateErrorNotification(error.message)
          }
          return result
        } catch (fallbackError) {
          currentUpdateSource = originalSource
          showUpdateErrorNotification(error.message)
        }
      } else {
        showUpdateErrorNotification(error.message)
      }
    }

    return { hasUpdate: false, error: error.message }
  }
}

/**
 * 比较版本号
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0
    const part2 = parts2[i] || 0

    if (part1 > part2) return 1
    if (part1 < part2) return -1
  }

  return 0
}

/**
 * 显示更新源切换建议
 */
function showUpdateSourceSuggestion(source) {
  const sourceName = UPDATE_SOURCES[source].name
  console.log(`${sourceName} 上有可用的更新`)
}

/**
 * 显示更新对话框
 */
function showUpdateDialog(updateInfo) {
  const sourceName = UPDATE_SOURCES[currentUpdateSource].name

  const changelogHtml = updateInfo.changelog
    .map(item => `<li style="margin: 8px 0; color: #555;">${item}</li>`)
    .join('')

  const dialogHtml = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    " id="update-dialog">
      <div style="
        background: white;
        border-radius: 16px;
        padding: 30px;
        max-width: 480px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 15px;
            font-size: 28px;
            color: white;
          ">无界</div>
          <h2 style="margin: 0; color: #333; font-size: 22px;">发现新版本</h2>
          <p style="margin: 8px 0 0; color: #667eea; font-weight: 600;">v${updateInfo.version}</p>
          <p style="margin: 5px 0 0; font-size: 12px; color: #999;">更新源: ${sourceName}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; color: #999; margin-bottom: 10px; text-transform: uppercase;">更新内容</h3>
          <ul style="padding-left: 20px; margin: 0;">${changelogHtml}</ul>
        </div>

        <div style="display: flex; gap: 12px;">
          <button onclick="skipUpdate()" style="
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            color: #666;
            transition: all 0.2s;
          " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
            稍后提醒
          </button>
          <button onclick="downloadUpdate()" style="
            flex: 1;
            padding: 12px;
            border: none;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
          " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">
            立即更新
          </button>
        </div>

        <p style="text-align: center; margin-top: 15px; font-size: 12px; color: #999;">
          当前版本: v${UPDATE_CONFIG.currentVersion}
        </p>
      </div>
    </div>
  `

  const div = document.createElement('div')
  div.innerHTML = dialogHtml
  document.body.appendChild(div)
}

/**
 * 跳过更新
 */
function skipUpdate() {
  const dialog = document.getElementById('update-dialog')
  if (dialog) {
    dialog.remove()
  }
}

/**
 * 下载更新
 */
function downloadUpdate() {
  if (!updateState.updateInfo) return

  const dialog = document.getElementById('update-dialog')
  if (dialog) {
    dialog.remove()
  }

  showDownloadProgress()

  ipcRenderer.send('download-update', {
    url: updateState.updateInfo.downloadUrl,
    version: updateState.updateInfo.version
  })

  updateState.isDownloading = true
}

/**
 * 显示下载进度
 */
function showDownloadProgress() {
  const progressHtml = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    " id="download-progress-dialog">
      <div style="
        background: white;
        border-radius: 16px;
        padding: 40px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        ">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>

        <h3 style="margin: 0 0 10px; color: #333;">正在下载更新</h3>
        <p style="color: #999; margin-bottom: 20px;">请稍候，下载完成后将自动安装</p>

        <div style="
          width: 100%;
          height: 8px;
          background: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        ">
          <div id="progress-bar" style="
            width: 0%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 4px;
            transition: width 0.3s;
          "></div>
        </div>

        <p id="progress-text" style="color: #667eea; font-weight: 600; margin: 0;">0%</p>
      </div>
    </div>
  `

  const div = document.createElement('div')
  div.innerHTML = progressHtml
  document.body.appendChild(div)
}

/**
 * 下载进度回调
 */
function onDownloadProgress(progress) {
  const progressBar = document.getElementById('progress-bar')
  const progressText = document.getElementById('progress-text')

  if (progressBar && progressText) {
    progressBar.style.width = progress + '%'
    progressText.textContent = Math.round(progress) + '%'
  }
}

/**
 * 更新下载完成
 */
function onUpdateDownloaded(filePath) {
  const dialog = document.getElementById('download-progress-dialog')
  if (dialog) {
    dialog.remove()
  }

  const confirmHtml = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    " id="install-confirm-dialog">
      <div style="
        background: white;
        border-radius: 16px;
        padding: 30px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 60px;
          height: 60px;
          background: #28a745;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        ">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h3 style="margin: 0 0 10px; color: #333;">下载完成</h3>
        <p style="color: #666; margin-bottom: 25px;">更新包已下载完成，是否立即安装？</p>

        <div style="display: flex; gap: 12px;">
          <button onclick="postponeInstall()" style="
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            color: #666;
          ">稍后安装</button>
          <button onclick="installUpdate()" style="
            flex: 1;
            padding: 12px;
            border: none;
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
          ">立即安装</button>
        </div>
      </div>
    </div>
  `

  const div = document.createElement('div')
  div.innerHTML = confirmHtml
  document.body.appendChild(div)
}

/**
 * 推迟安装
 */
function postponeInstall() {
  const dialog = document.getElementById('install-confirm-dialog')
  if (dialog) {
    dialog.remove()
  }
}

/**
 * 安装更新
 */
function installUpdate() {
  ipcRenderer.send('install-update')
}

/**
 * 更新错误
 */
function onUpdateError(error) {
  const dialog = document.getElementById('download-progress-dialog')
  if (dialog) {
    dialog.remove()
  }

  alert('更新失败: ' + error)
}

/**
 * 显示已是最新提示
 */
function showNoUpdateNotification() {
  console.log('当前已是最新版本')
  // 可以在这里显示 toast 提示
}

/**
 * 显示更新错误提示
 */
function showUpdateErrorNotification(message) {
  console.error('检查更新失败:', message)
}

/**
 * 获取更新状态
 */
function getUpdateState() {
  return { ...updateState }
}

/**
 * 手动检查更新
 */
function manualCheckForUpdates() {
  return checkForUpdates(true)
}

// 将主要函数挂载到 window 对象，使其全局可用
if (typeof window !== 'undefined') {
  window.checkForUpdates = manualCheckForUpdates
  window.setUpdateSource = setUpdateSource
  window.getUpdateState = getUpdateState
  window.getAvailableUpdateSources = getAvailableUpdateSources
}

// 导出模块
try {
  if (module && module.exports) {
    module.exports = {
      initAutoUpdater,
      checkForUpdates: manualCheckForUpdates,
      getUpdateState,
      setUpdateSource,
      getUpdateSourceConfig,
      getAvailableUpdateSources,
      downloadUpdate,
      installUpdate,
      skipUpdate,
      postponeInstall
    }
  }
} catch (e) {
  // 模块导出失败，函数已在全局作用域
}
