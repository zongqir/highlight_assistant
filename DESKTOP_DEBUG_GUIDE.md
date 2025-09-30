# 电脑版调试指南

## 问题描述

在思源笔记电脑版中，高亮助手插件可能无法正确监听和劫持工具栏弹窗。

## 解决方案

我已经为插件添加了双重保障机制：

### 1. 原生工具栏劫持
- 尝试劫持思源原生的 `showContent` 方法
- 在原有工具栏基础上添加高亮按钮

### 2. 自定义工具栏（备用方案）
- 直接监听鼠标选择事件
- 显示自定义的浮动工具栏
- 提供完整的高亮功能

## 调试步骤

### 1. 检查插件加载
在思源笔记控制台中运行：
```javascript
// 检查插件是否加载
console.log('插件状态:', typeof window.testHijack);
if (typeof window.testHijack === 'function') {
    window.testHijack();
}
```

### 2. 检查环境检测
```javascript
// 检查环境检测
console.log('环境信息:', {
    userAgent: navigator.userAgent,
    screenWidth: window.innerWidth,
    isMobile: document.querySelector('.fn__mobile') !== null,
    isDesktop: document.querySelector('.fn__desktop') !== null
});
```

### 3. 检查编辑器状态
```javascript
// 检查编辑器
if (typeof window.getAllEditor === 'function') {
    const editors = window.getAllEditor();
    console.log('编辑器数量:', editors.length);
    editors.forEach((editor, i) => {
        console.log(`编辑器 ${i}:`, {
            hasProtyle: !!editor.protyle,
            hasToolbar: !!(editor.protyle?.toolbar),
            hasShowContent: !!(editor.protyle?.toolbar?.showContent),
            isReadOnly: editor.protyle?.options?.readonly
        });
    });
}
```

### 4. 测试文本选择
1. 在思源笔记中选择一段文本
2. 查看控制台是否有相关日志输出
3. 检查是否出现工具栏（原生或自定义）

## 预期行为

### 成功情况
- 控制台显示：`✅ 💻 电脑版高亮功能已激活`
- 选择文本时出现工具栏
- 可以点击颜色按钮进行高亮

### 失败情况
- 控制台显示错误信息
- 选择文本时没有工具栏出现
- 需要检查上述调试步骤

## 常见问题

### Q: 没有看到工具栏？
A: 检查以下几点：
1. 插件是否正确加载
2. 是否在只读模式下
3. 控制台是否有错误信息
4. 尝试刷新页面重新加载插件

### Q: 工具栏出现但无法点击？
A: 可能是CSS层级问题：
1. 检查工具栏的z-index
2. 查看是否有其他元素遮挡
3. 尝试调整浏览器缩放比例

### Q: 高亮功能不工作？
A: 检查API调用：
1. 查看网络请求是否成功
2. 检查思源API是否可用
3. 确认块ID是否正确获取

## 技术细节

### 原生劫持机制
```javascript
// 劫持 showContent 方法
editor.protyle.toolbar.showContent = function(protyle, range, nodeElement) {
    // 调用原始方法
    originalShowContent.call(this, protyle, range, nodeElement);
    
    // 延迟增强工具栏
    setTimeout(() => {
        if (range && range.toString().trim()) {
            enhanceToolbar(this, range, nodeElement, protyle);
        }
    }, 100);
};
```

### 自定义工具栏机制
```javascript
// 监听选择事件
document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
        showCustomToolbar(selection);
    }
});
```

## 日志输出

插件会输出详细的调试信息，包括：
- 环境检测结果
- 编辑器状态
- 工具栏劫持过程
- 按钮添加过程
- 高亮操作结果

## 联系支持

如果问题仍然存在，请提供：
1. 控制台完整日志
2. 浏览器版本信息
3. 思源笔记版本
4. 操作系统信息
5. 具体复现步骤

---

**注意**: 这个备用方案确保了即使在原生工具栏劫持失败的情况下，用户仍然可以使用高亮功能。
