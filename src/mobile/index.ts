/**
 * 手机版高亮解决方案入口文件
 * 提供便捷的导入和使用方式
 */

// 主要类和工厂函数
export { MobileHighlightManager, createMobileHighlightManager } from './mobileHighlightManager';
export { MobileSelectionHandler, createMobileSelectionHandler } from '../utils/mobileSelectionHandler';
export { MobilePopup, createMobilePopup } from '../components/mobilePopup';

// 类型定义
export type { ISelectionInfo, HighlightColor } from '../types/highlight';

// 便捷的工厂函数
import { createMobileHighlightManager } from './mobileHighlightManager';
import type { ISelectionInfo, HighlightColor } from '../types/highlight';

/**
 * 创建一个预配置的手机版高亮管理器
 * 使用最佳实践的默认配置
 */
export function createOptimizedMobileManager(customConfig?: {
    colors?: HighlightColor[];
    debug?: boolean;
    onHighlight?: (color: HighlightColor, selection: ISelectionInfo) => Promise<boolean>;
    onComment?: (selection: ISelectionInfo) => Promise<void>;
    onRemove?: (selection: ISelectionInfo) => Promise<boolean>;
}) {
    return createMobileHighlightManager({
        // 选择处理器优化配置
        selectionDelay: 600,        // 比系统620ms快20ms
        enableCapture: true,        // 使用捕获阶段，最高优先级
        enableToolbarWatch: true,   // 监听工具栏变化
        
        // 弹窗优化配置
        colors: customConfig?.colors || ['yellow', 'green', 'blue', 'pink', 'red', 'purple'],
        showCommentButton: true,    // 启用备注功能
        autoHideDelay: 0,          // 手动控制隐藏
        
        // 调试配置
        debug: customConfig?.debug || false,
        autoInit: true             // 自动初始化
    }, {
        onHighlight: customConfig?.onHighlight,
        onComment: customConfig?.onComment,
        onRemove: customConfig?.onRemove,
        onSelectionChange: (selection) => {
            if (customConfig?.debug) {
                console.log('[Mobile] 选择变化:', selection.text.substring(0, 20) + '...');
            }
        },
        onSelectionHide: () => {
            if (customConfig?.debug) {
                console.log('[Mobile] 选择隐藏');
            }
        }
    });
}

/**
 * 创建一个简单的手机版高亮管理器
 * 用于快速测试和原型开发
 */
export function createSimpleMobileManager(debug: boolean = false) {
    return createMobileHighlightManager({
        debug,
        colors: ['yellow', 'green', 'blue'],
        selectionDelay: 600,
        showCommentButton: false
    }, {
        onHighlight: async (color, selection) => {
            console.log(`[Simple] 高亮 ${color}:`, selection.text);
            return true;
        },
        onRemove: async (selection) => {
            console.log('[Simple] 移除高亮:', selection.text);
            return true;
        }
    });
}

/**
 * 检查当前环境是否支持手机版高亮
 */
export function isMobileEnvironmentSupported(): boolean {
    // 检查是否为手机版
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    window.innerWidth <= 768 ||
                    'ontouchstart' in window ||
                    document.querySelector('.fn__mobile') !== null;
    
    // 检查是否有protyle编辑器
    const hasProtyle = !!document.querySelector('.protyle-wysiwyg');
    
    // 检查是否支持选择API
    const hasSelectionAPI = typeof window.getSelection === 'function';
    
    return isMobile && hasProtyle && hasSelectionAPI;
}

/**
 * 获取推荐的配置
 */
export function getRecommendedConfig() {
    return {
        // 核心配置 - 解决思源手机版事件阻塞
        selectionDelay: 600,        // 比系统620ms快，抢先处理
        enableCapture: true,        // 捕获阶段监听，最高优先级
        enableToolbarWatch: true,   // 双重保险机制
        
        // UI配置 - 优化手机版体验
        colors: ['yellow', 'green', 'blue', 'pink', 'red', 'purple'],
        showCommentButton: true,
        autoHideDelay: 0,
        
        // 开发配置
        debug: process.env.NODE_ENV === 'development',
        autoInit: true
    };
}

/**
 * 默认导出 - 最常用的工厂函数
 */
export default createOptimizedMobileManager;

