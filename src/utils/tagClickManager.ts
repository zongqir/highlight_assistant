import Logger from './logger';
/**
 * 标签点击管理器 - 自定义标签搜索面板
 */

import { 
    TagSearchManager, 
    TagSearchResult, 
    SearchScope, 
    GroupedResults
} from './tagSearchManager';
import { TagResultRenderer } from './tagResultRenderer';

export class TagClickManager {
    private isInitialized: boolean = false;
    private debugMode: boolean = false;
    private currentScope: SearchScope = 'notebook';
    private searchManager: TagSearchManager;
    private renderer: TagResultRenderer;
    
    constructor() {
        this.searchManager = new TagSearchManager();
        this.renderer = new TagResultRenderer();
    }
    
    /**
     * 开启调试模式
     */
    public enableDebug(): void {
        this.debugMode = true;
        this.searchManager.enableDebug();
        Logger.log('✅ 调试模式已开启');
    }
    
    /**
     * 关闭调试模式
     */
    public disableDebug(): void {
        this.debugMode = false;
        this.searchManager.disableDebug();
        Logger.log('❌ 调试模式已关闭');
    }
    
    /**
     * 调试日志
     */
    private debugLog(...args: any[]): void {
        if (this.debugMode) {
            Logger.log(...args);
        }
    }
    
    /**
     * 初始化
     */
    public initialize(): void {
        if (this.isInitialized) {
            return;
        }
        
        // 延迟初始化，等待DOM加载完成
        setTimeout(() => {
            this.setupTagClickListener();
            this.isInitialized = true;
            Logger.log('✅ 标签点击管理器初始化完成');
        }, 2000);
    }
    
    /**
     * 设置标签点击监听
     */
    private setupTagClickListener(): void {
        // 监听文档点击事件（捕获阶段）- 限制在编辑区域
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            // 首先检查是否在编辑区域内
            if (!this.isInEditArea(target)) {
                return; // 不在编辑区域，直接返回
            }
            
            // 查找标签元素
            const tagElement = this.findTagElement(target);
            
            if (tagElement) {
                this.debugLog('🏷️ 检测到编辑区域内标签点击');
                
                // 立即阻止所有传播
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // 获取标签内容
                const tagText = tagElement.textContent?.trim() || '';
                this.debugLog('标签内容:', tagText);
                
                // 延迟执行，确保阻止了原生处理
                setTimeout(() => {
                    this.showTagSearchPanel(tagText);
                }, 0);
                
                return false; // 额外确保阻止默认行为
            }
        }, true);
        
        // 添加mousedown事件监听，提前拦截 - 同样限制在编辑区域
        document.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            
            // 检查是否在编辑区域内
            if (!this.isInEditArea(target)) {
                return;
            }
            
            const tagElement = this.findTagElement(target);
            
            if (tagElement) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        }, true);
        
        Logger.log('✅ 标签点击监听已注册（限制在编辑区域）');
    }
    
    /**
     * 检查元素是否在编辑区域内
     */
    private isInEditArea(element: HTMLElement): boolean {
        let current: HTMLElement | null = element;
        let depth = 0;
        const maxDepth = 15;
        
        while (current && depth < maxDepth) {
            // 确保className和id都是字符串类型
            const className = String(current.className || '');
            const id = String(current.id || '');
            
            // 🔧 修复：优先排除系统UI区域（在检查编辑区域之前）
            if (className.includes('toolbar') ||                  // 工具栏
                className.includes('dock') ||                     // dock面板
                className.includes('fn__flex-shrink') ||          // 侧边栏
                className.includes('layout__wnd') ||              // 窗口边框
                className.includes('block__icon') ||              // 块图标
                className.includes('protyle-title') ||            // 🆕 文档标题区域
                className.includes('protyle-breadcrumb') ||       // 🆕 面包屑导航
                className.includes('protyle-attr') ||             // 🆕 属性面板
                className.includes('protyle-gutters') ||          // 🆕 侧边栏装订线
                className.includes('protyle-action') ||           // 🆕 块操作按钮
                className.includes('b3-dialog') ||                // 🆕 对话框
                className.includes('b3-menu') ||                  // 🆕 菜单
                id.includes('toolbar') ||                        // ID中包含toolbar
                id.includes('dock')) {                           // ID中包含dock
                return false;
            }
            
            // 检查是否在编辑区域容器内
            if (className.includes('protyle-wysiwyg') ||           // 编辑区域
                className.includes('protyle-content') ||          // 内容区域  
                className.includes('protyle') && className.includes('fn__flex-1')) { // 编辑器主容器
                return true;
            }
            
            current = current.parentElement;
            depth++;
        }
        
        return false; // 无法确定时，默认不处理
    }
    
    /**
     * 查找标签元素
     */
    private findTagElement(element: HTMLElement): HTMLElement | null {
        let current: HTMLElement | null = element;
        let depth = 0;
        const maxDepth = 6; // 减少查找深度，更精确
        
        while (current && depth < maxDepth) {
            const dataType = current.getAttribute('data-type');
            const className = String(current.className || '');
            const textContent = current.textContent?.trim() || '';
            
            // 更严格的标签识别条件
            const isDocumentTag = this.isDocumentTag(current, dataType, className, textContent);
            
            if (isDocumentTag) {
                this.debugLog('找到文档标签元素:', {
                    tagName: current.tagName,
                    dataType,
                    className,
                    textContent: textContent.substring(0, 50),
                    depth
                });
                return current;
            }
            
            current = current.parentElement;
            depth++;
        }
        
        return null;
    }
    
    /**
     * 判断是否是文档中的真实标签（而不是系统UI中的标签）
     */
    private isDocumentTag(element: HTMLElement, dataType: string | null, className: string, textContent: string): boolean {
        // 🔧 修复：首先排除所有系统UI元素（优先级最高）
        if (className.includes('toolbar') ||
            className.includes('dock') ||
            className.includes('menu') ||
            className.includes('dialog') ||
            className.includes('breadcrumb') ||
            className.includes('layout-tab-container') ||  // 标签页容器
            className.includes('file-tree') ||             // 文件树
            className.includes('sy__backlink') ||          // 反向链接面板
            className.includes('protyle-title') ||         // 🆕 文档标题区域
            className.includes('protyle-breadcrumb') ||    // 🆕 面包屑导航
            className.includes('protyle-attr') ||          // 🆕 属性面板
            className.includes('protyle-gutters') ||       // 🆕 侧边栏装订线
            className.includes('protyle-action') ||        // 🆕 块操作按钮
            className.includes('block__icon') ||           // 🆕 块图标菜单
            className.includes('b3-button') ||             // 🆕 按钮元素
            className.includes('b3-dialog') ||             // 🆕 对话框
            className.includes('b3-menu')) {               // 🆕 菜单
            return false;
        }
        
        // 🔧 修复：检查是否在排除区域的父容器中
        if (element.closest('.protyle-title, .protyle-breadcrumb, .protyle-attr, .protyle-gutters, .protyle-action, .block__icon, .b3-button, .b3-dialog, .b3-menu, .toolbar, .dock')) {
            return false;
        }
        
        // 1. 最可靠：SiYuan的标签data-type（但必须在文档内容区域）
        if (dataType === 'tag') {
            // 必须确保在文档内容区域
            const isInContent = element.closest('.protyle-wysiwyg, .protyle-content');
            return !!isInContent;
        }
        
        // 2. 检查#标签#格式（必须是SPAN且格式正确）
        if (element.tagName === 'SPAN' && textContent.match(/^#[^#\s<>]+#$/)) {
            // 进一步验证：检查父容器是否在文档内容中
            const parentContainer = element.closest('.protyle-wysiwyg, .protyle-content');
            if (parentContainer) {
                return true;
            }
        }
        
        // 3. 其他className包含'tag'的情况需要更严格验证
        if (className.includes('tag')) {
            // 确保不是系统UI中的标签样式
            if (element.closest('.protyle-wysiwyg, .protyle-content')) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 显示标签搜索面板
     */
    private async showTagSearchPanel(tagText: string, scope: SearchScope = this.currentScope, availableTags?: string[]): Promise<void> {
        Logger.log('🔍 ========== 开始标签搜索 ==========');
        Logger.log('原始标签文本:', tagText);
        Logger.log('搜索范围:', scope);
        
        // 如果没有传入可用标签，先获取
        if (!availableTags) {
            Logger.log('📋 获取可用标签...');
            availableTags = await this.searchManager.getAllAvailableTags(scope);
        }
        
        // 使用搜索管理器搜索
        const results = await this.searchManager.searchByTag(tagText, scope);
        
        Logger.log('搜索结果数量:', results.length);
        
        // 根据搜索范围选择分组和渲染方式
        // 按文档分组展示结果
        const groupedResults = this.searchManager.groupByDocument(results);
        this.showDocumentResultsPanel(tagText, groupedResults, scope, availableTags);
        
        Logger.log('========== 标签搜索结束 ==========');
    }
    

    /**
     * 显示笔记本级分组搜索结果面板（用于全局搜索）- 保留旧版本兼容
     */
    private showNotebookResultsPanel(tagText: string, notebookGroupedResults: NotebookGroupedResults, scope: SearchScope): void {
        Logger.log('🎨 开始渲染笔记本级分组面板...');
        Logger.log('标签文本:', tagText);
        Logger.log('笔记本分组结果:', notebookGroupedResults);
        
        Logger.log('🌳 使用真正的树状结构渲染');
        
        // 创建基础面板结构
        const { overlay, style } = this.createOverlayAndStyles();
        const panel = this.createPanel();
        const header = this.createNotebookHeader(tagText, scope, notebookGroupedResults);
        const contentContainer = this.createScrollableContent();
        
        // 使用笔记本级渲染器渲染树状结构
        this.renderer.renderNotebookGroupedResults(contentContainer, notebookGroupedResults, tagText, (blockId) => {
            Logger.log('🔗 点击块:', blockId);
            cleanup();
            // TODO: 跳转到指定块
        }, (notebookId) => {
            Logger.log('📚 点击笔记本:', notebookId);
            // 切换到该笔记本搜索
            cleanup();
            this.currentScope = 'notebook';
            
            // TODO: 需要设置当前笔记本ID，然后重新搜索
            Logger.log('🔄 切换到笔记本搜索范围，重新搜索');
            this.showTagSearchPanel(tagText, 'notebook');
        });
        
        // 清理函数
        const cleanup = () => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (style.parentNode) style.parentNode.removeChild(style);
            document.removeEventListener('keydown', handleEscape);
        };
        
        const footer = this.createFooterWithCleanup(cleanup);
        
        // 组装面板
        panel.appendChild(header);
        panel.appendChild(contentContainer);
        panel.appendChild(footer);
        overlay.appendChild(panel);
        
        // 添加到DOM并设置事件
        document.head.appendChild(style);
        document.body.appendChild(overlay);
        
        // ESC关闭
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cleanup();
        };
        document.addEventListener('keydown', handleEscape);
        
        // 点击遮罩关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup();
        });
        
        Logger.log('✅ 笔记本级树状面板已创建');
    }

    /**
     * 显示文档级分组搜索结果面板
     */
    private showDocumentResultsPanel(tagText: string, groupedResults: GroupedResults, scope: SearchScope, availableTags?: string[]): void {
        Logger.log('🎨 开始渲染面板...');
        Logger.log('标签文本:', tagText);
        Logger.log('分组结果:', groupedResults);
        
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes tagSearchFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes tagSearchSlideIn {
                from { 
                    opacity: 0;
                    transform: translateX(30px);
                }
                to { 
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        document.head.appendChild(style);
        
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            animation: tagSearchFadeIn 0.2s ease-out;
        `;
        
        // 创建面板（优化移动端）
        const isMobile = window.innerWidth <= 768;
        const panel = document.createElement('div');
        panel.style.cssText = `
            background: var(--b3-theme-background);
            border-radius: ${isMobile ? '12px' : '16px'};
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
            max-width: ${isMobile ? '95vw' : '90vw'};
            width: ${isMobile ? '100%' : '800px'};
            max-height: ${isMobile ? '85vh' : '80vh'};
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: tagSearchSlideIn 0.3s ease-out;
        `;
        
        // 标题栏（紧凑版）
        const header = document.createElement('div');
        header.style.cssText = `
            padding: ${isMobile ? '12px' : '16px 20px'};
            border-bottom: 1px solid var(--b3-theme-surface-lighter);
            background: linear-gradient(135deg, var(--b3-theme-surface) 0%, var(--b3-theme-background) 100%);
        `;
        
        // 计算总结果数
        const totalResults = Object.values(groupedResults).reduce((sum, doc) => sum + doc.blocks.length, 0);
        const docCount = Object.keys(groupedResults).length;
        
        // 紧凑标题区域（移动端优化）
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = `
            display: flex; 
            align-items: center; 
            justify-content: space-between;
            margin-bottom: ${isMobile ? '12px' : '16px'};
            gap: 8px;
        `;
        
        titleDiv.innerHTML = `
            <div style="
                color: var(--b3-theme-on-surface-light);
                font-size: ${isMobile ? '12px' : '13px'};
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            ">
                ${docCount}文档 ${totalResults}结果
            </div>
        `;
        header.appendChild(titleDiv);
        
        // 统一的控制栏（标签筛选 + 范围选择）
        const controlsContainer = document.createElement('div');
        controlsContainer.style.cssText = `
            display: flex;
            align-items: stretch;
            gap: ${isMobile ? '6px' : '8px'};
            margin-bottom: ${isMobile ? '8px' : '10px'};
            background: linear-gradient(135deg, var(--b3-theme-surface-light) 0%, var(--b3-theme-surface) 100%);
            border-radius: 12px;
            padding: 4px;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.1);
            border: 1px solid rgba(var(--b3-theme-border-rgb), 0.3);
            transition: all 0.3s ease;
        `;
        
        // 控制栏整体悬停效果
        controlsContainer.addEventListener('mouseenter', () => {
            controlsContainer.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)';
            controlsContainer.style.transform = 'translateY(-1px)';
        });
        
        controlsContainer.addEventListener('mouseleave', () => {
            controlsContainer.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.1)';
            controlsContainer.style.transform = 'translateY(0)';
        });
        
        // 标签筛选器（统一样式）
        if (availableTags && availableTags.length > 0) {
            const tagFilterContainer = document.createElement('div');
            tagFilterContainer.style.cssText = `
                display: flex;
                align-items: center;
                background: var(--b3-theme-background);
                border-radius: 8px;
                padding: ${isMobile ? '4px 8px' : '4px 8px'};
                flex: 1;
                min-width: 0;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                transition: all 0.3s ease;
                border: 1px solid rgba(var(--b3-theme-border-rgb), 0.2);
            `;
            
            // 标签容器悬停效果
            tagFilterContainer.addEventListener('mouseenter', () => {
                tagFilterContainer.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
                tagFilterContainer.style.borderColor = 'var(--b3-theme-primary-lighter)';
            });
            
            tagFilterContainer.addEventListener('mouseleave', () => {
                tagFilterContainer.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                tagFilterContainer.style.borderColor = 'rgba(var(--b3-theme-border-rgb), 0.2)';
            });
            
            // 改成自定义下拉样式（去掉标签文字）
            const tagSelectWrapper = document.createElement('div');
            tagSelectWrapper.style.cssText = `
                position: relative;
                flex: 1;
                min-width: 0;
            `;
            
            const tagSelect = document.createElement('select');
            tagSelect.style.cssText = `
                width: 100%;
                padding: ${isMobile ? '8px 24px 8px 8px' : '10px 26px 10px 12px'};
                border: none;
                background: transparent;
                color: var(--b3-theme-primary);
                font-size: ${isMobile ? '12px' : '14px'};
                font-weight: 600;
                cursor: pointer;
                outline: none;
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
            `;
            
            // 自定义下拉箭头
            const dropdownArrow = document.createElement('div');
            dropdownArrow.innerHTML = '▼';
            dropdownArrow.style.cssText = `
                position: absolute;
                right: ${isMobile ? '8px' : '8px'};
                top: 50%;
                transform: translateY(-50%);
                color: var(--b3-theme-on-surface-light);
                font-size: ${isMobile ? '9px' : '10px'};
                pointer-events: none;
            `;
            
            // 添加选项
            const currentOption = document.createElement('option');
            currentOption.value = tagText;
            currentOption.textContent = tagText.length > 12 ? tagText.substring(0, 12) + '...' : tagText;
            currentOption.selected = true;
            tagSelect.appendChild(currentOption);
            
            availableTags.forEach(tag => {
                if (tag !== tagText) {
                    const option = document.createElement('option');
                    option.value = tag;
                    option.textContent = tag.length > 12 ? tag.substring(0, 12) + '...' : tag;
                    tagSelect.appendChild(option);
                }
            });
            
            // 监听选择变化
            tagSelect.addEventListener('change', (e) => {
                const newTag = (e.target as HTMLSelectElement).value;
                if (newTag && newTag !== tagText) {
                    Logger.log('🔄 切换标签:', newTag);
                    cleanup(); // 关闭当前面板
                    this.showTagSearchPanel(newTag, scope, availableTags); // 重新搜索
                }
            });
            
            tagSelectWrapper.appendChild(tagSelect);
            tagSelectWrapper.appendChild(dropdownArrow);
            
            tagFilterContainer.appendChild(tagSelectWrapper);
            controlsContainer.appendChild(tagFilterContainer);
        }
        
        // 范围选择器（统一样式）
        const scopeSelector = this.createScopeSelector(scope, (newScope) => {
            Logger.log('🔄 切换搜索范围:', newScope);
            cleanup(); // 关闭当前面板
            this.showTagSearchPanel(tagText, newScope, availableTags); // 重新搜索，保持标签列表
        });
        controlsContainer.appendChild(scopeSelector);
        
        header.appendChild(controlsContainer);
        
        // 结果列表容器（紧凑版）
        const resultsList = document.createElement('div');
        resultsList.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: ${isMobile ? '8px 12px' : '12px 20px'};
        `;
        
        // 使用渲染器渲染分组结果
        this.renderer.renderGroupedResults(resultsList, groupedResults, tagText, (blockId) => {
            this.navigateToBlock(blockId);
            cleanup();
        });
        
        // 底部按钮栏（紧凑版）
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: ${isMobile ? '12px' : '16px 20px'};
            border-top: 1px solid var(--b3-theme-surface-lighter);
            background: var(--b3-theme-surface);
        `;
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = `
            width: 100%;
            padding: ${isMobile ? '12px' : '14px'};
            border: 2px solid var(--b3-theme-surface-lighter);
            background: var(--b3-theme-background);
            color: var(--b3-theme-on-background);
            border-radius: ${isMobile ? '8px' : '10px'};
            cursor: pointer;
            font-size: ${isMobile ? '14px' : '15px'};
            font-weight: 600;
            transition: all 0.2s;
        `;
        
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'var(--b3-theme-surface-light)';
            closeButton.style.borderColor = 'var(--b3-theme-on-surface-light)';
        });
        
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'var(--b3-theme-background)';
            closeButton.style.borderColor = 'var(--b3-theme-surface-lighter)';
        });
        
        closeButton.addEventListener('click', () => {
            cleanup();
        });
        
        footer.appendChild(closeButton);
        
        // 组装面板
        Logger.log('🔧 组装面板元素...');
        panel.appendChild(header);
        panel.appendChild(resultsList);
        panel.appendChild(footer);
        overlay.appendChild(panel);
        
        Logger.log('📍 将面板添加到 body...');
        Logger.log('Overlay 元素:', overlay);
        Logger.log('Panel 元素:', panel);
        document.body.appendChild(overlay);
        Logger.log('✅ 面板已添加到 DOM');
        
        // 清理函数
        const cleanup = () => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        };
        
        // ESC 关闭
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // 点击遮罩关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
            }
        });
    }
    
    /**
     * 创建结果项
     */
    private createResultItem(result: TagSearchResult, index: number): HTMLElement {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 18px 20px;
            margin-bottom: 12px;
            background: var(--b3-theme-surface);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.25s;
            border: 2px solid transparent;
            animation: tagSearchSlideIn ${0.3 + index * 0.05}s ease-out;
        `;
        
        // 提取纯文本（移除HTML标签）
        const contentText = this.extractTextContent(result.content);
        const displayText = contentText.length > 120 ? contentText.substring(0, 120) + '...' : contentText;
        
        // 创建内容容器
        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        
        // 文本内容
        const textDiv = document.createElement('div');
        textDiv.style.cssText = `
            font-size: 15px;
            line-height: 1.6;
            color: var(--b3-theme-on-background);
            word-break: break-word;
        `;
        textDiv.innerHTML = this.highlightTag(this.escapeHtml(displayText), result.content);
        
        // 元信息
        const metaDiv = document.createElement('div');
        metaDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 12px;
            color: var(--b3-theme-on-surface-light);
        `;
        metaDiv.innerHTML = `
            <span>📁 ${this.escapeHtml(result.hpath || '未知路径')}</span>
            <span>•</span>
            <span>🕐 ${this.formatDate(result.updated)}</span>
        `;
        
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(metaDiv);
        item.appendChild(contentDiv);
        
        // 悬停效果
        item.addEventListener('mouseenter', () => {
            item.style.borderColor = 'var(--b3-theme-primary)';
            item.style.transform = 'translateX(4px)';
            item.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.borderColor = 'transparent';
            item.style.transform = 'translateX(0)';
            item.style.boxShadow = 'none';
        });
        
        // 点击跳转
        item.addEventListener('click', () => {
            this.navigateToBlock(result.id);
        });
        
        return item;
    }
    
    /**
     * 提取纯文本内容
     */
    private extractTextContent(html: string): string {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }
    
    /**
     * 转义HTML特殊字符
     */
    private escapeHtml(text: string): string {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 高亮显示标签
     */
    private highlightTag(text: string, originalHtml: string): string {
        if (!text) return '';
        // 高亮标签（已经转义的文本）
        return text.replace(/#([^#\s]+)#/g, '<span style="color: var(--b3-theme-primary); font-weight: 600; background: var(--b3-theme-primary-lighter); padding: 2px 6px; border-radius: 4px;">#$1#</span>');
    }
    
    /**
     * 格式化日期
     */
    private formatDate(timestamp: string): string {
        if (!timestamp) return '未知时间';
        
        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        const day = timestamp.substring(6, 8);
        const hour = timestamp.substring(8, 10);
        const minute = timestamp.substring(10, 12);
        
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }
    
    /**
     * 创建搜索范围选择器（紧凑版）
     */
    private createScopeSelector(currentScope: SearchScope, onScopeChange: (scope: SearchScope) => void): HTMLElement {
        const isMobile = window.innerWidth <= 768;
        
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
        `;
        
        const scopes = [
            { value: 'doc' as SearchScope, label: '本文档' },
            { value: 'subdocs' as SearchScope, label: '子文档' },
            { value: 'notebook' as SearchScope, label: '笔记本' },
        ];
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            flex-shrink: 0;
            gap: 2px;
        `;
        
        scopes.forEach((scopeOption, index) => {
            const button = document.createElement('button');
            const isActive = scopeOption.value === currentScope;
            
            button.textContent = scopeOption.label;
            button.style.cssText = `
                border: none;
                padding: ${isMobile ? '8px 12px' : '8px 14px'};
                font-size: ${isMobile ? '12px' : '14px'};
                font-weight: 600;
                cursor: pointer;
                transition: all 0.25s ease;
                border-radius: 7px;
                white-space: nowrap;
                background: ${isActive ? 'var(--b3-theme-background)' : 'transparent'};
                color: ${isActive ? 'var(--b3-theme-primary)' : 'var(--b3-theme-on-surface-light)'};
                box-shadow: ${isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};
                position: relative;
            `;
            
            // 悬停效果
            button.addEventListener('mouseenter', () => {
                if (!isActive) {
                    button.style.background = 'rgba(var(--b3-theme-primary-rgb), 0.08)';
                    button.style.color = 'var(--b3-theme-primary)';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                if (!isActive) {
                    button.style.background = 'transparent';
                    button.style.color = 'var(--b3-theme-on-surface-light)';
                }
            });
            
            // 点击事件
            button.addEventListener('click', () => {
                if (scopeOption.value !== currentScope) {
                    onScopeChange(scopeOption.value);
                }
            });
            
            buttonsContainer.appendChild(button);
        });
        
        container.appendChild(buttonsContainer);
        
        return container;
    }

    /**
     * 创建遮罩层和样式
     */
    private createOverlayAndStyles(): { overlay: HTMLElement, style: HTMLStyleElement } {
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes tagSearchFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes tagSearchSlideIn {
                from { 
                    opacity: 0;
                    transform: translateX(30px);
                }
                to { 
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            animation: tagSearchFadeIn 0.2s ease-out;
        `;
        
        return { overlay, style };
    }

    /**
     * 创建面板容器
     */
    private createPanel(): HTMLElement {
        const panel = document.createElement('div');
        panel.style.cssText = `
            background: var(--b3-theme-background);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            max-width: 90vw;
            width: 800px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: tagSearchSlideIn 0.3s ease-out;
        `;
        return panel;
    }

    /**
     * 创建深层树头部组件
     */
    private createTreeHeader(tagText: string, scope: SearchScope, treeResults: NotebookTreeGroupedResults): HTMLElement {
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px 24px 16px;
            border-bottom: 1px solid var(--b3-theme-surface-lighter);
            background: var(--b3-theme-surface);
        `;
        
        // 计算统计信息
        let totalBlocks = 0;
        let totalDocuments = 0;
        const notebookCount = Object.keys(treeResults).length;
        
        Object.values(treeResults).forEach(treeGroup => {
            const stats = this.calculateTreeStatsForHeader(treeGroup.pathTree);
            totalBlocks += stats.blocksCount;
            totalDocuments += stats.documentsCount;
        });
        
        header.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">🌲</span>
                    <span style="font-size: 18px; font-weight: 600; color: var(--b3-theme-on-surface);">标签搜索结果</span>
                    <span style="background: var(--b3-theme-primary-light); color: var(--b3-theme-primary); padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: 500;">${tagText}</span>
                </div>
                <div style="font-size: 12px; color: var(--b3-theme-on-surface-light);">
                    ${notebookCount} 个笔记本 • ${totalDocuments} 个文档 • ${totalBlocks} 个结果
                </div>
            </div>
        `;
        
        // 正确地创建和添加scope selector，实现范围切换
        const scopeSelector = this.createScopeSelector(scope, (newScope) => {
            Logger.log('🔄 切换搜索范围:', newScope);
            this.currentScope = newScope;
            // 重新搜索
            this.showTagSearchPanel(tagText, newScope);
        });
        header.appendChild(scopeSelector);
        
        return header;
    }
    
    /**
     * 计算树统计信息（为头部显示）
     */
    private calculateTreeStatsForHeader(node: any): { documentsCount: number; blocksCount: number } {
        let documentsCount = 0;
        let blocksCount = 0;
        
        const traverse = (currentNode: any) => {
            if (currentNode.isDocument) {
                documentsCount++;
                blocksCount += currentNode.blocks ? currentNode.blocks.length : 0;
            }
            
            if (currentNode.children) {
                Object.values(currentNode.children).forEach((child: any) => {
                    traverse(child);
                });
            }
        };
        
        traverse(node);
        return { documentsCount, blocksCount };
    }

    /**
     * 创建笔记本级头部
     */
    private createNotebookHeader(tagText: string, scope: SearchScope, notebookGroupedResults: NotebookGroupedResults): HTMLElement {
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid var(--b3-theme-surface-lighter);
            background: linear-gradient(135deg, var(--b3-theme-surface-light), var(--b3-theme-surface));
        `;
        
        // 计算统计信息
        const notebookCount = Object.keys(notebookGroupedResults).length;
        const totalDocuments = Object.values(notebookGroupedResults).reduce((sum, nb) => sum + Object.keys(nb.documents).length, 0);
        const totalBlocks = Object.values(notebookGroupedResults).reduce((sum, nb) => 
            sum + Object.values(nb.documents).reduce((docSum, doc) => docSum + doc.blocks.length, 0), 0);
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 18px;
            font-weight: 600;
            color: var(--b3-theme-on-surface);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        title.innerHTML = `🔍 标签搜索：<span style="color: var(--b3-theme-primary);">${tagText}</span>`;
        
        const stats = document.createElement('div');
        stats.style.cssText = `
            font-size: 14px;
            color: var(--b3-theme-on-surface-light);
            margin-bottom: 16px;
        `;
        stats.textContent = `找到 ${totalBlocks} 个结果，分布在 ${notebookCount} 个笔记本的 ${totalDocuments} 个文档中`;
        
        // 搜索范围选择器
        const scopeSelector = this.createScopeSelector(scope, (newScope) => {
            // 切换范围重新搜索
            Logger.log('🔄 切换搜索范围:', newScope);
            this.currentScope = newScope;
            
            // 清理当前面板
            const overlay = header.closest('[style*="z-index: 1000"]') as HTMLElement;
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            
            // 重新搜索
            this.showTagSearchPanel(tagText, newScope);
        });
        
        header.appendChild(title);
        header.appendChild(stats);
        header.appendChild(scopeSelector);
        
        return header;
    }

    /**
     * 创建可滚动内容容器
     */
    private createScrollableContent(): HTMLElement {
        const container = document.createElement('div');
        container.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 0;
            max-height: 60vh;
        `;
        return container;
    }

    /**
     * 创建底部（带清理函数）
     */
    private createFooterWithCleanup(cleanup: () => void): HTMLElement {
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 16px 20px;
            border-top: 1px solid var(--b3-theme-surface-lighter);
            background: var(--b3-theme-surface);
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        `;
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = `
            padding: 8px 16px;
            border: 1px solid var(--b3-theme-surface-lighter);
            border-radius: 6px;
            background: var(--b3-theme-background);
            color: var(--b3-theme-on-surface);
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        `;
        
        // 悬停效果
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'var(--b3-theme-surface-light)';
            closeButton.style.borderColor = 'var(--b3-theme-primary)';
        });
        
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'var(--b3-theme-background)';
            closeButton.style.borderColor = 'var(--b3-theme-surface-lighter)';
        });
        
        // 点击关闭
        closeButton.addEventListener('click', cleanup);
        
        footer.appendChild(closeButton);
        return footer;
    }

    /**
     * 创建底部
     */
    private createFooter(): HTMLElement {
        return this.createFooterWithCleanup(() => {
            Logger.log('⚠️ 关闭按钮被点击，但没有清理函数');
        });
    }

    /**
     * 跳转到指定块
     */
    private navigateToBlock(blockId: string): void {
        this.debugLog('🔗 跳转到块:', blockId);
        
        // 使用思源的API跳转
        const url = `siyuan://blocks/${blockId}`;
        window.location.href = url;
    }
}

export const tagClickManager = new TagClickManager();



