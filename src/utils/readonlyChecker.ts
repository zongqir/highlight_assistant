import Logger from './logger';
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
    Logger.log(`📤 请求: ${endpoint}`, data);
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        Logger.log(`📥 响应: ${endpoint}`, result);
        
        return result;
    } catch (error) {
        Logger.error(`❌ 请求失败: ${endpoint}`, error);
        throw error;
    }
}

/**
 * 检查系统是否为只读模式
 */
export async function isSystemReadOnly(): Promise<boolean> {
    Logger.log('🔐 检查系统只读模式...');
    
    try {
        const response = await fetchAPI('/system/getConf');
        
        if (response.code === 0) {
            const readOnly = response.data?.conf?.editor?.readOnly || false;
            Logger.log(`${readOnly ? '🔒 系统为只读模式' : '✏️ 系统为可写模式'}`);
            Logger.log('系统配置:', {
                readOnly: readOnly,
                isPublish: response.data?.isPublish,
                start: response.data?.start
            });
            return readOnly;
        } else {
            Logger.warn('⚠️ 无法获取系统配置，默认判定为可写模式');
            return false;
        }
    } catch (error) {
        Logger.error('❌ 检查系统只读模式异常:', error);
        return false;
    }
}

/**
 * 检查当前文档/编辑器的前端只读状态（用户点击锁图标设置的状态）
 * @param protyleElement protyle.wysiwyg.element 或包含 custom-sy-readonly 属性的元素
 */
export function isDocumentReadOnlyByDOM(protyleElement?: HTMLElement): boolean {
    Logger.log('🔍 检查文档前端只读状态（DOM属性）...');
    
    if (!protyleElement) {
        Logger.warn('⚠️ 未提供 protyle 元素，无法检查');
        return false;
    }
    
    // 检查 custom-sy-readonly 属性
    const customReadonly = protyleElement.getAttribute('custom-sy-readonly');
    const isReadonly = customReadonly === 'true';
    
    Logger.log(`${isReadonly ? '🔒 文档为只读模式（锁已锁定）' : '✏️ 文档为可写模式（锁已解锁）'}`);
    Logger.log('DOM属性值:', {
        'custom-sy-readonly': customReadonly,
        isReadonly: isReadonly
    });
    
    return isReadonly;
}

/**
 * 从选区所在的块元素查找并检查只读状态
 */
export function isDocumentReadOnlyFromRange(range?: Range): boolean {
    Logger.log('🎯 从选区查找文档只读状态...');
    
    if (!range) {
        Logger.warn('⚠️ 未提供选区对象');
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
            Logger.log('✅ 找到 protyle-wysiwyg 元素');
            return isDocumentReadOnlyByDOM(element);
        } else {
            Logger.warn('⚠️ 未找到 protyle-wysiwyg 元素');
            return false;
        }
    } catch (error) {
        Logger.error('❌ 从选区查找只读状态异常:', error);
        return false;
    }
}

/**
 * 检查文档是否存在且可访问
 */
export async function isDocumentAccessible(docId: string): Promise<boolean> {
    Logger.log(`📄 检查文档可访问性: ${docId}`);
    
    try {
        const response = await fetchAPI('/filetree/getDoc', { id: docId });
        
        if (response.code === 0) {
            Logger.log('✅ 文档可访问:', response.data);
            return true;
        } else {
            Logger.log(`❌ 文档不可访问: ${response.msg}`);
            return false;
        }
    } catch (error) {
        Logger.error('❌ 检查文档可访问性异常:', error);
        return false;
    }
}

/**
 * 获取环境信息（用于调试）
 */
export async function debugEnvironmentInfo(): Promise<void> {
    Logger.log('\n🌍 ========== 环境信息 ==========');
    
    // 1. 系统配置
    try {
        const confResp = await fetchAPI('/system/getConf');
        if (confResp.code === 0) {
            Logger.log('📋 系统配置:', {
                只读模式: confResp.data?.conf?.editor?.readOnly,
                发布模式: confResp.data?.isPublish,
                启动状态: confResp.data?.start
            });
        }
    } catch (error) {
        Logger.error('获取系统配置失败:', error);
    }
    
    // 2. 笔记本列表
    try {
        const nbResp = await fetchAPI('/notebook/lsNotebooks');
        if (nbResp.code === 0) {
            const notebooks = nbResp.data?.notebooks || [];
            Logger.log(`📚 笔记本数量: ${notebooks.length}`);
            notebooks.forEach((nb: any) => {
                Logger.log(`  - ${nb.name}: ${nb.closed ? '已关闭' : '已打开'}`);
            });
        }
    } catch (error) {
        Logger.error('获取笔记本列表失败:', error);
    }
    
    Logger.log('====================================\n');
}



