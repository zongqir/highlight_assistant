/**
 * 闪卡快切主管理器 - 整个功能的核心控制器
 */

import { HistoryManager } from './HistoryManager';
import { UIManager } from './UIManager';
import { FlashcardMonitor } from './FlashcardMonitor';
import { 
    FlashcardFilter, 
    QuickSwitchConfig, 
    DEFAULT_CONFIG, 
    ErrorCode,
    FilterEvent,
    FlashcardPanelInfo 
} from './types';

export class FlashcardQuickSwitchManager {
    private historyManager: HistoryManager;
    private uiManager: UIManager;
    private monitor: FlashcardMonitor;
    private config: QuickSwitchConfig;
    private isInitialized: boolean = false;
    private isEnabled: boolean = false;
    constructor(config: Partial<QuickSwitchConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        // 初始化子模块
        this.historyManager = new HistoryManager();
        this.uiManager = new UIManager(this.historyManager, this.config);
        this.monitor = new FlashcardMonitor();

        console.log('[FlashcardQuickSwitchManager] 主管理器已创建');
    }

    /**
     * 初始化管理器
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.warn('[FlashcardQuickSwitchManager] 管理器已经初始化');
            return;
        }

        try {
            console.log('[FlashcardQuickSwitchManager] 正在初始化...');

            // 初始化历史管理器
            await this.historyManager.initialize();
            
            // 设置UI管理器回调
            this.uiManager.setFilterSwitchCallback(this.handleFilterSwitch.bind(this));
            this.uiManager.setOpenFlashcardCallback(this.openFlashcardReview.bind(this));
            
            // 设置监听器回调
            this.monitor.setFilterCallback(this.handleFilterEvent.bind(this));
            this.monitor.setPanelCallback(this.handlePanelDetected.bind(this));

            this.isInitialized = true;
            
            // 如果配置启用，则开始运行
            if (this.config.enabled) {
                await this.enable();
            }

            console.log('[FlashcardQuickSwitchManager] 初始化完成');

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 初始化失败:', error);
            throw new Error(`${ErrorCode.INIT_FAILED}: ${error.message}`);
        }
    }

    /**
     * 启用功能
     */
    async enable(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('管理器未初始化');
        }

        if (this.isEnabled) {
            console.warn('[FlashcardQuickSwitchManager] 功能已经启用');
            return;
        }

        try {
            // 开始监听闪卡面板
            this.monitor.startMonitoring();
            this.isEnabled = true;
            
            // 立即显示小圆球（无论是否有闪卡面板）
            this.showQuickSwitchBallAlways();
            
            console.log('[FlashcardQuickSwitchManager] 功能已启用，小圆球已显示');

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 启用功能失败:', error);
            throw error;
        }
    }

    /**
     * 禁用功能
     */
    disable(): void {
        if (!this.isEnabled) return;

        try {
            // 停止监听
            this.monitor.stopMonitoring();
            
            // 隐藏UI
            this.uiManager.hideQuickSwitchBall();
            
            this.isEnabled = false;
            console.log('[FlashcardQuickSwitchManager] 功能已禁用');

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 禁用功能失败:', error);
        }
    }

    /**
     * 更新配置
     */
    async updateConfig(newConfig: Partial<QuickSwitchConfig>): Promise<void> {
        try {
            this.config = { ...this.config, ...newConfig };
            
            // 更新UI配置
            this.uiManager.updateConfig(newConfig);
            
            // 如果启用状态发生变化
            if ('enabled' in newConfig) {
                if (newConfig.enabled && !this.isEnabled) {
                    await this.enable();
                } else if (!newConfig.enabled && this.isEnabled) {
                    this.disable();
                }
            }

            // 如果最大记录数发生变化
            if ('maxHistory' in newConfig && newConfig.maxHistory) {
                await this.historyManager.setMaxCount(newConfig.maxHistory);
            }

            console.log('[FlashcardQuickSwitchManager] 配置已更新');

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 更新配置失败:', error);
            throw error;
        }
    }

    /**
     * 获取当前配置
     */
    getConfig(): QuickSwitchConfig {
        return { ...this.config };
    }

    /**
     * 获取历史记录统计
     */
    getHistoryStats() {
        return this.historyManager.getStats();
    }

    /**
     * 获取所有筛选记录
     */
    getFilters(): FlashcardFilter[] {
        return this.historyManager.getFilters();
    }

    /**
     * 手动添加筛选记录
     */
    async addFilter(filterInfo: {
        id: string;
        name: string;
        type: 'doc' | 'notebook';
    }): Promise<boolean> {
        try {
            const success = await this.historyManager.addFilter(filterInfo);
            if (success) {
                // 更新UI
                this.uiManager.updateHistoryPanel();
            }
            return success;

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 添加筛选记录失败:', error);
            return false;
        }
    }

    /**
     * 删除筛选记录
     */
    async removeFilter(filterId: string): Promise<boolean> {
        try {
            const success = await this.historyManager.removeFilter(filterId);
            if (success) {
                // 更新UI
                this.uiManager.updateHistoryPanel();
            }
            return success;

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 删除筛选记录失败:', error);
            return false;
        }
    }

    /**
     * 切换筛选记录固定状态
     */
    async togglePinFilter(filterId: string): Promise<boolean> {
        try {
            const success = await this.historyManager.togglePin(filterId);
            if (success) {
                // 更新UI
                this.uiManager.updateHistoryPanel();
            }
            return success;

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 切换固定状态失败:', error);
            return false;
        }
    }

    /**
     * 清空历史记录
     */
    async clearHistory(keepPinned: boolean = true): Promise<void> {
        try {
            await this.historyManager.clearHistory(keepPinned);
            
            // 更新UI
            this.uiManager.updateHistoryPanel();
            
            console.log('[FlashcardQuickSwitchManager] 历史记录已清空');

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 清空历史记录失败:', error);
            throw error;
        }
    }

    /**
     * 导出数据
     */
    async exportData(): Promise<string> {
        try {
            return await this.historyManager.exportData();
        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 导出数据失败:', error);
            throw error;
        }
    }

    /**
     * 导入数据
     */
    async importData(jsonString: string): Promise<void> {
        try {
            await this.historyManager.importData(jsonString);
            
            // 更新UI
            this.uiManager.updateHistoryPanel();
            
            console.log('[FlashcardQuickSwitchManager] 数据导入完成');

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 导入数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取状态信息
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            enabled: this.isEnabled,
            config: this.config,
            historyStats: this.historyManager.getStats(),
            monitorStatus: this.monitor.getStatus(),
            uiState: this.uiManager.getState()
        };
    }

    /**
     * 手动触发筛选检测
     */
    manualTriggerCheck(): void {
        if (this.isEnabled) {
            this.monitor.manualTriggerCheck();
        }
    }

    /**
     * 销毁管理器
     */
    async destroy(): Promise<void> {
        try {
            console.log('[FlashcardQuickSwitchManager] 正在销毁管理器...');

            // 禁用功能
            this.disable();

            // 清理子模块
            this.monitor.destroy();
            this.uiManager.destroy();
            await this.historyManager.cleanup();

            this.isInitialized = false;
            this.isEnabled = false;

            console.log('[FlashcardQuickSwitchManager] 管理器已销毁');

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 销毁管理器失败:', error);
        }
    }

    /**
     * 处理筛选事件
     */
    private async handleFilterEvent(event: FilterEvent): Promise<void> {
        try {
            console.log(`[FlashcardQuickSwitchManager] 处理筛选事件:`, event);

            // 添加到历史记录
            const success = await this.historyManager.addFilter({
                id: event.filterId,
                name: event.filterName,
                type: event.filterType
            });

            if (success) {
                // 更新UI
                this.uiManager.updateHistoryPanel();
                console.log(`[FlashcardQuickSwitchManager] 已记录筛选: ${event.filterName}`);
            }

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 处理筛选事件失败:', error);
        }
    }

    /**
     * 始终显示小圆球（无论是否有闪卡面板）
     */
    private showQuickSwitchBallAlways(): void {
        try {
            console.log('[FlashcardQuickSwitchManager] 显示小圆球（智能交互模式）');
            
            // 创建一个虚拟的面板引用用于位置定位，如果没有真实面板的话
            let referenceElement: Element = document.body;
            
            // 尝试找到现有的闪卡面板作为参考
            const existingPanel = document.querySelector('[data-key="dialog-opencard"], [data-key="dialog-viewcards"], .card__main');
            if (existingPanel) {
                referenceElement = existingPanel;
                console.log('[FlashcardQuickSwitchManager] 找到现有闪卡面板作为参考位置');
            } else {
                console.log('[FlashcardQuickSwitchManager] 未找到闪卡面板，将小圆球定位到页面右侧');
            }
            
            this.uiManager.showQuickSwitchBall(referenceElement);
            
        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 显示小圆球失败:', error);
        }
    }

    /**
     * 处理面板检测
     */
    private handlePanelDetected(panelInfo: FlashcardPanelInfo): void {
        try {
            console.log(`[FlashcardQuickSwitchManager] 检测到闪卡面板: ${panelInfo.type}`);

            // 如果小圆球还没显示，则显示它
            // 注意：由于我们现在在启用时就显示小圆球，这里主要是确保位置更新
            if (this.config.enabled && this.isEnabled) {
                // 更新小圆球的位置参考
                this.uiManager.showQuickSwitchBall(panelInfo.panel);
            }

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 处理面板检测失败:', error);
        }
    }

    /**
     * 处理筛选切换
     */
    private async handleFilterSwitch(filter: FlashcardFilter): Promise<void> {
        try {
            console.log(`[FlashcardQuickSwitchManager] 切换筛选: ${filter.name}`);

            // 先让monitor重新检查面板状态
            this.monitor.manualTriggerCheck();
            
            // 等待一下让检查完成
            await new Promise(resolve => setTimeout(resolve, 100));

            // 查找当前的闪卡面板
            const panels = this.monitor.getCurrentPanels();
            console.log(`[FlashcardQuickSwitchManager] 当前检测到 ${panels.length} 个闪卡面板`);
            
            let activePanel = panels.find(p => p.filterButton);

            // 如果没找到活动面板，尝试重新查找
            if (!activePanel || !activePanel.filterButton) {
                console.warn('[FlashcardQuickSwitchManager] 未找到活动面板，尝试重新检测...');
                
                // 强制重新检测页面上的所有闪卡面板
                this.monitor.manualTriggerCheck();
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const retryPanels = this.monitor.getCurrentPanels();
                activePanel = retryPanels.find(p => p.filterButton);
                
                console.log(`[FlashcardQuickSwitchManager] 重新检测后找到 ${retryPanels.length} 个面板`);
            }

            if (!activePanel || !activePanel.filterButton) {
                console.error('[FlashcardQuickSwitchManager] 仍未找到活动的闪卡面板，显示提示通知');
                
                // 显示友好的提示而不是抛出错误
                this.showSwitchNotification(filter, false);
                return;
            }

            console.log(`[FlashcardQuickSwitchManager] 找到活动面板，开始执行切换`);

            // 执行筛选切换
            const success = await this.executeFilterSwitch(activePanel.filterButton, filter);
            
            if (success) {
                console.log(`[FlashcardQuickSwitchManager] 筛选切换成功: ${filter.name}`);
            } else {
                console.error('[FlashcardQuickSwitchManager] 筛选切换失败');
            }

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 处理筛选切换失败:', error);
            
            // 不抛出错误，而是显示友好的通知
            this.showSwitchNotification(filter, false);
        }
    }

    /**
     * 执行筛选切换
     */
    private async executeFilterSwitch(filterButton: Element, filter: FlashcardFilter): Promise<boolean> {
        try {
            console.log(`[FlashcardQuickSwitchManager] 开始执行筛选切换: ${filter.name}`);
            
            // 1. 更新按钮属性
            filterButton.setAttribute('data-id', filter.id);
            filterButton.setAttribute('data-cardtype', filter.type);

            // 2. 查找闪卡容器和相关元素
            const cardContainer = filterButton.closest('[data-key="dialog-opencard"], [data-key="dialog-viewcards"], .card__main');
            if (!cardContainer) {
                throw new Error('未找到闪卡容器');
            }

            // 3. 调用思源API获取筛选后的闪卡数据
            const apiEndpoint = filter.type === 'doc' 
                ? '/api/riff/getTreeRiffDueCards'
                : '/api/riff/getNotebookRiffDueCards';
                
            const requestBody = filter.type === 'doc' 
                ? { rootID: filter.id }
                : { notebook: filter.id };

            console.log(`[FlashcardQuickSwitchManager] 调用API: ${apiEndpoint}`, requestBody);

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API调用失败: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.code !== 0) {
                throw new Error(`API返回错误: ${result.msg || 'Unknown error'}`);
            }

            console.log(`[FlashcardQuickSwitchManager] API调用成功，获取到 ${result.data?.cards?.length || 0} 张闪卡`);

            // 4. 基于思源源码分析，直接模拟fetchNewRound的核心逻辑
            let refreshTriggered = false;

            console.log('[FlashcardQuickSwitchManager] 尝试触发思源内部的刷新机制');

            try {
                console.log('[FlashcardQuickSwitchManager] 尝试关闭并重新打开闪卡面板以应用新筛选');
                
                // 查找关闭按钮 - 尝试多种可能的选择器
                const closeBtnSelectors = [
                    '[data-type="close"]',
                    '.b3-dialog__close',
                    '.dialog__close', 
                    '.fn__close',
                    '.b3-button[data-type="close"]',
                    'button[aria-label*="关闭"]',
                    'button[title*="关闭"]',
                    '.dialog .b3-button--cancel',
                    '[data-key="close"]'
                ];
                
                let closeBtn: Element | null = null;
                
                for (const selector of closeBtnSelectors) {
                    closeBtn = cardContainer.querySelector(selector);
                    if (closeBtn) {
                        console.log(`[FlashcardQuickSwitchManager] 找到关闭按钮: ${selector}`);
                        break;
                    }
                }
                
                if (!closeBtn) {
                    // 如果在容器内找不到，尝试在全局查找
                    for (const selector of closeBtnSelectors) {
                        closeBtn = document.querySelector(selector);
                        if (closeBtn && closeBtn.closest('.b3-dialog--open')) {
                            console.log(`[FlashcardQuickSwitchManager] 在全局找到关闭按钮: ${selector}`);
                            break;
                        }
                    }
                }
                if (closeBtn) {
                    console.log('[FlashcardQuickSwitchManager] 找到关闭按钮，准备关闭面板');
                    
                    // 关闭当前面板
                    closeBtn.dispatchEvent(new MouseEvent('click', { 
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }));
                    
                    console.log('[FlashcardQuickSwitchManager] 闪卡面板关闭命令已发送');
                    
                    // 延迟重新打开闪卡面板，让新的筛选设置生效
                    setTimeout(() => {
                        console.log('[FlashcardQuickSwitchManager] 准备重新打开闪卡面板');
                        this.reopenFlashcardPanel();
                        
                        // 面板重新打开后，再次确保筛选设置正确应用
                        setTimeout(() => {
                            this.ensureFilterSettingsApplied(filter);
                        }, 2000); // 给面板足够时间初始化
                    }, 800); // 增加延迟确保面板完全关闭
                    
                    // 认为这种方式可能成功
                    refreshTriggered = true;
                    
                } else {
                    console.warn('[FlashcardQuickSwitchManager] 未找到关闭按钮，尝试其他方式');
                    
                    // 尝试键盘快捷键关闭
                    const escEvent = new KeyboardEvent('keydown', {
                        key: 'Escape',
                        code: 'Escape',
                        keyCode: 27,
                        bubbles: true,
                        cancelable: true
                    });
                    
                    cardContainer.dispatchEvent(escEvent);
                    console.log('[FlashcardQuickSwitchManager] 触发ESC键关闭面板');
                    
                    // 延迟重新打开
                    setTimeout(() => {
                        this.reopenFlashcardPanel();
                    }, 800);
                    
                    // 这种方式成功率较低
                    refreshTriggered = false;
                }
                
            } catch (error) {
                console.error('[FlashcardQuickSwitchManager] 重新打开面板失败:', error);
                refreshTriggered = false;
            }

            // 5. 显示结果通知（无论刷新是否成功）
            console.log('[FlashcardQuickSwitchManager] 筛选切换处理完成');
            this.showSwitchNotification(filter, refreshTriggered);

            return true;

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 执行筛选切换失败:', error);
            
            // 降级策略: 提示用户手动刷新
            this.showSwitchNotification(filter, false);
            return false;
        }
    }


    /**
     * 重新打开闪卡面板
     */
    private reopenFlashcardPanel(): void {
        try {
            console.log('[FlashcardQuickSwitchManager] 尝试重新打开闪卡面板');
            
            // 方法1: 使用正确的Alt+0快捷键（基于思源源码分析）
            console.log('[FlashcardQuickSwitchManager] 方法1: 使用Alt+0快捷键打开闪卡复习');
            const altZeroEvent = new KeyboardEvent('keydown', {
                key: '0',
                code: 'Digit0',
                keyCode: 48,
                altKey: true,
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(altZeroEvent);
            console.log('[FlashcardQuickSwitchManager] Alt+0快捷键已发送');
            
            // 方法1b: 如果快捷键不起作用，查找"间隔重复"菜单项
            setTimeout(() => {
                console.log('[FlashcardQuickSwitchManager] 备选：查找间隔重复菜单项');
                
                const menuItems = document.querySelectorAll('.b3-menu__item');
                for (const menuItem of menuItems) {
                    const text = menuItem.textContent?.trim() || '';
                    const menuId = menuItem.getAttribute('id');
                    
                    // 查找正确的菜单项：spaceRepetition（间隔重复）
                    if (menuId === 'spaceRepetition' || 
                        text.includes('间隔重复') || 
                        text.includes('Space Repetition') ||
                        text.includes('复习')) {
                        
                        console.log(`[FlashcardQuickSwitchManager] 找到间隔重复菜单: "${text}", id: "${menuId}"`);
                        
                        menuItem.dispatchEvent(new MouseEvent('click', { 
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }));
                        break;
                    }
                }
            }, 300);
            
            // 方法2: 如果Alt+0不起作用，尝试其他可能的快捷键
            setTimeout(() => {
                console.log('[FlashcardQuickSwitchManager] 方法2: 尝试其他可能的快捷键');
                
                // 基于源码，主要是Alt+0，但也尝试一些常见的组合
                const backupShortcuts = [
                    { key: 'R', ctrlKey: true, shiftKey: true, name: 'Ctrl+Shift+R' },
                    { key: 'F9', name: 'F9' },
                ];
                
                backupShortcuts.forEach((shortcut, index) => {
                    setTimeout(() => {
                        console.log(`[FlashcardQuickSwitchManager] 备选快捷键: ${shortcut.name}`);
                        
                        const event = new KeyboardEvent('keydown', {
                            key: shortcut.key,
                            ctrlKey: shortcut.ctrlKey || false,
                            shiftKey: shortcut.shiftKey || false,
                            bubbles: true,
                            cancelable: true
                        });
                        
                        document.dispatchEvent(event);
                    }, index * 200);
                });
            }, 600);
            
            console.log('[FlashcardQuickSwitchManager] 重新打开闪卡面板的尝试已完成');
            
        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 重新打开闪卡面板失败:', error);
        }
    }

    /**
     * 确保筛选设置在面板重新打开后正确应用
     */
    private ensureFilterSettingsApplied(filter: FlashcardFilter): void {
        try {
            console.log(`[FlashcardQuickSwitchManager] 确保筛选设置正确应用: ${filter.name}`);
            
            // 重新检测面板
            this.monitor.manualTriggerCheck();
            
            setTimeout(() => {
                const panels = this.monitor.getCurrentPanels();
                console.log(`[FlashcardQuickSwitchManager] 重新打开后检测到 ${panels.length} 个面板`);
                
                const activePanel = panels.find(p => p.filterButton);
                
                if (activePanel && activePanel.filterButton) {
                    const currentId = activePanel.filterButton.getAttribute('data-id');
                    const currentType = activePanel.filterButton.getAttribute('data-cardtype');
                    
                    console.log(`[FlashcardQuickSwitchManager] 当前筛选设置: ID="${currentId}", Type="${currentType}"`);
                    console.log(`[FlashcardQuickSwitchManager] 期望筛选设置: ID="${filter.id}", Type="${filter.type}"`);
                    
                    // 如果设置不匹配，重新设置
                    if (currentId !== filter.id || currentType !== filter.type) {
                        console.log('[FlashcardQuickSwitchManager] 筛选设置不匹配，重新应用设置');
                        
                        // 更新筛选按钮属性
                        activePanel.filterButton.setAttribute('data-id', filter.id);
                        activePanel.filterButton.setAttribute('data-cardtype', filter.type);
                        
                        // 尝试触发筛选刷新 - 模拟用户点击筛选按钮
                        console.log('[FlashcardQuickSwitchManager] 尝试触发筛选刷新');
                        
                        // 方法1: 触发筛选按钮的各种事件
                        const events = ['change', 'input', 'blur', 'focus'];
                        events.forEach(eventType => {
                            activePanel.filterButton.dispatchEvent(new Event(eventType, { bubbles: true }));
                        });
                        
                        // 方法2: 尝试重新调用思源的openCard来应用筛选
                        setTimeout(() => {
                            console.log('[FlashcardQuickSwitchManager] 尝试使用Alt+0重新打开以应用筛选');
                            
                            // 先关闭当前面板
                            const currentCloseBtn = activePanel.panel.querySelector('[data-type="close"]');
                            if (currentCloseBtn) {
                                currentCloseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                                
                                // 延迟重新打开
                                setTimeout(() => {
                                    const altZeroEvent = new KeyboardEvent('keydown', {
                                        key: '0',
                                        code: 'Digit0',
                                        keyCode: 48,
                                        altKey: true,
                                        bubbles: true,
                                        cancelable: true
                                    });
                                    document.dispatchEvent(altZeroEvent);
                                    console.log('[FlashcardQuickSwitchManager] 重新发送Alt+0以应用筛选');
                                }, 300);
                            }
                        }, 500);
                        
                        console.log('[FlashcardQuickSwitchManager] 筛选设置重新应用完成');
                    } else {
                        console.log('[FlashcardQuickSwitchManager] 筛选设置已正确应用，无需更改');
                    }
                } else {
                    console.warn('[FlashcardQuickSwitchManager] 重新打开后未找到闪卡面板');
                }
            }, 500); // 给面板检测一些时间
            
        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 确保筛选设置应用失败:', error);
        }
    }

    /**
     * 打开闪卡复习
     */
    private openFlashcardReview(): void {
        try {
            console.log('[FlashcardQuickSwitchManager] 打开闪卡复习');
            
            // 使用正确的Alt+0快捷键（基于思源源码分析）
            const altZeroEvent = new KeyboardEvent('keydown', {
                key: '0',
                code: 'Digit0',
                keyCode: 48,
                altKey: true,
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(altZeroEvent);
            console.log('[FlashcardQuickSwitchManager] Alt+0快捷键已发送，正在打开闪卡复习');
            
            // 备选方案：如果Alt+0没有效果，才尝试菜单点击
            setTimeout(() => {
                // 检查是否已经有闪卡面板打开了
                const hasPanel = document.querySelector('[data-key="dialog-opencard"], [data-key="dialog-viewcards"], .card__main');
                
                if (!hasPanel) {
                    console.log('[FlashcardQuickSwitchManager] Alt+0未生效，尝试菜单点击');
                    
                    const menuItems = document.querySelectorAll('.b3-menu__item');
                    for (const menuItem of menuItems) {
                        const text = menuItem.textContent?.trim() || '';
                        const menuId = menuItem.getAttribute('id');
                        
                        if (menuId === 'spaceRepetition' || 
                            text.includes('间隔重复') || 
                            text.includes('Space Repetition') ||
                            text.includes('复习')) {
                            
                            console.log(`[FlashcardQuickSwitchManager] 找到间隔重复菜单: "${text}"`);
                            menuItem.dispatchEvent(new MouseEvent('click', { 
                                bubbles: true,
                                cancelable: true,
                                view: window
                            }));
                            break;
                        }
                    }
                } else {
                    console.log('[FlashcardQuickSwitchManager] Alt+0成功，闪卡面板已打开');
                }
            }, 500); // 增加延迟，确保Alt+0有足够时间生效
            
        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 打开闪卡复习失败:', error);
        }
    }

    /**
     * 显示切换通知
     */
    private showSwitchNotification(filter: FlashcardFilter, autoRefreshSuccess: boolean = false): void {
        try {
            // 创建通知元素
            const isSuccess = autoRefreshSuccess;
            const bgColor = isSuccess ? 'var(--b3-theme-primary, #4285f4)' : '#ff9800';
            const icon = isSuccess ? '✓' : '⚠';
            const title = isSuccess ? '筛选已切换' : '筛选已更新';
            const message = isSuccess ? '界面已自动刷新' : '请手动刷新界面查看结果';
            
            const notification = document.createElement('div');
            notification.innerHTML = `
                <div style="
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    background: linear-gradient(135deg, ${bgColor} 0%, ${bgColor}cc 100%);
                    color: white;
                    padding: 16px 20px;
                    border-radius: 12px;
                    box-shadow: 0 8px 25px rgba(66, 133, 244, 0.3), 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 9999;
                    font-size: 14px;
                    max-width: 350px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    backdrop-filter: blur(10px);
                    animation: slideInRight 0.3s ease-out;
                    cursor: pointer;
                ">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <div style="width: 22px; height: 22px; background: rgba(255,255,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">
                            ${icon}
                        </div>
                        <strong>${title}</strong>
                    </div>
                    <div style="margin-left: 32px; opacity: 0.95; line-height: 1.4; margin-bottom: 4px;">
                        ${filter.type === 'doc' ? '📄' : '📁'} ${filter.name}
                    </div>
                    <div style="margin-left: 32px; opacity: 0.8; font-size: 12px; line-height: 1.3;">
                        ${message}
                        ${!isSuccess ? '<br><small>💡 或尝试重新打开闪卡面板</small>' : ''}
                    </div>
                    ${!isSuccess ? `
                        <div style="margin-left: 32px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 11px; opacity: 0.7;">
                            <strong>调试信息：</strong> 数据已更新，但界面未自动刷新
                        </div>
                    ` : ''}
                </div>
                <style>
                    @keyframes slideInRight {
                        from {
                            opacity: 0;
                            transform: translateX(100px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }
                </style>
            `;

            document.body.appendChild(notification);

            // 如果自动刷新失败，添加点击刷新功能
            if (!autoRefreshSuccess) {
                const clickHandler = () => {
                    try {
                        console.log('[FlashcardQuickSwitchManager] 用户点击通知，尝试手动刷新');
                        
                        // 尝试重新载闪卡面板
                        const panels = this.monitor.getCurrentPanels();
                        const activePanel = panels.find(p => p.filterButton);
                        
                        if (activePanel && activePanel.panel) {
                            // 查找刷新按钮或重新打开面板
                            const closeBtn = activePanel.panel.querySelector('[data-type="close"]');
                            if (closeBtn) {
                                console.log('[FlashcardQuickSwitchManager] 关闭当前面板');
                                closeBtn.dispatchEvent(new MouseEvent('click'));
                                
                                // 延迟重新打开
                                setTimeout(() => {
                                    // 触发打开闪卡面板的快捷键 (Ctrl+Shift+R)
                                    const event = new KeyboardEvent('keydown', {
                                        key: 'R',
                                        ctrlKey: true,
                                        shiftKey: true,
                                        bubbles: true
                                    });
                                    document.dispatchEvent(event);
                                }, 500);
                            }
                        }
                        
                        // 移除通知
                        if (document.contains(notification)) {
                            notification.remove();
                        }
                        
                    } catch (error) {
                        console.error('[FlashcardQuickSwitchManager] 手动刷新失败:', error);
                    }
                };
                
                notification.addEventListener('click', clickHandler);
            }

            // 根据成功状态决定显示时长
            const displayTime = autoRefreshSuccess ? 3000 : 8000;
            
            setTimeout(() => {
                if (document.contains(notification)) {
                    notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (document.contains(notification)) {
                    notification.remove();
                }
                    }, 300);
                }
            }, displayTime);

            // 添加退场动画样式
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideOutRight {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                }
            `;
            document.head.appendChild(style);
            
            // 清理样式
            setTimeout(() => {
                if (document.contains(style)) {
                    style.remove();
                }
            }, 5000);

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 显示通知失败:', error);
        }
    }

    /**
     * 重置为默认状态
     */
    async reset(): Promise<void> {
        try {
            // 重置历史记录
            await this.historyManager.reset();
            
            // 重置配置
            this.config = { ...DEFAULT_CONFIG };
            this.uiManager.updateConfig(this.config);
            
            // 更新UI
            this.uiManager.updateHistoryPanel();
            
            console.log('[FlashcardQuickSwitchManager] 已重置为默认状态');

        } catch (error) {
            console.error('[FlashcardQuickSwitchManager] 重置失败:', error);
            throw error;
        }
    }
}