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
                
                console.log('[ToolbarHijacker] 🚀 updateBlock API请求参数:', {
                    url: '/api/block/updateBlock',
                    blockId,
                    dataType,
                    dataLength: data.length,
                    dataPreview: data.substring(0, 200) + '...',
                    完整data内容: data
                });
                
                const response = await fetch('/api/block/updateBlock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                console.log('[ToolbarHijacker] 📥 updateBlock API响应:', result);
                return result;
            },
            showMessage: showMessage
        };
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
                                
                                // 添加按钮后重新调整工具栏位置，确保完整显示
                                hijacker.adjustToolbarPosition(this, range);
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
        const colors: Array<{name: HighlightColor, icon: string, bg: string, displayName: string}> = [
            { name: 'yellow', icon: '🟡', bg: '#fff3cd', displayName: '黄色高亮' },
            { name: 'green', icon: '🟢', bg: '#d4edda', displayName: '绿色高亮' },
            { name: 'blue', icon: '🔵', bg: '#cce5ff', displayName: '蓝色高亮' },
            { name: 'pink', icon: '🩷', bg: '#fce4ec', displayName: '粉色高亮' }
        ];
        
        // 为每种颜色创建按钮
        colors.forEach(color => {
            const btn = this.createHighlightButton(color, range, nodeElement, protyle, toolbar);
            container.insertBefore(btn, insertPoint);
        });
        
        console.log('[ToolbarHijacker] 高亮按钮添加完成');
    }
    
    /**
     * 创建高亮按钮
     */
    private createHighlightButton(
        colorConfig: {name: HighlightColor, icon: string, bg: string, displayName: string}, 
        range: Range, 
        nodeElement: Element, 
        protyle: any, 
        toolbar: any
    ): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'keyboard__action highlight-btn';
        btn.setAttribute('data-color', colorConfig.name);
        
        // 设置按钮内容
        btn.innerHTML = `
            <span style="font-size: 16px; line-height: 1;">${colorConfig.icon}</span>
        `;
        
        // 设置按钮样式
        btn.style.cssText = `
            background: ${colorConfig.bg} !important;
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
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            console.log(`[ToolbarHijacker] 高亮按钮被点击: ${colorConfig.name}`);
            
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

            console.log('[ToolbarHijacker] 开始应用高亮:', {
                color: colorConfig.name,
                text: selectedText.substring(0, 20),
                blockId,
                blockElement: blockElement.tagName
            });

            // 保存原始内容用于对比 - 关键：使用innerHTML而不是outerHTML
            const oldContent = blockElement.innerHTML;
            
            console.log('[ToolbarHijacker] 当前块元素详情:', {
                tagName: blockElement.tagName,
                className: blockElement.className,
                blockId,
                dataType: blockElement.getAttribute('data-type'),
                updated: blockElement.getAttribute('updated'),
                oldContent: oldContent
            });

            // 创建简单的高亮span元素
            const highlightSpan = document.createElement("span");
            highlightSpan.setAttribute("data-type", "text");
            highlightSpan.style.backgroundColor = colorConfig.color;
            highlightSpan.textContent = selectedText;
            
            // DOM操作 - 替换选中内容
            range.deleteContents();
            range.insertNode(highlightSpan);
            
            console.log('[ToolbarHijacker] 高亮元素已创建:', {
                dataType: highlightSpan.getAttribute("data-type"),
                backgroundColor: highlightSpan.style.backgroundColor,
                text: selectedText.substring(0, 20)
            });

            // 更新时间戳
            const timestamp = new Date().getTime().toString().substring(0, 10);
            blockElement.setAttribute("updated", timestamp);

            // 关键修正：保存块的innerHTML内容，不是outerHTML
            const newContent = blockElement.innerHTML;

            // 检查是否真的有变化
            if (newContent === oldContent) {
                console.warn("DOM内容没有变化");
                this.api.showMessage("高亮应用失败：内容未更改", 3000, "error");
                return;
            }

            console.log('[ToolbarHijacker] DOM更新完成，准备保存到数据库:', {
                blockId,
                oldLength: oldContent.length,
                newLength: newContent.length,
                oldContent: oldContent,
                newContent: newContent
            });

            // 使用 updateBlock API 保存 - 保存innerHTML内容
            const updateResult = await this.api.updateBlock(blockId, newContent, "dom");

            if (updateResult.code === 0) {
                this.api.showMessage(`已应用${colorConfig.name}`);
                console.log("✅ 高亮保存成功 - updateBlock API");
            } else {
                console.error("❌ 更新块失败:", updateResult);
                this.api.showMessage(`高亮失败: ${updateResult.msg || '未知错误'}`, 3000, "error");
                // 保存失败时恢复原状
                this.restoreOriginalHTML(blockId, oldContent);
            }

            this.hideToolbarAndClearSelection(protyle);

        } catch (error) {
            console.error("应用高亮时出错:", error);
            this.api.showMessage("高亮功能出错", 3000, "error");
            // 发生错误时恢复原状
            const blockElement = this.findBlockElement(range.startContainer);
            if (blockElement) {
                const blockId = blockElement.getAttribute("data-node-id");
                if (blockId) {
                    this.restoreOriginalHTML(blockId, blockElement.innerHTML);
                }
            }
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
                    
                    console.log('[ToolbarHijacker] 找到真正的块元素:', {
                        tagName,
                        className,
                        id: element.getAttribute("data-node-id")
                    });
                    return element;
                }
            }
            current = current.parentNode!;
        }
        
        return null;
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
                    console.log('[ToolbarHijacker] 已恢复原始HTML');
                }
            }
        } catch (error) {
            console.error('[ToolbarHijacker] 恢复原始HTML失败:', error);
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
            
            console.log('[ToolbarHijacker] 工具栏已隐藏，选择已清除');
            
        } catch (error) {
            console.error('[ToolbarHijacker] 隐藏工具栏失败:', error);
        }
    }
    
    /**
     * 获取CSS变量名（思源标准格式）
     */
    private getColorCSSVariable(colorName: string): string {
        const cssVariables = {
            '黄色高亮': 'var(--b3-card-warning-background)',
            '绿色高亮': 'var(--b3-card-success-background)', 
            '蓝色高亮': 'var(--b3-card-info-background)',
            '粉色高亮': 'var(--b3-card-error-background)'
        };
        
        return cssVariables[colorName] || 'var(--b3-card-warning-background)';
    }
    
    /**
     * 获取颜色值（用于按钮显示）
     */
    private getColorValue(color: HighlightColor): string {
        const colorValues = {
            yellow: '#fff3cd',
            green: '#d4edda',
            blue: '#cce5ff',
            pink: '#fce4ec',
            red: '#f8d7da',
            purple: '#e2d9f7'
        };
        
        return colorValues[color] || colorValues.yellow;
    }
    
    /**
     * 获取正确的session ID
     */
    private getSessionId(): string {
        // 尝试多种方式获取session ID
        try {
            // 方式1：从window.siyuan获取
            if ((window as any).siyuan && (window as any).siyuan.config && (window as any).siyuan.config.system) {
                const systemId = (window as any).siyuan.config.system.id;
                if (systemId) {
                    console.log('[ToolbarHijacker] 使用系统ID作为session:', systemId);
                    return systemId;
                }
            }
            
            // 方式2：从Constants获取
            if (Constants.SIYUAN_APPID) {
                console.log('[ToolbarHijacker] 使用Constants.SIYUAN_APPID:', Constants.SIYUAN_APPID);
                return Constants.SIYUAN_APPID;
            }
            
            // 方式3：尝试从DOM获取
            const appElement = document.querySelector('[data-app-id]');
            if (appElement) {
                const appId = appElement.getAttribute('data-app-id');
                if (appId) {
                    console.log('[ToolbarHijacker] 从DOM获取app-id:', appId);
                    return appId;
                }
            }
            
            // 方式4：默认值
            console.warn('[ToolbarHijacker] 使用默认session ID');
            return 'highlight-assistant-plugin';
            
        } catch (error) {
            console.error('[ToolbarHijacker] 获取session ID失败:', error);
            return 'highlight-assistant-plugin';
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
     * 调整工具栏位置，确保完整显示
     */
    private adjustToolbarPosition(toolbar: any, range: Range): void {
        try {
            const subElement = toolbar.subElement;
            if (!subElement) return;
            
            // 获取工具栏当前位置和尺寸
            const toolbarRect = subElement.getBoundingClientRect();
            const selectionRect = range.getBoundingClientRect();
            
            console.log('[ToolbarHijacker] 调整前工具栏位置:', {
                toolbarRect: {
                    left: toolbarRect.left,
                    right: toolbarRect.right,
                    top: toolbarRect.top,
                    width: toolbarRect.width,
                    height: toolbarRect.height
                },
                selectionRect: {
                    left: selectionRect.left,
                    right: selectionRect.right,
                    top: selectionRect.top,
                    width: selectionRect.width
                },
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            });
            
            let needsReposition = false;
            let newLeft = parseFloat(subElement.style.left) || toolbarRect.left;
            let newTop = parseFloat(subElement.style.top) || toolbarRect.top;
            
            // 检查右边界 - 如果工具栏超出屏幕右边
            if (toolbarRect.right > window.innerWidth - 10) {
                newLeft = window.innerWidth - toolbarRect.width - 10;
                needsReposition = true;
                console.log('[ToolbarHijacker] 工具栏超出右边界，调整left:', newLeft);
            }
            
            // 检查左边界 - 如果工具栏超出屏幕左边
            if (toolbarRect.left < 10) {
                newLeft = 10;
                needsReposition = true;
                console.log('[ToolbarHijacker] 工具栏超出左边界，调整left:', newLeft);
            }
            
            // 检查下边界 - 如果工具栏超出屏幕底部
            if (toolbarRect.bottom > window.innerHeight - 10) {
                newTop = selectionRect.top - toolbarRect.height - 10;
                needsReposition = true;
                console.log('[ToolbarHijacker] 工具栏超出底部，移到选择区域上方，调整top:', newTop);
            }
            
            // 检查上边界 - 如果移到上方后还是超出
            if (newTop < 10) {
                newTop = 10;
                needsReposition = true;
                console.log('[ToolbarHijacker] 工具栏超出顶部，调整top:', newTop);
            }
            
            // 应用新位置
            if (needsReposition) {
                subElement.style.left = newLeft + 'px';
                subElement.style.top = newTop + 'px';
                subElement.style.position = 'fixed';
                
                console.log('[ToolbarHijacker] 工具栏位置已调整:', {
                    left: newLeft,
                    top: newTop,
                    reason: '确保完整显示'
                });
            } else {
                console.log('[ToolbarHijacker] 工具栏位置无需调整');
            }
            
        } catch (error) {
            console.error('[ToolbarHijacker] 调整工具栏位置失败:', error);
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
    
    /**
     * 创建全局查询函数
     */
    public createGlobalQueryFunction(): void {
        // 添加全局查询函数供调试使用
        (window as any).queryBlockInfo = async (blockId: string) => {
            console.log('🔍 开始查询块信息:', blockId);
            
            try {
                // 1. 查询数据库中的块信息
                const response = await fetch('/api/query/sql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        stmt: `SELECT id, content, markdown, updated FROM blocks WHERE id = '${blockId}' LIMIT 1`
                    })
                });
                
                const result = await response.json();
                console.log('💾 数据库查询结果:', result);
                
                if (result.data && result.data.length > 0) {
                    const block = result.data[0];
                    console.log('📊 块详细信息:', {
                        id: block.id,
                        content长度: block.content?.length || 0,
                        markdown长度: block.markdown?.length || 0,
                        updated: block.updated,
                        content内容: block.content,
                        markdown内容: block.markdown
                    });
                } else {
                    console.log('❌ 数据库中未找到该块');
                }
                
                // 2. 查询DOM中的当前状态
                const domElement = document.querySelector(`[data-node-id="${blockId}"]`);
                if (domElement) {
                    console.log('🎯 DOM中的当前状态:', {
                        tagName: domElement.tagName,
                        className: domElement.className,
                        dataType: domElement.getAttribute('data-type'),
                        updated: domElement.getAttribute('updated'),
                        innerHTML: domElement.innerHTML,
                        outerHTML: domElement.outerHTML
                    });
                } else {
                    console.log('❌ DOM中未找到该元素');
                }
                
            } catch (error) {
                console.error('❌ 查询失败:', error);
            }
        };
        
        console.log('💡 已创建全局函数 queryBlockInfo(blockId)，可用于调试');
    }
}
