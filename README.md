# 无界AI聊天桌面版

[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-39.2.7-9FE2BF.svg)](https://electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-green.svg)](https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop/releases)

一个基于 Electron 开发的多 AI 服务聚合聊天应用。

## 项目简介

无界AI聊天桌面版是一款支持多 AI 服务（Kimi、DeepSeek、阿里云百炼等）的跨平台聊天应用。使用 Electron 框架构建，提供原生桌面应用体验。

## 功能特性

### 核心功能
- 🤖 **多 AI 服务支持**：Kimi、DeepSeek、阿里云百炼
- 💬 **多对话管理**：支持创建多个独立对话
- 📌 **联系人置顶**：快速访问常用对话
- 🔍 **联网搜索**：AI 可实时搜索网络信息
- 🧠 **深度思考**：支持推理过程展示
- 💾 **聊天记录**：本地持久化存储
- 🖼️ **背景自定义**：支持自定义聊天背景

### 界面特性
- 🎨 **现代化 UI**：简洁美观的界面设计
- 🌙 **主题切换**：支持明暗主题
- 📱 **响应式布局**：自适应窗口大小
- 🔔 **消息通知**：新消息桌面提醒
- ⌨️ **快捷键支持**：高效操作

### 高级功能
- 🔗 **自定义协议**：支持 `wujie://` 协议快速打开
- 🔄 **自动更新**：内置更新检查与下载
- 🔐 **数据安全**：本地加密存储 API 密钥
- 📤 **导出功能**：支持导出聊天记录

## 技术栈

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Node.js](https://nodejs.org/) - JavaScript 运行时
- HTML5/CSS3/JavaScript - 前端技术
- [jQuery](https://jquery.com/) - DOM 操作
- [Marked](https://marked.js.org/) - Markdown 渲染
- [Cropper.js](https://fengyuanchen.github.io/cropperjs/) - 图片裁剪
- [CryptoJS](https://cryptojs.gitbook.io/docs/) - 加密算法

## 安装使用

### 下载安装
从 [Releases](https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop/releases) 页面下载最新版本的安装包。

### 开发运行

```bash
# 克隆仓库
git clone https://github.com/BlackHoleEra-Team/WuJieAiChat-Desktop.git

# 进入目录
cd WuJieAiChat-Desktop

# 安装依赖
npm install

# 运行开发版本
npm start

# 打包应用
npm run dist
```

## 配置说明

### API 密钥配置
在应用设置中添加各 AI 服务的 API 密钥：
- Kimi API Key
- DeepSeek API Key
- 阿里云百炼 API Key

### 更新源配置
支持多节点更新源切换：
- GitHub 官方
- GH-Proxy 主站
- GH-Proxy V6（国内优选）
- GH-Proxy 香港
- GH-Proxy Fastly CDN
- GH-Proxy EdgeOne

## 项目结构

```
WuJieAiChat-Desktop/
├── main.js              # 主进程入口
├── index.html           # 主界面
├── package.json         # 项目配置
├── js/                  # 业务逻辑
│   ├── index.js         # 主界面逻辑
│   ├── kimi-api.js      # Kimi API
│   ├── deepseek-api.js  # DeepSeek API
│   ├── aliyun-api.js    # 阿里云 API
│   ├── auto-updater.js  # 自动更新
│   └── ...
├── css/                 # 样式文件
├── images/              # 图片资源
└── build/               # 构建配置
```

## 自定义协议

支持通过 URL 协议快速打开应用：

```
wujie://open                    # 打开应用
wujie://chat?contactId=xxx      # 打开指定对话
```

## 贡献指南

欢迎提交 Issue 和 Pull Request。

## 许可证

Copyright © 2026 BlackHoleEra-Team All Rights Reserved

本软件源代码仅供查看学习，未经作者书面许可，不得用于任何商业或非商业用途。

## 作者

[BlackHoleEra-Team](https://github.com/BlackHoleEra-Team)

## 致谢

感谢所有为本项目提供支持和建议的用户。
