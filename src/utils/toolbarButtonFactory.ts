import Logger from './logger';
/**
 * 工具栏按钮工厂 - 负责创建各种工具栏按钮
 * 从 toolbarHijacker.ts 中提取，减少主文件大小
 */

import type { HighlightColor } from '../types/highlight';
import { StyleManager, HIGHLIGHT_COLORS } from './styleManager';
import { MemoManager } from './memoManager';

export class ToolbarButtonFactory {
    private isMobile: boolean;
    private memoManager: MemoManager;
    private onHighlightApply: (protyle: any, range: Range, nodeElement: Element, colorConfig: {name: string, color: string}) => Promise<void>;
    private onHighlightRemove: (range: Range, nodeElement: Element, protyle: any) => Promise<void>;
    private onToolbarHide: (toolbar: any) => void;
    private onSelectionClear: () => void;
    private getColorValue: (color: HighlightColor) => string;

    constructor(
        isMobile: boolean,
        memoManager: MemoManager,
        callbacks: {
            onHighlightApply: (protyle: any, range: Range, nodeElement: Element, colorConfig: {name: string, color: string}) => Promise<void>;
            onHighlightRemove: (range: Range, nodeElement: Element, protyle: any) => Promise<void>;
            onToolbarHide: (toolbar: any) => void;
            onSelectionClear: () => void;
            getColorValue: (color: HighlightColor) => string;
        }
    ) {
        this.isMobile = isMobile;
        this.memoManager = memoManager;
        this.onHighlightApply = callbacks.onHighlightApply;
        this.onHighlightRemove = callbacks.onHighlightRemove;
        this.onToolbarHide = callbacks.onToolbarHide;
        this.onSelectionClear = callbacks.onSelectionClear;
        this.getColorValue = callbacks.getColorValue;
    }

    /**
     * 创建所有按钮并添加到容器
     */
    addButtonsToContainer(
        container: HTMLElement,
        range: Range,
        nodeElement: Element,
        protyle: any,
        toolbar: any,
        insertPoint: Element | null
    ): void {
        if (!insertPoint) return;
        
        // 添加分隔符
        const separator = document.createElement('div');
        separator.className = 'keyboard__split';
        container.insertBefore(separator, insertPoint);
        
        // 使用全局统一的颜色配置
        const colors = HIGHLIGHT_COLORS;
        
        // 为每种颜色创建按钮
        colors.forEach((color) => {
            const btn = this.createHighlightButton(color, range, nodeElement, protyle, toolbar);
            container.insertBefore(btn, insertPoint);
        });
        
        // 添加恢复按钮（白色小球）
        const removeBtn = this.createRemoveButton(range, nodeElement, protyle, toolbar);
        container.insertBefore(removeBtn, insertPoint);
        
        // 添加备注按钮（调用 MemoManager）
        const commentBtn = this.createCommentButton(range, nodeElement, protyle, toolbar);
        container.insertBefore(commentBtn, insertPoint);
    }

    /**
     * 创建高亮按钮
     */
    private createHighlightButton(
        colorConfig: {name: HighlightColor, bg: string, displayName: string}, 
        range: Range, 
        nodeElement: Element, 
        protyle: any, 
        toolbar: any
    ): HTMLButtonElement {
        // 克隆 range 以避免在异步操作中失效
        const clonedRange = range.cloneRange();
        
        const btn = document.createElement('button');
        btn.className = 'keyboard__action highlight-btn wechat-style';
        btn.setAttribute('data-color', colorConfig.name);
        
        // 使用 StyleManager 设置样式
        btn.style.cssText = StyleManager.getHighlightButtonStyle(this.isMobile, colorConfig.bg);
        btn.title = colorConfig.displayName;
        
        // 添加交互效果
        StyleManager.addButtonInteractionEffects(btn);
        
        // 添加点击事件
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // 构建API需要的颜色配置
            const apiColorConfig = {
                name: colorConfig.displayName,
                color: this.getColorValue(colorConfig.name)
            };
            
            // 使用克隆的 range，并在应用前更新 protyle.toolbar.range
            protyle.toolbar.range = clonedRange;
            
            // 应用高亮（异步处理）
            await this.onHighlightApply(protyle, clonedRange, nodeElement, apiColorConfig);
            
            // 隐藏工具栏
            this.onToolbarHide(toolbar);
            // 清除选区
            this.onSelectionClear();
        });
        
        return btn;
    }

    /**
     * 创建恢复按钮（白色小球）
     */
    private createRemoveButton(range: Range, nodeElement: Element, protyle: any, toolbar: any): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'keyboard__action remove-btn';
        btn.setAttribute('data-action', 'remove-highlight');
        
        // 使用 StyleManager 设置样式
        btn.style.cssText = StyleManager.getRemoveButtonStyle(this.isMobile);
        
        // 纯白色小球，不添加任何图标
        
        // 添加交互效果
        StyleManager.addButtonInteractionEffects(btn);
        
        // 点击事件 - 去除高亮格式
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            await this.onHighlightRemove(range, nodeElement, protyle);
            
            this.onToolbarHide(toolbar);
            this.onSelectionClear();
        });
        
        return btn;
    }

    /**
     * 创建备注按钮
     */
    private createCommentButton(range: Range, nodeElement: Element, protyle: any, toolbar: any): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'keyboard__action comment-btn';
        btn.setAttribute('data-action', 'add-comment');
        
        // 使用 StyleManager 设置样式
        btn.style.cssText = StyleManager.getCommentButtonStyle(this.isMobile);
        
        // 添加备注图标
        btn.innerHTML = '<span style="color: #666; font-size: 10px;">💬</span>';
        
        // 添加交互效果
        StyleManager.addButtonInteractionEffects(btn);
        
        // 点击事件 - 调用 MemoManager（带弹窗）
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const selectedText = range.toString().trim();
            if (!selectedText) {
                Logger.warn('请先选择要添加备注的文本');
                return;
            }
            
            // 调用 MemoManager 的方法（会显示输入框）
            await this.memoManager.addMemoWithPrompt(range);
            
            this.onToolbarHide(toolbar);
            this.onSelectionClear();
        });
        
        return btn;
    }
}


