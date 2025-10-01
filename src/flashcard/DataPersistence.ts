/**
 * 数据持久化模块 - 负责闪卡快切数据的存储和读取
 */

import { FlashcardQuickSwitchData, FlashcardFilter, DATA_VERSION, ErrorCode } from './types';

export class DataPersistence {
    private storageKey: string = 'flashcard-quick-switch';

    constructor() {
        // 使用localStorage作为主要存储方式
        this.storageKey = 'flashcard-quick-switch';
    }

    /**
     * 加载闪卡快切数据
     */
    async loadData(): Promise<FlashcardQuickSwitchData> {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            if (!storedData) {
                console.log('[DataPersistence] 未找到存储数据，返回默认数据');
                return this.createDefaultData();
            }

            const data = JSON.parse(storedData);
            console.log('[DataPersistence] 成功加载数据:', data);
            return this.validateAndMigrateData(data);

        } catch (error) {
            console.error(`[DataPersistence] 加载数据失败:`, error);
            // 返回默认数据，避免功能完全失效
            return this.createDefaultData();
        }
    }

    /**
     * 保存闪卡快切数据
     */
    async saveData(data: FlashcardQuickSwitchData): Promise<void> {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            localStorage.setItem(this.storageKey, jsonString);
            console.log('[DataPersistence] 数据保存成功:', data);

        } catch (error) {
            console.error(`[DataPersistence] 保存数据失败:`, error);
            throw new Error(`${ErrorCode.DATA_SAVE_FAILED}: ${error.message}`);
        }
    }

    /**
     * 清理数据文件（插件卸载时调用）
     */
    async cleanupData(): Promise<void> {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('[DataPersistence] 数据清理完成');

        } catch (error) {
            console.error(`[DataPersistence] 清理数据失败:`, error);
            // 清理失败不应该阻止插件卸载
        }
    }

    /**
     * 备份当前数据
     */
    async backupData(): Promise<void> {
        try {
            const data = await this.loadData();
            const backupKey = `${this.storageKey}.backup.${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify(data, null, 2));
            console.log('[DataPersistence] 数据备份成功:', backupKey);

        } catch (error) {
            console.error(`[DataPersistence] 备份数据失败:`, error);
        }
    }

    /**
     * 创建默认数据
     */
    private createDefaultData(): FlashcardQuickSwitchData {
        return {
            version: DATA_VERSION,
            filters: [],
            maxCount: 10
        };
    }

    /**
     * 验证和迁移数据格式
     */
    private validateAndMigrateData(data: any): FlashcardQuickSwitchData {
        // 基本结构验证
        if (!data || typeof data !== 'object') {
            console.warn('[DataPersistence] 数据格式无效，使用默认数据');
            return this.createDefaultData();
        }

        // 版本检查和迁移
        const validatedData: FlashcardQuickSwitchData = {
            version: data.version || DATA_VERSION,
            maxCount: typeof data.maxCount === 'number' ? data.maxCount : 10,
            filters: []
        };

        // 验证筛选记录
        if (Array.isArray(data.filters)) {
            validatedData.filters = data.filters
                .filter(this.isValidFilter)
                .map(this.normalizeFilter);
        }

        // 限制数量
        if (validatedData.filters.length > validatedData.maxCount) {
            validatedData.filters = validatedData.filters.slice(0, validatedData.maxCount);
        }

        return validatedData;
    }

    /**
     * 验证筛选记录是否有效
     */
    private isValidFilter(filter: any): boolean {
        return (
            filter &&
            typeof filter.id === 'string' &&
            typeof filter.name === 'string' &&
            (filter.type === 'doc' || filter.type === 'notebook') &&
            typeof filter.useCount === 'number' &&
            typeof filter.isPinned === 'boolean' &&
            typeof filter.lastUsed === 'number' &&
            typeof filter.createdAt === 'number'
        );
    }

    /**
     * 标准化筛选记录格式
     */
    private normalizeFilter(filter: any): FlashcardFilter {
        return {
            id: String(filter.id).trim(),
            name: String(filter.name).trim(),
            type: filter.type,
            useCount: Math.max(0, Number(filter.useCount) || 0),
            isPinned: Boolean(filter.isPinned),
            lastUsed: Number(filter.lastUsed) || Date.now(),
            createdAt: Number(filter.createdAt) || Date.now()
        };
    }


    /**
     * 导出数据为JSON字符串
     */
    async exportData(): Promise<string> {
        const data = await this.loadData();
        return JSON.stringify(data, null, 2);
    }

    /**
     * 从JSON字符串导入数据
     */
    async importData(jsonString: string): Promise<void> {
        try {
            const data = JSON.parse(jsonString);
            const validatedData = this.validateAndMigrateData(data);
            await this.saveData(validatedData);
            console.log('[DataPersistence] 数据导入成功');
        } catch (error) {
            console.error('[DataPersistence] 数据导入失败:', error);
            throw new Error(`导入数据失败: ${error.message}`);
        }
    }

    /**
     * 获取数据文件状态信息
     */
    async getDataInfo(): Promise<{
        exists: boolean;
        size?: number;
        lastModified?: number;
        filterCount?: number;
    }> {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            if (!storedData) {
                return { exists: false };
            }

            const data = await this.loadData();
            return {
                exists: true,
                size: storedData.length,
                lastModified: Date.now(), // localStorage没有时间戳，使用当前时间
                filterCount: data.filters.length
            };

        } catch (error) {
            console.error('[DataPersistence] 获取数据信息失败:', error);
            return { exists: false };
        }
    }
}