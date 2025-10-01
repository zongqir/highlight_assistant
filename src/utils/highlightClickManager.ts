/**
 * 高亮点击管理器 - 处理点击高亮文本弹出快速删除对话框
 */

import { operationWrapper } from './operationWrapper';
import { getAllEditor } from "siyuan";

export class HighlightClickManager {
    private isInitialized: boolean = false;
    
    constructor() {
        // 初始化
    }
    
    /**
     * 初始化高亮点击功能
     */
    public initialize(): void {
        console.log('[HighlightClickManager] 🚀 高亮点击管理器初始化...');
        
        // 立即设置点击高亮弹出快速删除框的功能
        this.setupClickToEditHighlight();
        
        // 延迟设置初始化完成标记
        setTimeout(() => {
            this.isInitialized = true;
            console.log('[HighlightClickManager] ✅ 高亮点击管理器初始化完成');
        }, 2000);
    }
    
    /**
     * 设置点击高亮弹出快速删除框的功能
     */
    private setupClickToEditHighlight(): void {
        // 使用多种事件类型拦截，确保能够捕获
        const eventTypes = ['mousedown', 'click', 'mouseup'];
        
        eventTypes.forEach(eventType => {
            const handler = (e: Event) => {
                const target = e.target as HTMLElement;
                
                // 直接判断点击的元素是否是高亮
                const isHighlight = target.getAttribute?.('data-type') === 'text' &&
                                   target.style?.backgroundColor &&
                                   target.style.backgroundColor !== 'transparent' &&
                                   target.style.backgroundColor !== '';
                
                if (eventType === 'mousedown' && isHighlight) {
                    // 阻止所有默认行为和传播
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    this.showHighlightQuickDialog(target);
                    
                    return false;
                }
            };
            
            document.addEventListener(eventType, handler, true); // 使用捕获阶段拦截
        });
        
        console.log('[HighlightClickManager] ✅ 点击高亮事件监听器已注册');
    }
    
    
    /**
     * 显示高亮快速删除对话框
     */
    private async showHighlightQuickDialog(highlightElement: HTMLElement): Promise<void> {
        if (!highlightElement) {
            console.warn('[HighlightClickManager] 高亮元素不存在');
            return;
        }

        const selectedText = highlightElement.textContent || '';
        const backgroundColor = highlightElement.style.backgroundColor;
        
        const action = await this.showQuickActionDialog(selectedText, backgroundColor);
        
        if (action === 'delete') {
            // 删除高亮操作 - 使用操作包装器
            await operationWrapper.executeWithUnlockLock(
                '删除高亮',
                async () => {
                    await this.performDeleteHighlight(highlightElement);
                }
            );
        }
    }
    
    /**
     * 执行删除高亮的核心逻辑（不包含解锁加锁）
     */
    private async performDeleteHighlight(highlightElement: HTMLElement): Promise<void> {
        try {
            // 获取当前编辑器的protyle对象
            const editors = getAllEditor();
            if (editors.length === 0) {
                throw new Error('没有可用的编辑器');
            }
            
            const protyle = editors[0].protyle;
            if (!protyle || !protyle.toolbar) {
                throw new Error('编辑器toolbar不可用');
            }

            // 选中这个高亮元素（选中整个 span 节点）
            const range = document.createRange();
            range.selectNode(highlightElement); // 关键：使用 selectNode 而不是 selectNodeContents
            
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }

            // 等待选区稳定
            await new Promise(resolve => setTimeout(resolve, 50));

            // 使用思源原生方法移除高亮
            protyle.toolbar.range = range;
            protyle.toolbar.setInlineMark(protyle, "text", "range", {
                type: "backgroundColor",
                color: "" // 空字符串表示移除背景色
            });
            
            // 等待思源处理
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 清除选择
            if (selection) {
                selection.removeAllRanges();
            }
        } catch (error) {
            console.error('[HighlightClickManager] ❌ 高亮删除失败:', error);
            throw error;
        }
    }
    
    /**
     * 显示快速操作对话框
     */
    private showQuickActionDialog(selectedText: string, backgroundColor: string): Promise<'delete' | 'cancel'> {
        return new Promise((resolve) => {
            // 创建弹窗容器
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--b3-theme-background);
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 99999;
                min-width: 300px;
                max-width: 90vw;
                width: 400px;
                box-sizing: border-box;
                border: 1px solid var(--b3-theme-surface-lighter);
            `;

            // 标题
            const title = document.createElement('div');
            title.textContent = '高亮快速操作';
            title.style.cssText = `
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: var(--b3-theme-on-background);
            `;

            // 选中文本显示（带背景色预览）
            const selectedDiv = document.createElement('div');
            selectedDiv.textContent = selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : '');
            selectedDiv.style.cssText = `
                font-size: 14px;
                color: var(--b3-theme-on-background);
                margin-bottom: 15px;
                padding: 10px;
                background: ${backgroundColor};
                border-radius: 4px;
                max-height: 150px;
                overflow-y: auto;
            `;

            // 提示文本
            const hint = document.createElement('div');
            hint.textContent = '是否删除此高亮？';
            hint.style.cssText = `
                font-size: 14px;
                color: var(--b3-theme-on-surface-light);
                margin-bottom: 20px;
            `;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            `;

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                padding: 8px 16px;
                background: var(--b3-theme-surface);
                color: var(--b3-theme-on-surface);
                border: 1px solid var(--b3-theme-surface-lighter);
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除高亮';
            deleteBtn.style.cssText = `
                padding: 8px 16px;
                background: var(--b3-card-error-background);
                color: var(--b3-card-error-color);
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(deleteBtn);

            dialog.appendChild(title);
            dialog.appendChild(selectedDiv);
            dialog.appendChild(hint);
            dialog.appendChild(buttonContainer);
            document.body.appendChild(dialog);

            // 关闭对话框
            const closeDialog = () => {
                if (dialog.parentNode) {
                    dialog.parentNode.removeChild(dialog);
                }
            };

            cancelBtn.addEventListener('click', () => {
                resolve('cancel');
                closeDialog();
            });
            
            deleteBtn.addEventListener('click', () => {
                resolve('delete');
                closeDialog();
            });

            // ESC 关闭
            const handleKeydown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    resolve('cancel');
                    closeDialog();
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);
        });
    }
}

