/**
 * 手机版高亮管理器
 * 整合选择处理器和弹窗组件，提供完整的手机版高亮解决方案
 */

import type { ISelectionInfo, HighlightColor } from '../types/highlight';
import { MobileSelectionHandler } from '../utils/mobileSelectionHandler';
import { MobilePopup } from '../components/mobilePopup';
import { DOMUtils } from '../utils/domUtils';

/**
 * 手机版高亮管理器配置
 */
interface IMobileHighlightConfig {
    // 选择处理器配置
    selectionDelay?: number;
    enableCapture?: boolean;
    enableToolbarWatch?: boolean;
    
    // 弹窗配置
    colors?: HighlightColor[];
    showCommentButton?: boolean;
    autoHideDelay?: number;
    
    // 通用配置
    debug?: boolean;
    autoInit?: boolean;
}

/**
 * 高亮事件回调
 */
interface IHighlightEvents {
    onHighlight?: (color: HighlightColor, selectionInfo: ISelectionInfo) => Promise<boolean>;
    onComment?: (selectionInfo: ISelectionInfo) => Promise<void>;
    onRemove?: (selectionInfo: ISelectionInfo) => Promise<boolean>;
    onSelectionChange?: (selectionInfo: ISelectionInfo) => void;
    onSelectionHide?: () => void;
}

/**
 * 手机版高亮管理器
 * 专门为思源手机版设计的完整高亮解决方案
 */
export class MobileHighlightManager {
    private config: IMobileHighlightConfig;
    private events: IHighlightEvents;
    private selectionHandler: MobileSelectionHandler;
    private popup: MobilePopup;
    private isInitialized: boolean = false;
    private isDestroyed: boolean = false;
    
    constructor(config?: IMobileHighlightConfig, events?: IHighlightEvents) {
        this.config = {
            selectionDelay: 600,
            enableCapture: true,
            enableToolbarWatch: true,
            colors: ['yellow', 'green', 'blue', 'pink', 'red', 'purple'],
            showCommentButton: true,
            autoHideDelay: 0,
            debug: false,
            autoInit: true,
            ...config
        };
        
        this.events = events || {};
        
        this.log('手机版高亮管理器创建', this.config);
        
        // 创建子组件
        this.initializeComponents();
        
        // 自动初始化
        if (this.config.autoInit) {
            this.init();
        }
    }
    
    /**
     * 初始化管理器
     */
    public async init(): Promise<void> {
        if (this.isInitialized || this.isDestroyed) {
            this.log('管理器已初始化或已销毁，跳过初始化');
            return;
        }
        
        this.log('开始初始化手机版高亮管理器');
        
        // 检查环境
        if (!this.checkEnvironment()) {
            this.log('环境检查失败，跳过初始化');
            return;
        }
        
        try {
            // 初始化选择处理器
            this.selectionHandler.initialize();
            
            // 添加样式
            this.addStyles();
            
            this.isInitialized = true;
            this.log('手机版高亮管理器初始化完成');
        } catch (error) {
            console.error('[MobileHighlightManager] 初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 销毁管理器
     */
    public destroy(): void {
        this.log('销毁手机版高亮管理器');
        
        if (this.isDestroyed) {
            return;
        }
        
        // 销毁子组件
        this.selectionHandler.destroy();
        this.popup.destroy();
        
        // 移除样式
        this.removeStyles();
        
        this.isInitialized = false;
        this.isDestroyed = true;
    }
    
    /**
     * 初始化子组件
     */
    private initializeComponents(): void {
        // 创建选择处理器
        this.selectionHandler = new MobileSelectionHandler({
            selectionDelay: this.config.selectionDelay,
            enableCapture: this.config.enableCapture,
            enableToolbarWatch: this.config.enableToolbarWatch,
            debug: this.config.debug
        });
        
        // 创建弹窗
        this.popup = new MobilePopup({
            colors: this.config.colors,
            showCommentButton: this.config.showCommentButton,
            autoHideDelay: this.config.autoHideDelay,
            debug: this.config.debug
        });
        
        // 绑定事件
        this.bindEvents();
    }
    
    /**
     * 绑定事件
     */
    private bindEvents(): void {
        // 选择变化事件
        this.selectionHandler.onSelection((selectionInfo: ISelectionInfo) => {
            this.handleSelectionChange(selectionInfo);
        });
        
        // 选择隐藏事件
        this.selectionHandler.onHide(() => {
            this.handleSelectionHide();
        });
        
        // 弹窗事件
        this.popup.updateEvents({
            onHighlight: (color: HighlightColor, selectionInfo: ISelectionInfo) => {
                this.handleHighlight(color, selectionInfo);
            },
            onComment: (selectionInfo: ISelectionInfo) => {
                this.handleComment(selectionInfo);
            },
            onRemove: (selectionInfo: ISelectionInfo) => {
                this.handleRemove(selectionInfo);
            },
            onHide: () => {
                this.handlePopupHide();
            }
        });
    }
    
    /**
     * 检查环境
     */
    private checkEnvironment(): boolean {
        // 检查是否为手机版
        if (!DOMUtils.isMobile()) {
            this.log('非手机版环境');
            return false;
        }
        
        // 检查基础DOM结构
        const protyle = document.querySelector('.protyle-wysiwyg');
        if (!protyle) {
            this.log('未找到protyle编辑器');
            return false;
        }
        
        return true;
    }
    
    /**
     * 处理选择变化
     */
    private async handleSelectionChange(selectionInfo: ISelectionInfo): Promise<void> {
        this.log('处理选择变化', { text: selectionInfo.text.substring(0, 20) });
        
        try {
            // 触发外部事件
            if (this.events.onSelectionChange) {
                this.events.onSelectionChange(selectionInfo);
            }
            
            // 显示弹窗
            this.popup.show(selectionInfo);
            
        } catch (error) {
            console.error('[MobileHighlightManager] 处理选择变化失败:', error);
        }
    }
    
    /**
     * 处理选择隐藏
     */
    private handleSelectionHide(): void {
        this.log('处理选择隐藏');
        
        // 隐藏弹窗
        this.popup.hide();
        
        // 触发外部事件
        if (this.events.onSelectionHide) {
            this.events.onSelectionHide();
        }
    }
    
    /**
     * 处理高亮
     */
    private async handleHighlight(color: HighlightColor, selectionInfo: ISelectionInfo): Promise<void> {
        this.log('处理高亮', { color, text: selectionInfo.text.substring(0, 20) });
        
        try {
            let success = false;
            
            // 调用外部高亮处理器
            if (this.events.onHighlight) {
                success = await this.events.onHighlight(color, selectionInfo);
            } else {
                // 默认高亮处理
                success = this.defaultHighlight(color, selectionInfo);
            }
            
            if (success) {
                this.log('高亮成功');
                // 可以在这里添加成功反馈
            } else {
                this.log('高亮失败');
                // 可以在这里添加失败反馈
            }
            
        } catch (error) {
            console.error('[MobileHighlightManager] 处理高亮失败:', error);
        }
    }
    
    /**
     * 处理备注
     */
    private async handleComment(selectionInfo: ISelectionInfo): Promise<void> {
        this.log('处理备注', { text: selectionInfo.text.substring(0, 20) });
        
        try {
            if (this.events.onComment) {
                await this.events.onComment(selectionInfo);
            } else {
                // 默认备注处理
                this.defaultComment(selectionInfo);
            }
            
        } catch (error) {
            console.error('[MobileHighlightManager] 处理备注失败:', error);
        }
    }
    
    /**
     * 处理移除
     */
    private async handleRemove(selectionInfo: ISelectionInfo): Promise<void> {
        this.log('处理移除', { text: selectionInfo.text.substring(0, 20) });
        
        try {
            let success = false;
            
            if (this.events.onRemove) {
                success = await this.events.onRemove(selectionInfo);
            } else {
                // 默认移除处理
                success = this.defaultRemove(selectionInfo);
            }
            
            if (success) {
                this.log('移除成功');
            } else {
                this.log('移除失败');
            }
            
        } catch (error) {
            console.error('[MobileHighlightManager] 处理移除失败:', error);
        }
    }
    
    /**
     * 处理弹窗隐藏
     */
    private handlePopupHide(): void {
        this.log('弹窗隐藏');
        // 可以在这里添加额外的清理逻辑
    }
    
    /**
     * 默认高亮处理
     */
    private defaultHighlight(color: HighlightColor, selectionInfo: ISelectionInfo): boolean {
        try {
            // 创建高亮span
            const span = DOMUtils.createHighlightSpan(selectionInfo.text, color);
            
            // 替换选择内容
            const success = DOMUtils.replaceSelectionWithHighlight(selectionInfo.selection, span);
            
            if (success) {
                // 清除选择
                DOMUtils.clearSelection();
            }
            
            return success;
        } catch (error) {
            console.error('默认高亮处理失败:', error);
            return false;
        }
    }
    
    /**
     * 默认备注处理
     */
    private defaultComment(selectionInfo: ISelectionInfo): void {
        // 简单的弹窗输入
        const comment = prompt('请输入备注:');
        if (comment) {
            console.log('添加备注:', comment, '选中文本:', selectionInfo.text);
            // 这里可以添加保存备注的逻辑
        }
    }
    
    /**
     * 默认移除处理
     */
    private defaultRemove(selectionInfo: ISelectionInfo): boolean {
        try {
            if (selectionInfo.isExistingHighlight && selectionInfo.existingHighlight) {
                // 查找高亮元素
                const highlightSpans = selectionInfo.blockElement.querySelectorAll(
                    `span[data-highlight-id="${selectionInfo.existingHighlight.id}"]`
                );
                
                // 移除高亮
                highlightSpans.forEach(span => {
                    const parent = span.parentNode;
                    if (parent) {
                        // 将文本内容替换span元素
                        const textNode = document.createTextNode(span.textContent || '');
                        parent.replaceChild(textNode, span);
                    }
                });
                
                // 清除选择
                DOMUtils.clearSelection();
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('默认移除处理失败:', error);
            return false;
        }
    }
    
    /**
     * 添加样式
     */
    private addStyles(): void {
        const styleId = 'mobile-highlight-styles';
        
        // 检查是否已存在
        if (document.getElementById(styleId)) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* 手机版高亮弹窗样式 */
            .mobile-highlight-popup {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.4;
                box-sizing: border-box;
            }
            
            .mobile-highlight-popup * {
                box-sizing: border-box;
            }
            
            .mobile-highlight-popup .colors-section {
                margin-bottom: 0;
            }
            
            .mobile-highlight-popup .section-title {
                font-weight: 500;
                text-align: center;
            }
            
            .mobile-highlight-popup .color-btn {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 32px;
                min-height: 32px;
                outline: none;
                -webkit-tap-highlight-color: transparent;
            }
            
            .mobile-highlight-popup .color-btn:active {
                transform: scale(0.95) !important;
            }
            
            .mobile-highlight-popup .color-btn::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.8);
                transform: translate(-50%, -50%);
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .mobile-highlight-popup .color-btn:hover::before {
                opacity: 1;
            }
            
            .mobile-highlight-popup .remove-btn,
            .mobile-highlight-popup .comment-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                outline: none;
                -webkit-tap-highlight-color: transparent;
                transition: background-color 0.2s ease, border-color 0.2s ease;
            }
            
            .mobile-highlight-popup .remove-btn:hover {
                background: var(--b3-theme-error-light, rgba(244, 67, 54, 0.1)) !important;
            }
            
            .mobile-highlight-popup .comment-btn:hover {
                background: var(--b3-theme-primary-light, rgba(33, 150, 243, 0.1)) !important;
            }
            
            .mobile-highlight-popup .remove-btn:active,
            .mobile-highlight-popup .comment-btn:active {
                transform: scale(0.98);
            }
            
            /* 高亮样式 */
            .highlight-assistant-span {
                border-radius: 2px;
                padding: 1px 2px;
                margin: 0 1px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .highlight-color-yellow {
                background-color: var(--highlight-color-yellow, #fff3cd);
                border-bottom: 2px solid var(--highlight-border-yellow, #ffeaa7);
            }
            
            .highlight-color-green {
                background-color: var(--highlight-color-green, #d4edda);
                border-bottom: 2px solid var(--highlight-border-green, #55a3ff);
            }
            
            .highlight-color-blue {
                background-color: var(--highlight-color-blue, #cce5ff);
                border-bottom: 2px solid var(--highlight-border-blue, #74b9ff);
            }
            
            .highlight-color-pink {
                background-color: var(--highlight-color-pink, #fce4ec);
                border-bottom: 2px solid var(--highlight-border-pink, #fd79a8);
            }
            
            .highlight-color-red {
                background-color: var(--highlight-color-red, #f8d7da);
                border-bottom: 2px solid var(--highlight-border-red, #e17055);
            }
            
            .highlight-color-purple {
                background-color: var(--highlight-color-purple, #e2d9f7);
                border-bottom: 2px solid var(--highlight-border-purple, #a29bfe);
            }
            
            /* 手机版适配 */
            @media (max-width: 768px) {
                .mobile-highlight-popup {
                    max-width: 280px;
                    font-size: 13px;
                }
                
                .mobile-highlight-popup .color-btn {
                    min-width: 36px;
                    min-height: 36px;
                }
                
                .mobile-highlight-popup .section-title {
                    font-size: 11px;
                }
            }
            
            /* 暗色主题适配 */
            [data-theme-mode="dark"] .mobile-highlight-popup {
                background: var(--b3-theme-background, #1e1e1e);
                border-color: var(--b3-border-color, #404040);
                color: var(--b3-theme-on-background, #ffffff);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * 移除样式
     */
    private removeStyles(): void {
        const styleElement = document.getElementById('mobile-highlight-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
    
    /**
     * 手动触发选择检查
     */
    public checkSelection(): void {
        if (this.isInitialized && !this.isDestroyed) {
            this.selectionHandler.checkCurrentSelection();
        }
    }
    
    /**
     * 更新配置
     */
    public updateConfig(config: Partial<IMobileHighlightConfig>): void {
        this.config = { ...this.config, ...config };
        this.log('配置更新', this.config);
    }
    
    /**
     * 更新事件处理器
     */
    public updateEvents(events: Partial<IHighlightEvents>): void {
        this.events = { ...this.events, ...events };
        this.log('事件处理器更新');
    }
    
    /**
     * 获取当前状态
     */
    public get status() {
        return {
            isInitialized: this.isInitialized,
            isDestroyed: this.isDestroyed,
            popupVisible: this.popup.visible,
            isMobile: DOMUtils.isMobile()
        };
    }
    
    /**
     * 调试日志
     */
    private log(message: string, data?: any): void {
        if (this.config.debug) {
            console.log(`[MobileHighlightManager] ${message}`, data || '');
        }
    }
}

/**
 * 创建手机版高亮管理器的工厂函数
 */
export function createMobileHighlightManager(
    config?: IMobileHighlightConfig, 
    events?: IHighlightEvents
): MobileHighlightManager {
    return new MobileHighlightManager(config, events);
}

