import Logger from './logger';
import { getCurrentActiveReadonlyButton, isCurrentDocumentReadonly } from './readonlyButtonUtils';

/**
 * 只读状态监听器
 * 
 * 功能：
 * 1. 监听锁按钮的点击事件
 * 2. 监听锁按钮的DOM属性变化
 * 3. 当状态改变时，立即通知所有订阅者
 * 4. 缓存当前状态，避免重复查询
 */

type ReadonlyStateChangeCallback = (isReadonly: boolean) => void;

export class ReadonlyStateMonitor {
    private static instance: ReadonlyStateMonitor;
    private callbacks: Set<ReadonlyStateChangeCallback> = new Set();
    private currentState: boolean | null = null;
    private clickListener: ((e: MouseEvent) => void) | null = null;
    private mutationObserver: MutationObserver | null = null;
    private isMonitoring: boolean = false;
    
    private constructor() {
        // 单例模式
    }
    
    public static getInstance(): ReadonlyStateMonitor {
        if (!ReadonlyStateMonitor.instance) {
            ReadonlyStateMonitor.instance = new ReadonlyStateMonitor();
        }
        return ReadonlyStateMonitor.instance;
    }
    
    /**
     * 启动监听
     */
    public startMonitoring(): void {
        if (this.isMonitoring) {
            Logger.log('📡 [StateMonitor] 已经在监听中，跳过重复启动');
            return;
        }
        
        Logger.log('📡 [StateMonitor] 启动只读状态监听...');
        
        // 1. 立即获取初始状态
        this.updateState();
        
        // 2. 监听锁按钮的点击事件（事件代理）
        this.setupClickListener();
        
        // 3. 监听DOM变化（兜底方案）
        this.setupMutationObserver();
        
        this.isMonitoring = true;
        Logger.log('✅ [StateMonitor] 监听已启动');
    }
    
    /**
     * 停止监听
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }
        
        Logger.log('📡 [StateMonitor] 停止监听...');
        
        // 移除点击监听
        if (this.clickListener) {
            document.removeEventListener('click', this.clickListener, true);
            this.clickListener = null;
        }
        
        // 断开MutationObserver
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        
        this.isMonitoring = false;
        Logger.log('✅ [StateMonitor] 监听已停止');
    }
    
    /**
     * 订阅状态变化
     */
    public subscribe(callback: ReadonlyStateChangeCallback): () => void {
        this.callbacks.add(callback);
        
        // 立即调用一次，传入当前状态
        if (this.currentState !== null) {
            callback(this.currentState);
        }
        
        Logger.log(`📡 [StateMonitor] 新增订阅者，当前订阅者数量: ${this.callbacks.size}`);
        
        // 返回取消订阅的函数
        return () => {
            this.callbacks.delete(callback);
            Logger.log(`📡 [StateMonitor] 移除订阅者，当前订阅者数量: ${this.callbacks.size}`);
        };
    }
    
    /**
     * 手动触发状态更新（供外部调用）
     */
    public forceUpdate(): void {
        Logger.log('📡 [StateMonitor] 手动触发状态更新');
        this.updateState();
    }
    
    /**
     * 获取当前缓存的状态
     */
    public getCurrentState(): boolean | null {
        return this.currentState;
    }
    
    /**
     * 设置点击事件监听（事件代理）
     */
    private setupClickListener(): void {
        this.clickListener = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // 检查是否点击了锁按钮或其子元素
            const readonlyBtn = target.closest('button[data-type="readonly"]') as HTMLElement;
            
            if (readonlyBtn) {
                Logger.log('🔔 [StateMonitor] 检测到锁按钮点击');
                
                // 延迟一下再获取状态，让思源的点击处理先完成
                setTimeout(() => {
                    this.updateState();
                }, 150);
            }
        };
        
        // 使用捕获阶段，确保能第一时间捕获到事件
        document.addEventListener('click', this.clickListener, true);
    }
    
    /**
     * 设置DOM变化监听（兜底方案）
     */
    private setupMutationObserver(): void {
        this.mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes') {
                    const target = mutation.target as HTMLElement;
                    
                    // 检查是否是锁按钮的属性变化
                    if (target.matches('button[data-type="readonly"]') || 
                        target.closest('button[data-type="readonly"]')) {
                        
                        Logger.log('🔔 [StateMonitor] 检测到锁按钮DOM属性变化');
                        
                        // 延迟一下再获取状态
                        setTimeout(() => {
                            this.updateState();
                        }, 100);
                        
                        break;
                    }
                }
            }
        });
        
        // 监听整个document的属性变化
        this.mutationObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['aria-label', 'data-subtype', 'class'],
            subtree: true
        });
    }
    
    /**
     * 更新状态并通知订阅者
     */
    private updateState(): void {
        try {
            const newState = isCurrentDocumentReadonly();
            
            // 只有状态真正改变时才通知
            if (newState !== this.currentState) {
                const oldState = this.currentState;
                this.currentState = newState;
                
                Logger.log('🔄 [StateMonitor] 状态变化:', {
                    '旧状态': oldState === null ? '未知' : (oldState ? '🔒 只读' : '✏️ 可编辑'),
                    '新状态': newState ? '🔒 只读' : '✏️ 可编辑',
                    '订阅者数量': this.callbacks.size
                });
                
                // 通知所有订阅者
                this.notifySubscribers(newState);
            } else {
                Logger.log('📡 [StateMonitor] 状态未变化，保持:', newState ? '🔒 只读' : '✏️ 可编辑');
            }
            
        } catch (error) {
            Logger.error('❌ [StateMonitor] 更新状态失败:', error);
        }
    }
    
    /**
     * 通知所有订阅者
     */
    private notifySubscribers(isReadonly: boolean): void {
        if (this.callbacks.size === 0) {
            Logger.log('📡 [StateMonitor] 无订阅者，跳过通知');
            return;
        }
        
        Logger.log(`📢 [StateMonitor] 通知 ${this.callbacks.size} 个订阅者...`);
        
        this.callbacks.forEach((callback) => {
            try {
                callback(isReadonly);
            } catch (error) {
                Logger.error('❌ [StateMonitor] 订阅者回调执行失败:', error);
            }
        });
    }
}

// 导出单例实例
export const readonlyStateMonitor = ReadonlyStateMonitor.getInstance();

