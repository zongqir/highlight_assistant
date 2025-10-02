import Logger from './logger';
/**
 * 自定义工具栏管理器 - 负责自定义工具栏的显示、隐藏和位置调整
 * 从 toolbarHijacker.ts 中提取，减少主文件大小
 */

import { StyleManager, HIGHLIGHT_COLORS } from './styleManager';
import { MemoManager } from './memoManager';

export class CustomToolbarManager {
    private isMobile: boolean;
    private memoManager: MemoManager;
    private customToolbar: HTMLElement | null = null;
    private hideOnClickOutside: ((e: Event) => void) | null = null;
    private onHighlightApply: (range: Range, color: {name: string, bg: string}) => Promise<void>;
    private onHighlightRemove: (range: Range) => Promise<void>;
    private findBlockElement: (node: Node) => HTMLElement | null;
    private isCrossBlockSelection: (range: Range) => boolean;
    private activeEventListeners: (() => void)[] = [];

    constructor(
        isMobile: boolean,
        memoManager: MemoManager,
        callbacks: {
            onHighlightApply: (range: Range, color: {name: string, bg: string}) => Promise<void>;
            onHighlightRemove: (range: Range) => Promise<void>;
            findBlockElement: (node: Node) => HTMLElement | null;
            isCrossBlockSelection: (range: Range) => boolean;
        }
    ) {
        this.isMobile = isMobile;
        this.memoManager = memoManager;
        this.onHighlightApply = callbacks.onHighlightApply;
        this.onHighlightRemove = callbacks.onHighlightRemove;
        this.findBlockElement = callbacks.findBlockElement;
        this.isCrossBlockSelection = callbacks.isCrossBlockSelection;
    }

    /**
     * 设置鼠标选择监听器（备用方案）
     */
    setupMouseSelectionListener(): void {
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
                    
                    // 🔍 在工具栏显示之前检查当前活跃文档的只读状态
                    const readonlyBtn = this.getCurrentActiveReadonlyButton();
                    let isDocReadonly = false;
                    
                    if (readonlyBtn) {
                        const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
                        
                        // 🎯 基于思源源码的正确判断逻辑：
                        // isReadonly = target.querySelector("use").getAttribute("xlink:href") !== "#iconUnlock"
                        isDocReadonly = iconHref !== '#iconUnlock';
                        
                        Logger.log('🔐 当前活跃文档锁按钮状态:', {
                            '图标href': iconHref,
                            '是否只读': isDocReadonly ? '🔒 是（锁定）' : '✏️ 否（解锁）'
                        });
                    } else {
                        Logger.warn('⚠️ 未找到当前活跃文档的面包屑锁按钮');
                    }
                    
                    // 🔒 核心限制：只有在加锁（只读）状态下才显示高亮工具栏
                    if (!isDocReadonly) {
                        Logger.log('⛔ 文档未加锁（可编辑状态），不显示自定义工具栏');
                        return;
                    }
                    
                    // 🎨 检查选中内容是否在代码块或数学公式中，如果是则不显示工具栏
                    if (this.isInRestrictedBlock(selection)) {
                        Logger.log('⛔ 选中内容在代码块或数学公式中，不显示自定义工具栏');
                        return;
                    }
                    
                    Logger.log('✅ 文档已加锁（只读状态），允许显示自定义工具栏');
                    
                    // 检查是否跨块选择
                    if (this.isCrossBlockSelection(selection.getRangeAt(0))) {
                        return;
                    }
                    
                    // 检查是否在思源编辑器中
                    const range = selection.getRangeAt(0);
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
    showCustomToolbar(selection: Selection): void {
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
                    this.onHighlightApply(range, color);
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
                this.onHighlightRemove(range);
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
            this.customToolbar = toolbar;
            
            // 添加点击外部隐藏
            this.hideOnClickOutside = (e: Event) => {
                if (!toolbar.contains(e.target as Node)) {
                    this.hideCustomToolbar();
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', this.hideOnClickOutside!);
            }, 100);
            
        } catch (error) {
            // 静默处理错误
        }
    }

    /**
     * 隐藏自定义工具栏
     */
    hideCustomToolbar(): void {
        if (this.customToolbar) {
            this.customToolbar.remove();
            this.customToolbar = null;
        }
        
        if (this.hideOnClickOutside) {
            document.removeEventListener('click', this.hideOnClickOutside);
            this.hideOnClickOutside = null;
        }
    }

    /**
     * 清理所有事件监听器
     */
    cleanup(): void {
        this.hideCustomToolbar();
        this.activeEventListeners.forEach(cleanup => cleanup());
        this.activeEventListeners = [];
    }
    
    /**
     * 检查选中内容是否在受限制的块中（代码块、数学公式等）
     */
    private isInRestrictedBlock(selection: Selection): boolean {
        try {
            if (!selection.rangeCount) return false;
            
            const range = selection.getRangeAt(0);
            let currentElement = range.commonAncestorContainer;
            
            // 如果是文本节点，获取其父元素
            if (currentElement.nodeType === Node.TEXT_NODE) {
                currentElement = currentElement.parentElement!;
            }
            
            // 向上遍历DOM树，查找块元素
            let blockElement = currentElement as HTMLElement;
            let depth = 0;
            const maxDepth = 10;
            
            while (blockElement && depth < maxDepth) {
                // 检查是否是思源的块元素
                const nodeId = blockElement.getAttribute('data-node-id');
                const dataType = blockElement.getAttribute('data-type');
                
                if (nodeId && dataType) {
                    // 找到了块元素，检查是否是受限制的类型
                    return this.isRestrictedBlockType(blockElement);
                }
                
                blockElement = blockElement.parentElement!;
                depth++;
            }
            
            return false;
            
        } catch (error) {
            Logger.error('❌ 检查受限制块失败:', error);
            // 出错时保守处理，阻止显示工具栏
            return true;
        }
    }
    
    /**
     * 检查块是否是受限制的类型
     * 高亮工具栏只禁止代码块和数学公式，允许内联样式
     */
    private isRestrictedBlockType(blockElement: HTMLElement): boolean {
        try {
            const innerHTML = blockElement.innerHTML;
            const dataType = blockElement.getAttribute('data-type');
            
            // 💻 检查是否是代码块
            if (dataType === 'code' || 
                blockElement.querySelector('code') ||
                blockElement.classList.contains('code-block') ||
                innerHTML.includes('hljs')) {
                Logger.log('💻 检测到代码块，禁止显示工具栏');
                return true;
            }
            
            // 📐 检查是否是数学公式块
            if (dataType === 'mathBlock' ||
                blockElement.querySelector('.katex') ||
                innerHTML.includes('\\(') || 
                innerHTML.includes('\\[') ||
                innerHTML.includes('katex')) {
                Logger.log('📐 检测到数学公式，禁止显示工具栏');
                return true;
            }
            
            // 🎨 高亮工具栏允许内联样式块，不检查 style= 属性
            
            return false;
            
        } catch (error) {
            Logger.error('❌ 检查块类型失败:', error);
            return true;
        }
    }
    
    /**
     * 获取当前活跃文档的锁按钮 - 增强调试版本
     */
    private getCurrentActiveReadonlyButton(): HTMLElement | null {
        try {
            Logger.log('🔍 开始查找当前活跃文档的锁按钮...');
            
            // 先检查思源的 getActiveTab API
            try {
                const { getActiveTab } = require('siyuan');
                const activeTab = getActiveTab();
                Logger.log('🔍 思源getActiveTab返回:', {
                    hasActiveTab: !!activeTab,
                    tabId: activeTab?.id,
                    title: activeTab?.title,
                    modelType: activeTab?.model?.type,
                    hasEditor: !!(activeTab?.model?.editor),
                    hasProtyle: !!(activeTab?.model?.protyle)
                });
                
                if (activeTab?.model?.editor?.protyle) {
                    const protyle = activeTab.model.editor.protyle;
                    const readonlyBtn = protyle.element?.querySelector('.protyle-breadcrumb button[data-type="readonly"]');
                    if (readonlyBtn) {
                        const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
                        Logger.log('✅ 通过getActiveTab找到锁按钮:', {
                            iconHref,
                            ariaLabel: readonlyBtn.getAttribute('aria-label'),
                            dataSubtype: readonlyBtn.getAttribute('data-subtype'),
                            protyleNodeId: protyle.element?.getAttribute('data-node-id')
                        });
                        return readonlyBtn as HTMLElement;
                    }
                }
            } catch (error) {
                Logger.log('⚠️ getActiveTab API不可用:', error.message);
            }
            
            // 方法1: 尝试通过焦点元素查找
            const focusedElement = document.activeElement;
            Logger.log('🔍 当前焦点元素:', {
                tagName: focusedElement?.tagName,
                className: focusedElement?.className,
                id: focusedElement?.id
            });
            
            if (focusedElement) {
                const protyleContainer = focusedElement.closest('.protyle') as HTMLElement;
                Logger.log('🔍 找到的protyle容器:', {
                    found: !!protyleContainer,
                    className: protyleContainer?.className,
                    dataNodeId: protyleContainer?.getAttribute('data-node-id')
                });
                
                if (protyleContainer) {
                    const readonlyBtn = protyleContainer.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
                    if (readonlyBtn) {
                        const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
                        Logger.log('✅ 方法1成功 - 通过焦点元素找到锁按钮:', {
                            iconHref,
                            ariaLabel: readonlyBtn.getAttribute('aria-label'),
                            dataSubtype: readonlyBtn.getAttribute('data-subtype')
                        });
                        return readonlyBtn;
                    }
                }
            }
            
            // 方法2: 查找活跃窗口中的锁按钮
            const activeWnd = document.querySelector('.layout__wnd--active');
            Logger.log('🔍 活跃窗口:', {
                found: !!activeWnd,
                className: activeWnd?.className
            });
            
            if (activeWnd) {
                const readonlyBtn = activeWnd.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
                if (readonlyBtn) {
                    const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
                    Logger.log('✅ 方法2成功 - 通过活跃窗口找到锁按钮:', {
                        iconHref,
                        ariaLabel: readonlyBtn.getAttribute('aria-label'),
                        dataSubtype: readonlyBtn.getAttribute('data-subtype')
                    });
                    return readonlyBtn;
                }
            }
            
            // 方法3: 列出所有锁按钮，看看到底有多少个
            const allReadonlyBtns = document.querySelectorAll('.protyle-breadcrumb button[data-type="readonly"]');
            Logger.log('🔍 发现的所有锁按钮数量:', allReadonlyBtns.length);
            
            allReadonlyBtns.forEach((btn, index) => {
                const iconHref = btn.querySelector('use')?.getAttribute('xlink:href') || '';
                const protyle = btn.closest('.protyle');
                Logger.log(`🔍 锁按钮 ${index + 1}:`, {
                    iconHref,
                    ariaLabel: btn.getAttribute('aria-label'),
                    dataSubtype: btn.getAttribute('data-subtype'),
                    protyleVisible: protyle ? !protyle.classList.contains('fn__none') : false,
                    protyleDataNodeId: protyle?.getAttribute('data-node-id')
                });
            });
            
            // 方法3: 兜底方案 - 全局查找第一个
            const readonlyBtn = document.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
            if (readonlyBtn) {
                const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
                Logger.warn('⚠️ 方法3兜底 - 使用第一个找到的锁按钮（可能不准确）:', {
                    iconHref,
                    ariaLabel: readonlyBtn.getAttribute('aria-label'),
                    dataSubtype: readonlyBtn.getAttribute('data-subtype')
                });
                return readonlyBtn;
            }
            
            Logger.error('❌ 完全找不到任何锁按钮');
            return null;
            
        } catch (error) {
            Logger.error('❌ 获取当前活跃文档锁按钮失败:', error);
            return null;
        }
    }
}



