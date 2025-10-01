/**
 * 备注管理器 - 处理所有备注相关功能
 */

import { updateBlock } from '../api';
import { isSystemReadOnly } from './readonlyChecker';
import { getAllEditor } from "siyuan";
import { operationWrapper } from './operationWrapper';

export class MemoManager {
    private api: any;
    private isInitialized: boolean = false; // 🔑 添加初始化完成标记
    
    constructor() {
        // 保留 API 用于备注功能
        this.api = {
            getBlockKramdown: async (blockId: string) => {
                const payload = { id: blockId };
                const response = await fetch('/api/block/getBlockKramdown', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                return await response.json();
            }
        };
        
    }
    
    /**
     * 初始化备注功能
     */
    public initialize(): void {
        console.log('[MemoManager] ✅ 备注管理器初始化完成（移除了全局监听器，改为主动控制）');
        // 移除了 startMemoUIWatcher()，不再使用全局监听器
        
        // 🔑 初始化公共操作包装器
        operationWrapper.initialize();
        
        // 🔑 恢复点击已有备注弹出编辑框的功能
        this.setupClickToEditMemo();
        
        // 🔑 延迟设置初始化完成标记
        setTimeout(() => {
            this.isInitialized = true;
            console.log('[MemoManager] ✅ 备注管理器初始化完成，现在允许执行加锁操作');
        }, 2000);
    }

    /**
     * 设置点击备注弹出编辑框的功能
     */
    private setupClickToEditMemo(): void {
        console.log('[MemoManager] 🎯 设置点击备注弹出编辑框功能...');
        
        // 监听点击事件（使用事件捕获，确保能够拦截）
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            // 检查是否点击了备注元素
            if (target && target.getAttribute('data-type') === 'inline-memo') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                console.log('[MemoManager] 🎯 点击了备注元素，显示编辑框');
                
                // 显示自定义备注编辑对话框
                this.showCustomMemoDialog(target);
                
                return false;
            }
        }, true); // 使用捕获阶段拦截
        
        console.log('[MemoManager] ✅ 点击备注编辑功能已启动');
    }

    // 已移除重复的解锁-加锁逻辑，改用公共 operationWrapper

    /**
     * 恢复只读模式（无脑加锁 - 按你的要求，多次尝试确保成功）
     */
    private restoreReadonlyMode(): void {
        // 🔑 安全检查：只有在初始化完成后才执行加锁操作
        if (!this.isInitialized) {
            console.log('[MemoManager] ⚠️ 备注管理器尚未完全初始化，跳过加锁操作（避免启动时意外加锁）');
            return;
        }
        
        console.log('[MemoManager] 🔒 开始无脑加锁...');
        
        let attempts = 0;
        const maxAttempts = 3;
        
        const tryToLock = () => {
            attempts++;
            
            const readonlyBtn = document.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
            
            if (readonlyBtn) {
                const currentLabel = readonlyBtn.getAttribute('aria-label');
                console.log(`[MemoManager] 🔒 第${attempts}次尝试加锁，按钮状态:`, currentLabel);
                
                // 无脑点击锁按钮
                readonlyBtn.click();
                console.log(`[MemoManager] 🔒 第${attempts}次点击已执行`);
                
                // 检查是否成功（延迟检查）
        setTimeout(() => {
                    const newLabel = readonlyBtn.getAttribute('aria-label');
                    console.log(`[MemoManager] 🔒 第${attempts}次点击后状态:`, newLabel);
                    
                    // 检查是否已经锁定
                    // 🔑 修复：正确判断锁定状态
                    // '解除锁定'/'临时解锁' = 已锁定，'锁定编辑'/'取消临时解锁' = 可编辑
                    const isLocked = newLabel && (newLabel.includes('临时解锁') || newLabel.includes('解除锁定'));
                    
                    if (!isLocked && attempts < maxAttempts) {
                        console.log(`[MemoManager] 🔒 未锁定，${300}ms后重试`);
                        setTimeout(tryToLock, 300);
                    } else if (isLocked) {
                        console.log('[MemoManager] ✅ 成功加锁！');
                    } else {
                        console.log('[MemoManager] ⚠️ 已达最大尝试次数，放弃');
                    }
                }, 200);
                
            } else {
                console.log('[MemoManager] ❌ 未找到锁按钮');
            }
        };
        
        tryToLock();
    }
    
    
    /**
     * 拦截原生备注功能
     */
    // 已移除 interceptNativeMemo 方法，改为主动控制模式

    /**
     * 拦截思源的备注相关方法
     */
    private interceptSiYuanMemoMethods(): void {
        try {
            // 拦截可能的思源备注相关全局方法
            const originalPrompt = window.prompt;
            
            // 检测是否为备注相关的弹窗
            window.prompt = (message?: string, defaultText?: string) => {
                if (message && (message.includes('备注') || message.includes('memo') || message.includes('想法'))) {
                    return null; // 取消原生弹窗
                }
                return originalPrompt.call(window, message, defaultText);
            };
            
            console.log('已设置备注方法拦截');
        } catch (error) {
            console.log('备注方法拦截设置完成');
        }
    }

    /**
     * 显示自定义备注对话框 - 使用统一的解锁-操作-加锁包装
     */
    private async showCustomMemoDialog(memoElement?: HTMLElement): Promise<void> {
        console.log('\n[MemoManager] 💬 ========== 显示备注弹窗 ==========');
        
        if (!memoElement) {
            console.warn('[MemoManager] 备注元素不存在');
            return;
        }

        const existingContent = memoElement.getAttribute('data-inline-memo-content') || '';
        const selectedText = memoElement.textContent || '';
        
        console.log('[MemoManager] 🎨 准备显示备注输入对话框...');
        const memoText = await this.showEnhancedMemoInput(selectedText, existingContent);
        console.log('[MemoManager] 📤 用户输入结果:', memoText ? '有内容' : '取消或为空');
        
        if (memoText !== null) {
            if (memoText === '__DELETE_MEMO__') {
                // 🔑 删除备注操作 - 使用操作包装器
                await operationWrapper.executeWithUnlockLock(
                    '删除备注',
                    async () => {
                        await this.performDeleteMemo(memoElement);
                    }
                );
            } else {
                // 🔑 更新备注操作 - 使用操作包装器  
                await operationWrapper.executeWithUnlockLock(
                    '更新备注',
                    async () => {
                        await this.performUpdateMemo(memoElement, memoText);
                    }
                );
            }
        }
        
        console.log('[MemoManager] ========== 备注弹窗流程结束 ==========\n');
    }

    /**
     * 执行删除备注的核心逻辑（不包含解锁加锁）
     */
    private async performDeleteMemo(memoElement: HTMLElement): Promise<void> {
        const blockElement = this.findBlockElement(memoElement);
        if (!blockElement) {
            throw new Error('未找到块元素');
        }

        const blockId = blockElement.getAttribute('data-node-id');
        if (!blockId) {
            throw new Error('未找到块ID');
        }

        const oldContent = blockElement.innerHTML;

        // 删除备注元素 - 替换为纯文本
        const textContent = memoElement.textContent || '';
        const textNode = document.createTextNode(textContent);
        memoElement.parentNode?.replaceChild(textNode, memoElement);

        // 保存到思源
        const newContent = await this.extractMarkdownFromBlock(blockElement);
        const updateResult = await updateBlock("dom", newContent, blockId);

        if (!updateResult) {
            // 恢复原始内容
            blockElement.innerHTML = oldContent;
            throw new Error('备注删除失败');
        }

        console.log('[MemoManager] ✅ 备注删除成功');
    }

    /**
     * 执行更新备注的核心逻辑（不包含解锁加锁）
     */
    private async performUpdateMemo(memoElement: HTMLElement, memoText: string): Promise<void> {
        // 更新备注内容
        memoElement.setAttribute('data-inline-memo-content', memoText);
        console.log('[MemoManager] ✅ 备注已更新:', memoText);
        
        // 保存到思源
        await this.saveMemoToSiYuanWithoutLock(memoElement, memoText);
    }

    /**
     * 保存备注到思源（不包含解锁加锁）
     */
    private async saveMemoToSiYuanWithoutLock(memoElement: HTMLElement, memoText: string): Promise<void> {
        const blockElement = this.findBlockElement(memoElement);
        if (!blockElement) {
            throw new Error('未找到块元素');
        }

        const blockId = blockElement.getAttribute("data-node-id");
        if (!blockId) {
            throw new Error('未找到块ID');
        }

        // 提取并保存内容
        const newContent = await this.extractMarkdownFromBlock(blockElement);
        const updateResult = await updateBlock("dom", newContent, blockId);

        if (!updateResult) {
            throw new Error('备注保存失败');
        }
        
        console.log('[MemoManager] ✅ 备注保存成功');
    }

    /**
     * 删除备注元素
     */
    private async deleteMemoFromElement(memoElement: HTMLElement): Promise<void> {
        try {
            // 找到包含备注的块
            const blockElement = this.findBlockElement(memoElement);
            if (!blockElement) {
                console.warn('未找到块元素');
                return;
            }

            const blockId = blockElement.getAttribute("data-node-id");
            if (!blockId) {
                console.warn('未找到块ID');
                return;
            }

            // 保存原始内容用于回滚
            const oldContent = blockElement.innerHTML;

            // 将备注元素替换为纯文本
            const textContent = memoElement.textContent || '';
            const textNode = document.createTextNode(textContent);
            memoElement.parentNode?.replaceChild(textNode, memoElement);

            // 提取并保存内容
            const newContent = await this.extractMarkdownFromBlock(blockElement);
            const updateResult = await updateBlock("dom", newContent, blockId);

            if (updateResult) {
                console.log('✅ 备注删除成功');
            } else {
                console.error('❌ 备注删除失败');
                // 恢复原始内容
                blockElement.innerHTML = oldContent;
            }
        } catch (error) {
            console.error('删除备注出错:', error);
        }
    }

    /**
     * 保存备注到思源
     */
    private async saveMemoToSiYuan(memoElement: HTMLElement, memoText: string): Promise<void> {
        try {
            // 找到包含备注的块
            const blockElement = this.findBlockElement(memoElement);
            if (!blockElement) {
                console.warn('未找到块元素');
                return;
            }

            const blockId = blockElement.getAttribute("data-node-id");
            if (!blockId) {
                console.warn('未找到块ID');
                return;
            }

            // 提取并保存内容
            const newContent = await this.extractMarkdownFromBlock(blockElement);
            const updateResult = await updateBlock("dom", newContent, blockId);

            if (updateResult) {
                console.log('✅ 备注保存成功');
            } else {
                console.error('❌ 备注保存失败');
            }
        } catch (error) {
            console.error('保存备注出错:', error);
        }
    }

    /**
     * 为范围添加备注 - 使用统一的解锁-操作-加锁包装
     */
    public async addMemoWithPrompt(range: Range): Promise<void> {
            const selectedText = range.toString().trim();
            if (!selectedText) {
                console.warn('请先选择要添加备注的文本');
                return;
            }

        // 🔑 使用统一的操作包装器
        await operationWrapper.executeWithUnlockLock(
            '添加备注',
            async () => {
                return await this.performAddMemo(range, selectedText);
            }
        );
    }

    /**
     * 执行添加备注的核心逻辑（不包含解锁加锁）
     */
    private async performAddMemo(range: Range, selectedText: string): Promise<void> {
        // 获取 protyle 对象
        const editors = getAllEditor();
        const protyle = editors[0]?.protyle;
        
        if (!protyle || !protyle.toolbar) {
            throw new Error('protyle.toolbar 不可用');
        }
        
        // 触发思源原生备注弹窗
        protyle.toolbar.range = range;
        protyle.toolbar.setInlineMark(protyle, "inline-memo", "range", {
            type: "inline-memo",
        });
        
        // 等待并处理原生弹窗
        await this.waitAndHandleNativePopupWithoutLock(selectedText);
    }

    /**
     * 等待并处理原生备注弹窗 - 不包含锁定逻辑的版本
     */
    private async waitAndHandleNativePopupWithoutLock(selectedText: string): Promise<void> {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20;
            
            const checkForPopup = () => {
                attempts++;
                
                // 查找原生备注弹窗
                const popup = document.querySelector('.protyle-util') as HTMLElement;
                const textarea = popup?.querySelector('textarea.b3-text-field') as HTMLTextAreaElement;
                
                if (popup && textarea) {
                    console.log('[MemoManager] 🎯 找到原生备注弹窗，开始处理');
                    this.handleNativePopupDirectlyWithoutLock(popup, textarea, selectedText)
                        .then(resolve)
                        .catch(reject);
                } else if (attempts >= maxAttempts) {
                    console.error('[MemoManager] 等待原生弹窗超时');
                    reject(new Error('等待原生弹窗超时'));
                } else {
                    // 继续等待
                    setTimeout(checkForPopup, 50);
                }
            };
            
            checkForPopup();
        });
    }

    /**
     * 等待并处理原生备注弹窗 - 主动控制模式的核心（旧版本，包含锁定逻辑）
     */
    private async waitAndHandleNativePopup(selectedText: string): Promise<void> {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20;
            
            const checkForPopup = () => {
                attempts++;
                
                // 查找原生备注弹窗
                const popup = document.querySelector('.protyle-util') as HTMLElement;
                const textarea = popup?.querySelector('textarea.b3-text-field') as HTMLTextAreaElement;
                
                if (popup && textarea) {
                    console.log('[MemoManager] 🎯 找到原生备注弹窗，开始处理');
                    this.handleNativePopupDirectly(popup, textarea, selectedText)
                        .then(resolve)
                        .catch(reject);
                } else if (attempts >= maxAttempts) {
                    console.error('[MemoManager] 等待原生弹窗超时');
                    reject(new Error('等待原生弹窗超时'));
                } else {
                    // 继续等待
                    setTimeout(checkForPopup, 50);
                }
            };
            
            checkForPopup();
        });
    }

    /**
     * 直接处理原生弹窗 - 不包含锁定逻辑的版本
     */
    private async handleNativePopupDirectlyWithoutLock(
        nativePopup: HTMLElement, 
        nativeTextArea: HTMLTextAreaElement, 
        selectedText: string
    ): Promise<void> {
        try {
            // 隐藏原生弹窗
            nativePopup.style.display = 'none';
            
            // 显示我们的UI获取用户输入
            const userInput = await this.showEnhancedMemoInput(selectedText);
            
            if (userInput) {
                console.log('[MemoManager] ✅ 用户输入内容，填入原生弹窗:', userInput);
                
                // 填入原生textarea
                nativeTextArea.value = userInput;
                nativeTextArea.dispatchEvent(new Event('input', { bubbles: true }));
                
                // 点击确认按钮
                const confirmBtn = nativePopup.querySelector('button') as HTMLButtonElement;
                if (confirmBtn) {
                    confirmBtn.click();
                    console.log('[MemoManager] ✅ 已触发确认');
                    // 注意：不再调用 restoreReadonlyMode()，由 operationWrapper 统一处理
                }
            } else {
                console.log('[MemoManager] ❌ 用户取消');
                
                // 点击取消按钮
                const closeBtn = nativePopup.querySelector('[data-type="close"]') as HTMLButtonElement;
                if (closeBtn) {
                    closeBtn.click();
                }
                // 注意：不再调用 restoreReadonlyMode()，由 operationWrapper 统一处理
            }
            
        } catch (error) {
            console.error('[MemoManager] 处理原生弹窗出错:', error);
            
            // 恢复原生弹窗显示
            nativePopup.style.display = '';
            
            throw error;
            // 注意：不再调用 restoreReadonlyMode()，由 operationWrapper 统一处理
        }
    }

    /**
     * 直接处理原生弹窗 - 获取用户输入并填入（旧版本，包含锁定逻辑）
     */
    private async handleNativePopupDirectly(
        nativePopup: HTMLElement, 
        nativeTextArea: HTMLTextAreaElement, 
        selectedText: string
    ): Promise<void> {
        try {
            // 隐藏原生弹窗
            nativePopup.style.display = 'none';
            
            // 显示我们的UI获取用户输入
            const userInput = await this.showEnhancedMemoInput(selectedText);
            
            if (userInput) {
                console.log('[MemoManager] ✅ 用户输入内容，填入原生弹窗:', userInput);
                
                // 填入原生textarea
                nativeTextArea.value = userInput;
                nativeTextArea.dispatchEvent(new Event('input', { bubbles: true }));
                
                // 点击确认按钮
                const confirmBtn = nativePopup.querySelector('button') as HTMLButtonElement;
                if (confirmBtn) {
                    confirmBtn.click();
                    console.log('[MemoManager] ✅ 已触发确认');
                    
                    // 步骤4: 🔒 加锁（增加延迟，让思源完成保存）
                    setTimeout(() => {
                        this.restoreReadonlyMode();
                    }, 800);
                }
            } else {
                console.log('[MemoManager] ❌ 用户取消');
                
                // 点击取消按钮
                const closeBtn = nativePopup.querySelector('[data-type="close"]') as HTMLButtonElement;
                if (closeBtn) {
                    closeBtn.click();
                }
                
                // 🔒 取消时也要加锁
                setTimeout(() => {
                    this.restoreReadonlyMode();
                }, 300);
            }

        } catch (error) {
            console.error('[MemoManager] 处理原生弹窗出错:', error);
            
            // 恢复原生弹窗显示
            nativePopup.style.display = '';
            
            // 出错时也要加锁
            setTimeout(() => {
                this.restoreReadonlyMode();
            }, 100);
            
            throw error;
        }
    }


    /**
     * 查找备注元素
     */
    private findMemoElement(node: Node): HTMLElement | null {
        let current = node;
        
        while (current && current !== document) {
            if (current.nodeType === Node.ELEMENT_NODE) {
                const element = current as HTMLElement;
                const dataType = element.getAttribute('data-type');
                if (dataType && dataType.includes('inline-memo')) {
                    return element;
                }
            }
            current = current.parentNode!;
        }
        
        return null;
    }

    /**
     * 显示增强的备注输入框
     */
    private showEnhancedMemoInput(selectedText: string = '', existingContent: string = ''): Promise<string | null> {
        return new Promise((resolve) => {
            // 创建弹窗容器
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--b3-theme-background);
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 99999;
                min-width: 400px;
                max-width: 90vw;
                width: 500px;
                box-sizing: border-box;
                border: 1px solid var(--b3-theme-surface-lighter);
            `;

            // 标题
            const title = document.createElement('div');
            title.textContent = existingContent ? '编辑备注' : '添加备注';
            title.style.cssText = `
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: var(--b3-theme-on-background);
            `;

            // 选中文本显示
            if (selectedText) {
                const selectedDiv = document.createElement('div');
                selectedDiv.textContent = `选中文本: ${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}`;
                selectedDiv.style.cssText = `
                    font-size: 12px;
                    color: var(--b3-theme-on-surface-light);
                    margin-bottom: 10px;
                    padding: 8px;
                    background: var(--b3-theme-surface);
                    border-radius: 4px;
                `;
                dialog.appendChild(selectedDiv);
            }

            // 输入框
            const textarea = document.createElement('textarea');
            textarea.value = existingContent;
            textarea.placeholder = '输入备注内容...';
            textarea.style.cssText = `
                width: 100%;
                min-height: 100px;
                padding: 10px;
                margin-bottom: 15px;
                border: 1px solid var(--b3-theme-surface-lighter);
                border-radius: 4px;
                background: var(--b3-theme-surface);
                color: var(--b3-theme-on-background);
                font-size: 14px;
                resize: vertical;
                box-sizing: border-box;
                outline: none;
            `;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            `;

            // 删除按钮
            if (existingContent) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '删除备注';
                deleteBtn.style.cssText = `
                    padding: 8px 16px;
                    background: var(--b3-card-error-background);
                    color: var(--b3-card-error-color);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                `;

                deleteBtn.addEventListener('click', () => {
                    resolve('__DELETE_MEMO__');
                    if (dialog.parentNode) {
                        dialog.parentNode.removeChild(dialog);
                    }
                });

                buttonContainer.appendChild(deleteBtn);
            }

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                padding: 8px 16px;
                background: var(--b3-theme-surface);
                color: var(--b3-theme-on-surface);
                border: 1px solid var(--b3-theme-surface-lighter);
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            // 保存按钮
            const saveBtn = document.createElement('button');
            saveBtn.textContent = '保存';
            saveBtn.style.cssText = `
                padding: 8px 16px;
                background: var(--b3-theme-primary);
                color: var(--b3-theme-on-primary);
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(saveBtn);

            dialog.appendChild(title);
            dialog.appendChild(textarea);
            dialog.appendChild(buttonContainer);
            document.body.appendChild(dialog);

            // 自动聚焦并选中内容
            textarea.focus();
            textarea.select();

            // 关闭对话框
            const closeDialog = () => {
                if (dialog.parentNode) {
                    dialog.parentNode.removeChild(dialog);
                }
            };

            cancelBtn.addEventListener('click', () => {
                resolve(null);
                closeDialog();
            });
            
            saveBtn.addEventListener('click', () => {
                const memoText = textarea.value.trim();
                resolve(memoText || null);
                closeDialog();
            });

            // ESC 关闭
            const handleKeydown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    resolve(null);
                    closeDialog();
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);
        });
    }

    /**
     * 查找块元素
     * 注意：需要排除容器类元素，只返回真正的内容块
     */
    private findBlockElement(node: Node): HTMLElement | null {
        let current = node;
        
        // 向上遍历DOM树查找具有data-node-id属性的块元素
        while (current && current !== document) {
            if (current.nodeType === Node.ELEMENT_NODE && 
                (current as HTMLElement).getAttribute &&
                (current as HTMLElement).getAttribute("data-node-id")) {
                
                const element = current as HTMLElement;
                const className = element.className || '';
                
                // 🔑 关键：排除容器类元素，只保留真正的内容块
                if (!className.includes('protyle-content') && 
                    !className.includes('protyle-wysiwyg') &&
                    !className.includes('protyle-html')) {
                    
                    console.log('[MemoManager] 找到块元素:', {
                        blockId: element.getAttribute('data-node-id'),
                        dataType: element.getAttribute('data-type'),
                        className: className.substring(0, 50)
                    });
                    
                    return element;
                }
            }
            current = current.parentNode!;
        }
        
        console.warn('[MemoManager] 未找到有效的块元素');
        return null;
    }

    /**
     * 提取块的 Markdown 内容
     */
    private async extractMarkdownFromBlock(blockElement: HTMLElement): Promise<string> {
        try {
            const blockId = blockElement.getAttribute('data-node-id');
            if (!blockId) {
                console.warn('[MemoManager] 未找到块ID，使用DOM解析');
                return this.extractContentFromDOM(blockElement);
            }

            // 🔑 方案1: 通过API获取原始Markdown，然后合并DOM修改
            try {
            const result = await this.api.getBlockKramdown(blockId);
                if (result && result.code === 0 && result.data && result.data.kramdown) {
                    const originalMarkdown = result.data.kramdown;
                    console.log('[MemoManager] 获取原始Markdown成功，合并DOM修改...');
                    // 🔑 关键：合并当前DOM修改到Markdown中
                    return this.mergeContentIntoMarkdown(originalMarkdown, blockElement);
                }
            } catch (apiError) {
                console.warn('[MemoManager] API获取失败，使用DOM解析:', apiError);
            }

            // 🔑 方案2: 备用方案 - 直接从DOM提取
            return this.extractContentFromDOM(blockElement);

        } catch (error) {
            console.error('[MemoManager] 提取Markdown内容出错:', error);
            throw error;
        }
    }

    /**
     * 合并DOM修改到Markdown中
     */
    private mergeContentIntoMarkdown(originalMarkdown: string, blockElement: HTMLElement): string {
        // 查找内容区域
        let contentDiv = blockElement.querySelector('div[contenteditable]');
        if (!contentDiv) {
            contentDiv = blockElement.querySelector('div[contenteditable="true"]');
        }
        if (!contentDiv) {
            contentDiv = blockElement.querySelector('div[contenteditable="false"]');
        }
        if (!contentDiv) {
            contentDiv = blockElement.querySelector('div');
        }
        
        if (contentDiv) {
            console.log('[MemoManager] 从contentDiv提取内容');
            // 🔑 直接返回修改后的HTML（思源支持HTML格式，会自动处理）
            return contentDiv.innerHTML;
        }
        
        console.log('[MemoManager] 未找到contentDiv，返回原始Markdown');
        return originalMarkdown;
    }

    /**
     * 从DOM提取内容（备用方案）
     */
    private extractContentFromDOM(blockElement: HTMLElement): string {
        // 查找contenteditable的div
        let contentDiv = blockElement.querySelector('div[contenteditable]');
        if (!contentDiv) {
            contentDiv = blockElement.querySelector('div[contenteditable="true"]');
        }
        if (!contentDiv) {
            contentDiv = blockElement.querySelector('div[contenteditable="false"]');
        }
        if (!contentDiv) {
            contentDiv = blockElement.querySelector('div');
        }
        
        if (contentDiv && contentDiv.innerHTML.trim() && contentDiv.innerHTML.trim() !== '​') {
            console.log('[MemoManager] DOM提取成功');
            return contentDiv.innerHTML;
        }
        
        console.warn('[MemoManager] 无法从DOM提取内容，使用blockElement.innerHTML');
        return blockElement.innerHTML;
    }
}

