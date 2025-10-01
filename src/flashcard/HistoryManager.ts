/**
 * 历史记录管理器 - 负责闪卡筛选历史的增删改查和智能管理
 */

import { FlashcardFilter, FlashcardQuickSwitchData, ErrorCode } from './types';
import { DataPersistence } from './DataPersistence';

export class HistoryManager {
    private dataPersistence: DataPersistence;
    private data: FlashcardQuickSwitchData;
    private isLoaded: boolean = false;
    private saveTimeout: NodeJS.Timeout | null = null;

    constructor(pluginDataDir?: string) {
        // pluginDataDir参数保留用于兼容性，但DataPersistence现在使用localStorage
        this.dataPersistence = new DataPersistence();
    }

    /**
     * 初始化历史管理器
     */
    async initialize(): Promise<void> {
        try {
            console.log('[HistoryManager] 正在初始化...');
            this.data = await this.dataPersistence.loadData();
            this.isLoaded = true;
            console.log(`[HistoryManager] 初始化完成，加载了 ${this.data.filters.length} 条历史记录`);
        } catch (error) {
            console.error('[HistoryManager] 初始化失败:', error);
            // 使用默认数据，确保功能可用
            this.data = {
                version: '1.0.0',
                filters: [],
                maxCount: 10
            };
            this.isLoaded = true;
            throw new Error(`${ErrorCode.INIT_FAILED}: ${error.message}`);
        }
    }

    /**
     * 添加或更新筛选记录
     */
    async addFilter(filterInfo: {
        id: string;
        name: string;
        type: 'doc' | 'notebook';
    }): Promise<boolean> {
        if (!this.isLoaded) {
            console.warn('[HistoryManager] 管理器未初始化');
            return false;
        }

        try {
            const existingIndex = this.data.filters.findIndex(f => f.id === filterInfo.id);
            
            if (existingIndex !== -1) {
                // 更新现有记录
                const existing = this.data.filters[existingIndex];
                existing.useCount++;
                existing.lastUsed = Date.now();
                existing.name = filterInfo.name; // 更新可能变化的名称
                
                console.log(`[HistoryManager] 更新现有记录: ${filterInfo.name} (使用次数: ${existing.useCount})`);
            } else {
                // 检查是否可以添加新记录
                const pinnedCount = this.data.filters.filter(f => f.isPinned).length;
                
                if (pinnedCount >= this.data.maxCount) {
                    console.log('[HistoryManager] 所有位置都被固定，无法添加新记录');
                    return false;
                }

                // 如果已达到上限，移除最旧的非固定记录
                if (this.data.filters.length >= this.data.maxCount) {
                    this.removeOldestUnpinned();
                }

                // 添加新记录
                const newFilter: FlashcardFilter = {
                    id: filterInfo.id,
                    name: filterInfo.name,
                    type: filterInfo.type,
                    useCount: 1,
                    isPinned: false,
                    lastUsed: Date.now(),
                    createdAt: Date.now()
                };

                this.data.filters.push(newFilter);
                console.log(`[HistoryManager] 添加新记录: ${filterInfo.name}`);
            }

            this.sortFilters();
            await this.saveDataDebounced();
            return true;

        } catch (error) {
            console.error('[HistoryManager] 添加筛选记录失败:', error);
            return false;
        }
    }

    /**
     * 删除筛选记录
     */
    async removeFilter(filterId: string): Promise<boolean> {
        if (!this.isLoaded) {
            console.warn('[HistoryManager] 管理器未初始化');
            return false;
        }

        try {
            const index = this.data.filters.findIndex(f => f.id === filterId);
            if (index === -1) {
                console.warn(`[HistoryManager] 未找到要删除的记录: ${filterId}`);
                return false;
            }

            const removed = this.data.filters.splice(index, 1)[0];
            console.log(`[HistoryManager] 删除记录: ${removed.name}`);
            
            await this.saveDataDebounced();
            return true;

        } catch (error) {
            console.error('[HistoryManager] 删除筛选记录失败:', error);
            return false;
        }
    }

    /**
     * 切换筛选记录的固定状态
     */
    async togglePin(filterId: string): Promise<boolean> {
        if (!this.isLoaded) {
            console.warn('[HistoryManager] 管理器未初始化');
            return false;
        }

        try {
            const filter = this.data.filters.find(f => f.id === filterId);
            if (!filter) {
                console.warn(`[HistoryManager] 未找到要固定的记录: ${filterId}`);
                return false;
            }

            filter.isPinned = !filter.isPinned;
            const action = filter.isPinned ? '固定' : '取消固定';
            console.log(`[HistoryManager] ${action}记录: ${filter.name}`);
            
            this.sortFilters();
            await this.saveDataDebounced();
            return true;

        } catch (error) {
            console.error('[HistoryManager] 切换固定状态失败:', error);
            return false;
        }
    }

    /**
     * 增加使用次数
     */
    async incrementUseCount(filterId: string): Promise<void> {
        if (!this.isLoaded) return;

        const filter = this.data.filters.find(f => f.id === filterId);
        if (filter) {
            filter.useCount++;
            filter.lastUsed = Date.now();
            this.sortFilters();
            await this.saveDataDebounced();
        }
    }

    /**
     * 获取所有筛选记录
     */
    getFilters(): FlashcardFilter[] {
        if (!this.isLoaded) return [];
        return [...this.data.filters]; // 返回副本，防止外部修改
    }

    /**
     * 根据ID获取筛选记录
     */
    getFilter(filterId: string): FlashcardFilter | undefined {
        if (!this.isLoaded) return undefined;
        return this.data.filters.find(f => f.id === filterId);
    }

    /**
     * 获取固定的筛选记录
     */
    getPinnedFilters(): FlashcardFilter[] {
        if (!this.isLoaded) return [];
        return this.data.filters.filter(f => f.isPinned);
    }

    /**
     * 获取非固定的筛选记录
     */
    getUnpinnedFilters(): FlashcardFilter[] {
        if (!this.isLoaded) return [];
        return this.data.filters.filter(f => !f.isPinned);
    }

    /**
     * 获取统计信息
     */
    getStats(): {
        total: number;
        pinned: number;
        unpinned: number;
        maxCount: number;
        canAddNew: boolean;
    } {
        if (!this.isLoaded) {
            return { total: 0, pinned: 0, unpinned: 0, maxCount: 10, canAddNew: false };
        }

        const pinned = this.data.filters.filter(f => f.isPinned).length;
        const total = this.data.filters.length;

        return {
            total,
            pinned,
            unpinned: total - pinned,
            maxCount: this.data.maxCount,
            canAddNew: pinned < this.data.maxCount
        };
    }

    /**
     * 清空所有历史记录（保留固定的）
     */
    async clearHistory(keepPinned: boolean = true): Promise<void> {
        if (!this.isLoaded) return;

        try {
            if (keepPinned) {
                this.data.filters = this.data.filters.filter(f => f.isPinned);
                console.log('[HistoryManager] 清空历史记录（保留固定项）');
            } else {
                this.data.filters = [];
                console.log('[HistoryManager] 清空所有历史记录');
            }

            await this.saveDataDebounced();

        } catch (error) {
            console.error('[HistoryManager] 清空历史记录失败:', error);
        }
    }

    /**
     * 清理数据（插件卸载时调用）
     */
    async cleanup(): Promise<void> {
        try {
            // 清除延时保存
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = null;
            }

            // 清理数据文件
            await this.dataPersistence.cleanupData();
            console.log('[HistoryManager] 清理完成');

        } catch (error) {
            console.error('[HistoryManager] 清理失败:', error);
        }
    }

    /**
     * 导出数据
     */
    async exportData(): Promise<string> {
        return await this.dataPersistence.exportData();
    }

    /**
     * 导入数据
     */
    async importData(jsonString: string): Promise<void> {
        await this.dataPersistence.importData(jsonString);
        // 重新加载数据
        await this.initialize();
    }

    /**
     * 获取数据状态信息
     */
    async getDataInfo() {
        return await this.dataPersistence.getDataInfo();
    }

    /**
     * 排序筛选记录
     * 规则：固定项优先 > 使用频次降序 > 最近使用时间降序
     */
    private sortFilters(): void {
        this.data.filters.sort((a, b) => {
            // 1. 固定项优先
            if (a.isPinned !== b.isPinned) {
                return a.isPinned ? -1 : 1;
            }

            // 2. 按使用频次降序
            if (a.useCount !== b.useCount) {
                return b.useCount - a.useCount;
            }

            // 3. 按最近使用时间降序
            return b.lastUsed - a.lastUsed;
        });
    }

    /**
     * 移除最旧的非固定记录
     */
    private removeOldestUnpinned(): void {
        const unpinnedFilters = this.data.filters.filter(f => !f.isPinned);
        if (unpinnedFilters.length === 0) return;

        // 找到使用次数最少且最久未使用的记录
        const oldest = unpinnedFilters.reduce((prev, current) => {
            // 优先移除使用次数少的
            if (prev.useCount !== current.useCount) {
                return prev.useCount < current.useCount ? prev : current;
            }
            // 使用次数相同时，移除最久未使用的
            return prev.lastUsed < current.lastUsed ? prev : current;
        });

        const index = this.data.filters.indexOf(oldest);
        if (index !== -1) {
            this.data.filters.splice(index, 1);
            console.log(`[HistoryManager] 移除最旧记录: ${oldest.name} (使用次数: ${oldest.useCount})`);
        }
    }

    /**
     * 延时保存数据（防抖）
     */
    private async saveDataDebounced(): Promise<void> {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(async () => {
            try {
                await this.dataPersistence.saveData(this.data);
                this.saveTimeout = null;
            } catch (error) {
                console.error('[HistoryManager] 保存数据失败:', error);
            }
        }, 1000); // 1秒延时
    }

    /**
     * 立即保存数据
     */
    async saveImmediate(): Promise<void> {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        try {
            await this.dataPersistence.saveData(this.data);
        } catch (error) {
            console.error('[HistoryManager] 立即保存失败:', error);
            throw error;
        }
    }

    /**
     * 重置为默认配置
     */
    async reset(): Promise<void> {
        this.data = {
            version: '1.0.0',
            filters: [],
            maxCount: 10
        };

        try {
            await this.saveImmediate();
            console.log('[HistoryManager] 重置为默认配置');
        } catch (error) {
            console.error('[HistoryManager] 重置失败:', error);
            throw error;
        }
    }

    /**
     * 设置最大记录数量
     */
    async setMaxCount(maxCount: number): Promise<void> {
        if (maxCount < 1 || maxCount > 50) {
            throw new Error('最大记录数量必须在1-50之间');
        }

        this.data.maxCount = maxCount;

        // 如果当前记录超过新的限制，移除多余的非固定记录
        while (this.data.filters.length > maxCount) {
            const unpinnedFilters = this.data.filters.filter(f => !f.isPinned);
            if (unpinnedFilters.length === 0) break; // 所有都是固定的，无法移除

            this.removeOldestUnpinned();
        }

        await this.saveDataDebounced();
        console.log(`[HistoryManager] 最大记录数量设置为: ${maxCount}`);
    }
}