import Logger from './logger';
import { isCurrentDocumentEditable, getCurrentActiveReadonlyButton } from './readonlyButtonUtils';

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
            Logger.log('✅ 操作包装器初始化完成，现在允许执行加锁操作');
        }, 3000);
    }
    
    /**
     * 🔑 统一的解锁-操作-加锁抽象方法（所有写入操作的核心包装）
     * 
     * 逻辑：
     * 1. 记录文档原始状态（锁定/解锁）
     * 2. 如果锁定，则解锁
     * 3. 执行操作
     * 4. 如果原来是锁定的，恢复锁定
     * 
     * @param operationName 操作名称（用于日志标识）
     * @param operation 要执行的操作函数
     * @returns 操作结果
     */
    public async executeWithUnlockLock<T>(
        operationName: string, 
        operation: () => Promise<T>
    ): Promise<T | null> {
        Logger.log(`🚀 开始执行写入操作: ${operationName}`);
        
        // 步骤1: 记录原始状态并解锁（如果需要）
        const wasLocked = await this.unlockIfNeeded(operationName);
        
        let result: T | null = null;
        try {
            // 步骤2: ⚡ 执行操作
            Logger.log(`⚡ 执行${operationName}操作...`);
            result = await operation();
            Logger.log(`✅ ${operationName}操作完成`);
            
        } catch (error) {
            Logger.error(`❌ ${operationName}操作失败:`, error);
            throw error;
            
        } finally {
            // 步骤3: 🔒 如果原来是锁定的，恢复锁定（无论操作成功失败）
            if (wasLocked) {
                await this.forceLock(operationName);
            } else {
                Logger.log(`📝 [${operationName}] 原来是解锁状态，保持解锁`);
            }
        }
        
        return result;
    }
    
    /**
     * 🔓 检查并解锁（如果需要）
     * @returns true 表示原来是锁定的（需要恢复），false 表示原来就是解锁的
     */
    private async unlockIfNeeded(operationName: string): Promise<boolean> {
        // 检查当前是否可编辑
        const isEditable = isCurrentDocumentEditable();
        Logger.log(`🔍 [${operationName}] 当前文档状态: ${isEditable ? '✏️ 可编辑（已解锁）' : '🔒 锁定'}`);
        
        if (isEditable) {
            // 已经是解锁状态，不需要操作
            Logger.log(`✅ [${operationName}] 文档已解锁，无需操作`);
            return false; // 原来是解锁的，不需要恢复锁定
        }
        
        // 需要解锁
        Logger.log(`🔓 [${operationName}] 文档已锁定，开始解锁...`);
        
        // 🎯 使用统一工具获取当前活跃tab的锁按钮
        const readonlyBtn = getCurrentActiveReadonlyButton();
        
        if (readonlyBtn) {
            const beforeLabel = readonlyBtn.getAttribute('aria-label');
            Logger.log(`🔓 [${operationName}] 解锁前按钮状态: ${beforeLabel}`);
            
            // 点击解锁
            readonlyBtn.click();
            await new Promise(resolve => setTimeout(resolve, 150)); // 等待解锁完成
            
            const afterLabel = readonlyBtn.getAttribute('aria-label');
            Logger.log(`🔓 [${operationName}] 解锁后按钮状态: ${afterLabel}`);
            Logger.log(`✅ [${operationName}] 解锁完成`);
            
            return true; // 原来是锁定的，需要恢复锁定
        } else {
            Logger.warn(`⚠️ [${operationName}] 未找到锁按钮，无法解锁`);
            return false;
        }
    }
    
    /**
     * 🔒 强制加锁（无条件加锁）
     */
    private async forceLock(operationName: string): Promise<void> {
        // 安全检查：只有初始化完成才加锁
        if (!this.isInitialized) {
            Logger.log(`⚠️ [${operationName}] 尚未初始化，跳过加锁`);
            return;
        }
        
        Logger.log(`🔒 [${operationName}] 开始强制加锁...`);
        
        let attempts = 0;
        const maxAttempts = 3;
        
        const tryToLock = () => {
            attempts++;
            
            // 🎯 使用统一工具获取当前活跃tab的锁按钮
            const readonlyBtn = getCurrentActiveReadonlyButton();
            
            if (readonlyBtn) {
                const currentLabel = readonlyBtn.getAttribute('aria-label');
                Logger.log(`🔒 [${operationName}] 第${attempts}次加锁尝试，当前状态: ${currentLabel}`);
                
                // 无脑点击锁按钮
                readonlyBtn.click();
                
                // 检查是否成功
                setTimeout(() => {
                    const newLabel = readonlyBtn.getAttribute('aria-label');
                    Logger.log(`🔒 [${operationName}] 第${attempts}次加锁后状态: ${newLabel}`);
                    
                    // 检查是否已经锁定
                    const isLocked = newLabel && (newLabel.includes('临时解锁') || newLabel.includes('解除锁定'));
                    
                    if (!isLocked && attempts < maxAttempts) {
                        Logger.log(`🔒 [${operationName}] 加锁未成功，300ms后重试`);
                        setTimeout(tryToLock, 300);
                    } else if (isLocked) {
                        Logger.log(`✅ [${operationName}] 强制加锁成功！`);
                    } else {
                        Logger.log(`⚠️ [${operationName}] 达到最大尝试次数，放弃加锁`);
                    }
                }, 200);
                
            } else {
                Logger.log(`❌ [${operationName}] 未找到锁按钮`);
            }
        };
        
        // 延迟一下再加锁，让操作完全完成
        await new Promise(resolve => setTimeout(resolve, 100));
        tryToLock();
    }
    
}

// 导出单例实例
export const operationWrapper = OperationWrapper.getInstance();


