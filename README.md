# 无界AI聊天桌面版

一个基于Electron开发的AI聊天应用桌面版本。

## 项目描述

这是无界AI聊天的桌面版本，使用Electron框架构建，提供跨平台的桌面聊天体验。

## 功能特性

- 跨平台支持（Windows、macOS、Linux）
- 简洁的用户界面
- 基于Electron构建

## 开发环境要求

- Node.js (建议使用最新LTS版本)
- npm 或 yarn

## 安装和运行

1. 克隆仓库
```bash
git clone https://github.com/你的用户名/wujieaichat-desktop.git
cd wujieaichat-desktop
```

2. 安装依赖
```bash
npm install
```

3. 运行应用
```bash
npm start
```

## 开发

### 启动开发模式
```bash
npm start
```

### 构建应用
```bash
# 构建Windows版本
npm run build-win

# 构建macOS版本
npm run build-mac

# 构建Linux版本
npm run build-linux
```

## 项目结构

```
wujieaichat-desktop/
├── main.js          # 主进程文件
├── index.html       # 应用界面
├── package.json     # 项目配置
└── README.md        # 项目说明
```

## 技术栈

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Node.js](https://nodejs.org/) - JavaScript运行时
- HTML/CSS/JavaScript - 前端技术

## 许可证

UNLICENSED

## 作者

BlackHoleEraTeam

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。