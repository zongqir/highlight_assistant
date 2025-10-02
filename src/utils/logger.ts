/**
 * 高亮助手插件统一日志管理器
 * 所有日志都会带有 [HIGH_ASSISTANT] 前缀
 */
class Logger {
    private static readonly PREFIX = '[HIGH_ASSISTANT]';
    
    /**
     * 普通日志
     */
    static log(...args: any[]): void {
        console.log(this.PREFIX, ...args);
    }
    
    /**
     * 信息日志
     */
    static info(...args: any[]): void {
        console.info(this.PREFIX, ...args);
    }
    
    /**
     * 警告日志
     */
    static warn(...args: any[]): void {
        console.warn(this.PREFIX, ...args);
    }
    
    /**
     * 错误日志
     */
    static error(...args: any[]): void {
        console.error(this.PREFIX, ...args);
    }
    
    /**
     * 调试日志（开发时使用）
     */
    static debug(...args: any[]): void {
        if (process.env.NODE_ENV === 'development') {
            console.debug(this.PREFIX, '[DEBUG]', ...args);
        }
    }
    
    /**
     * 表格日志
     */
    static table(data: any): void {
        console.log(this.PREFIX, '表格数据:');
        console.table(data);
    }
    
    /**
     * 成功日志
     */
    static success(...args: any[]): void {
        console.log(this.PREFIX, '✅', ...args);
    }
    
    /**
     * 失败日志
     */
    static fail(...args: any[]): void {
        console.error(this.PREFIX, '❌', ...args);
    }
    
    /**
     * 功能模块日志（带图标）
     */
    static module(moduleName: string, ...args: any[]): void {
        const moduleIcons: { [key: string]: string } = {
            'toolbar': '🔧',
            'highlight': '🎨',
            'memo': '💭',
            'search': '🔍',
            'flashcard': '🃏',
            'api': '🌐',
            'storage': '💾',
            'ui': '🎭',
            'event': '⚡',
            'util': '🛠️',
            'manager': '👔',
            'factory': '🏭',
            'style': '💄'
        };
        
        const icon = moduleIcons[moduleName.toLowerCase()] || '📦';
        console.log(this.PREFIX, `${icon} [${moduleName.toUpperCase()}]`, ...args);
    }
}

export default Logger;