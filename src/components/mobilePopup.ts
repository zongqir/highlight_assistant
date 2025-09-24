/**
 * 手机版专用弹窗组件
 * 专门为思源手机版设计的高亮工具弹窗
 */

import type { ISelectionInfo, HighlightColor } from '../types/highlight';

/**
 * 弹窗配置
 */
interface IMobilePopupConfig {
    colors: HighlightColor[];           // 可用颜色
    showCommentButton: boolean;         // 是否显示备注按钮
    autoHideDelay: number;             // 自动隐藏延迟（毫秒）
    zIndexBase: number;                // 基础z-index
    debug: boolean;                    // 调试模式
}

/**
 * 弹窗事件类型
 */
interface IMobilePopupEvents {
    onHighlight?: (color: HighlightColor, selectionInfo: ISelectionInfo) => void;
    onComment?: (selectionInfo: ISelectionInfo) => void;
    onRemove?: (selectionInfo: ISelectionInfo) => void;
    onHide?: () => void;
}

/**
 * 手机版弹窗类
 */
export class MobilePopup {
    private config: IMobilePopupConfig;
    private events: IMobilePopupEvents;
    private popupElement: HTMLElement | null = null;
    private currentSelection: ISelectionInfo | null = null;
    private autoHideTimer: number = 0;
    private isVisible: boolean = false;
    
    constructor(config?: Partial<IMobilePopupConfig>, events?: IMobilePopupEvents) {
        this.config = {
            colors: ['yellow', 'green', 'blue', 'pink', 'red', 'purple'],
            showCommentButton: true,
            autoHideDelay: 0, // 0表示不自动隐藏
            zIndexBase: 1000,
            debug: false,
            ...config
        };
        
        this.events = events || {};
        
        this.log('手机版弹窗初始化', this.config);
    }
    
    /**
     * 显示弹窗
     */
    public show(selectionInfo: ISelectionInfo): void {
        this.log('显示弹窗', { text: selectionInfo.text.substring(0, 20) });
        
        this.currentSelection = selectionInfo;
        
        // 隐藏之前的弹窗
        this.hide();
        
        // 创建新弹窗
        this.createPopupElement();
        
        // 定位弹窗
        this.positionPopup();
        
        // 添加到页面
        document.body.appendChild(this.popupElement!);
        
        // 设置为可见状态
        this.isVisible = true;
        
        // 设置自动隐藏定时器
        if (this.config.autoHideDelay > 0) {
            this.startAutoHideTimer();
        }
        
        this.log('弹窗显示完成');
    }
    
    /**
     * 隐藏弹窗
     */
    public hide(): void {
        if (!this.isVisible) {
            return;
        }
        
        this.log('隐藏弹窗');
        
        // 清除自动隐藏定时器
        this.clearAutoHideTimer();
        
        // 移除DOM元素
        if (this.popupElement && this.popupElement.parentNode) {
            this.popupElement.parentNode.removeChild(this.popupElement);
        }
        
        this.popupElement = null;
        this.currentSelection = null;
        this.isVisible = false;
        
        // 触发隐藏事件
        if (this.events.onHide) {
            this.events.onHide();
        }
    }
    
    /**
     * 检查是否可见
     */
    public get visible(): boolean {
        return this.isVisible;
    }
    
    /**
     * 创建弹窗元素
     */
    private createPopupElement(): void {
        this.popupElement = document.createElement('div');
        this.popupElement.className = 'mobile-highlight-popup';
        this.popupElement.id = 'mobile-highlight-popup';
        
        // 设置基础样式
        this.popupElement.style.cssText = `
            position: fixed;
            background: var(--b3-theme-background, #ffffff);
            border: 1px solid var(--b3-border-color, #e0e0e0);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 12px;
            z-index: ${this.config.zIndexBase + 100};
            user-select: none;
            -webkit-user-select: none;
            font-size: 14px;
            max-width: 300px;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.2s ease, transform 0.2s ease;
        `;
        
        // 创建内容
        this.createPopupContent();
        
        // 添加动画
        requestAnimationFrame(() => {
            if (this.popupElement) {
                this.popupElement.style.opacity = '1';
                this.popupElement.style.transform = 'translateY(0)';
            }
        });
    }
    
    /**
     * 创建弹窗内容
     */
    private createPopupContent(): void {
        if (!this.popupElement || !this.currentSelection) {
            return;
        }
        
        const content = document.createElement('div');
        content.className = 'popup-content';
        
        // 创建颜色按钮区域
        const colorsSection = this.createColorsSection();
        content.appendChild(colorsSection);
        
        // 如果是已存在的高亮，添加移除按钮
        if (this.currentSelection.isExistingHighlight) {
            const removeSection = this.createRemoveSection();
            content.appendChild(removeSection);
        }
        
        // 如果启用了备注功能，添加备注按钮
        if (this.config.showCommentButton) {
            const commentSection = this.createCommentSection();
            content.appendChild(commentSection);
        }
        
        this.popupElement.appendChild(content);
        
        // 阻止事件冒泡，避免触发选择变化
        this.popupElement.addEventListener('touchstart', this.preventDefault, { passive: false });
        this.popupElement.addEventListener('touchend', this.preventDefault, { passive: false });
        this.popupElement.addEventListener('click', this.preventDefault);
    }
    
    /**
     * 创建颜色选择区域
     */
    private createColorsSection(): HTMLElement {
        const section = document.createElement('div');
        section.className = 'colors-section';
        section.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 8px;
        `;
        
        // 添加标题
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = '选择高亮颜色:';
        title.style.cssText = `
            width: 100%;
            font-size: 12px;
            color: var(--b3-theme-on-surface-light, #666);
            margin-bottom: 6px;
        `;
        section.appendChild(title);
        
        // 创建颜色按钮
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        `;
        
        this.config.colors.forEach(color => {
            const button = this.createColorButton(color);
            buttonsContainer.appendChild(button);
        });
        
        section.appendChild(buttonsContainer);
        return section;
    }
    
    /**
     * 创建颜色按钮
     */
    private createColorButton(color: HighlightColor): HTMLElement {
        const button = document.createElement('button');
        button.className = `color-btn color-btn-${color}`;
        button.dataset.color = color;
        
        // 设置按钮样式
        button.style.cssText = `
            width: 32px;
            height: 32px;
            border: 2px solid var(--b3-border-color, #e0e0e0);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: var(--highlight-color-${color}, ${this.getColorValue(color)});
            position: relative;
            overflow: hidden;
        `;
        
        // 添加点击效果
        button.addEventListener('touchstart', () => {
            button.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            button.style.transform = 'scale(1)';
            this.handleColorSelect(color);
        });
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleColorSelect(color);
        });
        
        return button;
    }
    
    /**
     * 创建移除按钮区域
     */
    private createRemoveSection(): HTMLElement {
        const section = document.createElement('div');
        section.className = 'remove-section';
        section.style.cssText = `
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid var(--b3-border-color, #e0e0e0);
        `;
        
        const button = document.createElement('button');
        button.className = 'remove-btn';
        button.textContent = '🗑️ 移除高亮';
        button.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--b3-theme-error, #f44336);
            border-radius: 4px;
            background: transparent;
            color: var(--b3-theme-error, #f44336);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleRemove();
        });
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleRemove();
        });
        
        section.appendChild(button);
        return section;
    }
    
    /**
     * 创建备注按钮区域
     */
    private createCommentSection(): HTMLElement {
        const section = document.createElement('div');
        section.className = 'comment-section';
        section.style.cssText = `
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid var(--b3-border-color, #e0e0e0);
        `;
        
        const button = document.createElement('button');
        button.className = 'comment-btn';
        button.textContent = '📝 添加备注';
        button.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--b3-theme-primary, #2196f3);
            border-radius: 4px;
            background: transparent;
            color: var(--b3-theme-primary, #2196f3);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleComment();
        });
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleComment();
        });
        
        section.appendChild(button);
        return section;
    }
    
    /**
     * 定位弹窗
     */
    private positionPopup(): void {
        if (!this.popupElement || !this.currentSelection) {
            return;
        }
        
        const selection = this.currentSelection.selection;
        const range = this.currentSelection.range;
        
        // 获取选择区域的位置
        const rect = range.getBoundingClientRect();
        
        // 计算初始位置
        let x = rect.left + (rect.width / 2);
        let y = rect.bottom + 10;
        
        // 确保弹窗完全可见
        const popupRect = this.popupElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 水平边界检查
        const popupWidth = 300; // 估计宽度
        if (x - popupWidth / 2 < 10) {
            x = popupWidth / 2 + 10;
        } else if (x + popupWidth / 2 > viewportWidth - 10) {
            x = viewportWidth - popupWidth / 2 - 10;
        }
        
        // 垂直边界检查
        const popupHeight = 150; // 估计高度
        if (y + popupHeight > viewportHeight - 10) {
            // 放在选择区域上方
            y = rect.top - popupHeight - 10;
        }
        
        // 确保不超出顶部
        if (y < 10) {
            y = 10;
        }
        
        // 设置位置
        this.popupElement.style.left = `${x - popupWidth / 2}px`;
        this.popupElement.style.top = `${y}px`;
        
        this.log('弹窗定位', { x, y, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } });
    }
    
    /**
     * 处理颜色选择
     */
    private handleColorSelect(color: HighlightColor): void {
        this.log('选择颜色', color);
        
        if (this.events.onHighlight && this.currentSelection) {
            this.events.onHighlight(color, this.currentSelection);
        }
        
        this.hide();
    }
    
    /**
     * 处理移除高亮
     */
    private handleRemove(): void {
        this.log('移除高亮');
        
        if (this.events.onRemove && this.currentSelection) {
            this.events.onRemove(this.currentSelection);
        }
        
        this.hide();
    }
    
    /**
     * 处理添加备注
     */
    private handleComment(): void {
        this.log('添加备注');
        
        if (this.events.onComment && this.currentSelection) {
            this.events.onComment(this.currentSelection);
        }
        
        this.hide();
    }
    
    /**
     * 阻止默认事件
     */
    private preventDefault = (e: Event): void => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    /**
     * 开始自动隐藏定时器
     */
    private startAutoHideTimer(): void {
        this.clearAutoHideTimer();
        this.autoHideTimer = window.setTimeout(() => {
            this.hide();
        }, this.config.autoHideDelay);
    }
    
    /**
     * 清除自动隐藏定时器
     */
    private clearAutoHideTimer(): void {
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
            this.autoHideTimer = 0;
        }
    }
    
    /**
     * 获取颜色值
     */
    private getColorValue(color: HighlightColor): string {
        const colorMap: Record<HighlightColor, string> = {
            yellow: '#fff3cd',
            green: '#d4edda',
            blue: '#cce5ff',
            pink: '#fce4ec',
            red: '#f8d7da',
            purple: '#e2d9f7'
        };
        
        return colorMap[color] || '#fff3cd';
    }
    
    /**
     * 更新事件处理器
     */
    public updateEvents(events: IMobilePopupEvents): void {
        this.events = { ...this.events, ...events };
    }
    
    /**
     * 销毁弹窗
     */
    public destroy(): void {
        this.log('销毁弹窗');
        this.hide();
        this.clearAutoHideTimer();
    }
    
    /**
     * 调试日志
     */
    private log(message: string, data?: any): void {
        if (this.config.debug) {
            console.log(`[MobilePopup] ${message}`, data || '');
        }
    }
}

/**
 * 创建手机版弹窗的工厂函数
 */
export function createMobilePopup(
    config?: Partial<IMobilePopupConfig>, 
    events?: IMobilePopupEvents
): MobilePopup {
    return new MobilePopup(config, events);
}

