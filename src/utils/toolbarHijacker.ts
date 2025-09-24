/**
 * 思源工具栏劫持器 - 专门劫持手机版只读模式下的划线弹窗
 * 在原有复制弹窗基础上添加高亮功能
 */

import { showMessage, getAllEditor } from "siyuan";
import type { HighlightColor } from '../types/highlight';

export class ToolbarHijacker {
    private originalShowContent: any = null;
    private isHijacked: boolean = false;
    private isMobile: boolean = false;
    
    constructor(isMobile: boolean = false) {
        this.isMobile = isMobile;
    }
    
    /**
     * 启动劫持
     */
    public hijack(): void {
        if (this.isHijacked) {
            console.log('[ToolbarHijacker] 已经劫持过了');
            return;
        }
        
        console.log('[ToolbarHijacker] 开始劫持思源工具栏...');
        
        // 延迟执行，确保编辑器已加载
        setTimeout(() => {
            this.performHijack();
        }, 1000);
    }
    
    /**
     * 停止劫持
     */
    public unhijack(): void {
        if (!this.isHijacked || !this.originalShowContent) {
            return;
        }
        
        console.log('[ToolbarHijacker] 恢复原始工具栏...');
        
        try {
            const editors = getAllEditor();
            editors.forEach(editor => {
                if (editor.protyle && editor.protyle.toolbar) {
                    editor.protyle.toolbar.showContent = this.originalShowContent;
                }
            });
            
            this.isHijacked = false;
            this.originalShowContent = null;
            console.log('[ToolbarHijacker] 工具栏劫持已恢复');
            
        } catch (error) {
            console.error('[ToolbarHijacker] 恢复工具栏失败:', error);
        }
    }
    
    /**
     * 执行劫持
     */
    private performHijack(): void {
        console.log('[ToolbarHijacker] 开始执行劫持...');
        
        try {
            const editors = getAllEditor();
            console.log('[ToolbarHijacker] 找到编辑器数量:', editors.length);
            
            if (editors.length === 0) {
                console.log('[ToolbarHijacker] 没有找到编辑器，稍后重试...');
                setTimeout(() => this.performHijack(), 2000);
                return;
            }
            
            let hijackSuccess = false;
            
            // 尝试劫持所有编辑器
            editors.forEach((editor, index) => {
                console.log(`[ToolbarHijacker] 检查编辑器 ${index}:`, {
                    hasProtyle: !!editor.protyle,
                    hasToolbar: !!(editor.protyle && editor.protyle.toolbar),
                    hasShowContent: !!(editor.protyle && editor.protyle.toolbar && editor.protyle.toolbar.showContent)
                });
                
                if (editor.protyle && editor.protyle.toolbar && editor.protyle.toolbar.showContent) {
                    // 保存原始方法（只保存一次）
                    if (!this.originalShowContent) {
                        this.originalShowContent = editor.protyle.toolbar.showContent;
                        console.log('[ToolbarHijacker] 已保存原始 showContent 方法');
                    }
                    
                    // 劫持 showContent 方法
                    const hijacker = this;
                    editor.protyle.toolbar.showContent = function(protyle: any, range: Range, nodeElement: Element) {
                        console.log('[ToolbarHijacker] 🎯 showContent 被劫持调用!', {
                            disabled: protyle.disabled,
                            hasSelection: range.toString().length > 0,
                            selectedText: range.toString().substring(0, 20),
                            isMobile: hijacker.isMobile,
                            nodeId: nodeElement.getAttribute('data-node-id')
                        });
                        
                        // 先调用原始方法显示基础工具栏
                        hijacker.originalShowContent.call(this, protyle, range, nodeElement);
                        
                        // 延迟一点再增强，确保原始工具栏已显示
                        setTimeout(() => {
                            if (hijacker.isMobile && range.toString().trim()) {
                                console.log('[ToolbarHijacker] 准备增强工具栏...');
                                hijacker.enhanceToolbarForMobile(this, range, nodeElement, protyle);
                            }
                        }, 50);
                    };
                    
                    hijackSuccess = true;
                    console.log(`[ToolbarHijacker] 编辑器 ${index} 劫持成功`);
                }
            });
            
            if (hijackSuccess) {
                this.isHijacked = true;
                console.log('[ToolbarHijacker] 🎉 工具栏劫持完全成功！');
                showMessage('📱 高亮功能已激活 - 请选择文本测试');
            } else {
                console.log('[ToolbarHijacker] 未找到可劫持的工具栏，稍后重试...');
                setTimeout(() => this.performHijack(), 3000);
            }
            
        } catch (error) {
            console.error('[ToolbarHijacker] 劫持失败:', error);
            setTimeout(() => this.performHijack(), 3000);
        }
    }
    
    /**
     * 增强手机版工具栏
     */
    private enhanceToolbarForMobile(toolbar: any, range: Range, nodeElement: Element, protyle: any): void {
        try {
            const subElement = toolbar.subElement;
            if (!subElement) {
                console.log('[ToolbarHijacker] 未找到工具栏子元素');
                return;
            }
            
            const flexContainer = subElement.querySelector('.fn__flex');
            if (!flexContainer) {
                console.log('[ToolbarHijacker] 未找到工具栏容器');
                return;
            }
            
            console.log('[ToolbarHijacker] 找到工具栏容器，开始添加高亮按钮');
            
            // 检查是否已经添加过高亮按钮
            if (flexContainer.querySelector('.highlight-btn')) {
                console.log('[ToolbarHijacker] 高亮按钮已存在');
                return;
            }
            
            // 添加高亮按钮组
            this.addHighlightButtons(flexContainer, range, nodeElement, protyle, toolbar);
            
        } catch (error) {
            console.error('[ToolbarHijacker] 增强工具栏失败:', error);
        }
    }
    
    /**
     * 添加高亮按钮组
     */
    private addHighlightButtons(container: HTMLElement, range: Range, nodeElement: Element, protyle: any, toolbar: any): void {
        // 找到更多按钮，在它前面插入我们的按钮
        const moreBtn = container.querySelector('[data-action="more"]');
        const insertPoint = moreBtn || container.lastElementChild;
        
        if (!insertPoint) {
            console.log('[ToolbarHijacker] 未找到插入点');
            return;
        }
        
        // 添加分隔符
        const separator = document.createElement('div');
        separator.className = 'keyboard__split';
        container.insertBefore(separator, insertPoint);
        
        // 高亮颜色配置
        const colors: Array<{name: HighlightColor, icon: string, bg: string}> = [
            { name: 'yellow', icon: '🟡', bg: '#fff3cd' },
            { name: 'green', icon: '🟢', bg: '#d4edda' },
            { name: 'blue', icon: '🔵', bg: '#cce5ff' },
            { name: 'pink', icon: '🩷', bg: '#fce4ec' }
        ];
        
        // 为每种颜色创建按钮
        colors.forEach(color => {
            const btn = this.createHighlightButton(color.name, color.icon, color.bg, range, nodeElement, protyle, toolbar);
            container.insertBefore(btn, insertPoint);
        });
        
        console.log('[ToolbarHijacker] 高亮按钮添加完成');
    }
    
    /**
     * 创建高亮按钮
     */
    private createHighlightButton(
        colorName: HighlightColor, 
        icon: string, 
        bgColor: string, 
        range: Range, 
        nodeElement: Element, 
        protyle: any, 
        toolbar: any
    ): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'keyboard__action highlight-btn';
        btn.setAttribute('data-color', colorName);
        
        // 设置按钮内容
        btn.innerHTML = `
            <span style="font-size: 16px; line-height: 1;">${icon}</span>
        `;
        
        // 设置按钮样式
        btn.style.cssText = `
            background: ${bgColor} !important;
            border: 2px solid rgba(0,0,0,0.1) !important;
            border-radius: 6px !important;
            padding: 8px !important;
            margin: 0 2px !important;
            min-width: 36px !important;
            min-height: 36px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
        `;
        
        // 添加悬停效果
        btn.addEventListener('mousedown', () => {
            btn.style.transform = 'scale(0.95)';
        });
        
        btn.addEventListener('mouseup', () => {
            btn.style.transform = 'scale(1)';
        });
        
        // 添加点击事件
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            console.log(`[ToolbarHijacker] 高亮按钮被点击: ${colorName}`);
            
            try {
                this.applyHighlight(colorName, range, nodeElement, protyle);
                
                // 隐藏工具栏
                this.hideToolbar(toolbar);
                
                showMessage(`✅ ${colorName} 高亮已应用`);
                
            } catch (error) {
                console.error('[ToolbarHijacker] 应用高亮失败:', error);
                showMessage('❌ 高亮应用失败');
            }
        });
        
        return btn;
    }
    
    /**
     * 应用高亮
     */
    private applyHighlight(color: HighlightColor, range: Range, nodeElement: Element, protyle: any): void {
        const selectedText = range.toString();
        
        console.log('[ToolbarHijacker] 开始应用高亮:', {
            color,
            text: selectedText.substring(0, 20),
            nodeId: nodeElement.getAttribute('data-node-id')
        });
        
        // 创建高亮span元素
        const span = document.createElement('span');
        span.className = `highlight-assistant-span highlight-color-${color}`;
        span.setAttribute('data-highlight-type', 'custom');
        span.setAttribute('data-highlight-color', color);
        span.setAttribute('data-highlight-id', this.generateId());
        span.setAttribute('data-highlight-created', Date.now().toString());
        span.textContent = selectedText;
        
        // 设置高亮样式
        const colorStyles = {
            yellow: { bg: '#fff3cd', border: '#ffeaa7' },
            green: { bg: '#d4edda', border: '#55a3ff' },
            blue: { bg: '#cce5ff', border: '#74b9ff' },
            pink: { bg: '#fce4ec', border: '#fd79a8' },
            red: { bg: '#f8d7da', border: '#e17055' },
            purple: { bg: '#e2d9f7', border: '#a29bfe' }
        };
        
        const style = colorStyles[color] || colorStyles.yellow;
        span.style.cssText = `
            background-color: ${style.bg};
            border-bottom: 2px solid ${style.border};
            border-radius: 2px;
            padding: 1px 2px;
            margin: 0 1px;
        `;
        
        // 替换选中内容
        range.deleteContents();
        range.insertNode(span);
        
        // 清除选择
        window.getSelection()?.removeAllRanges();
        
        console.log('[ToolbarHijacker] 高亮应用成功');
    }
    
    /**
     * 隐藏工具栏
     */
    private hideToolbar(toolbar: any): void {
        try {
            if (toolbar.subElement) {
                toolbar.subElement.classList.add('fn__none');
            }
        } catch (error) {
            console.error('[ToolbarHijacker] 隐藏工具栏失败:', error);
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
     * 获取劫持状态
     */
    public get hijacked(): boolean {
        return this.isHijacked;
    }
}
