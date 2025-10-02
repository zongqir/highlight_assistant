import Logger from './logger';
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
     * @param operationName 操作名称（用于日志标识）
     * @param operation 要执行的操作函数
     * @returns 操作结果
     */
    public async executeWithUnlockLock<T>(
        operationName: string, 
        operation: () => Promise<T>
    ): Promise<T | null> {
        Logger.log(`🚀 开始执行写入操作: ${operationName}`);
        
        // 🛡️ 兜底防御：检查文档是否处于可编辑状态，如果是则拒绝操作
        if (this.isDocumentEditable()) {
            Logger.error(`🛡️ 兜底防御触发：文档处于可编辑状态，拒绝执行 ${operationName} 操作`);
            throw new Error(`文档未锁定，禁止执行 ${operationName} 操作`);
        }
        
        // 步骤1: 🔓 无脑解锁
        const unlocked = await this.forceUnlock(operationName);
        
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
        Logger.log(`🔓 [${operationName}] 开始强制解锁...`);
        
        const readonlyBtn = document.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
        
        if (readonlyBtn) {
            const beforeLabel = readonlyBtn.getAttribute('aria-label');
            Logger.log(`🔓 [${operationName}] 解锁前状态: ${beforeLabel}`);
            
            // 无脑点击解锁
            readonlyBtn.click();
            await new Promise(resolve => setTimeout(resolve, 150)); // 等待解锁完成
            
            const afterLabel = readonlyBtn.getAttribute('aria-label');
            Logger.log(`🔓 [${operationName}] 解锁后状态: ${afterLabel}`);
            Logger.log(`✅ [${operationName}] 强制解锁完成`);
            
            return true;
        } else {
            Logger.log(`❌ [${operationName}] 未找到锁按钮`);
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
            
            const readonlyBtn = document.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
            
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
    
    /**
     * 🛡️ 兜底防御：检查当前活跃文档是否处于可编辑状态
     * 基于思源笔记源码的正确实现，每次都获取当前活跃tab
     * @returns true 如果文档可编辑（未锁定），false 如果文档已锁定
     */
    private isDocumentEditable(): boolean {
        try {
            // 🎯 关键：每次都获取当前活跃的tab和对应的锁按钮
            const readonlyBtn = this.getCurrentActiveReadonlyButton();
            
            if (!readonlyBtn) {
                Logger.warn('🛡️ 兜底防御：未找到当前活跃文档的锁按钮，假设文档可编辑');
                return true; // 找不到锁按钮时保守处理，认为可编辑
            }
            
            const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
            
            // 🎯 基于思源源码的正确判断逻辑：
            // isReadonly = target.querySelector("use").getAttribute("xlink:href") !== "#iconUnlock"
            const isReadonly = iconHref !== '#iconUnlock';
            const isEditable = !isReadonly;
            
            Logger.log(`🛡️ 兜底防御检查（当前活跃文档）:`, {
                '图标href': iconHref,
                '是否只读': isReadonly ? '🔒 是（锁定）' : '✏️ 否（解锁）',
                '是否可编辑': isEditable ? '🔓 是（可编辑）' : '🔒 否（只读）'
            });
            
            return isEditable;
            
        } catch (error) {
            Logger.error('🛡️ 兜底防御检查失败:', error);
            return true; // 出错时保守处理，认为可编辑
        }
    }
    
    /**
     * 获取当前活跃文档的锁按钮
     */
    private getCurrentActiveReadonlyButton(): HTMLElement | null {
        try {
            // 方法1: 尝试通过焦点元素查找
            const focusedElement = document.activeElement;
            if (focusedElement) {
                const protyleContainer = focusedElement.closest('.protyle') as HTMLElement;
                if (protyleContainer) {
                    const readonlyBtn = protyleContainer.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
                    if (readonlyBtn) {
                        Logger.log('✅ 通过焦点元素找到当前文档锁按钮');
                        return readonlyBtn;
                    }
                }
            }
            
            // 方法2: 查找活跃窗口中的锁按钮
            const activeWnd = document.querySelector('.layout__wnd--active');
            if (activeWnd) {
                const readonlyBtn = activeWnd.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
                if (readonlyBtn) {
                    Logger.log('✅ 通过活跃窗口找到当前文档锁按钮');
                    return readonlyBtn;
                }
            }
            
            // 方法3: 兜底方案 - 全局查找（可能不准确）
            const readonlyBtn = document.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
            if (readonlyBtn) {
                Logger.warn('⚠️ 使用兜底方案找到锁按钮（可能不是当前文档）');
                return readonlyBtn;
            }
            
            return null;
            
        } catch (error) {
            Logger.error('❌ 获取当前活跃文档锁按钮失败:', error);
            return null;
        }
    }
}

// 导出单例实例
export const operationWrapper = OperationWrapper.getInstance();


