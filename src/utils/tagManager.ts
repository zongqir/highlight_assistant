import Logger from './logger';
/**
 * 标签管理器 - 快速为块添加标签
 */

import { operationWrapper } from './operationWrapper';
import { updateBlock } from '../api';
import { isCurrentDocumentReadonly, isCurrentDocumentEditable } from './readonlyButtonUtils';
import { showTagSelectionDialog } from './tagSelectionDialog';

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
            
            Logger.log('🎯 检测到 contextmenu 事件');
            
            // 🔑 关键：手机长按会触发 contextmenu，需要检查是否有文本被选中
            const selection = window.getSelection();
            const selectedText = selection ? selection.toString().trim() : '';
            
            if (selectedText.length > 0) {
                Logger.log('🎯 ⛔ 检测到文本选中，不显示标签面板');
                return; // 有文本选中，不显示标签面板
            }
            
            // 查找块元素
            const blockElement = this.findBlockElementFromNode(target);
            
            if (blockElement) {
                // 检查是否处于只读状态
                const isDocReadonly = isCurrentDocumentReadonly();
                
                if (isDocReadonly) {
                    // 阻止默认右键菜单
                    e.preventDefault();
                    e.stopPropagation();
                    
                    Logger.log('🎯 ✅ 右键/长按无文本选中，显示标签面板');
                    this.showTagPanel(blockElement);
                }
            }
        }, true);
        
        // 手机版：监听双击（touch事件）
        let lastTouchTime = 0;
        let lastTouchTarget: HTMLElement | null = null;
        let touchStartTime = 0;
        let hasMoved = false;
        let lastLongPressTime = 0; // 记录上次长按的时间
        const doubleTapDelay = 300; // 双击间隔时间（毫秒）
        const longPressThreshold = 500; // 长按阈值，超过这个时间不算点击
        const longPressCooldown = 1000; // 长按后的冷却时间（1秒内不响应双击）
        
        // 记录 touchstart
        document.addEventListener('touchstart', () => {
            touchStartTime = Date.now();
            hasMoved = false;
        }, { passive: true, capture: true });
        
        // 检测是否移动（长按选择文字会移动）
        document.addEventListener('touchmove', () => {
            hasMoved = true;
        }, { passive: true, capture: true });
        
        // 检测双击
        document.addEventListener('touchend', (e) => {
            const target = e.target as HTMLElement;
            const currentTime = Date.now();
            const touchDuration = currentTime - touchStartTime;
            const timeSinceLastTouch = currentTime - lastTouchTime;
            const timeSinceLastLongPress = currentTime - lastLongPressTime;
            
            Logger.log(`📱 touchend: duration=${touchDuration}ms, moved=${hasMoved}, timeSinceLastLongPress=${timeSinceLastLongPress}ms`);
            
            // 🔑 关键1：如果刚刚有过长按（1秒内），禁用双击
            if (timeSinceLastLongPress < longPressCooldown) {
                Logger.log('📱 ⛔ 长按冷却期内，禁用双击');
                lastTouchTime = 0;
                lastTouchTarget = null;
                return;
            }
            
            // 🔑 关键2：如果是长按（超过500ms）或者有移动，不算点击
            if (touchDuration > longPressThreshold || hasMoved) {
                Logger.log('📱 ⛔ 长按或移动，记录长按时间');
                lastLongPressTime = currentTime; // 记录长按时间
                lastTouchTime = 0;
                lastTouchTarget = null;
                return;
            }
            
            // 🔑 关键3：检查是否有文本被选中（长按选择文字后）
            const selection = window.getSelection();
            const selectedText = selection ? selection.toString().trim() : '';
            if (selectedText.length > 0) {
                Logger.log('📱 ⛔ 检测到文本选中，禁用双击');
                lastLongPressTime = currentTime; // 也记录为长按
                lastTouchTime = 0;
                lastTouchTarget = null;
                return;
            }
            
            // 查找块元素
            const blockElement = this.findBlockElementFromNode(target);
            
            if (blockElement) {
                // 检查是否是双击（同一个块，且间隔小于300ms）
                if (lastTouchTarget === blockElement && timeSinceLastTouch < doubleTapDelay) {
                    Logger.log('📱 ✅ 检测到双击！');
                    
                    // 检查是否处于只读状态
                    const isDocReadonly = isCurrentDocumentReadonly();
                    
                    if (isDocReadonly) {
                        // 阻止默认行为
                        e.preventDefault();
                        
                        Logger.log('📱 ✅ 双击触发，显示标签面板');
                        this.showTagPanel(blockElement);
                    }
                    
                    // 重置，避免三击触发
                    lastTouchTime = 0;
                    lastTouchTarget = null;
                } else {
                    // 记录这次点击
                    lastTouchTime = currentTime;
                    lastTouchTarget = blockElement;
                    Logger.log('📱 记录第一次点击');
                }
            }
        }, { passive: false, capture: true });
        
        Logger.log('✅ 块点击监听已注册（右键点击 + 双击）');
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
        const result = await showTagSelectionDialog(blockText, PRESET_TAGS);
        
        if (result) {
            if (result.tag) {
                Logger.log('📤 用户选择标签:', result.tag.name);
            }
            if (result.comment) {
                Logger.log('📝 用户添加评论:', result.comment);
            }
            
            // 🛡️ 兜底防御：再次检查文档锁定状态
            if (this.isDocumentEditableCheck()) {
                Logger.error('🛡️ 兜底防御触发：文档处于可编辑状态，拒绝添加内容');
                this.showEditableWarningDialog();
                return;
            }
            
            // 应用标签和/或评论（performAddTag内部已有executeWithUnlockLock包装，不需要再包装）
            await this.performAddTag(blockElement, result.tag, result.comment);
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
     * 执行添加标签和/或评论的核心逻辑
     * 
     * 修复说明：
     * - v1.0: 使用 markdown 格式 #emoji+name# 添加标签（依赖设置）
     * - v1.1: 使用 DOM 格式 <span data-type="tag">内容</span>，但从 API 获取内容
     * - v1.2: 🔧 修复BUG - 从 DOM 直接获取 HTML 内容，避免标签变成字符串
     *   - 问题：getBlockByID 返回的 content 是纯文本，会丢失已有标签的 DOM 结构
     *   - 解决：直接从 DOM 元素获取当前的 HTML 内容
     * - v1.3: ✨ 新增 - 支持块级评论功能，可以只添加评论或同时添加标签+评论
     */
    private async performAddTag(blockElement: HTMLElement, tag?: typeof PRESET_TAGS[number], comment?: string): Promise<void> {
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
                // 🔧 修复：从 DOM 直接获取内容，而不是从 API
                // 查找可编辑的内容区域
                const contentDiv = blockElement.querySelector('div[contenteditable]') as HTMLElement;
                
                if (!contentDiv) {
                    throw new Error('未找到可编辑的内容区域');
                }
                
                // 获取当前的 HTML 内容（保留已有的标签结构）
                let currentHTML = contentDiv.innerHTML.trim();
                
                this.debugLog('当前块HTML:', currentHTML);
                
                // 🔧 移除末尾的零宽空格（思源常用的占位符）
                currentHTML = currentHTML.replace(/​+$/, '');
                
                let newContent = currentHTML;
                
                // 如果有评论，把整个块的文字包裹成带备注的
                if (comment) {
                    // 把当前内容包裹在 inline-memo 中（就像对整段文字添加备注）
                    const commentDOM = `<span data-type="inline-memo" data-inline-memo-content="${this.escapeHtml(comment)}">${newContent}</span>`;
                    newContent = commentDOM;
                    
                    this.debugLog('把整个块内容包裹为备注:', comment);
                }
                
                // 如果有标签，在末尾添加标签
                if (tag) {
                    // 构建新标签的 DOM
                    const tagContent = `${tag.emoji}${tag.name}`;
                    const tagDOM = `<span data-type="tag">${tagContent}</span>`;
                    
                    // 确保标签前有空格
                    if (newContent && !newContent.endsWith(' ') && !newContent.endsWith('&nbsp;')) {
                        newContent += ' ';
                    }
                    
                    newContent += tagDOM;
                    this.debugLog('添加标签:', tag.name);
                }
                
                this.debugLog('新DOM内容:', newContent);
                
                // 使用 DOM 格式更新块
                const result = await updateBlock('dom', newContent, blockId);
                
                this.debugLog('更新结果:', result);
                
                Logger.log('✅ 内容添加成功:', {
                    blockId,
                    tagName: tag?.name || '无',
                    emoji: tag?.emoji || '无',
                    hasComment: !!comment,
                    commentOnly: !tag && !!comment,
                    method: 'DOM (从元素获取 - v1.3评论支持)'
                });
            });
            
        } catch (error) {
            Logger.error('❌ 标签添加失败:', error);
            throw error;
        }
    }
    
    /**
     * 转义HTML特殊字符
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}




