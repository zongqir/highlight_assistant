/**
 * 思源工具栏劫持器 - 专门劫持手机版只读模式下的划线弹窗
 * 在原有复制弹窗基础上添加高亮功能
 */

import { showMessage, getAllEditor, Constants } from "siyuan";
import type { HighlightColor } from '../types/highlight';

export class ToolbarHijacker {
    private originalShowContent: any = null;
    private isHijacked: boolean = false;
    private isMobile: boolean = false;
    private api: any;
    
    constructor(isMobile: boolean = false) {
        this.isMobile = isMobile;
        // 设置API引用
        this.api = {
            updateBlock: async (blockId: string, data: string, dataType: string) => {
                const payload = {
                    id: blockId,
                    data: data,
                    dataType: dataType
                };
                
                
                const response = await fetch('/api/block/updateBlock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                return await response.json();
            },
            showMessage: showMessage
        };
    }
    
    /**
     * 启动劫持
     */
    public hijack(): void {
        if (this.isHijacked) {
            return;
        }
        
        
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
        
        
        try {
            const editors = getAllEditor();
            editors.forEach(editor => {
                if (editor.protyle && editor.protyle.toolbar) {
                    editor.protyle.toolbar.showContent = this.originalShowContent;
                }
            });
            
            this.isHijacked = false;
            this.originalShowContent = null;
            
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 执行劫持
     */
    private performHijack(): void {
        try {
            const editors = getAllEditor();
            
            if (editors.length === 0) {
                setTimeout(() => this.performHijack(), 2000);
                return;
            }
            
            let hijackSuccess = false;
            
            // 尝试劫持所有编辑器
            editors.forEach((editor) => {
                if (editor.protyle && editor.protyle.toolbar && editor.protyle.toolbar.showContent) {
                    // 保存原始方法（只保存一次）
                    if (!this.originalShowContent) {
                        this.originalShowContent = editor.protyle.toolbar.showContent;
                    }
                    
                    // 劫持 showContent 方法
                    const hijacker = this;
                    editor.protyle.toolbar.showContent = function(protyle: any, range: Range, nodeElement: Element) {
                        // 先调用原始方法显示基础工具栏
                        hijacker.originalShowContent.call(this, protyle, range, nodeElement);
                        
                        // 延迟一点再增强，确保原始工具栏已显示
                        setTimeout(() => {
                            if (hijacker.isMobile && range.toString().trim()) {
                                hijacker.enhanceToolbarForMobile(this, range, nodeElement, protyle);
                            }
                        }, 50);
                    };
                    
                    hijackSuccess = true;
                }
            });
            
            if (hijackSuccess) {
                this.isHijacked = true;
                showMessage('📱 高亮功能已激活');
            } else {
                setTimeout(() => this.performHijack(), 3000);
            }
            
        } catch (error) {
            setTimeout(() => this.performHijack(), 3000);
        }
    }
    
    /**
     * 增强手机版工具栏
     */
    private enhanceToolbarForMobile(toolbar: any, range: Range, nodeElement: Element, protyle: any): void {
        try {
            const subElement = toolbar.subElement;
            if (!subElement) return;
            
            const flexContainer = subElement.querySelector('.fn__flex');
            if (!flexContainer) return;
            
            // 检查是否已经添加过高亮按钮
            if (flexContainer.querySelector('.highlight-btn')) {
                return;
            }
            
            // 添加高亮按钮组
            this.addHighlightButtons(flexContainer, range, nodeElement, protyle, toolbar);
            
            // 添加按钮后调整工具栏位置，确保完整显示
            this.adjustToolbarPosition(toolbar, range);
            
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 添加高亮按钮组
     */
    private addHighlightButtons(container: HTMLElement, range: Range, nodeElement: Element, protyle: any, toolbar: any): void {
        // 找到更多按钮，在它前面插入我们的按钮
        const moreBtn = container.querySelector('[data-action="more"]');
        const insertPoint = moreBtn || container.lastElementChild;
        
        if (!insertPoint) return;
        
        // 添加分隔符
        const separator = document.createElement('div');
        separator.className = 'keyboard__split';
        container.insertBefore(separator, insertPoint);
        
        // 浅色系颜色配置（保持之前的颜色）
        const colors: Array<{name: HighlightColor, bg: string, displayName: string}> = [
            { name: 'yellow', bg: '#fff3cd', displayName: '黄色高亮' },
            { name: 'green', bg: '#d4edda', displayName: '绿色高亮' },
            { name: 'blue', bg: '#cce5ff', displayName: '蓝色高亮' },
            { name: 'pink', bg: '#fce4ec', displayName: '粉色高亮' }
        ];
        
        // 为每种颜色创建按钮
        colors.forEach(color => {
            const btn = this.createHighlightButton(color, range, nodeElement, protyle, toolbar);
            container.insertBefore(btn, insertPoint);
        });
        
        // 添加恢复按钮（白色小球）
        const removeBtn = this.createRemoveButton(range, nodeElement, protyle, toolbar);
        container.insertBefore(removeBtn, insertPoint);
        
        // 添加备注按钮
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
        const btn = document.createElement('button');
        btn.className = 'keyboard__action highlight-btn wechat-style';
        btn.setAttribute('data-color', colorConfig.name);
        
        // 微信读书风格：小号纯色圆形按钮，强制垂直居中
        btn.style.cssText = `
            background: ${colorConfig.bg} !important;
            border: none !important;
            border-radius: 50% !important;
            width: 22px !important;
            height: 22px !important;
            margin: auto 2px !important;
            padding: 0 !important;
            display: inline-block !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2) !important;
            vertical-align: middle !important;
        `;
        
        // 简单的触摸效果
        btn.addEventListener('touchstart', () => {
            btn.style.opacity = '0.7';
        });
        
        btn.addEventListener('touchend', () => {
            btn.style.opacity = '1';
        });
        
        // 鼠标效果
        btn.addEventListener('mousedown', () => {
            btn.style.opacity = '0.7';
        });
        
        btn.addEventListener('mouseup', () => {
            btn.style.opacity = '1';
        });
        
        // 添加点击事件
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // 构建API需要的颜色配置
            const apiColorConfig = {
                name: colorConfig.displayName,
                color: this.getColorValue(colorConfig.name)
            };
            
            // 应用高亮（异步处理）
            await this.applyHighlight(protyle, range, nodeElement, apiColorConfig);
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
        
        // 白色小球样式
        btn.style.cssText = `
            background: #ffffff !important;
            border: 1px solid #ddd !important;
            border-radius: 50% !important;
            width: 22px !important;
            height: 22px !important;
            margin: auto 2px !important;
            padding: 0 !important;
            display: inline-block !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2) !important;
            vertical-align: middle !important;
        `;
        
        // 纯白色小球，不添加任何图标
        
        // 触摸效果
        btn.addEventListener('touchstart', () => {
            btn.style.opacity = '0.7';
        });
        
        btn.addEventListener('touchend', () => {
            btn.style.opacity = '1';
        });
        
        // 点击事件 - 去除高亮格式
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            await this.removeHighlight(protyle, range, nodeElement);
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
        
        // 灰色小球样式
        btn.style.cssText = `
            background: #f5f5f5 !important;
            border: 1px solid #ddd !important;
            border-radius: 50% !important;
            width: 22px !important;
            height: 22px !important;
            margin: auto 2px !important;
            padding: 0 !important;
            display: inline-block !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2) !important;
            vertical-align: middle !important;
        `;
        
        // 添加备注图标
        btn.innerHTML = '<span style="color: #666; font-size: 10px;">💬</span>';
        
        // 触摸效果
        btn.addEventListener('touchstart', () => {
            btn.style.opacity = '0.7';
        });
        
        btn.addEventListener('touchend', () => {
            btn.style.opacity = '1';
        });
        
        // 点击事件 - 待实现
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // TODO: 实现备注功能
            showMessage('备注功能待实现', 2000);
        });
        
        return btn;
    }
    
    /**
     * 应用高亮 - 按照案例代码实现
     */
    private async applyHighlight(protyle: any, range: Range, nodeElement: Element, colorConfig: {name: string, color: string}): Promise<void> {
        try {
            const selectedText = range.toString();
            if (!selectedText) return;

            // 找到真正的块元素
            const blockElement = this.findBlockElement(range.startContainer);
            if (!blockElement) {
                console.error("未找到块元素");
                return;
            }

            const blockId = blockElement.getAttribute("data-node-id");
            if (!blockId) {
                console.error("未找到块ID");
                return;
            }

            // 保存原始内容用于对比 - 关键：使用innerHTML而不是outerHTML
            const oldContent = blockElement.innerHTML;

            // 创建简单的高亮span元素
            const highlightSpan = document.createElement("span");
            highlightSpan.setAttribute("data-type", "text");
            highlightSpan.style.backgroundColor = colorConfig.color;
            highlightSpan.textContent = selectedText;
            
            // DOM操作 - 替换选中内容
            range.deleteContents();
            range.insertNode(highlightSpan);
            

            // 更新时间戳
            const timestamp = new Date().getTime().toString().substring(0, 10);
            blockElement.setAttribute("updated", timestamp);

            // 关键修正：保存块的innerHTML内容，不是outerHTML
            const newContent = blockElement.innerHTML;

            // 检查是否真的有变化
            if (newContent === oldContent) {
                return;
            }

            // 添加调试日志
            console.log('[ToolbarHijacker] 保存块内容:', {
                blockId,
                dataType: "dom",
                oldContentLength: oldContent.length,
                newContentLength: newContent.length,
                newContent: newContent
            });

            // 提取markdown格式内容
            const markdownContent = this.extractMarkdownFromBlock(blockElement);
            
            console.log('[ToolbarHijacker] 提取的markdown内容:', markdownContent);

            // 使用 updateBlock API 保存 - 保存markdown内容
            const updateResult = await this.api.updateBlock(blockId, markdownContent, "markdown");

            console.log('[ToolbarHijacker] API保存结果:', updateResult);

            if (updateResult.code === 0) {
                this.api.showMessage(`已应用${colorConfig.name}`);
                console.log("✅ 高亮保存成功");
            } else {
                this.api.showMessage(`高亮失败`, 3000, "error");
                console.error("❌ 保存失败:", updateResult.msg);
                this.restoreOriginalHTML(blockId, oldContent);
            }

            this.hideToolbarAndClearSelection(protyle);

        } catch (error) {
            this.api.showMessage("高亮功能出错", 3000, "error");
        }
    }
    
    /**
     * 移除高亮格式
     */
    private async removeHighlight(protyle: any, range: Range, nodeElement: Element): Promise<void> {
        try {
            const selectedText = range.toString();
            if (!selectedText) return;

            // 找到真正的块元素
            const blockElement = this.findBlockElement(range.startContainer);
            if (!blockElement) return;

            const blockId = blockElement.getAttribute("data-node-id");
            if (!blockId) return;

            // 保存原始内容
            const oldContent = blockElement.innerHTML;

            // 检查选中的内容是否包含高亮span
            const tempRange = range.cloneRange();
            const fragment = tempRange.cloneContents();
            const hasHighlight = fragment.querySelector('span[data-type="text"]');

            if (hasHighlight) {
                // 移除高亮：将span替换为纯文本
                const walker = document.createTreeWalker(
                    range.commonAncestorContainer,
                    NodeFilter.SHOW_ELEMENT,
                    {
                        acceptNode: (node) => {
                            return (node as Element).tagName === 'SPAN' && 
                                   (node as Element).getAttribute('data-type') === 'text' 
                                   ? NodeFilter.FILTER_ACCEPT 
                                   : NodeFilter.FILTER_SKIP;
                        }
                    }
                );

                const spansToRemove: Element[] = [];
                let node;
                while (node = walker.nextNode()) {
                    spansToRemove.push(node as Element);
                }

                // 移除所有高亮span，保留文本内容
                spansToRemove.forEach(span => {
                    const textNode = document.createTextNode(span.textContent || '');
                    span.parentNode?.replaceChild(textNode, span);
                });
            }

            // 更新时间戳
            const timestamp = new Date().getTime().toString().substring(0, 10);
            blockElement.setAttribute("updated", timestamp);

            // 提取并保存内容
            const newContent = this.extractMarkdownFromBlock(blockElement);
            const updateResult = await this.api.updateBlock(blockId, newContent, "markdown");

            if (updateResult.code === 0) {
                showMessage('✅ 已移除高亮');
            } else {
                showMessage('❌ 移除失败');
                this.restoreOriginalHTML(blockId, oldContent);
            }

            this.hideToolbarAndClearSelection(protyle);

        } catch (error) {
            showMessage('❌ 移除高亮出错');
        }
    }
    
    /**
     * 关键修正：正确查找块元素
     */
    private findBlockElement(node: Node): HTMLElement | null {
        let current = node;
        
        // 向上遍历DOM树查找具有data-node-id属性的块元素
        while (current && current !== document) {
            if (current.nodeType === Node.ELEMENT_NODE && 
                (current as HTMLElement).getAttribute && 
                (current as HTMLElement).getAttribute("data-node-id")) {
                
                const element = current as HTMLElement;
                // 确保这是一个真正的块元素(p, h1-h6, li等)，而不是容器元素
                const tagName = element.tagName.toLowerCase();
                const className = element.className || '';
                
                // 排除容器类元素，只保留真正的内容块
                if (!className.includes('protyle-content') && 
                    !className.includes('protyle-wysiwyg') &&
                    !className.includes('protyle-html') &&
                    tagName !== 'body' && 
                    tagName !== 'html') {
                    
                    return element;
                }
            }
            current = current.parentNode!;
        }
        
        return null;
    }
    
    /**
     * 从块元素提取markdown内容
     */
    private extractMarkdownFromBlock(blockElement: HTMLElement): string {
        try {
            // 获取块的innerHTML内容
            const innerHTML = blockElement.innerHTML;
            
            // 创建临时容器解析内容
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = innerHTML;
            
            // 尝试多种方式提取内容
            // 方式1：查找 contenteditable="false" 的div（只读模式）
            let contentDiv = tempDiv.querySelector('div[contenteditable="false"]');
            
            // 方式2：如果没找到，查找 contenteditable="true" 的div（编辑模式）
            if (!contentDiv) {
                contentDiv = tempDiv.querySelector('div[contenteditable="true"]');
            }
            
            // 方式3：如果还没找到，查找第一个div
            if (!contentDiv) {
                contentDiv = tempDiv.querySelector('div');
            }
            
            if (contentDiv && contentDiv.innerHTML.trim() && contentDiv.innerHTML.trim() !== '​') {
                console.log('[ToolbarHijacker] 提取内容成功 - 方式:', contentDiv.getAttribute('contenteditable') || 'div');
                return contentDiv.innerHTML;
            }
            
            // 方式4：如果都没找到，可能是编辑模式，尝试提取第一个div的内容
            const firstDiv = tempDiv.querySelector('div');
            if (firstDiv && firstDiv.innerHTML.trim() && firstDiv.innerHTML.trim() !== '​') {
                console.log('[ToolbarHijacker] 提取编辑模式内容 - div内容');
                return firstDiv.innerHTML;
            }
            
            // 方式5：最后回退，过滤掉protyle-attr后返回
            const cleanedInnerHTML = innerHTML.replace(/<div[^>]*class="protyle-attr"[^>]*>​<\/div>/g, '');
            
            console.log('[ToolbarHijacker] 使用清理后的innerHTML');
            return cleanedInnerHTML;
            
        } catch (error) {
            console.error('提取markdown失败:', error);
            return blockElement.innerHTML;
        }
    }
    
    /**
     * 恢复原始HTML
     */
    private restoreOriginalHTML(blockId: string, originalHTML: string): void {
        try {
            const blockElement = document.querySelector(`[data-node-id="${blockId}"]`);
            if (blockElement && blockElement.parentNode) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = originalHTML;
                const newElement = tempDiv.firstElementChild;
                if (newElement) {
                    blockElement.parentNode.replaceChild(newElement, blockElement);
                }
            }
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 隐藏工具栏并清除选择
     */
    private hideToolbarAndClearSelection(protyle: any): void {
        try {
            // 隐藏工具栏
            if (protyle.toolbar && protyle.toolbar.element) {
                protyle.toolbar.element.style.display = "none";
            }
            
            // 清除选择
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
            }
            
            
        } catch (error) {
            // 静默处理错误
        }
    }
    
    
    /**
     * 获取浅色系颜色值
     */
    private getColorValue(color: HighlightColor): string {
        const lightColors = {
            yellow: '#fff3cd',
            green: '#d4edda',
            blue: '#cce5ff',
            pink: '#fce4ec',
            red: '#f8d7da',
            purple: '#e2d9f7'
        };
        
        return lightColors[color] || lightColors.yellow;
    }
    
    
    /**
     * 简化的工具栏位置调整
     */
    private adjustToolbarPosition(toolbar: any, range: Range): void {
        try {
            const subElement = toolbar.subElement;
            if (!subElement) return;
            
            const toolbarRect = subElement.getBoundingClientRect();
            const selectionRect = range.getBoundingClientRect();
            
            let needsAdjust = false;
            let newLeft = parseFloat(subElement.style.left) || toolbarRect.left;
            let newTop = parseFloat(subElement.style.top) || toolbarRect.top;
            
            // 右边界检查
            if (toolbarRect.right > window.innerWidth - 10) {
                newLeft = window.innerWidth - toolbarRect.width - 10;
                needsAdjust = true;
            }
            
            // 左边界检查
            if (toolbarRect.left < 10) {
                newLeft = 10;
                needsAdjust = true;
            }
            
            // 下边界检查
            if (toolbarRect.bottom > window.innerHeight - 10) {
                newTop = selectionRect.top - toolbarRect.height - 10;
                needsAdjust = true;
            }
            
            // 应用调整
            if (needsAdjust) {
                subElement.style.left = newLeft + 'px';
                subElement.style.top = newTop + 'px';
                subElement.style.position = 'fixed';
            }
            
        } catch (error) {
            // 静默处理错误
        }
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
