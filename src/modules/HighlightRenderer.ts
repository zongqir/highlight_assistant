/**
 * 高亮渲染模块
 * 负责将高亮数据渲染到页面，包括样式应用和视觉效果
 */

import type { IHighlightModule, HighlightColor } from '../types/highlight';
import { HIGHLIGHT_COLORS, CSS_CLASSES, SELECTORS, DATA_ATTRIBUTES, DEBUG } from '../constants/colors';
import { DOMUtils } from '../utils/domUtils';

export class HighlightRenderer implements IHighlightModule {
    public readonly name = 'HighlightRenderer';
    public isInitialized = false;
    
    private styleElement: HTMLStyleElement | null = null;
    private mutationObserver: MutationObserver | null = null;
    private renderQueue = new Set<string>();
    private renderDebounced: () => void;

    constructor() {
        // 创建防抖渲染函数
        this.renderDebounced = DOMUtils.debounce(() => {
            this.processRenderQueue();
        }, 100);
    }

    /**
     * 初始化渲染器
     */
    async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // 注入样式
            this.injectStyles();
            
            // 设置DOM观察器
            this.setupMutationObserver();
            
            // 渲染已存在的高亮
            this.renderExistingHighlights();
            
            this.isInitialized = true;
            
            if (DEBUG.ENABLED) {
                console.log('[HighlightRenderer] 初始化完成');
            }
        } catch (error) {
            console.error('[HighlightRenderer] 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 销毁渲染器
     */
    async destroy(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        // 移除样式
        if (this.styleElement) {
            this.styleElement.remove();
            this.styleElement = null;
        }

        // 停止观察器
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }

        // 清理渲染队列
        this.renderQueue.clear();
        
        this.isInitialized = false;
        
        if (DEBUG.ENABLED) {
            console.log('[HighlightRenderer] 已销毁');
        }
    }

    /**
     * 渲染块中的高亮
     */
    renderBlockHighlights(blockElement: HTMLElement): void {
        if (!this.isInitialized) {
            return;
        }

        const blockId = DOMUtils.getBlockId(blockElement);
        if (!blockId) {
            return;
        }

        // 查找所有高亮span
        const spans = DOMUtils.findHighlightsInBlock(blockElement);
        
        spans.forEach(span => {
            this.applyHighlightStyles(span);
        });

        if (DEBUG.ENABLED) {
            console.log(`[HighlightRenderer] 渲染块高亮: ${blockId}, 数量: ${spans.length}`);
        }
    }

    /**
     * 应用高亮样式到span元素
     */
    applyHighlightStyles(span: HTMLSpanElement): void {
        const color = span.getAttribute(DATA_ATTRIBUTES.HIGHLIGHT_COLOR) as HighlightColor;
        const hasComment = span.hasAttribute(DATA_ATTRIBUTES.HIGHLIGHT_COMMENT);
        
        if (!color || !HIGHLIGHT_COLORS[color]) {
            return;
        }

        const colorConfig = HIGHLIGHT_COLORS[color];
        
        // 基础高亮样式
        span.style.backgroundColor = colorConfig.backgroundColor;
        span.style.color = colorConfig.textColor;
        span.style.padding = '2px 4px';
        span.style.borderRadius = '3px';
        span.style.cursor = 'pointer';
        span.style.transition = 'all 0.2s ease';
        
        // 添加CSS类
        const classes = [
            CSS_CLASSES.HIGHLIGHT_SPAN,
            CSS_CLASSES.HIGHLIGHT_CUSTOM,
            `highlight-color-${color}`
        ];
        
        if (hasComment) {
            classes.push('highlight-with-comment');
            // 有备注的高亮添加特殊标识
            span.style.borderBottom = `2px dotted ${colorConfig.textColor}`;
        }
        
        span.className = classes.join(' ');
        
        // 添加悬停效果
        this.addHoverEffects(span, colorConfig);
        
        // 添加点击事件
        this.addClickHandler(span);
    }

    /**
     * 添加悬停效果
     */
    private addHoverEffects(span: HTMLSpanElement, colorConfig: any): void {
        const originalStyle = {
            backgroundColor: span.style.backgroundColor,
            transform: span.style.transform
        };

        span.addEventListener('mouseenter', () => {
            span.style.backgroundColor = this.darkenColor(colorConfig.backgroundColor, 0.1);
            span.style.transform = 'scale(1.02)';
        });

        span.addEventListener('mouseleave', () => {
            span.style.backgroundColor = originalStyle.backgroundColor;
            span.style.transform = originalStyle.transform;
        });
    }

    /**
     * 添加点击处理器
     */
    private addClickHandler(span: HTMLSpanElement): void {
        span.addEventListener('click', (event) => {
            event.stopPropagation();
            
            // 发出高亮点击事件
            const customEvent = new CustomEvent('highlight-clicked', {
                detail: {
                    highlightId: span.getAttribute(DATA_ATTRIBUTES.HIGHLIGHT_ID),
                    span,
                    color: span.getAttribute(DATA_ATTRIBUTES.HIGHLIGHT_COLOR),
                    hasComment: span.hasAttribute(DATA_ATTRIBUTES.HIGHLIGHT_COMMENT)
                }
            });
            
            document.dispatchEvent(customEvent);
        });
    }

    /**
     * 队列渲染块
     */
    queueBlockRender(blockId: string): void {
        this.renderQueue.add(blockId);
        this.renderDebounced();
    }

    /**
     * 处理渲染队列
     */
    private processRenderQueue(): void {
        for (const blockId of this.renderQueue) {
            const blockElement = document.querySelector(`[data-node-id="${blockId}"]`) as HTMLElement;
            if (blockElement) {
                this.renderBlockHighlights(blockElement);
            }
        }
        this.renderQueue.clear();
    }

    /**
     * 注入样式
     */
    private injectStyles(): void {
        if (this.styleElement) {
            return;
        }

        this.styleElement = document.createElement('style');
        this.styleElement.textContent = this.generateCSS();
        document.head.appendChild(this.styleElement);
    }

    /**
     * 生成CSS样式
     */
    private generateCSS(): string {
        const css = `
/* 高亮助手基础样式 */
.${CSS_CLASSES.HIGHLIGHT_SPAN} {
    display: inline;
    position: relative;
    line-height: inherit;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    text-decoration: none;
    border-radius: 3px;
    padding: 2px 4px;
    margin: 0 1px;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: text;
}

.${CSS_CLASSES.HIGHLIGHT_SPAN}:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 1;
}

/* 颜色样式 */
${Object.values(HIGHLIGHT_COLORS).map(color => `
.highlight-color-${color.key} {
    background-color: ${color.backgroundColor} !important;
    color: ${color.textColor} !important;
}

.highlight-color-${color.key}:hover {
    background-color: ${this.darkenColor(color.backgroundColor, 0.1)} !important;
}
`).join('')}

/* 有备注的高亮样式 */
.highlight-with-comment {
    position: relative;
}

.highlight-with-comment::after {
    content: "💭";
    position: absolute;
    top: -2px;
    right: -2px;
    font-size: 10px;
    opacity: 0.7;
    pointer-events: none;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .${CSS_CLASSES.HIGHLIGHT_SPAN} {
        padding: 3px 5px;
        margin: 0 2px;
        border-radius: 4px;
    }
    
    .highlight-with-comment::after {
        font-size: 12px;
        top: -3px;
        right: -3px;
    }
}

/* 选中状态 */
.${CSS_CLASSES.HIGHLIGHT_SPAN}.${CSS_CLASSES.SELECTED} {
    outline: 2px solid var(--b3-theme-primary);
    outline-offset: 1px;
    z-index: 2;
}

/* 动画效果 */
.${CSS_CLASSES.HIGHLIGHT_SPAN}.${CSS_CLASSES.FADE_IN} {
    animation: highlightFadeIn 0.3s ease;
}

.${CSS_CLASSES.HIGHLIGHT_SPAN}.${CSS_CLASSES.FADE_OUT} {
    animation: highlightFadeOut 0.3s ease;
}

@keyframes highlightFadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes highlightFadeOut {
    from {
        opacity: 1;
        transform: scale(1);
    }
    to {
        opacity: 0;
        transform: scale(0.95);
    }
}

/* 高亮创建动画 */
.highlight-creating {
    animation: highlightPulse 0.6s ease;
}

@keyframes highlightPulse {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
        box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
    }
}

/* 防止高亮影响原有布局 */
.${CSS_CLASSES.HIGHLIGHT_SPAN} * {
    background: inherit !important;
    color: inherit !important;
}

/* 确保文本可选择 */
.${CSS_CLASSES.HIGHLIGHT_SPAN} {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
}

/* 暗色主题适配 */
.b3-theme-dark .${CSS_CLASSES.HIGHLIGHT_SPAN} {
    filter: brightness(0.9);
}

.b3-theme-dark .${CSS_CLASSES.HIGHLIGHT_SPAN}:hover {
    filter: brightness(1.1);
}
`;

        return css;
    }

    /**
     * 设置DOM变化观察器
     */
    private setupMutationObserver(): void {
        this.mutationObserver = new MutationObserver((mutations) => {
            const blocksToRender = new Set<string>();
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // 检查新添加的节点
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as HTMLElement;
                            
                            // 检查是否是块元素
                            const blockId = DOMUtils.getBlockId(element);
                            if (blockId) {
                                blocksToRender.add(blockId);
                            }
                            
                            // 检查子元素中的块
                            const blocks = element.querySelectorAll(SELECTORS.PROTYLE_BLOCK);
                            blocks.forEach((block) => {
                                const id = DOMUtils.getBlockId(block as HTMLElement);
                                if (id) {
                                    blocksToRender.add(id);
                                }
                            });
                        }
                    });
                }
            });
            
            // 批量渲染
            blocksToRender.forEach((blockId) => {
                this.queueBlockRender(blockId);
            });
        });

        // 开始观察
        const protyleElement = document.querySelector(SELECTORS.PROTYLE_WYSIWYG);
        if (protyleElement) {
            this.mutationObserver.observe(protyleElement, {
                childList: true,
                subtree: true
            });
        }
    }

    /**
     * 渲染现有高亮
     */
    private renderExistingHighlights(): void {
        const blocks = document.querySelectorAll(SELECTORS.PROTYLE_BLOCK);
        blocks.forEach((block) => {
            this.renderBlockHighlights(block as HTMLElement);
        });
    }

    /**
     * 加深颜色
     */
    private darkenColor(color: string, amount: number): string {
        // 简单的颜色加深算法
        const col = color.replace('#', '');
        const num = parseInt(col, 16);
        const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
        const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * 创建高亮动画
     */
    animateHighlightCreation(span: HTMLSpanElement): Promise<void> {
        return new Promise((resolve) => {
            span.classList.add('highlight-creating');
            
            setTimeout(() => {
                span.classList.remove('highlight-creating');
                resolve();
            }, 600);
        });
    }

    /**
     * 创建高亮删除动画
     */
    animateHighlightDeletion(span: HTMLSpanElement): Promise<void> {
        return new Promise((resolve) => {
            span.classList.add(CSS_CLASSES.FADE_OUT);
            
            setTimeout(() => {
                resolve();
            }, 300);
        });
    }

    /**
     * 高亮指定元素（临时效果）
     */
    highlightElement(element: HTMLElement, duration: number = 2000): void {
        const originalBg = element.style.backgroundColor;
        element.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
        element.style.transition = 'background-color 0.3s ease';
        
        setTimeout(() => {
            element.style.backgroundColor = originalBg;
            setTimeout(() => {
                element.style.transition = '';
            }, 300);
        }, duration);
    }

    /**
     * 获取渲染统计
     */
    getStats(): {
        totalRendered: number;
        queueSize: number;
        hasObserver: boolean;
    } {
        const spans = document.querySelectorAll(`.${CSS_CLASSES.HIGHLIGHT_SPAN}`);
        
        return {
            totalRendered: spans.length,
            queueSize: this.renderQueue.size,
            hasObserver: this.mutationObserver !== null
        };
    }
}
