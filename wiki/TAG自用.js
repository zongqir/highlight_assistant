/**
 * 修改思源笔记标签触发键 - 独立实现
 * 
 * 原理：
 * 1. CSS 隐藏 # 触发的标签菜单
 * 2. 监听 $ 输入，调用思源 API 搜索标签
 * 3. 显示自定义菜单，插入标签
 * 
 * 完全独立实现，不依赖 protyle 实例！
 */

(function() {
    'use strict';
    
    const CONFIG = {
        TRIGGER: '$',
        DEBUG: false, // 默认关闭日志
    };
    
    // 日志工具函数
    const log = (...args) => {
        if (CONFIG.DEBUG) {
            console.log('[TAG]', ...args);
        }
    };
    
    // 错误日志（始终打印）
    const logError = (...args) => {
        console.error('[TAG ERROR]', ...args);
    };
    
    // 启动日志（始终显示）
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 标签触发键修改 - 独立实现');
    console.log('  触发键:', CONFIG.TRIGGER);
    console.log('  日志模式:', CONFIG.DEBUG ? '🔊 开启' : '🔇 关闭');
    console.log('═══════════════════════════════════════════════════');
    
    // 1. CSS 隐藏 # 触发的标签菜单 + 完整美化
    const style = document.createElement('style');
    style.textContent = `
        .protyle-hint:has(button[data-value*="data-type%3D%22tag%22"]) {
            display: none !important;
        }
        
        /* 自定义菜单容器 */
        #custom-tag-hint-menu {
            font-family: var(--b3-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif);
        }
        
        /* 滚动条美化 */
        #custom-tag-hint-menu::-webkit-scrollbar {
            width: 4px;
        }
        
        #custom-tag-hint-menu::-webkit-scrollbar-track {
            background: transparent;
        }
        
        #custom-tag-hint-menu::-webkit-scrollbar-thumb {
            background: var(--b3-scroll-color, rgba(0,0,0,0.12));
            border-radius: 2px;
        }
        
        #custom-tag-hint-menu::-webkit-scrollbar-thumb:hover {
            background: var(--b3-scroll-color, rgba(0,0,0,0.2));
        }
        
        /* 菜单项基础样式 */
        #custom-tag-hint-menu .hint-item {
            transition: all 0.12s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        #custom-tag-hint-menu .hint-item:hover {
            background: var(--b3-list-item-focus-background, rgba(0,0,0,0.04)) !important;
        }
        
        #custom-tag-hint-menu .hint-item:active {
            transform: scale(0.98) !important;
        }
        
        /* 菜单项文本样式 */
        #custom-tag-hint-menu .hint-item .b3-list-item__text {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        /* mark 标签美化（新建标签高亮） */
        #custom-tag-hint-menu mark {
            background: var(--b3-theme-primary-lightest, rgba(25, 118, 210, 0.08));
            color: var(--b3-theme-primary, #1976d2);
            padding: 1px 3px;
            border-radius: 2px;
            font-weight: 500;
        }
        
        /* 焦点项左侧指示器 */
        #custom-tag-hint-menu .hint-item-focused::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 60%;
            background: var(--b3-theme-primary, #1976d2);
            border-radius: 0 2px 2px 0;
            opacity: 0.8;
        }
        
        /* 表情样式优化 */
        #custom-tag-hint-menu .b3-list-item__text {
            display: flex;
            align-items: center;
        }
    `;
    document.head.appendChild(style);
    log('✅ CSS 已注入，# 触发的标签菜单已禁用');
    
    // 菜单元素
    let hintElement = null;
    let currentRange = null;
    let triggerStartPos = -1;
    let focusedIndex = 0; // 当前聚焦的菜单项索引
    
    /**
     * 创建菜单元素
     */
    function createHintElement() {
        if (hintElement) return hintElement;
        
        hintElement = document.createElement('div');
        hintElement.id = 'custom-tag-hint-menu';
        // 紧凑美观的样式设计
        hintElement.style.cssText = `
            display: none !important;
            position: fixed !important;
            z-index: 99999 !important;
            max-height: 320px !important;
            min-width: 180px !important;
            max-width: 360px !important;
            background: var(--b3-theme-background, #fff) !important;
            border: 1px solid var(--b3-border-color, rgba(0,0,0,0.08)) !important;
            box-shadow: var(--b3-dialog-shadow, 0 2px 12px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.1)) !important;
            border-radius: 4px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding: 4px !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
        `;
        document.body.appendChild(hintElement);
        
        // 鼠标悬停更新焦点
        hintElement.addEventListener('mouseover', (e) => {
            const button = e.target.closest('.hint-item');
            if (!button) return;
            
            focusedIndex = parseInt(button.dataset.index);
            updateFocus();
        });
        
        // 点击菜单项
        hintElement.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            log('  - 🖱️ 点击菜单项');
            
            const value = decodeURIComponent(button.dataset.value);
            insertTag(value);
            hideHint();
        });
        
        return hintElement;
    }
    
    /**
     * 显示菜单
     */
    function showHint(items, x, y) {
        const hint = createHintElement();
        focusedIndex = 0; // 重置焦点
        
        let html = '';
        items.forEach((item, i) => {
            const focusClass = i === 0 ? 'hint-item-focused' : '';
            const focusBg = i === 0 ? 'var(--b3-list-item-focus-background, rgba(0,0,0,0.04))' : 'transparent';
            html += `<button class="hint-item ${focusClass}" style="
                display: block;
                width: 100%;
                padding: 6px 10px;
                padding-left: 14px;
                margin: 1px 0;
                border: none;
                background: ${focusBg};
                color: var(--b3-theme-on-background, #202124);
                text-align: left;
                cursor: pointer;
                border-radius: 3px;
                font-size: 13px;
                line-height: 1.4;
                position: relative;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            " data-index="${i}" data-value="${encodeURIComponent(item.value)}">
                ${item.html}
            </button>`;
        });
        
        hint.innerHTML = html;
        hint.style.setProperty('display', 'block', 'important');
        hint.style.setProperty('left', x + 'px', 'important');
        hint.style.setProperty('top', (y + 20) + 'px', 'important');
        
        // 添加淡入动画
        hint.style.setProperty('opacity', '0', 'important');
        hint.style.setProperty('transform', 'translateY(-4px)', 'important');
        hint.style.setProperty('transition', 'opacity 0.15s ease-out, transform 0.15s ease-out', 'important');
        
        setTimeout(() => {
            hint.style.setProperty('opacity', '1', 'important');
            hint.style.setProperty('transform', 'translateY(0)', 'important');
        }, 10);
        
        log('  - ✅ 菜单已显示，共', items.length, '项');
        log('  - 📍 位置:', x, y + 20);
    }
    
    /**
     * 隐藏菜单
     */
    function hideHint() {
        if (hintElement && hintElement.style.display !== 'none') {
            // 快速淡出
            hintElement.style.setProperty('opacity', '0', 'important');
            hintElement.style.setProperty('transform', 'translateY(-3px)', 'important');
            hintElement.style.setProperty('transition', 'opacity 0.1s ease-out, transform 0.1s ease-out', 'important');
            
            setTimeout(() => {
                hintElement.style.setProperty('display', 'none', 'important');
            }, 100);
        }
    }
    
    /**
     * 更新菜单焦点
     */
    function updateFocus() {
        if (!hintElement) return;
        
        const items = hintElement.querySelectorAll('.hint-item');
        items.forEach((item, i) => {
            if (i === focusedIndex) {
                item.classList.add('hint-item-focused');
                item.style.background = 'var(--b3-list-item-focus-background, rgba(0,0,0,0.04))';
                // 滚动到可见区域
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('hint-item-focused');
                item.style.background = 'transparent';
            }
        });
    }
    
    /**
     * 选择当前焦点项
     */
    function selectFocusedItem() {
        if (!hintElement) return;
        
        const items = hintElement.querySelectorAll('.hint-item');
        if (items[focusedIndex]) {
            items[focusedIndex].click();
        }
    }
    
    /**
     * 提取并格式化标签显示（表情优先）
     */
    function formatTagDisplay(tagText) {
        // 移除 mark 标签
        const cleanText = tagText.replace(/<mark>/g, '').replace(/<\/mark>/g, '');
        
        // 提取 emoji（Unicode 表情）
        const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
        const emojis = cleanText.match(emojiRegex) || [];
        const textWithoutEmoji = cleanText.replace(emojiRegex, '').trim();
        
        // 如果有 mark，保留高亮
        let displayText = textWithoutEmoji;
        if (tagText.includes('<mark>')) {
            // 重新应用 mark
            const marked = tagText.match(/<mark>(.*?)<\/mark>/);
            if (marked) {
                displayText = displayText.replace(marked[1], `<mark>${marked[1]}</mark>`);
            }
        }
        
        // 表情在前，文本在后
        if (emojis.length > 0) {
            return `<span style="margin-right: 6px; font-size: 16px;">${emojis.join('')}</span>${displayText}`;
        }
        
        return displayText;
    }
    
    /**
     * 检查文本是否包含表情
     */
    function hasEmoji(text) {
        const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
        return emojiRegex.test(text);
    }
    
    /**
     * 调用思源 API 搜索标签
     */
    async function searchTags(keyword) {
        try {
            const response = await fetch('/api/search/searchTag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ k: keyword })
            });
            
            const data = await response.json();
            
            if (data.code !== 0) {
                logError('搜索标签失败:', data.msg);
                return [];
            }
            
            const itemsWithEmoji = [];
            const itemsWithoutEmoji = [];
            let hasKey = false;
            
            data.data.tags.forEach(tag => {
                const value = tag.replace(/<mark>/g, '').replace(/<\/mark>/g, '');
                const displayHtml = formatTagDisplay(tag);
                
                const item = {
                    value: `<span data-type="tag">${value}</span>`,
                    html: `<div class="b3-list-item__text">${displayHtml}</div>`,
                    rawValue: value
                };
                
                // 按是否有表情分类
                if (hasEmoji(value)) {
                    itemsWithEmoji.push(item);
                } else {
                    itemsWithoutEmoji.push(item);
                }
                
                if (value === data.data.k) {
                    hasKey = true;
                }
            });
            
            // 合并：带表情的在前，不带表情的在后
            const items = [...itemsWithEmoji, ...itemsWithoutEmoji];
            
            // 如果输入的标签不存在，添加"新建标签"选项（始终在最前面）
            if (data.data.k && !hasKey) {
                const newTagDisplay = formatTagDisplay(data.data.k);
                items.unshift({
                    value: `<span data-type="tag">${data.data.k}</span>`,
                    html: `<div class="b3-list-item__text"><span style="color: var(--b3-theme-primary, #1976d2);">新建</span> ${newTagDisplay}</div>`,
                    rawValue: data.data.k
                });
            }
            
            log(`  - 📊 带表情: ${itemsWithEmoji.length}, 无表情: ${itemsWithoutEmoji.length}`);
            
            return items;
            
        } catch (e) {
            logError('搜索标签错误:', e);
            return [];
        }
    }
    
    /**
     * 转义 HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 插入标签
     */
    function insertTag(tagHTML) {
        if (!currentRange || triggerStartPos === -1) {
            log('  - ❌ 无法插入：没有保存的光标位置');
            return;
        }
        
        try {
            // 使用保存的 range
            const textNode = currentRange.startContainer;
            
            if (textNode.nodeType !== 3) {
                logError('  - ❌ 起始节点不是文本节点');
                return;
            }
            
            const text = textNode.textContent;
            const savedCursorPos = currentRange.startOffset; // 保存的光标位置
            
            log('  - 📝 当前文本:', text);
            log('  - 📍 触发位置:', triggerStartPos);
            log('  - 📍 保存的光标位置:', savedCursorPos);
            
            // 创建标签元素
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = tagHTML;
            const tagSpan = tempDiv.firstChild;
            
            if (!tagSpan) {
                logError('  - ❌ 无法创建标签元素');
                return;
            }
            
            log('  - 🏷️ 标签HTML:', tagHTML);
            log('  - 📄 删除范围: [', triggerStartPos, ',', savedCursorPos, ']');
            
            // 创建新的 range 来删除 $ 和关键词
            const range = document.createRange();
            range.setStart(textNode, triggerStartPos);
            range.setEnd(textNode, savedCursorPos);
            range.deleteContents();
            
            // 插入标签
            range.insertNode(tagSpan);
            
            // 在标签后插入空格
            const space = document.createTextNode(' ');
            if (tagSpan.nextSibling) {
                tagSpan.parentNode.insertBefore(space, tagSpan.nextSibling);
            } else {
                tagSpan.parentNode.appendChild(space);
            }
            
            // 将光标移到空格后
            range.setStart(space, 1);
            range.collapse(true);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            // 触发 input 事件，让思源知道内容变化
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
            });
            tagSpan.parentElement.dispatchEvent(inputEvent);
            
            log('  - ✅ 标签已插入:', tagSpan.textContent);
            
        } catch (e) {
            logError('❌ 插入标签失败:', e);
            logError('错误详情:', e.stack);
        }
    }
    
    /**
     * 监听输入事件
     */
    document.addEventListener('input', async (event) => {
        const target = event.target;
        
        // 只处理编辑器内的输入
        if (!target.closest || !target.closest('.protyle-wysiwyg')) {
            return;
        }
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        
        if (textNode.nodeType !== 3) return;
        
        const text = textNode.textContent;
        const cursorPos = range.startOffset;
        
        // 查找最后一个 $
        const lastTriggerPos = text.lastIndexOf(CONFIG.TRIGGER);
        
        if (lastTriggerPos === -1 || lastTriggerPos >= cursorPos) {
            hideHint();
            return;
        }
        
        // 获取 $ 后面的关键词
        const keyword = text.substring(lastTriggerPos + 1, cursorPos);
        
        // 关键词不能包含空格
        if (keyword.includes(' ') || keyword.includes('\n')) {
            hideHint();
            return;
        }
        
        // 关键词长度限制
        if (keyword.length > 64) {
            hideHint();
            return;
        }
        
        log('🎯 检测到标签触发:', CONFIG.TRIGGER + keyword);
        
        // 保存当前状态
        currentRange = range.cloneRange();
        triggerStartPos = lastTriggerPos;
        
        // 搜索标签
        const items = await searchTags(keyword);
        
        if (items.length === 0) {
            hideHint();
            return;
        }
        
        // 显示菜单
        const rect = range.getBoundingClientRect();
        showHint(items, rect.left, rect.top);
        
    }, true);
    
    // 键盘导航
    document.addEventListener('keydown', (e) => {
        // 只在菜单显示时处理
        if (!hintElement || hintElement.style.display === 'none') return;
        
        const items = hintElement.querySelectorAll('.hint-item');
        if (items.length === 0) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                focusedIndex = (focusedIndex + 1) % items.length;
                updateFocus();
                log('  - ⬇️ 向下，当前索引:', focusedIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                focusedIndex = (focusedIndex - 1 + items.length) % items.length;
                updateFocus();
                log('  - ⬆️ 向上，当前索引:', focusedIndex);
                break;
                
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                e.stopPropagation();
                selectFocusedItem();
                log('  - ✅ 选择项:', focusedIndex);
                break;
                
            case 'Escape':
                e.preventDefault();
                hideHint();
                log('  - ❌ ESC 关闭菜单');
                break;
        }
    }, true); // capture phase，优先处理
    
    // 调试工具
    window.tagTriggerDebug = {
        // 开启日志
        enableLog: () => {
            CONFIG.DEBUG = true;
            console.log('🔊 [TAG] 日志已开启');
        },
        // 关闭日志
        disableLog: () => {
            CONFIG.DEBUG = false;
            console.log('🔇 [TAG] 日志已关闭');
        },
        // 查看日志状态
        getStatus: () => {
            console.log('日志状态:', CONFIG.DEBUG ? '🔊 开启' : '🔇 关闭');
            return CONFIG.DEBUG;
        },
        // 检查菜单
        checkMenu: () => {
            if (!hintElement) {
                console.log('❌ 菜单元素不存在');
                return;
            }
            console.log('菜单元素:', hintElement);
            console.log('菜单样式 display:', hintElement.style.display);
            console.log('菜单位置:', {
                left: hintElement.style.left,
                top: hintElement.style.top,
                zIndex: hintElement.style.zIndex
            });
            console.log('菜单内容:', hintElement.innerHTML.substring(0, 200));
        },
        // 强制显示菜单
        forceShow: () => {
            if (!hintElement) {
                console.log('❌ 菜单元素不存在，先输入 $ 触发一次');
                return;
            }
            hintElement.style.setProperty('display', 'block', 'important');
            hintElement.style.setProperty('left', '100px', 'important');
            hintElement.style.setProperty('top', '100px', 'important');
            console.log('✅ 强制显示菜单在 (100, 100)');
            console.log('菜单内容:', hintElement.innerHTML.substring(0, 200));
        }
    };
    
    console.log('✅ 脚本启动完成！');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('💬 使用说明:');
    console.log(`  - 输入 "${CONFIG.TRIGGER}" 然后输入标签关键词`);
    console.log('  - 会自动搜索并显示标签列表');
    console.log('');
    console.log('⌨️ 键盘操作:');
    console.log('  - ↑/↓ 方向键    - 上下选择');
    console.log('  - Enter/Tab     - 确认选择');
    console.log('  - ESC           - 关闭菜单');
    console.log('');
    console.log('🖱️ 鼠标操作:');
    console.log('  - 悬停高亮，点击选择');
    console.log('');
    console.log('🔧 调试工具:');
    console.log('  - tagTriggerDebug.enableLog()   - 开启详细日志 🔊');
    console.log('  - tagTriggerDebug.disableLog()  - 关闭详细日志 🔇');
    console.log('  - tagTriggerDebug.getStatus()   - 查看日志状态');
    console.log('  - tagTriggerDebug.checkMenu()   - 检查菜单状态');
    console.log('  - tagTriggerDebug.forceShow()   - 强制显示菜单');
    console.log('');
    console.log('💡 提示:');
    console.log('  - 默认日志已关闭，只显示错误信息');
    console.log('  - 需要调试时运行: tagTriggerDebug.enableLog()');
    console.log('');
    console.log('🔍 测试: 在编辑器中输入 $test，然后用方向键选择！');
    console.log('═══════════════════════════════════════════════════');
    
})();

