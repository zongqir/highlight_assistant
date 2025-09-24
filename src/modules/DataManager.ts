/**
 * 数据管理模块
 * 负责高亮数据的存储、读取和块内容操作
 */

import type { IHighlightData, IHighlightModule, HighlightColor } from '../types/highlight';
import { DOMUtils } from '../utils/domUtils';
import { updateBlock } from '../api';
import { DATA_ATTRIBUTES, ERROR_MESSAGES, DEBUG } from '../constants/colors';

export class DataManager implements IHighlightModule {
    public readonly name = 'DataManager';
    public isInitialized = false;
    
    // 内存缓存
    private highlightCache = new Map<string, IHighlightData[]>();
    private blockContentCache = new Map<string, string>();
    
    /**
     * 初始化数据管理器
     */
    async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }
        
        try {
            this.setupEventListeners();
            this.isInitialized = true;
            
            if (DEBUG.ENABLED) {
                console.log('[DataManager] 初始化完成');
            }
        } catch (error) {
            console.error('[DataManager] 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 销毁数据管理器
     */
    async destroy(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }
        
        this.clearCache();
        this.isInitialized = false;
        
        if (DEBUG.ENABLED) {
            console.log('[DataManager] 已销毁');
        }
    }

    /**
     * 在块中创建高亮
     */
    async createHighlight(
        blockId: string,
        selection: Selection,
        color: HighlightColor,
        comment?: string
    ): Promise<IHighlightData> {
        if (!this.isInitialized) {
            throw new Error(ERROR_MESSAGES.MODULE_NOT_INITIALIZED);
        }

        try {
            const text = selection.toString().trim();
            if (!text) {
                throw new Error(ERROR_MESSAGES.INVALID_SELECTION);
            }

            // 生成高亮数据
            const highlightData: IHighlightData = {
                id: DOMUtils.generateHighlightId(),
                text,
                color,
                type: color === 'yellow' ? 'default' : 'custom',
                comment,
                created: Date.now(),
                updated: Date.now(),
                blockId,
                range: { startOffset: 0, endOffset: 0 } // 临时值，稍后更新
            };

            // 创建高亮span元素
            const span = DOMUtils.createHighlightSpan(text, color, comment, highlightData.id);
            
            // 替换选择的文本
            const success = DOMUtils.replaceSelectionWithHighlight(selection, span);
            if (!success) {
                throw new Error('替换文本失败');
            }

            // 重新计算范围
            const blockElement = document.querySelector(`[data-node-id="${blockId}"]`) as HTMLElement;
            if (blockElement) {
                highlightData.range = this.calculateTextRange(span, blockElement);
            }

            // 保存到思源
            await this.saveBlockContent(blockId);
            
            // 更新缓存
            this.addToCache(blockId, highlightData);

            if (DEBUG.ENABLED) {
                console.log('[DataManager] 高亮创建成功:', highlightData);
            }

            return highlightData;
        } catch (error) {
            console.error('[DataManager] 创建高亮失败:', error);
            throw error;
        }
    }

    /**
     * 更新高亮
     */
    async updateHighlight(
        highlightId: string,
        updates: Partial<IHighlightData>
    ): Promise<IHighlightData> {
        if (!this.isInitialized) {
            throw new Error(ERROR_MESSAGES.MODULE_NOT_INITIALIZED);
        }

        try {
            // 查找高亮元素
            const span = document.querySelector(
                `span[${DATA_ATTRIBUTES.HIGHLIGHT_ID}="${highlightId}"]`
            ) as HTMLSpanElement;

            if (!span) {
                throw new Error('高亮元素不存在');
            }

            // 解析当前数据
            const currentData = DOMUtils.parseHighlightSpan(span);
            if (!currentData) {
                throw new Error('解析高亮数据失败');
            }

            // 合并更新
            const updatedData: IHighlightData = {
                ...currentData,
                ...updates,
                updated: Date.now()
            };

            // 更新DOM元素
            this.updateSpanAttributes(span, updatedData);
            
            // 保存到思源
            await this.saveBlockContent(updatedData.blockId);
            
            // 更新缓存
            this.updateInCache(updatedData.blockId, updatedData);

            if (DEBUG.ENABLED) {
                console.log('[DataManager] 高亮更新成功:', updatedData);
            }

            return updatedData;
        } catch (error) {
            console.error('[DataManager] 更新高亮失败:', error);
            throw error;
        }
    }

    /**
     * 删除高亮
     */
    async deleteHighlight(highlightId: string): Promise<string> {
        if (!this.isInitialized) {
            throw new Error(ERROR_MESSAGES.MODULE_NOT_INITIALIZED);
        }

        try {
            // 查找高亮元素
            const span = document.querySelector(
                `span[${DATA_ATTRIBUTES.HIGHLIGHT_ID}="${highlightId}"]`
            ) as HTMLSpanElement;

            if (!span) {
                throw new Error('高亮元素不存在');
            }

            // 获取块ID
            const blockElement = DOMUtils.findBlockElement(span);
            const blockId = blockElement ? DOMUtils.getBlockId(blockElement) : null;
            
            if (!blockId) {
                throw new Error(ERROR_MESSAGES.BLOCK_NOT_FOUND);
            }

            // 替换为纯文本
            const textNode = document.createTextNode(span.textContent || '');
            span.parentNode?.replaceChild(textNode, span);
            
            // 保存到思源
            await this.saveBlockContent(blockId);
            
            // 从缓存中移除
            this.removeFromCache(blockId, highlightId);

            if (DEBUG.ENABLED) {
                console.log('[DataManager] 高亮删除成功:', highlightId);
            }

            return highlightId;
        } catch (error) {
            console.error('[DataManager] 删除高亮失败:', error);
            throw error;
        }
    }

    /**
     * 获取块中的所有高亮
     */
    getBlockHighlights(blockId: string): IHighlightData[] {
        // 优先从缓存获取
        if (this.highlightCache.has(blockId)) {
            return this.highlightCache.get(blockId)!;
        }

        // 从DOM解析
        const blockElement = document.querySelector(`[data-node-id="${blockId}"]`) as HTMLElement;
        if (!blockElement) {
            return [];
        }

        const highlights: IHighlightData[] = [];
        const spans = DOMUtils.findHighlightsInBlock(blockElement);
        
        for (const span of spans) {
            const data = DOMUtils.parseHighlightSpan(span);
            if (data) {
                highlights.push(data);
            }
        }

        // 更新缓存
        this.highlightCache.set(blockId, highlights);
        
        return highlights;
    }

    /**
     * 查找特定高亮
     */
    findHighlight(highlightId: string): IHighlightData | null {
        // 遍历所有缓存查找
        for (const highlights of this.highlightCache.values()) {
            const found = highlights.find(h => h.id === highlightId);
            if (found) {
                return found;
            }
        }

        // 从DOM查找
        const span = document.querySelector(
            `span[${DATA_ATTRIBUTES.HIGHLIGHT_ID}="${highlightId}"]`
        ) as HTMLSpanElement;

        return span ? DOMUtils.parseHighlightSpan(span) : null;
    }

    /**
     * 保存块内容到思源
     */
    private async saveBlockContent(blockId: string): Promise<void> {
        try {
            const blockElement = document.querySelector(`[data-node-id="${blockId}"]`) as HTMLElement;
            if (!blockElement) {
                throw new Error(ERROR_MESSAGES.BLOCK_NOT_FOUND);
            }

            // 获取块的HTML内容
            const content = blockElement.innerHTML;
            
            // 使用思源API更新块
            await updateBlock('dom', content, blockId);
            
            // 更新内容缓存
            this.blockContentCache.set(blockId, content);
            
            if (DEBUG.ENABLED) {
                console.log(`[DataManager] 块内容已保存: ${blockId}`);
            }
        } catch (error) {
            console.error(`[DataManager] 保存块内容失败: ${blockId}`, error);
            throw error;
        }
    }

    /**
     * 更新span元素的属性
     */
    private updateSpanAttributes(span: HTMLSpanElement, data: IHighlightData): void {
        span.setAttribute(DATA_ATTRIBUTES.HIGHLIGHT_COLOR, data.color);
        span.setAttribute(DATA_ATTRIBUTES.HIGHLIGHT_UPDATED, data.updated.toString());
        
        if (data.comment) {
            span.setAttribute(DATA_ATTRIBUTES.HIGHLIGHT_COMMENT, data.comment);
        } else {
            span.removeAttribute(DATA_ATTRIBUTES.HIGHLIGHT_COMMENT);
        }
        
        // 更新CSS类
        span.className = `highlight-assistant-span highlight-assistant-custom highlight-color-${data.color}`;
    }

    /**
     * 计算文本范围
     */
    private calculateTextRange(span: HTMLSpanElement, blockElement: HTMLElement): {
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
     * 添加到缓存
     */
    private addToCache(blockId: string, highlight: IHighlightData): void {
        if (!this.highlightCache.has(blockId)) {
            this.highlightCache.set(blockId, []);
        }
        
        const highlights = this.highlightCache.get(blockId)!;
        const existingIndex = highlights.findIndex(h => h.id === highlight.id);
        
        if (existingIndex >= 0) {
            highlights[existingIndex] = highlight;
        } else {
            highlights.push(highlight);
        }
    }

    /**
     * 更新缓存中的高亮
     */
    private updateInCache(blockId: string, highlight: IHighlightData): void {
        const highlights = this.highlightCache.get(blockId);
        if (!highlights) {
            return;
        }
        
        const index = highlights.findIndex(h => h.id === highlight.id);
        if (index >= 0) {
            highlights[index] = highlight;
        }
    }

    /**
     * 从缓存中移除高亮
     */
    private removeFromCache(blockId: string, highlightId: string): void {
        const highlights = this.highlightCache.get(blockId);
        if (!highlights) {
            return;
        }
        
        const index = highlights.findIndex(h => h.id === highlightId);
        if (index >= 0) {
            highlights.splice(index, 1);
        }
    }

    /**
     * 清除所有缓存
     */
    private clearCache(): void {
        this.highlightCache.clear();
        this.blockContentCache.clear();
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners(): void {
        // 监听块内容变化，清除相关缓存
        document.addEventListener('block-updated', (event: any) => {
            const blockId = event.detail?.blockId;
            if (blockId) {
                this.highlightCache.delete(blockId);
                this.blockContentCache.delete(blockId);
            }
        });
    }

    /**
     * 获取统计信息
     */
    getStats(): {
        totalHighlights: number;
        totalBlocks: number;
        cacheSize: number;
    } {
        let totalHighlights = 0;
        for (const highlights of this.highlightCache.values()) {
            totalHighlights += highlights.length;
        }
        
        return {
            totalHighlights,
            totalBlocks: this.highlightCache.size,
            cacheSize: this.highlightCache.size + this.blockContentCache.size
        };
    }
}
