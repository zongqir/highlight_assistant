/**
 * 闪卡快切模块 - 统一导出接口
 */

// 主管理器
export { FlashcardQuickSwitchManager } from './FlashcardQuickSwitchManager';

// 子模块
export { HistoryManager } from './HistoryManager';
export { UIManager } from './UIManager';
export { FlashcardMonitor } from './FlashcardMonitor';
export { DataPersistence } from './DataPersistence';

// 类型定义
export * from './types';

// 默认导出主管理器
export { FlashcardQuickSwitchManager as default } from './FlashcardQuickSwitchManager';