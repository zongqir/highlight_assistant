import Logger from './logger';

/**
 * 只读按钮工具 - 统一管理当前激活tab的锁按钮获取逻辑
 * 
 * 核心功能：
 * 1. 准确获取当前激活的tab对应的锁按钮
 * 2. 检查当前文档是否处于只读状态
 * 
 * 使用场景：
 * - 所有需要写入操作前检查只读状态
 * - 需要解锁/加锁操作时获取正确的按钮
 */

/**
 * 获取当前激活文档的锁按钮
 * 
 * 采用多策略查找，确保找到正确的当前激活tab的锁按钮：
 * 1. 优先：通过思源 getActiveTab API 获取（最准确）
 * 2. 次选：通过焦点元素向上查找
 * 3. 备选：查找活跃窗口 (.layout__wnd--active)
 * 4. 兜底：全局查找第一个（可能不准确）
 * 
 * @returns 当前激活文档的锁按钮，找不到返回 null
 */
export function getCurrentActiveReadonlyButton(): HTMLElement | null {
    try {
        Logger.log('🔍 [ReadonlyButton] 开始查找当前活跃文档的锁按钮...');
        
        // 策略1: 尝试使用思源的 getActiveTab API（最准确）
        try {
            const { getActiveTab } = require('siyuan');
            const activeTab = getActiveTab();
            Logger.log('🔍 [ReadonlyButton] 思源getActiveTab返回:', {
                hasActiveTab: !!activeTab,
                tabId: activeTab?.id,
                title: activeTab?.title,
                modelType: activeTab?.model?.type,
                hasEditor: !!(activeTab?.model?.editor),
                hasProtyle: !!(activeTab?.model?.protyle)
            });
            
            if (activeTab?.model?.editor?.protyle) {
                const protyle = activeTab.model.editor.protyle;
                const readonlyBtn = protyle.element?.querySelector('.protyle-breadcrumb button[data-type="readonly"]');
                if (readonlyBtn) {
                    const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
                    Logger.log('✅ [ReadonlyButton] 策略1成功 - 通过getActiveTab找到锁按钮:', {
                        iconHref,
                        ariaLabel: readonlyBtn.getAttribute('aria-label'),
                        dataSubtype: readonlyBtn.getAttribute('data-subtype'),
                        protyleNodeId: protyle.element?.getAttribute('data-node-id')
                    });
                    return readonlyBtn as HTMLElement;
                }
            }
        } catch (error) {
            Logger.log('⚠️ [ReadonlyButton] getActiveTab API不可用:', error.message);
        }
        
        // 策略2: 尝试通过焦点元素查找
        const focusedElement = document.activeElement;
        Logger.log('🔍 [ReadonlyButton] 当前焦点元素:', {
            tagName: focusedElement?.tagName,
            className: focusedElement?.className,
            id: focusedElement?.id
        });
        
        if (focusedElement) {
            const protyleContainer = focusedElement.closest('.protyle') as HTMLElement;
            Logger.log('🔍 [ReadonlyButton] 找到的protyle容器:', {
                found: !!protyleContainer,
                className: protyleContainer?.className,
                dataNodeId: protyleContainer?.getAttribute('data-node-id')
            });
            
            if (protyleContainer) {
                const readonlyBtn = protyleContainer.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
                if (readonlyBtn) {
                    const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
                    Logger.log('✅ [ReadonlyButton] 策略2成功 - 通过焦点元素找到锁按钮:', {
                        iconHref,
                        ariaLabel: readonlyBtn.getAttribute('aria-label'),
                        dataSubtype: readonlyBtn.getAttribute('data-subtype')
                    });
                    return readonlyBtn;
                }
            }
        }
        
        // 策略3: 查找活跃窗口中的锁按钮
        const activeWnd = document.querySelector('.layout__wnd--active');
        Logger.log('🔍 [ReadonlyButton] 活跃窗口:', {
            found: !!activeWnd,
            className: activeWnd?.className
        });
        
        if (activeWnd) {
            const readonlyBtn = activeWnd.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
            if (readonlyBtn) {
                const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
                Logger.log('✅ [ReadonlyButton] 策略3成功 - 通过活跃窗口找到锁按钮:', {
                    iconHref,
                    ariaLabel: readonlyBtn.getAttribute('aria-label'),
                    dataSubtype: readonlyBtn.getAttribute('data-subtype')
                });
                return readonlyBtn;
            }
        }
        
        // 策略4: 兜底方案 - 全局查找第一个（可能不准确）
        const readonlyBtn = document.querySelector('.protyle-breadcrumb button[data-type="readonly"]') as HTMLElement;
        if (readonlyBtn) {
            const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
            Logger.warn('⚠️ [ReadonlyButton] 策略4兜底 - 使用第一个找到的锁按钮（可能不准确）:', {
                iconHref,
                ariaLabel: readonlyBtn.getAttribute('aria-label'),
                dataSubtype: readonlyBtn.getAttribute('data-subtype')
            });
            return readonlyBtn;
        }
        
        Logger.error('❌ [ReadonlyButton] 完全找不到任何锁按钮');
        return null;
        
    } catch (error) {
        Logger.error('❌ [ReadonlyButton] 获取当前活跃文档锁按钮失败:', error);
        return null;
    }
}

/**
 * 检查当前激活文档是否处于只读状态（锁定状态）
 * 
 * 基于思源笔记源码的判断逻辑：
 * isReadonly = target.querySelector("use").getAttribute("xlink:href") !== "#iconUnlock"
 * 
 * @returns true 表示只读（已锁定），false 表示可编辑（已解锁）
 */
export function isCurrentDocumentReadonly(): boolean {
    try {
        const readonlyBtn = getCurrentActiveReadonlyButton();
        
        if (!readonlyBtn) {
            Logger.warn('⚠️ [ReadonlyButton] 未找到当前活跃文档的锁按钮，假设文档可编辑');
            return false; // 找不到锁按钮时，保守处理，认为可编辑（非只读）
        }
        
        const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
        const ariaLabel = readonlyBtn.getAttribute('aria-label') || '';
        const dataSubtype = readonlyBtn.getAttribute('data-subtype') || '';
        
        // 🎯 基于思源源码的正确判断逻辑：
        // isReadonly = target.querySelector("use").getAttribute("xlink:href") !== "#iconUnlock"
        const isReadonly = iconHref !== '#iconUnlock';
        const isEditable = !isReadonly;
        
        Logger.log('🔐 [ReadonlyButton] 当前文档状态:', {
            '图标href': iconHref,
            'aria-label': ariaLabel,
            'data-subtype': dataSubtype,
            '是否只读': isReadonly ? '🔒 是（锁定）' : '✏️ 否（解锁）',
            '是否可编辑': isEditable ? '🔓 是（可编辑）' : '🔒 否（只读）'
        });
        
        return isReadonly;
        
    } catch (error) {
        Logger.error('❌ [ReadonlyButton] 检查文档只读状态失败:', error);
        return false; // 出错时保守处理，认为可编辑（非只读）
    }
}

/**
 * 检查当前激活文档是否可编辑（已解锁）
 * 
 * @returns true 表示可编辑（已解锁），false 表示只读（已锁定）
 */
export function isCurrentDocumentEditable(): boolean {
    return !isCurrentDocumentReadonly();
}

