# 思源手机版高亮解决方案

## 🎯 问题解决

这个解决方案专门针对思源手机版的事件阻塞问题，通过以下关键技术突破了原有限制：

### 核心问题分析
1. **事件被 `stopImmediatePropagation()` 阻塞** - 思源系统大量使用此方法阻止其他监听器执行
2. **620ms 延迟机制** - 系统的 `renderKeyboardToolbar` 有620ms延迟
3. **触摸事件优先级问题** - 系统的触摸处理会阻塞自定义事件

### 🔧 解决策略
1. **600ms 抢先处理** - 比系统快20ms，抢先获得处理权
2. **捕获阶段监听** - 使用 `addEventListener(event, handler, true)` 获得最高优先级
3. **手机版专用检查** - 精确识别手机版编辑器环境
4. **双重保险机制** - 同时监听选择变化和工具栏事件

## 📁 文件结构

```
src/
├── utils/
│   ├── domUtils.ts                    # 基础DOM工具（已存在）
│   └── mobileSelectionHandler.ts     # 手机版选择处理器（新增）
├── components/
│   └── mobilePopup.ts                 # 手机版弹窗组件（新增）
├── mobile/
│   └── mobileHighlightManager.ts      # 手机版高亮管理器（新增）
└── examples/
    └── mobileExample.ts               # 使用示例（新增）
```

## 🚀 快速开始

### 1. 基础使用

```typescript
import { createMobileHighlightManager } from './src/mobile/mobileHighlightManager';

// 创建管理器
const manager = createMobileHighlightManager({
    debug: true,                    // 开启调试
    selectionDelay: 600,           // 抢先延迟
    colors: ['yellow', 'green', 'blue', 'pink']
});

// 初始化
await manager.init();
```

### 2. 完整配置示例

```typescript
const manager = createMobileHighlightManager({
    // 选择处理器配置
    selectionDelay: 600,        // 比系统620ms快20ms
    enableCapture: true,        // 使用捕获阶段监听
    enableToolbarWatch: true,   // 监听工具栏变化
    
    // 弹窗配置
    colors: ['yellow', 'green', 'blue', 'pink', 'red', 'purple'],
    showCommentButton: true,    // 显示备注按钮
    autoHideDelay: 0,          // 不自动隐藏
    
    // 通用配置
    debug: false,              // 生产环境关闭调试
    autoInit: true             // 自动初始化
}, {
    // 事件处理器
    onHighlight: async (color, selectionInfo) => {
        // 处理高亮创建
        console.log('创建高亮:', color, selectionInfo.text);
        return true; // 返回true表示成功
    },
    
    onComment: async (selectionInfo) => {
        // 处理备注添加
        const comment = prompt('请输入备注:');
        console.log('添加备注:', comment);
    },
    
    onRemove: async (selectionInfo) => {
        // 处理高亮移除
        console.log('移除高亮:', selectionInfo.text);
        return true; // 返回true表示成功
    },
    
    onSelectionChange: (selectionInfo) => {
        // 选择变化时触发
        console.log('选择变化:', selectionInfo.text);
    },
    
    onSelectionHide: () => {
        // 选择隐藏时触发
        console.log('选择隐藏');
    }
});
```

### 3. 在思源插件中使用

```typescript
class MyPlugin extends Plugin {
    private highlightManager: MobileHighlightManager;
    
    async onload() {
        // 创建手机版高亮管理器
        this.highlightManager = createMobileHighlightManager({
            debug: true,
            selectionDelay: 600,
            colors: ['yellow', 'green', 'blue', 'pink']
        }, {
            onHighlight: this.handleHighlight.bind(this),
            onComment: this.handleComment.bind(this),
            onRemove: this.handleRemove.bind(this)
        });
        
        // 延迟初始化，确保DOM准备好
        setTimeout(() => {
            this.highlightManager.init();
        }, 1000);
    }
    
    async handleHighlight(color: HighlightColor, selectionInfo: ISelectionInfo): Promise<boolean> {
        // 实现你的高亮逻辑
        try {
            // 创建高亮数据
            const highlightData = {
                id: this.generateId(),
                text: selectionInfo.text,
                color: color,
                blockId: selectionInfo.blockId,
                created: Date.now()
            };
            
            // 保存到思源数据库
            await this.saveHighlight(highlightData);
            
            // 应用到DOM
            this.applyHighlightToDom(selectionInfo, color, highlightData.id);
            
            return true;
        } catch (error) {
            console.error('高亮处理失败:', error);
            return false;
        }
    }
    
    onunload() {
        // 销毁管理器
        if (this.highlightManager) {
            this.highlightManager.destroy();
        }
    }
}
```

## 🎨 样式定制

系统会自动添加CSS样式，但你可以通过CSS变量进行定制：

```css
/* 自定义高亮颜色 */
:root {
    --highlight-color-yellow: #fff3cd;
    --highlight-color-green: #d4edda;
    --highlight-color-blue: #cce5ff;
    --highlight-color-pink: #fce4ec;
    --highlight-color-red: #f8d7da;
    --highlight-color-purple: #e2d9f7;
}

/* 自定义弹窗样式 */
.mobile-highlight-popup {
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
}

/* 自定义按钮样式 */
.mobile-highlight-popup .color-btn {
    border-radius: 8px !important;
    transform: scale(1.1);
}
```

## 📱 手机版特性

### 触摸优化
- 所有按钮都针对触摸进行了优化
- 添加了触摸反馈动画
- 支持防误触机制

### 屏幕适配
- 自动适配不同屏幕尺寸
- 智能定位避免超出屏幕边界
- 响应式设计支持横竖屏切换

### 性能优化
- 600ms抢先处理，避免等待系统延迟
- 捕获阶段监听，最高优先级
- 智能事件阻塞检测

## 🔧 高级配置

### 自定义选择检测

```typescript
// 创建自定义选择处理器
const customHandler = new MobileSelectionHandler({
    selectionDelay: 500,     // 自定义延迟
    enableCapture: true,     // 启用捕获阶段
    debug: true              // 开启调试
});

// 自定义事件处理
customHandler.onSelection((selectionInfo) => {
    console.log('自定义选择处理:', selectionInfo);
});

customHandler.initialize();
```

### 自定义弹窗

```typescript
// 创建自定义弹窗
const customPopup = new MobilePopup({
    colors: ['yellow', 'green', 'blue'],
    showCommentButton: false,    // 隐藏备注按钮
    autoHideDelay: 5000,        // 5秒自动隐藏
    zIndexBase: 2000            // 自定义z-index
}, {
    onHighlight: (color, selection) => {
        console.log('自定义高亮处理');
    }
});
```

## 🐛 调试指南

### 开启调试模式

```typescript
const manager = createMobileHighlightManager({
    debug: true  // 开启详细日志
});
```

调试日志会显示：
- 选择事件的触发时机
- 延迟处理的执行状态
- DOM检查的详细过程
- 事件冲突的检测结果

### 常见问题排查

#### 1. 弹窗不显示
```typescript
// 检查管理器状态
console.log('管理器状态:', manager.status);

// 手动触发选择检查
manager.checkSelection();
```

#### 2. 选择事件被阻塞
```typescript
// 检查是否在正确的编辑器环境中
const selection = window.getSelection();
console.log('当前选择:', selection?.toString());
console.log('是否手机版:', DOMUtils.isMobile());
```

#### 3. 时机不对
```typescript
// 调整延迟时间
const manager = createMobileHighlightManager({
    selectionDelay: 550  // 尝试更快的延迟
});
```

## 📊 性能监控

```typescript
// 获取管理器状态
const status = manager.status;
console.log('性能状态:', {
    initialized: status.isInitialized,
    mobile: status.isMobile,
    popupVisible: status.popupVisible
});
```

## 🎯 最佳实践

1. **延迟初始化**: 在DOM完全加载后初始化管理器
2. **错误处理**: 为所有异步操作添加错误处理
3. **内存管理**: 在插件卸载时正确销毁管理器
4. **用户体验**: 提供清晰的视觉反馈和操作提示
5. **性能优化**: 避免在高频事件中执行重操作

## 🔄 版本更新

### v1.0.0 (当前版本)
- ✅ 解决思源手机版事件阻塞问题
- ✅ 实现600ms抢先处理策略
- ✅ 添加捕获阶段事件监听
- ✅ 完整的手机版UI适配
- ✅ 支持多种高亮颜色
- ✅ 备注功能支持
- ✅ 完整的TypeScript类型支持

## 📝 许可证

MIT License - 可自由使用和修改

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

**注意**: 这个解决方案专门针对思源手机版设计，桌面版请使用其他方案。

