/**
 * 操作包装器 - 统一的解锁-操作-加锁抽象
 * 所有文本写入操作都必须通过这个包装器执行
 */

export class OperationWrapper {
    private static instance: OperationWrapper;
    private isInitialized: boolean = false;
    
    private constructor() {
        // 单例模式
    }
    
    public static getInstance(): OperationWrapper {
        if (!OperationWrapper.instance) {
            OperationWrapper.instance = new OperationWrapper();
        }
        return OperationWrapper.instance;
    }
    
    /**
     * 初始化操作包装器
     */
    public initialize(): void {
        // 延迟设置初始化完成标记，避免启动时意外加锁
        setTimeout(() => {
            this.isInitialized = true;
            console.log('[OperationWrapper] ✅ 操作包装器初始化完成，现在允许执行加锁操作');
        }, 3000);
    }
    
    /**
     * 🔑 统一的解锁-操作-加锁抽象方法（所有写入操作的核心包装）
     * 
     * @param operationName 操作名称（用于日志标识）
     * @param operation 要执行的操作函数
     * @returns 操作结果
     */
    public async executeWithUnlockLock<T>(
        operationName: string, 
        operation: () => Promise<T>
    ): Promise<T | null> {
        console.log(`[OperationWrapper] 🚀 开始执行写入操作: ${operationName}`);
        
        // 步骤1: 🔓 无脑解锁
        const unlocked = await this.forceUnlock(operationName);
        
        let result: T | null = null;
        try {
            // 步骤2: ⚡ 执行操作
            console.log(`[OperationWrapper] ⚡ 执行${operationName}操作...`);
            result = await operation();
            console.log(`[OperationWrapper] ✅ ${operationName}操作完成`);
            
        } catch (error) {
            console.error(`[OperationWrapper] ❌ ${operationName}操作失败:`, error);
            throw error;
            
        } finally {
            // 步骤3: 🔒 无脑加锁（无论成功失败都要加锁）
            if (unlocked) {
                await this.forceLock(operationName);
            }
        }
        
        return result;
    }
    
    /**
     * 🔓 强制解锁（无条件解锁）
     */
    private async forceUnlock(operationName: string): Promise<boolean> {
        console.log(`[OperationWrapper] 🔓 [${operationName}] 开始强制解锁...`);
        
        const readonlyBtn = document.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
        
        if (readonlyBtn) {
            const beforeLabel = readonlyBtn.getAttribute('aria-label');
            console.log(`[OperationWrapper] 🔓 [${operationName}] 解锁前状态: ${beforeLabel}`);
            
            // 无脑点击解锁
            readonlyBtn.click();
            await new Promise(resolve => setTimeout(resolve, 150)); // 等待解锁完成
            
            const afterLabel = readonlyBtn.getAttribute('aria-label');
            console.log(`[OperationWrapper] 🔓 [${operationName}] 解锁后状态: ${afterLabel}`);
            console.log(`[OperationWrapper] ✅ [${operationName}] 强制解锁完成`);
            
            return true;
        } else {
            console.log(`[OperationWrapper] ❌ [${operationName}] 未找到锁按钮`);
            return false;
        }
    }
    
    /**
     * 🔒 强制加锁（无条件加锁）
     */
    private async forceLock(operationName: string): Promise<void> {
        // 安全检查：只有初始化完成才加锁
        if (!this.isInitialized) {
            console.log(`[OperationWrapper] ⚠️ [${operationName}] 尚未初始化，跳过加锁`);
            return;
        }
        
        console.log(`[OperationWrapper] 🔒 [${operationName}] 开始强制加锁...`);
        
        let attempts = 0;
        const maxAttempts = 3;
        
        const tryToLock = () => {
            attempts++;
            
            const readonlyBtn = document.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
            
            if (readonlyBtn) {
                const currentLabel = readonlyBtn.getAttribute('aria-label');
                console.log(`[OperationWrapper] 🔒 [${operationName}] 第${attempts}次加锁尝试，当前状态: ${currentLabel}`);
                
                // 无脑点击锁按钮
                readonlyBtn.click();
                
                // 检查是否成功
                setTimeout(() => {
                    const newLabel = readonlyBtn.getAttribute('aria-label');
                    console.log(`[OperationWrapper] 🔒 [${operationName}] 第${attempts}次加锁后状态: ${newLabel}`);
                    
                    // 检查是否已经锁定
                    const isLocked = newLabel && (newLabel.includes('临时解锁') || newLabel.includes('解除锁定'));
                    
                    if (!isLocked && attempts < maxAttempts) {
                        console.log(`[OperationWrapper] 🔒 [${operationName}] 加锁未成功，300ms后重试`);
                        setTimeout(tryToLock, 300);
                    } else if (isLocked) {
                        console.log(`[OperationWrapper] ✅ [${operationName}] 强制加锁成功！`);
                    } else {
                        console.log(`[OperationWrapper] ⚠️ [${operationName}] 达到最大尝试次数，放弃加锁`);
                    }
                }, 200);
                
            } else {
                console.log(`[OperationWrapper] ❌ [${operationName}] 未找到锁按钮`);
            }
        };
        
        // 延迟一下再加锁，让操作完全完成
        await new Promise(resolve => setTimeout(resolve, 100));
        tryToLock();
    }
}

// 导出单例实例
export const operationWrapper = OperationWrapper.getInstance();
