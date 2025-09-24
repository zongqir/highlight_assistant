/**
 * 高亮悬浮按钮管理器
 * 参考sy-tomato-plugin的FloatingBall实现
 */

import HighlightFloatingToolbar from '../components/HighlightFloatingToolbar.svelte';

export class HighlightFloatingBall {
    private static instance: HighlightFloatingBall | null = null;
    private target: HTMLElement | null = null;
    private svelte: any = null;
    private isVisible = false;
    private selectionCheckInterval: NodeJS.Timeout | null = null;
    
    private constructor() {}
    
    static getInstance(): HighlightFloatingBall {
        if (!this.instance) {
            this.instance = new HighlightFloatingBall();
        }
        return this.instance;
    }
    
    /**
     * 初始化悬浮工具栏
     */
    init(): void {
        if (this.target) {
            return; // 已经初始化
        }
        
        // 创建容器
        this.target = document.createElement('div');
        this.target.setAttribute('id', 'highlight-floating-ball');
        this.target.style.cssText = `
            position: fixed;
            z-index: 999999;
            pointer-events: none;
        `;
        
        document.body.appendChild(this.target);
        
        // 创建Svelte组件
        this.svelte = new HighlightFloatingToolbar({
            target: this.target,
            props: {
                visible: false,
                position: { x: 50, y: 100 },
                onColorSelect: this.handleColorSelect.bind(this),
                onClose: this.hide.bind(this)
            }
        });
        
        // 启动选择检测
        this.startSelectionDetection();
        
        console.log('高亮悬浮工具栏初始化完成');
    }
    
    /**
     * 销毁悬浮工具栏
     */
    destroy(): void {
        this.stopSelectionDetection();
        
        if (this.svelte) {
            this.svelte.$destroy();
            this.svelte = null;
        }
        
        if (this.target) {
            this.target.remove();
            this.target = null;
        }
        
        this.isVisible = false;
        console.log('高亮悬浮工具栏已销毁');
    }
    
    /**
     * 显示工具栏
     */
    show(position?: { x: number; y: number }): void {
        if (!this.svelte) {
            return;
        }
        
        // 计算显示位置
        const finalPosition = position || this.calculateOptimalPosition();
        
        // 更新Svelte组件
        this.svelte.$set({
            visible: true,
            position: finalPosition
        });
        
        // 启用指针事件
        if (this.target) {
            this.target.style.pointerEvents = 'auto';
        }
        
        this.isVisible = true;
        console.log('显示高亮工具栏', finalPosition);
    }
    
    /**
     * 隐藏工具栏
     */
    hide(): void {
        if (!this.svelte) {
            return;
        }
        
        this.svelte.$set({
            visible: false
        });
        
        // 禁用指针事件
        if (this.target) {
            this.target.style.pointerEvents = 'none';
        }
        
        this.isVisible = false;
        console.log('隐藏高亮工具栏');
    }
    
    /**
     * 启动选择检测
     */
    private startSelectionDetection(): void {
        // 监听选择变化事件
        document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
        
        // 定期检查选择状态（作为备选机制）
        this.selectionCheckInterval = setInterval(() => {
            this.checkSelection();
        }, 1000);
    }
    
    /**
     * 停止选择检测
     */
    private stopSelectionDetection(): void {
        document.removeEventListener('selectionchange', this.handleSelectionChange.bind(this));
        
        if (this.selectionCheckInterval) {
            clearInterval(this.selectionCheckInterval);
            this.selectionCheckInterval = null;
        }
    }
    
    /**
     * 处理选择变化
     */
    private handleSelectionChange(): void {
        // 延迟检查，等待选择稳定
        setTimeout(() => {
            this.checkSelection();
        }, 300);
    }
    
    /**
     * 检查当前选择
     */
    private checkSelection(): void {
        const selection = window.getSelection();
        
        if (!selection || selection.rangeCount === 0) {
            if (this.isVisible) {
                this.hide();
            }
            return;
        }
        
        const text = selection.toString().trim();
        if (!text || text.length < 1) {
            if (this.isVisible) {
                this.hide();
            }
            return;
        }
        
        // 检查是否在编辑器中
        const range = selection.getRangeAt(0);
        if (!this.isInEditor(range)) {
            if (this.isVisible) {
                this.hide();
            }
            return;
        }
        
        console.log('检测到有效文本选择:', text.substring(0, 30));
        
        // 显示工具栏
        if (!this.isVisible) {
            const position = this.calculateSelectionPosition(selection);
            this.show(position);
        }
    }
    
    /**
     * 检查选择是否在编辑器中
     */
    private isInEditor(range: Range): boolean {
        const container = range.startContainer;
        let element = container.nodeType === Node.TEXT_NODE 
            ? container.parentElement 
            : container as HTMLElement;
            
        while (element && element !== document.body) {
            if (element.classList?.contains('protyle-wysiwyg') ||
                element.classList?.contains('protyle-content') ||
                element.hasAttribute?.('data-node-id')) {
                return true;
            }
            element = element.parentElement;
        }
        
        return false;
    }
    
    /**
     * 计算选择位置
     */
    private calculateSelectionPosition(selection: Selection): { x: number; y: number } {
        try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            return {
                x: Math.max(20, Math.min(rect.left, window.innerWidth - 300)),
                y: Math.max(20, rect.top - 100)
            };
        } catch (error) {
            return this.calculateOptimalPosition();
        }
    }
    
    /**
     * 计算最佳显示位置
     */
    private calculateOptimalPosition(): { x: number; y: number } {
        return {
            x: Math.max(20, (window.innerWidth - 280) / 2),
            y: Math.max(20, window.innerHeight / 3)
        };
    }
    
    /**
     * 处理颜色选择
     */
    private handleColorSelect(color: string): void {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            showMessage('请先选择文本', 2000, 'error');
            return;
        }
        
        const text = selection.toString().trim();
        if (!text) {
            showMessage('请选择有效文本', 2000, 'error');
            return;
        }
        
        try {
            // 创建高亮span
            const span = document.createElement('span');
            span.className = 'highlight-assistant-span';
            span.setAttribute('data-highlight-type', 'custom');
            span.setAttribute('data-highlight-color', color);
            span.setAttribute('data-highlight-id', this.generateId());
            span.setAttribute('data-highlight-created', Date.now().toString());
            
            // 设置样式
            const colorMap = {
                'yellow': { bg: '#fff3cd', text: '#856404' },
                'blue': { bg: '#cce5ff', text: '#004085' },
                'green': { bg: '#d4e6d4', text: '#155724' },
                'pink': { bg: '#f8d7da', text: '#721c24' }
            };
            
            const colorStyle = colorMap[color] || colorMap['yellow'];
            span.style.backgroundColor = colorStyle.bg;
            span.style.color = colorStyle.text;
            span.style.padding = '2px 4px';
            span.style.borderRadius = '3px';
            span.style.cursor = 'pointer';
            span.textContent = text;
            
            // 替换选中文本
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(span);
            
            // 清除选择
            selection.removeAllRanges();
            
            const colorNames = {
                'yellow': '黄色',
                'blue': '蓝色',
                'green': '绿色',
                'pink': '粉色'
            };
            
            showMessage(`已添加${colorNames[color] || ''}高亮`, 2000);
            
        } catch (error) {
            console.error('创建高亮失败:', error);
            showMessage('创建高亮失败', 2000, 'error');
        }
    }
    
    /**
     * 生成唯一ID
     */
    private generateId(): string {
        return `hl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }
    
    /**
     * 获取当前状态
     */
    getState(): {
        isVisible: boolean;
        hasTarget: boolean;
        position: { x: number; y: number } | null;
    } {
        let position = null;
        if (this.target && this.isVisible) {
            position = {
                x: parseInt(this.target.style.left) || 0,
                y: parseInt(this.target.style.top) || 0
            };
        }
        
        return {
            isVisible: this.isVisible,
            hasTarget: this.target !== null,
            position
        };
    }
}

