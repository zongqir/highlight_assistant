/**
 * 标签搜索结果渲染器 - 分组展示
 */

import { TagSearchResult, SearchScope, GroupedResults } from './tagSearchManager';

export class TagResultRenderer {
    private collapsedNodes = new Set<string>(); // 改为存储折叠的节点

    /**
     * 渲染分组结果到容器（极简版）
     */
    public renderGroupedResults(
        container: HTMLElement,
        groupedResults: GroupedResults,
        tagText: string,
        onBlockClick: (blockId: string) => void
    ): void {
        const docCount = Object.keys(groupedResults).length;
        
        if (docCount === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--b3-theme-on-surface-light);">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                    <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">未找到包含标签的内容</div>
                    <div style="font-size: 14px;">标签: <span style="background: var(--b3-theme-primary-light); padding: 2px 6px; border-radius: 4px;">${tagText}</span></div>
                </div>
            `;
            return;
        }
        
        // 极简方案：按文档名称排序，扁平显示
        const sortedDocs = Object.values(groupedResults).sort((a, b) => {
            return a.docName.localeCompare(b.docName);
        });
        
        console.log('[TagResultRenderer] 📄 扁平显示文档:', sortedDocs.map(d => d.docName));
        
        // 简单渲染，不考虑层级
        sortedDocs.forEach(docGroup => {
            const docElement = this.createDocumentGroup(docGroup, tagText, onBlockClick);
            container.appendChild(docElement);
        });
    }


    /**
     * 创建文档组元素（极简版）
     */
    private createDocumentGroup(
        docGroup: GroupedResults[string],
        tagText: string,
        onBlockClick: (blockId: string) => void
    ): HTMLElement {
        const docElement = document.createElement('div');
        docElement.style.cssText = `
            margin-bottom: 8px;
            border: 1px solid var(--b3-theme-border);
            border-radius: 6px;
            overflow: hidden;
            background: var(--b3-theme-surface);
        `;
        
        // 文档标题头部
        const headerElement = document.createElement('div');
        headerElement.style.cssText = `
            background: var(--b3-theme-surface-light);
            padding: 8px 12px;
            border-bottom: 1px solid var(--b3-theme-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: background-color 0.2s ease;
        `;
        
        const isExpanded = !this.collapsedNodes.has(docGroup.docId); // 默认展开
        
        headerElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                <span style="font-size: 14px; color: var(--b3-theme-on-surface-light); transition: transform 0.2s ease; ${isExpanded ? 'transform: rotate(90deg);' : ''}">${isExpanded ? '▼' : '▶'}</span>
                <span style="color: var(--b3-theme-primary); font-size: 14px;">📄</span>
                <span style="
                    font-weight: 500; 
                    color: var(--b3-theme-on-surface);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    flex: 1;
                    min-width: 0;
                ">${docGroup.docName}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
                <span style="font-size: 12px; color: var(--b3-theme-on-surface-light); background: var(--b3-theme-primary-light); padding: 2px 8px; border-radius: 12px; white-space: nowrap;">
                    ${docGroup.blocks.length}结果
                </span>
            </div>
        `;
        
        // 块列表容器
        const blocksContainer = document.createElement('div');
        blocksContainer.style.cssText = `
            padding: 6px;
            display: ${isExpanded ? 'block' : 'none'};
        `;
        
        // 渲染块列表
        docGroup.blocks.forEach((block, blockIndex) => {
            const blockElement = this.createBlockItem(block, blockIndex, tagText, onBlockClick);
            blocksContainer.appendChild(blockElement);
        });
        
        // 添加展开/折叠功能
        headerElement.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCurrentlyExpanded = !this.collapsedNodes.has(docGroup.docId);
            const arrow = headerElement.querySelector('span');
            
            if (isCurrentlyExpanded) {
                // 当前展开 -> 折叠
                this.collapsedNodes.add(docGroup.docId);
                arrow.style.transform = 'rotate(0deg)';
                arrow.textContent = '▶';
                blocksContainer.style.display = 'none';
            } else {
                // 当前折叠 -> 展开
                this.collapsedNodes.delete(docGroup.docId);
                arrow.style.transform = 'rotate(90deg)';
                arrow.textContent = '▼';
                blocksContainer.style.display = 'block';
            }
        });
        
        headerElement.addEventListener('mouseenter', () => {
            headerElement.style.backgroundColor = 'var(--b3-theme-primary-lightest)';
        });
        
        headerElement.addEventListener('mouseleave', () => {
            headerElement.style.backgroundColor = 'var(--b3-theme-surface-light)';
        });
        
        docElement.appendChild(headerElement);
        docElement.appendChild(blocksContainer);
        
        return docElement;
    }

    /**
     * 创建块项目元素
     */
    private createBlockItem(
        block: TagSearchResult,
        index: number,
        tagText: string,
        onBlockClick: (blockId: string) => void
    ): HTMLElement {
        const blockElement = document.createElement('div');
        blockElement.style.cssText = `
            padding: 6px 10px;
            margin: 2px 0;
            border-radius: 4px;
            border-left: 3px solid var(--b3-theme-primary-light);
            background: var(--b3-theme-surface-light);
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        // 清理和高亮内容
        const cleanContent = this.extractTextContent(block.content);
        const highlightedContent = this.highlightTag(cleanContent, tagText);
        
        // 获取时间戳
        const updatedTime = block.ial?.updated || block.updated || '未知时间';
        const timeDisplay = this.formatTimestamp(updatedTime);
        
        blockElement.innerHTML = `
            <div style="
                font-size: 14px; 
                line-height: 1.3; 
                margin-bottom: 3px; 
                color: var(--b3-theme-on-surface);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            ">
                ${highlightedContent}
            </div>
            <div style="
                font-size: 11px; 
                color: var(--b3-theme-on-surface-light); 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                white-space: nowrap;
                overflow: hidden;
            ">
                <span style="overflow: hidden; text-overflow: ellipsis; min-width: 0;">${block.id}</span>
                <span style="flex-shrink: 0; margin-left: 8px;">${timeDisplay}</span>
            </div>
        `;
        
        // 添加点击事件
        blockElement.addEventListener('click', () => {
            onBlockClick(block.id);
        });
        
        // 添加悬停效果
        blockElement.addEventListener('mouseenter', () => {
            blockElement.style.backgroundColor = 'var(--b3-theme-primary-lightest)';
            blockElement.style.transform = 'translateX(4px)';
        });
        
        blockElement.addEventListener('mouseleave', () => {
            blockElement.style.backgroundColor = 'var(--b3-theme-surface-light)';
            blockElement.style.transform = 'translateX(0)';
        });
        
        return blockElement;
    }

    /**
     * 提取纯文本内容（去除HTML标签）
     */
    private extractTextContent(htmlContent: string): string {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        return tempDiv.textContent || tempDiv.innerText || '';
    }

    /**
     * 高亮显示标签
     */
    private highlightTag(text: string, tagText: string): string {
        if (!tagText) return this.escapeHtml(text);
        
        const escapedText = this.escapeHtml(text);
        const escapedTag = this.escapeRegExp(tagText);
        const regex = new RegExp(`(${escapedTag})`, 'gi');
        
        return escapedText.replace(regex, '<mark style="background: var(--b3-theme-primary-light); color: var(--b3-theme-on-primary); padding: 1px 3px; border-radius: 3px; font-weight: 500;">$1</mark>');
    }

    /**
     * HTML转义
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 正则表达式转义
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 格式化时间戳
     */
    private formatTimestamp(timestamp: string): string {
        if (!timestamp || timestamp === '未知时间') return '未知时间';
        
        try {
            // SiYuan时间戳格式：20241001182024
            const year = timestamp.substring(0, 4);
            const month = timestamp.substring(4, 6);
            const day = timestamp.substring(6, 8);
            const hour = timestamp.substring(8, 10);
            const minute = timestamp.substring(10, 12);
            
            return `${year}/${month}/${day} ${hour}:${minute}`;
        } catch (error) {
            return timestamp;
        }
    }

    /**
     * 渲染范围选择器
     */
    public renderScopeSelector(
        currentScope: SearchScope,
        availableScopes: SearchScope[],
        onScopeChange: (scope: SearchScope) => void
    ): HTMLElement {
        const selector = document.createElement('div');
        selector.style.cssText = `
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        `;
        
        const scopeNames: Record<SearchScope, string> = {
            'doc': '📄 本文档',
            'subdocs': '📁 文档及子文档', 
            'notebook': '📘 本笔记本'
        };
        
        availableScopes.forEach(scope => {
            const button = document.createElement('button');
            button.style.cssText = `
                padding: 4px 8px;
                border: 1px solid ${scope === currentScope ? 'var(--b3-theme-primary)' : 'var(--b3-theme-border)'};
                background: ${scope === currentScope ? 'var(--b3-theme-primary)' : 'var(--b3-theme-surface)'};
                color: ${scope === currentScope ? 'var(--b3-theme-on-primary)' : 'var(--b3-theme-on-surface)'};
                border-radius: 16px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
                white-space: nowrap;
            `;
            
            button.textContent = scopeNames[scope];
            
            button.addEventListener('click', () => {
                onScopeChange(scope);
            });
            
            button.addEventListener('mouseenter', () => {
                if (scope !== currentScope) {
                    button.style.backgroundColor = 'var(--b3-theme-primary-lightest)';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                if (scope !== currentScope) {
                    button.style.backgroundColor = 'var(--b3-theme-surface)';
                }
            });
            
            selector.appendChild(button);
        });
        
        return selector;
    }
}