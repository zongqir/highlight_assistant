/**
 * 触摸选择测试
 * 测试基于touchend的新方案
 */

import { createSimpleMobileManager } from '../mobile/simpleMobileManager';
import type { ISelectionInfo, HighlightColor } from '../types/highlight';

/**
 * 启动测试
 */
export function startTouchTest(): void {
    console.log('启动触摸选择测试...');
    
    // 创建简化管理器
    const manager = createSimpleMobileManager();
    
    // 设置高亮处理
    manager.onHighlight(async (color: HighlightColor, info: ISelectionInfo) => {
        console.log(`🎨 高亮 [${color}]:`, info.text.substring(0, 30) + '...');
        return true; // 使用默认处理
    });
    
    // 设置移除处理
    manager.onRemove(async (info: ISelectionInfo) => {
        console.log('🗑️ 移除高亮:', info.text.substring(0, 30) + '...');
        return true; // 使用默认处理
    });
    
    // 初始化
    manager.init();
    
    console.log('✅ 触摸选择测试已启动');
    console.log('💡 请在编辑器中选择文本测试');
    
    // 返回管理器供外部使用
    return manager;
}

/**
 * 全局启动函数
 */
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.startTouchTest = startTouchTest;
    console.log('💡 已注册 window.startTouchTest() 函数');
}

