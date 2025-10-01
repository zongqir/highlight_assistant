# 修改 tagClickManager.ts 的 showResultsPanel 方法

## 需要修改的部分

在 `src/utils/tagClickManager.ts` 文件顶部添加导入：

```typescript
import { TagResultRenderer } from './tagResultRenderer';
```

在 TagClickManager 类中添加属性：

```typescript
private renderer: TagResultRenderer;
```

在构造函数中初始化：

```typescript
constructor() {
    this.searchManager = new TagSearchManager();
    this.renderer = new TagResultRenderer();
}
```

完全替换 `showResultsPanel` 方法：

```typescript
private showResultsPanel(tagText: string, groupedResults: GroupedResults, scope: SearchScope): void {
    console.log('[TagClickManager] 🎨 开始渲染面板...');
    
    // 计算总结果数
    const totalResults = Object.values(groupedResults).reduce((sum, doc) => sum + doc.blocks.length, 0);
    const docCount = Object.keys(groupedResults).length;
    
    console.log('[TagClickManager] 文档数:', docCount);
    console.log('[TagClickManager] 总结果数:', totalResults);
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes tagSearchFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes tagSearchSlideIn {
            from { 
                opacity: 0;
                transform: translateX(30px);
            }
            to { 
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        animation: tagSearchFadeIn 0.2s ease-out;
    `;
    
    // 创建面板
    const panel = document.createElement('div');
    panel.style.cssText = `
        background: var(--b3-theme-background);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        max-width: 90vw;
        width: 900px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: tagSearchSlideIn 0.3s ease-out;
    `;
    
    // 标题栏
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 20px 24px;
        border-bottom: 1px solid var(--b3-theme-surface-lighter);
        background: linear-gradient(135deg, var(--b3-theme-surface) 0%, var(--b3-theme-background) 100%);
    `;
    
    const titleDiv = document.createElement('div');
    titleDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">🔍</span>
                <span style="font-size: 20px; font-weight: 600;">标签搜索</span>
                <span style="
                    padding: 6px 14px;
                    background: var(--b3-theme-primary-lighter);
                    color: var(--b3-theme-primary);
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                ">${tagText}</span>
            </div>
            <div style="
                color: var(--b3-theme-on-surface-light);
                font-size: 14px;
            ">
                ${docCount} 个文档，共 ${totalResults} 个结果
            </div>
        </div>
    `;
    header.appendChild(titleDiv);
    
    // 范围选择器
    const scopeContainer = document.createElement('div');
    scopeContainer.style.cssText = `
        padding: 16px 24px 0;
        background: var(--b3-theme-background);
    `;
    
    const scopeNames: Record<SearchScope, string> = {
        'doc': '📄 本文档',
        'subdocs': '📁 含子文档',
        'notebook': '📘 本笔记本',
        'global': '🌐 全局'
    };
    
    this.renderer.renderScopeSelector(scopeContainer, scope, scopeNames, (newScope) => {
        this.currentScope = newScope;
        cleanup();
        this.showTagSearchPanel(tagText, newScope);
    });
    
    // 结果列表容器
    const resultsList = document.createElement('div');
    resultsList.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 20px 24px;
    `;
    
    // 使用渲染器渲染分组结果
    this.renderer.renderGroupedResults(resultsList, groupedResults, tagText, (blockId) => {
        this.navigateToBlock(blockId);
        cleanup();
    });
    
    // 底部按钮栏
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 16px 24px;
        border-top: 1px solid var(--b3-theme-surface-lighter);
        background: var(--b3-theme-surface);
    `;
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.cssText = `
        width: 100%;
        padding: 12px;
        border: 2px solid var(--b3-theme-surface-lighter);
        background: var(--b3-theme-background);
        color: var(--b3-theme-on-background);
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
    `;
    
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.background = 'var(--b3-theme-surface-light)';
        closeButton.style.borderColor = 'var(--b3-theme-on-surface-light)';
    });
    
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.background = 'var(--b3-theme-background)';
        closeButton.style.borderColor = 'var(--b3-theme-surface-lighter)';
    });
    
    closeButton.addEventListener('click', () => {
        cleanup();
    });
    
    footer.appendChild(closeButton);
    
    // 组装面板
    panel.appendChild(header);
    panel.appendChild(scopeContainer);
    panel.appendChild(resultsList);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    
    // 清理函数
    const cleanup = () => {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    };
    
    // ESC 关闭
    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            cleanup();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
    
    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            cleanup();
        }
    });
}
```

## 关键改进

1. ✅ 使用 `TagResultRenderer` 渲染分组结果
2. ✅ 添加范围选择器（4个选项）
3. ✅ 显示文档数和总结果数
4. ✅ 点击范围切换时重新搜索
5. ✅ 按文档分组显示，可折叠

## 需要删除的方法

可以删除 `createResultItem` 方法，因为现在由 `TagResultRenderer` 处理。

