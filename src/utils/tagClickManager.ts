/**
 * 标签点击管理器 - 自定义标签搜索面板
 */

import { 
    TagSearchManager, 
    TagSearchResult, 
    SearchScope, 
    GroupedResults 
} from './tagSearchManager';
import { TagResultRenderer } from './tagResultRenderer';

export class TagClickManager {
    private isInitialized: boolean = false;
    private debugMode: boolean = false;
    private currentScope: SearchScope = 'notebook';
    private searchManager: TagSearchManager;
    private renderer: TagResultRenderer;
    
    constructor() {
        this.searchManager = new TagSearchManager();
        this.renderer = new TagResultRenderer();
    }
    
    /**
     * 开启调试模式
     */
    public enableDebug(): void {
        this.debugMode = true;
        this.searchManager.enableDebug();
        console.log('[TagClickManager] ✅ 调试模式已开启');
    }
    
    /**
     * 关闭调试模式
     */
    public disableDebug(): void {
        this.debugMode = false;
        this.searchManager.disableDebug();
        console.log('[TagClickManager] ❌ 调试模式已关闭');
    }
    
    /**
     * 调试日志
     */
    private debugLog(...args: any[]): void {
        if (this.debugMode) {
            console.log(...args);
        }
    }
    
    /**
     * 初始化
     */
    public initialize(): void {
        if (this.isInitialized) {
            return;
        }
        
        // 延迟初始化，等待DOM加载完成
        setTimeout(() => {
            this.setupTagClickListener();
            this.isInitialized = true;
            console.log('[TagClickManager] ✅ 标签点击管理器初始化完成');
        }, 2000);
    }
    
    /**
     * 设置标签点击监听
     */
    private setupTagClickListener(): void {
        // 监听文档点击事件
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            // 查找标签元素
            const tagElement = this.findTagElement(target);
            
            if (tagElement) {
                this.debugLog('[TagClickManager] 🏷️ 检测到标签点击');
                
                // 阻止默认行为（原生搜索）
                e.preventDefault();
                e.stopPropagation();
                
                // 获取标签内容
                const tagText = tagElement.textContent?.trim() || '';
                this.debugLog('[TagClickManager] 标签内容:', tagText);
                
                // 显示自定义搜索面板
                this.showTagSearchPanel(tagText);
            }
        }, true);
        
        console.log('[TagClickManager] ✅ 标签点击监听已注册');
    }
    
    /**
     * 查找标签元素
     */
    private findTagElement(element: HTMLElement): HTMLElement | null {
        let current: HTMLElement | null = element;
        let depth = 0;
        const maxDepth = 3;
        
        while (current && depth < maxDepth) {
            const dataType = current.getAttribute('data-type');
            
            // 检查是否是标签元素
            if (dataType?.includes('tag')) {
                this.debugLog('[TagClickManager] 找到标签元素:', {
                    tagName: current.tagName,
                    dataType,
                    textContent: current.textContent
                });
                return current;
            }
            
            current = current.parentElement;
            depth++;
        }
        
        return null;
    }
    
    /**
     * 显示标签搜索面板
     */
    private async showTagSearchPanel(tagText: string, scope: SearchScope = this.currentScope): Promise<void> {
        console.log('[TagClickManager] 🔍 ========== 开始标签搜索 ==========');
        console.log('[TagClickManager] 原始标签文本:', tagText);
        console.log('[TagClickManager] 搜索范围:', scope);
        
        // 使用搜索管理器搜索
        const results = await this.searchManager.searchByTag(tagText, scope);
        
        console.log('[TagClickManager] 搜索结果数量:', results.length);
        
        // 按文档分组
        const groupedResults = this.searchManager.groupByDocument(results);
        
        // 显示结果面板
        this.showResultsPanel(tagText, groupedResults, scope);
        
        console.log('[TagClickManager] ========== 标签搜索结束 ==========');
    }
    
    /**
     * 显示搜索结果面板
     */
    private showResultsPanel(tagText: string, groupedResults: GroupedResults, scope: SearchScope): void {
        console.log('[TagClickManager] 🎨 开始渲染面板...');
        console.log('[TagClickManager] 标签文本:', tagText);
        console.log('[TagClickManager] 分组结果:', groupedResults);
        
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
            width: 800px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: tagSearchSlideIn 0.3s ease-out;
        `;
        
        // 标题栏
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 24px 28px;
            border-bottom: 1px solid var(--b3-theme-surface-lighter);
            background: linear-gradient(135deg, var(--b3-theme-surface) 0%, var(--b3-theme-background) 100%);
        `;
        
        // 计算总结果数
        const totalResults = Object.values(groupedResults).reduce((sum, doc) => sum + doc.blocks.length, 0);
        const docCount = Object.keys(groupedResults).length;
        
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
        
        // 搜索范围选择器
        const scopeSelector = this.createScopeSelector(scope, (newScope) => {
            console.log('[TagClickManager] 🔄 切换搜索范围:', newScope);
            cleanup(); // 关闭当前面板
            this.showTagSearchPanel(tagText, newScope); // 重新搜索
        });
        header.appendChild(scopeSelector);
        
        // 结果列表容器
        const resultsList = document.createElement('div');
        resultsList.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 16px 28px;
        `;
        
        // 使用渲染器渲染分组结果
        this.renderer.renderGroupedResults(resultsList, groupedResults, tagText, (blockId) => {
            this.navigateToBlock(blockId);
            cleanup();
        });
        
        // 底部按钮栏
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 20px 28px;
            border-top: 1px solid var(--b3-theme-surface-lighter);
            background: var(--b3-theme-surface);
        `;
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = `
            width: 100%;
            padding: 14px;
            border: 2px solid var(--b3-theme-surface-lighter);
            background: var(--b3-theme-background);
            color: var(--b3-theme-on-background);
            border-radius: 10px;
            cursor: pointer;
            font-size: 15px;
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
        console.log('[TagClickManager] 🔧 组装面板元素...');
        panel.appendChild(header);
        panel.appendChild(resultsList);
        panel.appendChild(footer);
        overlay.appendChild(panel);
        
        console.log('[TagClickManager] 📍 将面板添加到 body...');
        console.log('[TagClickManager] Overlay 元素:', overlay);
        console.log('[TagClickManager] Panel 元素:', panel);
        document.body.appendChild(overlay);
        console.log('[TagClickManager] ✅ 面板已添加到 DOM');
        
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
    
    /**
     * 创建结果项
     */
    private createResultItem(result: TagSearchResult, index: number): HTMLElement {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 18px 20px;
            margin-bottom: 12px;
            background: var(--b3-theme-surface);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.25s;
            border: 2px solid transparent;
            animation: tagSearchSlideIn ${0.3 + index * 0.05}s ease-out;
        `;
        
        // 提取纯文本（移除HTML标签）
        const contentText = this.extractTextContent(result.content);
        const displayText = contentText.length > 120 ? contentText.substring(0, 120) + '...' : contentText;
        
        // 创建内容容器
        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        
        // 文本内容
        const textDiv = document.createElement('div');
        textDiv.style.cssText = `
            font-size: 15px;
            line-height: 1.6;
            color: var(--b3-theme-on-background);
            word-break: break-word;
        `;
        textDiv.innerHTML = this.highlightTag(this.escapeHtml(displayText), result.content);
        
        // 元信息
        const metaDiv = document.createElement('div');
        metaDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 12px;
            color: var(--b3-theme-on-surface-light);
        `;
        metaDiv.innerHTML = `
            <span>📁 ${this.escapeHtml(result.hpath || '未知路径')}</span>
            <span>•</span>
            <span>🕐 ${this.formatDate(result.updated)}</span>
        `;
        
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(metaDiv);
        item.appendChild(contentDiv);
        
        // 悬停效果
        item.addEventListener('mouseenter', () => {
            item.style.borderColor = 'var(--b3-theme-primary)';
            item.style.transform = 'translateX(4px)';
            item.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.borderColor = 'transparent';
            item.style.transform = 'translateX(0)';
            item.style.boxShadow = 'none';
        });
        
        // 点击跳转
        item.addEventListener('click', () => {
            this.navigateToBlock(result.id);
        });
        
        return item;
    }
    
    /**
     * 提取纯文本内容
     */
    private extractTextContent(html: string): string {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }
    
    /**
     * 转义HTML特殊字符
     */
    private escapeHtml(text: string): string {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 高亮显示标签
     */
    private highlightTag(text: string, originalHtml: string): string {
        if (!text) return '';
        // 高亮标签（已经转义的文本）
        return text.replace(/#([^#\s]+)#/g, '<span style="color: var(--b3-theme-primary); font-weight: 600; background: var(--b3-theme-primary-lighter); padding: 2px 6px; border-radius: 4px;">#$1#</span>');
    }
    
    /**
     * 格式化日期
     */
    private formatDate(timestamp: string): string {
        if (!timestamp) return '未知时间';
        
        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        const day = timestamp.substring(6, 8);
        const hour = timestamp.substring(8, 10);
        const minute = timestamp.substring(10, 12);
        
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }
    
    /**
     * 创建搜索范围选择器
     */
    private createScopeSelector(currentScope: SearchScope, onScopeChange: (scope: SearchScope) => void): HTMLElement {
        const container = document.createElement('div');
        container.style.cssText = `
            margin-top: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        const label = document.createElement('span');
        label.textContent = '搜索范围：';
        label.style.cssText = `
            color: var(--b3-theme-on-surface-light);
            font-size: 14px;
            font-weight: 500;
        `;
        
        const scopes = [
            { value: 'doc' as SearchScope, label: '📄 本文档' },
            { value: 'subdocs' as SearchScope, label: '📁 文档及子文档' },
            { value: 'notebook' as SearchScope, label: '📚 本笔记本' },
            { value: 'global' as SearchScope, label: '🌐 全局搜索' }
        ];
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--b3-theme-surface-lighter);
        `;
        
        scopes.forEach((scopeOption, index) => {
            const button = document.createElement('button');
            const isActive = scopeOption.value === currentScope;
            
            button.textContent = scopeOption.label;
            button.style.cssText = `
                border: none;
                padding: 8px 16px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                background: ${isActive ? 'var(--b3-theme-primary)' : 'var(--b3-theme-surface)'};
                color: ${isActive ? 'var(--b3-theme-on-primary)' : 'var(--b3-theme-on-surface)'};
                border-right: ${index < scopes.length - 1 ? '1px solid var(--b3-theme-surface-lighter)' : 'none'};
            `;
            
            // 悬停效果
            button.addEventListener('mouseenter', () => {
                if (!isActive) {
                    button.style.background = 'var(--b3-theme-surface-light)';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                if (!isActive) {
                    button.style.background = 'var(--b3-theme-surface)';
                }
            });
            
            // 点击事件
            button.addEventListener('click', () => {
                if (scopeOption.value !== currentScope) {
                    onScopeChange(scopeOption.value);
                }
            });
            
            buttonsContainer.appendChild(button);
        });
        
        container.appendChild(label);
        container.appendChild(buttonsContainer);
        
        return container;
    }

    /**
     * 跳转到指定块
     */
    private navigateToBlock(blockId: string): void {
        this.debugLog('[TagClickManager] 🔗 跳转到块:', blockId);
        
        // 使用思源的API跳转
        const url = `siyuan://blocks/${blockId}`;
        window.location.href = url;
    }
}

export const tagClickManager = new TagClickManager();

