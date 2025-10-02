import Logger from './logger';
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
        notebookId: string;
        blocks: TagSearchResult[];
    };
}



export type SearchScope = 'doc' | 'subdocs' | 'notebook';

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
            Logger.log(...args);
        }
    }

    /**
     * 获取当前文档信息
     */
    private async getCurrentDocInfo(): Promise<{ docId: string, notebookId: string, docPath: string } | null> {
        try {
            Logger.log('🔍 开始获取当前文档信息...');
            
            // 方法0: 通过 getAllEditor 获取当前编辑器的 protyle.block.rootID (SiYuan官方方法)
            try {
                Logger.log('方法0 - 检查window.siyuan:', !!window.siyuan);
                Logger.log('方法0 - 检查getAllEditor:', !!(window as any).siyuan?.getAllEditor);
                const editors = (window as any).siyuan?.getAllEditor?.() || [];
                Logger.log('方法0 - 找到', editors.length, '个编辑器');
                
                if (editors.length === 0) {
                    Logger.log('方法0 - 无编辑器，跳过');
                }
                
                for (const editor of editors) {
                    if (editor?.protyle?.block?.rootID) {
                        const rootID = editor.protyle.block.rootID;
                        Logger.log('🎯 找到编辑器的rootID:', rootID);
                        
                        const response = await fetchSyncPost('/api/block/getBlockInfo', { id: rootID });
                        Logger.log('rootID信息完整响应:', JSON.stringify(response, null, 2));
                        
                        if (response.code === 0 && response.data) {
                            Logger.log('✅ 方法0成功！文档ID:', rootID, '笔记本ID:', response.data.box);
                            return {
                                docId: rootID,
                                notebookId: response.data.box || '',
                                docPath: response.data.path || ''
                            };
                        }
                    }
                }
                Logger.log('⚠️ 方法0失败，尝试方法1...');
            } catch (error) {
                Logger.error('方法0异常:', error);
            }
            
            // 方法1: 从编辑器内的文档根块获取
            const rootBlock = document.querySelector('.protyle-wysiwyg [data-type="NodeDocument"][data-node-id]');
            Logger.log('方法1 - 文档根块:', rootBlock);
            
            if (rootBlock) {
                const docId = rootBlock.getAttribute('data-node-id');
                Logger.log('从根块获取文档 ID:', docId);
                
                if (docId) {
                    try {
                        const response = await fetchSyncPost('/api/block/getBlockInfo', { id: docId });
                        Logger.log('getBlockInfo 响应:', response);
                        
                        if (response.code === 0 && response.data && response.data.rootID && response.data.box) {
                            // rootID 就是文档ID，box 就是笔记本ID
                            Logger.log('✅ 方法1成功！文档ID:', response.data.rootID, '笔记本ID:', response.data.box);
                            return {
                                docId: response.data.rootID,
                                notebookId: response.data.box,
                                docPath: response.data.path || ''
                            };
                        }
                    } catch (error) {
                        Logger.error('getBlockInfo 调用失败:', error);
                    }
                }
            }

            // 方法2: 从任何带有 data-node-id 的元素获取，然后通过API确认是文档
            const anyBlocks = document.querySelectorAll('.protyle-wysiwyg [data-node-id]');
            Logger.log('方法2 - 找到', anyBlocks.length, '个带ID的块');
            
            for (let i = 0; i < anyBlocks.length; i++) {
                const block = anyBlocks[i];
                const blockId = block.getAttribute('data-node-id');
                Logger.log('检查块', i, ':', blockId);
                
                if (blockId) {
                    try {
                        const response = await fetchSyncPost('/api/block/getBlockInfo', { id: blockId });
                        Logger.log('块信息 - ID:', blockId);
                        Logger.log('块信息 - 完整响应:', JSON.stringify(response, null, 2));
                        
                        if (response?.data) {
                            Logger.log('块信息 - data字段详情:');
                            Logger.log('  - type:', response.data.type);
                            Logger.log('  - rootID:', response.data.rootID);
                            Logger.log('  - box:', response.data.box);
                            Logger.log('  - path:', response.data.path);
                            Logger.log('  - 所有字段:', Object.keys(response.data));
                        }
                        
                        if (response.code === 0 && response.data && response.data.rootID && response.data.box) {
                            // rootID 就是文档ID，box 就是笔记本ID，不需要检查type
                            Logger.log('✅ 找到文档块！笔记本ID:', response.data.box);
                            return {
                                docId: response.data.rootID,
                                notebookId: response.data.box,
                                docPath: response.data.path || ''
                            };
                        } else if (response.code === 0 && response.data && response.data.rootID) {
                            // 如果是普通块，尝试用 rootID 获取文档信息
                            Logger.log('🔍 普通块，尝试用 rootID 获取文档:', response.data.rootID);
                            const docResponse = await fetchSyncPost('/api/block/getBlockInfo', { id: response.data.rootID });
                            Logger.log('文档信息完整响应:', JSON.stringify(docResponse, null, 2));
                            
                            if (docResponse?.data) {
                                Logger.log('文档信息 - data字段详情:');
                                Logger.log('  - type:', docResponse.data.type);
                                Logger.log('  - box:', docResponse.data.box);
                                Logger.log('  - path:', docResponse.data.path);
                                Logger.log('  - 所有字段:', Object.keys(docResponse.data));
                            }
                            
                            if (docResponse.code === 0 && docResponse.data && docResponse.data.rootID && docResponse.data.box) {
                                // rootID 就是文档ID，box 就是笔记本ID，不需要检查type
                                Logger.log('✅ 通过rootID找到文档块！笔记本ID:', docResponse.data.box);
                                return {
                                    docId: response.data.rootID,
                                    notebookId: docResponse.data.box,
                                    docPath: docResponse.data.path || ''
                                };
                            }
                        }
                    } catch (error) {
                        Logger.error('检查块', blockId, '失败:', error);
                        continue; // 继续检查下一个块
                    }
                }
            }

            Logger.log('❌ 无法获取当前文档信息');
            return null;
        } catch (error) {
            Logger.error('❌ 获取文档信息失败:', error);
            return null;
        }
    }


    /**
     * 根据范围获取搜索路径
     */
    private async getSearchPaths(scope: SearchScope): Promise<string[]> {
        Logger.log('📂 ========== 开始获取搜索路径 ==========');
        Logger.log('搜索范围:', scope);
        
        const docInfo = await this.getCurrentDocInfo();
        Logger.log('当前文档信息:', docInfo);
        
        switch (scope) {
            case 'doc':
                // 本文档：使用 box + path
                Logger.log('📄 doc 模式 - docInfo:', docInfo);
                
                if (docInfo?.docId) {
                    try {
                        const response = await fetchSyncPost('/api/block/getBlockInfo', {
                            id: docInfo.docId
                        });
                        Logger.log('getBlockInfo 响应:', response);
                        
                        if (response.code === 0 && response.data) {
                            // 对于本文档：box + path (确保包含.sy扩展名)
                            const box = response.data.box;
                            const path = response.data.path.startsWith('/') ? response.data.path.substring(1) : response.data.path;
                            const fullPath = `${box}/${path}`;
                            
                            Logger.log('box:', box);
                            Logger.log('原始path:', response.data.path);
                            Logger.log('处理后path:', path);
                            Logger.log('✅ 本文档完整路径:', fullPath);
                            Logger.log('📋 用户期望格式示例: 20251001192613-0qb17u2/20251001192616-lokuemy.sy');
                            return [fullPath];
                        }
                    } catch (error) {
                        Logger.error('❌ 获取文档路径失败:', error);
                    }
                }
                Logger.log('❌ doc 模式失败，返回空数组');
                return [];
                
            case 'subdocs':
                // 文档及子文档：box + path (去掉.sy扩展名)
                Logger.log('📁 subdocs 模式 - docInfo:', docInfo);
                
                if (docInfo?.docId) {
                    try {
                        const response = await fetchSyncPost('/api/block/getBlockInfo', {
                            id: docInfo.docId
                        });
                        Logger.log('getBlockInfo 响应:', response);
                        
                        if (response.code === 0 && response.data) {
                            // 对于文档及子文档：box + path (去掉.sy扩展名)
                            const box = response.data.box;
                            const path = response.data.path.startsWith('/') ? response.data.path.substring(1) : response.data.path;
                            
                            // 去掉.sy扩展名
                            const pathWithoutExt = path.endsWith('.sy') ? path.substring(0, path.length - 3) : path;
                            const fullDirPath = `${box}/${pathWithoutExt}`;
                            
                            Logger.log('box:', box);
                            Logger.log('原始path:', response.data.path);
                            Logger.log('去掉.sy后path:', pathWithoutExt);
                            Logger.log('✅ 文档及子文档路径:', fullDirPath);
                            Logger.log('📋 用户期望格式示例: 20251001192613-0qb17u2/20251001192616-lokuemy');
                            
                            return [fullDirPath];
                        }
                    } catch (error) {
                        Logger.error('❌ 获取文档目录路径失败:', error);
                    }
                }
                Logger.log('❌ subdocs 模式失败，返回空数组');
                return [];
                
            case 'notebook':
                // 本笔记本：使用笔记本 ID
                Logger.log('📚 notebook 模式 - docInfo:', docInfo);
                
                if (docInfo?.notebookId) {
                    Logger.log('✅ 笔记本ID:', docInfo.notebookId);
                    return [docInfo.notebookId];
                }
                Logger.log('❌ notebook 模式失败，返回空数组');
                return [];
                
            default:
                Logger.log('⚠️ 未知搜索范围，使用笔记本模式');
                return currentDoc ? [currentDoc.notebookId] : [];
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
     * 获取当前文档中所有可用的标签
     */
    public async getAllAvailableTags(scope: SearchScope = 'notebook'): Promise<string[]> {
        Logger.log('📋 ========== 获取可用标签 ==========');
        
        try {
            const paths = await this.getSearchPaths(scope);
            Logger.log('🔍 搜索路径:', paths);
            
            // 搜索所有标签（使用通配符）
            const requestBody = {
                query: "#", // 搜索所有标签
                method: 0,
                types: {
                    document: true,
                    heading: true,
                    list: true,
                    listItem: true,
                    codeBlock: false,
                    htmlBlock: false,
                    mathBlock: true,
                    table: true,
                    blockquote: true,
                    superBlock: true,
                    paragraph: true,
                    video: false,
                    audio: false,
                    iframe: false,
                    widget: false,
                    thematicBreak: false
                },
                page: 1,
                pageSize: 100,
                groupBy: 1
            };
            
            if (paths.length > 0) {
                requestBody.paths = paths;
            }
            
            Logger.log('📤 发起标签搜索请求');
            const response = await fetchSyncPost('/api/search/fullTextSearchBlock', requestBody);
            
            if (!response || response.code !== 0) {
                Logger.error('❌ 标签搜索失败:', response);
                return [];
            }
            
            // 提取所有标签
            const blocks = this.flattenBlocks(response.data.blocks || []);
            const tagSet = new Set<string>();
            
            blocks.forEach(block => {
                // 优先使用markdown格式，避免HTML标记干扰
                let content = block.markdown || block.content || '';
                
                // 如果使用content字段，先清理HTML标记
                if (!block.markdown && block.content) {
                    content = this.extractTextContent(block.content);
                }
                
                Logger.log(`🔍 处理块内容:`, content.substring(0, 100) + '...');
                
                // 匹配标签格式：#标签名#
                const tagMatches = content.match(/#[^#\s<>]+#/g);
                if (tagMatches) {
                    tagMatches.forEach(tag => {
                        const cleanTag = tag.replace(/^#|#$/g, ''); // 去掉前后的#
                        // 进一步清理可能的HTML实体或特殊字符
                        const finalTag = cleanTag.replace(/&[^;]+;/g, '').trim();
                        if (finalTag && !finalTag.includes('<') && !finalTag.includes('>')) {
                            tagSet.add(finalTag);
                            Logger.log(`✅ 找到标签: ${finalTag}`);
                        }
                    });
                }
            });
            
            const availableTags = Array.from(tagSet).sort();
            Logger.log('🏷️ 找到可用标签:', availableTags);
            Logger.log('========== 获取标签完成 ==========');
            
            return availableTags;
            
        } catch (error) {
            Logger.error('❌ 获取标签失败:', error);
            return [];
        }
    }

    /**
     * 搜索包含指定标签的块
     */
    public async searchByTag(
        tagText: string,
        scope: SearchScope = 'notebook'
    ): Promise<TagSearchResult[]> {
        try {
            Logger.log('🔍 开始搜索标签:', tagText);
            Logger.log('搜索范围:', scope);
            
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
            
            Logger.log('搜索查询:', searchQuery);
            
            // 获取搜索路径
            const paths = await this.getSearchPaths(scope);
            Logger.log('搜索路径:', paths);
            
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
            Logger.log('🔍 检查路径:', { pathsLength: paths.length, paths });
            Logger.log('🔍 paths 详细信息:', JSON.stringify(paths));
            
            if (paths.length > 0) {
                requestBody.paths = paths;
                Logger.log('✅ 已添加 paths 到请求，搜索范围:', scope);
            } else {
                Logger.log('⚠️ 搜索但 paths 为空，可能有问题！搜索范围:', scope);
            }
            
            Logger.log('🔍 ========== API 调用详情 ==========');
            Logger.log('搜索范围:', scope);
            Logger.log('搜索路径:', paths);
            Logger.log('请求体:', JSON.stringify(requestBody, null, 2));
            
            const response = await fetchSyncPost('/api/search/fullTextSearchBlock', requestBody);
            
            Logger.log('API 响应码:', response.code);
            Logger.log('API 响应消息:', response.msg);
            Logger.log('API 数据:', response.data);
            Logger.log('匹配的块数:', response.data?.matchedBlockCount);
            Logger.log('匹配的根文档数:', response.data?.matchedRootCount);
            Logger.log('========== API 调用结束 ==========');
            
            if (response.code === 0 && response.data && response.data.blocks) {
                Logger.log('原始 blocks 数量:', response.data.blocks.length);
                Logger.log('原始 blocks 结构:', response.data.blocks);
                
                // 递归展开树形结构（因为 groupBy: 1 返回的是树）
                const flattenedBlocks = this.flattenBlocks(response.data.blocks);
                Logger.log('展开后的 blocks 数量:', flattenedBlocks.length);
                
                // 分析每个结果的来源
                Logger.log('📊 结果分析:');
                flattenedBlocks.forEach((block, index) => {
                    Logger.log(`块 #${index}:`, {
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
                
                Logger.log('✅ 搜索成功，找到', blocks.length, '个结果');
                return blocks;
            }
            
            Logger.log('⚠️ 未找到结果');
            return [];
        } catch (error) {
            Logger.error('❌ 搜索失败:', error);
            return [];
        }
    }

    /**
     * 将搜索结果按文档分组
     */
    public groupByDocument(results: TagSearchResult[]): GroupedResults {
        Logger.log('📊 ========== 开始文档分组 ==========');
        Logger.log('输入结果数量:', results.length);
        
        const grouped: GroupedResults = {};
        
        results.forEach((block, index) => {
            const docId = block.rootID;
            
            if (!grouped[docId]) {
                const docName = this.extractDocName(block.hpath);
                grouped[docId] = {
                    docId: docId,
                    docName: docName,
                    docPath: block.hpath,
                    notebookId: block.box,
                    blocks: []
                };
                Logger.log(`创建文档组: ${docName}`);
            }
            
            grouped[docId].blocks.push(block);
        });
        
        Logger.log('📊 分组完成:', Object.keys(grouped).length, '个文档');
        return grouped;
    }



    /**
     * 提取纯文本内容（去除HTML标签）
     */
    private extractTextContent(htmlContent: string): string {
        if (!htmlContent) return '';
        
        try {
            // 创建临时DOM元素来解析HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            return tempDiv.textContent || tempDiv.innerText || '';
        } catch (error) {
            Logger.warn('HTML内容解析失败，使用正则清理:', error);
            // 备用方案：使用正则表达式简单清理HTML标签
            return htmlContent.replace(/<[^>]*>/g, '');
        }
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
     * 获取笔记本真实名称（使用SiYuan官方方法）
     */
    private getNotebookName(notebookId: string): string {
        Logger.log('📚 ========== 使用SiYuan官方方法获取笔记本名称 ==========');
        Logger.log('📚 笔记本ID:', notebookId);
        
        // 检查window.siyuan.notebooks是否存在
        if (!window.siyuan || !window.siyuan.notebooks) {
            Logger.log('❌ window.siyuan.notebooks不存在');
            return `📚 笔记本 ${notebookId.substring(0, 8)}...`;
        }
        
        Logger.log('📚 笔记本总数:', window.siyuan.notebooks.length);
        Logger.log('📚 所有笔记本:', window.siyuan.notebooks.map(nb => ({id: nb.id, name: nb.name})));
        
        // 使用SiYuan官方方法：从window.siyuan.notebooks中查找
        let rootPath = "";
        const found = window.siyuan.notebooks.find((item) => {
            if (item.id === notebookId) {
                rootPath = item.name;
                Logger.log('✅ 找到匹配的笔记本:', { id: item.id, name: item.name });
                return true;
            }
            return false;
        });
        
        if (found && rootPath) {
            Logger.log('✅ 成功获取笔记本名称:', rootPath);
            Logger.log('========== 获取笔记本名称结束 ==========');
            return `📚 ${rootPath}`;
        } else {
            Logger.log('❌ 未找到匹配的笔记本ID，使用后备名称');
            Logger.log('========== 获取笔记本名称结束（失败） ==========');
            return `📚 笔记本 ${notebookId.substring(0, 8)}...`;
        }
    }

    /**
     * 获取范围显示名称
     */
    public getScopeName(scope: SearchScope): string {
        const names: Record<SearchScope, string> = {
            'doc': '📄 本文档',
            'subdocs': '📁 本文档及子文档',
            'notebook': '📘 本笔记本'
        };
        return names[scope] || names['notebook'];
    }
}

export const tagSearchManager = new TagSearchManager();



