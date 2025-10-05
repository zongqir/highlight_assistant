import Logger from './logger';
import { getActiveEditor } from 'siyuan';

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
 * 
 * 更新日志：
 * - v1.2.5: 使用官方 getActiveEditor(false) API（v3.3.0+），更准确简洁
 */

/**
 * 获取当前激活文档的锁按钮
 * 
 * 使用思源官方 getActiveEditor(false) API（v3.3.0+）：
 * - 参数 false: 不限制活跃窗口，根据激活时间查找最合适的编辑器
 * - 优先级：选区 > 活跃窗口 > 最近激活时间
 * - 支持桌面版和移动版（移动版更简单可靠）
 * 
 * 桌面版：多策略查找（选区、活跃窗口、激活时间）
 * 移动版：直接返回 mobile.popEditor || mobile.editor（100%准确）
 * 
 * @returns 当前激活文档的锁按钮，找不到返回 null
 */
export function getCurrentActiveReadonlyButton(): HTMLElement | null {
    const currentEditor = getActiveEditor(false);
    Logger.log("🔍 [ReadonlyButton] getActiveEditor 返回:", currentEditor);
    
    const currentProtyle = currentEditor?.protyle;
    Logger.log("🔍 [ReadonlyButton] protyle:", currentProtyle);
    Logger.log("🔍 [ReadonlyButton] protyle.element:", currentProtyle?.element);
    
    const readonlyButton = currentProtyle?.element?.querySelector(".protyle-breadcrumb > button[data-type='readonly']") as HTMLButtonElement;
    Logger.log("🔍 [ReadonlyButton] 找到的按钮:", readonlyButton);
    Logger.log("🔍 [ReadonlyButton] 按钮的 data-subtype:", readonlyButton?.dataset.subtype);
    Logger.log("🔍 [ReadonlyButton] 按钮的 aria-label:", readonlyButton?.getAttribute('aria-label'));
    Logger.log("🔍 [ReadonlyButton] 按钮的图标:", readonlyButton?.querySelector('use')?.getAttribute('xlink:href'));
    
    return readonlyButton;
}

/**
 * 检查当前激活文档是否处于只读状态（锁定状态）
 * 
 * 判断逻辑（优先使用 data-subtype）：
 * 1. 优先：data-subtype="unlock" → 已解锁（可编辑）
 * 2. 兜底：iconHref !== "#iconUnlock" → 已锁定（只读）
 * 
 * @returns true 表示只读（已锁定），false 表示可编辑（已解锁）
 */
export function isCurrentDocumentReadonly(): boolean {
    try {
        const readonlyBtn = getCurrentActiveReadonlyButton() as HTMLButtonElement;
        
        if (!readonlyBtn) {
            Logger.warn('⚠️ [ReadonlyButton] 未找到当前活跃文档的锁按钮，假设文档可编辑');
            return false; // 找不到锁按钮时，保守处理，认为可编辑（非只读）
        }
        
        // 🎯 优先使用 dataset.subtype 判断（更准确直接）
        const subtype = readonlyBtn.dataset.subtype || '';
        const iconHref = readonlyBtn.querySelector('use')?.getAttribute('xlink:href') || '';
        const ariaLabel = readonlyBtn.getAttribute('aria-label') || '';
        
        // 判断逻辑：
        // 1. 如果有 data-subtype 属性，优先使用（更准确）
        //    - "unlock" → 已解锁（可编辑）
        //    - 其他值 → 已锁定（只读）
        // 2. 否则根据图标判断（兜底方案）
        //    - iconHref !== "#iconUnlock" → 已锁定（只读）
        let isReadonly: boolean;
        
        if (subtype) {
            // 优先使用 data-subtype
            isReadonly = subtype !== 'unlock';
        } else {
            // 兜底使用图标判断
            isReadonly = iconHref !== '#iconUnlock';
        }
        
        const isEditable = !isReadonly;
        
        Logger.log('🔐 [ReadonlyButton] 当前文档状态:', {
            'data-subtype': subtype || '(无)',
            '图标href': iconHref,
            'aria-label': ariaLabel,
            '判断依据': subtype ? 'data-subtype ✅' : 'iconHref ⚠️',
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

