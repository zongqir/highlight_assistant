import Logger from '../utils/logger';
/**
 * 闪卡筛选监听器 - 负责监听思源闪卡面板的筛选操作
 */

import { FlashcardPanelInfo, FilterCallback, PanelCallback, FilterEvent } from './types';

export class FlashcardMonitor {
    private isActive: boolean = false;
    private mutationObserver: MutationObserver | null = null;
    private filterCallback?: FilterCallback;
    private panelCallback?: PanelCallback;
    private currentPanels: Map<Element, FlashcardPanelInfo> = new Map();
    private lastFilterState: Map<Element, { id: string, type: string }> = new Map();
    private eventListeners: Array<() => void> = [];

    constructor() {
        Logger.log('闪卡监听器已创建');
    }

    /**
     * 开始监听
     */
    startMonitoring(): void {
        if (this.isActive) {
            Logger.warn('监听器已经在运行');
            return;
        }

        try {
            this.setupMutationObserver();
            this.scanExistingPanels();
            this.isActive = true;
            Logger.log('开始监听闪卡面板');

        } catch (error) {
            Logger.error('启动监听失败:', error);
        }
    }

    /**
     * 停止监听
     */
    stopMonitoring(): void {
        if (!this.isActive) return;

        try {
            if (this.mutationObserver) {
                this.mutationObserver.disconnect();
                this.mutationObserver = null;
            }

            this.removeEventListeners();
            this.currentPanels.clear();
            this.lastFilterState.clear();
            this.isActive = false;
            Logger.log('停止监听闪卡面板');

        } catch (error) {
            Logger.error('停止监听失败:', error);
        }
    }

    /**
     * 设置筛选回调
     */
    setFilterCallback(callback: FilterCallback): void {
        this.filterCallback = callback;
    }

    /**
     * 设置面板回调
     */
    setPanelCallback(callback: PanelCallback): void {
        this.panelCallback = callback;
    }

    /**
     * 获取当前检测到的闪卡面板
     */
    getCurrentPanels(): FlashcardPanelInfo[] {
        return Array.from(this.currentPanels.values());
    }

    /**
     * 手动检查指定元素是否为闪卡面板
     */
    checkElement(element: Element): FlashcardPanelInfo | null {
        return this.identifyFlashcardPanel(element);
    }

    /**
     * 设置DOM变异监听器
     */
    private setupMutationObserver(): void {
        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // 处理新增节点
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        this.checkForFlashcardPanels(element);
                    }
                });

                // 处理删除节点
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        this.handlePanelRemoval(element);
                    }
                });

                // 处理属性变化（可能的筛选状态变化）
                if (mutation.type === 'attributes') {
                    const target = mutation.target as Element;
                    this.checkFilterStateChange(target);
                }
            });
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-id', 'data-cardtype']
        });
    }

    /**
     * 扫描现有的闪卡面板
     */
    private scanExistingPanels(): void {
        // 检查已存在的闪卡对话框
        const existingDialogs = document.querySelectorAll('[data-key="dialog-viewcards"], [data-key="dialog-opencard"]');
        existingDialogs.forEach(dialog => {
            this.checkForFlashcardPanels(dialog);
        });

        // 检查已存在的闪卡tab
        const existingTabs = document.querySelectorAll('.layout-tab-container [data-type="siyuan-card"]');
        existingTabs.forEach(tab => {
            this.checkForFlashcardPanels(tab);
        });
    }

    /**
     * 检查元素及其子元素是否包含闪卡面板
     */
    private checkForFlashcardPanels(element: Element): void {
        // 检查元素本身
        const panelInfo = this.identifyFlashcardPanel(element);
        if (panelInfo) {
            this.handlePanelDetected(panelInfo);
        }

        // 检查子元素
        const subPanels = element.querySelectorAll('[data-key="dialog-viewcards"], [data-key="dialog-opencard"], [data-type="siyuan-card"]');
        subPanels.forEach(subPanel => {
            const subPanelInfo = this.identifyFlashcardPanel(subPanel);
            if (subPanelInfo) {
                this.handlePanelDetected(subPanelInfo);
            }
        });
    }

    /**
     * 识别闪卡面板类型
     */
    private identifyFlashcardPanel(element: Element): FlashcardPanelInfo | null {
        try {
            // 检查对话框类型的闪卡面板
            const dialogKey = element.getAttribute('data-key');
            if (dialogKey === 'dialog-viewcards') {
                return {
                    panel: element,
                    type: 'viewcards',
                    filterButton: element.querySelector('[data-type="filter"]') || undefined
                };
            }

            if (dialogKey === 'dialog-opencard') {
                return {
                    panel: element,
                    type: 'opencard',
                    filterButton: element.querySelector('[data-type="filter"]') || undefined
                };
            }

            // 检查tab类型的闪卡面板
            if (element.querySelector('[data-type="siyuan-card"]') || 
                element.hasAttribute('data-type') && element.getAttribute('data-type') === 'siyuan-card') {
                
                const filterButton = element.querySelector('[data-type="filter"]');
                if (filterButton) {
                    return {
                        panel: element,
                        type: 'opencard',
                        filterButton: filterButton
                    };
                }
            }

            // 检查是否包含闪卡相关的内容
            if (element.classList.contains('card__main') || 
                element.querySelector('.card__main')) {
                
                const filterButton = element.querySelector('[data-type="filter"]');
                if (filterButton) {
                    return {
                        panel: element,
                        type: 'opencard',
                        filterButton: filterButton
                    };
                }
            }

            return null;

        } catch (error) {
            Logger.error('识别闪卡面板失败:', error);
            return null;
        }
    }

    /**
     * 处理检测到的闪卡面板
     */
    private handlePanelDetected(panelInfo: FlashcardPanelInfo): void {
        if (this.currentPanels.has(panelInfo.panel)) {
            return; // 已经处理过的面板
        }

        this.currentPanels.set(panelInfo.panel, panelInfo);
        Logger.log(`检测到闪卡面板: ${panelInfo.type}`);

        // 设置筛选监听
        if (panelInfo.filterButton) {
            this.attachFilterMonitoring(panelInfo);
        }

        // 回调通知
        if (this.panelCallback) {
            this.panelCallback(panelInfo);
        }

        // 监听面板关闭
        this.monitorPanelClosure(panelInfo);
    }

    /**
     * 处理面板移除
     */
    private handlePanelRemoval(element: Element): void {
        // 检查是否有监听的面板被移除
        const panelsToRemove: Element[] = [];
        
        this.currentPanels.forEach((panelInfo, panelElement) => {
            if (!document.contains(panelElement) || element.contains(panelElement)) {
                panelsToRemove.push(panelElement);
            }
        });

        panelsToRemove.forEach(panel => {
            this.currentPanels.delete(panel);
            this.lastFilterState.delete(panel);
            Logger.log('闪卡面板已移除');
        });
    }

    /**
     * 附加筛选监听
     */
    private attachFilterMonitoring(panelInfo: FlashcardPanelInfo): void {
        if (!panelInfo.filterButton) return;

        const filterButton = panelInfo.filterButton;

        // 记录初始筛选状态
        this.recordFilterState(panelInfo.panel, filterButton);

        // 监听筛选按钮点击
        const handleFilterClick = () => {
            Logger.log('检测到筛选按钮点击');
            
            // 延迟检查筛选状态变化
            setTimeout(() => {
                this.checkFilterStateChange(filterButton);
            }, 500); // 给菜单操作留出时间

            // 监听筛选菜单
            setTimeout(() => {
                this.monitorFilterMenu();
            }, 100);
        };

        filterButton.addEventListener('click', handleFilterClick);
        this.eventListeners.push(() => {
            filterButton.removeEventListener('click', handleFilterClick);
        });

        Logger.log('已附加筛选监听');
    }

    /**
     * 监听筛选菜单选择
     */
    private monitorFilterMenu(): void {
        // 查找筛选菜单
        const menu = document.querySelector('.b3-menu');
        if (!menu) return;

        const handleMenuClick = async (e: MouseEvent) => {
            const target = e.target as Element;
            const menuItem = target.closest('.b3-menu__item');
            
            if (menuItem && !menuItem.classList.contains('b3-menu__separator')) {
                const label = menuItem.textContent?.trim();
                
                if (label && label !== '全部' && label !== '文件树') {
                    // 这可能是一个具体的筛选选择
                    Logger.log(`检测到菜单选择: ${label}`);
                    
                    // 等待筛选应用完成
                    setTimeout(() => {
                        this.detectFilterChange();
                    }, 1000);
                }
            }
        };

        menu.addEventListener('click', handleMenuClick, { once: true });
        
        // 菜单关闭时清理
        setTimeout(() => {
            if (document.contains(menu)) {
                menu.removeEventListener('click', handleMenuClick);
            }
        }, 5000);
    }

    /**
     * 检测筛选状态变化
     */
    private detectFilterChange(): void {
        this.currentPanels.forEach((panelInfo, panel) => {
            if (panelInfo.filterButton) {
                this.checkFilterStateChange(panelInfo.filterButton);
            }
        });
    }

    /**
     * 检查筛选状态变化
     */
    private checkFilterStateChange(element: Element): void {
        const panel = this.findPanelForElement(element);
        if (!panel) return;

        const filterButton = element.closest('[data-type="filter"]') || 
                            element.querySelector('[data-type="filter"]');
        if (!filterButton) return;

        const currentState = {
            id: filterButton.getAttribute('data-id') || '',
            type: filterButton.getAttribute('data-cardtype') || ''
        };

        const lastState = this.lastFilterState.get(panel);
        
        if (!lastState || 
            lastState.id !== currentState.id || 
            lastState.type !== currentState.type) {
            
            this.lastFilterState.set(panel, currentState);
            
            // 只有在有具体筛选目标时才记录
            if (currentState.id && currentState.type && currentState.type !== 'all') {
                this.handleFilterChange(currentState.id, currentState.type);
            }
        }
    }

    /**
     * 处理筛选变化
     */
    private async handleFilterChange(filterId: string, filterType: string): Promise<void> {
        try {
            // 获取筛选目标的名称
            let filterName = await this.getFilterName(filterId, filterType);
            
            // 如果获取不到名称，使用ID作为回退
            if (!filterName) {
                Logger.warn(`无法获取筛选名称，使用ID作为回退: ${filterId}`);
                filterName = filterId;
            }

            const event: FilterEvent = {
                type: 'select',
                filterId: filterId,
                filterType: filterType as 'doc' | 'notebook',
                filterName: filterName,
                timestamp: Date.now()
            };

            Logger.log(`检测到筛选变化:`, event);

            if (this.filterCallback) {
                this.filterCallback(event);
            }

        } catch (error) {
            Logger.error('处理筛选变化失败:', error);
        }
    }

    /**
     * 获取筛选目标的名称
     */
    private async getFilterName(filterId: string, filterType: string): Promise<string | null> {
        try {
            Logger.log(`获取筛选名称: ${filterId} (${filterType})`);
            
            let apiEndpoint = '';
            let requestBody: any = {};

            if (filterType === 'doc') {
                // 获取文档信息
                apiEndpoint = '/api/block/getDocInfo';
                requestBody = { id: filterId };
            } else if (filterType === 'notebook') {
                // 获取笔记本信息
                apiEndpoint = '/api/notebook/lsNotebooks';
                requestBody = {};
            }

            if (!apiEndpoint) return null;

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                Logger.warn(`API请求失败: ${response.status}`);
                return null;
            }

            const result = await response.json();
            if (result.code !== 0) {
                Logger.warn(`API返回错误: ${result.code} - ${result.msg}`);
                return null;
            }

            Logger.log(`API返回数据:`, result.data);

            if (filterType === 'doc') {
                // 尝试多个可能的字段来获取文档名称
                const name = result.data?.name || 
                           result.data?.title || 
                           result.data?.content || 
                           result.data?.fcontent ||
                           result.data?.box; // 如果都没有，至少返回笔记本名
                
                if (name) {
                    Logger.log(`获取到文档名称: ${name}`);
                    return name;
                }

                // 如果还是没有，尝试通过文档树API获取
                return await this.getDocNameFromTree(filterId);
                
            } else if (filterType === 'notebook') {
                const notebooks = result.data?.notebooks || [];
                const notebook = notebooks.find((nb: any) => nb.id === filterId);
                const name = notebook?.name;
                
                if (name) {
                    Logger.log(`获取到笔记本名称: ${name}`);
                    return name;
                }
            }

            Logger.warn(`未能获取到有效名称`);
            return null;

        } catch (error) {
            Logger.error('获取筛选名称失败:', error);
            return null; // 改为返回null而不是ID，让调用方处理
        }
    }

    /**
     * 从文档树API获取文档名称
     */
    private async getDocNameFromTree(docId: string): Promise<string | null> {
        try {
            Logger.log(`尝试从文档树获取名称: ${docId}`);
            
            const response = await fetch('/api/filetree/getDoc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: docId, mode: 3 }) // 只获取基本信息
            });

            if (!response.ok) return null;

            const result = await response.json();
            if (result.code !== 0) return null;

            const name = result.data?.name || result.data?.title;
            if (name) {
                Logger.log(`从文档树获取到名称: ${name}`);
                return name;
            }

            // 最后尝试：解析路径获取文档名
            const path = result.data?.path;
            if (path) {
                const pathParts = path.split('/');
                const fileName = pathParts[pathParts.length - 1];
                if (fileName && fileName !== docId) {
                    const nameWithoutExt = fileName.replace(/\.sy$/, '');
                    Logger.log(`从路径解析得到名称: ${nameWithoutExt}`);
                    return nameWithoutExt;
                }
            }

            return null;

        } catch (error) {
            Logger.error('从文档树获取名称失败:', error);
            return null;
        }
    }

    /**
     * 记录筛选状态
     */
    private recordFilterState(panel: Element, filterButton: Element): void {
        const state = {
            id: filterButton.getAttribute('data-id') || '',
            type: filterButton.getAttribute('data-cardtype') || ''
        };
        
        this.lastFilterState.set(panel, state);
    }

    /**
     * 查找元素对应的面板
     */
    private findPanelForElement(element: Element): Element | null {
        for (const [panel] of this.currentPanels) {
            if (panel.contains(element)) {
                return panel;
            }
        }
        return null;
    }

    /**
     * 监听面板关闭
     */
    private monitorPanelClosure(panelInfo: FlashcardPanelInfo): void {
        // 查找关闭按钮
        const closeButtons = panelInfo.panel.querySelectorAll('[data-type="close"]');
        
        closeButtons.forEach(closeBtn => {
            const handleClose = () => {
                setTimeout(() => {
                    if (!document.contains(panelInfo.panel)) {
                        this.currentPanels.delete(panelInfo.panel);
                        this.lastFilterState.delete(panelInfo.panel);
                        Logger.log('面板已关闭');
                    }
                }, 100);
            };

            closeBtn.addEventListener('click', handleClose);
            this.eventListeners.push(() => {
                closeBtn.removeEventListener('click', handleClose);
            });
        });

        // 对于对话框，也监听ESC键
        if (panelInfo.type === 'viewcards' || panelInfo.type === 'opencard') {
            const handleKeydown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    setTimeout(() => {
                        if (!document.contains(panelInfo.panel)) {
                            this.currentPanels.delete(panelInfo.panel);
                            this.lastFilterState.delete(panelInfo.panel);
                            document.removeEventListener('keydown', handleKeydown);
                        }
                    }, 100);
                }
            };

            document.addEventListener('keydown', handleKeydown);
            this.eventListeners.push(() => {
                document.removeEventListener('keydown', handleKeydown);
            });
        }
    }

    /**
     * 移除所有事件监听
     */
    private removeEventListeners(): void {
        this.eventListeners.forEach(cleanup => cleanup());
        this.eventListeners = [];
    }

    /**
     * 获取监听器状态
     */
    getStatus(): {
        isActive: boolean;
        panelCount: number;
        hasCallbacks: boolean;
    } {
        return {
            isActive: this.isActive,
            panelCount: this.currentPanels.size,
            hasCallbacks: !!(this.filterCallback || this.panelCallback)
        };
    }

    /**
     * 手动触发筛选检测
     */
    manualTriggerCheck(): void {
        Logger.log('手动触发筛选检测');
        this.detectFilterChange();
    }

    /**
     * 清理资源
     */
    destroy(): void {
        this.stopMonitoring();
        this.filterCallback = undefined;
        this.panelCallback = undefined;
        Logger.log('监听器已销毁');
    }
}

