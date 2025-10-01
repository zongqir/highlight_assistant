/**
 * 标签管理器 - 快速为块添加标签
 */

import { operationWrapper } from './operationWrapper';
import { getAllEditor } from "siyuan";

// 内置标签配置
const PRESET_TAGS = [
    { id: 'important', name: '重点', color: '#ff4444', emoji: '🔴' },
    { id: 'difficult', name: '难点', color: '#ff9800', emoji: '⚠️' },
    { id: 'mistake', name: '易错点', color: '#9c27b0', emoji: '❌' },
    { id: 'memory', name: '记忆点', color: '#2196f3', emoji: '🧠' },
    { id: 'explore', name: '挖掘点', color: '#4caf50', emoji: '💡' },
    { id: 'check', name: '检查点', color: '#00bcd4', emoji: '✓' },
] as const;

export class TagManager {
    private isInitialized: boolean = false;
    private debugMode: boolean = false;
    
    constructor() {
        // 初始化
    }
    
    /**
     * 开启调试模式
     */
    public enableDebug(): void {
        this.debugMode = true;
        console.log('[TagManager] ✅ 调试模式已开启');
    }
    
    /**
     * 关闭调试模式
     */
    public disableDebug(): void {
        this.debugMode = false;
        console.log('[TagManager] ❌ 调试模式已关闭');
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
     * 初始化标签功能
     */
    public initialize(): void {
        console.log('[TagManager] 🚀 标签管理器初始化...');
        
        // 设置块点击监听
        this.setupBlockClickListener();
        
        // 延迟设置初始化完成标记
        setTimeout(() => {
            this.isInitialized = true;
            console.log('[TagManager] ✅ 标签管理器初始化完成');
        }, 2000);
    }
    
    /**
     * 设置块点击监听
     */
    private setupBlockClickListener(): void {
        // 桌面版：监听鼠标右键点击块
        document.addEventListener('contextmenu', (e) => {
            const target = e.target as HTMLElement;
            
            this.debugLog('[TagManager] 🎯 检测到右键点击');
            
            // 查找块元素
            const blockElement = this.findBlockElementFromNode(target);
            
            if (blockElement) {
                // 检查是否处于只读状态
                const isDocReadonly = this.checkDocumentReadonly();
                
                if (isDocReadonly) {
                    // 阻止默认右键菜单
                    e.preventDefault();
                    e.stopPropagation();
                    
                    this.debugLog('[TagManager] 找到块元素，显示标签面板');
                    this.showTagPanel(blockElement);
                }
            }
        }, true);
        
        // 手机版：监听长按（touch事件）
        let touchTimer: NodeJS.Timeout | null = null;
        let touchStartElement: HTMLElement | null = null;
        
        document.addEventListener('touchstart', (e) => {
            const target = e.target as HTMLElement;
            touchStartElement = target;
            
            this.debugLog('[TagManager] 📱 检测到触摸开始');
            
            // 查找块元素
            const blockElement = this.findBlockElementFromNode(target);
            
            if (blockElement) {
                // 设置长按定时器（500ms）
                touchTimer = setTimeout(() => {
                    // 检查是否处于只读状态
                    const isDocReadonly = this.checkDocumentReadonly();
                    
                    if (isDocReadonly) {
                        // 阻止默认行为
                        e.preventDefault();
                        
                        this.debugLog('[TagManager] 📱 长按触发，显示标签面板');
                        this.showTagPanel(blockElement);
                        
                        // 清除定时器
                        touchTimer = null;
                    }
                }, 500); // 500ms 长按
            }
        }, { passive: false, capture: true });
        
        // 触摸结束或移动时取消长按
        const cancelTouch = () => {
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
                this.debugLog('[TagManager] 📱 长按取消');
            }
        };
        
        document.addEventListener('touchend', cancelTouch, true);
        document.addEventListener('touchmove', cancelTouch, true);
        document.addEventListener('touchcancel', cancelTouch, true);
        
        console.log('[TagManager] ✅ 块点击监听已注册（右键点击 + 长按）');
    }
    
    /**
     * 从节点查找块元素
     */
    private findBlockElementFromNode(node: Node): HTMLElement | null {
        let current = node;
        let depth = 0;
        const maxDepth = 10;
        
        while (current && depth < maxDepth) {
            if (current.nodeType === Node.ELEMENT_NODE) {
                const element = current as HTMLElement;
                const nodeId = element.getAttribute('data-node-id');
                const dataType = element.getAttribute('data-type');
                
                // 检查是否是有效的块元素
                if (nodeId && dataType && !element.classList.contains('protyle-wysiwyg')) {
                    this.debugLog('[TagManager] 找到块元素:', { nodeId, dataType });
                    return element;
                }
            }
            current = current.parentNode!;
            depth++;
        }
        
        return null;
    }
    
    /**
     * 显示标签面板
     */
    private async showTagPanel(blockElement: HTMLElement): Promise<void> {
        const blockId = blockElement.getAttribute('data-node-id');
        const blockText = blockElement.textContent?.substring(0, 50) || '';
        
        this.debugLog('[TagManager] 显示标签面板:', { blockId, blockText });
        
        // 显示标签选择对话框
        const selectedTag = await this.showTagSelectionDialog(blockText);
        
        if (selectedTag) {
            console.log('[TagManager] 📤 用户选择标签:', selectedTag.name);
            
            // 应用标签
            await operationWrapper.executeWithUnlockLock(
                '添加标签',
                async () => {
                    await this.performAddTag(blockElement, selectedTag);
                }
            );
        }
    }
    
    /**
     * 检查文档是否处于只读状态
     */
    private checkDocumentReadonly(): boolean {
        const readonlyBtn = document.querySelector('.protyle-breadcrumb button[data-type="readonly"]');
        
        if (!readonlyBtn) {
            this.debugLog('[TagManager] ⚠️ 未找到面包屑锁按钮');
            return false;
        }
        
        const ariaLabel = readonlyBtn.getAttribute('aria-label') || '';
        const dataSubtype = readonlyBtn.getAttribute('data-subtype') || '';
        const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
        
        const isUnlocked = 
            dataSubtype === 'unlock' || 
            ariaLabel.includes('取消') ||
            iconHref === '#iconUnlock';
        
        return !isUnlocked;
    }
    
    /**
     * 显示标签选择对话框
     */
    private showTagSelectionDialog(blockText: string): Promise<typeof PRESET_TAGS[number] | null> {
        return new Promise((resolve) => {
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
            `;
            
            // 创建对话框
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: var(--b3-theme-background);
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                max-width: 90vw;
                width: 500px;
                box-sizing: border-box;
                border: 1px solid var(--b3-theme-surface-lighter);
            `;
            
            // 标题
            const title = document.createElement('div');
            title.textContent = '快速打标签';
            title.style.cssText = `
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 12px;
                color: var(--b3-theme-on-background);
            `;
            
            // 块文本预览
            const preview = document.createElement('div');
            preview.textContent = blockText + (blockText.length >= 50 ? '...' : '');
            preview.style.cssText = `
                font-size: 14px;
                color: var(--b3-theme-on-surface-light);
                margin-bottom: 20px;
                padding: 12px;
                background: var(--b3-theme-surface);
                border-radius: 6px;
                max-height: 100px;
                overflow-y: auto;
            `;
            
            // 标签网格容器
            const tagsGrid = document.createElement('div');
            tagsGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 20px;
            `;
            
            // 创建标签按钮
            PRESET_TAGS.forEach(tag => {
                const tagButton = document.createElement('button');
                tagButton.innerHTML = `${tag.emoji} ${tag.name}`;
                tagButton.style.cssText = `
                    padding: 16px 20px;
                    background: var(--b3-theme-surface);
                    color: var(--b3-theme-on-background);
                    border: 2px solid ${tag.color};
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                `;
                
                // 悬停效果
                tagButton.addEventListener('mouseenter', () => {
                    tagButton.style.background = tag.color;
                    tagButton.style.color = 'white';
                    tagButton.style.transform = 'scale(1.05)';
                });
                
                tagButton.addEventListener('mouseleave', () => {
                    tagButton.style.background = 'var(--b3-theme-surface)';
                    tagButton.style.color = 'var(--b3-theme-on-background)';
                    tagButton.style.transform = 'scale(1)';
                });
                
                // 点击选择
                tagButton.addEventListener('click', () => {
                    resolve(tag);
                    cleanup();
                });
                
                tagsGrid.appendChild(tagButton);
            });
            
            // 取消按钮
            const cancelButton = document.createElement('button');
            cancelButton.textContent = '取消';
            cancelButton.style.cssText = `
                width: 100%;
                padding: 12px;
                background: var(--b3-theme-surface);
                color: var(--b3-theme-on-surface);
                border: 1px solid var(--b3-theme-surface-lighter);
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            `;
            
            cancelButton.addEventListener('click', () => {
                resolve(null);
                cleanup();
            });
            
            // 组装界面
            dialog.appendChild(title);
            dialog.appendChild(preview);
            dialog.appendChild(tagsGrid);
            dialog.appendChild(cancelButton);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // 清理函数
            const cleanup = () => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            };
            
            // ESC 关闭
            const handleKeydown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    resolve(null);
                    cleanup();
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);
            
            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    resolve(null);
                    cleanup();
                }
            });
        });
    }
    
    /**
     * 执行添加标签的核心逻辑
     */
    private async performAddTag(blockElement: HTMLElement, tag: typeof PRESET_TAGS[number]): Promise<void> {
        try {
            console.log('[TagManager] 🏷️ 开始添加标签...');
            
            // 获取编辑器
            const editors = getAllEditor();
            if (editors.length === 0) {
                throw new Error('没有可用的编辑器');
            }
            
            const protyle = editors[0].protyle;
            if (!protyle || !protyle.toolbar) {
                throw new Error('编辑器toolbar不可用');
            }
            
            // 获取块ID
            const blockId = blockElement.getAttribute('data-node-id');
            if (!blockId) {
                throw new Error('未找到块ID');
            }
            
            // 在块的末尾添加标签
            // 思源笔记的标签格式是 #标签名#
            const tagText = `#${tag.name}#`;
            
            console.log('[TagManager] 添加标签:', {
                blockId,
                tagName: tag.name,
                tagText
            });
            
            // 查找内容区域
            const contentDiv = blockElement.querySelector('div[contenteditable]') || 
                              blockElement.querySelector('div');
            
            if (!contentDiv) {
                throw new Error('未找到内容区域');
            }
            
            // 在内容末尾添加标签
            const currentContent = contentDiv.innerHTML;
            const newContent = currentContent + ` ${tagText}`;
            contentDiv.innerHTML = newContent;
            
            // 保存到思源
            const response = await fetch('/api/block/updateBlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dataType: 'dom',
                    data: newContent,
                    id: blockId
                })
            });
            
            const result = await response.json();
            
            if (result.code === 0) {
                console.log('[TagManager] ✅ 标签添加成功');
            } else {
                throw new Error(`标签添加失败: ${result.msg}`);
            }
            
        } catch (error) {
            console.error('[TagManager] ❌ 标签添加失败:', error);
            throw error;
        }
    }
}

