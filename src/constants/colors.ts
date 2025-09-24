/**
 * 高亮颜色配置
 */

import type { IColorConfig, HighlightColor, IHighlightConfig } from '../types/highlight';

// 颜色配置映射
export const HIGHLIGHT_COLORS: Record<HighlightColor, IColorConfig> = {
    yellow: {
        key: 'yellow',
        name: '黄色',
        backgroundColor: '#fff3cd',
        textColor: '#856404',
        icon: '🟡',
        isDefault: true
    },
    blue: {
        key: 'blue',
        name: '蓝色',
        backgroundColor: '#cce5ff',
        textColor: '#004085',
        icon: '🔵',
        isDefault: false
    },
    green: {
        key: 'green',
        name: '绿色',
        backgroundColor: '#d4e6d4',
        textColor: '#155724',
        icon: '🟢',
        isDefault: false
    },
    pink: {
        key: 'pink',
        name: '粉色',
        backgroundColor: '#f8d7da',
        textColor: '#721c24',
        icon: '🩷',
        isDefault: false
    }
};

// 默认配置
export const DEFAULT_CONFIG: IHighlightConfig = {
    defaultColor: 'yellow',
    availableColors: ['yellow', 'blue', 'green', 'pink'],
    enableComments: true,
    toolbarDelay: 200,
    enableOnMobile: true
};

// CSS类名常量
export const CSS_CLASSES = {
    // 高亮相关
    HIGHLIGHT_SPAN: 'highlight-assistant-span',
    HIGHLIGHT_DEFAULT: 'highlight-assistant-default',
    HIGHLIGHT_CUSTOM: 'highlight-assistant-custom',
    
    // 浮动工具栏
    FLOATING_TOOLBAR: 'highlight-assistant-toolbar',
    TOOLBAR_BUTTON: 'highlight-assistant-toolbar-btn',
    TOOLBAR_VISIBLE: 'highlight-assistant-toolbar-visible',
    TOOLBAR_HIDDEN: 'highlight-assistant-toolbar-hidden',
    
    // 颜色按钮
    COLOR_BUTTON: 'highlight-assistant-color-btn',
    
    // 操作按钮
    ACTION_BUTTON: 'highlight-assistant-action-btn',
    DELETE_BUTTON: 'highlight-assistant-delete-btn',
    COMMENT_BUTTON: 'highlight-assistant-comment-btn',
    
    // 状态类
    SELECTED: 'highlight-assistant-selected',
    ACTIVE: 'highlight-assistant-active',
    MOBILE: 'highlight-assistant-mobile',
    
    // 动画类
    FADE_IN: 'highlight-assistant-fade-in',
    FADE_OUT: 'highlight-assistant-fade-out',
    SLIDE_UP: 'highlight-assistant-slide-up',
    SLIDE_DOWN: 'highlight-assistant-slide-down'
};

// 数据属性常量
export const DATA_ATTRIBUTES = {
    HIGHLIGHT_TYPE: 'data-highlight-type',
    HIGHLIGHT_COLOR: 'data-highlight-color',
    HIGHLIGHT_COMMENT: 'data-highlight-comment',
    HIGHLIGHT_ID: 'data-highlight-id',
    HIGHLIGHT_CREATED: 'data-highlight-created',
    HIGHLIGHT_UPDATED: 'data-highlight-updated',
    BLOCK_ID: 'data-node-id'
};

// 选择器常量
export const SELECTORS = {
    // 思源笔记相关
    PROTYLE_WYSIWYG: '.protyle-wysiwyg',
    PROTYLE_BLOCK: '[data-node-id]',
    PROTYLE_CONTENT: '.protyle-content',
    
    // 高亮相关
    HIGHLIGHT_SPAN: `.${CSS_CLASSES.HIGHLIGHT_SPAN}`,
    EXISTING_HIGHLIGHT: `span[${DATA_ATTRIBUTES.HIGHLIGHT_TYPE}]`,
    DEFAULT_HIGHLIGHT: 'mark, .mark',
    
    // 工具栏
    FLOATING_TOOLBAR: `.${CSS_CLASSES.FLOATING_TOOLBAR}`,
    
    // 移动端检测
    MOBILE_INDICATOR: '.fn__mobile'
};

// 事件名称常量
export const EVENTS = {
    // 选择事件
    SELECTION_CHANGE: 'selectionchange',
    MOUSE_UP: 'mouseup',
    TOUCH_END: 'touchend',
    
    // 高亮事件
    HIGHLIGHT_CREATED: 'highlight:created',
    HIGHLIGHT_UPDATED: 'highlight:updated',
    HIGHLIGHT_DELETED: 'highlight:deleted',
    
    // 工具栏事件
    TOOLBAR_SHOW: 'toolbar:show',
    TOOLBAR_HIDE: 'toolbar:hide',
    
    // 插件事件
    PLUGIN_LOADED: 'plugin:loaded',
    PLUGIN_UNLOADED: 'plugin:unloaded'
};

// 时间常量（毫秒）
export const TIMING = {
    TOOLBAR_SHOW_DELAY: 200,
    TOOLBAR_HIDE_DELAY: 100,
    SELECTION_DEBOUNCE: 150,
    ANIMATION_DURATION: 200,
    TOUCH_HOLD_DURATION: 500
};

// 尺寸常量（像素）
export const DIMENSIONS = {
    TOOLBAR_HEIGHT: 44,
    TOOLBAR_PADDING: 8,
    BUTTON_SIZE: 36,
    BUTTON_MARGIN: 4,
    MIN_SELECTION_LENGTH: 1,
    MAX_SELECTION_LENGTH: 1000,
    TOOLBAR_OFFSET_Y: 10,
    SCREEN_EDGE_MARGIN: 16
};

// Z-Index 层级
export const Z_INDEX = {
    FLOATING_TOOLBAR: 9999,
    HIGHLIGHT_OVERLAY: 100
};

// 正则表达式
export const REGEX = {
    // 匹配思源默认高亮语法 ==text==
    DEFAULT_HIGHLIGHT: /==([^=]+)==/g,
    // 匹配HTML实体
    HTML_ENTITIES: /&[a-zA-Z0-9#]+;/g,
    // 匹配空白字符
    WHITESPACE: /^\s*$/,
    // 匹配块ID格式
    BLOCK_ID: /^\d{14}-[a-z0-9]{7}$/
};

// 错误消息
export const ERROR_MESSAGES = {
    INVALID_SELECTION: '无效的文本选择',
    BLOCK_NOT_FOUND: '未找到对应的块',
    HIGHLIGHT_EXISTS: '该文本已经被高亮',
    SAVE_FAILED: '保存高亮失败',
    DELETE_FAILED: '删除高亮失败',
    INVALID_COLOR: '无效的高亮颜色',
    INVALID_BLOCK_ID: '无效的块ID',
    MODULE_NOT_INITIALIZED: '模块未初始化',
    UNSUPPORTED_BROWSER: '浏览器不支持该功能'
};

// 成功消息
export const SUCCESS_MESSAGES = {
    HIGHLIGHT_CREATED: '高亮创建成功',
    HIGHLIGHT_UPDATED: '高亮更新成功',
    HIGHLIGHT_DELETED: '高亮删除成功',
    COMMENT_ADDED: '想法添加成功',
    COMMENT_UPDATED: '想法更新成功'
};

// 调试标志
export const DEBUG = {
    ENABLED: process.env.NODE_ENV === 'development',
    LOG_SELECTIONS: false,
    LOG_HIGHLIGHTS: false,
    LOG_TOOLBAR: false,
    LOG_PERFORMANCE: false
};

