# Gutter 菜单禁用器使用指南

## 📋 功能说明

在手机版长按块时，思源会弹出 gutter 菜单（包括插件按钮、折叠、复制、删除等）。

这个工具可以**禁用手机版的 gutter 菜单**，避免与你的标签面板冲突。

---

## 🚀 使用方法

### 方法 1：在 `index.ts` 中初始化（推荐）

```typescript
// 在 src/index.ts 中

import { initGutterMenuDisabler, destroyGutterMenuDisabler } from "./utils/gutterMenuDisabler";

export default class HighlightAssistantPlugin extends Plugin {
    
    async onload() {
        // ... 其他初始化代码
        
        // 🔧 初始化 Gutter 菜单禁用器
        initGutterMenuDisabler({
            enabled: true,        // 是否启用（true = 禁用 gutter 菜单）
            mobileOnly: true      // 是否只在手机版禁用（true = 只在手机版禁用）
        });
        
        // ... 其他初始化代码
    }
    
    async onunload() {
        // ... 其他清理代码
        
        // 🗑️ 销毁 Gutter 菜单禁用器
        destroyGutterMenuDisabler();
        
        // ... 其他清理代码
    }
}
```

---

## ⚙️ 配置选项

```typescript
interface GutterMenuDisablerOptions {
    /** 是否启用禁用功能（默认：false，即不禁用 gutter 菜单） */
    enabled?: boolean;
    
    /** 是否只在手机版禁用（默认：true） */
    mobileOnly?: boolean;
}
```

### 配置示例

#### 1. 禁用手机版的 gutter 菜单（推荐）

```typescript
initGutterMenuDisabler({
    enabled: true,
    mobileOnly: true
});
```

#### 2. 禁用所有平台的 gutter 菜单（桌面版 + 手机版）

```typescript
initGutterMenuDisabler({
    enabled: true,
    mobileOnly: false
});
```

#### 3. 不禁用 gutter 菜单（默认）

```typescript
initGutterMenuDisabler({
    enabled: false
});

// 或者不调用 initGutterMenuDisabler()
```

---

## 🎮 动态控制

你也可以在运行时动态启用/禁用：

```typescript
import { getGutterMenuDisabler } from "./utils/gutterMenuDisabler";

// 获取实例
const disabler = getGutterMenuDisabler();

if (disabler) {
    // 启用禁用器（禁用 gutter 菜单）
    disabler.enable();
    
    // 禁用禁用器（恢复 gutter 菜单）
    disabler.disable();
}
```

---

## 🔍 工作原理

### 核心逻辑

1. 在 `contextmenu` 事件的**捕获阶段**注册监听器（优先级最高）
2. 检查触发事件的元素是否是 gutter 按钮
3. 如果是，阻止事件传播和默认行为

### 代码示例

```typescript
document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;
    
    // 检查是否是 gutter 按钮
    if (isGutterButton(target)) {
        // 阻止事件传播和默认行为
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }
}, true); // capture: true，在捕获阶段处理
```

### 判断 gutter 按钮的方法

```typescript
private isGutterButton(element: HTMLElement): boolean {
    // 方法1：检查是否在 .protyle-gutters 容器内
    const gutterContainer = element.closest('.protyle-gutters');
    if (gutterContainer) {
        return true;
    }
    
    // 方法2：检查是否是 gutter 按钮本身
    if (element.classList.contains('protyle-gutters')) {
        return true;
    }
    
    // 方法3：检查是否是 gutter 按钮的子元素
    const button = element.closest('button');
    if (button && button.parentElement?.classList.contains('protyle-gutters')) {
        return true;
    }
    
    return false;
}
```

---

## 📊 使用场景

| 场景 | 配置 |
|------|------|
| **只在手机版禁用 gutter 菜单** | `{ enabled: true, mobileOnly: true }` |
| **所有平台都禁用 gutter 菜单** | `{ enabled: true, mobileOnly: false }` |
| **不禁用 gutter 菜单（默认）** | `{ enabled: false }` 或不调用 |

---

## ⚠️ 注意事项

### 1. 与标签面板的配合

如果你启用了 gutter 菜单禁用器，手机版长按时：
- ✅ 不会弹出 gutter 菜单（插件按钮等）
- ✅ 会弹出你的标签面板（如果没有选中文字）
- ✅ 会弹出高亮工具栏（如果选中了文字）

### 2. 桌面版右键菜单

如果 `mobileOnly: true`（默认），桌面版的右键菜单不受影响：
- ✅ 桌面版右键点击 gutter 按钮，仍然会弹出菜单
- ✅ 桌面版右键点击块，会弹出你的标签面板

### 3. 调试

启用后，控制台会输出：
```
✅ Gutter 菜单禁用器：已启用
🚫 拦截 gutter 菜单的 contextmenu 事件
```

---

## 🧪 测试步骤

### 1. 启用禁用器

在 `src/index.ts` 的 `onload()` 中添加：

```typescript
initGutterMenuDisabler({
    enabled: true,
    mobileOnly: true
});
```

### 2. 重新加载插件

在思源中禁用并重新启用插件。

### 3. 在手机上测试

| 操作 | 预期结果 |
|------|---------|
| 长按块（不选择文字） | 只弹出标签面板，不弹出 gutter 菜单 ✅ |
| 长按选择文字 | 只弹出高亮工具栏，不弹出任何菜单 ✅ |
| 长按 gutter 按钮本身 | 不弹出 gutter 菜单 ✅ |

---

## 🎊 完整示例

```typescript
// src/index.ts

import {
    Plugin,
    showMessage,
    getFrontend,
    getBackend,
} from "siyuan";
import "./index.scss";
import Logger from "./utils/logger";
import { ToolbarHijacker } from "./utils/toolbarHijacker";
import { initGutterMenuDisabler, destroyGutterMenuDisabler } from "./utils/gutterMenuDisabler";

export default class HighlightAssistantPlugin extends Plugin {
    private toolbarHijacker: ToolbarHijacker | null = null;
    
    async onload() {
        Logger.log('🎉 高亮助手插件加载中...');
        
        // 初始化 Gutter 菜单禁用器（手机版）
        initGutterMenuDisabler({
            enabled: true,        // 启用禁用功能
            mobileOnly: true      // 只在手机版禁用
        });
        
        // 其他初始化代码...
        this.toolbarHijacker = new ToolbarHijacker();
        // ...
        
        Logger.log('✅ 高亮助手插件加载完成！');
    }
    
    async onunload() {
        Logger.log('👋 高亮助手插件卸载中...');
        
        // 销毁 Gutter 菜单禁用器
        destroyGutterMenuDisabler();
        
        // 其他清理代码...
        if (this.toolbarHijacker) {
            this.toolbarHijacker.destroy();
            this.toolbarHijacker = null;
        }
        
        Logger.log('✅ 高亮助手插件卸载完成！');
    }
}
```

---

**现在你可以完全控制手机版的 gutter 菜单了！** 🎉

