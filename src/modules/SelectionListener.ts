/**
 * 选择监听模块
 * 负责监听用户的文本选择事件，特别是移动端的触摸操作
 */

import type { IHighlightModule, ISelectionInfo, IHighlightEventCallbacks } from '../types/highlight';
import { DOMUtils } from '../utils/domUtils';
import { EVENTS, TIMING, DIMENSIONS, SELECTORS, DEBUG } from '../constants/colors';

export class SelectionListener implements IHighlightModule {
    public readonly name = 'SelectionListener';
    public isInitialized = false;
    
    private callbacks: IHighlightEventCallbacks = {};
    private currentSelection: ISelectionInfo | null = null;
    private selectionTimeout: NodeJS.Timeout | null = null;
    private isSelecting = false;
    private isMobile = false;
    
    // 触摸相关
    private touchStartX = 0;
    private touchStartY = 0;
    private longPressTimer: NodeJS.Timeout | null = null;
    
    // 防抖处理
    private selectionChangeDebounced: () => void;
    private touchEndDebounced: () => void;

    constructor() {
        this.selectionChangeDebounced = DOMUtils.debounce(() => {
            this.handleSelectionChange();
        }, TIMING.SELECTION_DEBOUNCE);
        
        this.touchEndDebounced = DOMUtils.debounce(() => {
            this.handleTouchEnd();
        }, 100);
    }

    /**
     * 初始化选择监听器
     */
    async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            this.isMobile = DOMUtils.isMobile();
            this.setupEventListeners();
            this.isInitialized = true;
            
            console.log('[SelectionListener] 初始化完成', { mobile: this.isMobile });
        } catch (error) {
            console.error('[SelectionListener] 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 销毁选择监听器
     */
    async destroy(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        this.removeEventListeners();
        this.clearTimeouts();
        this.currentSelection = null;
        this.isInitialized = false;
        
        if (DEBUG.ENABLED) {
            console.log('[SelectionListener] 已销毁');
        }
    }

    /**
     * 设置事件回调
     */
    setEventCallbacks(callbacks: IHighlightEventCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * 获取当前选择信息
     */
    getCurrentSelection(): ISelectionInfo | null {
        return this.currentSelection;
    }

    /**
     * 清除当前选择
     */
    clearCurrentSelection(): void {
        this.currentSelection = null;
        DOMUtils.clearSelection();
        this.callbacks.onSelectionChanged?.(null);
    }

    /**
     * 强制触发选择检查
     */
    checkSelection(): void {
        this.handleSelectionChange();
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners(): void {
        // 选择变化监听
        document.addEventListener(EVENTS.SELECTION_CHANGE, this.selectionChangeDebounced);
        
        if (this.isMobile) {
            // 移动端触摸事件
            this.setupMobileListeners();
        } else {
            // 桌面端鼠标事件
            this.setupDesktopListeners();
        }

        // 通用事件
        this.setupCommonListeners();
    }

    /**
     * 设置移动端监听器
     */
    private setupMobileListeners(): void {
        // 按照思源笔记的逻辑监听选择变化，延迟620ms等待range更新
        document.addEventListener('selectionchange', () => {
            setTimeout(() => {
                this.handleMobileSelectionChange();
            }, 620);
        });
        
        // 监听思源的移动端键盘工具栏事件
        if (typeof window !== 'undefined' && window.siyuan) {
            // 等待思源初始化完成
            setTimeout(() => {
                this.setupSiyuanMobileEvents();
            }, 1000);
        }
    }
    
    /**
     * 设置思源移动端事件监听
     */
    private setupSiyuanMobileEvents(): void {
        // 监听思源的移动端事件
        try {
            const currentEditor = this.getCurrentEditor();
            if (currentEditor && currentEditor.protyle) {
                // 监听移动端键盘工具栏显示
                currentEditor.protyle.app.plugins.forEach((plugin: any) => {
                    if (plugin.eventBus) {
                        plugin.eventBus.on("mobile-keyboard-show", () => {
                            this.handleMobileKeyboardShow();
                        });
                    }
                });
            }
        } catch (error) {
            console.log('[SelectionListener] 思源事件监听设置失败:', error);
        }
    }
    
    /**
     * 处理移动端选择变化（按思源逻辑）
     */
    private handleMobileSelectionChange(): void {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return;
        }
        
        const range = selection.getRangeAt(0);
        const text = selection.toString().trim();
        
        if (!text) {
            return;
        }
        
        // 检查是否在编辑器区域（按思源逻辑）
        const startContainer = range.startContainer;
        const hasClosestWysiwyg = this.hasClosestByClassName(startContainer, "protyle-wysiwyg");
        
        if (!hasClosestWysiwyg) {
            return;
        }
        
        // 处理选择
        this.processSelection();
    }
    
    /**
     * 处理移动端键盘工具栏显示
     */
    private handleMobileKeyboardShow(): void {
        // 当思源的键盘工具栏显示时，检查是否有选择
        setTimeout(() => {
            this.checkSelection();
        }, 100);
    }
    
    /**
     * 获取当前编辑器（模拟思源的逻辑）
     */
    private getCurrentEditor(): any {
        try {
            // 尝试获取思源的当前编辑器
            if (typeof window !== 'undefined' && (window as any).siyuan) {
                const siyuan = (window as any).siyuan;
                // 模拟思源的getCurrentEditor逻辑
                const editors = document.querySelectorAll('.protyle:not(.fn__none)');
                return editors.length > 0 ? editors[0] : null;
            }
        } catch (error) {
            // 静默处理错误
        }
        return null;
    }
    
    /**
     * 检查元素是否有指定类名的祖先（模拟思源的hasClosestByClassName）
     */
    private hasClosestByClassName(element: Node | null, className: string): boolean {
        let current = element;
        while (current && current !== document.body) {
            if (current.nodeType === Node.ELEMENT_NODE) {
                const el = current as HTMLElement;
                if (el.classList && el.classList.contains(className)) {
                    return true;
                }
            }
            current = current.parentNode;
        }
        return false;
    }

    /**
     * 设置桌面端监听器
     */
    private setupDesktopListeners(): void {
        const protyleElement = document.querySelector(SELECTORS.PROTYLE_WYSIWYG);
        if (!protyleElement) {
            return;
        }

        // 鼠标松开
        protyleElement.addEventListener('mouseup', () => {
            // 延迟处理，确保选择已完成
            setTimeout(() => {
                this.handleMouseUp();
            }, 10);
        });

        // 双击事件
        protyleElement.addEventListener('dblclick', () => {
            this.handleDoubleClick();
        });
    }

    /**
     * 设置通用监听器
     */
    private setupCommonListeners(): void {
        // 点击其他地方清除选择
        document.addEventListener('click', (event: MouseEvent) => {
            this.handleDocumentClick(event);
        });

        // 键盘事件
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            this.handleKeyDown(event);
        });

        // 滚动事件
        document.addEventListener('scroll', () => {
            if (this.currentSelection) {
                this.callbacks.onSelectionChanged?.(this.currentSelection);
            }
        }, { passive: true });
    }

    /**
     * 移除事件监听器
     */
    private removeEventListeners(): void {
        document.removeEventListener(EVENTS.SELECTION_CHANGE, this.selectionChangeDebounced);
        
        // 移除其他监听器的逻辑会在实际使用中需要保存监听器引用
        // 这里简化处理
    }

    /**
     * 处理触摸开始
     */
    private handleTouchStart(event: TouchEvent): void {
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isSelecting = false;

        // 清除之前的长按定时器
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }

        // 设置长按检测
        this.longPressTimer = setTimeout(() => {
            this.handleLongPress(touch);
        }, TIMING.TOUCH_HOLD_DURATION);
    }

    /**
     * 处理触摸移动
     */
    private handleTouchMove(event: TouchEvent): void {
        const touch = event.touches[0];
        const deltaX = Math.abs(touch.clientX - this.touchStartX);
        const deltaY = Math.abs(touch.clientY - this.touchStartY);
        
        // 如果移动距离超过阈值，取消长按
        if (deltaX > 10 || deltaY > 10) {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            this.isSelecting = true;
        }
    }

    /**
     * 处理触摸结束事件
     */
    private handleTouchEndEvent(): void {
        // 清除长按定时器
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        // 延迟处理，等待选择完成
        setTimeout(() => {
            this.touchEndDebounced();
        }, 50);
    }

    /**
     * 处理触摸结束
     */
    private handleTouchEnd(): void {
        const selection = window.getSelection();
        
        if (selection && selection.toString().trim()) {
            this.processSelection();
        } else {
            this.currentSelection = null;
            this.callbacks.onSelectionChanged?.(null);
        }
        
        this.isSelecting = false;
    }

    /**
     * 处理长按
     */
    private handleLongPress(touch: Touch): void {
        // 在长按位置开始文本选择
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element) {
            // 创建一个选择范围
            const range = document.createRange();
            const textNode = this.findTextNode(element);
            
            if (textNode) {
                range.selectNode(textNode);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }
    }

    /**
     * 处理鼠标松开
     */
    private handleMouseUp(): void {
        this.processSelection();
    }

    /**
     * 处理双击
     */
    private handleDoubleClick(): void {
        // 双击时延迟处理，让浏览器完成单词选择
        setTimeout(() => {
            this.processSelection();
        }, 10);
    }

    /**
     * 处理文档点击
     */
    private handleDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        
        // 如果点击的不是编辑器区域，清除选择
        const protyleElement = document.querySelector(SELECTORS.PROTYLE_WYSIWYG);
        if (protyleElement && !protyleElement.contains(target)) {
            this.clearCurrentSelection();
        }
    }

    /**
     * 处理键盘事件
     */
    private handleKeyDown(event: KeyboardEvent): void {
        // Escape键清除选择
        if (event.key === 'Escape') {
            this.clearCurrentSelection();
        }
        
        // Ctrl+A 全选时需要特殊处理
        if (event.ctrlKey && event.key === 'a') {
            setTimeout(() => {
                this.handleSelectionChange();
            }, 10);
        }
    }

    /**
     * 处理选择变化
     */
    private handleSelectionChange(): void {
        // 清除之前的超时
        if (this.selectionTimeout) {
            clearTimeout(this.selectionTimeout);
        }

        // 设置延迟处理，避免频繁触发
        this.selectionTimeout = setTimeout(() => {
            this.processSelection();
        }, 50);
    }

    /**
     * 处理选择
     */
    private processSelection(): void {
        const selectionInfo = DOMUtils.getSelectionInfo();
        
        if (selectionInfo && this.isValidSelection(selectionInfo)) {
            this.currentSelection = selectionInfo;
            this.callbacks.onSelectionChanged?.(selectionInfo);
            console.log('[SelectionListener] 选择文本:', selectionInfo.text.substring(0, 30));
        } else {
            if (this.currentSelection) {
                this.currentSelection = null;
                this.callbacks.onSelectionChanged?.(null);
            }
        }
    }

    /**
     * 验证选择是否有效
     */
    private isValidSelection(selection: ISelectionInfo): boolean {
        // 检查文本长度
        if (selection.text.length < DIMENSIONS.MIN_SELECTION_LENGTH ||
            selection.text.length > DIMENSIONS.MAX_SELECTION_LENGTH) {
            console.log('[SelectionListener] 文本长度无效:', selection.text.length);
            return false;
        }

        // 检查是否为纯空白
        if (/^\s*$/.test(selection.text)) {
            console.log('[SelectionListener] 选择的是空白文本');
            return false;
        }

        // 检查是否在可编辑的块中
        const blockElement = selection.blockElement;
        if (!blockElement) {
            console.log('[SelectionListener] 未找到块元素');
            return false;
        }
        
        const blockId = DOMUtils.getBlockId(blockElement);
        if (!blockId) {
            console.log('[SelectionListener] 块没有有效ID');
            return false;
        }

        console.log('[SelectionListener] 选择验证通过:', selection.text.substring(0, 20), 'blockId:', blockId);
        return true;
    }

    /**
     * 查找文本节点
     */
    private findTextNode(element: Node): Text | null {
        if (element.nodeType === Node.TEXT_NODE) {
            return element as Text;
        }
        
        for (let child = element.firstChild; child; child = child.nextSibling) {
            if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
                return child as Text;
            }
            
            const found = this.findTextNode(child);
            if (found) {
                return found;
            }
        }
        
        return null;
    }

    /**
     * 清除所有超时
     */
    private clearTimeouts(): void {
        if (this.selectionTimeout) {
            clearTimeout(this.selectionTimeout);
            this.selectionTimeout = null;
        }
        
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    /**
     * 获取统计信息
     */
    getStats(): {
        isSelecting: boolean;
        hasSelection: boolean;
        isMobile: boolean;
        selectionText: string;
    } {
        return {
            isSelecting: this.isSelecting,
            hasSelection: this.currentSelection !== null,
            isMobile: this.isMobile,
            selectionText: this.currentSelection?.text?.substring(0, 50) || ''
        };
    }
}
