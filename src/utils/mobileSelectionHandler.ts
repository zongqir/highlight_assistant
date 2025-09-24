/**
 * 手机版专用选择处理器
 * 专门解决思源手机版事件阻塞和延迟问题
 */

import type { ISelectionInfo } from '../types/highlight';
import { DOMUtils } from './domUtils';

/**
 * 手机版选择处理器配置
 */
interface IMobileHandlerConfig {
    selectionDelay: number;      // 选择延迟时间
    enableCapture: boolean;      // 是否使用捕获阶段
    enableToolbarWatch: boolean; // 是否监听工具栏
    debug: boolean;              // 调试模式
}

/**
 * 选择回调函数类型
 */
type SelectionCallback = (selectionInfo: ISelectionInfo) => void;
type HideCallback = () => void;

/**
 * 手机版选择处理器类
 * 专门处理思源手机版的选择事件和弹窗显示
 */
export class MobileSelectionHandler {
    private config: IMobileHandlerConfig;
    private selectionTimer: number = 0;
    private toolbarObserver: MutationObserver | null = null;
    private isInitialized: boolean = false;
    private lastSelectionText: string = '';
    
    // 事件回调
    private onSelectionChange: SelectionCallback | null = null;
    private onSelectionHide: HideCallback | null = null;
    
    constructor(config?: Partial<IMobileHandlerConfig>) {
        this.config = {
            selectionDelay: 600,        // 比系统620ms快20ms
            enableCapture: true,        // 使用捕获阶段
            enableToolbarWatch: true,   // 监听工具栏变化
            debug: false,
            ...config
        };
        
        this.log('手机版选择处理器初始化', this.config);
    }
    
    /**
     * 初始化处理器
     */
    public initialize(): void {
        if (this.isInitialized) {
            this.log('处理器已初始化，跳过');
            return;
        }
        
        this.log('开始初始化手机版选择处理器');
        
        // 检查是否为手机版
        if (!this.isMobileEnvironment()) {
            this.log('非手机版环境，跳过初始化');
            return;
        }
        
        this.setupSelectionListener();
        
        if (this.config.enableToolbarWatch) {
            this.setupToolbarObserver();
        }
        
        this.isInitialized = true;
        this.log('手机版选择处理器初始化完成');
    }
    
    /**
     * 销毁处理器
     */
    public destroy(): void {
        this.log('销毁手机版选择处理器');
        
        if (this.selectionTimer) {
            clearTimeout(this.selectionTimer);
            this.selectionTimer = 0;
        }
        
        // 移除选择事件监听器
        document.removeEventListener('selectionchange', this.handleSelectionChange, true);
        
        // 销毁工具栏观察器
        if (this.toolbarObserver) {
            this.toolbarObserver.disconnect();
            this.toolbarObserver = null;
        }
        
        this.isInitialized = false;
        this.onSelectionChange = null;
        this.onSelectionHide = null;
    }
    
    /**
     * 设置选择变化回调
     */
    public onSelection(callback: SelectionCallback): void {
        this.onSelectionChange = callback;
    }
    
    /**
     * 设置隐藏回调
     */
    public onHide(callback: HideCallback): void {
        this.onSelectionHide = callback;
    }
    
    /**
     * 检查是否为手机版环境
     */
    private isMobileEnvironment(): boolean {
        // 多重检查确保是手机版
        const checks = {
            isDOMUtilsMobile: DOMUtils.isMobile(),
            hasMobileClass: !!document.querySelector('.fn__mobile'),
            hasTouchSupport: 'ontouchstart' in window,
            isNarrowScreen: window.innerWidth <= 768,
            hasMobileUA: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        };
        
        this.log('手机版环境检查', checks);
        
        // 至少满足两个条件才认为是手机版
        const trueCount = Object.values(checks).filter(Boolean).length;
        return trueCount >= 2;
    }
    
    /**
     * 设置选择事件监听器
     * 使用捕获阶段，优先级最高，避免被stopImmediatePropagation阻塞
     */
    private setupSelectionListener(): void {
        this.log('设置选择事件监听器（捕获阶段）');
        
        // 使用捕获阶段监听，优先级更高
        document.addEventListener('selectionchange', this.handleSelectionChange, this.config.enableCapture);
    }
    
    /**
     * 处理选择变化事件
     * 箭头函数确保this绑定正确
     */
    private handleSelectionChange = (): void => {
        // 清除之前的定时器
        if (this.selectionTimer) {
            clearTimeout(this.selectionTimer);
            this.selectionTimer = 0;
        }
        
        // 使用比系统更快的延迟，抢先处理
        this.selectionTimer = window.setTimeout(() => {
            this.processSelection();
        }, this.config.selectionDelay);
        
        this.log(`设置选择处理定时器，延迟${this.config.selectionDelay}ms`);
    };
    
    /**
     * 处理选择逻辑
     */
    private processSelection(): void {
        const selection = window.getSelection();
        
        // 检查是否有选中文本
        if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) {
            this.handleSelectionHide();
            return;
        }
        
        const currentText = selection.toString().trim();
        
        // 避免重复处理相同选择
        if (currentText === this.lastSelectionText) {
            this.log('选择文本未变化，跳过处理');
            return;
        }
        
        this.lastSelectionText = currentText;
        this.log('处理新的选择', { text: currentText.substring(0, 20) + '...' });
        
        // 检查是否在手机版编辑器中
        const range = selection.getRangeAt(0);
        if (!this.isInMobileEditor(range)) {
            this.log('选择不在手机版编辑器中');
            this.handleSelectionHide();
            return;
        }
        
        // 获取选择信息
        const selectionInfo = DOMUtils.getSelectionInfo();
        if (!selectionInfo) {
            this.log('无法获取有效选择信息');
            this.handleSelectionHide();
            return;
        }
        
        // 触发选择回调
        if (this.onSelectionChange) {
            this.log('触发选择变化回调');
            this.onSelectionChange(selectionInfo);
        }
    }
    
    /**
     * 处理选择隐藏
     */
    private handleSelectionHide(): void {
        if (this.lastSelectionText) {
            this.lastSelectionText = '';
            this.log('触发选择隐藏回调');
            
            if (this.onSelectionHide) {
                this.onSelectionHide();
            }
        }
    }
    
    /**
     * 检查是否在手机版编辑器中
     * 手机版专用检查逻辑
     */
    private isInMobileEditor(range: Range): boolean {
        try {
            // 检查是否在protyle编辑器中
            const startContainer = range.startContainer;
            const element = startContainer.nodeType === Node.TEXT_NODE 
                ? startContainer.parentElement 
                : startContainer as HTMLElement;
            
            if (!element) {
                return false;
            }
            
            // 查找protyle编辑器容器
            const protyleElement = this.findClosestByClassName(element, "protyle-wysiwyg");
            if (!protyleElement) {
                this.log('选择不在protyle编辑器中');
                return false;
            }
            
            // 确保不在系统菜单或对话框中
            if (this.isInSystemUI(element)) {
                this.log('选择在系统UI中，跳过');
                return false;
            }
            
            // 检查是否有激活的编辑器（手机版特有）
            const hasActiveEditor = this.hasActiveMobileEditor();
            if (!hasActiveEditor) {
                this.log('没有激活的手机版编辑器');
                return false;
            }
            
            return true;
        } catch (error) {
            this.log('检查编辑器环境时出错', error);
            return false;
        }
    }
    
    /**
     * 查找最近的指定类名元素
     */
    private findClosestByClassName(element: HTMLElement, className: string): HTMLElement | null {
        let current: HTMLElement | null = element;
        let level = 0;
        
        while (current && level < 20) {
            if (current.classList && current.classList.contains(className)) {
                return current;
            }
            current = current.parentElement;
            level++;
        }
        
        return null;
    }
    
    /**
     * 检查是否在系统UI中
     */
    private isInSystemUI(element: HTMLElement): boolean {
        const systemUIClasses = [
            'b3-dialog',
            'keyboard',
            'toolbar',
            'fn__mobile-keyboard',
            'protyle-toolbar'
        ];
        
        const systemUIIds = [
            'commonMenu',
            'keyboardToolbar'
        ];
        
        let current: HTMLElement | null = element;
        let level = 0;
        
        while (current && level < 15) {
            // 检查类名
            if (current.classList) {
                for (const className of systemUIClasses) {
                    if (current.classList.contains(className)) {
                        return true;
                    }
                }
            }
            
            // 检查ID
            if (current.id && systemUIIds.includes(current.id)) {
                return true;
            }
            
            current = current.parentElement;
            level++;
        }
        
        return false;
    }
    
    /**
     * 检查是否有激活的手机版编辑器
     */
    private hasActiveMobileEditor(): boolean {
        // 检查是否有显示的protyle编辑器
        const protyles = document.querySelectorAll('.protyle:not(.fn__none)');
        if (protyles.length === 0) {
            return false;
        }
        
        // 检查是否有焦点在编辑器中
        const activeElement = document.activeElement;
        if (activeElement) {
            const isInEditor = this.findClosestByClassName(activeElement as HTMLElement, 'protyle-wysiwyg');
            if (isInEditor) {
                return true;
            }
        }
        
        // 检查是否有激活的编辑器（通过全局对象）
        try {
            // @ts-ignore - 访问思源的全局对象
            if (window.siyuan && window.siyuan.mobile && window.siyuan.mobile.editor) {
                return true;
            }
        } catch (error) {
            // 忽略错误
        }
        
        return true; // 默认认为有编辑器
    }
    
    /**
     * 设置工具栏观察器
     * 监听手机版键盘工具栏的显示/隐藏
     */
    private setupToolbarObserver(): void {
        this.log('设置工具栏观察器');
        
        const keyboardToolbar = document.getElementById('keyboardToolbar');
        if (!keyboardToolbar) {
            this.log('未找到键盘工具栏元素');
            return;
        }
        
        this.toolbarObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target as HTMLElement;
                    
                    if (target.id === 'keyboardToolbar') {
                        const isVisible = !target.classList.contains('fn__none');
                        this.log('键盘工具栏状态变化', { visible: isVisible });
                        
                        if (isVisible) {
                            // 工具栏显示时，可以添加插件按钮
                            this.handleToolbarShow(target);
                        } else {
                            // 工具栏隐藏时，隐藏插件UI
                            this.handleToolbarHide();
                        }
                    }
                }
            });
        });
        
        // 开始观察
        this.toolbarObserver.observe(keyboardToolbar, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    /**
     * 处理工具栏显示
     */
    private handleToolbarShow(toolbar: HTMLElement): void {
        this.log('键盘工具栏显示');
        // 这里可以添加插件按钮到系统工具栏的逻辑
        // 暂时留空，由上层调用者处理
    }
    
    /**
     * 处理工具栏隐藏
     */
    private handleToolbarHide(): void {
        this.log('键盘工具栏隐藏');
        // 隐藏插件相关UI
        if (this.onSelectionHide) {
            this.onSelectionHide();
        }
    }
    
    /**
     * 强制检查当前选择
     * 提供给外部调用的手动触发方法
     */
    public checkCurrentSelection(): void {
        this.log('手动检查当前选择');
        this.processSelection();
    }
    
    /**
     * 调试日志
     */
    private log(message: string, data?: any): void {
        if (this.config.debug) {
            console.log(`[MobileSelectionHandler] ${message}`, data || '');
        }
    }
}

/**
 * 创建手机版选择处理器的工厂函数
 */
export function createMobileSelectionHandler(config?: Partial<IMobileHandlerConfig>): MobileSelectionHandler {
    return new MobileSelectionHandler(config);
}

