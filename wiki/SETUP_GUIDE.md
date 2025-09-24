# 🛠️ 开发环境搭建指南

## 📋 环境要求

### 必需软件
- **Node.js** >= 18.0 (推荐LTS版本)
- **pnpm** >= 8.0 (推荐包管理器)
- **思源笔记** >= 3.2.1
- **Git** (用于版本管理)

### 推荐工具
- **VS Code** + Svelte扩展
- **WebStorm** (完整IDE)
- **Chrome DevTools** (调试工具)

### 系统兼容性
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu/Debian/CentOS)

## 🚀 快速开始

### 1. 克隆或创建项目

#### 使用模板创建新项目
```bash
# 使用GitHub模板
git clone https://github.com/siyuan-note/plugin-sample-vite-svelte.git my-plugin
cd my-plugin

# 或者使用degit (更干净)
npx degit siyuan-note/plugin-sample-vite-svelte my-plugin
cd my-plugin
```

#### 直接克隆现有项目
```bash
git clone <your-project-url>
cd highlight_assistant
```

### 2. 安装依赖

```bash
# 安装pnpm (如果还没有)
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 3. 配置插件信息

编辑 `plugin.json`:
```json
{
  "name": "your-plugin-name",        // 插件标识名
  "author": "your-name",             // 作者名
  "url": "https://github.com/...",   // 项目地址
  "version": "0.1.0",                // 版本号
  "displayName": {
    "en_US": "Your Plugin Name",
    "zh_CN": "你的插件名称"
  },
  "description": {
    "en_US": "Plugin description",
    "zh_CN": "插件描述"
  }
}
```

同步更新 `package.json`:
```json
{
  "name": "your-plugin-name",
  "version": "0.1.0",
  "description": "Your plugin description"
}
```

### 4. 开发环境设置

#### 创建开发符号链接

**方式一：自动检测 (推荐)**
```bash
# 确保思源笔记正在运行
pnpm run make-link
```

脚本会自动：
1. 检测运行中的思源笔记实例
2. 发现可用的工作空间
3. 让你选择目标工作空间
4. 创建符号链接到 `{workspace}/data/plugins/`

**方式二：手动配置**
```bash
# 编辑 scripts/make_dev_link.js
let targetDir = 'C:/YourSiYuanWorkspace/data/plugins';  // 手动设置路径

# 然后运行
pnpm run make-link
```

**方式三：环境变量**
```bash
# 设置环境变量
export SIYUAN_PLUGIN_DIR="/path/to/siyuan/data/plugins"

# Windows PowerShell
$env:SIYUAN_PLUGIN_DIR="C:\path\to\siyuan\data\plugins"

# 运行链接命令
pnpm run make-link
```

#### Windows 特殊处理

Windows需要管理员权限创建目录符号链接：

```bash
# 方式一：开启开发者模式
# 设置 -> 更新和安全 -> 开发者选项 -> 开发者模式 (开启)
pnpm run make-link

# 方式二：管理员权限运行
pnpm run make-link-win

# 方式三：以管理员身份运行终端
# 右键 PowerShell/CMD -> "以管理员身份运行"
pnpm run make-link
```

### 5. 启动开发服务器

```bash
# 启动开发模式 (带热重载)
pnpm run dev
```

开发服务器启动后：
- 代码变更会自动编译到 `dev/` 目录
- 思源笔记会自动重新加载插件
- 可以在浏览器开发者工具中调试

### 6. 验证安装

1. **打开思源笔记**
2. **进入设置** -> **集市** -> **已下载**
3. **查找你的插件** (应显示为已启用)
4. **测试功能**:
   - 顶部工具栏应该有插件图标
   - 点击图标应该显示菜单
   - 设置面板应该正常打开

## ⚙️ 开发工具配置

### VS Code 推荐配置

#### 安装扩展
```json
{
  "recommendations": [
    "svelte.svelte-vscode",      // Svelte语言支持
    "ms-vscode.vscode-typescript-next", // TypeScript
    "bradlc.vscode-tailwindcss", // CSS智能提示
    "esbenp.prettier-vscode",    // 代码格式化
    "ms-vscode.vscode-json"      // JSON支持
  ]
}
```

#### 工作区设置 (`.vscode/settings.json`)
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "svelte.enable-ts-plugin": true,
  "files.associations": {
    "*.svelte": "svelte"
  },
  "emmet.includeLanguages": {
    "svelte": "html"
  }
}
```

#### 调试配置 (`.vscode/launch.json`)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch SiYuan Plugin",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/make_dev_link.js",
      "console": "integratedTerminal"
    }
  ]
}
```

### WebStorm 配置

1. **打开项目**后自动识别TypeScript配置
2. **启用Svelte支持**：
   - 设置 -> 插件 -> 搜索"Svelte" -> 安装
3. **配置Node.js**：
   - 设置 -> 语言&框架 -> Node.js -> 指定pnpm路径
4. **设置代码风格**：
   - 设置 -> 编辑器 -> 代码风格 -> TypeScript

## 🔧 常见问题排查

### 符号链接问题

**问题**: `make-link`命令失败
```bash
Error: operation not permitted, symlink
```

**解决方案**:
1. **Windows**: 开启开发者模式或以管理员身份运行
2. **macOS**: 检查系统完整性保护 (SIP) 设置
3. **Linux**: 确保有目标目录的写权限

### 思源笔记检测问题

**问题**: 无法自动检测思源笔记工作空间
```bash
Error: Can not get SiYuan directory automatically
```

**解决方案**:
1. **确保思源笔记正在运行**
2. **检查端口6806是否被占用**:
   ```bash
   # Windows
   netstat -an | findstr :6806
   
   # Linux/macOS
   lsof -i :6806
   ```
3. **手动设置环境变量**:
   ```bash
   export SIYUAN_PLUGIN_DIR="/path/to/workspace/data/plugins"
   ```

### 依赖安装问题

**问题**: pnpm install失败
```bash
ERR_PNPM_PEER_DEP_ISSUES
```

**解决方案**:
```bash
# 清理缓存重装
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 或使用npm
npm install
```

### 热重载不工作

**问题**: 代码修改后插件不自动更新

**解决方案**:
1. **检查符号链接**:
   ```bash
   # Windows
   dir "C:\SiYuan\data\plugins\your-plugin" /AL
   
   # Linux/macOS  
   ls -la /path/to/siyuan/data/plugins/your-plugin
   ```

2. **重启开发服务器**:
   ```bash
   # 停止 (Ctrl+C) 然后重启
   pnpm run dev
   ```

3. **手动重启思源笔记**

### TypeScript 类型错误

**问题**: 找不到模块"siyuan"
```typescript
Cannot find module 'siyuan' or its corresponding type declarations
```

**解决方案**:
1. **重新安装类型定义**:
   ```bash
   pnpm add -D siyuan@latest
   ```

2. **检查tsconfig.json配置**:
   ```json
   {
     "compilerOptions": {
       "types": ["node", "vite/client", "svelte"]
     }
   }
   ```

## 📚 下一步

环境搭建完成后，建议按以下顺序学习：

1. 📖 [开发指南](./DEVELOPMENT_GUIDE.md) - 学习核心API和组件开发
2. 🚀 [构建与部署](./DEPLOYMENT_GUIDE.md) - 了解构建和发布流程  
3. ✨ [最佳实践](./BEST_PRACTICES.md) - 掌握高级开发技巧

---

*上一章节: [项目架构概述](./PROJECT_ARCHITECTURE.md) | 下一章节: [开发指南](./DEVELOPMENT_GUIDE.md)*
