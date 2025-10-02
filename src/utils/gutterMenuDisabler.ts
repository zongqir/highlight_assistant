/**
 * Gutter 菜单禁用器
 * 用于禁用手机版长按时弹出的插件按钮（gutter 菜单）
 */

import Logger from './logger';

/**
 * 配置选项
 */
interface GutterMenuDisablerOptions {
    /** 是否启用禁用功能（默认：true，即默认禁用 gutter 菜单） */
    enabled?: boolean;
    
    /** 是否只在手机版禁用（默认：true） */
    mobileOnly?: boolean;
}

export class GutterMenuDisabler {
    private enabled: boolean;
    private mobileOnly: boolean;
    private listener: ((e: Event) => void) | null = null;
    
    constructor(options: GutterMenuDisablerOptions = {}) {
        this.enabled = options.enabled ?? true;  // ⭐ 默认为 true，即默认禁用 gutter 菜单
        this.mobileOnly = options.mobileOnly ?? true;
    }
    
    /**
     * 初始化：注册事件监听器
     */
    public init(): void {
        if (!this.enabled) {
            Logger.log('🚫 Gutter 菜单禁用器：未启用');
            return;
        }
        
        // 检查是否只在手机版禁用
        if (this.mobileOnly) {
            // 🔧 使用 siyuan 配置判断平台，而不是 body 类名
            const frontEnd = (window as any).siyuan?.config?.system?.container || '';
            const isMobile = frontEnd === 'mobile' || frontEnd.includes('mobile');
            Logger.log(`🔍 Gutter 菜单禁用器：检测平台 - frontEnd: ${frontEnd}, isMobile: ${isMobile}`);
            if (!isMobile) {
                Logger.log('🚫 Gutter 菜单禁用器：只在手机版启用，当前是桌面版');
                return;
            }
        }
        
        // 注册 contextmenu 事件监听器（捕获阶段，优先级最高）
        this.listener = (e: Event) => {
            const target = e.target as HTMLElement;
            
            Logger.log('🔍 Gutter 菜单禁用器：检测到 contextmenu 事件', {
                tagName: target.tagName,
                className: target.className,
                id: target.id,
                closest_protyle_gutters: !!target.closest('.protyle-gutters'),
                closest_button: !!target.closest('button')
            });
            
            // 检查是否是 gutter 按钮触发的 contextmenu
            if (this.isGutterButton(target)) {
                Logger.log('🚫✅ 拦截 gutter 菜单的 contextmenu 事件！');
                
                // 阻止事件传播和默认行为
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            } else {
                Logger.log('⏭️ 不是 gutter 按钮，跳过');
            }
        };
        
        document.addEventListener('contextmenu', this.listener, true); // capture: true
        Logger.log('✅ Gutter 菜单禁用器：已启用，监听器已注册');
    }
    
    /**
     * 销毁：移除事件监听器
     */
    public destroy(): void {
        if (this.listener) {
            document.removeEventListener('contextmenu', this.listener, true);
            this.listener = null;
            Logger.log('🗑️ Gutter 菜单禁用器：已销毁');
        }
    }
    
    /**
     * 判断是否是 gutter 按钮
     */
    private isGutterButton(element: HTMLElement): boolean {
        // 方法1：检查是否在 .protyle-gutters 容器内
        const gutterContainer = element.closest('.protyle-gutters');
        if (gutterContainer) {
            Logger.log('🎯 检测到：在 .protyle-gutters 容器内');
            return true;
        }
        
        // 方法2：检查是否是 gutter 按钮本身
        if (element.classList.contains('protyle-gutters')) {
            Logger.log('🎯 检测到：是 .protyle-gutters 元素本身');
            return true;
        }
        
        // 方法3：检查是否是 gutter 按钮的子元素（BUTTON 标签）
        const button = element.closest('button');
        if (button) {
            Logger.log('🎯 检测到 button，检查父元素...', {
                parentClassName: button.parentElement?.className,
                hasProtyleGutters: button.parentElement?.classList.contains('protyle-gutters')
            });
            if (button.parentElement?.classList.contains('protyle-gutters')) {
                Logger.log('🎯 检测到：button 的父元素是 .protyle-gutters');
                return true;
            }
        }
        
        // 方法4：检查是否有 data-type 属性（gutter 按钮特有的）
        if (element.hasAttribute('data-type') || element.closest('[data-type]')) {
            const dataType = element.getAttribute('data-type') || element.closest('[data-type]')?.getAttribute('data-type');
            Logger.log('🎯 检测到 data-type 属性:', dataType);
            // gutter 按钮通常有 data-type 属性
            if (dataType && !['readonly', 'collapse', 'expand'].includes(dataType)) {
                // 排除面包屑的按钮
                const inBreadcrumb = element.closest('.protyle-breadcrumb');
                if (!inBreadcrumb) {
                    Logger.log('🎯 检测到：不在面包屑中的 data-type 元素');
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * 启用禁用器
     */
    public enable(): void {
        if (!this.enabled) {
            this.enabled = true;
            this.init();
        }
    }
    
    /**
     * 禁用禁用器（恢复 gutter 菜单）
     */
    public disable(): void {
        if (this.enabled) {
            this.enabled = false;
            this.destroy();
        }
    }
}

/**
 * 全局实例（单例模式）
 */
let gutterMenuDisablerInstance: GutterMenuDisabler | null = null;

/**
 * 初始化 Gutter 菜单禁用器（单例）
 */
export function initGutterMenuDisabler(options: GutterMenuDisablerOptions = {}): GutterMenuDisabler {
    if (!gutterMenuDisablerInstance) {
        gutterMenuDisablerInstance = new GutterMenuDisabler(options);
        gutterMenuDisablerInstance.init();
    }
    return gutterMenuDisablerInstance;
}

/**
 * 获取 Gutter 菜单禁用器实例
 */
export function getGutterMenuDisabler(): GutterMenuDisabler | null {
    return gutterMenuDisablerInstance;
}

/**
 * 销毁 Gutter 菜单禁用器
 */
export function destroyGutterMenuDisabler(): void {
    if (gutterMenuDisablerInstance) {
        gutterMenuDisablerInstance.destroy();
        gutterMenuDisablerInstance = null;
    }
}

