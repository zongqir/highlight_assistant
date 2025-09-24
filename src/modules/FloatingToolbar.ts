/**
 * 浮动工具栏模块
 * 负责显示和管理文本选择后的浮动操作工具栏
 */

import type { 
    IHighlightModule, 
    ISelectionInfo, 
    IToolbarPosition, 
    HighlightColor,
    IHighlightData,
    IHighlightEventCallbacks 
} from '../types/highlight';
import { 
    HIGHLIGHT_COLORS, 
    CSS_CLASSES, 
    DIMENSIONS, 
    Z_INDEX, 
    TIMING,
    DEBUG 
} from '../constants/colors';
import { DOMUtils } from '../utils/domUtils';

export class FloatingToolbar implements IHighlightModule {
    public readonly name = 'FloatingToolbar';
    public isInitialized = false;
    
    private toolbar: HTMLElement | null = null;
    private currentSelection: ISelectionInfo | null = null;
    private showTimeout: NodeJS.Timeout | null = null;
    private hideTimeout: NodeJS.Timeout | null = null;
    private callbacks: IHighlightEventCallbacks = {};
    private isVisible = false;
    private isMobile = false;

    /**
     * 初始化浮动工具栏
     */
    async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            this.isMobile = DOMUtils.isMobile();
            this.createToolbar();
            this.setupEventListeners();
            this.isInitialized = true;
            
            if (DEBUG.ENABLED) {
                console.log('[FloatingToolbar] 初始化完成', { mobile: this.isMobile });
            }
        } catch (error) {
            console.error('[FloatingToolbar] 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 销毁浮动工具栏
     */
    async destroy(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        this.hide();
        this.clearTimeouts();
        
        if (this.toolbar) {
            this.toolbar.remove();
            this.toolbar = null;
        }
        
        this.isInitialized = false;
        
        if (DEBUG.ENABLED) {
            console.log('[FloatingToolbar] 已销毁');
        }
    }

    /**
     * 设置事件回调
     */
    setEventCallbacks(callbacks: IHighlightEventCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * 显示工具栏
     */
    show(selection: ISelectionInfo): void {
        if (!this.isInitialized || !this.toolbar) {
            console.log('[FloatingToolbar] 工具栏未初始化或不存在');
            return;
        }

        this.currentSelection = selection;
        
        // 清除隐藏定时器
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        // 移动端立即显示，桌面端有延迟
        const delay = this.isMobile ? 50 : TIMING.TOOLBAR_SHOW_DELAY;
        
        // 设置显示延迟
        this.showTimeout = setTimeout(() => {
            this.doShow();
        }, delay);
    }

    /**
     * 隐藏工具栏
     */
    hide(): void {
        if (!this.isInitialized || !this.toolbar) {
            return;
        }

        // 清除显示定时器
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }

        // 设置隐藏延迟
        this.hideTimeout = setTimeout(() => {
            this.doHide();
        }, TIMING.TOOLBAR_HIDE_DELAY);
    }

    /**
     * 立即隐藏工具栏
     */
    hideImmediately(): void {
        this.clearTimeouts();
        this.doHide();
    }

    /**
     * 检查工具栏是否可见
     */
    isToolbarVisible(): boolean {
        return this.isVisible;
    }

    /**
     * 获取当前选择
     */
    getCurrentSelection(): ISelectionInfo | null {
        return this.currentSelection;
    }

    /**
     * 执行显示
     */
    private doShow(): void {
        if (!this.currentSelection || !this.toolbar) {
            console.log('[FloatingToolbar] 无法显示工具栏:', !this.currentSelection, !this.toolbar);
            return;
        }

        // 计算位置
        const position = DOMUtils.calculateToolbarPosition(this.currentSelection.selection);
        if (!position) {
            console.log('[FloatingToolbar] 无法计算位置');
            return;
        }

        // 更新工具栏内容
        this.updateToolbarContent();
        
        // 设置位置
        this.positionToolbar(position);
        
        // 显示工具栏
        this.toolbar.classList.remove(CSS_CLASSES.TOOLBAR_HIDDEN);
        this.toolbar.classList.add(CSS_CLASSES.TOOLBAR_VISIBLE);
        
        this.isVisible = true;
        this.callbacks.onToolbarShow?.(position);
        
        console.log('[FloatingToolbar] 工具栏已显示', position);
    }

    /**
     * 执行隐藏
     */
    private doHide(): void {
        if (!this.toolbar) {
            return;
        }

        this.toolbar.classList.remove(CSS_CLASSES.TOOLBAR_VISIBLE);
        this.toolbar.classList.add(CSS_CLASSES.TOOLBAR_HIDDEN);
        
        this.isVisible = false;
        this.currentSelection = null;
        this.callbacks.onToolbarHide?.();
        
        if (DEBUG.ENABLED) {
            console.log('[FloatingToolbar] 工具栏隐藏');
        }
    }

    /**
     * 创建工具栏
     */
    private createToolbar(): void {
        this.toolbar = document.createElement('div');
        this.toolbar.className = `${CSS_CLASSES.FLOATING_TOOLBAR} ${CSS_CLASSES.TOOLBAR_HIDDEN}`;
        
        if (this.isMobile) {
            this.toolbar.classList.add(CSS_CLASSES.MOBILE);
        }

        // 设置基础样式
        Object.assign(this.toolbar.style, {
            position: 'fixed',
            zIndex: '999999', // 确保在所有元素之上
            background: 'var(--b3-theme-background)',
            border: '1px solid var(--b3-theme-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: this.isMobile ? '10px' : '8px',
            display: 'flex',
            alignItems: 'center',
            gap: this.isMobile ? '8px' : '4px',
            opacity: '0',
            transform: 'scale(0.9)',
            transition: 'all 0.2s ease',
            userSelect: 'none',
            pointerEvents: 'auto',
            maxWidth: '90vw' // 防止溢出
        });

        // 添加到页面
        document.body.appendChild(this.toolbar);
    }

    /**
     * 更新工具栏内容
     */
    private updateToolbarContent(): void {
        if (!this.toolbar || !this.currentSelection) {
            return;
        }

        this.toolbar.innerHTML = '';

        if (this.currentSelection.isExistingHighlight) {
            // 已存在高亮的操作
            this.createExistingHighlightButtons();
        } else {
            // 新建高亮的操作
            this.createNewHighlightButtons();
        }
    }

    /**
     * 创建新建高亮的按钮
     */
    private createNewHighlightButtons(): void {
        // 颜色按钮
        Object.values(HIGHLIGHT_COLORS).forEach(color => {
            const button = this.createColorButton(color.key, color);
            this.toolbar!.appendChild(button);
        });

        // 想法按钮（暂时不实现）
        // const commentButton = this.createCommentButton();
        // this.toolbar!.appendChild(commentButton);
    }

    /**
     * 创建已存在高亮的按钮
     */
    private createExistingHighlightButtons(): void {
        const existingHighlight = this.currentSelection!.existingHighlight!;
        
        // 更换颜色按钮
        Object.values(HIGHLIGHT_COLORS).forEach(color => {
            if (color.key !== existingHighlight.color) {
                const button = this.createColorButton(color.key, color, true);
                this.toolbar!.appendChild(button);
            }
        });

        // 分隔符
        this.toolbar!.appendChild(this.createSeparator());

        // 删除按钮
        const deleteButton = this.createDeleteButton();
        this.toolbar!.appendChild(deleteButton);

        // 想法按钮（如果没有备注）
        if (!existingHighlight.comment) {
            // const commentButton = this.createCommentButton(true);
            // this.toolbar!.appendChild(commentButton);
        }
    }

    /**
     * 创建颜色按钮
     */
    private createColorButton(
        color: HighlightColor, 
        colorConfig: any, 
        isUpdate = false
    ): HTMLElement {
        const button = document.createElement('button');
        button.className = `${CSS_CLASSES.TOOLBAR_BUTTON} ${CSS_CLASSES.COLOR_BUTTON}`;
        button.title = isUpdate ? `更改为${colorConfig.name}` : colorConfig.name;
        
        // 设置样式
        Object.assign(button.style, {
            width: `${DIMENSIONS.BUTTON_SIZE}px`,
            height: `${DIMENSIONS.BUTTON_SIZE}px`,
            border: 'none',
            borderRadius: '6px',
            backgroundColor: colorConfig.backgroundColor,
            color: colorConfig.textColor,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            position: 'relative'
        });

        // 图标
        button.innerHTML = colorConfig.icon;

        // 悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = 'none';
        });

        // 点击事件
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.handleColorClick(color, isUpdate);
        });

        return button;
    }

    /**
     * 创建删除按钮
     */
    private createDeleteButton(): HTMLElement {
        const button = document.createElement('button');
        button.className = `${CSS_CLASSES.TOOLBAR_BUTTON} ${CSS_CLASSES.DELETE_BUTTON}`;
        button.title = '删除高亮';
        
        Object.assign(button.style, {
            width: `${DIMENSIONS.BUTTON_SIZE}px`,
            height: `${DIMENSIONS.BUTTON_SIZE}px`,
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#dc3545',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s ease'
        });

        button.innerHTML = '🗑️';

        // 悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.backgroundColor = '#c82333';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.backgroundColor = '#dc3545';
        });

        // 点击事件
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.handleDeleteClick();
        });

        return button;
    }

    /**
     * 创建想法按钮
     */
    private createCommentButton(isEdit = false): HTMLElement {
        const button = document.createElement('button');
        button.className = `${CSS_CLASSES.TOOLBAR_BUTTON} ${CSS_CLASSES.COMMENT_BUTTON}`;
        button.title = isEdit ? '编辑想法' : '添加想法';
        
        Object.assign(button.style, {
            width: `${DIMENSIONS.BUTTON_SIZE}px`,
            height: `${DIMENSIONS.BUTTON_SIZE}px`,
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#007bff',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s ease'
        });

        button.innerHTML = '💭';

        // 悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.backgroundColor = '#0056b3';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.backgroundColor = '#007bff';
        });

        // 点击事件
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.handleCommentClick(isEdit);
        });

        return button;
    }

    /**
     * 创建分隔符
     */
    private createSeparator(): HTMLElement {
        const separator = document.createElement('div');
        Object.assign(separator.style, {
            width: '1px',
            height: '24px',
            backgroundColor: 'var(--b3-theme-border)',
            margin: '0 4px'
        });
        return separator;
    }

    /**
     * 设置工具栏位置
     */
    private positionToolbar(position: IToolbarPosition): void {
        if (!this.toolbar) {
            return;
        }

        // 移动端特殊定位逻辑
        if (this.isMobile) {
            // 移动端固定在屏幕中下方
            Object.assign(this.toolbar.style, {
                left: '50%',
                bottom: '120px', // 避开键盘和思源底部工具栏
                transform: 'translateX(-50%)',
                top: 'auto'
            });
        } else {
            // 桌面端按计算位置显示
            Object.assign(this.toolbar.style, {
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translateX(-50%)',
                bottom: 'auto'
            });

            // 如果需要调整位置，添加特殊样式
            if (position.needsAdjustment) {
                this.toolbar.style.transform = 'translateX(-50%) scale(0.95)';
            }
        }
    }

    /**
     * 处理颜色点击
     */
    private handleColorClick(color: HighlightColor, isUpdate: boolean): void {
        if (!this.currentSelection) {
            return;
        }

        // 触发高亮创建或更新事件
        const event = new CustomEvent(isUpdate ? 'highlight-update' : 'highlight-create', {
            detail: {
                selection: this.currentSelection,
                color,
                isUpdate,
                existingHighlight: this.currentSelection.existingHighlight
            }
        });

        document.dispatchEvent(event);
        this.hideImmediately();
    }

    /**
     * 处理删除点击
     */
    private handleDeleteClick(): void {
        if (!this.currentSelection?.existingHighlight) {
            return;
        }

        // 触发高亮删除事件
        const event = new CustomEvent('highlight-delete', {
            detail: {
                highlightId: this.currentSelection.existingHighlight.id,
                highlight: this.currentSelection.existingHighlight
            }
        });

        document.dispatchEvent(event);
        this.hideImmediately();
    }

    /**
     * 处理想法点击
     */
    private handleCommentClick(isEdit: boolean): void {
        if (!this.currentSelection) {
            return;
        }

        // 触发想法编辑事件
        const event = new CustomEvent('highlight-comment', {
            detail: {
                selection: this.currentSelection,
                isEdit,
                existingComment: this.currentSelection.existingHighlight?.comment
            }
        });

        document.dispatchEvent(event);
        this.hideImmediately();
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners(): void {
        // 点击工具栏外部隐藏
        document.addEventListener('click', (event) => {
            if (this.isVisible && this.toolbar && !this.toolbar.contains(event.target as Node)) {
                this.hide();
            }
        });

        // 滚动时隐藏
        document.addEventListener('scroll', () => {
            if (this.isVisible) {
                this.hide();
            }
        }, { passive: true });

        // 窗口大小变化时隐藏
        window.addEventListener('resize', () => {
            if (this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * 清除所有超时
     */
    private clearTimeouts(): void {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    /**
     * 获取统计信息
     */
    getStats(): {
        isVisible: boolean;
        hasSelection: boolean;
        isMobile: boolean;
        position: { x: number; y: number } | null;
    } {
        let position = null;
        if (this.toolbar && this.isVisible) {
            const style = this.toolbar.style;
            position = {
                x: parseInt(style.left) || 0,
                y: parseInt(style.top) || 0
            };
        }
        
        return {
            isVisible: this.isVisible,
            hasSelection: this.currentSelection !== null,
            isMobile: this.isMobile,
            position
        };
    }
}
