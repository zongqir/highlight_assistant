/**
 * 高亮助手插件统一日志管理器
 * 所有日志都会带有 [HIGH_ASSISTANT] 前缀
 * 
 * 控制台命令：
 * - debugMode.enable() - 开启调试模式
 * - debugMode.disable() - 关闭调试模式
 * - debugMode.status() - 查看当前状态
 */
class Logger {
    private static readonly PREFIX = '[HIGH_ASSISTANT]';
    private static debugEnabled: boolean = false; // 默认关闭调试
    
    /**
     * 开启调试模式
     */
    static enableDebug(): void {
        this.debugEnabled = true;
        console.log(
            `%c${this.PREFIX} 🔓 调试模式已开启`,
            'color: #4CAF50; font-weight: bold; font-size: 14px;'
        );
        console.log(`${this.PREFIX} 💡 提示: 使用 debugMode.disable() 关闭调试`);
    }
    
    /**
     * 关闭调试模式
     */
    static disableDebug(): void {
        this.debugEnabled = false;
        console.log(
            `%c${this.PREFIX} 🔒 调试模式已关闭`,
            'color: #f44336; font-weight: bold; font-size: 14px;'
        );
        console.log(`${this.PREFIX} 💡 提示: 使用 debugMode.enable() 开启调试`);
    }
    
    /**
     * 获取调试模式状态
     */
    static isDebugEnabled(): boolean {
        return this.debugEnabled;
    }
    
    /**
     * 显示调试模式状态
     */
    static showDebugStatus(): void {
        const status = this.debugEnabled ? '🔓 开启' : '🔒 关闭';
        const color = this.debugEnabled ? '#4CAF50' : '#f44336';
        console.log(
            `%c${this.PREFIX} 调试模式状态: ${status}`,
            `color: ${color}; font-weight: bold; font-size: 14px;`
        );
    }
    
    /**
     * 普通日志（受调试开关控制）
     */
    static log(...args: any[]): void {
        if (!this.debugEnabled) return;
        console.log(this.PREFIX, ...args);
    }
    
    /**
     * 信息日志（受调试开关控制）
     */
    static info(...args: any[]): void {
        if (!this.debugEnabled) return;
        console.info(this.PREFIX, ...args);
    }
    
    /**
     * 警告日志（始终显示，不受调试开关影响）
     */
    static warn(...args: any[]): void {
        console.warn(this.PREFIX, ...args);
    }
    
    /**
     * 错误日志（始终显示，不受调试开关影响）
     */
    static error(...args: any[]): void {
        console.error(this.PREFIX, ...args);
    }
    
    /**
     * 调试日志（受调试开关控制）
     */
    static debug(...args: any[]): void {
        if (!this.debugEnabled) return;
        console.debug(this.PREFIX, '[DEBUG]', ...args);
    }
    
    /**
     * 表格日志（受调试开关控制）
     */
    static table(data: any): void {
        if (!this.debugEnabled) return;
        console.log(this.PREFIX, '表格数据:');
        console.table(data);
    }
    
    /**
     * 成功日志（受调试开关控制）
     */
    static success(...args: any[]): void {
        if (!this.debugEnabled) return;
        console.log(this.PREFIX, '✅', ...args);
    }
    
    /**
     * 失败日志（始终显示，不受调试开关影响）
     */
    static fail(...args: any[]): void {
        console.error(this.PREFIX, '❌', ...args);
    }
    
    /**
     * 功能模块日志（受调试开关控制）
     */
    static module(moduleName: string, ...args: any[]): void {
        if (!this.debugEnabled) return;
        
        const moduleIcons: { [key: string]: string } = {
            'toolbar': '🔧',
            'highlight': '🎨',
            'memo': '💭',
            'search': '🔍',
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