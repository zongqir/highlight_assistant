/**
 * 思源工具栏劫持器 - 专门劫持手机版只读模式下的划线弹窗
 * 在原有复制弹窗基础上添加高亮功能
 */

import Logger from './logger';
import { getAllEditor, getActiveEditor } from "siyuan";
import type { HighlightColor } from '../types/highlight';
import { isSystemReadOnly, debugEnvironmentInfo, isDocumentReadOnlyFromRange } from './readonlyChecker';
import { updateBlock } from '../api';
import { MemoManager } from './memoManager';
import { StyleManager, HIGHLIGHT_COLORS } from './styleManager';
import { ToolbarButtonFactory } from './toolbarButtonFactory';
import { CustomToolbarManager } from './customToolbarManager';
import { operationWrapper } from './operationWrapper';
import { HighlightClickManager } from './highlightClickManager';
import { TagManager } from './tagManager';
import { TagClickManager } from './tagClickManager';
import { FlashcardQuickSwitchManager } from '../flashcard';

export class ToolbarHijacker {
    private originalShowContent: any = null;
    private isHijacked: boolean = false;
    private isMobile: boolean = false;
    private isDesktop: boolean = false;
    private api: any;
    private memoManager: MemoManager;
    private highlightClickManager: HighlightClickManager;
    private tagManager: TagManager;
    private tagClickManager: TagClickManager;
    private flashcardQuickSwitchManager: FlashcardQuickSwitchManager;
    private buttonFactory: ToolbarButtonFactory;
    private customToolbarManager: CustomToolbarManager;
    private activeEventListeners: (() => void)[] = [];
    private isInitialized: boolean = false; // 🔑 添加初始化完成标记
    
    constructor(isMobile: boolean = false, isDesktop: boolean = false) {
        this.isMobile = isMobile;
        this.isDesktop = isDesktop;
        
        Logger.log('📦 正在初始化管理器...');
        
        // 初始化备注管理器
        this.memoManager = new MemoManager();
        Logger.log('✅ MemoManager 已创建');
        
        // 初始化高亮点击管理器
        this.highlightClickManager = new HighlightClickManager();
        Logger.log('✅ HighlightClickManager 已创建');
        
        // 初始化标签管理器
        this.tagManager = new TagManager();
        Logger.log('✅ TagManager 已创建');
        
        // 初始化标签点击管理器
        this.tagClickManager = new TagClickManager();
        Logger.log('✅ TagClickManager 已创建');
        
        // 初始化闪卡快切管理器
        this.flashcardQuickSwitchManager = new FlashcardQuickSwitchManager({
            enabled: true,
            maxHistory: 10,
            ballPosition: { x: 20, y: 100 },
            autoHide: false,
            showUsageCount: true,
            enableDrag: true
        });
        Logger.log('✅ FlashcardQuickSwitchManager 已创建');
        
        // 在手机版和电脑版环境下都拦截原生备注弹窗，并启动高亮点击、标签功能
        if (this.isMobile || this.isDesktop) {
            Logger.log('🚀 开始初始化管理器（环境检查通过）...');
            this.memoManager.initialize();
            this.highlightClickManager.initialize();
            this.tagManager.initialize();
            this.tagClickManager.initialize();
            
            // 初始化闪卡快切管理器（异步）
            this.flashcardQuickSwitchManager.initialize().then(() => {
                Logger.log('✅ FlashcardQuickSwitchManager 初始化完成');
            }).catch((error) => {
                Logger.error('❌ FlashcardQuickSwitchManager 初始化失败:', error);
            });
        } else {
            Logger.warn('⚠️ 不是手机版或桌面版，跳过管理器初始化');
        }
        
        // 初始化按钮工厂
        this.buttonFactory = new ToolbarButtonFactory(
            this.isMobile,
            this.memoManager,
            {
                onHighlightApply: this.applyHighlight.bind(this),
                onHighlightRemove: this.removeHighlight.bind(this),
                onToolbarHide: this.hideToolbar.bind(this),
                onSelectionClear: this.clearSelection.bind(this),
                getColorValue: this.getColorValue.bind(this)
            }
        );
        
        // 初始化自定义工具栏管理器
        this.customToolbarManager = new CustomToolbarManager(
            this.isMobile,
            this.memoManager,
            {
                onHighlightApply: this.applyCustomHighlight.bind(this),
                onHighlightRemove: this.removeCustomHighlight.bind(this),
                findBlockElement: this.findBlockElement.bind(this),
                isCrossBlockSelection: this.isCrossBlockSelection.bind(this)
            }
        );
        
        // 保留 API 用于备注功能（向后兼容）
        this.api = {
            getBlockKramdown: async (blockId: string) => {
                const payload = { id: blockId };
                const response = await fetch('/api/block/getBlockKramdown', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                return await response.json();
            }
        };
    }
    
    /**
     * 启动劫持
     */
    public async hijack(): Promise<void> {
        if (this.isHijacked) {
            return;
        }
        
        Logger.log('\n🚀 ========== 启动工具栏劫持 ==========');
        Logger.log('环境:', {
            isMobile: this.isMobile,
            isDesktop: this.isDesktop
        });
        
        // 检查系统只读模式
        Logger.log('🔐 检查系统只读状态...');
        const readOnly = await isSystemReadOnly();
        Logger.log(`系统状态: ${readOnly ? '🔒 只读模式（这是正常状态）' : '✏️ 可写模式'}`);
        
        // 打印环境信息
        await debugEnvironmentInfo();
        
        Logger.log('📝 准备劫持工具栏...');
        
        // 延迟执行，确保编辑器已加载
        setTimeout(() => {
            this.performHijack();
        }, 1000);
        
        // 同时添加鼠标选择监听作为备用方案（使用 customToolbarManager）
        this.customToolbarManager.setupMouseSelectionListener();
        
        // 🎯 设置tab切换监听器，解决编辑状态识别问题
        this.setupTabSwitchListener();
        
        // 🎯 设置锁按钮点击监听器，实时响应状态变化
        this.setupReadonlyButtonListener();
        
        // 🔑 初始化公共操作包装器
        operationWrapper.initialize();
        
        // 🔑 延迟设置初始化完成标记，避免启动时意外触发加锁
        setTimeout(() => {
            this.isInitialized = true;
            Logger.log('✅ 插件初始化完成，现在允许执行加锁操作');
        }, 3000); // 给足够的时间让插件完全初始化
    }
    
    /**
     * 停止劫持
     */
    public unhijack(): void {
        if (!this.isHijacked || !this.originalShowContent) {
            return;
        }
        
        try {
            const editors = getAllEditor();
            editors.forEach(editor => {
                if (editor.protyle && editor.protyle.toolbar) {
                    editor.protyle.toolbar.showContent = this.originalShowContent;
                }
            });
            
            // 清理事件监听器
            this.cleanupEventListeners();
            
            this.isHijacked = false;
            this.originalShowContent = null;
            
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 执行劫持
     */
    private performHijack(): void {
        try {
            const editors = getAllEditor();
            
            if (editors.length === 0) {
                setTimeout(() => this.performHijack(), 2000);
                return;
            }
            
            let hijackSuccess = false;
            
            // 尝试劫持所有编辑器
            editors.forEach((editor) => {
                if (editor.protyle && editor.protyle.toolbar && editor.protyle.toolbar.showContent) {
                    // 保存原始方法（只保存一次）
                    if (!this.originalShowContent) {
                        this.originalShowContent = editor.protyle.toolbar.showContent;
                    }
                    
                    // 劫持 showContent 方法
                    const hijacker = this;
                    editor.protyle.toolbar.showContent = function(protyle: any, range: Range, nodeElement: Element) {
                        Logger.log('\n🎯 ========== 工具栏 showContent 被触发 ==========');
                        Logger.log('选中文本:', range?.toString()?.substring(0, 50));
                        
                        // 先调用原始方法显示基础工具栏
                        Logger.log('📋 调用原始 showContent...');
                        hijacker.originalShowContent.call(this, protyle, range, nodeElement);
                        
                        // 延迟一点再增强，确保原始工具栏已显示
                        setTimeout(() => {
                            if ((hijacker.isMobile || hijacker.isDesktop) && range && range.toString().trim()) {
                                // 检查是否跨块选择
                                if (hijacker.isCrossBlockSelection(range)) {
                                    Logger.log('⚠️ 跨块选择，不增强工具栏');
                                    return; // 跨块选择时不增强工具栏
                                }
                                Logger.log('✨ 准备增强工具栏...');
                                hijacker.enhanceToolbar(this, range, nodeElement, protyle);
                            } else {
                                Logger.log('⚠️ 不满足增强条件，跳过');
                            }
                            Logger.log('========== showContent 流程结束 ==========\n');
                        }, 50);
                    };
                    
                    hijackSuccess = true;
                }
            });
            
            if (hijackSuccess) {
                this.isHijacked = true;
                Logger.log(`✅ ${this.isMobile ? '📱 手机版' : '💻 电脑版'}高亮功能已激活`);
            } else {
                setTimeout(() => this.performHijack(), 3000);
            }
            
        } catch (error) {
            setTimeout(() => this.performHijack(), 3000);
        }
    }
    
    /**
     * 检查是否应该显示工具栏
     */
    private shouldShowToolbar(range: Range): boolean {
        const selectedText = range.toString().trim();
        if (!selectedText) {
            return false;
        }

        // 检查是否在代码块中
        if (this.isInCodeBlock(range)) {
            Logger.log('在代码块中，不显示工具栏');
            return false;
        }

        // 检查是否在表格中
        if (this.isInTable(range)) {
            Logger.log('在表格中，不显示工具栏');
            return false;
        }

        // 检查是否在数学公式中
        if (this.isInMathFormula(range)) {
            Logger.log('在数学公式中，不显示工具栏');
            return false;
        }

        // 检查是否在链接中
        if (this.isInLink(range)) {
            Logger.log('在链接中，不显示工具栏');
            return false;
        }

        // 检查是否在特殊格式中（粗体、斜体、删除线等）
        if (this.isInSpecialFormat(range)) {
            Logger.log('在特殊格式中，不显示工具栏');
            return false;
        }

        return true;
    }

    /**
     * 检查是否在代码块中
     */
    private isInCodeBlock(range: Range): boolean {
        try {
            let element = range.commonAncestorContainer;
            if (element.nodeType === Node.TEXT_NODE) {
                element = element.parentNode!;
            }
            
            // 向上查找，检查是否在代码块中
            while (element && element !== document.body) {
                if (element.nodeType === Node.ELEMENT_NODE) {
                    const el = element as HTMLElement;
                    const className = el.className || '';
                    const tagName = el.tagName.toLowerCase();
                    
                    // 检查代码块相关的类名和标签
                    if (className.includes('code') || 
                        className.includes('hljs') ||
                        tagName === 'code' ||
                        tagName === 'pre') {
                        return true;
                    }
                }
                element = element.parentNode!;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查是否在表格中
     */
    private isInTable(range: Range): boolean {
        try {
            let element = range.commonAncestorContainer;
            if (element.nodeType === Node.TEXT_NODE) {
                element = element.parentNode!;
            }
            
            // 向上查找，检查是否在表格中
            while (element && element !== document.body) {
                if (element.nodeType === Node.ELEMENT_NODE) {
                    const el = element as HTMLElement;
                    const tagName = el.tagName.toLowerCase();
                    
                    if (tagName === 'table' || tagName === 'tr' || tagName === 'td' || tagName === 'th') {
                        return true;
                    }
                }
                element = element.parentNode!;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查是否在数学公式中
     */
    private isInMathFormula(range: Range): boolean {
        try {
            let element = range.commonAncestorContainer;
            if (element.nodeType === Node.TEXT_NODE) {
                element = element.parentNode!;
            }
            
            // 向上查找，检查是否在数学公式中
            while (element && element !== document.body) {
                if (element.nodeType === Node.ELEMENT_NODE) {
                    const el = element as HTMLElement;
                    const className = el.className || '';
                    const tagName = el.tagName.toLowerCase();
                    
                    if (className.includes('math') || 
                        className.includes('katex') ||
                        tagName === 'math') {
                        return true;
                    }
                }
                element = element.parentNode!;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查是否在链接中
     */
    private isInLink(range: Range): boolean {
        try {
            // 检查选中的文本是否包含链接相关的元素
            const selectedText = range.toString().trim();
            if (!selectedText) {
                return false;
            }

            // 检查选中范围内是否有链接元素
            const fragment = range.cloneContents();
            const linkElements = fragment.querySelectorAll('a, [data-type*="a"]');
            if (linkElements.length > 0) {
                Logger.log('选中范围内包含链接元素:', linkElements.length);
                return true;
            }

            // 检查选中文本的父元素是否在链接中
            let element = range.commonAncestorContainer;
            if (element.nodeType === Node.TEXT_NODE) {
                element = element.parentNode!;
            }
            
            // 向上查找，检查是否在链接中
            while (element && element !== document.body) {
                if (element.nodeType === Node.ELEMENT_NODE) {
                    const el = element as HTMLElement;
                    const tagName = el.tagName.toLowerCase();
                    const dataType = el.getAttribute('data-type');
                    
                    if (tagName === 'a' || dataType === 'a' || (dataType && dataType.includes('a'))) {
                        Logger.log('在链接元素中:', { tagName, dataType });
                        return true;
                    }
                }
                element = element.parentNode!;
            }
            return false;
        } catch (error) {
            Logger.error('检查链接时出错:', error);
            return false;
        }
    }

    /**
     * 检查是否在特殊格式中
     */
    private isInSpecialFormat(range: Range): boolean {
        try {
            let element = range.commonAncestorContainer;
            if (element.nodeType === Node.TEXT_NODE) {
                element = element.parentNode!;
            }
            
            // 向上查找，检查是否在特殊格式中
            while (element && element !== document.body) {
                if (element.nodeType === Node.ELEMENT_NODE) {
                    const el = element as HTMLElement;
                    const dataType = el.getAttribute('data-type');
                    const tagName = el.tagName.toLowerCase();
                    
                    // 检查是否在粗体、斜体、删除线等格式中
                    if (dataType === 'strong' || dataType === 'em' || dataType === 'del' ||
                        dataType === 'mark' || dataType === 'tag' ||
                        tagName === 'strong' || tagName === 'em' || tagName === 'del' ||
                        tagName === 'mark' || tagName === 's') {
                        return true;
                    }
                }
                element = element.parentNode!;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * 增强工具栏（支持手机版和电脑版）
     */
    private enhanceToolbar(toolbar: any, range: Range, nodeElement: Element, protyle: any): void {
        try {
            Logger.log('\n🚀 ========== 准备增强高亮工具栏（这是你说的弹窗！）==========');
            
            // 🔍 实时检查只读状态 - 根据当前选区找到对应的面包屑锁按钮
            let isDocReadonly = false;
            const readonlyBtn = this.findReadonlyButtonForRange(range);
            
            if (readonlyBtn) {
                const ariaLabel = readonlyBtn.getAttribute('aria-label') || '';
                const dataSubtype = readonlyBtn.getAttribute('data-subtype') || '';
                const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
                
                // 🔑 正确判断锁定状态（与memoManager.ts保持一致）
                // '解除锁定'/'临时解锁' = 已锁定（只读模式）
                // '锁定编辑'/'取消临时解锁' = 可编辑（未锁定）
                const isLocked = 
                    ariaLabel.includes('解除锁定') ||   // "解除锁定" → 当前已锁定
                    ariaLabel.includes('临时解锁') ||   // "临时解锁" → 当前已锁定
                    dataSubtype === 'lock' ||          // data-subtype="lock" → 当前已锁定
                    iconHref === '#iconLock';          // 图标为锁定状态
                
                isDocReadonly = isLocked;
                
                Logger.log('🔐 面包屑锁按钮状态（宽松检查）:', {
                    '找到按钮': !!readonlyBtn,
                    'aria-label': ariaLabel,
                    'data-subtype': dataSubtype,
                    '图标href': iconHref,
                    '是否锁定': isLocked ? '🔒 是（已锁定）' : '✏️ 否（未锁定）',
                    '是否只读': isDocReadonly ? '🔒 是（锁定）' : '✏️ 否（解锁）',
                    '按钮来源': '当前选区对应的protyle容器'
                });
            } else {
                Logger.warn('⚠️ 未找到面包屑锁按钮！');
            }
            
            // 作为参考，也检查 protyle.disabled 和 DOM 属性
            const isProtyleDisabled = protyle?.disabled === true;
            Logger.log('📋 其他状态（参考）:', {
                'protyle.disabled': isProtyleDisabled ? '🔒 禁用' : '✏️ 启用'
            });
            
            let wysiwyg: HTMLElement | null = null;
            if (range) {
                let element = range.startContainer as HTMLElement;
                if (element.nodeType === Node.TEXT_NODE) {
                    element = element.parentElement;
                }
                while (element && !element.classList?.contains('protyle-wysiwyg')) {
                    element = element.parentElement;
                }
                wysiwyg = element;
            }
            
            if (wysiwyg) {
                Logger.log('📋 DOM 属性（参考）:', {
                    'custom-sy-readonly': wysiwyg.getAttribute('custom-sy-readonly'),
                    'data-readonly': wysiwyg.getAttribute('data-readonly'),
                    'contenteditable': wysiwyg.getAttribute('contenteditable')
                });
            }
            
            // 打印所有参数和条件
            Logger.log('📊 工具栏增强条件检查:', {
                '有toolbar': !!toolbar,
                '有range': !!range,
                '有nodeElement': !!nodeElement,
                '有protyle': !!protyle,
                '选中文本': range?.toString()?.substring(0, 30),
                '文本长度': range?.toString()?.length,
                '是否手机版': this.isMobile,
                '是否电脑版': this.isDesktop,
                '文档是否只读': isDocReadonly ? '🔒 是（锁定）' : '✏️ 否（解锁）'
            });
            
            // 🔒 核心限制：只有在加锁（只读）状态下才显示高亮工具栏
            if (!isDocReadonly) {
                Logger.log('⛔ 文档未加锁（可编辑状态），不显示高亮工具栏');
                Logger.log('========== 工具栏增强结束（文档未加锁）==========\n');
                return;
            }
            
            Logger.log('✅ 文档已加锁（只读状态），允许显示高亮工具栏');
            
            // 检查是否应该显示工具栏
            const shouldShow = this.shouldShowToolbar(range);
            Logger.log(`shouldShowToolbar 返回: ${shouldShow ? '✅ 应该显示' : '❌ 不应该显示'}`);
            
            if (!shouldShow) {
                Logger.log('❌ 不满足显示条件，隐藏工具栏');
                this.hideToolbar(toolbar);
                Logger.log('========== 工具栏增强结束（隐藏）==========\n');
                return;
            }
            
            Logger.log('✅ 满足显示条件，继续增强工具栏...');
            
            const subElement = toolbar.subElement;
            if (!subElement) return;
            
            // 确保工具栏可见（重置之前的隐藏状态）
            this.resetToolbarVisibility(toolbar);
            
            const flexContainer = subElement.querySelector('.fn__flex');
            if (!flexContainer) {
                // 尝试其他可能的选择器
                const alternativeContainer = subElement.querySelector('.keyboard__action')?.parentElement;
                if (alternativeContainer) {
                    this.addHighlightButtons(alternativeContainer, range, nodeElement, protyle, toolbar);
                }
                return;
            }
            
            // 清理之前添加的按钮（避免重复添加）
            this.cleanupPreviousButtons(flexContainer);
            
            // 添加高亮按钮组
            Logger.log('🎨 添加高亮按钮组...');
            this.addHighlightButtons(flexContainer, range, nodeElement, protyle, toolbar);
            
            // 添加按钮后调整工具栏位置，确保完整显示
            Logger.log('📐 调整工具栏位置...');
            this.adjustToolbarPosition(toolbar, range);
            
            // 添加自动隐藏机制
            Logger.log('👁️ 设置自动隐藏机制...');
            this.setupAutoHide(toolbar);
            
            Logger.log('✅ ========== 高亮工具栏增强成功！==========\n');
            
        } catch (error) {
            Logger.error('❌ 工具栏增强失败:', error);
            Logger.log('========== 工具栏增强结束（失败）==========\n');
        }
    }
    
    /**
     * 添加高亮按钮组 - 委托给 buttonFactory
     */
    private addHighlightButtons(container: HTMLElement, range: Range, nodeElement: Element, protyle: any, toolbar: any): void {
        // 找到更多按钮，在它前面插入我们的按钮
        const moreBtn = container.querySelector('[data-action="more"]');
        const insertPoint = moreBtn || container.lastElementChild;
        
        // 使用按钮工厂创建所有按钮
        this.buttonFactory.addButtonsToContainer(container, range, nodeElement, protyle, toolbar, insertPoint);
    }
    
    // ✅ 按钮创建方法已移至 ToolbarButtonFactory
    
    /**
     * 添加备注到选中文本
     */
    private async addMemoToSelection(protyle: any, range: Range, nodeElement: Element, toolbar: any): Promise<void> {
        try {
            const selectedText = range.toString().trim();
            if (!selectedText) {
                Logger.warn('请先选择要添加备注的文本');
                return;
            }

            // 找到真正的块元素
            const blockElement = this.findBlockElement(range.startContainer);
            if (!blockElement) {
                Logger.warn('未找到目标块元素');
                return;
            }

            const blockId = blockElement.getAttribute("data-node-id");
            if (!blockId) {
                Logger.warn('未找到块ID');
                return;
            }

            // 备注功能已移至 MemoManager，此方法不再使用
            // const memoText = await this.showEnhancedMemoInput(selectedText);
            const memoText = selectedText; // 临时修复，避免编译错误
            if (!memoText) {
                return; // 用户取消或未输入内容
            }

            // 保存原始内容
            const oldContent = blockElement.innerHTML;

            // 创建备注span元素（使用思源的正确格式）
            const memoSpan = document.createElement("span");
            memoSpan.setAttribute("data-type", "inline-memo");
            memoSpan.setAttribute("data-inline-memo-content", memoText);  // 正确的属性名
            // 不设置style，让思源自己处理样式
            memoSpan.textContent = selectedText;

            // DOM操作 - 替换选中内容
            range.deleteContents();
            range.insertNode(memoSpan);

            // 更新时间戳
            const timestamp = new Date().getTime().toString().substring(0, 10);
            blockElement.setAttribute("updated", timestamp);

            // 提取并保存内容
            const newContent = await this.extractMarkdownFromBlock(blockElement);
            const updateResult = await updateBlock("markdown", newContent, blockId);

            if (updateResult) {
                Logger.log(`✅ 备注添加成功：${memoText.substring(0, 20)}${memoText.length > 20 ? '...' : ''}`);
                // 恢复只读状态
                setTimeout(() => this.restoreReadOnlyState(blockId), 100);
            } else {
                Logger.error('❌ 备注添加失败');
                this.restoreOriginalHTML(blockId, oldContent);
            }

            this.hideToolbar(toolbar);
            this.clearSelection();

        } catch (error) {
            Logger.error('添加备注出错:', error);
            // 静默处理错误
        }
    }

    /**
     * 显示备注输入框
     */
    private showMemoInput(): Promise<string> {
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
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
            `;

            // 创建输入框容器
            const inputContainer = document.createElement('div');
            inputContainer.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 20px;
                max-width: 90vw;
                width: 400px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            `;

            // 标题
            const title = document.createElement('h3');
            title.textContent = '添加备注';
            title.style.cssText = `
                margin: 0 0 15px 0;
                color: #333;
                font-size: 18px;
            `;

            // 输入框
            const textarea = document.createElement('textarea');
            textarea.placeholder = '请输入备注内容...';
            textarea.style.cssText = `
                width: 100%;
                height: 80px;
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 10px;
                font-size: 14px;
                resize: vertical;
                box-sizing: border-box;
                font-family: inherit;
            `;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 15px;
            `;

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                padding: 8px 16px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            // 确定按钮
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '确定';
            confirmBtn.style.cssText = `
                padding: 8px 16px;
                border: none;
                background: #007bff;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            // 事件处理
            const cleanup = () => {
                document.body.removeChild(overlay);
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve('');
            });

            confirmBtn.addEventListener('click', () => {
                const memoText = textarea.value.trim();
                cleanup();
                resolve(memoText);
            });

            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve('');
                }
            });

            // 回车键确定
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    const memoText = textarea.value.trim();
                    cleanup();
                    resolve(memoText);
                }
            });

            // 组装界面
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            inputContainer.appendChild(title);
            inputContainer.appendChild(textarea);
            inputContainer.appendChild(buttonContainer);
            overlay.appendChild(inputContainer);
            document.body.appendChild(overlay);

            // 自动聚焦
            setTimeout(() => textarea.focus(), 100);
        });
    }

    /**
     * 应用高亮 - 使用思源原生 setInlineMark 方法
     */
    private async applyHighlight(protyle: any, range: Range, nodeElement: Element, colorConfig: {name: string, color: string}): Promise<void> {
        try {
            Logger.log('\n🎨 ========== 应用高亮操作 ==========');
            
            // 🔍 实时检查文档只读状态 - 从 range 参数查找
            let wysiwyg: HTMLElement | null = null;
            
            // 从传入的 range 参数查找（最准确）
            if (range) {
                let element = range.startContainer as HTMLElement;
                if (element.nodeType === Node.TEXT_NODE) {
                    element = element.parentElement;
                }
                while (element && !element.classList?.contains('protyle-wysiwyg')) {
                    element = element.parentElement;
                }
                wysiwyg = element;
            }
            
            // 备用方案
            if (!wysiwyg) {
                wysiwyg = document.querySelector('.protyle-wysiwyg.protyle-wysiwyg--attr') as HTMLElement;
            }
            
            if (wysiwyg) {
                const customReadonly = wysiwyg.getAttribute('custom-sy-readonly');
                const isDocReadonly = customReadonly === 'true';
                Logger.log('📋 当前文档只读状态 (实时检查):', {
                    'custom-sy-readonly': customReadonly,
                    '是否只读': isDocReadonly ? '是🔒（锁已锁定）' : '否✏️（锁已解锁）',
                    '操作': '即将应用高亮'
                });
                
                if (isDocReadonly) {
                    Logger.log('🔒 文档处于只读模式，继续执行高亮操作');
                } else {
                    Logger.log('✏️ 文档处于可写模式，继续执行高亮操作');
                }
            } else {
                Logger.warn('⚠️ 未找到 protyle-wysiwyg 元素');
            }
            
            // 检查参数
            if (!colorConfig || !protyle || !range) {
                Logger.error('applyHighlight: 参数缺失', { colorConfig, protyle, range });
                return;
            }
            
            const selectedText = range.toString().trim();
            if (!selectedText) {
                Logger.warn('没有选中文本');
                return;
            }
            
            Logger.log('🎨 高亮参数:', {
                color: colorConfig.name,
                text: selectedText.substring(0, 30)
            });

            // 调用统一的核心方法
            await this.applyHighlightCore(
                protyle,
                range,
                {
                    type: "backgroundColor",
                    color: colorConfig.color
                },
                colorConfig.name
            );

        } catch (error) {
            Logger.error("高亮功能出错:", error);
        }
    }
    
    /**
     * 移除高亮格式 - 使用统一的解锁-操作-加锁包装
     */
    private async removeHighlight(protyle: any, range: Range, nodeElement: Element): Promise<void> {
        const selectedText = range.toString().trim();
        if (!selectedText) {
            Logger.warn('没有选中文本');
            return;
        }

        // 检查 protyle.toolbar 是否存在
        if (!protyle || !protyle.toolbar) {
            Logger.error('protyle.toolbar 不可用');
            return;
        }

        // 🔑 使用统一的操作包装器
        await operationWrapper.executeWithUnlockLock(
            '移除高亮',
            async () => {
                return await this.performRemoveHighlight(protyle, range);
            }
        );
    }

    /**
     * 执行移除高亮的核心逻辑（不包含解锁加锁）
     */
    private async performRemoveHighlight(protyle: any, range: Range): Promise<void> {
        // 更新 range
        protyle.toolbar.range = range;

        // 使用思源原生方法移除高亮
        protyle.toolbar.setInlineMark(protyle, "text", "range", {
            type: "backgroundColor",
            color: "" // 空字符串表示移除背景色
        });

        Logger.log('✅ 已移除高亮');
    }
    
    /**
     * 关键修正：正确查找块元素
     */
    private findBlockElement(node: Node): HTMLElement | null {
        let current = node;
        
        // 向上遍历DOM树查找具有data-node-id属性的块元素
        while (current && current !== document) {
            if (current.nodeType === Node.ELEMENT_NODE && 
                (current as HTMLElement).getAttribute && 
                (current as HTMLElement).getAttribute("data-node-id")) {
                
                const element = current as HTMLElement;
                // 确保这是一个真正的块元素(p, h1-h6, li等)，而不是容器元素
                const tagName = element.tagName.toLowerCase();
                const className = element.className || '';
                
                // 排除容器类元素，只保留真正的内容块
                if (!className.includes('protyle-content') && 
                    !className.includes('protyle-wysiwyg') &&
                    !className.includes('protyle-html') &&
                    tagName !== 'body' && 
                    tagName !== 'html') {
                    
                    return element;
                }
            }
            current = current.parentNode!;
        }
        
        return null;
    }
    
    /**
     * 从块元素提取markdown内容，并合并高亮修改
     * 
     * ⚠️ 遗留代码：此方法仅用于备注功能，高亮功能已改用思源原生API
     * TODO: 备注功能也应该改用思源原生的 transactions API
     */
    private async extractMarkdownFromBlock(blockElement: HTMLElement): Promise<string> {
        try {
            // 首先尝试通过 API 获取原始 Markdown 内容
            const blockId = blockElement.getAttribute("data-node-id");
            Logger.log('尝试获取 blockId:', blockId);
            
            if (blockId) {
                try {
                    Logger.log('开始调用 getBlockKramdown API...');
                    const response = await this.api.getBlockKramdown(blockId);
                    Logger.log('API 响应:', response);
                    
                    if (response && response.code === 0 && response.data && response.data.kramdown) {
                        const originalMarkdown = response.data.kramdown;
                        Logger.log('成功获取原始 Markdown 内容:', originalMarkdown);
                        
                        // 尝试从修改后的 DOM 生成包含高亮的 Markdown
                        const modifiedMarkdown = this.mergeHighlightIntoMarkdown(originalMarkdown, blockElement);
                        Logger.log('合并后的 Markdown 内容:', modifiedMarkdown);
                        
                        return modifiedMarkdown;
                    } else {
                        Logger.warn('API 响应格式不正确，完整响应:', response);
                    }
                } catch (apiError) {
                    Logger.warn('API 获取 Markdown 失败，回退到 HTML 解析:', apiError);
                }
            } else {
                Logger.warn('未找到 blockId，使用 HTML 解析');
            }

            // 回退方案：从 HTML 内容提取
            const innerHTML = blockElement.innerHTML;
            
            // 创建临时容器解析内容
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = innerHTML;
            
            // 尝试多种方式提取内容
            // 方式1：查找 contenteditable="false" 的div（只读模式）
            let contentDiv = tempDiv.querySelector('div[contenteditable="false"]');
            
            // 方式2：如果没找到，查找 contenteditable="true" 的div（编辑模式）
            if (!contentDiv) {
                contentDiv = tempDiv.querySelector('div[contenteditable="true"]');
            }
            
            // 方式3：如果还没找到，查找第一个div
            if (!contentDiv) {
                contentDiv = tempDiv.querySelector('div');
            }
            
            if (contentDiv && contentDiv.innerHTML.trim() && contentDiv.innerHTML.trim() !== '​') {
                Logger.log('提取内容成功 - 方式:', contentDiv.getAttribute('contenteditable') || 'div');
                return contentDiv.innerHTML;
            }
            
            // 方式4：如果都没找到，可能是编辑模式，尝试提取第一个div的内容
            const firstDiv = tempDiv.querySelector('div');
            if (firstDiv && firstDiv.innerHTML.trim() && firstDiv.innerHTML.trim() !== '​') {
                Logger.log('提取编辑模式内容 - div内容');
                return firstDiv.innerHTML;
            }
            
            // 方式5：最后回退，过滤掉protyle-attr后返回
            const cleanedInnerHTML = innerHTML.replace(/<div[^>]*class="protyle-attr"[^>]*>​<\/div>/g, '');
            
            Logger.log('使用清理后的innerHTML');
            return cleanedInnerHTML;
            
        } catch (error) {
            Logger.error('提取markdown失败:', error);
            return blockElement.innerHTML;
        }
    }
    
    /**
     * 将高亮修改合并到原始 Markdown 中
     */
    private mergeHighlightIntoMarkdown(originalMarkdown: string, blockElement: HTMLElement): string {
        try {
            // 从 DOM 中提取纯文本内容和高亮信息
            let contentDiv = blockElement.querySelector('div[contenteditable]');
            
            // 如果没找到，尝试其他可能的选择器
            if (!contentDiv) {
                contentDiv = blockElement.querySelector('div[contenteditable="true"]');
            }
            if (!contentDiv) {
                contentDiv = blockElement.querySelector('div[contenteditable="false"]');
            }
            if (!contentDiv) {
                // 直接使用 blockElement 的第一个 div
                contentDiv = blockElement.querySelector('div');
            }
            
            if (!contentDiv) {
                Logger.warn('未找到可编辑的内容区域，使用整个块元素');
                contentDiv = blockElement;
            }

            // 提取修改后的内容，保留高亮标记
            const modifiedHtml = contentDiv.innerHTML;
            Logger.log('修改后的 HTML:', modifiedHtml);
            Logger.log('内容区域标签:', contentDiv.tagName, 'contenteditable:', contentDiv.getAttribute('contenteditable'));

            // 将高亮 span 转换为 Markdown 高亮语法
            const processedHtml = this.convertHighlightSpansToMarkdown(modifiedHtml);
            Logger.log('处理后的HTML:', processedHtml);
            
            // 直接返回处理后的HTML内容，不再尝试合并原始Markdown
            // 这样可以避免重复内容的问题
            return processedHtml;
            
        } catch (error) {
            Logger.error('合并高亮到 Markdown 失败:', error);
            return originalMarkdown;
        }
    }
    
    /**
     * 打印界面显示效果
     */
    private printDisplayEffect(blockId: string): void {
        try {
            Logger.log('🔍 ===== 打印界面显示效果 =====');
            
            // 查找块元素
            const blockElement = document.querySelector(`[data-node-id="${blockId}"]`);
            if (!blockElement) {
                Logger.log('❌ 未找到块元素');
                return;
            }
            
            Logger.log('📄 块元素HTML:', blockElement.outerHTML);
            
            // 查找内容区域
            let contentDiv = blockElement.querySelector('div[contenteditable]');
            if (!contentDiv) {
                contentDiv = blockElement.querySelector('div[contenteditable="true"]');
            }
            if (!contentDiv) {
                contentDiv = blockElement.querySelector('div[contenteditable="false"]');
            }
            if (!contentDiv) {
                contentDiv = blockElement.querySelector('div');
            }
            
            if (contentDiv) {
                Logger.log('📝 内容区域HTML:', contentDiv.outerHTML);
                Logger.log('📝 内容区域文本:', contentDiv.textContent);
                
                // 查找所有span元素
                const spans = contentDiv.querySelectorAll('span');
                Logger.log('🎨 找到span元素数量:', spans.length);
                
                spans.forEach((span, index) => {
                    const dataType = span.getAttribute('data-type');
                    const text = span.textContent;
                    const bgColor = span.style.backgroundColor;
                    const href = span.getAttribute('data-href');
                    
                    Logger.log(`🎨 Span ${index}:`, {
                        dataType,
                        text,
                        backgroundColor: bgColor,
                        href,
                        outerHTML: span.outerHTML
                    });
                });
            }
            
            // 重新获取Markdown内容
            this.api.getBlockKramdown(blockId).then(response => {
                if (response && response.code === 0 && response.data && response.data.kramdown) {
                    Logger.log('📄 当前保存的Markdown内容:', response.data.kramdown);
                } else {
                    Logger.log('❌ 获取Markdown内容失败:', response);
                }
            }).catch(error => {
                Logger.log('❌ 获取Markdown内容出错:', error);
            });
            
            Logger.log('🔍 ===== 界面显示效果打印完成 =====');
            
        } catch (error) {
            Logger.error('❌ 打印界面显示效果失败:', error);
        }
    }
    
    /**
     * 处理包含高亮的链接
     */
    private processLinkWithHighlights(linkSpan: HTMLElement): string {
        try {
            Logger.log('===== 开始处理链接高亮 =====');
            Logger.log('输入链接span:', linkSpan.outerHTML);
            
            const href = linkSpan.getAttribute('data-href') || '';
            Logger.log('链接href:', href);
            
            // 检查是否有高亮span
            const highlightSpans = linkSpan.querySelectorAll('span[data-type="text"][style*="background-color"]');
            Logger.log('找到高亮span数量:', highlightSpans.length);
            
            if (highlightSpans.length === 0) {
                // 没有高亮，返回普通链接
                const textContent = linkSpan.textContent || '';
                const result = `[${textContent}](${href})`;
                Logger.log('无高亮，返回普通链接:', result);
                return result;
            }
            
            // 有高亮，需要构建包含高亮的链接
            // 思源笔记不支持在链接内部使用高亮语法，我们需要将链接和高亮分开
            Logger.log('开始构建包含高亮的链接文本');
            Logger.log('思源笔记不支持链接内部高亮，将链接和高亮分开处理');
            
            // 构建包含高亮的链接文本
            let linkText = '';
            const childNodes = Array.from(linkSpan.childNodes);
            Logger.log('子节点数量:', childNodes.length);
            
            for (let i = 0; i < childNodes.length; i++) {
                const node = childNodes[i];
                Logger.log(`处理子节点 ${i}:`, {
                    nodeType: node.nodeType,
                    textContent: node.textContent,
                    tagName: node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement).tagName : 'TEXT'
                });
                
                if (node.nodeType === Node.TEXT_NODE) {
                    // 纯文本节点
                    const text = node.textContent || '';
                    linkText += text;
                    Logger.log('添加纯文本:', text, '当前linkText:', linkText);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as HTMLElement;
                    const dataType = element.getAttribute('data-type');
                    Logger.log('处理元素节点:', {
                        tagName: element.tagName,
                        dataType: dataType,
                        textContent: element.textContent,
                        backgroundColor: element.style.backgroundColor
                    });
                    
                    if (element.tagName === 'SPAN' && dataType === 'text') {
                        // 高亮span，直接添加文本，不添加高亮语法
                        const text = element.textContent || '';
                        linkText += text;
                        Logger.log('添加高亮文本(无语法):', text, '当前linkText:', linkText);
                    } else {
                        // 其他元素，保持原样
                        const text = element.textContent || '';
                        linkText += text;
                        Logger.log('添加其他元素文本:', text, '当前linkText:', linkText);
                    }
                }
            }
            
            // 使用普通链接格式，不包含高亮语法
            const result = `[${linkText}](${href})`;
            Logger.log('最终结果(普通链接):', result);
            Logger.log('===== 链接高亮处理完成 =====');
            return result;
            
        } catch (error) {
            Logger.error('处理包含高亮的链接失败:', error);
            return linkSpan.outerHTML;
        }
    }
    
    /**
     * 将高亮 span 转换为 Markdown 语法
     */
    private convertHighlightSpansToMarkdown(html: string): string {
        try {
            // 创建临时容器
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // 处理所有类型的 span 元素
            const allSpans = tempDiv.querySelectorAll('span');
            allSpans.forEach(span => {
                const dataType = span.getAttribute('data-type');
                
                // 跳过链接内部的子span，避免重复处理
                const isInsideLink = span.closest('span[data-type="a"]');
                const isLinkItself = dataType === 'a';
                
                if (isInsideLink && !isLinkItself) {
                    Logger.log('跳过链接内部的子span:', span.textContent, 'data-type:', dataType);
                    return;
                }
                
                const text = span.textContent || '';
                let markdownText = text;
                let shouldReplace = false;
                
                if (dataType === 'text') {
                    // 我们添加的高亮span
                    const bgColor = span.style.backgroundColor;
                    Logger.log('处理高亮span:', text, 'bgColor:', bgColor);
                    
                    if (bgColor && bgColor !== 'transparent') {
                        // 保留颜色信息，使用SiYuan的颜色高亮语法
                        markdownText = `<span data-type="text" style="background-color: ${bgColor};">${text}</span>`;
                        shouldReplace = true;
                    }
                } else if (dataType === 'em') {
                    // 斜体类型，转换为Markdown斜体语法
                    Logger.log('处理斜体span:', text, 'dataType:', dataType);
                    if (text && text.trim()) {
                        markdownText = `*${text}*`;
                        shouldReplace = true;
                    } else {
                        // 空的斜体span，直接跳过
                        Logger.log('跳过空的斜体span');
                        shouldReplace = false;
                    }
                } else if (dataType === 'strong') {
                    // 粗体类型，转换为Markdown粗体语法
                    Logger.log('处理粗体span:', text, 'dataType:', dataType);
                    if (text && text.trim()) {
                        markdownText = `**${text}**`;
                        shouldReplace = true;
                    } else {
                        // 空的粗体span，直接跳过
                        Logger.log('跳过空的粗体span');
                        shouldReplace = false;
                    }
                } else if (dataType === 'tag') {
                    // 标签类型，转换为Markdown标签语法
                    markdownText = `#${text}`;
                    shouldReplace = true;
                } else if (dataType === 'a') {
                    // 链接类型，需要特殊处理
                    Logger.log('===== 开始处理链接 =====');
                    Logger.log('链接span:', span.outerHTML);
                    
                    const href = span.getAttribute('data-href') || '';
                    const hasChildSpans = span.querySelector('span');
                    
                    Logger.log('链接href:', href);
                    Logger.log('是否有子span:', !!hasChildSpans);
                    
                    if (hasChildSpans) {
                        // 如果链接内部有子span（如高亮），需要特殊处理
                        Logger.log('调用processLinkWithHighlights处理包含子span的链接');
                        const processedInnerHTML = this.processLinkWithHighlights(span);
                        markdownText = processedInnerHTML;
                        shouldReplace = true;
                        Logger.log('链接处理结果:', processedInnerHTML);
                    } else {
                        // 如果链接内部没有子span，转换为Markdown链接语法
                        markdownText = `[${text}](${href})`;
                        shouldReplace = true;
                        Logger.log('无子span，返回普通链接:', markdownText);
                    }
                    Logger.log('===== 链接处理完成 =====');
                } else if (dataType === 'mark') {
                    // 原有的mark类型，保持为高亮语法
                    markdownText = `==${text}==`;
                    shouldReplace = true;
                } else if (dataType === 'inline-memo') {
                    // 备注类型，保留原样
                    Logger.log('处理备注span:', text, '备注内容:', span.getAttribute('data-inline-memo-content'));
                    markdownText = span.outerHTML;
                    shouldReplace = false; // 保留原HTML
                } else if (span.style.backgroundColor && span.style.backgroundColor !== 'transparent') {
                    // 其他有背景颜色的span，保留原样
                    markdownText = span.outerHTML;
                    shouldReplace = false; // 保留原HTML
                }
                
                // 只有在需要替换时才替换
                if (shouldReplace && markdownText !== span.outerHTML) {
                    if (markdownText.startsWith('<span')) {
                        // 如果是HTML，创建新的span
                        const newSpan = document.createElement('div');
                        newSpan.innerHTML = markdownText;
                        span.parentNode?.replaceChild(newSpan.firstChild || document.createTextNode(text), span);
                    } else {
                        // 如果是纯文本，创建文本节点
                        const textNode = document.createTextNode(markdownText);
                        span.parentNode?.replaceChild(textNode, span);
                    }
                }
                // 如果 shouldReplace 为 false，则保留原 span 不变
            });
            
            // 返回处理后的HTML内容（保留span标签）
            return tempDiv.innerHTML;
            
        } catch (error) {
            Logger.error('转换高亮 span 失败:', error);
            return html;
        }
    }
    
    /**
     * 恢复原始HTML
     */
    private restoreOriginalHTML(blockId: string, originalHTML: string): void {
        try {
            const blockElement = document.querySelector(`[data-node-id="${blockId}"]`);
            if (blockElement && blockElement.parentNode) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = originalHTML;
                const newElement = tempDiv.firstElementChild;
                if (newElement) {
                    blockElement.parentNode.replaceChild(newElement, blockElement);
                }
            }
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 隐藏工具栏并清除选择
     */
    private hideToolbarAndClearSelection(protyle: any): void {
        try {
            // 隐藏工具栏
            if (protyle.toolbar && protyle.toolbar.element) {
                protyle.toolbar.element.style.display = "none";
            }
            
            // 清除选择
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
            }
            
            
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 设置自动隐藏机制
     */
    private setupAutoHide(toolbar: any): void {
        try {
            // 先清理之前的监听器
            this.cleanupEventListeners();
            
            // 监听文档点击事件，点击工具栏外部时隐藏
            const hideOnClickOutside = (e: Event) => {
                const target = e.target as HTMLElement;
                const toolbarElement = toolbar.subElement;
                
                // 如果点击的不是工具栏或其子元素，则隐藏工具栏
                if (toolbarElement && !toolbarElement.contains(target)) {
                    this.hideToolbar(toolbar);
                    this.cleanupEventListeners();
                }
            };
            
            // 创建清理函数
            const cleanup = () => {
                document.removeEventListener('click', hideOnClickOutside, true);
                document.removeEventListener('touchstart', hideOnClickOutside, true);
            };
            
            // 存储清理函数
            this.activeEventListeners.push(cleanup);
            
            // 延迟添加监听器，避免立即触发
            setTimeout(() => {
                document.addEventListener('click', hideOnClickOutside, true);
                document.addEventListener('touchstart', hideOnClickOutside, true);
            }, 100);
            
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 清理事件监听器
     */
    private cleanupEventListeners(): void {
        try {
            this.activeEventListeners.forEach(cleanup => cleanup());
            this.activeEventListeners = [];
            
            // 销毁闪卡快切管理器
            if (this.flashcardQuickSwitchManager) {
                this.flashcardQuickSwitchManager.destroy().catch((error) => {
                    Logger.error('销毁FlashcardQuickSwitchManager失败:', error);
                });
            }
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 获取颜色值 - 从全局配置中查找
     */
    private getColorValue(color: HighlightColor): string {
        const colorConfig = HIGHLIGHT_COLORS.find(c => c.name === color);
        if (colorConfig) {
            return colorConfig.bg;
        }
        
        // 备用扩展颜色（如果有）
        const extendedColors = {
            red: '#f8d7da',
            purple: '#e2d9f7'
        };
        return extendedColors[color as keyof typeof extendedColors] || '#fff3cd';
    }
    
    /**
     * 简化的工具栏位置调整
     */
    private adjustToolbarPosition(toolbar: any, range: Range): void {
        try {
            const subElement = toolbar.subElement;
            if (!subElement) return;
            
            const toolbarRect = subElement.getBoundingClientRect();
            const selectionRect = range.getBoundingClientRect();
            
            let needsAdjust = false;
            let newLeft = parseFloat(subElement.style.left) || toolbarRect.left;
            let newTop = parseFloat(subElement.style.top) || toolbarRect.top;
            
            // 右边界检查
            if (toolbarRect.right > window.innerWidth - 10) {
                newLeft = window.innerWidth - toolbarRect.width - 10;
                needsAdjust = true;
            }
            
            // 左边界检查
            if (toolbarRect.left < 10) {
                newLeft = 10;
                needsAdjust = true;
            }
            
            // 下边界检查
            if (toolbarRect.bottom > window.innerHeight - 10) {
                newTop = selectionRect.top - toolbarRect.height - 10;
                needsAdjust = true;
            }
            
            // 应用调整
            if (needsAdjust) {
                subElement.style.left = newLeft + 'px';
                subElement.style.top = newTop + 'px';
                subElement.style.position = 'fixed';
            }
            
        } catch (error) {
            // 静默处理错误
        }
    }

    /**
     * 重置工具栏可见性
     */
    private resetToolbarVisibility(toolbar: any): void {
        try {
            if (toolbar.subElement) {
                toolbar.subElement.style.display = '';
            }
            if (toolbar.element) {
                toolbar.element.style.display = '';
            }
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 清理之前添加的按钮
     */
    private cleanupPreviousButtons(container: HTMLElement): void {
        try {
            // 移除之前添加的高亮按钮
            const highlightBtns = container.querySelectorAll('.highlight-btn, .remove-btn, .comment-btn');
            highlightBtns.forEach(btn => btn.remove());
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 隐藏工具栏
     */
    private hideToolbar(toolbar: any): void {
        try {
            if (toolbar.subElement) {
                toolbar.subElement.style.display = 'none';
            }
            // 也尝试隐藏toolbar.element
            if (toolbar.element) {
                toolbar.element.style.display = 'none';
            }
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 清除选择
     */
    private clearSelection(): void {
        try {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
            }
        } catch (error) {
            // 静默处理错误
        }
    }

    /**
     * 生成唯一ID
     */
    private generateId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `hl-${timestamp}-${random}`;
    }
    
    /**
     * 核心高亮方法 - 使用统一的解锁-操作-加锁包装
     */
    private async applyHighlightCore(
        protyle: any,
        range: Range,
        colorConfig: { type: string; color: string },
        colorName: string
    ): Promise<void> {
        // 验证参数
        if (!protyle || !protyle.toolbar || typeof protyle.toolbar.setInlineMark !== 'function') {
            Logger.error('protyle.toolbar.setInlineMark 不可用');
            return;
        }

        const selectedText = range.toString().trim();
        if (!selectedText) {
            Logger.warn('没有选中文本');
            return;
        }

        // 🔑 使用统一的操作包装器
        await operationWrapper.executeWithUnlockLock(
            `应用${colorName}高亮`,
            async () => {
                return await this.performApplyHighlight(protyle, range, colorConfig, colorName);
            }
        );
    }

    /**
     * 执行应用高亮的核心逻辑（不包含解锁加锁）
     */
    private async performApplyHighlight(
        protyle: any,
        range: Range,
        colorConfig: { type: string; color: string },
        colorName: string
    ): Promise<void> {
        // 更新 range
        protyle.toolbar.range = range;

        // 使用思源原生方法
        protyle.toolbar.setInlineMark(protyle, "text", "range", colorConfig);

        Logger.log(`✅ 已应用${colorName}高亮`);
    }

    /**
     * 检测是否为跨块选择
     */
    private isCrossBlockSelection(range: Range): boolean {
        try {
            const startContainer = range.startContainer;
            const endContainer = range.endContainer;
            
            // 如果开始和结束容器相同，肯定不跨块
            if (startContainer === endContainer) {
                return false;
            }
            
            // 查找开始位置所在的块
            const startBlock = this.findBlockElement(startContainer);
            const endBlock = this.findBlockElement(endContainer);
            
            // 如果找不到块元素，认为是跨块
            if (!startBlock || !endBlock) {
                Logger.log('无法找到块元素，可能跨块选择');
                return true;
            }
            
            // 获取块ID进行比较
            const startBlockId = startBlock.getAttribute('data-node-id');
            const endBlockId = endBlock.getAttribute('data-node-id');
            
            // 如果块ID不同，则为跨块选择
            if (startBlockId !== endBlockId) {
                Logger.log('跨块选择检测:', {
                    startBlockId,
                    endBlockId,
                    selectedText: range.toString().substring(0, 50) + '...'
                });
                return true;
            }
            
            return false;
            
        } catch (error) {
            Logger.error('跨块检测失败:', error);
            // 出错时为安全起见，认为是跨块选择
            return true;
        }
    }

    /**
     * 恢复块的只读状态（阅读模式）
     */
    private restoreReadOnlyState(blockId: string): void {
        try {
            const blockElement = document.querySelector(`[data-node-id="${blockId}"]`);
            if (!blockElement) {
                Logger.warn('未找到要恢复只读状态的块元素');
                return;
            }

            Logger.log('恢复块的只读状态:', blockId);

            // 查找所有可编辑的div元素
            const editableDivs = blockElement.querySelectorAll('div[contenteditable="true"]');
            editableDivs.forEach(div => {
                Logger.log('将div设置为只读:', div);
                div.setAttribute('contenteditable', 'false');
            });

            // 确保块本身也是只读的（如果它有contenteditable属性）
            if (blockElement.hasAttribute('contenteditable')) {
                blockElement.setAttribute('contenteditable', 'false');
            }

            // 移除可能的编辑相关class
            blockElement.classList.remove('protyle-wysiwyg__block--editing');
            
            // 确保块处于只读模式
            const contentDiv = blockElement.querySelector('div[contenteditable]');
            if (contentDiv) {
                contentDiv.setAttribute('contenteditable', 'false');
                Logger.log('内容区域已设置为只读');
            }

        } catch (error) {
            Logger.error('恢复只读状态失败:', error);
        }
    }

    
    /**
     * 设置鼠标选择监听器（备用方案）
     */
    private setupMouseSelectionListener(): void {
        let selectionTimeout: NodeJS.Timeout | null = null;
        let lastSelectionText = '';
        
        const handleSelection = () => {
            if (selectionTimeout) {
                clearTimeout(selectionTimeout);
            }
            
            selectionTimeout = setTimeout(() => {
                const selection = window.getSelection();
                if (selection && selection.toString().trim()) {
                    const selectedText = selection.toString().trim();
                    
                    // 避免重复处理相同选择
                    if (selectedText === lastSelectionText) {
                        return;
                    }
                    lastSelectionText = selectedText;
                    
                    Logger.log('\n📱 ========== 检测到文本选中（mouseup/selectionchange）==========');
                    Logger.log('选中文本:', selectedText.substring(0, 50));
                    
                    // 🔍 在工具栏显示之前检查只读状态 - 根据当前选区找到对应的面包屑锁按钮
                    const range = selection.getRangeAt(0);
                    const readonlyBtn = this.findReadonlyButtonForRange(range);
                    let isDocReadonly = false;
                    
                    if (readonlyBtn) {
                        const ariaLabel = readonlyBtn.getAttribute('aria-label') || '';
                        const dataSubtype = readonlyBtn.getAttribute('data-subtype') || '';
                        const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
                        
                        // 🔑 正确判断锁定状态（与memoManager.ts保持一致）
                        // '解除锁定'/'临时解锁' = 已锁定（只读模式）
                        // '锁定编辑'/'取消临时解锁' = 可编辑（未锁定）
                        const isLocked = 
                            ariaLabel.includes('解除锁定') ||   // "解除锁定" → 当前已锁定
                            ariaLabel.includes('临时解锁') ||   // "临时解锁" → 当前已锁定
                            dataSubtype === 'lock' ||          // data-subtype="lock" → 当前已锁定
                            iconHref === '#iconLock';          // 图标为锁定状态
                        
                        isDocReadonly = isLocked;
                        
                        Logger.log('🔐 面包屑锁按钮状态（工具栏显示前-宽松检查）:', {
                            'aria-label': ariaLabel,
                            'data-subtype': dataSubtype,
                            '图标href': iconHref,
                            '是否锁定': isLocked ? '🔒 是（已锁定）' : '✏️ 否（未锁定）',
                            '是否只读': isDocReadonly ? '🔒 是（锁定）' : '✏️ 否（解锁）',
                            '按钮来源': '当前选区对应的protyle容器',
                            '检查时间': new Date().toLocaleTimeString()
                        });
                    } else {
                        Logger.warn('⚠️ 未找到面包屑锁按钮');
                    }
                    
                    // 🔒 核心限制：只有在加锁（只读）状态下才显示高亮工具栏
                    if (!isDocReadonly) {
                        Logger.log('⛔ 文档未加锁（可编辑状态），不显示自定义工具栏');
                        return;
                    }
                    
                    Logger.log('✅ 文档已加锁（只读状态），允许显示自定义工具栏');
                    
                    // 检查是否跨块选择
                    if (this.isCrossBlockSelection(range)) {
                        return;
                    }
                    
                    // 检查是否在思源编辑器中
                    const blockElement = this.findBlockElement(range.startContainer);
                    if (!blockElement) {
                        return;
                    }
                    
                    // 尝试显示自定义工具栏
                    this.showCustomToolbar(selection);
                } else {
                    lastSelectionText = '';
                    // 清除选择时隐藏工具栏
                    this.hideCustomToolbar();
                }
            }, 300);
        };
        
        // 监听选择变化
        document.addEventListener('selectionchange', handleSelection);
        
        // 监听鼠标事件
        document.addEventListener('mouseup', handleSelection);
        
        // 监听键盘事件（ESC键隐藏工具栏）
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.hideCustomToolbar();
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // 存储清理函数
        const cleanup = () => {
            document.removeEventListener('selectionchange', handleSelection);
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('keydown', handleKeydown);
            if (selectionTimeout) {
                clearTimeout(selectionTimeout);
            }
        };
        
        this.activeEventListeners.push(cleanup);
    }
    
    /**
     * 显示自定义工具栏
     */
    private showCustomToolbar(selection: Selection): void {
        try {
            // 先隐藏之前的工具栏
            this.hideCustomToolbar();
            
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // 检查选择是否有效
            if (rect.width === 0 && rect.height === 0) {
                return;
            }
            
            // 创建自定义工具栏
            const toolbar = document.createElement('div');
            toolbar.className = 'highlight-assistant-custom-toolbar';
            
            // 计算位置
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            let top = rect.top + scrollTop - 50;
            let left = rect.left + scrollLeft + rect.width / 2;
            
            // 边界检查
            const toolbarWidth = 200;
            const viewportWidth = window.innerWidth;
            
            if (left - toolbarWidth / 2 < 10) {
                left = toolbarWidth / 2 + 10;
            } else if (left + toolbarWidth / 2 > viewportWidth - 10) {
                left = viewportWidth - toolbarWidth / 2 - 10;
            }
            
            if (top < scrollTop + 10) {
                top = rect.bottom + scrollTop + 10;
            }
            
            // 使用 StyleManager 设置工具栏样式
            toolbar.style.cssText = StyleManager.getCustomToolbarStyle(top, left);
            
            // 使用全局统一的颜色配置
            const colors = HIGHLIGHT_COLORS;
            
            colors.forEach(color => {
                const btn = document.createElement('button');
                btn.style.cssText = StyleManager.getCustomToolbarColorButtonStyle(this.isMobile, color.bg);
                btn.title = color.displayName;
                
                btn.addEventListener('click', () => {
                    this.applyCustomHighlight(range, color);
                    this.hideCustomToolbar();
                });
                
                toolbar.appendChild(btn);
            });
            
            // 添加删除按钮
            const removeBtn = document.createElement('button');
            removeBtn.style.cssText = StyleManager.getCustomToolbarRemoveButtonStyle(this.isMobile);
            removeBtn.textContent = '×';
            removeBtn.title = '删除高亮';
            
            removeBtn.addEventListener('click', () => {
                this.removeCustomHighlight(range);
                this.hideCustomToolbar();
            });
            
            toolbar.appendChild(removeBtn);
            
            // 添加备注按钮（调用 MemoManager）
            const commentBtn = document.createElement('button');
            commentBtn.style.cssText = StyleManager.getCustomToolbarCommentButtonStyle(this.isMobile);
            commentBtn.textContent = '💭';
            commentBtn.title = '添加备注';
            
            commentBtn.addEventListener('click', async () => {
                // 调用 MemoManager 的方法（会显示输入框）
                await this.memoManager.addMemoWithPrompt(range);
                this.hideCustomToolbar();
            });
            
            toolbar.appendChild(commentBtn);
            
            // 添加到页面
            document.body.appendChild(toolbar);
            
            // 存储工具栏引用
            (this as any).customToolbar = toolbar;
            
            // 添加点击外部隐藏
            const hideOnClickOutside = (e: Event) => {
                if (!toolbar.contains(e.target as Node)) {
                    this.hideCustomToolbar();
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', hideOnClickOutside);
                (this as any).hideOnClickOutside = hideOnClickOutside;
            }, 100);
            
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 隐藏自定义工具栏
     */
    private hideCustomToolbar(): void {
        const toolbar = (this as any).customToolbar;
        if (toolbar && toolbar.parentNode) {
            toolbar.parentNode.removeChild(toolbar);
            (this as any).customToolbar = null;
        }
        
        const hideOnClickOutside = (this as any).hideOnClickOutside;
        if (hideOnClickOutside) {
            document.removeEventListener('click', hideOnClickOutside);
            (this as any).hideOnClickOutside = null;
        }
    }
    
    /**
     * 应用自定义高亮 - 使用思源原生方法
     */
    private async applyCustomHighlight(range: Range, color: {name: string, bg: string}): Promise<void> {
        try {
            const selectedText = range.toString().trim();
            if (!selectedText) return;
            
            // 获取当前编辑器的protyle对象
            const editors = getAllEditor();
            if (editors.length === 0) {
                Logger.warn('没有可用的编辑器');
                return;
            }
            
            const currentEditor = editors[0];
            if (!currentEditor.protyle || !currentEditor.protyle.toolbar) {
                Logger.warn('编辑器toolbar不可用');
                return;
            }

            // 调用统一的核心方法
            await this.applyHighlightCore(
                currentEditor.protyle,
                range,
                {
                    type: "backgroundColor",
                    color: color.bg
                },
                color.name
            );
            
        } catch (error) {
            Logger.error('应用自定义高亮出错:', error);
        }
    }
    
    /**
     * 删除自定义高亮 - 使用思源原生方法
     */
    private async removeCustomHighlight(range: Range): Promise<void> {
        const selectedText = range.toString().trim();
        if (!selectedText) return;

        // 获取当前编辑器的protyle对象
        const editors = getAllEditor();
        if (editors.length === 0) {
            Logger.warn('没有可用的编辑器');
            return;
        }
        
        const currentEditor = editors[0];
        if (!currentEditor.protyle || !currentEditor.protyle.toolbar) {
            Logger.warn('编辑器toolbar不可用');
            return;
        }

        // 🔑 使用统一的操作包装器
        await operationWrapper.executeWithUnlockLock(
            '删除自定义高亮',
            async () => {
                return await this.performRemoveCustomHighlight(currentEditor.protyle, range);
            }
        );
    }

    /**
     * 执行删除自定义高亮的核心逻辑（不包含解锁加锁）
     */
    private async performRemoveCustomHighlight(protyle: any, range: Range): Promise<void> {
        // 设置范围并移除高亮
        protyle.toolbar.range = range;
        protyle.toolbar.setInlineMark(protyle, "text", "range", {
            type: "backgroundColor",
            color: ""
        });

        Logger.log('✅ 删除自定义高亮完成');
    }

    // 已移除旧的 restoreReadonlyModeEnhanced 方法，现在使用统一的操作包装器

    /**
     * 获取劫持状态
     */
    public get hijacked(): boolean {
        return this.isHijacked;
    }
    
    /**
     * 获取高亮点击管理器（用于调试）
     */
    public getHighlightClickManager(): any {
        return this.highlightClickManager;
    }
    
    /**
     * 获取标签管理器（用于调试）
     */
    public getTagManager(): any {
        return this.tagManager;
    }
    
    /**
     * 获取标签点击管理器（用于调试）
     */
    public getTagClickManager(): any {
        return this.tagClickManager;
    }
    
    /**
     * 设置锁按钮点击监听器，实时响应用户的锁定/解锁操作
     * 修复：用事件驱动代替愚蠢的定时轮询
     */
    private setupReadonlyButtonListener(): void {
        Logger.log('🔒 设置锁按钮点击监听器，实时响应状态变化...');
        
        // 监听所有锁按钮的点击事件
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            
            // 检查是否点击了锁按钮
            if (target.closest('button[data-type="readonly"]')) {
                Logger.log('🔒 检测到锁按钮点击，延迟刷新状态...');
                
                // 延迟一下让按钮状态更新完成
                setTimeout(() => {
                    this.refreshEditingStateCache();
                }, 100);
            }
        });
        
        Logger.log('✅ 锁按钮点击监听器已设置');
    }
    
    /**
     * 设置tab切换监听器，解决编辑状态识别问题
     * 修复BUG：tab切换时编辑状态无法感知的问题
     */
    private setupTabSwitchListener(): void {
        Logger.log('🎯 设置tab切换监听器，修复编辑状态识别问题...');
        
        try {
            // 使用插件事件总线监听思源的 switch-protyle-mode 事件
            if (typeof window !== 'undefined' && (window as any).siyuan) {
                const eventBus = (window as any).siyuan.ws;
                if (eventBus && typeof eventBus.addEventListener === 'function') {
                    eventBus.addEventListener('message', (event: any) => {
                        try {
                            const data = JSON.parse(event.data);
                            if (data.cmd === 'switch-protyle-mode') {
                                Logger.log('🔄 检测到protyle模式切换事件');
                                this.handleProtyleModeSwitch(data);
                            }
                        } catch (e) {
                            // 忽略非JSON消息
                        }
                    });
                    
                    Logger.log('✅ 已监听 switch-protyle-mode 事件');
                }
            }
            
            // 备用方案1：监听DOM变化，检测tab切换
            this.setupDOMChangeListener();
            
            // 备用方案2：监听窗口焦点变化
            this.setupWindowFocusListener();
            
            // 备用方案3：监听选择变化，间接检测tab切换
            this.setupSelectionChangeListener();
            
        } catch (error) {
            Logger.error('❌ 设置tab切换监听器失败:', error);
        }
    }
    
    /**
     * 处理protyle模式切换事件
     */
    private handleProtyleModeSwitch(data: any): void {
        Logger.log('🔄 处理protyle模式切换:', data);
        
        // 延迟处理，等待DOM更新
        setTimeout(() => {
            this.refreshEditingStateCache();
        }, 200);
    }
    
    /**
     * 设置DOM变化监听器（备用方案1）
     */
    private setupDOMChangeListener(): void {
        const observer = new MutationObserver((mutations) => {
            let hasTabChange = false;
            
            mutations.forEach((mutation) => {
                // 检测tab相关的DOM变化
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            if (element.classList?.contains('layout-tab-container') ||
                                element.classList?.contains('protyle-wysiwyg') ||
                                element.querySelector?.('.protyle-wysiwyg')) {
                                hasTabChange = true;
                            }
                        }
                    });
                }
                
                // 检测属性变化（如active状态）
                if (mutation.type === 'attributes') {
                    const element = mutation.target as Element;
                    if (mutation.attributeName === 'class' && 
                        (element.classList?.contains('layout-tab-container') ||
                         element.classList?.contains('item--focus'))) {
                        hasTabChange = true;
                    }
                }
            });
            
            if (hasTabChange) {
                Logger.log('🔄 检测到tab相关DOM变化，刷新编辑状态缓存');
                setTimeout(() => {
                    this.refreshEditingStateCache();
                }, 300);
            }
        });
        
        // 监听整个文档的变化，但限制范围提高性能
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-type']
        });
        
        Logger.log('✅ DOM变化监听器已设置');
    }
    
    /**
     * 设置窗口焦点监听器（备用方案2）
     */
    private setupWindowFocusListener(): void {
        let lastFocusTime = 0;
        
        const handleFocus = () => {
            const now = Date.now();
            // 防抖，避免频繁触发
            if (now - lastFocusTime < 500) return;
            lastFocusTime = now;
            
            Logger.log('🔄 窗口焦点变化，检查编辑状态');
            setTimeout(() => {
                this.refreshEditingStateCache();
            }, 100);
        };
        
        window.addEventListener('focus', handleFocus);
        document.addEventListener('focusin', handleFocus);
        
        Logger.log('✅ 窗口焦点监听器已设置');
    }
    
    /**
     * 设置选择变化监听器（备用方案3）
     */
    private setupSelectionChangeListener(): void {
        let lastSelectionTime = 0;
        let lastActiveElement: Element | null = null;
        
        const handleSelectionChange = () => {
            const now = Date.now();
            const activeElement = document.activeElement;
            
            // 检查是否切换到了不同的编辑器
            if (activeElement !== lastActiveElement) {
                const isInEditor = activeElement?.closest('.protyle-wysiwyg') !== null;
                if (isInEditor && now - lastSelectionTime > 300) {
                    Logger.log('🔄 检测到编辑器切换，刷新编辑状态');
                    this.refreshEditingStateCache();
                    lastSelectionTime = now;
                }
                lastActiveElement = activeElement;
            }
        };
        
        document.addEventListener('selectionchange', handleSelectionChange);
        
        Logger.log('✅ 选择变化监听器已设置');
    }
    
    /**
     * 刷新编辑状态缓存
     * 这是修复tab切换问题的核心方法
     */
    private refreshEditingStateCache(): void {
        try {
            Logger.log('🔄 刷新编辑状态缓存...');
            
            // 🔑 强制清理所有可能的状态缓存
            this.clearEditingStateCache();
            
            // 🔑 延迟检查，等待DOM完全更新（关键修复）
            setTimeout(() => {
                this.performDelayedStateCheck();
            }, 300); // 给足够时间让DOM更新
            
        } catch (error) {
            Logger.error('❌ 刷新编辑状态缓存失败:', error);
        }
    }
    
    /**
     * 延迟执行状态检查（修复时机问题）
     */
    private performDelayedStateCheck(): void {
        try {
            Logger.log('⏰ 执行延迟状态检查...');
            
            // 重新检查当前活动的编辑器状态
            const currentReadonlyState = this.getCurrentReadonlyState();
            Logger.log('📋 当前编辑状态（延迟检查）:', {
                isReadonly: currentReadonlyState.isReadonly,
                source: currentReadonlyState.source,
                timestamp: new Date().toLocaleTimeString()
            });
            
            // 如果有活动的自定义工具栏，根据新状态决定是否隐藏
            if (!currentReadonlyState.isReadonly) {
                Logger.log('⛔ 文档现在是可编辑状态，隐藏自定义工具栏');
                this.hideCustomToolbar();
            } else {
                Logger.log('✅ 文档现在是只读状态，允许显示自定义工具栏');
            }
            
        } catch (error) {
            Logger.error('❌ 延迟状态检查失败:', error);
        }
    }
    
    /**
     * 清理编辑状态缓存
     */
    private clearEditingStateCache(): void {
        try {
            Logger.log('🧹 强制清理编辑状态缓存...');
            
            // 🔑 清理可能的内部缓存状态
            // 这里可以清理任何缓存的状态信息
            
            // 🔑 强制重新获取DOM元素（避免缓存的DOM引用）
            // 清除可能缓存的按钮引用等
            
            Logger.log('✅ 编辑状态缓存已清理');
            
        } catch (error) {
            Logger.error('❌ 清理编辑状态缓存失败:', error);
        }
    }
    
    /**
     * 根据选区找到对应的面包屑锁按钮
     * 修复BUG：确保取的是当前光标所在文档的锁按钮，而不是随便取一个
     */
    private findReadonlyButtonForRange(range: Range): HTMLElement | null {
        try {
            if (!range) {
                Logger.warn('⚠️ 没有选区，无法定位面包屑锁按钮');
                return null;
            }
            
            // 1. 从选区找到所在的protyle容器
            let element = range.startContainer as HTMLElement;
            if (element.nodeType === Node.TEXT_NODE) {
                element = element.parentElement!;
            }
            
            // 向上查找protyle容器
            let protyleElement: HTMLElement | null = null;
            while (element && element !== document.body) {
                if (element.classList?.contains('protyle')) {
                    protyleElement = element;
                    break;
                }
                element = element.parentElement!;
            }
            
            if (!protyleElement) {
                Logger.warn('⚠️ 未找到protyle容器');
                return this.fallbackFindReadonlyButton();
            }
            
            // 2. 在该protyle容器内查找面包屑锁按钮
            const readonlyBtn = protyleElement.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
            
            if (readonlyBtn) {
                Logger.log('✅ 找到当前文档的面包屑锁按钮');
                return readonlyBtn;
            } else {
                Logger.warn('⚠️ 当前protyle容器内未找到面包屑锁按钮');
                return this.fallbackFindReadonlyButton();
            }
            
        } catch (error) {
            Logger.error('❌ 查找面包屑锁按钮失败:', error);
            return this.fallbackFindReadonlyButton();
        }
    }
    
    /**
     * 检测当前环境是否为移动端
     */
    private detectMobileEnvironment(): boolean {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768 ||
               document.body.classList.contains('body--mobile') ||
               document.querySelector('.toolbar--mobile') !== null;
    }

    /**
     * 备用方案：查找面包屑锁按钮
     * 桌面版使用官方API，移动版使用DOM查询
     */
    private fallbackFindReadonlyButton(): HTMLElement | null {
        // 使用实时检测而不是构造时的属性，因为环境可能会变化
        const isMobileEnv = this.detectMobileEnvironment();
        
        let result: HTMLElement | null = null;
        
        if (isMobileEnv) {
            Logger.log('📱 移动端模式：使用DOM查询方式查找面包屑锁按钮...');
            result = this.findReadonlyButtonForMobile();
        } else {
            Logger.log('🖥️ 桌面版模式：使用思源官方API查找当前活跃tab的面包屑锁按钮...');
            result = this.findReadonlyButtonForDesktop();
        }
        
        // 如果平台特定方法失败，使用通用兜底方法
        if (!result) {
            Logger.log('🔄 平台特定方法失败，尝试通用兜底方法...');
            result = this.fallbackFindAnyReadonlyButton();
        }
        
        return result;
    }

    /**
     * 移动端查找面包屑锁按钮
     */
    private findReadonlyButtonForMobile(): HTMLElement | null {
        try {
            // 移动端通常只有一个活跃的编辑器
            const protyleElements = document.querySelectorAll('.protyle:not(.fn__none)');
            Logger.log(`📱 找到 ${protyleElements.length} 个可见的protyle元素`);
            
            for (const protyle of protyleElements) {
                const readonlyBtn = protyle.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
                if (readonlyBtn) {
                    Logger.log('✅ 移动端找到面包屑锁按钮');
                    return readonlyBtn;
                }
            }
            
            // 备用方案：查找当前可见的面包屑
            const visibleBreadcrumbs = document.querySelectorAll('.protyle-breadcrumb:not(.fn__none)');
            for (const breadcrumb of visibleBreadcrumbs) {
                const readonlyBtn = breadcrumb.querySelector('button[data-type="readonly"]') as HTMLElement;
                if (readonlyBtn) {
                    Logger.log('✅ 移动端通过可见面包屑找到锁按钮');
                    return readonlyBtn;
                }
            }
            
            Logger.warn('⚠️ 移动端未找到面包屑锁按钮');
            return null;
            
        } catch (error) {
            Logger.error('❌ 移动端查找锁按钮失败:', error);
            return null;
        }
    }

    /**
     * 桌面版查找面包屑锁按钮
     */
    private findReadonlyButtonForDesktop(): HTMLElement | null {
        try {
            // 🎯 使用 getActiveEditor API（v3.3.0+）更准确
            const currentProtyle = getActiveEditor?.(false)?.protyle;
            
            if (currentProtyle?.element) {
                const readonlyBtn = currentProtyle.element.querySelector('.protyle-breadcrumb > button[data-type="readonly"]') as HTMLElement;
                if (readonlyBtn) {
                    Logger.log('✅ 通过 getActiveEditor 找到锁按钮');
                    return readonlyBtn;
                } else {
                    Logger.warn('⚠️ 当前编辑器中未找到锁按钮');
                }
            } else {
                Logger.warn('⚠️ getActiveEditor 未找到活跃编辑器');
            }
            
        } catch (error) {
            Logger.error('❌ 使用思源官方API查找活跃tab失败:', error);
            // 降级到移动端方案
            return this.findReadonlyButtonForMobile();
        }
        
        return null;
    }

    /**
     * 通用的兜底查找方法
     */
    private fallbackFindAnyReadonlyButton(): HTMLElement | null {
        // 方案：查找当前有焦点的编辑器
        const focusedElement = document.activeElement;
        if (focusedElement) {
            Logger.log(`🔍 尝试通过焦点元素查找: ${focusedElement.tagName}.${focusedElement.className}`);
            const protyleContainer = focusedElement.closest('.protyle') as HTMLElement;
            if (protyleContainer) {
                const readonlyBtn = protyleContainer.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
                if (readonlyBtn) {
                    Logger.log('✅ 通过焦点元素找到面包屑锁按钮');
                    return readonlyBtn;
                }
            }
        }
        
        // 最后兜底（显示明确警告）
        const readonlyBtn = document.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
        if (readonlyBtn) {
            Logger.warn('⚠️ 使用兜底方案找到面包屑锁按钮（可能不准确！！！）');
        } else {
            Logger.error('❌ 完全找不到任何面包屑锁按钮');
        }
        return readonlyBtn;
    }
    
    /**
     * 获取当前只读状态（实时检查）
     */
    private getCurrentReadonlyState(): { isReadonly: boolean; source: string } {
        // 方式1：检查当前活跃文档的面包屑锁按钮（最准确）
        const readonlyBtn = this.fallbackFindReadonlyButton();  // 使用活跃tab查找
        
        if (readonlyBtn) {
            const ariaLabel = readonlyBtn.getAttribute('aria-label') || '';
            const dataSubtype = readonlyBtn.getAttribute('data-subtype') || '';
            const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
            
            // 🔑 正确判断锁定状态（与memoManager.ts保持一致）
            // '解除锁定'/'临时解锁' = 已锁定（只读模式）
            // '锁定编辑'/'取消临时解锁' = 可编辑（未锁定）
            const isLocked = 
                ariaLabel.includes('解除锁定') ||   // "解除锁定" → 当前已锁定
                ariaLabel.includes('临时解锁') ||   // "临时解锁" → 当前已锁定
                dataSubtype === 'lock' ||          // data-subtype="lock" → 当前已锁定
                iconHref === '#iconLock';          // 图标为锁定状态
            
            return {
                isReadonly: isLocked,
                source: '活跃文档面包屑锁按钮'
            };
        }
        
        // 方式2：检查当前活动编辑器的DOM属性
        const activeWysiwyg = document.querySelector('.protyle-wysiwyg.protyle-wysiwyg--attr') as HTMLElement;
        if (activeWysiwyg) {
            const customReadonly = activeWysiwyg.getAttribute('custom-sy-readonly');
            if (customReadonly) {
                return {
                    isReadonly: customReadonly === 'true',
                    source: 'DOM属性'
                };
            }
        }
        
        // 默认假设为可编辑状态
        return {
            isReadonly: false,
            source: '默认值'
        };
    }
    
    /**
     * 获取闪卡快切管理器（用于调试）
     */
    public getFlashcardQuickSwitchManager(): FlashcardQuickSwitchManager {
        return this.flashcardQuickSwitchManager;
    }
    
}


