/**
 * 基于触摸事件的选择处理器
 * 完全绕过selectionchange事件，直接监听touch交互
 */

import type { ISelectionInfo } from '../types/highlight';
import { DOMUtils } from './domUtils';

/**
 * 触摸选择处理器
 * 直接监听touchend事件，绕过所有系统事件阻塞
 */
export class TouchSelectionHandler {
    private isActive: boolean = false;
    private lastSelectionText: string = '';
    private onSelectionCallback: ((info: ISelectionInfo) => void) | null = null;
    private onHideCallback: (() => void) | null = null;
    
    /**
     * 启动处理器
     */
    public start(): void {
        if (this.isActive) return;
        
        // 直接监听touchend事件，不监听selectionchange
        document.addEventListener('touchend', this.handleTouchEnd, true);
        this.isActive = true;
    }
    
    /**
     * 停止处理器
     */
    public stop(): void {
        if (!this.isActive) return;
        
        document.removeEventListener('touchend', this.handleTouchEnd, true);
        this.isActive = false;
        this.lastSelectionText = '';
    }
    
    /**
     * 设置选择回调
     */
    public onSelection(callback: (info: ISelectionInfo) => void): void {
        this.onSelectionCallback = callback;
    }
    
    /**
     * 设置隐藏回调
     */
    public onHide(callback: () => void): void {
        this.onHideCallback = callback;
    }
    
    /**
     * 处理触摸结束事件
     */
    private handleTouchEnd = (): void => {
        // 给一个很短的延迟，让系统完成选择处理
        setTimeout(() => {
            this.checkSelection();
        }, 50);
    };
    
    /**
     * 检查当前选择状态
     */
    private checkSelection(): void {
        const selection = window.getSelection();
        
        if (!selection || selection.rangeCount === 0) {
            this.handleSelectionHide();
            return;
        }
        
        const currentText = selection.toString().trim();
        
        // 没有选中文本
        if (!currentText) {
            this.handleSelectionHide();
            return;
        }
        
        // 文本没有变化，跳过
        if (currentText === this.lastSelectionText) {
            return;
        }
        
        this.lastSelectionText = currentText;
        
        // 检查是否在编辑器中
        const range = selection.getRangeAt(0);
        if (!this.isInEditor(range)) {
            this.handleSelectionHide();
            return;
        }
        
        // 获取选择信息
        const selectionInfo = DOMUtils.getSelectionInfo();
        if (!selectionInfo) {
            this.handleSelectionHide();
            return;
        }
        
        // 触发选择回调
        if (this.onSelectionCallback) {
            this.onSelectionCallback(selectionInfo);
        }
    }
    
    /**
     * 处理选择隐藏
     */
    private handleSelectionHide(): void {
        if (this.lastSelectionText) {
            this.lastSelectionText = '';
            if (this.onHideCallback) {
                this.onHideCallback();
            }
        }
    }
    
    /**
     * 检查是否在编辑器中
     */
    private isInEditor(range: Range): boolean {
        try {
            const startContainer = range.startContainer;
            const element = startContainer.nodeType === Node.TEXT_NODE 
                ? startContainer.parentElement 
                : startContainer as HTMLElement;
            
            if (!element) return false;
            
            // 查找protyle编辑器
            let current: HTMLElement | null = element;
            let level = 0;
            
            while (current && level < 15) {
                if (current.classList?.contains('protyle-wysiwyg')) {
                    return true;
                }
                current = current.parentElement;
                level++;
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }
}

/**
 * 创建触摸选择处理器
 */
export function createTouchSelectionHandler(): TouchSelectionHandler {
    return new TouchSelectionHandler();
}

