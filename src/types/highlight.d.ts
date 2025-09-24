/**
 * 高亮助手插件类型定义
 */

// 高亮颜色类型
export type HighlightColor = 'yellow' | 'blue' | 'green' | 'pink' | 'red' | 'purple';

// 高亮类型
export type HighlightType = 'default' | 'custom';

// 高亮数据接口
export interface IHighlightData {
    /** 高亮ID */
    id: string;
    /** 高亮文本内容 */
    text: string;
    /** 高亮颜色 */
    color: HighlightColor;
    /** 高亮类型 */
    type: HighlightType;
    /** 备注内容（想法） */
    comment?: string;
    /** 创建时间 */
    created: number;
    /** 更新时间 */
    updated: number;
    /** 所在块ID */
    blockId: string;
    /** 在块中的位置 */
    range: {
        startOffset: number;
        endOffset: number;
    };
}

// 高亮配置接口
export interface IHighlightConfig {
    /** 默认高亮颜色 */
    defaultColor: HighlightColor;
    /** 可用颜色列表 */
    availableColors: HighlightColor[];
    /** 是否启用想法功能 */
    enableComments: boolean;
    /** 浮动工具栏显示延迟 */
    toolbarDelay: number;
    /** 是否在移动端启用 */
    enableOnMobile: boolean;
}

// 选择信息接口
export interface ISelectionInfo {
    /** 选中的文本 */
    text: string;
    /** 选择对象 */
    selection: Selection;
    /** 选择范围 */
    range: Range;
    /** 所在的块元素 */
    blockElement: HTMLElement;
    /** 块ID */
    blockId: string;
    /** 是否是已存在的高亮 */
    isExistingHighlight: boolean;
    /** 已存在高亮的数据 */
    existingHighlight?: IHighlightData;
}

// 浮动工具栏位置信息
export interface IToolbarPosition {
    /** X坐标 */
    x: number;
    /** Y坐标 */
    y: number;
    /** 是否需要调整位置以避免超出屏幕 */
    needsAdjustment: boolean;
}

// 高亮操作结果
export interface IHighlightResult {
    /** 操作是否成功 */
    success: boolean;
    /** 错误信息 */
    error?: string;
    /** 新创建或更新的高亮数据 */
    highlight?: IHighlightData;
    /** 操作类型 */
    action: 'create' | 'update' | 'delete';
}

// 颜色配置接口
export interface IColorConfig {
    /** 颜色标识 */
    key: HighlightColor;
    /** 显示名称 */
    name: string;
    /** 背景颜色 */
    backgroundColor: string;
    /** 文字颜色 */
    textColor: string;
    /** 图标 */
    icon: string;
    /** 是否为默认颜色 */
    isDefault: boolean;
}

// DOM操作相关接口
export interface IDOMHelpers {
    /** 查找包含指定元素的块 */
    findBlockElement(element: HTMLElement): HTMLElement | null;
    /** 获取块的ID */
    getBlockId(blockElement: HTMLElement): string | null;
    /** 创建高亮span元素 */
    createHighlightSpan(text: string, color: HighlightColor, comment?: string): HTMLSpanElement;
    /** 解析高亮span元素 */
    parseHighlightSpan(span: HTMLSpanElement): IHighlightData | null;
    /** 获取选择的位置信息 */
    getSelectionPosition(selection: Selection): IToolbarPosition | null;
}

// 事件回调接口
export interface IHighlightEventCallbacks {
    /** 高亮创建后回调 */
    onHighlightCreated?: (highlight: IHighlightData) => void;
    /** 高亮更新后回调 */
    onHighlightUpdated?: (highlight: IHighlightData) => void;
    /** 高亮删除后回调 */
    onHighlightDeleted?: (highlightId: string) => void;
    /** 选择变化回调 */
    onSelectionChanged?: (selection: ISelectionInfo | null) => void;
    /** 工具栏显示回调 */
    onToolbarShow?: (position: IToolbarPosition) => void;
    /** 工具栏隐藏回调 */
    onToolbarHide?: () => void;
}

// 模块接口
export interface IHighlightModule {
    /** 模块名称 */
    name: string;
    /** 初始化模块 */
    init(): Promise<void>;
    /** 销毁模块 */
    destroy(): Promise<void>;
    /** 是否已初始化 */
    isInitialized: boolean;
}

// 主管理器接口
export interface IHighlightManager extends IHighlightModule {
    /** 创建高亮 */
    createHighlight(selection: ISelectionInfo, color: HighlightColor, comment?: string): Promise<IHighlightResult>;
    /** 更新高亮 */
    updateHighlight(highlightId: string, data: Partial<IHighlightData>): Promise<IHighlightResult>;
    /** 删除高亮 */
    deleteHighlight(highlightId: string): Promise<IHighlightResult>;
    /** 获取块中的所有高亮 */
    getBlockHighlights(blockId: string): IHighlightData[];
    /** 渲染块中的高亮 */
    renderHighlights(blockElement: HTMLElement): void;
    /** 设置事件回调 */
    setEventCallbacks(callbacks: IHighlightEventCallbacks): void;
}

// 全局类型声明扩展
declare global {
    interface Window {
        highlightAssistant?: {
            manager: IHighlightManager;
            config: IHighlightConfig;
        };
    }
}

