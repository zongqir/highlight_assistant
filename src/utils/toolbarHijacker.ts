/**
 * 思源工具栏劫持器 - 专门劫持手机版只读模式下的划线弹窗
 * 在原有复制弹窗基础上添加高亮功能
 */

import { getAllEditor } from "siyuan";
import type { HighlightColor } from '../types/highlight';

export class ToolbarHijacker {
    private originalShowContent: any = null;
    private isHijacked: boolean = false;
    private isMobile: boolean = false;
    private isDesktop: boolean = false;
    private api: any;
    private activeEventListeners: (() => void)[] = [];
    
    constructor(isMobile: boolean = false, isDesktop: boolean = false) {
        this.isMobile = isMobile;
        this.isDesktop = isDesktop;
        
        // 在手机版和电脑版环境下都拦截原生备注弹窗
        if (this.isMobile || this.isDesktop) {
            this.interceptNativeMemo();
        }
        
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
            getBlockKramdown: async (blockId: string) => {
                const payload = {
                    id: blockId
                };
                
                const response = await fetch('/api/block/getBlockKramdown', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                return await response.json();
            }
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
        
        // 同时添加鼠标选择监听作为备用方案
        this.setupMouseSelectionListener();
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
            
            // 清理事件监听器
            this.cleanupEventListeners();
            
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
                            if ((hijacker.isMobile || hijacker.isDesktop) && range && range.toString().trim()) {
                                // 检查是否跨块选择
                                if (hijacker.isCrossBlockSelection(range)) {
                                    return; // 跨块选择时不增强工具栏
                                }
                                hijacker.enhanceToolbar(this, range, nodeElement, protyle);
                            }
                        }, 50);
                    };
                    
                    hijackSuccess = true;
                }
            });
            
            if (hijackSuccess) {
                this.isHijacked = true;
                console.log(`✅ ${this.isMobile ? '📱 手机版' : '💻 电脑版'}高亮功能已激活`);
            } else {
                setTimeout(() => this.performHijack(), 3000);
            }
            
        } catch (error) {
            setTimeout(() => this.performHijack(), 3000);
        }
    }
    
    /**
     * 增强工具栏（支持手机版和电脑版）
     */
    private enhanceToolbar(toolbar: any, range: Range, nodeElement: Element, protyle: any): void {
        try {
            const subElement = toolbar.subElement;
            if (!subElement) return;
            
            // 确保工具栏可见（重置之前的隐藏状态）
            this.resetToolbarVisibility(toolbar);
            
            const flexContainer = subElement.querySelector('.fn__flex');
            if (!flexContainer) {
                // 尝试其他可能的选择器
                const alternativeContainer = subElement.querySelector('.keyboard__action')?.parentElement;
                if (alternativeContainer) {
                    this.addHighlightButtons(alternativeContainer, range, nodeElement, protyle, toolbar);
                }
                return;
            }
            
            // 清理之前添加的按钮（避免重复添加）
            this.cleanupPreviousButtons(flexContainer);
            
            // 添加高亮按钮组
            this.addHighlightButtons(flexContainer, range, nodeElement, protyle, toolbar);
            
            // 添加按钮后调整工具栏位置，确保完整显示
            this.adjustToolbarPosition(toolbar, range);
            
            // 添加自动隐藏机制
            this.setupAutoHide(toolbar);
            
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
        colors.forEach((color) => {
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
        
        // 根据平台调整按钮样式
        const isMobile = this.isMobile;
        const buttonSize = isMobile ? '22px' : '28px';
        const borderRadius = isMobile ? '50%' : '6px';
        const margin = isMobile ? 'auto 2px' : 'auto 4px';
        
        // 微信读书风格：小号纯色圆形按钮（手机版）或方形按钮（电脑版）
        btn.style.cssText = `
            background: ${colorConfig.bg} !important;
            border: none !important;
            border-radius: ${borderRadius} !important;
            width: ${buttonSize} !important;
            height: ${buttonSize} !important;
            margin: ${margin} !important;
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
        
        // 根据平台调整按钮样式
        const isMobile = this.isMobile;
        const buttonSize = isMobile ? '22px' : '28px';
        const borderRadius = isMobile ? '50%' : '6px';
        const margin = isMobile ? 'auto 2px' : 'auto 4px';
        
        // 白色小球样式（手机版）或方形按钮（电脑版）
        btn.style.cssText = `
            background: #ffffff !important;
            border: 1px solid #ddd !important;
            border-radius: ${borderRadius} !important;
            width: ${buttonSize} !important;
            height: ${buttonSize} !important;
            margin: ${margin} !important;
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
        
        // 根据平台调整按钮样式
        const isMobile = this.isMobile;
        const buttonSize = isMobile ? '22px' : '28px';
        const borderRadius = isMobile ? '50%' : '6px';
        const margin = isMobile ? 'auto 2px' : 'auto 4px';
        
        // 灰色小球样式（手机版）或方形按钮（电脑版）
        btn.style.cssText = `
            background: #f5f5f5 !important;
            border: 1px solid #ddd !important;
            border-radius: ${borderRadius} !important;
            width: ${buttonSize} !important;
            height: ${buttonSize} !important;
            margin: ${margin} !important;
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
        
        // 点击事件 - 实现备注功能
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            await this.addMemoToSelection(protyle, range, nodeElement, toolbar);
        });
        
        return btn;
    }
    
    /**
     * 添加备注到选中文本
     */
    private async addMemoToSelection(protyle: any, range: Range, nodeElement: Element, toolbar: any): Promise<void> {
        try {
            const selectedText = range.toString().trim();
            if (!selectedText) {
                console.warn('请先选择要添加备注的文本');
                return;
            }

            // 找到真正的块元素
            const blockElement = this.findBlockElement(range.startContainer);
            if (!blockElement) {
                console.warn('未找到目标块元素');
                return;
            }

            const blockId = blockElement.getAttribute("data-node-id");
            if (!blockId) {
                console.warn('未找到块ID');
                return;
            }

            // 弹出输入框让用户输入备注内容
            const memoText = await this.showEnhancedMemoInput(selectedText);
            if (!memoText) {
                return; // 用户取消或未输入内容
            }

            // 保存原始内容
            const oldContent = blockElement.innerHTML;

            // 创建备注span元素（使用思源的正确格式）
            const memoSpan = document.createElement("span");
            memoSpan.setAttribute("data-type", "inline-memo");
            memoSpan.setAttribute("data-inline-memo-content", memoText);  // 正确的属性名
            // 不设置style，让思源自己处理样式
            memoSpan.textContent = selectedText;

            // DOM操作 - 替换选中内容
            range.deleteContents();
            range.insertNode(memoSpan);

            // 更新时间戳
            const timestamp = new Date().getTime().toString().substring(0, 10);
            blockElement.setAttribute("updated", timestamp);

            // 提取并保存内容
            const newContent = await this.extractMarkdownFromBlock(blockElement);
            const updateResult = await this.api.updateBlock(blockId, newContent, "markdown");

            if (updateResult.code === 0) {
                console.log(`✅ 备注添加成功：${memoText.substring(0, 20)}${memoText.length > 20 ? '...' : ''}`);
                // 恢复只读状态
                setTimeout(() => this.restoreReadOnlyState(blockId), 100);
            } else {
                console.error('❌ 备注添加失败');
                this.restoreOriginalHTML(blockId, oldContent);
            }

            this.hideToolbar(toolbar);
            this.clearSelection();

        } catch (error) {
            console.error('添加备注出错:', error);
            // 静默处理错误
        }
    }

    /**
     * 显示备注输入框
     */
    private showMemoInput(): Promise<string> {
        return new Promise((resolve) => {
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
            `;

            // 创建输入框容器
            const inputContainer = document.createElement('div');
            inputContainer.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 20px;
                max-width: 90vw;
                width: 400px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            `;

            // 标题
            const title = document.createElement('h3');
            title.textContent = '添加备注';
            title.style.cssText = `
                margin: 0 0 15px 0;
                color: #333;
                font-size: 18px;
            `;

            // 输入框
            const textarea = document.createElement('textarea');
            textarea.placeholder = '请输入备注内容...';
            textarea.style.cssText = `
                width: 100%;
                height: 80px;
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 10px;
                font-size: 14px;
                resize: vertical;
                box-sizing: border-box;
                font-family: inherit;
            `;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 15px;
            `;

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                padding: 8px 16px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            // 确定按钮
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '确定';
            confirmBtn.style.cssText = `
                padding: 8px 16px;
                border: none;
                background: #007bff;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            // 事件处理
            const cleanup = () => {
                document.body.removeChild(overlay);
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve('');
            });

            confirmBtn.addEventListener('click', () => {
                const memoText = textarea.value.trim();
                cleanup();
                resolve(memoText);
            });

            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve('');
                }
            });

            // 回车键确定
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    const memoText = textarea.value.trim();
                    cleanup();
                    resolve(memoText);
                }
            });

            // 组装界面
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            inputContainer.appendChild(title);
            inputContainer.appendChild(textarea);
            inputContainer.appendChild(buttonContainer);
            overlay.appendChild(inputContainer);
            document.body.appendChild(overlay);

            // 自动聚焦
            setTimeout(() => textarea.focus(), 100);
        });
    }

    /**
     * 应用高亮 - 按照案例代码实现
     */
    private async applyHighlight(protyle: any, range: Range, nodeElement: Element, colorConfig: {name: string, color: string}): Promise<void> {
        try {
            // 添加空值检查
            if (!colorConfig) {
                console.error('applyHighlight: colorConfig is null or undefined');
                return;
            }
            
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
            
            // 调试：检查span是否真的添加到了DOM中
            console.log('[ToolbarHijacker] span添加后，blockElement的innerHTML:', blockElement.innerHTML);
            
            // 查找刚添加的span
            const addedSpan = blockElement.querySelector('span[data-type="text"]');
            console.log('[ToolbarHijacker] 找到的span元素:', addedSpan, '内容:', addedSpan?.textContent);

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
            const markdownContent = await this.extractMarkdownFromBlock(blockElement);
            
            console.log('[ToolbarHijacker] 提取的markdown内容:', markdownContent);

            // 使用 updateBlock API 保存 - 保存markdown内容
            const updateResult = await this.api.updateBlock(blockId, markdownContent, "markdown");

            console.log('[ToolbarHijacker] API保存结果:', updateResult);

            if (updateResult.code === 0) {
                console.log(`✅ 已应用${colorConfig.name}高亮`);
                // 恢复只读状态
                setTimeout(() => this.restoreReadOnlyState(blockId), 100);
            } else {
                console.error("❌ 高亮失败:", updateResult.msg);
                this.restoreOriginalHTML(blockId, oldContent);
            }

            this.hideToolbar(toolbar);
            this.clearSelection();

        } catch (error) {
            console.error("高亮功能出错:", error);
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
            const newContent = await this.extractMarkdownFromBlock(blockElement);
            const updateResult = await this.api.updateBlock(blockId, newContent, "markdown");

            if (updateResult.code === 0) {
                console.log('✅ 已移除高亮');
                // 恢复只读状态
                setTimeout(() => this.restoreReadOnlyState(blockId), 100);
            } else {
                console.error('❌ 移除失败');
                this.restoreOriginalHTML(blockId, oldContent);
            }

            this.hideToolbar(toolbar);
            this.clearSelection();

        } catch (error) {
            console.error('❌ 移除高亮出错:', error);
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
     * 从块元素提取markdown内容，并合并高亮修改
     */
    private async extractMarkdownFromBlock(blockElement: HTMLElement): Promise<string> {
        try {
            // 首先尝试通过 API 获取原始 Markdown 内容
            const blockId = blockElement.getAttribute("data-node-id");
            console.log('[ToolbarHijacker] 尝试获取 blockId:', blockId);
            
            if (blockId) {
                try {
                    console.log('[ToolbarHijacker] 开始调用 getBlockKramdown API...');
                    const response = await this.api.getBlockKramdown(blockId);
                    console.log('[ToolbarHijacker] API 响应:', response);
                    
                    if (response && response.code === 0 && response.data && response.data.kramdown) {
                        const originalMarkdown = response.data.kramdown;
                        console.log('[ToolbarHijacker] 成功获取原始 Markdown 内容:', originalMarkdown);
                        
                        // 尝试从修改后的 DOM 生成包含高亮的 Markdown
                        const modifiedMarkdown = this.mergeHighlightIntoMarkdown(originalMarkdown, blockElement);
                        console.log('[ToolbarHijacker] 合并后的 Markdown 内容:', modifiedMarkdown);
                        
                        return modifiedMarkdown;
                    } else {
                        console.warn('[ToolbarHijacker] API 响应格式不正确，完整响应:', response);
                    }
                } catch (apiError) {
                    console.warn('[ToolbarHijacker] API 获取 Markdown 失败，回退到 HTML 解析:', apiError);
                }
            } else {
                console.warn('[ToolbarHijacker] 未找到 blockId，使用 HTML 解析');
            }

            // 回退方案：从 HTML 内容提取
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
     * 将高亮修改合并到原始 Markdown 中
     */
    private mergeHighlightIntoMarkdown(originalMarkdown: string, blockElement: HTMLElement): string {
        try {
            // 从 DOM 中提取纯文本内容和高亮信息
            let contentDiv = blockElement.querySelector('div[contenteditable]');
            
            // 如果没找到，尝试其他可能的选择器
            if (!contentDiv) {
                contentDiv = blockElement.querySelector('div[contenteditable="true"]');
            }
            if (!contentDiv) {
                contentDiv = blockElement.querySelector('div[contenteditable="false"]');
            }
            if (!contentDiv) {
                // 直接使用 blockElement 的第一个 div
                contentDiv = blockElement.querySelector('div');
            }
            
            if (!contentDiv) {
                console.warn('[ToolbarHijacker] 未找到可编辑的内容区域，使用整个块元素');
                contentDiv = blockElement;
            }

            // 提取修改后的内容，保留高亮标记
            const modifiedHtml = contentDiv.innerHTML;
            console.log('[ToolbarHijacker] 修改后的 HTML:', modifiedHtml);
            console.log('[ToolbarHijacker] 内容区域标签:', contentDiv.tagName, 'contenteditable:', contentDiv.getAttribute('contenteditable'));

            // 将高亮 span 转换为 Markdown 高亮语法
            const processedHtml = this.convertHighlightSpansToMarkdown(modifiedHtml);
            console.log('[ToolbarHijacker] 处理后的HTML:', processedHtml);
            
            // 提取原始 Markdown 的格式前缀（如 ###）
            const lines = originalMarkdown.split('\n');
            const contentLine = lines.find(line => !line.startsWith('{:') && line.trim());
            
            if (contentLine) {
                // 提取格式前缀（如 ###, -, * 等）
                const formatMatch = contentLine.match(/^(\s*#{1,6}\s*|\s*[-*+]\s*|\s*\d+\.\s*)/);
                const formatPrefix = formatMatch ? formatMatch[1] : '';
                
                // 从处理后的HTML中提取纯文本内容（但保留HTML标签）
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = processedHtml;
                const finalContent = tempDiv.innerHTML;
                
                // 构建新的内容行
                const newContentLine = formatPrefix + finalContent;
                console.log('[ToolbarHijacker] 最终内容行:', newContentLine);
                
                // 替换原内容行，保留其他行（如属性行）
                const newLines = lines.map(line => {
                    if (line === contentLine) {
                        return newContentLine;
                    }
                    return line;
                });
                
                return newLines.join('\n');
            }
            
            return processedHtml;
            
        } catch (error) {
            console.error('[ToolbarHijacker] 合并高亮到 Markdown 失败:', error);
            return originalMarkdown;
        }
    }
    
    /**
     * 将高亮 span 转换为 Markdown 语法
     */
    private convertHighlightSpansToMarkdown(html: string): string {
        try {
            // 创建临时容器
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // 处理所有类型的 span 元素
            const allSpans = tempDiv.querySelectorAll('span');
            allSpans.forEach(span => {
                const dataType = span.getAttribute('data-type');
                const text = span.textContent || '';
                let markdownText = text;
                let shouldReplace = false;
                
                if (dataType === 'text') {
                    // 我们添加的高亮span
                    const bgColor = span.style.backgroundColor;
                    console.log('[ToolbarHijacker] 处理高亮span:', text, 'bgColor:', bgColor);
                    
                    if (bgColor && bgColor !== 'transparent') {
                        // 保留颜色信息，使用SiYuan的颜色高亮语法
                        markdownText = `<span data-type="text" style="background-color: ${bgColor};">${text}</span>`;
                        shouldReplace = true;
                    }
                } else if (dataType === 'mark') {
                    // 原有的mark类型，保持为高亮语法
                    markdownText = `==${text}==`;
                    shouldReplace = true;
                } else if (dataType === 'inline-memo') {
                    // 备注类型，保留原样
                    console.log('[ToolbarHijacker] 处理备注span:', text, '备注内容:', span.getAttribute('data-inline-memo-content'));
                    markdownText = span.outerHTML;
                    shouldReplace = false; // 保留原HTML
                } else if (span.style.backgroundColor && span.style.backgroundColor !== 'transparent') {
                    // 其他有背景颜色的span，保留原样
                    markdownText = span.outerHTML;
                    shouldReplace = false; // 保留原HTML
                }
                
                // 只有在需要替换时才替换
                if (shouldReplace && markdownText !== span.outerHTML) {
                    if (markdownText.startsWith('<span')) {
                        // 如果是HTML，创建新的span
                        const newSpan = document.createElement('div');
                        newSpan.innerHTML = markdownText;
                        span.parentNode?.replaceChild(newSpan.firstChild || document.createTextNode(text), span);
                    } else {
                        // 如果是纯文本，创建文本节点
                        const textNode = document.createTextNode(markdownText);
                        span.parentNode?.replaceChild(textNode, span);
                    }
                }
                // 如果 shouldReplace 为 false，则保留原 span 不变
            });
            
            // 返回处理后的HTML内容（保留span标签）
            return tempDiv.innerHTML;
            
        } catch (error) {
            console.error('[ToolbarHijacker] 转换高亮 span 失败:', error);
            return html;
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
     * 设置自动隐藏机制
     */
    private setupAutoHide(toolbar: any): void {
        try {
            // 先清理之前的监听器
            this.cleanupEventListeners();
            
            // 监听文档点击事件，点击工具栏外部时隐藏
            const hideOnClickOutside = (e: Event) => {
                const target = e.target as HTMLElement;
                const toolbarElement = toolbar.subElement;
                
                // 如果点击的不是工具栏或其子元素，则隐藏工具栏
                if (toolbarElement && !toolbarElement.contains(target)) {
                    this.hideToolbar(toolbar);
                    this.cleanupEventListeners();
                }
            };
            
            // 创建清理函数
            const cleanup = () => {
                document.removeEventListener('click', hideOnClickOutside, true);
                document.removeEventListener('touchstart', hideOnClickOutside, true);
            };
            
            // 存储清理函数
            this.activeEventListeners.push(cleanup);
            
            // 延迟添加监听器，避免立即触发
            setTimeout(() => {
                document.addEventListener('click', hideOnClickOutside, true);
                document.addEventListener('touchstart', hideOnClickOutside, true);
            }, 100);
            
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 清理事件监听器
     */
    private cleanupEventListeners(): void {
        try {
            this.activeEventListeners.forEach(cleanup => cleanup());
            this.activeEventListeners = [];
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
     * 重置工具栏可见性
     */
    private resetToolbarVisibility(toolbar: any): void {
        try {
            if (toolbar.subElement) {
                toolbar.subElement.style.display = '';
            }
            if (toolbar.element) {
                toolbar.element.style.display = '';
            }
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 清理之前添加的按钮
     */
    private cleanupPreviousButtons(container: HTMLElement): void {
        try {
            // 移除之前添加的高亮按钮
            const highlightBtns = container.querySelectorAll('.highlight-btn, .remove-btn, .comment-btn');
            highlightBtns.forEach(btn => btn.remove());
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
                toolbar.subElement.style.display = 'none';
            }
            // 也尝试隐藏toolbar.element
            if (toolbar.element) {
                toolbar.element.style.display = 'none';
            }
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 清除选择
     */
    private clearSelection(): void {
        try {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
            }
        } catch (error) {
            // 静默处理错误
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
     * 拦截原生备注弹窗
     */
    private interceptNativeMemo(): void {
        console.log('开始拦截原生备注弹窗...');
        
        // 拦截点击 inline-memo 元素的事件
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            // 检查是否点击了备注元素
            if (target && target.getAttribute('data-type') === 'inline-memo') {
                console.log('检测到备注元素点击，拦截原生弹窗');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // 使用自定义备注输入框
                this.showCustomMemoDialog(target);
                
                return false;
            }
        }, true); // 使用捕获阶段拦截
        
        // 延迟拦截思源内部方法
        setTimeout(() => {
            this.interceptSiYuanMemoMethods();
        }, 2000);
    }

    /**
     * 拦截思源的备注相关方法
     */
    private interceptSiYuanMemoMethods(): void {
        try {
            // 拦截可能的思源备注相关全局方法
            const originalAlert = window.alert;
            const originalPrompt = window.prompt;
            const originalConfirm = window.confirm;
            
            // 检测是否为备注相关的弹窗
            window.prompt = (message?: string, defaultText?: string) => {
                if (message && (message.includes('备注') || message.includes('memo') || message.includes('想法'))) {
                    console.log('拦截了疑似备注的 prompt 弹窗');
                    return null; // 取消原生弹窗
                }
                return originalPrompt.call(window, message, defaultText);
            };
            
            console.log('已设置备注方法拦截');
        } catch (error) {
            console.log('备注方法拦截设置完成');
        }
    }

    /**
     * 显示自定义备注对话框
     */
    private async showCustomMemoDialog(memoElement?: HTMLElement): Promise<void> {
        const existingContent = memoElement?.getAttribute('data-inline-memo-content') || '';
        const selectedText = memoElement?.textContent || '';
        
        const memoText = await this.showEnhancedMemoInput(selectedText, existingContent);
        
        if (memoText !== null && memoElement) {
            if (memoText === '__DELETE_MEMO__') {
                // 删除备注操作
                console.log('删除备注');
                this.deleteMemoFromElement(memoElement);
            } else {
                // 更新备注内容
                memoElement.setAttribute('data-inline-memo-content', memoText);
                console.log('备注已更新:', memoText);
                
                // 触发保存到思源
                this.saveMemoToSiYuan(memoElement, memoText);
            }
        }
    }

    /**
     * 删除备注元素
     */
    private async deleteMemoFromElement(memoElement: HTMLElement): Promise<void> {
        try {
            // 找到包含备注的块
            const blockElement = this.findBlockElement(memoElement);
            if (!blockElement) {
                console.warn('未找到块元素');
                return;
            }

            const blockId = blockElement.getAttribute("data-node-id");
            if (!blockId) {
                console.warn('未找到块ID');
                return;
            }

            // 保存原始内容用于回滚
            const oldContent = blockElement.innerHTML;

            // 将备注元素替换为纯文本
            const textContent = memoElement.textContent || '';
            const textNode = document.createTextNode(textContent);
            memoElement.parentNode?.replaceChild(textNode, memoElement);

            // 提取并保存内容
            const newContent = await this.extractMarkdownFromBlock(blockElement);
            const updateResult = await this.api.updateBlock(blockId, newContent, "markdown");

            if (updateResult.code === 0) {
                console.log('✅ 备注删除成功');
                // 恢复只读状态
                setTimeout(() => this.restoreReadOnlyState(blockId), 100);
            } else {
                console.error('❌ 备注删除失败');
                // 恢复原始内容
                blockElement.innerHTML = oldContent;
            }
        } catch (error) {
            console.error('删除备注出错:', error);
        }
    }

    /**
     * 保存备注到思源
     */
    private async saveMemoToSiYuan(memoElement: HTMLElement, memoText: string): Promise<void> {
        try {
            // 找到包含备注的块
            const blockElement = this.findBlockElement(memoElement);
            if (!blockElement) {
                console.warn('未找到块元素');
                return;
            }

            const blockId = blockElement.getAttribute("data-node-id");
            if (!blockId) {
                console.warn('未找到块ID');
                return;
            }

            // 提取并保存内容
            const newContent = await this.extractMarkdownFromBlock(blockElement);
            const updateResult = await this.api.updateBlock(blockId, newContent, "markdown");

            if (updateResult.code === 0) {
                console.log('✅ 备注保存成功');
                // 恢复只读状态
                setTimeout(() => this.restoreReadOnlyState(blockId), 100);
            } else {
                console.error('❌ 备注保存失败');
            }
        } catch (error) {
            console.error('保存备注出错:', error);
        }
    }

    /**
     * 显示增强的备注输入框（手机版友好的 Bottom Sheet）
     */
    private showEnhancedMemoInput(selectedText: string = '', existingContent: string = ''): Promise<string | null> {
        return new Promise((resolve) => {
            // 创建底部弹出层（Bottom Sheet 风格）
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            `;

            // 创建底部弹出容器
            const bottomSheet = document.createElement('div');
            bottomSheet.style.cssText = `
                background: var(--b3-theme-background, white);
                border-radius: 16px 16px 0 0;
                width: 100%;
                max-width: 600px;
                max-height: 70vh;
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
                transform: translateY(100%);
                animation: slideUp 0.3s ease forwards;
                display: flex;
                flex-direction: column;
            `;

            // 添加动画样式
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { transform: translateY(0); }
                    to { transform: translateY(100%); }
                }
            `;
            document.head.appendChild(style);

            // 顶部拖拽指示器
            const dragIndicator = document.createElement('div');
            dragIndicator.style.cssText = `
                width: 40px;
                height: 4px;
                background: var(--b3-theme-border, #ddd);
                border-radius: 2px;
                margin: 12px auto 8px;
                opacity: 0.6;
            `;

            // 标题栏
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 0 20px 16px;
                border-bottom: 1px solid var(--b3-theme-border, #eee);
                flex-shrink: 0;
            `;

            // 移除标题，让界面更简洁

            // 引用文本（如果有选中文本）- 移除标签，只显示文本
            if (selectedText) {
                const quoteDiv = document.createElement('div');
                quoteDiv.style.cssText = `
                    padding: 16px;
                    background: var(--b3-theme-surface, #f8f9fa);
                    border-radius: 8px;
                    border-left: 3px solid var(--b3-theme-primary, #007bff);
                    margin-bottom: 8px;
                `;
                
                const quoteText = document.createElement('div');
                quoteText.textContent = selectedText;
                quoteText.style.cssText = `
                    font-size: 14px;
                    color: var(--b3-theme-on-surface, #333);
                    line-height: 1.4;
                    font-style: italic;
                `;
                
                quoteDiv.appendChild(quoteText);
                header.appendChild(quoteDiv);
            }

            // 内容区域
            const content = document.createElement('div');
            content.style.cssText = `
                padding: 20px;
                flex: 1;
                overflow-y: auto;
                max-height: 40vh;
            `;

            // 输入框
            const textarea = document.createElement('textarea');
            textarea.value = existingContent;
            textarea.placeholder = '写下你的想法...';
            textarea.style.cssText = `
                width: 100%;
                min-height: 120px;
                border: 1px solid var(--b3-theme-border, #ddd);
                border-radius: 12px;
                padding: 16px;
                font-size: 16px;
                line-height: 1.5;
                resize: none;
                box-sizing: border-box;
                font-family: inherit;
                background: var(--b3-theme-surface, white);
                color: var(--b3-theme-on-surface, #333);
                outline: none;
                transition: border-color 0.2s ease;
            `;

            // 底部按钮区域
            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: 16px 20px;
                border-top: 1px solid var(--b3-theme-border, #eee);
                display: flex;
                gap: 12px;
                flex-shrink: 0;
            `;

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                flex: 1;
                padding: 14px;
                border: 1px solid var(--b3-theme-border, #ddd);
                border-radius: 12px;
                background: var(--b3-theme-surface, white);
                color: var(--b3-theme-on-surface, #666);
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
            `;

            // 删除按钮（仅在有现有内容时显示）
            let deleteBtn = null;
            if (existingContent) {
                deleteBtn = document.createElement('button');
                deleteBtn.textContent = '删除';
                deleteBtn.style.cssText = `
                    flex: 1;
                    padding: 14px;
                    border: none;
                    border-radius: 12px;
                    background: #dc3545;
                    color: white;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                    transition: background-color 0.2s ease;
                `;
                
                // 删除按钮悬停效果
                deleteBtn.onmouseenter = () => {
                    deleteBtn.style.backgroundColor = '#c82333';
                };
                deleteBtn.onmouseleave = () => {
                    deleteBtn.style.backgroundColor = '#dc3545';
                };
            }

            // 确认按钮
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = existingContent ? '更新' : '添加';
            confirmBtn.style.cssText = `
                flex: ${existingContent ? '1' : '2'};
                padding: 14px;
                border: none;
                border-radius: 12px;
                background: var(--b3-theme-primary, #007bff);
                color: white;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
            `;

            // 事件处理
            const cleanup = () => {
                document.head.removeChild(style);
                bottomSheet.style.animation = 'slideDown 0.3s ease forwards';
                overlay.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => {
                    if (document.body.contains(overlay)) {
                        document.body.removeChild(overlay);
                    }
                }, 300);
            };

            cancelBtn.onclick = () => {
                cleanup();
                resolve(null);
            };

            // 删除按钮事件
            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    // 显示删除确认
                    if (confirm('确定要删除这个备注吗？')) {
                        cleanup();
                        resolve('__DELETE_MEMO__'); // 特殊标识表示删除操作
                    }
                };
            }

            confirmBtn.onclick = () => {
                const value = textarea.value.trim();
                cleanup();
                resolve(value);
            };

            // ESC键取消
            const handleKeydown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(null);
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);

            // 点击遮罩层取消
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(null);
                }
            };

            // 组装UI
            content.appendChild(textarea);
            footer.appendChild(cancelBtn);
            if (deleteBtn) {
                footer.appendChild(deleteBtn);
            }
            footer.appendChild(confirmBtn);
            
            bottomSheet.appendChild(dragIndicator);
            // 只有在有引用文本时才添加header
            if (selectedText) {
                bottomSheet.appendChild(header);
            }
            bottomSheet.appendChild(content);
            bottomSheet.appendChild(footer);
            
            overlay.appendChild(bottomSheet);
            
            // 添加到页面并聚焦
            document.body.appendChild(overlay);
            
            // 延迟聚焦，等待动画完成
            setTimeout(() => {
                textarea.focus();
                if (existingContent) {
                    textarea.select();
                }
            }, 300);
        });
    }

    /**
     * 检测是否为跨块选择
     */
    private isCrossBlockSelection(range: Range): boolean {
        try {
            const startContainer = range.startContainer;
            const endContainer = range.endContainer;
            
            // 如果开始和结束容器相同，肯定不跨块
            if (startContainer === endContainer) {
                return false;
            }
            
            // 查找开始位置所在的块
            const startBlock = this.findBlockElement(startContainer);
            const endBlock = this.findBlockElement(endContainer);
            
            // 如果找不到块元素，认为是跨块
            if (!startBlock || !endBlock) {
                console.log('[ToolbarHijacker] 无法找到块元素，可能跨块选择');
                return true;
            }
            
            // 获取块ID进行比较
            const startBlockId = startBlock.getAttribute('data-node-id');
            const endBlockId = endBlock.getAttribute('data-node-id');
            
            // 如果块ID不同，则为跨块选择
            if (startBlockId !== endBlockId) {
                console.log('[ToolbarHijacker] 跨块选择检测:', {
                    startBlockId,
                    endBlockId,
                    selectedText: range.toString().substring(0, 50) + '...'
                });
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('[ToolbarHijacker] 跨块检测失败:', error);
            // 出错时为安全起见，认为是跨块选择
            return true;
        }
    }

    /**
     * 恢复块的只读状态（阅读模式）
     */
    private restoreReadOnlyState(blockId: string): void {
        try {
            const blockElement = document.querySelector(`[data-node-id="${blockId}"]`);
            if (!blockElement) {
                console.warn('未找到要恢复只读状态的块元素');
                return;
            }

            console.log('[ToolbarHijacker] 恢复块的只读状态:', blockId);

            // 查找所有可编辑的div元素
            const editableDivs = blockElement.querySelectorAll('div[contenteditable="true"]');
            editableDivs.forEach(div => {
                console.log('[ToolbarHijacker] 将div设置为只读:', div);
                div.setAttribute('contenteditable', 'false');
            });

            // 确保块本身也是只读的（如果它有contenteditable属性）
            if (blockElement.hasAttribute('contenteditable')) {
                blockElement.setAttribute('contenteditable', 'false');
            }

            // 移除可能的编辑相关class
            blockElement.classList.remove('protyle-wysiwyg__block--editing');
            
            // 确保块处于只读模式
            const contentDiv = blockElement.querySelector('div[contenteditable]');
            if (contentDiv) {
                contentDiv.setAttribute('contenteditable', 'false');
                console.log('[ToolbarHijacker] 内容区域已设置为只读');
            }

        } catch (error) {
            console.error('[ToolbarHijacker] 恢复只读状态失败:', error);
        }
    }

    
    /**
     * 设置鼠标选择监听器（备用方案）
     */
    private setupMouseSelectionListener(): void {
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
    private showCustomToolbar(selection: Selection): void {
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
            
            toolbar.style.cssText = `
                position: fixed;
                top: ${top}px;
                left: ${left}px;
                transform: translateX(-50%);
                background: var(--b3-theme-background, white);
                border: 1px solid var(--b3-theme-border, #ddd);
                border-radius: 8px;
                padding: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 999999;
                display: flex;
                gap: 6px;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
            `;
            
            // 添加颜色按钮
            const colors = [
                { name: 'yellow', bg: '#fff3cd', displayName: '黄色' },
                { name: 'green', bg: '#d4edda', displayName: '绿色' },
                { name: 'blue', bg: '#cce5ff', displayName: '蓝色' },
                { name: 'pink', bg: '#fce4ec', displayName: '粉色' }
            ];
            
            colors.forEach(color => {
                const btn = document.createElement('button');
                btn.style.cssText = `
                    width: 28px;
                    height: 28px;
                    border: none;
                    border-radius: 6px;
                    background: ${color.bg};
                    cursor: pointer;
                    transition: all 0.2s ease;
                `;
                btn.title = color.displayName;
                
                btn.addEventListener('click', () => {
                    this.applyCustomHighlight(range, color);
                    this.hideCustomToolbar();
                });
                
                toolbar.appendChild(btn);
            });
            
            // 添加删除按钮
            const removeBtn = document.createElement('button');
            removeBtn.style.cssText = `
                width: 28px;
                height: 28px;
                border: 1px solid #ddd;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 12px;
            `;
            removeBtn.textContent = '×';
            removeBtn.title = '删除高亮';
            
            removeBtn.addEventListener('click', () => {
                this.removeCustomHighlight(range);
                this.hideCustomToolbar();
            });
            
            toolbar.appendChild(removeBtn);
            
            // 添加到页面
            document.body.appendChild(toolbar);
            
            // 存储工具栏引用
            (this as any).customToolbar = toolbar;
            
            // 添加点击外部隐藏
            const hideOnClickOutside = (e: Event) => {
                if (!toolbar.contains(e.target as Node)) {
                    this.hideCustomToolbar();
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', hideOnClickOutside);
                (this as any).hideOnClickOutside = hideOnClickOutside;
            }, 100);
            
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 隐藏自定义工具栏
     */
    private hideCustomToolbar(): void {
        const toolbar = (this as any).customToolbar;
        if (toolbar && toolbar.parentNode) {
            toolbar.parentNode.removeChild(toolbar);
            (this as any).customToolbar = null;
        }
        
        const hideOnClickOutside = (this as any).hideOnClickOutside;
        if (hideOnClickOutside) {
            document.removeEventListener('click', hideOnClickOutside);
            (this as any).hideOnClickOutside = null;
        }
    }
    
    /**
     * 应用自定义高亮
     */
    private async applyCustomHighlight(range: Range, color: {name: string, bg: string}): Promise<void> {
        try {
            const selectedText = range.toString();
            if (!selectedText) return;
            
            // 找到块元素
            const blockElement = this.findBlockElement(range.startContainer);
            if (!blockElement) {
                return;
            }
            
            const blockId = blockElement.getAttribute("data-node-id");
            if (!blockId) {
                return;
            }
            
            // 创建高亮span
            const highlightSpan = document.createElement("span");
            highlightSpan.setAttribute("data-type", "text");
            highlightSpan.style.backgroundColor = color.bg;
            highlightSpan.textContent = selectedText;
            
            // 替换选中内容
            range.deleteContents();
            range.insertNode(highlightSpan);
            
            // 保存到思源
            const newContent = await this.extractMarkdownFromBlock(blockElement);
            const updateResult = await this.api.updateBlock(blockId, newContent, "markdown");
            
            if (updateResult.code === 0) {
                console.log(`✅ 已应用${color.name}高亮`);
            }
            
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 删除自定义高亮
     */
    private async removeCustomHighlight(range: Range): Promise<void> {
        try {
            const selectedText = range.toString();
            if (!selectedText) return;
            
            // 找到块元素
            const blockElement = this.findBlockElement(range.startContainer);
            if (!blockElement) {
                return;
            }
            
            const blockId = blockElement.getAttribute("data-node-id");
            if (!blockId) {
                return;
            }
            
            // 查找并移除高亮span
            const spans = blockElement.querySelectorAll('span[data-type="text"]');
            spans.forEach(span => {
                if (span.textContent === selectedText) {
                    const textNode = document.createTextNode(span.textContent || '');
                    span.parentNode?.replaceChild(textNode, span);
                }
            });
            
            // 保存到思源
            const newContent = await this.extractMarkdownFromBlock(blockElement);
            const updateResult = await this.api.updateBlock(blockId, newContent, "markdown");
            
            if (updateResult.code === 0) {
                console.log('✅ 已删除高亮');
            }
            
        } catch (error) {
            // 静默处理错误
        }
    }
    
    /**
     * 获取劫持状态
     */
    public get hijacked(): boolean {
        return this.isHijacked;
    }
    
}
