import Logger from './logger';
/**
 * 标签管理器 - 快速为块添加标签
 */

import { operationWrapper } from './operationWrapper';
import { updateBlock } from '../api';
import { isCurrentDocumentReadonly } from './readonlyButtonUtils';
import { showTagSelectionDialog, type PresetTag } from './tagSelectionDialog';

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
                // 检查是否处于只读状态 或 Ctrl+右键（编辑模式快捷方式）
                const isDocReadonly = isCurrentDocumentReadonly();
                const isCtrlRightClick = e.ctrlKey || e.metaKey; // Ctrl (Windows/Linux) 或 Cmd (Mac)
                
                if (isDocReadonly || isCtrlRightClick) {
                    // 阻止默认右键菜单
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (isCtrlRightClick && !isDocReadonly) {
                        Logger.log('🎯 ✅ Ctrl+右键（编辑模式快捷方式），显示标签面板');
                    } else {
                        Logger.log('🎯 ✅ 右键/长按无文本选中，显示标签面板');
                    }
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
        
        // 检查是否是标题块
        const blockType = blockElement.getAttribute('data-type');
        const blockSubtype = blockElement.getAttribute('data-subtype');
        const isHeading = blockType === 'heading' || blockSubtype?.startsWith('h') || false;
        
        // 显示标签选择对话框
        const result = await showTagSelectionDialog(blockText, PRESET_TAGS, isHeading);
        
        if (result) {
            if (result.tag) {
                Logger.log('📤 用户选择标签:', result.tag.name);
            }
            if (result.comment) {
                Logger.log('📝 用户添加评论:', result.comment);
            }
            
            // 应用标签和/或评论（performAddTag内部已有executeWithUnlockLock包装，会自动处理锁定状态）
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
    private async performAddTag(blockElement: HTMLElement, tag?: PresetTag, comment?: string): Promise<void> {
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
                
                // 🔑 关键：获取块的类型信息（h1、h2等）
                const blockType = blockElement.getAttribute('data-type');
                const blockSubtype = blockElement.getAttribute('data-subtype');
                
                this.debugLog('块类型:', { blockType, blockSubtype });
                
                // 获取当前的 HTML 内容（保留已有的标签结构）
                let currentHTML = contentDiv.innerHTML.trim();
                
                Logger.log('🔍 [调试] 当前块原始HTML:', currentHTML);
                Logger.log('🔍 [调试] HTML长度:', currentHTML.length);
                
                // 🔧 移除末尾的零宽空格（思源常用的占位符 U+200B）
                currentHTML = currentHTML.replace(/(\u200B|​)+$/g, '');
                
                // 🔑 关键修复：提取已有的标签，避免被包裹在 memo 中
                const existingTags: string[] = [];
                let contentWithoutTags = currentHTML;
                
                // 使用临时容器来解析HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = currentHTML;
                
                // 提取所有标签
                const tagElements = tempDiv.querySelectorAll('span[data-type="tag"]');
                tagElements.forEach(tagEl => {
                    existingTags.push(tagEl.outerHTML);
                    tagEl.remove(); // 从临时容器中移除
                });
                
                // 获取去掉标签后的内容
                contentWithoutTags = tempDiv.innerHTML;
                
                Logger.log('🔍 [调试] 去掉标签后的原始内容:', JSON.stringify(contentWithoutTags));
                Logger.log('🔍 [调试] 内容长度:', contentWithoutTags.length);
                Logger.log('🔍 [调试] 是否以空格结尾:', contentWithoutTags.endsWith(' '));
                Logger.log('🔍 [调试] 是否以&nbsp;结尾:', contentWithoutTags.endsWith('&nbsp;'));
                Logger.log('🔍 [调试] 末尾10个字符:', JSON.stringify(contentWithoutTags.slice(-10)));
                
                // 🔧 关键修复：移除末尾的所有空白字符，避免空格累积
                // 包括：普通空格、&nbsp;、零宽空格（​ U+200B，思源常用的占位符）
                // 标签前的空格会在后面统一添加
                contentWithoutTags = contentWithoutTags
                    .replace(/(&nbsp;|\s|\u200B|​)+$/g, '')  // 移除末尾的所有空白字符
                    .trim();
                
                Logger.log('🔍 [调试] 清理后的内容:', JSON.stringify(contentWithoutTags));
                Logger.log('🔍 [调试] 清理后长度:', contentWithoutTags.length);
                Logger.log('🔍 [调试] 清理后是否还有尾随空格:', contentWithoutTags.endsWith(' ') || contentWithoutTags.endsWith('&nbsp;'));
                
                this.debugLog('提取到已有标签:', existingTags.length, '个');
                this.debugLog('已有标签内容:', existingTags);
                
                let newContent = contentWithoutTags;
                
                // 如果有评论，把文字内容（不包括标签）包裹成带备注的
                if (comment) {
                    // 把当前内容包裹在 inline-memo 中（就像对整段文字添加备注）
                    const commentDOM = `<span data-type="inline-memo" data-inline-memo-content="${this.escapeHtml(comment)}">${newContent}</span>`;
                    newContent = commentDOM;
                    
                    this.debugLog('把文字内容包裹为备注:', comment);
                }
                
                // 恢复已有的标签（在 memo 后面）
                if (existingTags.length > 0) {
                    // 🔧 确保标签前有且仅有一个空格
                    if (newContent && !newContent.endsWith(' ') && !newContent.endsWith('&nbsp;')) {
                        newContent += ' ';
                        this.debugLog('添加空格（恢复标签前）');
                    } else {
                        this.debugLog('已有空格，无需添加（恢复标签前）');
                    }
                    newContent += existingTags.join(' ');
                    this.debugLog('恢复已有标签:', existingTags.length, '个');
                }
                
                // 如果有新标签，在末尾添加
                if (tag) {
                    // 构建新标签的 DOM
                    const tagContent = `${tag.emoji}${tag.name}`;
                    const tagDOM = `<span data-type="tag">${tagContent}</span>`;
                    
                    // 🔧 确保标签前有且仅有一个空格
                    if (newContent && !newContent.endsWith(' ') && !newContent.endsWith('&nbsp;')) {
                        newContent += ' ';
                        this.debugLog('添加空格（新标签前）');
                    } else {
                        this.debugLog('已有空格，无需添加（新标签前）');
                    }
                    
                    newContent += tagDOM;
                    this.debugLog('添加新标签:', tag.name);
                }
                
                this.debugLog('新DOM内容:', newContent);
                
                // 🔑 根据块类型选择更新方式
                let result;
                if (blockType === 'heading' || blockSubtype?.startsWith('h')) {
                    // ⚠️ 标题块：思源的标题不支持inline-memo，所以评论功能在标题块上无效
                    if (comment) {
                        Logger.warn('⚠️ 标题块不支持inline-memo格式，评论功能无法在标题块上使用');
                        Logger.warn('💡 建议：将此块转换为普通段落后再添加评论，或只在标题上添加标签');
                    }
                    
                    // 🔧 修复：标题块使用 markdown + HTML 混合格式
                    // 这样既能保留 h1-h6 格式，标签又能在手机版正常显示（不会变成 #标签# 文本）
                    const headingPrefix = this.getHeadingPrefix(blockSubtype);
                    
                    // 🔧 如果有 inline-memo（评论），先移除它，因为标题块不支持
                    if (comment) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = newContent;
                        
                        // 移除 inline-memo 但保留其文本内容
                        tempDiv.querySelectorAll('span[data-type="inline-memo"]').forEach(m => {
                            const textNode = document.createTextNode(m.textContent || '');
                            m.replaceWith(textNode);
                        });
                        
                        newContent = tempDiv.innerHTML;
                        Logger.log('📝 标题块：移除inline-memo，保留文本');
                    }
                    
                    // 🔧 清理多余空格，避免空格累积
                    // 注意：要保留标签的 HTML 结构，不要转换为 #标签# 文本
                    const cleanedContent = newContent
                        .trim()
                        .replace(/&nbsp;/g, ' ')           // 将 &nbsp; 转换为普通空格
                        .replace(/\s+/g, ' ')              // 将多个连续空格合并为一个
                        .replace(/\s+<span/g, ' <span');  // 确保 <span 前只有一个空格
                    
                    // 🔑 关键：markdown 支持嵌入 HTML，所以直接拼接
                    // 格式：# 标题文本 <span data-type="tag">⭐重点</span>
                    // 这样标签会被正确渲染，不会显示为 #标签# 文本
                    const markdownWithHTML = `${headingPrefix} ${cleanedContent}`;
                    
                    Logger.log('📝 标题块使用markdown+HTML混合格式（保留h1-h6 + 标签不变文本）:', markdownWithHTML);
                    result = await updateBlock('markdown', markdownWithHTML, blockId);
                } else {
                    // 普通块：使用DOM格式
                    this.debugLog('普通块使用DOM格式');
                    result = await updateBlock('dom', newContent, blockId);
                }
                
                this.debugLog('更新结果:', result);
                
                Logger.log('✅ 内容添加成功:', {
                    blockId,
                    blockType,
                    blockSubtype,
                    tagName: tag?.name || '无',
                    emoji: tag?.emoji || '无',
                    hasComment: !!comment,
                    commentOnly: !tag && !!comment,
                    method: (blockType === 'heading' || blockSubtype?.startsWith('h')) ? 'Markdown+HTML混合（标题块）' : 'DOM格式（普通块）',
                    note: (blockType === 'heading' || blockSubtype?.startsWith('h')) ? '保留h1-h6格式，标签使用HTML不会变文字' : ''
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
    
    /**
     * 根据块子类型获取标题的markdown前缀
     */
    private getHeadingPrefix(subtype: string | null): string {
        if (!subtype) return '#';
        
        switch (subtype) {
            case 'h1': return '#';
            case 'h2': return '##';
            case 'h3': return '###';
            case 'h4': return '####';
            case 'h5': return '#####';
            case 'h6': return '######';
            default: return '#';
        }
    }
}




