# 分析 - 手机版长按行为与 contextmenu 事件

## 🔍 siyuan 源码分析

### 手机版长按会触发什么？

**文件**: `siyuan-master/app/src/protyle/gutter/index.ts`

**核心代码** (第 424-467 行):

```typescript
this.element.addEventListener("contextmenu", (event: MouseEvent & { target: HTMLInputElement }) => {
    const buttonElement = hasClosestByTag(event.target, "BUTTON");
    if (!buttonElement || buttonElement.getAttribute("data-type") === "fold") {
        return;
    }
    if (!window.siyuan.ctrlIsPressed && !window.siyuan.altIsPressed && !window.siyuan.shiftIsPressed) {
        hideTooltip();
        clearSelect(["av", "img"], protyle.wysiwyg.element);
        const gutterRect = buttonElement.getBoundingClientRect();
        
        // ... 省略部分代码
        
        this.renderMenu(protyle, buttonElement);
        
        /// #if MOBILE
        window.siyuan.menus.menu.fullscreen();  // 手机版全屏显示菜单
        /// #else
        window.siyuan.menus.menu.popup({x: gutterRect.left, y: gutterRect.bottom, isLeft: true});
        /// #endif
    }
    event.preventDefault();
    event.stopPropagation();
});
```

### 手机版长按的行为流程

```
用户长按块
    ↓
触发 contextmenu 事件
    ↓
siyuan 的 gutter 监听器捕获
    ↓
调用 this.renderMenu(protyle, buttonElement)
    ↓
手机版：window.siyuan.menus.menu.fullscreen()
    ↓
弹出全屏菜单（包括插件按钮、折叠、复制、删除等）
```

---

## 🎯 关键发现

### 1. `contextmenu` 事件在手机上的触发

- **桌面版**：右键点击触发
- **手机版**：长按触发

### 2. 思源的 gutter 菜单

用户说的"插件按钮"指的是 **gutter 菜单**（块侧边栏菜单），包含：
- 📄 文档
- ✏️ 编辑
- 📋 复制
- 🗑️ 删除
- 🔌 **插件按钮** ← 就是这个
- ... 其他操作

### 3. 为什么我们的标签面板会冲突

```
用户长按块
    ↓
触发 contextmenu 事件
    ↓
【思源的 gutter 监听器】捕获 → 显示 gutter 菜单
【我们的标签监听器】捕获 → 显示标签面板 ← 冲突！
```

---

## ✅ 我们的修复

在 `contextmenu` 监听器中添加文本选中检查：

```typescript
document.addEventListener('contextmenu', (e) => {
    // 检查是否有文本被选中
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';
    
    if (selectedText.length > 0) {
        return; // 有文本选中，不显示标签面板
    }
    
    // 显示标签面板...
});
```

### 为什么这个修复有效？

```
场景1：长按选择文字
    ↓
触发 contextmenu 事件
    ↓
selectedText.length > 0 ✅
    ↓
return; // 不显示标签面板
    ↓
思源的 gutter 菜单也不会出现（因为选择了文字）
    ↓
✅ 正确：只显示高亮工具栏

场景2：长按空白区域
    ↓
触发 contextmenu 事件
    ↓
selectedText.length === 0 ✅
    ↓
显示标签面板
    ↓
✅ 正确：显示标签面板
```

---

## 🤔 思考：是否需要进一步优化？

### 问题：我们的标签面板和思源的 gutter 菜单冲突吗？

如果用户长按块（不选择文字），会同时触发：
1. 我们的标签面板
2. 思源的 gutter 菜单

**需要测试**：
- 长按块（不选择文字），是否会同时弹出两个菜单？
- 如果会，是否需要阻止思源的 gutter 菜单？

### 可能的优化方案

如果需要阻止思源的 gutter 菜单，可以在我们的监听器中：

```typescript
document.addEventListener('contextmenu', (e) => {
    // ... 检查逻辑
    
    if (应该显示标签面板) {
        e.preventDefault();      // ✅ 已有
        e.stopPropagation();     // ✅ 已有
        e.stopImmediatePropagation(); // ❓ 是否需要？阻止其他监听器
        
        showTagPanel(blockElement);
    }
}, true); // capture: true，在捕获阶段处理，优先级更高
```

---

## 📝 总结

1. ✅ **恢复了 `getAllEditor` 导入**（虽然目前未使用，但保留备用）
2. ✅ **确认了手机版长按会触发 `contextmenu` 事件**
3. ✅ **确认了思源的 gutter 菜单也监听 `contextmenu` 事件**
4. ✅ **我们的修复（检查文本选中）是正确的**
5. ❓ **需要用户测试：长按块（不选择文字）时，是否会同时弹出标签面板和 gutter 菜单**

---

**请用户测试**：
- 在手机上长按块（不选择文字），看看会弹出什么？
  - 只有标签面板？
  - 只有 gutter 菜单（插件按钮那个）？
  - 两个都弹出？

