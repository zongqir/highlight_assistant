/**
 * 界面管理器 - 负责闪卡快切的UI组件创建和交互
 */

import { FlashcardFilter, QuickSwitchConfig, UIState, DEFAULT_CONFIG } from './types';
import { HistoryManager } from './HistoryManager';

export class UIManager {
    private historyManager: HistoryManager;
    private config: QuickSwitchConfig;
    private state: UIState;
    private ballElement: HTMLElement | null = null;
    private panelElement: HTMLElement | null = null;
    private currentFlashcardPanel: Element | null = null;
    private dragData: { 
        isDragging: boolean; 
        startX: number; 
        startY: number; 
        elementStartX: number; 
        elementStartY: number;
    } = { isDragging: false, startX: 0, startY: 0, elementStartX: 0, elementStartY: 0 };

    // 闪卡面板检测回调
    private onOpenFlashcard?: () => void;

    // 事件处理器
    private onFilterSwitch?: (filter: FlashcardFilter) => void;
    private eventListeners: Array<() => void> = [];

    constructor(historyManager: HistoryManager, config: QuickSwitchConfig = DEFAULT_CONFIG) {
        this.historyManager = historyManager;
        this.config = config;
        this.state = {
            ballVisible: false,
            panelVisible: false
        };

        this.setupEventListeners();
    }

    /**
     * 检测当前是否有活动的闪卡面板
     */
    private hasActiveFlashcardPanel(): boolean {
        // 检查多种可能的闪卡面板标识
        const flashcardSelectors = [
            '[data-key="dialog-opencard"]',
            '[data-key="dialog-viewcards"]',
            '.card__main',
            '.b3-dialog--open:has([data-type="filter"])',
            '.dialog:has(.protyle-content--transition)',
            '.b3-dialog:has(.card)',
        ];

        for (const selector of flashcardSelectors) {
            const panels = document.querySelectorAll(selector);
            if (panels.length > 0) {
                console.log(`[UIManager] 发现闪卡面板: ${selector} (${panels.length}个)`);
                return true;
            }
        }

        console.log('[UIManager] 未发现活动的闪卡面板');
        return false;
    }

    /**
     * 设置筛选切换回调
     */
    setFilterSwitchCallback(callback: (filter: FlashcardFilter) => void): void {
        this.onFilterSwitch = callback;
    }

    /**
     * 设置打开闪卡回调
     */
    setOpenFlashcardCallback(callback: () => void): void {
        this.onOpenFlashcard = callback;
    }

    /**
     * 显示快切小圆球
     */
    showQuickSwitchBall(flashcardPanel: Element): void {
        if (!this.config.enabled || this.state.ballVisible) return;

        try {
            this.currentFlashcardPanel = flashcardPanel;
            this.createFloatingBall();
            this.state.ballVisible = true;
            console.log('[UIManager] 显示快切小圆球');

        } catch (error) {
            console.error('[UIManager] 显示快切小圆球失败:', error);
        }
    }

    /**
     * 隐藏快切小圆球
     */
    hideQuickSwitchBall(): void {
        if (!this.state.ballVisible) return;

        try {
            this.hideHistoryPanel();
            
            if (this.ballElement) {
                this.ballElement.remove();
                this.ballElement = null;
            }

            this.currentFlashcardPanel = null;
            this.state.ballVisible = false;
            console.log('[UIManager] 隐藏快切小圆球');

        } catch (error) {
            console.error('[UIManager] 隐藏快切小圆球失败:', error);
        }
    }

    /**
     * 显示历史面板
     */
    showHistoryPanel(): void {
        if (this.state.panelVisible) return;

        try {
            this.createHistoryPanel();
            this.state.panelVisible = true;
            console.log('[UIManager] 显示历史面板');

        } catch (error) {
            console.error('[UIManager] 显示历史面板失败:', error);
        }
    }

    /**
     * 隐藏历史面板
     */
    hideHistoryPanel(): void {
        if (!this.state.panelVisible) return;

        try {
            if (this.panelElement) {
                this.panelElement.remove();
                this.panelElement = null;
            }

            this.state.panelVisible = false;
            console.log('[UIManager] 隐藏历史面板');

        } catch (error) {
            console.error('[UIManager] 隐藏历史面板失败:', error);
        }
    }

    /**
     * 更新历史面板内容
     */
    updateHistoryPanel(): void {
        if (!this.state.panelVisible || !this.panelElement) return;

        try {
            const filterListElement = this.panelElement.querySelector('.filter-list');
            if (filterListElement) {
                filterListElement.innerHTML = this.renderFilterItems();
                this.attachPanelEventListeners();
            }

            const footerElement = this.panelElement.querySelector('.panel-footer small');
            if (footerElement) {
                footerElement.textContent = this.getCountInfo();
            }

        } catch (error) {
            console.error('[UIManager] 更新历史面板失败:', error);
        }
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<QuickSwitchConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // 重新应用位置
        if (this.ballElement && newConfig.ballPosition) {
            this.ballElement.style.top = `${newConfig.ballPosition.y}px`;
            this.ballElement.style.right = `${newConfig.ballPosition.x}px`;
        }
    }

    /**
     * 获取当前状态
     */
    getState(): UIState {
        return { ...this.state };
    }

    /**
     * 销毁UI管理器
     */
    destroy(): void {
        this.hideQuickSwitchBall();
        this.removeEventListeners();
        console.log('[UIManager] UI管理器已销毁');
    }

    /**
     * 创建小圆球浮窗
     */
    private createFloatingBall(): void {
        if (this.ballElement) return;

        const ball = document.createElement('div');
        ball.className = 'flashcard-quick-switch-ball';
        ball.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20">
                <use xlink:href="#iconRiffCard"></use>
            </svg>
        `;

        // 基础样式
        ball.style.cssText = `
            position: fixed;
            top: ${this.config.ballPosition.y}px;
            right: ${this.config.ballPosition.x}px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--b3-theme-primary, #4285f4) 0%, var(--b3-theme-primary-light, #5a95f5) 100%);
            color: white;
            cursor: pointer;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(66, 133, 244, 0.3), 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
            border: 2px solid rgba(255, 255, 255, 0.1);
        `;

        // 悬停效果
        ball.addEventListener('mouseenter', () => {
            ball.style.transform = 'scale(1.15) translateY(-2px)';
            ball.style.boxShadow = '0 8px 30px rgba(66, 133, 244, 0.4), 0 4px 12px rgba(0,0,0,0.15)';
        });

        ball.addEventListener('mouseleave', () => {
            if (!this.dragData.isDragging) {
                ball.style.transform = 'scale(1) translateY(0)';
                ball.style.boxShadow = '0 4px 20px rgba(66, 133, 244, 0.3), 0 2px 8px rgba(0,0,0,0.1)';
            }
        });

        // 点击事件 - 智能交互逻辑
        ball.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!this.dragData.isDragging) {
                // 检测当前是否有闪卡面板打开
                const hasFlashcardPanel = this.hasActiveFlashcardPanel();
                
                if (!hasFlashcardPanel) {
                    // 没有闪卡面板 → 打开闪卡复习
                    console.log('[UIManager] 未检测到闪卡面板，自动打开闪卡复习');
                    if (this.onOpenFlashcard) {
                        this.onOpenFlashcard();
                    }
                } else {
                    // 有闪卡面板 → 显示/隐藏快切面板
                    console.log('[UIManager] 检测到闪卡面板，切换快切面板显示');
                    if (this.state.panelVisible) {
                        this.hideHistoryPanel();
                    } else {
                        this.showHistoryPanel();
                    }
                }
            }
        });

        // 拖拽功能
        if (this.config.enableDrag) {
            this.attachDragListeners(ball);
        }

        document.body.appendChild(ball);
        this.ballElement = ball;

        // 添加CSS动画
        ball.animate([
            { opacity: 0, transform: 'scale(0.5)' },
            { opacity: 1, transform: 'scale(1)' }
        ], {
            duration: 200,
            easing: 'ease-out'
        });
    }

    /**
     * 创建历史面板
     */
    private createHistoryPanel(): void {
        if (this.panelElement) return;

        const panel = document.createElement('div');
        panel.className = 'flashcard-quick-switch-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">
                    <svg viewBox="0 0 24 24" width="16" height="16" style="margin-right: 8px; vertical-align: -2px;">
                        <use xlink:href="#iconRiffCard"></use>
                    </svg>
                    <span>闪卡快切</span>
                </div>
                <button class="close-btn" title="关闭">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <use xlink:href="#iconClose"></use>
                    </svg>
                </button>
            </div>
            <div class="filter-list">
                ${this.renderFilterItems()}
            </div>
            <div class="panel-footer">
                <small class="count-info">${this.getCountInfo()}</small>
            </div>
        `;

        // 计算面板位置
        const ballRect = this.ballElement?.getBoundingClientRect();
        const panelWidth = 320;
        const panelHeight = Math.min(400, Math.max(200, this.historyManager.getFilters().length * 60 + 100));
        
        let left = (ballRect?.right || window.innerWidth - 20) - panelWidth;
        let top = (ballRect?.top || 150) + 50;

        // 确保面板在视窗内
        if (left < 10) left = 10;
        if (top + panelHeight > window.innerHeight - 10) {
            top = window.innerHeight - panelHeight - 10;
        }

        // 基础样式
        panel.style.cssText = `
            position: fixed;
            left: ${left}px;
            top: ${top}px;
            width: ${panelWidth}px;
            max-height: ${panelHeight}px;
            background: var(--b3-theme-background, #fff);
            border: 1px solid var(--b3-theme-surface-lighter, #e0e0e0);
            border-radius: 12px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.15), 0 4px 16px rgba(66,133,244,0.1);
            z-index: 1001;
            font-size: 13px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            backdrop-filter: blur(10px);
        `;

        document.body.appendChild(panel);
        this.panelElement = panel;

        // 添加事件监听
        this.attachPanelEventListeners();

        // 入场动画
        panel.animate([
            { opacity: 0, transform: 'translateY(-10px) scale(0.95)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
        ], {
            duration: 200,
            easing: 'ease-out'
        });

        // 点击外部关闭面板
        setTimeout(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (!panel.contains(e.target as Node) && 
                    !this.ballElement?.contains(e.target as Node)) {
                    this.hideHistoryPanel();
                    document.removeEventListener('click', handleClickOutside);
                }
            };
            document.addEventListener('click', handleClickOutside);
            this.eventListeners.push(() => document.removeEventListener('click', handleClickOutside));
        }, 100);
    }

    /**
     * 渲染筛选项列表
     */
    private renderFilterItems(): string {
        const filters = this.historyManager.getFilters();

        if (filters.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <div class="empty-text">暂无筛选历史</div>
                    <div class="empty-hint">使用闪卡筛选后会自动记录</div>
                    <style>
                        .empty-state {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            padding: 40px 20px;
                            text-align: center;
                            color: var(--b3-theme-on-surface-light, #666);
                        }
                        .empty-icon {
                            font-size: 32px;
                            margin-bottom: 12px;
                        }
                        .empty-text {
                            font-size: 14px;
                            font-weight: 500;
                            margin-bottom: 6px;
                        }
                        .empty-hint {
                            font-size: 12px;
                            opacity: 0.7;
                        }
                    </style>
                </div>
            `;
        }

        return filters.map(filter => `
            <div class="filter-item" data-id="${filter.id}" title="点击切换到此筛选">
                <div class="filter-info">
                    <div class="filter-name">
                        <span class="filter-icon">${filter.type === 'doc' ? '📄' : '📁'}</span>
                        <span class="filter-text">${this.truncateText(filter.name, 25)}</span>
                        ${filter.isPinned ? '<span class="pinned-indicator">📌</span>' : ''}
                    </div>
                    <div class="filter-meta">
                        ${this.config.showUsageCount ? `<span class="use-count">${filter.useCount}次</span>` : ''}
                        <span class="last-used">${this.formatTime(filter.lastUsed)}</span>
                    </div>
                </div>
                <div class="filter-actions">
                    <button class="pin-btn ${filter.isPinned ? 'pinned' : ''}" 
                            data-id="${filter.id}" 
                            title="${filter.isPinned ? '取消固定' : '固定'}">
                        📌
                    </button>
                    <button class="delete-btn" data-id="${filter.id}" title="删除">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('') + this.getPanelStyles();
    }

    /**
     * 获取面板样式
     */
    private getPanelStyles(): string {
        return `
            <style>
                .flashcard-quick-switch-panel {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                .panel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 18px;
                    border-bottom: 1px solid var(--b3-theme-surface, #f0f0f0);
                    background: linear-gradient(135deg, var(--b3-theme-primary, #4285f4) 0%, var(--b3-theme-primary-light, #5a95f5) 100%);
                    color: white;
                    border-radius: 8px 8px 0 0;
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15);
                }
                .panel-title {
                    font-weight: 600;
                    font-size: 14px;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .panel-title svg {
                    opacity: 0.9;
                }
                .close-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 50%;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    transition: all 0.2s ease;
                }
                .close-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.05);
                }
                .filter-list {
                    flex: 1;
                    overflow-y: auto;
                    max-height: 300px;
                }
                .filter-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--b3-theme-surface-lighter, #f0f0f0);
                    cursor: pointer;
                    transition: background-color 0.15s ease;
                }
                .filter-item:hover {
                    background: var(--b3-theme-surface, #f8f9fa);
                }
                .filter-item:last-child {
                    border-bottom: none;
                }
                .filter-info {
                    flex: 1;
                    min-width: 0;
                }
                .filter-name {
                    display: flex;
                    align-items: center;
                    margin-bottom: 4px;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--b3-theme-on-surface, #333);
                }
                .filter-icon {
                    margin-right: 8px;
                    font-size: 14px;
                }
                .filter-text {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .pinned-indicator {
                    margin-left: 6px;
                    font-size: 10px;
                    opacity: 0.7;
                }
                .filter-meta {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 11px;
                    color: var(--b3-theme-on-surface-light, #666);
                }
                .filter-actions {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-left: 12px;
                }
                .pin-btn, .delete-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 4px;
                    font-size: 12px;
                    opacity: 0.6;
                    transition: all 0.15s ease;
                }
                .pin-btn:hover, .delete-btn:hover {
                    opacity: 1;
                    background: var(--b3-theme-surface-lighter, #e0e0e0);
                }
                .pin-btn.pinned {
                    opacity: 1;
                    color: var(--b3-theme-primary, #4285f4);
                }
                .delete-btn:hover {
                    background: rgba(244, 67, 54, 0.1);
                    color: #f44336;
                }
                .panel-footer {
                    padding: 10px 18px;
                    border-top: 1px solid var(--b3-theme-surface, #f0f0f0);
                    background: var(--b3-theme-surface, #fafafa);
                    text-align: center;
                    border-radius: 0 0 12px 12px;
                }
                .count-info {
                    color: var(--b3-theme-on-surface-light, #666);
                    font-size: 11px;
                    opacity: 0.8;
                }
            </style>
        `;
    }

    /**
     * 添加面板事件监听
     */
    private attachPanelEventListeners(): void {
        if (!this.panelElement) return;

        // 关闭按钮
        const closeBtn = this.panelElement.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideHistoryPanel();
            });
        }

        // 筛选项点击事件
        const filterItems = this.panelElement.querySelectorAll('.filter-item');
        filterItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                
                // 如果点击的是操作按钮，不触发切换
                if (target.closest('.pin-btn') || target.closest('.delete-btn')) {
                    return;
                }

                const filterId = item.getAttribute('data-id');
                if (filterId) {
                    this.handleFilterSwitch(filterId);
                }
            });
        });

        // 固定按钮事件
        const pinBtns = this.panelElement.querySelectorAll('.pin-btn');
        pinBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const filterId = btn.getAttribute('data-id');
                if (filterId) {
                    await this.handlePinToggle(filterId);
                }
            });
        });

        // 删除按钮事件
        const deleteBtns = this.panelElement.querySelectorAll('.delete-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const filterId = btn.getAttribute('data-id');
                if (filterId) {
                    await this.handleFilterDelete(filterId);
                }
            });
        });
    }

    /**
     * 添加拖拽监听
     */
    private attachDragListeners(ball: HTMLElement): void {
        ball.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 只处理左键

            this.dragData.isDragging = false;
            this.dragData.startX = e.clientX;
            this.dragData.startY = e.clientY;
            this.dragData.elementStartX = parseInt(ball.style.right) || this.config.ballPosition.x;
            this.dragData.elementStartY = parseInt(ball.style.top) || this.config.ballPosition.y;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = this.dragData.startX - moveEvent.clientX;
                const deltaY = moveEvent.clientY - this.dragData.startY;

                // 判断是否开始拖拽（移动距离超过5px）
                if (!this.dragData.isDragging && 
                    (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
                    this.dragData.isDragging = true;
                    ball.style.transition = 'none';
                    ball.style.cursor = 'grabbing';
                }

                if (this.dragData.isDragging) {
                    const newX = Math.max(10, Math.min(window.innerWidth - 50, this.dragData.elementStartX + deltaX));
                    const newY = Math.max(10, Math.min(window.innerHeight - 50, this.dragData.elementStartY + deltaY));

                    ball.style.right = `${newX}px`;
                    ball.style.top = `${newY}px`;
                }
            };

            const handleMouseUp = () => {
                if (this.dragData.isDragging) {
                    // 更新配置
                    this.config.ballPosition.x = parseInt(ball.style.right);
                    this.config.ballPosition.y = parseInt(ball.style.top);
                    
                    ball.style.transition = 'all 0.2s ease';
                    ball.style.cursor = 'pointer';
                }

                setTimeout(() => {
                    this.dragData.isDragging = false;
                }, 100);

                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
    }

    /**
     * 处理筛选切换
     */
    private async handleFilterSwitch(filterId: string): Promise<void> {
        const filter = this.historyManager.getFilter(filterId);
        if (!filter) {
            console.warn(`[UIManager] 未找到筛选记录: ${filterId}`);
            return;
        }

        try {
            // 增加使用次数
            await this.historyManager.incrementUseCount(filterId);
            
            // 触发回调
            if (this.onFilterSwitch) {
                this.onFilterSwitch(filter);
            }

            // 隐藏面板
            this.hideHistoryPanel();

            console.log(`[UIManager] 切换到筛选: ${filter.name}`);

        } catch (error) {
            console.error(`[UIManager] 切换筛选失败:`, error);
        }
    }

    /**
     * 处理固定状态切换
     */
    private async handlePinToggle(filterId: string): Promise<void> {
        try {
            const success = await this.historyManager.togglePin(filterId);
            if (success) {
                this.updateHistoryPanel();
            }
        } catch (error) {
            console.error(`[UIManager] 切换固定状态失败:`, error);
        }
    }

    /**
     * 处理筛选删除
     */
    private async handleFilterDelete(filterId: string): Promise<void> {
        const filter = this.historyManager.getFilter(filterId);
        if (!filter) return;

        // 简单确认
        const confirmed = confirm(`确定要删除筛选记录"${filter.name}"吗？`);
        if (!confirmed) return;

        try {
            const success = await this.historyManager.removeFilter(filterId);
            if (success) {
                this.updateHistoryPanel();
            }
        } catch (error) {
            console.error(`[UIManager] 删除筛选记录失败:`, error);
        }
    }

    /**
     * 截断文本
     */
    private truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * 格式化时间
     */
    private formatTime(timestamp: number): string {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;

        if (diff < minute) {
            return '刚刚';
        } else if (diff < hour) {
            return `${Math.floor(diff / minute)}分钟前`;
        } else if (diff < day) {
            return `${Math.floor(diff / hour)}小时前`;
        } else if (diff < 7 * day) {
            return `${Math.floor(diff / day)}天前`;
        } else {
            return new Date(timestamp).toLocaleDateString();
        }
    }

    /**
     * 获取统计信息
     */
    private getCountInfo(): string {
        const stats = this.historyManager.getStats();
        return `${stats.total}/${stats.maxCount} 条记录，${stats.pinned} 条固定`;
    }

    /**
     * 设置事件监听
     */
    private setupEventListeners(): void {
        // ESC键关闭面板
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.state.panelVisible) {
                this.hideHistoryPanel();
            }
        };

        document.addEventListener('keydown', handleKeydown);
        this.eventListeners.push(() => document.removeEventListener('keydown', handleKeydown));
    }

    /**
     * 移除所有事件监听
     */
    private removeEventListeners(): void {
        this.eventListeners.forEach(cleanup => cleanup());
        this.eventListeners = [];
    }
}