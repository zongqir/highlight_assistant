/**
 * 闪卡快切功能相关类型定义
 */

/**
 * 筛选历史记录
 */
export interface FlashcardFilter {
    id: string;              // 文档ID或笔记本ID
    name: string;            // 显示名称
    type: 'doc' | 'notebook'; // 筛选类型
    useCount: number;        // 使用次数
    isPinned: boolean;       // 是否固定
    lastUsed: number;        // 最后使用时间戳
    createdAt: number;       // 创建时间戳
}

/**
 * 闪卡快切数据存储结构
 */
export interface FlashcardQuickSwitchData {
    version: string;                    // 数据格式版本
    filters: FlashcardFilter[];         // 筛选历史列表
    maxCount: number;                   // 最大记录数（默认10）
}

/**
 * 用户配置
 */
export interface QuickSwitchConfig {
    enabled: boolean;           // 是否启用功能
    maxHistory: number;         // 最大历史记录数（默认10）
    ballPosition: {             // 小圆球位置
        x: number;
        y: number;
    };
    autoHide: boolean;          // 是否自动隐藏
    showUsageCount: boolean;    // 是否显示使用次数
    enableDrag: boolean;        // 是否支持拖拽
}

/**
 * 筛选操作事件
 */
export interface FilterEvent {
    type: 'select' | 'switch';
    filterId: string;
    filterType: 'doc' | 'notebook';
    filterName: string;
    timestamp: number;
}

/**
 * UI状态
 */
export interface UIState {
    ballVisible: boolean;
    panelVisible: boolean;
    dragPosition?: {
        x: number;
        y: number;
    };
}

/**
 * 闪卡面板检测结果
 */
export interface FlashcardPanelInfo {
    panel: Element;
    type: 'viewcards' | 'opencard';
    filterButton?: Element;
}

/**
 * 监听器回调函数
 */
export type FilterCallback = (event: FilterEvent) => void;
export type PanelCallback = (info: FlashcardPanelInfo) => void;

/**
 * 错误代码枚举
 */
export enum ErrorCode {
    INIT_FAILED = 'QS001',
    DATA_LOAD_FAILED = 'QS002',
    SWITCH_FAILED = 'QS003',
    DATA_SAVE_FAILED = 'QS004',
    PANEL_NOT_FOUND = 'QS005',
    API_CALL_FAILED = 'QS006'
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: QuickSwitchConfig = {
    enabled: true,
    maxHistory: 10,
    ballPosition: { x: 20, y: 100 },
    autoHide: false,
    showUsageCount: true,
    enableDrag: true
};

/**
 * 数据文件相关常量
 */
export const DATA_FILE_NAME = 'flashcard-quick-switch.json';
export const DATA_VERSION = '1.0.0';