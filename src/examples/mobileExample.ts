/**
 * 手机版高亮管理器使用示例
 * 展示如何在思源插件中集成手机版高亮功能
 */

import { createMobileHighlightManager } from '../mobile/mobileHighlightManager';
import type { ISelectionInfo, HighlightColor } from '../types/highlight';

/**
 * 思源插件示例类
 */
class HighlightAssistantPlugin {
    private mobileManager: ReturnType<typeof createMobileHighlightManager> | null = null;
    private highlightData: Map<string, any> = new Map();
    
    /**
     * 插件加载时调用
     */
    async onload() {
        console.log('高亮助手插件加载中...');
        
        // 创建手机版高亮管理器
        this.mobileManager = createMobileHighlightManager({
            // 选择处理器配置
            selectionDelay: 600,        // 比系统620ms快20ms
            enableCapture: true,        // 使用捕获阶段监听
            enableToolbarWatch: true,   // 监听工具栏变化
            
            // 弹窗配置
            colors: ['yellow', 'green', 'blue', 'pink', 'red', 'purple'],
            showCommentButton: true,    // 显示备注按钮
            autoHideDelay: 0,          // 不自动隐藏
            
            // 通用配置
            debug: true,               // 开启调试模式
            autoInit: false            // 手动初始化
        }, {
            // 事件处理器
            onHighlight: this.handleHighlight.bind(this),
            onComment: this.handleComment.bind(this),
            onRemove: this.handleRemove.bind(this),
            onSelectionChange: this.handleSelectionChange.bind(this),
            onSelectionHide: this.handleSelectionHide.bind(this)
        });
        
        // 延迟初始化，确保DOM准备好
        setTimeout(() => {
            this.initializeMobileManager();
        }, 1000);
    }
    
    /**
     * 初始化手机版管理器
     */
    private async initializeMobileManager() {
        try {
            if (this.mobileManager) {
                await this.mobileManager.init();
                console.log('手机版高亮管理器初始化成功');
                
                // 打印状态信息
                console.log('管理器状态:', this.mobileManager.status);
            }
        } catch (error) {
            console.error('手机版高亮管理器初始化失败:', error);
        }
    }
    
    /**
     * 处理高亮创建
     */
    private async handleHighlight(color: HighlightColor, selectionInfo: ISelectionInfo): Promise<boolean> {
        console.log('创建高亮:', {
            color,
            text: selectionInfo.text,
            blockId: selectionInfo.blockId,
            isExisting: selectionInfo.isExistingHighlight
        });
        
        try {
            // 如果是已存在的高亮，先移除旧的
            if (selectionInfo.isExistingHighlight && selectionInfo.existingHighlight) {
                await this.removeHighlight(selectionInfo.existingHighlight.id);
            }
            
            // 创建新的高亮数据
            const highlightData = {
                id: this.generateId(),
                text: selectionInfo.text,
                color: color,
                blockId: selectionInfo.blockId,
                created: Date.now(),
                comment: null
            };
            
            // 保存到数据存储
            this.saveHighlightData(highlightData);
            
            // 在DOM中应用高亮
            const success = this.applyHighlightToDom(selectionInfo, color, highlightData.id);
            
            if (success) {
                console.log('高亮创建成功:', highlightData.id);
                this.showToast('高亮已添加', 'success');
            } else {
                console.error('高亮创建失败');
                this.showToast('高亮添加失败', 'error');
            }
            
            return success;
            
        } catch (error) {
            console.error('处理高亮时出错:', error);
            this.showToast('高亮处理出错', 'error');
            return false;
        }
    }
    
    /**
     * 处理备注添加
     */
    private async handleComment(selectionInfo: ISelectionInfo): Promise<void> {
        console.log('添加备注:', selectionInfo.text);
        
        try {
            // 创建备注输入对话框（手机版优化）
            const comment = await this.showCommentDialog(selectionInfo.text);
            
            if (comment) {
                // 如果有现有高亮，更新备注
                if (selectionInfo.isExistingHighlight && selectionInfo.existingHighlight) {
                    await this.updateHighlightComment(selectionInfo.existingHighlight.id, comment);
                    this.showToast('备注已更新', 'success');
                } else {
                    // 创建带备注的新高亮
                    const result = await this.handleHighlight('yellow', selectionInfo);
                    if (result) {
                        // 这里可以添加更新备注的逻辑
                        console.log('高亮创建并添加备注:', comment);
                    }
                }
            }
            
        } catch (error) {
            console.error('处理备注时出错:', error);
            this.showToast('备注处理出错', 'error');
        }
    }
    
    /**
     * 处理高亮移除
     */
    private async handleRemove(selectionInfo: ISelectionInfo): Promise<boolean> {
        console.log('移除高亮:', selectionInfo.text);
        
        try {
            if (selectionInfo.isExistingHighlight && selectionInfo.existingHighlight) {
                const success = await this.removeHighlight(selectionInfo.existingHighlight.id);
                
                if (success) {
                    // 从DOM中移除高亮
                    this.removeHighlightFromDom(selectionInfo.existingHighlight.id);
                    this.showToast('高亮已移除', 'success');
                } else {
                    this.showToast('高亮移除失败', 'error');
                }
                
                return success;
            }
            
            return false;
            
        } catch (error) {
            console.error('处理高亮移除时出错:', error);
            this.showToast('高亮移除出错', 'error');
            return false;
        }
    }
    
    /**
     * 处理选择变化
     */
    private handleSelectionChange(selectionInfo: ISelectionInfo): void {
        console.log('选择变化:', {
            text: selectionInfo.text.substring(0, 30) + '...',
            blockId: selectionInfo.blockId,
            isExisting: selectionInfo.isExistingHighlight
        });
        
        // 可以在这里添加选择变化的处理逻辑
        // 比如更新状态栏、发送分析事件等
    }
    
    /**
     * 处理选择隐藏
     */
    private handleSelectionHide(): void {
        console.log('选择隐藏');
        
        // 可以在这里添加清理逻辑
        // 比如清除临时状态、隐藏相关UI等
    }
    
    /**
     * 在DOM中应用高亮
     */
    private applyHighlightToDom(selectionInfo: ISelectionInfo, color: HighlightColor, highlightId: string): boolean {
        try {
            // 创建高亮span元素
            const span = document.createElement('span');
            span.className = `highlight-assistant-span highlight-color-${color}`;
            span.setAttribute('data-highlight-id', highlightId);
            span.setAttribute('data-highlight-color', color);
            span.setAttribute('data-highlight-type', 'custom');
            span.textContent = selectionInfo.text;
            
            // 替换选择内容
            const range = selectionInfo.range;
            range.deleteContents();
            range.insertNode(span);
            
            // 清除选择
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
            }
            
            return true;
            
        } catch (error) {
            console.error('应用高亮到DOM失败:', error);
            return false;
        }
    }
    
    /**
     * 从DOM中移除高亮
     */
    private removeHighlightFromDom(highlightId: string): void {
        try {
            const spans = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
            spans.forEach(span => {
                const parent = span.parentNode;
                if (parent) {
                    const textNode = document.createTextNode(span.textContent || '');
                    parent.replaceChild(textNode, span);
                }
            });
        } catch (error) {
            console.error('从DOM移除高亮失败:', error);
        }
    }
    
    /**
     * 保存高亮数据
     */
    private saveHighlightData(data: any): void {
        this.highlightData.set(data.id, data);
        
        // 这里可以调用思源的数据存储API
        // 比如: window.siyuan.storage.setData(data)
        console.log('保存高亮数据:', data);
    }
    
    /**
     * 移除高亮数据
     */
    private async removeHighlight(highlightId: string): Promise<boolean> {
        try {
            this.highlightData.delete(highlightId);
            
            // 这里可以调用思源的数据删除API
            console.log('移除高亮数据:', highlightId);
            
            return true;
        } catch (error) {
            console.error('移除高亮数据失败:', error);
            return false;
        }
    }
    
    /**
     * 更新高亮备注
     */
    private async updateHighlightComment(highlightId: string, comment: string): Promise<void> {
        const data = this.highlightData.get(highlightId);
        if (data) {
            data.comment = comment;
            data.updated = Date.now();
            this.saveHighlightData(data);
        }
    }
    
    /**
     * 显示备注对话框
     */
    private async showCommentDialog(selectedText: string): Promise<string | null> {
        // 简单的prompt实现，实际项目中应该使用更美观的对话框
        return new Promise((resolve) => {
            // 创建手机版友好的对话框
            const dialog = this.createMobileDialog({
                title: '添加备注',
                content: `为选中文本添加备注:\n"${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"`,
                inputPlaceholder: '请输入备注内容...',
                onConfirm: (value: string) => resolve(value),
                onCancel: () => resolve(null)
            });
            
            document.body.appendChild(dialog);
        });
    }
    
    /**
     * 创建手机版对话框
     */
    private createMobileDialog(options: {
        title: string;
        content: string;
        inputPlaceholder: string;
        onConfirm: (value: string) => void;
        onCancel: () => void;
    }): HTMLElement {
        const dialog = document.createElement('div');
        dialog.className = 'mobile-comment-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--b3-theme-background, #ffffff);
            border-radius: 8px;
            padding: 20px;
            max-width: 350px;
            width: 100%;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        `;
        
        content.innerHTML = `
            <div style="font-size: 16px; font-weight: 500; margin-bottom: 12px; color: var(--b3-theme-on-background);">
                ${options.title}
            </div>
            <div style="font-size: 14px; color: var(--b3-theme-on-surface-light); margin-bottom: 16px; line-height: 1.4;">
                ${options.content}
            </div>
            <textarea 
                placeholder="${options.inputPlaceholder}"
                style="
                    width: 100%;
                    min-height: 80px;
                    border: 1px solid var(--b3-border-color);
                    border-radius: 4px;
                    padding: 8px;
                    font-size: 14px;
                    resize: vertical;
                    margin-bottom: 16px;
                    background: var(--b3-theme-surface);
                    color: var(--b3-theme-on-surface);
                "
            ></textarea>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button class="cancel-btn" style="
                    padding: 8px 16px;
                    border: 1px solid var(--b3-border-color);
                    border-radius: 4px;
                    background: transparent;
                    color: var(--b3-theme-on-surface);
                    cursor: pointer;
                ">取消</button>
                <button class="confirm-btn" style="
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    background: var(--b3-theme-primary, #2196f3);
                    color: white;
                    cursor: pointer;
                ">确定</button>
            </div>
        `;
        
        const textarea = content.querySelector('textarea') as HTMLTextAreaElement;
        const cancelBtn = content.querySelector('.cancel-btn') as HTMLButtonElement;
        const confirmBtn = content.querySelector('.confirm-btn') as HTMLButtonElement;
        
        // 绑定事件
        cancelBtn.onclick = () => {
            dialog.remove();
            options.onCancel();
        };
        
        confirmBtn.onclick = () => {
            const value = textarea.value.trim();
            dialog.remove();
            options.onConfirm(value);
        };
        
        // 点击背景关闭
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                dialog.remove();
                options.onCancel();
            }
        };
        
        dialog.appendChild(content);
        
        // 自动聚焦到输入框
        setTimeout(() => textarea.focus(), 100);
        
        return dialog;
    }
    
    /**
     * 显示提示消息
     */
    private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
        // 创建简单的toast提示
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 50px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10001;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // 显示动画
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
        });
        
        // 自动移除
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    /**
     * 生成唯一ID
     */
    private generateId(): string {
        return 'hl-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
    }
    
    /**
     * 插件卸载时调用
     */
    onunload() {
        console.log('高亮助手插件卸载中...');
        
        // 销毁手机版管理器
        if (this.mobileManager) {
            this.mobileManager.destroy();
            this.mobileManager = null;
        }
        
        // 清理数据
        this.highlightData.clear();
    }
}

/**
 * 导出插件类供思源使用
 */
export default HighlightAssistantPlugin;

/**
 * 简单的使用示例
 */
export function simpleExample() {
    // 创建手机版高亮管理器
    const manager = createMobileHighlightManager({
        debug: true,
        colors: ['yellow', 'green', 'blue'],
        selectionDelay: 600
    }, {
        onHighlight: async (color, selectionInfo) => {
            console.log('高亮选择:', color, selectionInfo.text);
            return true; // 返回true表示处理成功
        },
        onComment: async (selectionInfo) => {
            const comment = prompt('请输入备注:');
            console.log('添加备注:', comment, selectionInfo.text);
        },
        onRemove: async (selectionInfo) => {
            console.log('移除高亮:', selectionInfo.text);
            return true; // 返回true表示移除成功
        }
    });
    
    // 初始化
    manager.init().then(() => {
        console.log('手机版高亮管理器准备就绪');
    });
    
    return manager;
}

