/**
 * 标签管理器 - 快速为块添加标签
 */

import { operationWrapper } from './operationWrapper';
import { getAllEditor } from "siyuan";
import { getBlockByID, updateBlock } from '../api';

// 内置标签配置
const PRESET_TAGS = [
    { id: 'important', name: '重点', color: '#ff4444', emoji: '⭐' },
    { id: 'difficult', name: '难点', color: '#ff9800', emoji: '🔥' },
    { id: 'mistake', name: '易错点', color: '#9c27b0', emoji: '⚡' },
    { id: 'memory', name: '记忆点', color: '#2196f3', emoji: '💭' },
    { id: 'explore', name: '挖掘点', color: '#4caf50', emoji: '🔍' },
    { id: 'check', name: '检查点', color: '#00bcd4', emoji: '✅' },
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
            // 添加动画样式
            const style = document.createElement('style');
            style.textContent = `
                @keyframes tagOverlayFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes tagDialogSlideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(30px) scale(0.9);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0) scale(1);
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
                background: rgba(0, 0, 0, 0.65);
                backdrop-filter: blur(6px);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
                animation: tagOverlayFadeIn 0.25s ease-out;
            `;
            
            // 创建对话框
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: var(--b3-theme-background);
                padding: 32px;
                border-radius: 20px;
                box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
                max-width: 90vw;
                width: 560px;
                box-sizing: border-box;
                animation: tagDialogSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            `;
            
            // 标题
            const title = document.createElement('div');
            title.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 28px; line-height: 1;">🏷️</span>
                    <span style="font-size: 22px; font-weight: 600; letter-spacing: -0.5px;">快速打标签</span>
                </div>
            `;
            title.style.cssText = `
                color: var(--b3-theme-on-background);
                margin-bottom: 10px;
            `;
            
            // 块文本预览
            const preview = document.createElement('div');
            const displayText = blockText.length > 60 ? blockText.substring(0, 60) + '...' : blockText;
            preview.textContent = displayText;
            preview.style.cssText = `
                font-size: 14px;
                line-height: 1.6;
                color: var(--b3-theme-on-surface-light);
                margin-bottom: 28px;
                padding: 16px 18px;
                background: linear-gradient(135deg, var(--b3-theme-surface) 0%, var(--b3-theme-surface-light) 100%);
                border-radius: 12px;
                border-left: 4px solid var(--b3-theme-primary);
                max-height: 80px;
                overflow-y: auto;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            `;
            
            // 标签网格容器
            const tagsGrid = document.createElement('div');
            tagsGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
                margin-bottom: 28px;
            `;
            
            // 创建标签按钮
            PRESET_TAGS.forEach((tag, index) => {
                const tagButton = document.createElement('button');
                
                // 创建按钮内容
                const content = document.createElement('div');
                content.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    position: relative;
                    z-index: 1;
                `;
                content.innerHTML = `
                    <span style="font-size: 24px; line-height: 1;">${tag.emoji}</span>
                    <span style="font-weight: 600; font-size: 16px;">${tag.name}</span>
                `;
                
                tagButton.appendChild(content);
                tagButton.style.cssText = `
                    padding: 20px 16px;
                    border: 2px solid transparent;
                    background: linear-gradient(135deg, ${tag.color}18, ${tag.color}28);
                    color: var(--b3-theme-on-background);
                    border-radius: 14px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    animation: tagDialogSlideUp ${0.35 + index * 0.06}s cubic-bezier(0.34, 1.56, 0.64, 1);
                `;
                
                // 创建光效层
                const shine = document.createElement('div');
                shine.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, ${tag.color}40, ${tag.color}60);
                    opacity: 0;
                    transition: opacity 0.3s;
                    border-radius: 12px;
                `;
                tagButton.appendChild(shine);
                
                tagButton.addEventListener('mouseenter', () => {
                    tagButton.style.borderColor = tag.color;
                    tagButton.style.transform = 'translateY(-4px) scale(1.03)';
                    tagButton.style.boxShadow = `0 12px 28px ${tag.color}50, 0 0 0 1px ${tag.color}30`;
                    shine.style.opacity = '1';
                });
                
                tagButton.addEventListener('mouseleave', () => {
                    tagButton.style.borderColor = 'transparent';
                    tagButton.style.transform = 'translateY(0) scale(1)';
                    tagButton.style.boxShadow = 'none';
                    shine.style.opacity = '0';
                });
                
                tagButton.addEventListener('click', () => {
                    tagButton.style.transform = 'scale(0.96)';
                    setTimeout(() => {
                        resolve(tag);
                        cleanup();
                    }, 120);
                });
                
                tagsGrid.appendChild(tagButton);
            });
            
            // 取消按钮
            const cancelButton = document.createElement('button');
            cancelButton.textContent = '取消';
            cancelButton.style.cssText = `
                width: 100%;
                padding: 15px;
                border: 2px solid var(--b3-theme-surface-lighter);
                background: var(--b3-theme-surface);
                color: var(--b3-theme-on-surface);
                border-radius: 12px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                transition: all 0.25s;
            `;
            
            cancelButton.addEventListener('mouseenter', () => {
                cancelButton.style.background = 'var(--b3-theme-surface-light)';
                cancelButton.style.borderColor = 'var(--b3-theme-on-surface-light)';
                cancelButton.style.transform = 'translateY(-1px)';
            });
            
            cancelButton.addEventListener('mouseleave', () => {
                cancelButton.style.background = 'var(--b3-theme-surface)';
                cancelButton.style.borderColor = 'var(--b3-theme-surface-lighter)';
                cancelButton.style.transform = 'translateY(0)';
            });
            
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
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
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
            this.debugLog('[TagManager] 🏷️ 开始添加标签...');
            
            // 获取块ID
            const blockId = blockElement.getAttribute('data-node-id');
            if (!blockId) {
                throw new Error('未找到块ID');
            }
            
            this.debugLog('[TagManager] 获取块ID:', blockId);
            
            // 使用 operationWrapper 包裹操作
            await operationWrapper.executeWithUnlockLock('添加标签', async () => {
                // 获取块的完整信息
                const block = await getBlockByID(blockId);
                
                if (!block) {
                    throw new Error('未找到块信息');
                }
                
                this.debugLog('[TagManager] 当前块内容:', block.content);
                
                // 思源标签格式是 #表情+标签名#
                const tagText = `#${tag.emoji}${tag.name}#`;
                
                // 在markdown内容末尾添加标签（使用空格分隔）
                const newMarkdown = block.markdown.trim() + ' ' + tagText;
                
                this.debugLog('[TagManager] 新markdown内容:', newMarkdown);
                
                // 使用 markdown 格式更新块，思源会自动转换为正确的DOM格式
                const result = await updateBlock('markdown', newMarkdown, blockId);
                
                this.debugLog('[TagManager] 更新结果:', result);
                
                console.log('[TagManager] ✅ 标签添加成功:', {
                    blockId,
                    tagName: tag.name,
                    emoji: tag.emoji
                });
            });
            
        } catch (error) {
            console.error('[TagManager] ❌ 标签添加失败:', error);
            throw error;
        }
    }
}

