/**
 * 高亮管理器
 * 统一管理所有高亮相关功能，协调各个模块之间的工作
 */

import type { 
    IHighlightManager, 
    IHighlightData, 
    ISelectionInfo, 
    IHighlightResult, 
    HighlightColor,
    IHighlightEventCallbacks,
    IHighlightConfig
} from '../types/highlight';

import { DataManager } from './DataManager';
import { HighlightRenderer } from './HighlightRenderer';
import { SelectionListener } from './SelectionListener';
import { FloatingToolbar } from './FloatingToolbar';

import { DEFAULT_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES, DEBUG } from '../constants/colors';
import { DOMUtils } from '../utils/domUtils';

export class HighlightManager implements IHighlightManager {
    public readonly name = 'HighlightManager';
    public isInitialized = false;
    
    // 子模块
    private dataManager: DataManager;
    private renderer: HighlightRenderer;
    private selectionListener: SelectionListener;
    private floatingToolbar: FloatingToolbar;
    
    // 配置和状态
    private config: IHighlightConfig;
    private callbacks: IHighlightEventCallbacks = {};
    
    constructor(config?: Partial<IHighlightConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        // 初始化子模块
        this.dataManager = new DataManager();
        this.renderer = new HighlightRenderer();
        this.selectionListener = new SelectionListener();
        this.floatingToolbar = new FloatingToolbar();
    }

    /**
     * 初始化高亮管理器
     */
    async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // 检查运行环境
            this.checkEnvironment();
            
            // 初始化所有子模块
            await this.dataManager.init();
            await this.renderer.init();
            await this.selectionListener.init();
            await this.floatingToolbar.init();
            
            // 设置模块间的事件通信
            this.setupInterModuleEvents();
            
            // 设置全局事件监听
            this.setupGlobalEvents();
            
            this.isInitialized = true;
            
            if (DEBUG.ENABLED) {
                console.log('[HighlightManager] 初始化完成', this.config);
            }
            
            // 触发插件加载事件
            this.callbacks.onHighlightCreated?.({} as IHighlightData);
            
        } catch (error) {
            console.error('[HighlightManager] 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 销毁高亮管理器
     */
    async destroy(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        try {
            // 销毁所有子模块
            await this.floatingToolbar.destroy();
            await this.selectionListener.destroy();
            await this.renderer.destroy();
            await this.dataManager.destroy();
            
            // 清除事件监听
            this.removeGlobalEvents();
            
            this.isInitialized = false;
            
            if (DEBUG.ENABLED) {
                console.log('[HighlightManager] 已销毁');
            }
        } catch (error) {
            console.error('[HighlightManager] 销毁失败:', error);
        }
    }

    /**
     * 创建高亮
     */
    async createHighlight(
        selection: ISelectionInfo, 
        color: HighlightColor, 
        comment?: string
    ): Promise<IHighlightResult> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: ERROR_MESSAGES.MODULE_NOT_INITIALIZED,
                action: 'create'
            };
        }

        try {
            // 验证选择
            if (!this.validateSelection(selection)) {
                return {
                    success: false,
                    error: ERROR_MESSAGES.INVALID_SELECTION,
                    action: 'create'
                };
            }

            // 检查是否已存在高亮
            if (selection.isExistingHighlight) {
                return {
                    success: false,
                    error: ERROR_MESSAGES.HIGHLIGHT_EXISTS,
                    action: 'create'
                };
            }

            // 创建高亮
            const highlight = await this.dataManager.createHighlight(
                selection.blockId,
                selection.selection,
                color,
                comment
            );

            // 渲染高亮
            this.renderer.renderBlockHighlights(selection.blockElement);

            // 清除选择
            this.selectionListener.clearCurrentSelection();

            // 触发回调
            this.callbacks.onHighlightCreated?.(highlight);

            if (DEBUG.ENABLED) {
                console.log('[HighlightManager] 高亮创建成功:', highlight);
            }

            return {
                success: true,
                highlight,
                action: 'create'
            };

        } catch (error) {
            console.error('[HighlightManager] 创建高亮失败:', error);
            return {
                success: false,
                error: error.message || ERROR_MESSAGES.SAVE_FAILED,
                action: 'create'
            };
        }
    }

    /**
     * 更新高亮
     */
    async updateHighlight(
        highlightId: string, 
        data: Partial<IHighlightData>
    ): Promise<IHighlightResult> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: ERROR_MESSAGES.MODULE_NOT_INITIALIZED,
                action: 'update'
            };
        }

        try {
            // 更新高亮
            const highlight = await this.dataManager.updateHighlight(highlightId, data);

            // 重新渲染块
            const blockElement = document.querySelector(`[data-node-id="${highlight.blockId}"]`) as HTMLElement;
            if (blockElement) {
                this.renderer.renderBlockHighlights(blockElement);
            }

            // 触发回调
            this.callbacks.onHighlightUpdated?.(highlight);

            if (DEBUG.ENABLED) {
                console.log('[HighlightManager] 高亮更新成功:', highlight);
            }

            return {
                success: true,
                highlight,
                action: 'update'
            };

        } catch (error) {
            console.error('[HighlightManager] 更新高亮失败:', error);
            return {
                success: false,
                error: error.message || ERROR_MESSAGES.SAVE_FAILED,
                action: 'update'
            };
        }
    }

    /**
     * 删除高亮
     */
    async deleteHighlight(highlightId: string): Promise<IHighlightResult> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: ERROR_MESSAGES.MODULE_NOT_INITIALIZED,
                action: 'delete'
            };
        }

        try {
            // 获取高亮信息用于回调
            const highlight = this.dataManager.findHighlight(highlightId);
            
            // 删除高亮
            await this.dataManager.deleteHighlight(highlightId);

            // 重新渲染块（如果需要）
            if (highlight) {
                const blockElement = document.querySelector(`[data-node-id="${highlight.blockId}"]`) as HTMLElement;
                if (blockElement) {
                    this.renderer.renderBlockHighlights(blockElement);
                }
            }

            // 清除选择
            this.selectionListener.clearCurrentSelection();

            // 触发回调
            this.callbacks.onHighlightDeleted?.(highlightId);

            if (DEBUG.ENABLED) {
                console.log('[HighlightManager] 高亮删除成功:', highlightId);
            }

            return {
                success: true,
                action: 'delete'
            };

        } catch (error) {
            console.error('[HighlightManager] 删除高亮失败:', error);
            return {
                success: false,
                error: error.message || ERROR_MESSAGES.DELETE_FAILED,
                action: 'delete'
            };
        }
    }

    /**
     * 获取块中的所有高亮
     */
    getBlockHighlights(blockId: string): IHighlightData[] {
        if (!this.isInitialized) {
            return [];
        }
        
        return this.dataManager.getBlockHighlights(blockId);
    }

    /**
     * 渲染块中的高亮
     */
    renderHighlights(blockElement: HTMLElement): void {
        if (!this.isInitialized) {
            return;
        }
        
        this.renderer.renderBlockHighlights(blockElement);
    }

    /**
     * 设置事件回调
     */
    setEventCallbacks(callbacks: IHighlightEventCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
        
        // 传递给子模块
        this.selectionListener.setEventCallbacks(this.callbacks);
        this.floatingToolbar.setEventCallbacks(this.callbacks);
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<IHighlightConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        if (DEBUG.ENABLED) {
            console.log('[HighlightManager] 配置已更新:', this.config);
        }
    }

    /**
     * 获取当前配置
     */
    getConfig(): IHighlightConfig {
        return { ...this.config };
    }

    /**
     * 检查运行环境
     */
    private checkEnvironment(): void {
        // 检查必要的API
        if (!window.getSelection) {
            throw new Error(ERROR_MESSAGES.UNSUPPORTED_BROWSER);
        }

        // 检查思源笔记环境
        const protyleElement = document.querySelector('.protyle-wysiwyg');
        if (!protyleElement) {
            console.warn('[HighlightManager] 未找到思源笔记编辑器环境');
        }
    }

    /**
     * 设置模块间事件通信
     */
    private setupInterModuleEvents(): void {
        // 选择监听器 -> 浮动工具栏
        this.selectionListener.setEventCallbacks({
            onSelectionChanged: (selection) => {
                if (selection) {
                    this.floatingToolbar.show(selection);
                } else {
                    this.floatingToolbar.hide();
                }
            }
        });
    }

    /**
     * 设置全局事件监听
     */
    private setupGlobalEvents(): void {
        // 高亮创建事件
        document.addEventListener('highlight-create', (event: any) => {
            const { selection, color } = event.detail;
            this.createHighlight(selection, color);
        });

        // 高亮更新事件
        document.addEventListener('highlight-update', (event: any) => {
            const { selection, color } = event.detail;
            if (selection.existingHighlight) {
                this.updateHighlight(selection.existingHighlight.id, { color });
            }
        });

        // 高亮删除事件
        document.addEventListener('highlight-delete', (event: any) => {
            const { highlightId } = event.detail;
            this.deleteHighlight(highlightId);
        });

        // 高亮点击事件
        document.addEventListener('highlight-clicked', (event: any) => {
            const { span, highlightId } = event.detail;
            this.handleHighlightClick(span, highlightId);
        });

        // 思源笔记事件
        document.addEventListener('click-editorcontent', () => {
            // 编辑器内容点击时，检查是否需要显示工具栏
            setTimeout(() => {
                this.selectionListener.checkSelection();
            }, 10);
        });
    }

    /**
     * 移除全局事件监听
     */
    private removeGlobalEvents(): void {
        // 在实际项目中需要保存事件处理器引用以正确移除
        // 这里简化处理
    }

    /**
     * 处理高亮点击
     */
    private handleHighlightClick(span: HTMLSpanElement, highlightId: string): void {
        // 创建虚拟选择来显示工具栏
        const highlight = this.dataManager.findHighlight(highlightId);
        if (!highlight) {
            return;
        }

        const blockElement = DOMUtils.findBlockElement(span);
        if (!blockElement) {
            return;
        }

        // 选中高亮文本
        const range = document.createRange();
        range.selectNodeContents(span);
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        // 创建选择信息
        const selectionInfo: ISelectionInfo = {
            text: span.textContent || '',
            selection: selection!,
            range,
            blockElement,
            blockId: highlight.blockId,
            isExistingHighlight: true,
            existingHighlight: highlight
        };

        // 显示工具栏
        this.floatingToolbar.show(selectionInfo);
    }

    /**
     * 验证选择
     */
    private validateSelection(selection: ISelectionInfo): boolean {
        if (!selection.text || selection.text.trim().length === 0) {
            return false;
        }

        if (!selection.blockId || !selection.blockElement) {
            return false;
        }

        return true;
    }

    /**
     * 获取统计信息
     */
    getStats(): {
        isInitialized: boolean;
        config: IHighlightConfig;
        modules: {
            dataManager: any;
            renderer: any;
            selectionListener: any;
            floatingToolbar: any;
        };
    } {
        return {
            isInitialized: this.isInitialized,
            config: this.config,
            modules: {
                dataManager: this.dataManager.getStats?.() || {},
                renderer: this.renderer.getStats?.() || {},
                selectionListener: this.selectionListener.getStats?.() || {},
                floatingToolbar: this.floatingToolbar.getStats?.() || {}
            }
        };
    }

    /**
     * 调试方法：手动渲染所有高亮
     */
    debugRenderAll(): void {
        if (!this.isInitialized) {
            return;
        }

        const blocks = document.querySelectorAll('[data-node-id]');
        blocks.forEach((block) => {
            this.renderer.renderBlockHighlights(block as HTMLElement);
        });

        console.log('[HighlightManager] 已重新渲染所有高亮');
    }

    /**
     * 调试方法：获取所有高亮数据
     */
    debugGetAllHighlights(): { [blockId: string]: IHighlightData[] } {
        const result: { [blockId: string]: IHighlightData[] } = {};
        
        const blocks = document.querySelectorAll('[data-node-id]');
        blocks.forEach((block) => {
            const blockId = DOMUtils.getBlockId(block as HTMLElement);
            if (blockId) {
                const highlights = this.getBlockHighlights(blockId);
                if (highlights.length > 0) {
                    result[blockId] = highlights;
                }
            }
        });

        return result;
    }
}

