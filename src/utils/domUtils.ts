import Logger from './logger';
/**
 * DOM操作工具函数
 */

import type { IHighlightData, IToolbarPosition, ISelectionInfo, HighlightColor } from '../types/highlight';
import { SELECTORS, DATA_ATTRIBUTES, REGEX, DIMENSIONS } from '../constants/colors';

/**
 * DOM操作工具类
 */
export class DOMUtils {
    
    /**
     * 查找包含指定元素的思源块
     */
    static findBlockElement(element: HTMLElement): HTMLElement | null {
        let current = element;
        let level = 0;
        while (current && current !== document.body && level < 20) {
            if (current.hasAttribute && current.hasAttribute(DATA_ATTRIBUTES.BLOCK_ID)) {
                Logger.log('找到块元素:', current.getAttribute(DATA_ATTRIBUTES.BLOCK_ID), 'tag:', current.tagName);
                return current;
            }
            // 也尝试查找其他可能的块标识
            if (current.hasAttribute && (
                current.hasAttribute('data-node-id') || 
                current.hasAttribute('data-id') ||
                current.classList.contains('p') ||
                current.classList.contains('li') ||
                current.classList.contains('h1') ||
                current.classList.contains('h2') ||
                current.classList.contains('h3')
            )) {
                const id = current.getAttribute('data-node-id') || current.getAttribute('data-id');
                if (id) {
                    Logger.log('找到备选块元素:', id, 'tag:', current.tagName);
                    return current;
                }
            }
            current = current.parentElement as HTMLElement;
            level++;
        }
        Logger.log('未找到块元素，搜索了', level, '层');
        return null;
    }

    /**
     * 获取块的ID
     */
    static getBlockId(blockElement: HTMLElement): string | null {
        // 尝试多种可能的属性名
        const possibleIds = [
            blockElement.getAttribute(DATA_ATTRIBUTES.BLOCK_ID),
            blockElement.getAttribute('data-node-id'),
            blockElement.getAttribute('data-id'),
            blockElement.getAttribute('id')
        ];
        
        for (const id of possibleIds) {
            if (id && REGEX.BLOCK_ID.test(id)) {
                return id;
            }
        }
        
        Logger.log('所有ID属性:', {
            'data-node-id': blockElement.getAttribute('data-node-id'),
            'data-id': blockElement.getAttribute('data-id'),
            'id': blockElement.getAttribute('id'),
            'className': blockElement.className
        });
        
        return null;
    }

    /**
     * 检查是否在移动端
     */
    static isMobile(): boolean {
        // 优先检查用户代理
        const mobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        // 检查屏幕宽度
        const mobileWidth = window.innerWidth <= 768;
        // 检查触摸支持
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        // 检查思源移动端标识
        const siyuanMobile = document.querySelector('.fn__mobile') !== null;
        
        return mobileUA || mobileWidth || hasTouch || siyuanMobile;
    }

    /**
     * 检查是否在桌面端
     */
    static isDesktop(): boolean {
        // 检查思源桌面端标识
        const siyuanDesktop = document.querySelector('.fn__desktop') !== null;
        // 检查屏幕宽度
        const desktopWidth = window.innerWidth > 768;
        // 检查非移动端用户代理
        const desktopUA = !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        return siyuanDesktop || (desktopWidth && desktopUA);
    }

    /**
     * 获取当前平台类型
     */
    static getPlatform(): 'mobile' | 'desktop' | 'unknown' {
        if (this.isMobile()) {
            return 'mobile';
        } else if (this.isDesktop()) {
            return 'desktop';
        } else {
            return 'unknown';
        }
    }

    /**
     * 获取当前选择信息
     */
    static getSelectionInfo(): ISelectionInfo | null {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            Logger.log('没有选择或选择范围为空');
            return null;
        }

        const range = selection.getRangeAt(0);
        const text = selection.toString().trim();
        
        if (!text || text.length < DIMENSIONS.MIN_SELECTION_LENGTH) {
            Logger.log('文本为空或太短:', text.length);
            return null;
        }

        // 查找所在的块
        const startContainer = range.startContainer;
        const element = startContainer.nodeType === Node.TEXT_NODE 
            ? startContainer.parentElement as HTMLElement
            : startContainer as HTMLElement;
        
        Logger.log('开始查找块元素，startContainer:', startContainer.nodeName);
            
        const blockElement = this.findBlockElement(element);
        if (!blockElement) {
            Logger.log('未找到包含块元素');
            return null;
        }

        const blockId = this.getBlockId(blockElement);
        if (!blockId) {
            Logger.log('块元素没有有效ID, className:', blockElement.className);
            return null;
        }

        // 检查是否选中了已存在的高亮
        const { isExistingHighlight, existingHighlight } = this.checkExistingHighlight(range);

        Logger.log('获取到有效选择:', {
            text: text.substring(0, 20),
            blockId,
            isExisting: isExistingHighlight
        });

        return {
            text,
            selection,
            range,
            blockElement,
            blockId,
            isExistingHighlight,
            existingHighlight
        };
    }

    /**
     * 检查选择是否包含已存在的高亮
     */
    static checkExistingHighlight(range: Range): {
        isExistingHighlight: boolean;
        existingHighlight?: IHighlightData;
    } {
        const container = range.commonAncestorContainer;
        
        // 检查是否直接选中了高亮span
        if (container.nodeType === Node.ELEMENT_NODE) {
            const element = container as HTMLElement;
            if (element.hasAttribute(DATA_ATTRIBUTES.HIGHLIGHT_TYPE)) {
                const highlight = this.parseHighlightSpan(element as HTMLSpanElement);
                return {
                    isExistingHighlight: true,
                    existingHighlight: highlight || undefined
                };
            }
        }

        // 检查父级元素
        let current = container.nodeType === Node.TEXT_NODE 
            ? container.parentElement 
            : container as HTMLElement;
            
        while (current) {
            if (current.hasAttribute && current.hasAttribute(DATA_ATTRIBUTES.HIGHLIGHT_TYPE)) {
                const highlight = this.parseHighlightSpan(current as HTMLSpanElement);
                return {
                    isExistingHighlight: true,
                    existingHighlight: highlight || undefined
                };
            }
            current = current.parentElement;
        }

        return { isExistingHighlight: false };
    }

    /**
     * 计算浮动工具栏的位置
     */
    static calculateToolbarPosition(selection: Selection): IToolbarPosition | null {
        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        if (rect.width === 0 && rect.height === 0) {
            return null;
        }

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        let x = rect.left + scrollLeft + (rect.width / 2);
        let y = rect.top + scrollTop - DIMENSIONS.TOOLBAR_HEIGHT - DIMENSIONS.TOOLBAR_OFFSET_Y;

        // 边界检查和调整
        const toolbarWidth = this.estimateToolbarWidth();
        const viewportWidth = window.innerWidth;

        let needsAdjustment = false;

        // 水平边界检查
        if (x - toolbarWidth / 2 < DIMENSIONS.SCREEN_EDGE_MARGIN) {
            x = toolbarWidth / 2 + DIMENSIONS.SCREEN_EDGE_MARGIN;
            needsAdjustment = true;
        } else if (x + toolbarWidth / 2 > viewportWidth - DIMENSIONS.SCREEN_EDGE_MARGIN) {
            x = viewportWidth - toolbarWidth / 2 - DIMENSIONS.SCREEN_EDGE_MARGIN;
            needsAdjustment = true;
        }

        // 垂直边界检查
        if (y < scrollTop + DIMENSIONS.SCREEN_EDGE_MARGIN) {
            y = rect.bottom + scrollTop + DIMENSIONS.TOOLBAR_OFFSET_Y;
            needsAdjustment = true;
        }

        return { x, y, needsAdjustment };
    }

    /**
     * 估算工具栏宽度
     */
    private static estimateToolbarWidth(): number {
        // 4个颜色按钮 + 边距
        return (DIMENSIONS.BUTTON_SIZE + DIMENSIONS.BUTTON_MARGIN) * 4 + DIMENSIONS.TOOLBAR_PADDING * 2;
    }

    /**
     * 创建高亮span元素
     */
    static createHighlightSpan(
        text: string, 
        color: HighlightColor, 
        comment?: string,
        highlightId?: string
    ): HTMLSpanElement {
        const span = document.createElement('span');
        const id = highlightId || this.generateHighlightId();
        const now = Date.now();
        
        // 设置属性
        span.setAttribute(DATA_ATTRIBUTES.HIGHLIGHT_TYPE, 'custom');
        span.setAttribute(DATA_ATTRIBUTES.HIGHLIGHT_COLOR, color);
        span.setAttribute(DATA_ATTRIBUTES.HIGHLIGHT_ID, id);
        span.setAttribute(DATA_ATTRIBUTES.HIGHLIGHT_CREATED, now.toString());
        span.setAttribute(DATA_ATTRIBUTES.HIGHLIGHT_UPDATED, now.toString());
        
        if (comment) {
            span.setAttribute(DATA_ATTRIBUTES.HIGHLIGHT_COMMENT, comment);
        }
        
        // 设置文本内容
        span.textContent = text;
        
        // 添加CSS类
        span.className = `highlight-assistant-span highlight-assistant-custom highlight-color-${color}`;
        
        return span;
    }

    /**
     * 解析高亮span元素
     */
    static parseHighlightSpan(span: HTMLSpanElement): IHighlightData | null {
        if (!span.hasAttribute(DATA_ATTRIBUTES.HIGHLIGHT_TYPE)) {
            return null;
        }

        const id = span.getAttribute(DATA_ATTRIBUTES.HIGHLIGHT_ID);
        const color = span.getAttribute(DATA_ATTRIBUTES.HIGHLIGHT_COLOR) as HighlightColor;
        const comment = span.getAttribute(DATA_ATTRIBUTES.HIGHLIGHT_COMMENT);
        const created = span.getAttribute(DATA_ATTRIBUTES.HIGHLIGHT_CREATED);
        const updated = span.getAttribute(DATA_ATTRIBUTES.HIGHLIGHT_UPDATED);
        const text = span.textContent || '';

        if (!id || !color || !created) {
            return null;
        }

        // 查找所在的块
        const blockElement = this.findBlockElement(span);
        const blockId = blockElement ? this.getBlockId(blockElement) : null;

        if (!blockId) {
            return null;
        }

        return {
            id,
            text,
            color,
            type: 'custom',
            comment: comment || undefined,
            created: parseInt(created, 10),
            updated: updated ? parseInt(updated, 10) : parseInt(created, 10),
            blockId,
            range: this.calculateTextRange(span, blockElement)
        };
    }

    /**
     * 计算文本在块中的位置
     */
    private static calculateTextRange(span: HTMLSpanElement, blockElement: HTMLElement): {
        startOffset: number;
        endOffset: number;
    } {
        const walker = document.createTreeWalker(
            blockElement,
            NodeFilter.SHOW_TEXT,
            null
        );

        let offset = 0;
        let node: Node | null;
        let startOffset = 0;
        let found = false;

        while (node = walker.nextNode()) {
            if (!found && node.parentElement === span) {
                startOffset = offset;
                found = true;
            }
            
            if (node.nodeType === Node.TEXT_NODE) {
                offset += (node as Text).textContent?.length || 0;
            }
            
            if (found && node.parentElement !== span) {
                break;
            }
        }

        return {
            startOffset,
            endOffset: startOffset + (span.textContent?.length || 0)
        };
    }

    /**
     * 生成唯一的高亮ID
     */
    static generateHighlightId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `hl-${timestamp}-${random}`;
    }

    /**
     * 将选择替换为高亮元素
     */
    static replaceSelectionWithHighlight(
        selection: Selection, 
        span: HTMLSpanElement
    ): boolean {
        try {
            const range = selection.getRangeAt(0);
            
            // 删除选中的内容
            range.deleteContents();
            
            // 插入高亮span
            range.insertNode(span);
            
            // 清除选择
            selection.removeAllRanges();
            
            return true;
        } catch (error) {
            Logger.error('替换选择失败:', error);
            return false;
        }
    }

    /**
     * 查找块中的所有高亮元素
     */
    static findHighlightsInBlock(blockElement: HTMLElement): HTMLSpanElement[] {
        const highlights: HTMLSpanElement[] = [];
        
        // 查找自定义高亮
        const customHighlights = blockElement.querySelectorAll(
            `span[${DATA_ATTRIBUTES.HIGHLIGHT_TYPE}]`
        ) as NodeListOf<HTMLSpanElement>;
        
        highlights.push(...Array.from(customHighlights));
        
        return highlights;
    }

    /**
     * 清除所有选择
     */
    static clearSelection(): void {
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
        }
    }

    /**
     * 检查元素是否在视窗内
     */
    static isElementInViewport(element: HTMLElement): boolean {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );
    }

    /**
     * 平滑滚动到元素
     */
    static scrollToElement(element: HTMLElement, offset: number = 0): void {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop - offset;
        
        window.scrollTo({
            top: targetY,
            behavior: 'smooth'
        });
    }

    /**
     * 防抖函数
     */
    static debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        
        return function executedFunction(...args: Parameters<T>) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数
     */
    static throttle<T extends (...args: any[]) => any>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let inThrottle: boolean;
        
        return function executedFunction(...args: Parameters<T>) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 安全地执行DOM操作
     */
    static safeExecute<T>(operation: () => T, fallback?: T): T | undefined {
        try {
            return operation();
        } catch (error) {
            Logger.error('DOM操作失败:', error);
            return fallback;
        }
    }
}


