# 测试 Gutter 菜单禁用器

## 🧪 如何测试

### 步骤 1：重新加载插件

在思源中禁用并重新启用 "高亮助手" 插件。

---

### 步骤 2：查看初始化日志（如果可以看到控制台）

在控制台应该看到：

```
🔍 Gutter 菜单禁用器：检测平台 - body 类名: body--mobile, isMobile: true
✅ Gutter 菜单禁用器：已启用，监听器已注册
```

**如果看到 `isMobile: false`**，说明平台检测不正确。

---

### 步骤 3：在手机上长按块

**操作**：长按任意一个块（段落/列表/标题等）

**预期**：
- ❌ **不应该**弹出 gutter 菜单（那个有插件按钮的菜单）
- ✅ **应该**弹出标签面板（如果没有选中文字）

**如果控制台可见**，应该看到：

```
🔍 Gutter 菜单禁用器：检测到 contextmenu 事件 { tagName: 'DIV', className: '...', ... }
⏭️ 不是 gutter 按钮，跳过
```

或者：

```
🔍 Gutter 菜单禁用器：检测到 contextmenu 事件 { tagName: 'BUTTON', className: '...', ... }
🎯 检测到：在 .protyle-gutters 容器内
🚫✅ 拦截 gutter 菜单的 contextmenu 事件！
```

---

### 步骤 4：长按 gutter 按钮本身（左侧的小点点）

**操作**：长按块左侧的那个小圆点或图标

**预期**：
- ❌ **不应该**弹出 gutter 菜单

**如果控制台可见**，应该看到：

```
🔍 Gutter 菜单禁用器：检测到 contextmenu 事件 { ... }
🎯 检测到：在 .protyle-gutters 容器内
🚫✅ 拦截 gutter 菜单的 contextmenu 事件！
```

---

## 🐛 如果还是弹出 gutter 菜单

### 可能的原因

1. **平台检测不正确**
   - 日志显示 `isMobile: false` 但实际是手机版
   - **解决**：修改 `src/utils/gutterMenuDisabler.ts`，将 `mobileOnly` 改为 `false`

2. **gutter 按钮的 DOM 结构不同**
   - 日志显示 `⏭️ 不是 gutter 按钮，跳过`
   - **需要**：提供控制台日志，我来分析 DOM 结构

3. **事件监听器未注册**
   - 没有看到 `✅ Gutter 菜单禁用器：已启用，监听器已注册`
   - **可能**：初始化失败

---

## 📋 请反馈以下信息

### 1. 初始化日志

重新加载插件后，控制台是否看到：
```
✅ Gutter 菜单禁用器：已启用，监听器已注册
```

### 2. 平台检测

日志中的 `isMobile` 是 `true` 还是 `false`？

### 3. 长按时的行为

| 操作 | 是否弹出 gutter 菜单？ | 是否弹出标签面板？ |
|------|---------------------|------------------|
| 长按块（不选择文字） | ？ | ？ |
| 长按选择文字 | ？ | ？ |
| 长按 gutter 按钮 | ？ | ？ |

### 4. 控制台日志（如果可以看到）

长按时是否看到：
- `🔍 Gutter 菜单禁用器：检测到 contextmenu 事件`
- `🎯 检测到：...`
- `🚫✅ 拦截 gutter 菜单的 contextmenu 事件！`

---

## 🔧 临时调试：强制禁用（不检测平台）

如果怀疑是平台检测的问题，可以修改 `src/index.ts` 第 42 行：

```typescript
// 改为强制在所有平台禁用
initGutterMenuDisabler({ enabled: true, mobileOnly: false });
```

然后重新加载插件测试。

---

**请告诉我具体的测试结果！** 🙏

