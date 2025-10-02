# Changelog

## v3.0.4 2025-10-02

### 🐛 Bug修复

* **🔧 修复快速添加多个标签时第一个标签变成字符串的BUG**
  - ❌ 问题：快速添加第二个标签后，第一个标签会变成纯文本字符串
  - 🔍 原因：`getBlockByID` API 返回的 `content` 字段是纯文本，会丢失已有标签的 DOM 结构
  - ✅ 解决：改为从 DOM 元素直接获取当前的 HTML 内容，完整保留已有标签
  - 🎯 结果：现在可以连续添加多个标签，所有标签都保持正确的 DOM 格式

### ⚙️ 配置调整

* **📱 Gutter 菜单禁用器现在只在手机版生效**
  - 🔄 调整：将 `mobileOnly` 配置从 `false` 改为 `true`
  - 📱 手机版：禁用 gutter 菜单（避免与长按打标签功能冲突）
  - 💻 桌面版：保留 gutter 菜单的正常功能
  - 🔧 改进：统一平台检测逻辑，与主插件保持一致

## v3.0.3 2025-10-02

### 🐛 Bug修复

* **修复手机版快速添加标签BUG**
  - 🔧 修复手机版添加标签时变成纯文本的问题
  - 🎯 根本原因：旧方法使用 `#emoji+name#` Markdown格式，依赖用户启用"Markdown行级标签语法"设置
  - ✨ 解决方案：改用 `<span data-type="tag">内容</span>` DOM格式
  - 🌐 优势：不依赖用户设置，手机版和桌面版都能正常工作
  - ✅ 结果：标签现在在所有平台上都显示为可点击的正确格式

### 📖 文档更新

* **完善标签功能使用说明**
  - 📱 详细说明手机版触发方式：长按块中空白区域（500ms）
  - 🖱️ 详细说明电脑版触发方式：右键点击块中空白区域(注意 最好点击空白 否则会触发划线高亮工具栏)
  - 🔒 补充使用条件：仅在文档锁定（不可编辑）状态下可用 也就是阅读模式下
  - 🎯 添加操作步骤和注意事项

## v2.0.0 2025-10-02

### 🎉 重大更新

#### ✨ 新功能

* **标签快速打标系统**
  - 🏷️ 右键或长按快速打标签（桌面版和移动版支持）
  - 🎨 8种预设标签：重点⭐、难点🔥、易错⚡、记忆💭、挖掘🔍、检查✅、练习✍️、疑问❓
  - 🎯 智能标签搜索：点击标签快速搜索相关内容
  - 📍 多种搜索范围：本文档、子文档、笔记本
  - 🌳 结果按文档树形结构展示
  - 🔗 一键跳转到目标块
  - 🛡️ 复杂样式保护：自动检测并阻止在代码块、数学公式等复杂内容上打标签
  - 🔒 只读状态保护：确保在正确状态下操作

* **闪卡快速切换功能**
  - ⚡ 自动记录闪卡筛选历史（最多10条）
  - 🎈 小圆球浮窗快速入口
  - 📌 支持固定常用筛选项
  - 🔄 智能去重和使用频次统计
  - 🎯 一键切换到历史筛选目标
  - 🖱️ 支持拖拽调整位置
  - 💾 数据持久化存储

#### 🔧 技术改进

* 完善的状态管理和错误处理
* 优化的 UI/UX 设计
* 性能优化和内存管理
* 跨平台兼容性增强

## v0.3.5 2024-04-30

* [Add `direction` to plugin method `Setting.addItem`](https://github.com/siyuan-note/siyuan/issues/11183)


## 0.3.4 2024-02-20

* [Add plugin event bus `click-flashcard-action`](https://github.com/siyuan-note/siyuan/issues/10318)

## 0.3.3 2024-01-24

* Update dock icon class

## 0.3.2 2024-01-09

* [Add plugin `protyleOptions`](https://github.com/siyuan-note/siyuan/issues/10090)
* [Add plugin api `uninstall`](https://github.com/siyuan-note/siyuan/issues/10063)
* [Add plugin method `updateCards`](https://github.com/siyuan-note/siyuan/issues/10065)
* [Add plugin function `lockScreen`](https://github.com/siyuan-note/siyuan/issues/10063)
* [Add plugin event bus `lock-screen`](https://github.com/siyuan-note/siyuan/pull/9967)
* [Add plugin event bus `open-menu-inbox`](https://github.com/siyuan-note/siyuan/pull/9967)


## 0.3.1 2023-12-06

* [Support `Dock Plugin` and `Command Palette` on mobile](https://github.com/siyuan-note/siyuan/issues/9926)

## 0.3.0 2023-12-05

* Upgrade Siyuan to 0.9.0
* Support more platforms

## 0.2.9 2023-11-28

* [Add plugin method `openMobileFileById`](https://github.com/siyuan-note/siyuan/issues/9738)


## 0.2.8 2023-11-15

* [`resize` cannot be triggered after dragging to unpin the dock](https://github.com/siyuan-note/siyuan/issues/9640)

## 0.2.7 2023-10-31

* [Export `Constants` to plugin](https://github.com/siyuan-note/siyuan/issues/9555)
* [Add plugin `app.appId`](https://github.com/siyuan-note/siyuan/issues/9538)
* [Add plugin event bus `switch-protyle`](https://github.com/siyuan-note/siyuan/issues/9454)

## 0.2.6 2023-10-24

* [Deprecated `loaded-protyle` use `loaded-protyle-static` instead](https://github.com/siyuan-note/siyuan/issues/9468)

## 0.2.5 2023-10-10

* [Add plugin event bus `open-menu-doctree`](https://github.com/siyuan-note/siyuan/issues/9351)

## 0.2.4 2023-09-19

* Supports use in windows
* [Add plugin function `transaction`](https://github.com/siyuan-note/siyuan/issues/9172)

## 0.2.3 2023-09-05

* [Add plugin function `transaction`](https://github.com/siyuan-note/siyuan/issues/9172)
* [Plugin API add openWindow and command.globalCallback](https://github.com/siyuan-note/siyuan/issues/9032)

## 0.2.2 2023-08-29

* [Add plugin event bus `destroy-protyle`](https://github.com/siyuan-note/siyuan/issues/9033)
* [Add plugin event bus `loaded-protyle-dynamic`](https://github.com/siyuan-note/siyuan/issues/9021)

## 0.2.1 2023-08-21

* [Plugin API add getOpenedTab method](https://github.com/siyuan-note/siyuan/issues/9002)
* [Plugin API custom.fn => custom.id in openTab](https://github.com/siyuan-note/siyuan/issues/8944)

## 0.2.0 2023-08-15

* [Add plugin event bus `open-siyuan-url-plugin` and `open-siyuan-url-block`](https://github.com/siyuan-note/siyuan/pull/8927)


## 0.1.12 2023-08-01

* Upgrade siyuan to 0.7.9

## 0.1.11

* [Add `input-search` event bus to plugins](https://github.com/siyuan-note/siyuan/issues/8725)


## 0.1.10

* [Add `bind this` example for eventBus in plugins](https://github.com/siyuan-note/siyuan/issues/8668)
* [Add `open-menu-breadcrumbmore` event bus to plugins](https://github.com/siyuan-note/siyuan/issues/8666)

## 0.1.9

* [Add `open-menu-xxx` event bus for plugins ](https://github.com/siyuan-note/siyuan/issues/8617)

## 0.1.8

* [Add protyleSlash to the plugin](https://github.com/siyuan-note/siyuan/issues/8599)
* [Add plugin API protyle](https://github.com/siyuan-note/siyuan/issues/8445)

## 0.1.7

* [Support build js and json](https://github.com/siyuan-note/plugin-sample/pull/8)

## 0.1.6

* add `fetchPost` example
