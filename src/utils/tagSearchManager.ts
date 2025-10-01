/**
 * 标签搜索管理器 - 处理搜索范围和分组
 */

import { fetchSyncPost } from 'siyuan';

export interface TagSearchResult {
    id: string;
    content: string;
    markdown: string;
    hpath: string;
    path: string;
    box: string;
    rootID: string;
    parentID: string;
    created: string;
    updated: string;
}

export interface GroupedResults {
    [docId: string]: {
        docId: string;
        docName: string;
        docPath: string;
        blocks: TagSearchResult[];
    };
}

export type SearchScope = 'doc' | 'subdocs' | 'notebook' | 'global';

export class TagSearchManager {
    private debugMode: boolean = false;

    /**
     * 开启调试模式
     */
    public enableDebug(): void {
        this.debugMode = true;
    }

    /**
     * 关闭调试模式
     */
    public disableDebug(): void {
        this.debugMode = false;
    }

    /**
     * 调试日志
     */
    private debugLog(...args: any[]): void {
        if (this.debugMode) {
            console.log(...args);
        }
    }

    /**
     * 获取当前文档信息
     */
    private async getCurrentDocInfo(): Promise<{ docId: string, notebookId: string, docPath: string } | null> {
        try {
            console.log('[TagSearchManager] 🔍 开始获取当前文档信息...');
            
            // 方法0: 通过 getAllEditor 获取当前编辑器的 protyle.block.rootID (SiYuan官方方法)
            try {
                console.log('[TagSearchManager] 方法0 - 检查window.siyuan:', !!window.siyuan);
                console.log('[TagSearchManager] 方法0 - 检查getAllEditor:', !!(window as any).siyuan?.getAllEditor);
                const editors = (window as any).siyuan?.getAllEditor?.() || [];
                console.log('[TagSearchManager] 方法0 - 找到', editors.length, '个编辑器');
                
                if (editors.length === 0) {
                    console.log('[TagSearchManager] 方法0 - 无编辑器，跳过');
                }
                
                for (const editor of editors) {
                    if (editor?.protyle?.block?.rootID) {
                        const rootID = editor.protyle.block.rootID;
                        console.log('[TagSearchManager] 🎯 找到编辑器的rootID:', rootID);
                        
                        const response = await fetchSyncPost('/api/block/getBlockInfo', { id: rootID });
                        console.log('[TagSearchManager] rootID信息完整响应:', JSON.stringify(response, null, 2));
                        
                        if (response.code === 0 && response.data) {
                            console.log('[TagSearchManager] ✅ 方法0成功！文档ID:', rootID, '笔记本ID:', response.data.box);
                            return {
                                docId: rootID,
                                notebookId: response.data.box || '',
                                docPath: response.data.path || ''
                            };
                        }
                    }
                }
                console.log('[TagSearchManager] ⚠️ 方法0失败，尝试方法1...');
            } catch (error) {
                console.error('[TagSearchManager] 方法0异常:', error);
            }
            
            // 方法1: 从编辑器内的文档根块获取
            const rootBlock = document.querySelector('.protyle-wysiwyg [data-type="NodeDocument"][data-node-id]');
            console.log('[TagSearchManager] 方法1 - 文档根块:', rootBlock);
            
            if (rootBlock) {
                const docId = rootBlock.getAttribute('data-node-id');
                console.log('[TagSearchManager] 从根块获取文档 ID:', docId);
                
                if (docId) {
                    try {
                        const response = await fetchSyncPost('/api/block/getBlockInfo', { id: docId });
                        console.log('[TagSearchManager] getBlockInfo 响应:', response);
                        
                        if (response.code === 0 && response.data && response.data.rootID && response.data.box) {
                            // rootID 就是文档ID，box 就是笔记本ID
                            console.log('[TagSearchManager] ✅ 方法1成功！文档ID:', response.data.rootID, '笔记本ID:', response.data.box);
                            return {
                                docId: response.data.rootID,
                                notebookId: response.data.box,
                                docPath: response.data.path || ''
                            };
                        }
                    } catch (error) {
                        console.error('[TagSearchManager] getBlockInfo 调用失败:', error);
                    }
                }
            }

            // 方法2: 从任何带有 data-node-id 的元素获取，然后通过API确认是文档
            const anyBlocks = document.querySelectorAll('.protyle-wysiwyg [data-node-id]');
            console.log('[TagSearchManager] 方法2 - 找到', anyBlocks.length, '个带ID的块');
            
            for (let i = 0; i < anyBlocks.length; i++) {
                const block = anyBlocks[i];
                const blockId = block.getAttribute('data-node-id');
                console.log('[TagSearchManager] 检查块', i, ':', blockId);
                
                if (blockId) {
                    try {
                        const response = await fetchSyncPost('/api/block/getBlockInfo', { id: blockId });
                        console.log('[TagSearchManager] 块信息 - ID:', blockId);
                        console.log('[TagSearchManager] 块信息 - 完整响应:', JSON.stringify(response, null, 2));
                        
                        if (response?.data) {
                            console.log('[TagSearchManager] 块信息 - data字段详情:');
                            console.log('  - type:', response.data.type);
                            console.log('  - rootID:', response.data.rootID);
                            console.log('  - box:', response.data.box);
                            console.log('  - path:', response.data.path);
                            console.log('  - 所有字段:', Object.keys(response.data));
                        }
                        
                        if (response.code === 0 && response.data && response.data.rootID && response.data.box) {
                            // rootID 就是文档ID，box 就是笔记本ID，不需要检查type
                            console.log('[TagSearchManager] ✅ 找到文档块！笔记本ID:', response.data.box);
                            return {
                                docId: response.data.rootID,
                                notebookId: response.data.box,
                                docPath: response.data.path || ''
                            };
                        } else if (response.code === 0 && response.data && response.data.rootID) {
                            // 如果是普通块，尝试用 rootID 获取文档信息
                            console.log('[TagSearchManager] 🔍 普通块，尝试用 rootID 获取文档:', response.data.rootID);
                            const docResponse = await fetchSyncPost('/api/block/getBlockInfo', { id: response.data.rootID });
                            console.log('[TagSearchManager] 文档信息完整响应:', JSON.stringify(docResponse, null, 2));
                            
                            if (docResponse?.data) {
                                console.log('[TagSearchManager] 文档信息 - data字段详情:');
                                console.log('  - type:', docResponse.data.type);
                                console.log('  - box:', docResponse.data.box);
                                console.log('  - path:', docResponse.data.path);
                                console.log('  - 所有字段:', Object.keys(docResponse.data));
                            }
                            
                            if (docResponse.code === 0 && docResponse.data && docResponse.data.rootID && docResponse.data.box) {
                                // rootID 就是文档ID，box 就是笔记本ID，不需要检查type
                                console.log('[TagSearchManager] ✅ 通过rootID找到文档块！笔记本ID:', docResponse.data.box);
                                return {
                                    docId: response.data.rootID,
                                    notebookId: docResponse.data.box,
                                    docPath: docResponse.data.path || ''
                                };
                            }
                        }
                    } catch (error) {
                        console.error('[TagSearchManager] 检查块', blockId, '失败:', error);
                        continue; // 继续检查下一个块
                    }
                }
            }

            console.log('[TagSearchManager] ❌ 无法获取当前文档信息');
            return null;
        } catch (error) {
            console.error('[TagSearchManager] ❌ 获取文档信息失败:', error);
            return null;
        }
    }


    /**
     * 根据范围获取搜索路径
     */
    private async getSearchPaths(scope: SearchScope): Promise<string[]> {
        console.log('[TagSearchManager] 📂 ========== 开始获取搜索路径 ==========');
        console.log('[TagSearchManager] 搜索范围:', scope);
        
        const docInfo = await this.getCurrentDocInfo();
        console.log('[TagSearchManager] 当前文档信息:', docInfo);
        
        switch (scope) {
            case 'doc':
                // 本文档：使用 box + path
                console.log('[TagSearchManager] 📄 doc 模式 - docInfo:', docInfo);
                
                if (docInfo?.docId) {
                    try {
                        const response = await fetchSyncPost('/api/block/getBlockInfo', {
                            id: docInfo.docId
                        });
                        console.log('[TagSearchManager] getBlockInfo 响应:', response);
                        
                        if (response.code === 0 && response.data) {
                            // 对于本文档：box + path (确保包含.sy扩展名)
                            const box = response.data.box;
                            const path = response.data.path.startsWith('/') ? response.data.path.substring(1) : response.data.path;
                            const fullPath = `${box}/${path}`;
                            
                            console.log('[TagSearchManager] box:', box);
                            console.log('[TagSearchManager] 原始path:', response.data.path);
                            console.log('[TagSearchManager] 处理后path:', path);
                            console.log('[TagSearchManager] ✅ 本文档完整路径:', fullPath);
                            console.log('[TagSearchManager] 📋 用户期望格式示例: 20251001192613-0qb17u2/20251001192616-lokuemy.sy');
                            return [fullPath];
                        }
                    } catch (error) {
                        console.error('[TagSearchManager] ❌ 获取文档路径失败:', error);
                    }
                }
                console.log('[TagSearchManager] ❌ doc 模式失败，返回空数组');
                return [];
                
            case 'subdocs':
                // 文档及子文档：box + path (去掉.sy扩展名)
                console.log('[TagSearchManager] 📁 subdocs 模式 - docInfo:', docInfo);
                
                if (docInfo?.docId) {
                    try {
                        const response = await fetchSyncPost('/api/block/getBlockInfo', {
                            id: docInfo.docId
                        });
                        console.log('[TagSearchManager] getBlockInfo 响应:', response);
                        
                        if (response.code === 0 && response.data) {
                            // 对于文档及子文档：box + path (去掉.sy扩展名)
                            const box = response.data.box;
                            const path = response.data.path.startsWith('/') ? response.data.path.substring(1) : response.data.path;
                            
                            // 去掉.sy扩展名
                            const pathWithoutExt = path.endsWith('.sy') ? path.substring(0, path.length - 3) : path;
                            const fullDirPath = `${box}/${pathWithoutExt}`;
                            
                            console.log('[TagSearchManager] box:', box);
                            console.log('[TagSearchManager] 原始path:', response.data.path);
                            console.log('[TagSearchManager] 去掉.sy后path:', pathWithoutExt);
                            console.log('[TagSearchManager] ✅ 文档及子文档路径:', fullDirPath);
                            console.log('[TagSearchManager] 📋 用户期望格式示例: 20251001192613-0qb17u2/20251001192616-lokuemy');
                            
                            return [fullDirPath];
                        }
                    } catch (error) {
                        console.error('[TagSearchManager] ❌ 获取文档目录路径失败:', error);
                    }
                }
                console.log('[TagSearchManager] ❌ subdocs 模式失败，返回空数组');
                return [];
                
            case 'notebook':
                // 本笔记本：使用笔记本 ID
                console.log('[TagSearchManager] 📚 notebook 模式 - docInfo:', docInfo);
                
                if (docInfo?.notebookId) {
                    console.log('[TagSearchManager] ✅ 笔记本ID:', docInfo.notebookId);
                    return [docInfo.notebookId];
                }
                console.log('[TagSearchManager] ❌ notebook 模式失败，返回空数组');
                return [];
                
            case 'global':
            default:
                // 全局搜索：不限制路径
                console.log('[TagSearchManager] 🌐 全局搜索模式');
                return [];
        }
    }

    /**
     * 递归展开块树，提取所有子块
     */
    private flattenBlocks(blocks: any[]): any[] {
        const result: any[] = [];
        
        for (const block of blocks) {
            // 跳过文档节点本身（只要它的子节点）
            if (block.type !== 'NodeDocument') {
                result.push(block);
            }
            
            // 递归处理子块
            if (block.children && Array.isArray(block.children) && block.children.length > 0) {
                result.push(...this.flattenBlocks(block.children));
            }
        }
        
        return result;
    }

    /**
     * 搜索包含指定标签的块
     */
    public async searchByTag(
        tagText: string, 
        scope: SearchScope = 'notebook'
    ): Promise<TagSearchResult[]> {
        try {
            console.log('[TagSearchManager] 🔍 开始搜索标签:', tagText);
            console.log('[TagSearchManager] 搜索范围:', scope);
            
            // 清理零宽字符
            let cleanedText = tagText
                .replace(/[\u200B-\u200D\uFEFF]/g, '')
                .replace(/\u00A0/g, ' ')
                .trim();
            
            // 确保标签格式正确：#标签#
            let searchQuery = cleanedText;
            if (!searchQuery.startsWith('#')) {
                searchQuery = '#' + searchQuery;
            }
            if (!searchQuery.endsWith('#')) {
                searchQuery = searchQuery + '#';
            }
            
            console.log('[TagSearchManager] 搜索查询:', searchQuery);
            
            // 获取搜索路径
            const paths = await this.getSearchPaths(scope);
            console.log('[TagSearchManager] 搜索路径:', paths);
            
            // 构建请求
            const requestBody: any = {
                query: searchQuery,
                method: 0,  // 关键字搜索
                types: {
                    document: true,
                    heading: true,
                    list: false,
                    listItem: false,
                    codeBlock: true,
                    htmlBlock: true,
                    mathBlock: true,
                    table: true,
                    blockquote: false,
                    superBlock: false,
                    paragraph: true,
                    embedBlock: false,
                    databaseBlock: true,
                    video: true,
                    audio: true,
                    iframe: true,
                    widget: true,
                    thematicBreak: true,
                },
                groupBy: 1,  // 按文档分组
                orderBy: 0,  // 按更新时间排序
                page: 1,
                pageSize: 100
            };
            
            // 添加路径限制
            console.log('[TagSearchManager] 🔍 检查路径:', { pathsLength: paths.length, paths });
            console.log('[TagSearchManager] 🔍 paths 详细信息:', JSON.stringify(paths));
            
            if (paths.length > 0) {
                requestBody.paths = paths;
                console.log('[TagSearchManager] ✅ 已添加 paths 到请求，搜索范围:', scope);
            } else {
                if (scope === 'global') {
                    console.log('[TagSearchManager] ✅ 全局搜索模式，paths 为空是正确的');
                } else {
                    console.log('[TagSearchManager] ⚠️ 非全局搜索但 paths 为空，可能有问题！搜索范围:', scope);
                }
            }
            
            console.log('[TagSearchManager] 🔍 ========== API 调用详情 ==========');
            console.log('[TagSearchManager] 搜索范围:', scope);
            console.log('[TagSearchManager] 搜索路径:', paths);
            console.log('[TagSearchManager] 请求体:', JSON.stringify(requestBody, null, 2));
            
            const response = await fetchSyncPost('/api/search/fullTextSearchBlock', requestBody);
            
            console.log('[TagSearchManager] API 响应码:', response.code);
            console.log('[TagSearchManager] API 响应消息:', response.msg);
            console.log('[TagSearchManager] API 数据:', response.data);
            console.log('[TagSearchManager] 匹配的块数:', response.data?.matchedBlockCount);
            console.log('[TagSearchManager] 匹配的根文档数:', response.data?.matchedRootCount);
            console.log('[TagSearchManager] ========== API 调用结束 ==========');
            
            if (response.code === 0 && response.data && response.data.blocks) {
                console.log('[TagSearchManager] 原始 blocks 数量:', response.data.blocks.length);
                console.log('[TagSearchManager] 原始 blocks 结构:', response.data.blocks);
                
                // 递归展开树形结构（因为 groupBy: 1 返回的是树）
                const flattenedBlocks = this.flattenBlocks(response.data.blocks);
                console.log('[TagSearchManager] 展开后的 blocks 数量:', flattenedBlocks.length);
                
                // 分析每个结果的来源
                console.log('[TagSearchManager] 📊 结果分析:');
                flattenedBlocks.forEach((block, index) => {
                    console.log(`[TagSearchManager] 块 #${index}:`, {
                        id: block.id,
                        box: block.box,
                        path: block.path,
                        hPath: block.hPath,
                        content: block.content?.substring(0, 50) + '...'
                    });
                });
                
                const blocks: TagSearchResult[] = flattenedBlocks.map((block: any) => ({
                    id: block.id,
                    content: block.content || '',
                    markdown: block.markdown || '',
                    hpath: block.hPath || '',
                    path: block.path || '',
                    box: block.box || '',
                    rootID: block.rootID || '',
                    parentID: block.parentID || '',
                    created: block.created || '',
                    updated: block.updated || block.ial?.updated || ''
                }));
                
                console.log('[TagSearchManager] ✅ 搜索成功，找到', blocks.length, '个结果');
                return blocks;
            }
            
            console.log('[TagSearchManager] ⚠️ 未找到结果');
            return [];
        } catch (error) {
            console.error('[TagSearchManager] ❌ 搜索失败:', error);
            return [];
        }
    }

    /**
     * 将搜索结果按文档分组
     */
    public groupByDocument(results: TagSearchResult[]): GroupedResults {
        console.log('[TagSearchManager] 📊 ========== 开始分组 ==========');
        console.log('[TagSearchManager] 输入结果数量:', results.length);
        console.log('[TagSearchManager] 输入结果详情:', results);
        
        const grouped: GroupedResults = {};
        
        results.forEach((block, index) => {
            const docId = block.rootID;
            console.log(`[TagSearchManager] 处理块 #${index}:`, {
                blockId: block.id,
                docId: docId,
                hpath: block.hpath
            });
            
            if (!grouped[docId]) {
                const docName = this.extractDocName(block.hpath);
                console.log(`[TagSearchManager] 创建新文档组:`, {
                    docId,
                    docName,
                    hpath: block.hpath
                });
                grouped[docId] = {
                    docId: docId,
                    docName: docName,
                    docPath: block.hpath,
                    blocks: []
                };
            }
            
            grouped[docId].blocks.push(block);
            console.log(`[TagSearchManager] 块已添加到文档组 ${docId}，当前块数:`, grouped[docId].blocks.length);
        });
        
        console.log('[TagSearchManager] 📊 分组完成:', Object.keys(grouped).length, '个文档');
        console.log('[TagSearchManager] 分组详情:', grouped);
        console.log('[TagSearchManager] ========== 分组结束 ==========');
        return grouped;
    }

    /**
     * 从路径提取文档名
     */
    private extractDocName(hpath: string): string {
        if (!hpath) return '未知文档';
        const parts = hpath.split('/');
        return parts[parts.length - 1] || '未知文档';
    }

    /**
     * 获取范围显示名称
     */
    public getScopeName(scope: SearchScope): string {
        const names: Record<SearchScope, string> = {
            'doc': '📄 本文档',
            'subdocs': '📁 本文档及子文档',
            'notebook': '📘 本笔记本',
            'global': '🌐 全局'
        };
        return names[scope] || names['notebook'];
    }
}

export const tagSearchManager = new TagSearchManager();

