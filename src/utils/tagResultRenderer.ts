/**
 * 标签搜索结果渲染器 - 分组展示
 */

import { TagSearchResult, SearchScope, GroupedResults } from './tagSearchManager';

export class TagResultRenderer {
    /**
     * 渲染分组结果到容器
     */
    public renderGroupedResults(
        container: HTMLElement,
        groupedResults: GroupedResults,
        tagText: string,
        onBlockClick: (blockId: string) => void
    ): void {
        const docCount = Object.keys(groupedResults).length;
        const totalBlocks = Object.values(groupedResults).reduce((sum, doc) => sum + doc.blocks.length, 0);
        
        console.log('[TagResultRenderer] 🎨 ========== 开始渲染分组结果 ==========');
        console.log('[TagResultRenderer] 分组数据:', groupedResults);
        console.log('[TagResultRenderer] 文档数:', docCount);
        console.log('[TagResultRenderer] 总块数:', totalBlocks);
        
        if (totalBlocks === 0) {
            console.log('[TagResultRenderer] ⚠️ 没有结果，显示空状态');
            this.renderEmptyState(container, tagText);
            return;
        }
        
        // 按文档分组渲染
        console.log('[TagResultRenderer] 📝 开始逐个渲染文档组...');
        Object.entries(groupedResults).forEach(([docId, docGroup], docIndex) => {
            console.log(`[TagResultRenderer] 渲染文档组 #${docIndex}:`, {
                docId,
                docName: docGroup.docName,
                blocksCount: docGroup.blocks.length,
                blocks: docGroup.blocks
            });
            const docGroupElement = this.createDocGroup(docGroup, docIndex, onBlockClick);
            container.appendChild(docGroupElement);
            console.log(`[TagResultRenderer] ✅ 文档组 #${docIndex} 渲染完成`);
        });
        console.log('[TagResultRenderer] ========== 渲染完成 ==========');
    }
    
    /**
     * 创建文档分组
     */
    private createDocGroup(
        docGroup: { docId: string; docName: string; docPath: string; blocks: TagSearchResult[] },
        index: number,
        onBlockClick: (blockId: string) => void
    ): HTMLElement {
        console.log(`[TagResultRenderer] 🔧 创建文档组:`, {
            docName: docGroup.docName,
            blocksCount: docGroup.blocks.length
        });
        
        const groupElement = document.createElement('div');
        groupElement.style.cssText = `
            margin-bottom: 20px;
            animation: tagSearchSlideIn ${0.3 + index * 0.05}s ease-out;
        `;
        
        // 文档标题
        const headerElement = document.createElement('div');
        headerElement.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: linear-gradient(135deg, var(--b3-theme-surface) 0%, var(--b3-theme-surface-light) 100%);
            border-radius: 10px 10px 0 0;
            border-left: 4px solid var(--b3-theme-primary);
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        headerElement.innerHTML = `
            <span style="font-size: 18px;">📄</span>
            <span style="
                flex: 1;
                font-size: 15px;
                font-weight: 600;
                color: var(--b3-theme-on-background);
            ">${this.escapeHtml(docGroup.docName)}</span>
            <span style="
                padding: 4px 12px;
                background: var(--b3-theme-primary);
                color: white;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            ">${docGroup.blocks.length}</span>
        `;
        
        // 结果列表容器
        const resultsContainer = document.createElement('div');
        resultsContainer.style.cssText = `
            background: var(--b3-theme-surface);
            border-radius: 0 0 10px 10px;
            padding: 8px;
        `;
        
        // 添加所有块
        console.log(`[TagResultRenderer] 📦 渲染 ${docGroup.blocks.length} 个块...`);
        docGroup.blocks.forEach((block, blockIndex) => {
            console.log(`[TagResultRenderer] 渲染块 #${blockIndex}:`, block.id, block.content?.substring(0, 50));
            const blockElement = this.createBlockItem(block, blockIndex, onBlockClick);
            resultsContainer.appendChild(blockElement);
        });
        console.log(`[TagResultRenderer] ✅ ${docGroup.blocks.length} 个块渲染完成`);
        
        groupElement.appendChild(headerElement);
        groupElement.appendChild(resultsContainer);
        
        // 折叠/展开功能
        let isCollapsed = false;
        headerElement.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            if (isCollapsed) {
                resultsContainer.style.display = 'none';
                headerElement.style.borderRadius = '10px';
            } else {
                resultsContainer.style.display = 'block';
                headerElement.style.borderRadius = '10px 10px 0 0';
            }
        });
        
        return groupElement;
    }
    
    /**
     * 创建块项
     */
    private createBlockItem(
        block: TagSearchResult,
        index: number,
        onBlockClick: (blockId: string) => void
    ): HTMLElement {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 14px 16px;
            margin-bottom: 6px;
            background: var(--b3-theme-background);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid transparent;
        `;
        
        // 提取文本内容
        const contentText = this.extractTextContent(block.content || block.markdown);
        const displayText = contentText.length > 120 ? contentText.substring(0, 120) + '...' : contentText;
        
        item.innerHTML = `
            <div style="
                font-size: 14px;
                line-height: 1.6;
                color: var(--b3-theme-on-background);
                margin-bottom: 8px;
                word-break: break-word;
            ">${this.highlightTags(this.escapeHtml(displayText))}</div>
            <div style="
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 12px;
                color: var(--b3-theme-on-surface-light);
            ">
                <span>🕐 ${this.formatDate(block.updated)}</span>
            </div>
        `;
        
        // 悬停效果
        item.addEventListener('mouseenter', () => {
            item.style.borderColor = 'var(--b3-theme-primary)';
            item.style.transform = 'translateX(4px)';
            item.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.borderColor = 'transparent';
            item.style.transform = 'translateX(0)';
            item.style.boxShadow = 'none';
        });
        
        // 点击跳转
        item.addEventListener('click', () => {
            onBlockClick(block.id);
        });
        
        return item;
    }
    
    /**
     * 渲染空状态
     */
    private renderEmptyState(container: HTMLElement, tagText: string): void {
        const emptyState = document.createElement('div');
        emptyState.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px 20px;
                color: var(--b3-theme-on-surface-light);
            ">
                <div style="font-size: 64px; margin-bottom: 16px; opacity: 0.5;">🔍</div>
                <div style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">未找到相关内容</div>
                <div style="font-size: 14px;">标签 "${this.escapeHtml(tagText)}" 在当前范围内没有被使用</div>
            </div>
        `;
        container.appendChild(emptyState);
    }
    
    /**
     * 提取纯文本
     */
    private extractTextContent(html: string): string {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }
    
    /**
     * 转义HTML
     */
    private escapeHtml(text: string): string {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 高亮标签
     */
    private highlightTags(text: string): string {
        if (!text) return '';
        return text.replace(/#([^#\s]+)#/g, 
            '<span style="color: var(--b3-theme-primary); font-weight: 600; background: var(--b3-theme-primary-lighter); padding: 2px 6px; border-radius: 4px;">#$1#</span>');
    }
    
    /**
     * 格式化日期
     */
    private formatDate(timestamp: string): string {
        if (!timestamp || timestamp.length < 12) return '未知时间';
        
        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        const day = timestamp.substring(6, 8);
        const hour = timestamp.substring(8, 10);
        const minute = timestamp.substring(10, 12);
        
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }
    
    /**
     * 渲染范围选择器
     */
    public renderScopeSelector(
        container: HTMLElement,
        currentScope: SearchScope,
        scopeNames: Record<SearchScope, string>,
        onScopeChange: (scope: SearchScope) => void
    ): void {
        const scopeContainer = document.createElement('div');
        scopeContainer.style.cssText = `
            display: flex;
            gap: 8px;
            padding: 12px 16px;
            background: var(--b3-theme-surface);
            border-radius: 8px;
            margin-bottom: 16px;
        `;
        
        const scopes: SearchScope[] = ['doc', 'subdocs', 'notebook', 'global'];
        
        scopes.forEach(scope => {
            const button = document.createElement('button');
            button.textContent = scopeNames[scope];
            button.style.cssText = `
                padding: 8px 16px;
                border: 2px solid ${scope === currentScope ? 'var(--b3-theme-primary)' : 'var(--b3-theme-surface-lighter)'};
                background: ${scope === currentScope ? 'var(--b3-theme-primary-lighter)' : 'var(--b3-theme-background)'};
                color: ${scope === currentScope ? 'var(--b3-theme-primary)' : 'var(--b3-theme-on-background)'};
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: ${scope === currentScope ? '600' : '400'};
                transition: all 0.2s;
                flex: 1;
            `;
            
            button.addEventListener('mouseenter', () => {
                if (scope !== currentScope) {
                    button.style.borderColor = 'var(--b3-theme-primary-light)';
                    button.style.background = 'var(--b3-theme-surface-light)';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                if (scope !== currentScope) {
                    button.style.borderColor = 'var(--b3-theme-surface-lighter)';
                    button.style.background = 'var(--b3-theme-background)';
                }
            });
            
            button.addEventListener('click', () => {
                onScopeChange(scope);
            });
            
            scopeContainer.appendChild(button);
        });
        
        container.appendChild(scopeContainer);
    }
}

export const tagResultRenderer = new TagResultRenderer();

