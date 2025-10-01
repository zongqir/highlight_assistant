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
                    
                    console.log('\n[ToolbarHijacker] 📱 ========== 检测到文本选中（mouseup/selectionchange）==========');
                    console.log('[ToolbarHijacker] 选中文本:', selectedText.substring(0, 50));
                    
                    // 🔍 在工具栏显示之前检查只读状态 - 使用面包屑锁按钮（宽松检查）
                    const readonlyBtn = document.querySelector('.protyle-breadcrumb button[data-type="readonly"]');
                    let isDocReadonly = false;
                    
                    if (readonlyBtn) {
                        const ariaLabel = readonlyBtn.getAttribute('aria-label') || '';
                        const dataSubtype = readonlyBtn.getAttribute('data-subtype') || '';
                        const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
                        
                        // 宽松判断（多条件检查，更稳定）：
                        // 注意："临时解锁"表示点击后会解锁，说明当前是锁定状态！
                        const isUnlocked = 
                            dataSubtype === 'unlock' || 
                            ariaLabel.includes('取消') ||   // "取消临时解锁" → 当前已解锁
                            iconHref === '#iconUnlock';
                        
                        isDocReadonly = !isUnlocked;
                        
                        console.log('[ToolbarHijacker] 🔐 面包屑锁按钮状态（工具栏显示前-宽松检查）:', {
                            'aria-label': ariaLabel,
                            'data-subtype': dataSubtype,
                            '图标href': iconHref,
                            '是否解锁': isUnlocked ? '✏️ 是' : '🔒 否',
                            '是否只读': isDocReadonly ? '🔒 是（锁定）' : '✏️ 否（解锁）'
                        });
                    } else {
                        console.warn('[ToolbarHijacker] ⚠️ 未找到面包屑锁按钮');
                    }
                    
                    // 🔒 核心限制：只有在加锁（只读）状态下才显示高亮工具栏
                    if (!isDocReadonly) {
                        console.log('[ToolbarHijacker] ⛔ 文档未加锁（可编辑状态），不显示自定义工具栏');
                        return;
                    }
                    
                    console.log('[ToolbarHijacker] ✅ 文档已加锁（只读状态），允许显示自定义工具栏');
                    
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
}

