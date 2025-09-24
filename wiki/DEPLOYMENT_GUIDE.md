# 🚀 构建与部署指南

## 📦 构建系统概述

### 构建目标
- **开发模式**: `dev/` 目录 (符号链接部署)
- **生产模式**: `dist/` 目录 + `package.zip` (发布包)

### 构建工具链
- **Vite**: 主构建工具
- **TypeScript**: 类型检查和编译
- **Svelte**: 组件编译
- **SCSS**: 样式预处理
- **自定义插件**: YAML i18n 处理

## 🛠️ 开发环境部署

### 1. 符号链接开发 (推荐)

**优势**:
- ✅ 代码修改后自动生效
- ✅ 无需重复安装插件  
- ✅ 支持热重载
- ✅ 调试体验最佳

**使用方法**:
```bash
# 第一次设置符号链接
pnpm run make-link

# 启动开发服务器
pnpm run dev
```

**工作原理**:
1. `make-link` 在SiYuan插件目录创建符号链接
2. 链接指向项目的 `dev/` 目录
3. `vite dev` 监听文件变化，实时编译到 `dev/`
4. SiYuan自动检测到文件变化，重新加载插件

### 2. 本地安装开发

**适用场景**:
- 符号链接不工作的环境
- 测试发布版本
- 验证插件完整性

**使用方法**:
```bash
# 构建并安装到本地SiYuan
pnpm run make-install
```

**工作流程**:
1. 执行生产构建 (`vite build`)
2. 自动检测SiYuan工作空间
3. 将 `dist/` 内容复制到插件目录

### 3. 开发模式详细配置

#### vite.config.ts 开发配置
```typescript
export default defineConfig({
    // 开发模式特有配置
    ...(isDev ? {
        plugins: [
            // 热重载插件
            livereload(outputDir),
            // 文件监听插件
            {
                name: 'watch-external',
                buildStart() {
                    // 监听额外文件变化
                    const files = ['public/i18n/**', './plugin.json'];
                    files.forEach(file => this.addWatchFile(file));
                }
            }
        ]
    } : {
        // 生产模式配置...
    })
});
```

#### 开发服务器选项
```bash
# 基础开发模式
pnpm run dev

# 带源码映射的开发模式
VITE_SOURCEMAP=inline pnpm run dev

# 自定义环境变量
NODE_ENV=development CUSTOM_FLAG=true pnpm run dev
```

## 🏭 生产环境构建

### 1. 标准构建

```bash
# 完整生产构建
pnpm run build
```

**构建产物**:
```
dist/
├── index.js          # 主程序 (CommonJS格式)
├── index.css         # 样式文件 (压缩)
├── i18n/             # 国际化文件
│   ├── en_US.json
│   └── zh_CN.json
├── plugin.json       # 插件配置
├── README*.md        # 说明文档
├── icon.png          # 插件图标 (160x160)
├── preview.png       # 预览图 (1024x768)
└── package.zip       # 发布包 (自动生成)
```

### 2. 构建配置详解

#### 输出格式配置
```typescript
// vite.config.ts
export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            fileName: "index",
            formats: ["cjs"]  // CommonJS格式，兼容SiYuan
        },
        rollupOptions: {
            external: ["siyuan", "process"],  // 外部依赖
            output: {
                entryFileNames: "[name].js",
                assetFileNames: (assetInfo) => {
                    // 重命名CSS文件
                    if (assetInfo.name === "style.css") {
                        return "index.css";
                    }
                    return assetInfo.name;
                }
            }
        }
    }
});
```

#### 静态资源处理
```typescript
// 静态文件复制配置
viteStaticCopy({
    targets: [
        { src: "./README*.md", dest: "./" },
        { src: "./plugin.json", dest: "./" },
        { src: "./preview.png", dest: "./" },
        { src: "./icon.png", dest: "./" }
    ]
})
```

### 3. 构建优化

#### 代码压缩
```typescript
build: {
    minify: true,              // 启用压缩
    sourcemap: false,          // 生产环境关闭sourcemap
    rollupOptions: {
        plugins: [
            // 清理不必要文件
            cleanupDistFiles({
                patterns: ['i18n/*.yaml', 'i18n/*.md'],
                distDir: 'dist'
            })
        ]
    }
}
```

#### 包大小分析
```bash
# 安装包分析工具
pnpm add -D rollup-plugin-visualizer

# 构建时生成分析报告
pnpm run build --analyze
```

## 📋 版本管理

### 1. 版本号同步

使用脚本自动同步版本号:
```bash
# 更新版本号
pnpm run update-version
```

**脚本功能**:
- 更新 `package.json` 版本
- 同步 `plugin.json` 版本  
- 生成版本标签
- 更新CHANGELOG

#### 手动版本管理
```bash
# 更新package.json
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0  
npm version major  # 1.0.0 -> 2.0.0

# 手动同步plugin.json
```

### 2. 语义化版本

遵循 [Semantic Versioning](https://semver.org/) 规范:

- **MAJOR** (1.0.0): 不兼容的API修改
- **MINOR** (0.1.0): 向后兼容的新功能
- **PATCH** (0.0.1): 向后兼容的Bug修复

**示例**:
```json
{
  "version": "1.2.3",
  "changelog": {
    "1.2.3": "修复设置面板bug",
    "1.2.0": "新增快捷键支持", 
    "1.0.0": "首个稳定版本"
  }
}
```

## 🌐 插件市场发布

### 1. GitHub Releases发布

#### 手动发布流程
```bash
# 1. 构建发布包
pnpm run build

# 2. 创建Git标签
git tag v1.0.0
git push origin v1.0.0

# 3. 在GitHub创建Release
# - 填写版本号: v1.0.0
# - 上传package.zip文件
# - 编写Release Notes
```

#### Release Notes模板
```markdown
## v1.0.0 - 2024-01-01

### ✨ 新功能
- 添加快捷键支持
- 新增设置面板

### 🐛 Bug修复  
- 修复移动端显示问题
- 解决内存泄漏问题

### 📖 文档
- 更新开发指南
- 添加API文档

### ⚠️ 破坏性变更
- 移除deprecated API
- 修改配置文件格式
```

### 2. GitHub Actions自动化

#### 配置自动化发布
创建 `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Build
        run: pnpm run build
        
      - name: Create Release
        uses: ncipollo/release-action@v1
        with:
          allowUpdates: true
          artifactErrorsFailBuild: true
          artifacts: 'package.zip'
          token: ${{ secrets.GITHUB_TOKEN }}
          prerelease: false
```

#### 配置仓库权限
1. 仓库设置 -> Actions -> General
2. Workflow permissions -> Read and write permissions
3. 启用 "Allow GitHub Actions to create and approve pull requests"

### 3. 社区集市上架

#### 首次上架流程
1. **准备材料**:
   - GitHub仓库地址
   - 完整的README文档
   - 插件图标和预览图
   - 第一个stable release

2. **提交PR到集市**:
   ```bash
   # Fork bazaar仓库
   git clone https://github.com/siyuan-note/bazaar.git
   cd bazaar
   
   # 编辑plugins.json
   vim plugins.json
   ```
   
   添加你的插件:
   ```json
   {
     "repos": [
       "existing/plugin",
       "your-username/your-plugin-name"
     ]
   }
   ```

3. **创建PR**:
   - 标题: `Add plugin: your-plugin-name`
   - 描述: 简要说明插件功能
   - 确保所有检查通过

#### 后续版本更新
- **无需PR**: 集市每小时自动同步
- **检查状态**: [Bazaar Actions](https://github.com/siyuan-note/bazaar/actions)
- **处理时间**: 通常1-2小时内生效

## 🔧 CI/CD 最佳实践

### 1. 自动化测试

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: pnpm install
      - name: Lint
        run: pnpm run lint
      - name: Type check
        run: pnpm run type-check
      - name: Build test
        run: pnpm run build
```

### 2. 质量检查

```bash
# 添加代码质量工具
pnpm add -D eslint prettier @typescript-eslint/parser

# package.json scripts
{
  "scripts": {
    "lint": "eslint src --ext .ts,.svelte",
    "format": "prettier --write src",
    "type-check": "tsc --noEmit"
  }
}
```

### 3. 自动化部署

```yaml
# 部署到测试环境
deploy-dev:
  if: github.ref == 'refs/heads/develop'
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to Dev
      run: |
        # 部署逻辑
        echo "Deploy to development environment"
```

## 🐛 部署故障排查

### 常见构建问题

#### 1. TypeScript编译错误
```bash
Error: Property 'xxx' does not exist on type 'yyy'
```
**解决方案**:
- 检查类型定义是否正确
- 更新 `@types/node` 和 `siyuan` 版本
- 验证 `tsconfig.json` 配置

#### 2. Svelte编译问题
```bash
Error: Cannot find module 'xxx.svelte'
```
**解决方案**:
- 检查文件路径是否正确
- 确认 `.svelte` 文件语法正确
- 验证 `svelte.config.js` 配置

#### 3. 资源文件缺失
```bash
Error: Could not resolve "./icon.png"
```
**解决方案**:
- 检查文件是否存在
- 验证 `viteStaticCopy` 配置
- 确认文件路径正确

### 运行时问题

#### 1. 插件加载失败
**检查步骤**:
```bash
# 1. 检查插件文件完整性
ls -la /path/to/siyuan/data/plugins/your-plugin/

# 2. 查看SiYuan日志
tail -f /path/to/siyuan/app.log

# 3. 浏览器控制台错误
```

#### 2. API调用失败
**调试方法**:
```typescript
// 添加调试信息
console.log("API调用前:", requestData);
const result = await fetchPost("/api/xxx", requestData);
console.log("API响应:", result);
```

#### 3. 符号链接问题
**Windows权限问题**:
```powershell
# 以管理员身份运行
pnpm run make-link-win

# 或开启开发者模式后运行
pnpm run make-link
```

**Linux/macOS权限问题**:
```bash
# 检查目录权限
ls -la /path/to/siyuan/data/plugins/

# 修复权限
chmod 755 /path/to/siyuan/data/plugins/
```

---

*上一章节: [开发指南](./DEVELOPMENT_GUIDE.md) | 下一章节: [最佳实践](./BEST_PRACTICES.md)*
