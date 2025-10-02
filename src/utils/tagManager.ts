import Logger from './logger';
/**
 * 标签管理器 - 快速为块添加标签
 */

import { operationWrapper } from './operationWrapper';
import { getAllEditor } from "siyuan";
import { getBlockByID, updateBlock } from '../api';
import { isCurrentDocumentReadonly, isCurrentDocumentEditable } from './readonlyButtonUtils';

// 内置标签配置
const PRESET_TAGS = [
    { id: 'important', name: '重点', color: '#ff4444', emoji: '⭐' },
    { id: 'difficult', name: '难点', color: '#ff9800', emoji: '🔥' },
    { id: 'mistake', name: '易错', color: '#9c27b0', emoji: '⚡' },
    { id: 'memory', name: '记忆', color: '#2196f3', emoji: '💭' },
    { id: 'explore', name: '挖掘', color: '#4caf50', emoji: '🔍' },
    { id: 'check', name: '检查', color: '#00bcd4', emoji: '✅' },
    { id: 'practice', name: '练习', color: '#8bc34a', emoji: '✍️' },
    { id: 'question', name: '疑问', color: '#ffc107', emoji: '❓' }
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
        Logger.log('✅ 调试模式已开启');
    }
    
    /**
     * 关闭调试模式
     */
    public disableDebug(): void {
        this.debugMode = false;
        Logger.log('❌ 调试模式已关闭');
    }
    
    /**
     * 调试日志
     */
    private debugLog(...args: any[]): void {
        if (this.debugMode) {
            Logger.log(...args);
        }
    }
    
    /**
     * 初始化标签功能
     */
    public initialize(): void {
        Logger.log('🚀 标签管理器初始化...');
        
        // 设置块点击监听
        this.setupBlockClickListener();
        
        // 延迟设置初始化完成标记
        setTimeout(() => {
            this.isInitialized = true;
            Logger.log('✅ 标签管理器初始化完成');
        }, 2000);
    }
    
    /**
     * 设置块点击监听
     */
    private setupBlockClickListener(): void {
        // 桌面版：监听鼠标右键点击块
        document.addEventListener('contextmenu', (e) => {
            const target = e.target as HTMLElement;
            
            this.debugLog('🎯 检测到右键点击');
            
            // 查找块元素
            const blockElement = this.findBlockElementFromNode(target);
            
            if (blockElement) {
                // 检查是否处于只读状态
                const isDocReadonly = isCurrentDocumentReadonly();
                
                if (isDocReadonly) {
                    // 阻止默认右键菜单
                    e.preventDefault();
                    e.stopPropagation();
                    
                    this.debugLog('找到块元素，显示标签面板');
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
            
            this.debugLog('📱 检测到触摸开始');
            
            // 查找块元素
            const blockElement = this.findBlockElementFromNode(target);
            
            if (blockElement) {
                // 设置长按定时器（500ms）
                touchTimer = setTimeout(() => {
                    // 检查是否处于只读状态
                    const isDocReadonly = isCurrentDocumentReadonly();
                    
                    if (isDocReadonly) {
                        // 阻止默认行为
                        e.preventDefault();
                        
                        this.debugLog('📱 长按触发，显示标签面板');
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
                this.debugLog('📱 长按取消');
            }
        };
        
        document.addEventListener('touchend', cancelTouch, true);
        document.addEventListener('touchmove', cancelTouch, true);
        document.addEventListener('touchcancel', cancelTouch, true);
        
        Logger.log('✅ 块点击监听已注册（右键点击 + 长按）');
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
                    this.debugLog('找到块元素:', { nodeId, dataType });
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
        
        this.debugLog('显示标签面板:', { blockId, blockText });
        
        // 🎨 检查块是否包含复杂样式，如果有则阻止打标签
        if (this.hasComplexStyles(blockElement)) {
            this.showStyleWarningDialog();
            return;
        }
        
        // 显示标签选择对话框
        const selectedTag = await this.showTagSelectionDialog(blockText);
        
        if (selectedTag) {
            Logger.log('📤 用户选择标签:', selectedTag.name);
            
            // 🛡️ 兜底防御：再次检查文档锁定状态
            if (this.isDocumentEditableCheck()) {
                Logger.error('🛡️ 兜底防御触发：文档处于可编辑状态，拒绝添加标签');
                this.showEditableWarningDialog();
                return;
            }
            
            // 应用标签（performAddTag内部已有executeWithUnlockLock包装，不需要再包装）
            await this.performAddTag(blockElement, selectedTag);
        }
    }
    
    /**
     * 检查块是否包含复杂样式，避免标签操作破坏格式
     * 检测：内联样式、代码块、数学公式
     */
    private hasComplexStyles(blockElement: HTMLElement): boolean {
        try {
            // 获取块的HTML内容
            const innerHTML = blockElement.innerHTML;
            
            // 🎨 检查是否包含内联样式 style=
            if (innerHTML.includes('style=')) {
                Logger.log('🎨 检测到内联样式，阻止打标签');
                return true;
            }
            
            // 💻 检查是否是代码块
            if (blockElement.getAttribute('data-type') === 'code' || 
                blockElement.querySelector('code') ||
                blockElement.classList.contains('code-block') ||
                innerHTML.includes('hljs')) {
                Logger.log('💻 检测到代码块，阻止打标签');
                return true;
            }
            
            // 📐 检查是否是数学公式块
            if (blockElement.getAttribute('data-type') === 'mathBlock' ||
                blockElement.querySelector('.katex') ||
                innerHTML.includes('\\(') || 
                innerHTML.includes('\\[') ||
                innerHTML.includes('katex')) {
                Logger.log('📐 检测到数学公式，阻止打标签');
                return true;
            }
            
            return false;
            
        } catch (error) {
            Logger.error('❌ 样式检查失败:', error);
            // 出错时保守处理，阻止打标签
            return true;
        }
    }
    
    /**
     * 显示样式警告对话框
     */
    private showStyleWarningDialog(): void {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            animation: fadeIn 0.25s ease-out;
        `;
        
        // 创建警告对话框
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: var(--b3-theme-background);
            padding: 32px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            border: 1px solid var(--b3-theme-surface-lighter);
            max-width: 90vw;
            width: 480px;
            text-align: center;
            transform: scale(0.9);
            animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        `;
        
        // 警告图标和标题
        const header = document.createElement('div');
        header.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 16px;">🎨</div>
            <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: var(--b3-theme-on-background);">
                检测到复杂样式
            </h2>
        `;
        
        // 警告内容
        const content = document.createElement('div');
        content.style.cssText = `
            color: var(--b3-theme-on-surface);
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 28px;
        `;
        content.innerHTML = `
            <p style="margin: 0 0 12px 0;">这个块包含以下内容之一：</p>
            <ul style="text-align: left; margin: 0 0 12px 0; padding-left: 20px; list-style: none;">
                <li style="margin: 6px 0;">🎨 内联样式 (style属性)</li>
                <li style="margin: 6px 0;">💻 代码块或代码高亮</li>
                <li style="margin: 6px 0;">📐 数学公式</li>
            </ul>
            <p style="margin: 0; color: var(--b3-theme-error);">
                <strong>为避免破坏格式，已阻止添加标签操作</strong>
            </p>
        `;
        
        // 确定按钮
        const okButton = document.createElement('button');
        okButton.textContent = '我知道了';
        okButton.style.cssText = `
            background: var(--b3-theme-primary);
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s;
            box-shadow: 0 2px 8px var(--b3-theme-primary)40;
        `;
        
        okButton.addEventListener('mouseenter', () => {
            okButton.style.transform = 'translateY(-2px) scale(1.02)';
            okButton.style.boxShadow = `0 6px 16px var(--b3-theme-primary)60`;
        });
        
        okButton.addEventListener('mouseleave', () => {
            okButton.style.transform = 'translateY(0) scale(1)';
            okButton.style.boxShadow = `0 4px 12px var(--b3-theme-primary)40`;
        });
        
        okButton.addEventListener('click', () => {
            cleanup();
        });
        
        // 组装界面
        dialog.appendChild(header);
        dialog.appendChild(content);
        dialog.appendChild(okButton);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 添加CSS动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes popIn {
                from { 
                    opacity: 0;
                    transform: scale(0.8) translateY(20px);
                }
                to { 
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
        
        // 清理函数
        const cleanup = () => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        };
        
        // ESC关闭
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
        
        // 3秒后自动关闭
        setTimeout(cleanup, 3000);
    }
    
    /**
     * 🛡️ 兜底防御：检查当前活跃文档是否处于可编辑状态
     * 基于思源笔记源码的正确实现，每次都获取当前活跃tab
     */
    private isDocumentEditableCheck(): boolean {
        // 使用统一的工具函数
        return isCurrentDocumentEditable();
    }
    
    /**
     * 显示文档可编辑状态警告对话框
     */
    private showEditableWarningDialog(): void {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            animation: fadeIn 0.25s ease-out;
        `;
        
        // 创建警告对话框
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: var(--b3-theme-background);
            padding: 32px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            border: 1px solid var(--b3-theme-error);
            max-width: 90vw;
            width: 480px;
            text-align: center;
            transform: scale(0.9);
            animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        `;
        
        // 警告图标和标题
        const header = document.createElement('div');
        header.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 16px;">🛡️</div>
            <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: var(--b3-theme-error);">
                兜底防御触发
            </h2>
        `;
        
        // 警告内容
        const content = document.createElement('div');
        content.style.cssText = `
            color: var(--b3-theme-on-surface);
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 28px;
        `;
        content.innerHTML = `
            <p style="margin: 0 0 12px 0;">检测到文档处于<strong>可编辑状态</strong></p>
            <p style="margin: 0; color: var(--b3-theme-error);">
                <strong>为保护数据安全，已阻止标签操作</strong>
            </p>
            <p style="margin: 12px 0 0 0; font-size: 14px; color: var(--b3-theme-on-surface-light);">
                请先锁定文档后再进行标签操作
            </p>
        `;
        
        // 确定按钮
        const okButton = document.createElement('button');
        okButton.textContent = '我知道了';
        okButton.style.cssText = `
            background: var(--b3-theme-error);
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s;
            box-shadow: 0 2px 8px var(--b3-theme-error)40;
        `;
        
        okButton.addEventListener('mouseenter', () => {
            okButton.style.transform = 'translateY(-2px) scale(1.02)';
            okButton.style.boxShadow = `0 6px 16px var(--b3-theme-error)60`;
        });
        
        okButton.addEventListener('mouseleave', () => {
            okButton.style.transform = 'translateY(0) scale(1)';
            okButton.style.boxShadow = `0 4px 12px var(--b3-theme-error)40`;
        });
        
        okButton.addEventListener('click', () => {
            cleanup();
        });
        
        // 组装界面
        dialog.appendChild(header);
        dialog.appendChild(content);
        dialog.appendChild(okButton);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 添加CSS动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes popIn {
                from { 
                    opacity: 0;
                    transform: scale(0.8) translateY(20px);
                }
                to { 
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
        
        // 清理函数
        const cleanup = () => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        };
        
        // ESC关闭
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
        
        // 3秒后自动关闭
        setTimeout(cleanup, 3000);
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
            this.debugLog('🏷️ 开始添加标签...');
            
            // 获取块ID
            const blockId = blockElement.getAttribute('data-node-id');
            if (!blockId) {
                throw new Error('未找到块ID');
            }
            
            this.debugLog('获取块ID:', blockId);
            
            // 使用 operationWrapper 包裹操作
            await operationWrapper.executeWithUnlockLock('添加标签', async () => {
                // 获取块的完整信息
                const block = await getBlockByID(blockId);
                
                if (!block) {
                    throw new Error('未找到块信息');
                }
                
                this.debugLog('当前块内容:', block.content);
                
                // 思源标签格式是 #表情+标签名#
                const tagText = `#${tag.emoji}${tag.name}#`;
                
                // 在markdown内容末尾添加标签（使用空格分隔）
                const newMarkdown = block.markdown.trim() + ' ' + tagText;
                
                this.debugLog('新markdown内容:', newMarkdown);
                
                // 使用 markdown 格式更新块，思源会自动转换为正确的DOM格式
                const result = await updateBlock('markdown', newMarkdown, blockId);
                
                this.debugLog('更新结果:', result);
                
                Logger.log('✅ 标签添加成功:', {
                    blockId,
                    tagName: tag.name,
                    emoji: tag.emoji
                });
            });
            
        } catch (error) {
            Logger.error('❌ 标签添加失败:', error);
            throw error;
        }
    }
}




