/**
 * 简化的手机版高亮管理器
 * 使用touchend事件，完全绕过selectionchange
 */

import type { ISelectionInfo, HighlightColor } from '../types/highlight';
import { TouchSelectionHandler } from '../utils/touchSelectionHandler';
import { MobilePopup } from '../components/mobilePopup';
import { DOMUtils } from '../utils/domUtils';

/**
 * 简化的手机版高亮管理器
 */
export class SimpleMobileManager {
    private touchHandler: TouchSelectionHandler;
    private popup: MobilePopup;
    private isInitialized: boolean = false;
    
    // 事件回调
    private onHighlightCallback: ((color: HighlightColor, info: ISelectionInfo) => Promise<boolean>) | null = null;
    private onRemoveCallback: ((info: ISelectionInfo) => Promise<boolean>) | null = null;
    
    constructor() {
        // 创建触摸处理器
        this.touchHandler = new TouchSelectionHandler();
        
        // 创建弹窗
        this.popup = new MobilePopup({
            colors: ['yellow', 'green', 'blue', 'pink'],
            showCommentButton: false,
            autoHideDelay: 0
        });
        
        this.bindEvents();
    }
    
    /**
     * 初始化
     */
    public init(): void {
        if (this.isInitialized) return;
        
        // 检查是否手机版
        if (!DOMUtils.isMobile()) {
            console.log('非手机版环境，跳过初始化');
            return;
        }
        
        // 启动触摸处理器
        this.touchHandler.start();
        
        this.isInitialized = true;
        console.log('简化手机版管理器初始化完成');
    }
    
    /**
     * 销毁
     */
    public destroy(): void {
        if (!this.isInitialized) return;
        
        this.touchHandler.stop();
        this.popup.destroy();
        this.isInitialized = false;
    }
    
    /**
     * 设置高亮回调
     */
    public onHighlight(callback: (color: HighlightColor, info: ISelectionInfo) => Promise<boolean>): void {
        this.onHighlightCallback = callback;
    }
    
    /**
     * 设置移除回调
     */
    public onRemove(callback: (info: ISelectionInfo) => Promise<boolean>): void {
        this.onRemoveCallback = callback;
    }
    
    /**
     * 绑定事件
     */
    private bindEvents(): void {
        // 触摸选择事件
        this.touchHandler.onSelection((selectionInfo) => {
            this.popup.show(selectionInfo);
        });
        
        this.touchHandler.onHide(() => {
            this.popup.hide();
        });
        
        // 弹窗事件
        this.popup.updateEvents({
            onHighlight: async (color, selectionInfo) => {
                if (this.onHighlightCallback) {
                    const success = await this.onHighlightCallback(color, selectionInfo);
                    if (success) {
                        this.applyDefaultHighlight(color, selectionInfo);
                    }
                } else {
                    this.applyDefaultHighlight(color, selectionInfo);
                }
            },
            
            onRemove: async (selectionInfo) => {
                if (this.onRemoveCallback) {
                    const success = await this.onRemoveCallback(selectionInfo);
                    if (success) {
                        this.removeDefaultHighlight(selectionInfo);
                    }
                } else {
                    this.removeDefaultHighlight(selectionInfo);
                }
            }
        });
    }
    
    /**
     * 应用默认高亮
     */
    private applyDefaultHighlight(color: HighlightColor, selectionInfo: ISelectionInfo): void {
        try {
            const span = DOMUtils.createHighlightSpan(selectionInfo.text, color);
            const success = DOMUtils.replaceSelectionWithHighlight(selectionInfo.selection, span);
            
            if (success) {
                DOMUtils.clearSelection();
                console.log('高亮应用成功');
            }
        } catch (error) {
            console.error('应用高亮失败:', error);
        }
    }
    
    /**
     * 移除默认高亮
     */
    private removeDefaultHighlight(selectionInfo: ISelectionInfo): void {
        try {
            if (selectionInfo.isExistingHighlight && selectionInfo.existingHighlight) {
                const spans = document.querySelectorAll(`[data-highlight-id="${selectionInfo.existingHighlight.id}"]`);
                spans.forEach(span => {
                    const parent = span.parentNode;
                    if (parent) {
                        const textNode = document.createTextNode(span.textContent || '');
                        parent.replaceChild(textNode, span);
                    }
                });
                
                DOMUtils.clearSelection();
                console.log('高亮移除成功');
            }
        } catch (error) {
            console.error('移除高亮失败:', error);
        }
    }
}

/**
 * 创建简化管理器
 */
export function createSimpleMobileManager(): SimpleMobileManager {
    return new SimpleMobileManager();
}

