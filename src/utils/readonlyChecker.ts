/**
 * 思源笔记只读模式检查器
 * 用于判断系统和文档的只读状态
 */

// API 基础地址
const API_BASE = '/api';

/**
 * 发送 POST 请求到思源 API
 */
async function fetchAPI<T = any>(endpoint: string, data: any = {}): Promise<any> {
    console.log(`[ReadonlyChecker] 📤 请求: ${endpoint}`, data);
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log(`[ReadonlyChecker] 📥 响应: ${endpoint}`, result);
        
        return result;
    } catch (error) {
        console.error(`[ReadonlyChecker] ❌ 请求失败: ${endpoint}`, error);
        throw error;
    }
}

/**
 * 检查系统是否为只读模式
 */
export async function isSystemReadOnly(): Promise<boolean> {
    console.log('[ReadonlyChecker] 🔐 检查系统只读模式...');
    
    try {
        const response = await fetchAPI('/system/getConf');
        
        if (response.code === 0) {
            const readOnly = response.data?.conf?.editor?.readOnly || false;
            console.log(`[ReadonlyChecker] ${readOnly ? '🔒 系统为只读模式' : '✏️ 系统为可写模式'}`);
            console.log('[ReadonlyChecker] 系统配置:', {
                readOnly: readOnly,
                isPublish: response.data?.isPublish,
                start: response.data?.start
            });
            return readOnly;
        } else {
            console.warn('[ReadonlyChecker] ⚠️ 无法获取系统配置，默认判定为可写模式');
            return false;
        }
    } catch (error) {
        console.error('[ReadonlyChecker] ❌ 检查系统只读模式异常:', error);
        return false;
    }
}

/**
 * 检查当前文档/编辑器的前端只读状态（用户点击锁图标设置的状态）
 * @param protyleElement protyle.wysiwyg.element 或包含 custom-sy-readonly 属性的元素
 */
export function isDocumentReadOnlyByDOM(protyleElement?: HTMLElement): boolean {
    console.log('[ReadonlyChecker] 🔍 检查文档前端只读状态（DOM属性）...');
    
    if (!protyleElement) {
        console.warn('[ReadonlyChecker] ⚠️ 未提供 protyle 元素，无法检查');
        return false;
    }
    
    // 检查 custom-sy-readonly 属性
    const customReadonly = protyleElement.getAttribute('custom-sy-readonly');
    const isReadonly = customReadonly === 'true';
    
    console.log(`[ReadonlyChecker] ${isReadonly ? '🔒 文档为只读模式（锁已锁定）' : '✏️ 文档为可写模式（锁已解锁）'}`);
    console.log('[ReadonlyChecker] DOM属性值:', {
        'custom-sy-readonly': customReadonly,
        isReadonly: isReadonly
    });
    
    return isReadonly;
}

/**
 * 从选区所在的块元素查找并检查只读状态
 */
export function isDocumentReadOnlyFromRange(range?: Range): boolean {
    console.log('[ReadonlyChecker] 🎯 从选区查找文档只读状态...');
    
    if (!range) {
        console.warn('[ReadonlyChecker] ⚠️ 未提供选区对象');
        return false;
    }
    
    try {
        // 从选区的起始容器向上查找 protyle-wysiwyg 元素
        let element = range.startContainer as HTMLElement;
        if (element.nodeType === Node.TEXT_NODE) {
            element = element.parentElement;
        }
        
        // 向上查找直到找到 .protyle-wysiwyg 元素
        while (element && !element.classList?.contains('protyle-wysiwyg')) {
            element = element.parentElement;
        }
        
        if (element && element.classList.contains('protyle-wysiwyg')) {
            console.log('[ReadonlyChecker] ✅ 找到 protyle-wysiwyg 元素');
            return isDocumentReadOnlyByDOM(element);
        } else {
            console.warn('[ReadonlyChecker] ⚠️ 未找到 protyle-wysiwyg 元素');
            return false;
        }
    } catch (error) {
        console.error('[ReadonlyChecker] ❌ 从选区查找只读状态异常:', error);
        return false;
    }
}

/**
 * 检查文档是否存在且可访问
 */
export async function isDocumentAccessible(docId: string): Promise<boolean> {
    console.log(`[ReadonlyChecker] 📄 检查文档可访问性: ${docId}`);
    
    try {
        const response = await fetchAPI('/filetree/getDoc', { id: docId });
        
        if (response.code === 0) {
            console.log('[ReadonlyChecker] ✅ 文档可访问:', response.data);
            return true;
        } else {
            console.log(`[ReadonlyChecker] ❌ 文档不可访问: ${response.msg}`);
            return false;
        }
    } catch (error) {
        console.error('[ReadonlyChecker] ❌ 检查文档可访问性异常:', error);
        return false;
    }
}

/**
 * 获取环境信息（用于调试）
 */
export async function debugEnvironmentInfo(): Promise<void> {
    console.log('\n[ReadonlyChecker] 🌍 ========== 环境信息 ==========');
    
    // 1. 系统配置
    try {
        const confResp = await fetchAPI('/system/getConf');
        if (confResp.code === 0) {
            console.log('[ReadonlyChecker] 📋 系统配置:', {
                只读模式: confResp.data?.conf?.editor?.readOnly,
                发布模式: confResp.data?.isPublish,
                启动状态: confResp.data?.start
            });
        }
    } catch (error) {
        console.error('[ReadonlyChecker] 获取系统配置失败:', error);
    }
    
    // 2. 笔记本列表
    try {
        const nbResp = await fetchAPI('/notebook/lsNotebooks');
        if (nbResp.code === 0) {
            const notebooks = nbResp.data?.notebooks || [];
            console.log(`[ReadonlyChecker] 📚 笔记本数量: ${notebooks.length}`);
            notebooks.forEach((nb: any) => {
                console.log(`[ReadonlyChecker]   - ${nb.name}: ${nb.closed ? '已关闭' : '已打开'}`);
            });
        }
    } catch (error) {
        console.error('[ReadonlyChecker] 获取笔记本列表失败:', error);
    }
    
    console.log('[ReadonlyChecker] ====================================\n');
}

