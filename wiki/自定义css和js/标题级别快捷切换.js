/**
 * 思源笔记 - 标题级别快捷切换
 * 
 * 功能：使用 Tab/Shift+Tab 快速调整标题级别
 *  - Tab: 标题级别下沉 (h1 -> h2 -> h3 -> h4 -> h5)
 *  - Shift+Tab: 标题级别上升 (h5 -> h4 -> h3 -> h2 -> h1)
 * 
 * 使用方法：
 * 1. 将此 JS 代码添加到 思源笔记 - 设置 - 外观 - 代码片段 - JS 片段中
 * 2. 重启思源笔记或刷新页面即可生效
 * 3. 光标在标题块内时，按 Tab/Shift+Tab 即可调整级别
 * 
 * 注意：
 * - 思源默认使用 Ctrl+Alt+1/2/3/4/5 来设置标题级别
 * - 此脚本复用了思源的 /api/block/getHeadingLevelTransaction API
 * - h1 级别的标题按 Shift+Tab 不会变化
 * - h5 级别的标题按 Tab 不会变化
 * - 只在编辑器中的标题块上生效
 */

(function() {
    'use strict';
    
    // ==================== 配置选项 ====================
    const CONFIG = {
        debugMode: true,               // 是否启用调试日志（首次使用建议开启）
        enableTab: true,               // 是否启用 Tab 键（下沉）
        enableShiftTab: true,          // 是否启用 Shift+Tab 键（上升）
        minLevel: 1,                   // 最小标题级别（h1）
        maxLevel: 5,                   // 最大标题级别（h5）
        showNotification: true,        // 是否显示级别变化提示
    };
    
    // ==================== 日志工具 ====================
    const log = {
        info: (msg, ...args) => console.log(`[标题级别切换] ${msg}`, ...args),
        debug: (msg, ...args) => {
            if (CONFIG.debugMode) {
                console.log(`[标题级别切换 DEBUG] ${msg}`, ...args);
            }
        },
        error: (msg, ...args) => console.error(`[标题级别切换] ${msg}`, ...args),
    };
    
    log.info('✨ 脚本开始加载...');
    
    // 正在处理的标志，防止快速重复触发
    let isProcessing = false;
    
    /**
     * 获取当前光标所在的块元素
     */
    function getCurrentBlock() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            log.debug('getCurrentBlock: 没有选区');
            return null;
        }
        
        let node = selection.focusNode;
        log.debug('getCurrentBlock: focusNode =', node);
        
        // 如果是文本节点，获取其父元素
        if (node && node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
            log.debug('getCurrentBlock: 文本节点的父元素 =', node);
        }
        
        // 向上查找最近的块元素（带 data-node-id 的元素）
        let depth = 0;
        while (node && node !== document.body && depth < 20) {
            if (node.getAttribute && node.getAttribute('data-node-id')) {
                const dataType = node.getAttribute('data-type');
                log.debug(`getCurrentBlock: 找到块元素, id=${node.getAttribute('data-node-id')}, type=${dataType}`);
                return node;
            }
            node = node.parentElement;
            depth++;
        }
        
        log.debug('getCurrentBlock: 未找到块元素');
        return null;
    }
    
    /**
     * 检查块是否是标题块
     */
    function isHeadingBlock(blockElement) {
        if (!blockElement) {
            log.debug('isHeadingBlock: blockElement is null');
            return false;
        }
        
        const type = blockElement.getAttribute('data-type');
        const isHeading = type === 'NodeHeading';
        log.debug(`isHeadingBlock: data-type=${type}, isHeading=${isHeading}`);
        return isHeading;
    }
    
    /**
     * 获取标题的当前级别
     */
    function getHeadingLevel(blockElement) {
        if (!blockElement) {
            log.debug('getHeadingLevel: blockElement is null');
            return 0;
        }
        
        // 先打印整个块的 HTML 看看结构
        log.debug('getHeadingLevel: blockElement.outerHTML =', blockElement.outerHTML.substring(0, 200));
        
        // 方法1: 查找 h1-h6 标签（作为子元素）
        for (let level = 1; level <= 6; level++) {
            const heading = blockElement.querySelector(`h${level}`);
            if (heading) {
                log.debug(`getHeadingLevel: 方法1找到 h${level} 标签`);
                return level;
            }
        }
        
        // 方法2: 检查 blockElement 本身是否是 h1-h6
        const tagName = blockElement.tagName;
        if (tagName && /^H[1-6]$/.test(tagName)) {
            const level = parseInt(tagName.substring(1));
            log.debug(`getHeadingLevel: 方法2, blockElement本身是 ${tagName}, level=${level}`);
            return level;
        }
        
        // 方法3: 查找 data-subtype 属性（思源可能用这个存储标题级别）
        const subtype = blockElement.getAttribute('data-subtype');
        if (subtype && /^h[1-6]$/.test(subtype)) {
            const level = parseInt(subtype.substring(1));
            log.debug(`getHeadingLevel: 方法3, data-subtype=${subtype}, level=${level}`);
            return level;
        }
        
        // 方法4: 通过 div 元素的 contenteditable 父级找
        const editableDiv = blockElement.querySelector('div[contenteditable="true"]');
        if (editableDiv && editableDiv.parentElement) {
            const parentTag = editableDiv.parentElement.tagName;
            if (parentTag && /^H[1-6]$/.test(parentTag)) {
                const level = parseInt(parentTag.substring(1));
                log.debug(`getHeadingLevel: 方法4, 父元素是 ${parentTag}, level=${level}`);
                return level;
            }
        }
        
        log.debug('getHeadingLevel: 所有方法都未找到标题级别');
        log.debug('getHeadingLevel: blockElement attributes =', Array.from(blockElement.attributes).map(a => `${a.name}="${a.value}"`).join(', '));
        return 0;
    }
    
    /**
     * 诊断 API 拒绝操作的原因
     * @param {string} blockId - 当前块ID
     * @param {number} currentLevel - 当前标题级别
     * @param {number} newLevel - 目标标题级别
     * @returns {string|null} 拒绝原因描述，如果无法确定则返回null
     */
    async function diagnoseRefusalReason(blockId, currentLevel, newLevel) {
        try {
            // 只诊断上升级别被拒绝的情况
            if (newLevel >= currentLevel) {
                return null;
            }
            
            // 获取当前块元素
            const currentBlock = document.querySelector(`[data-node-id="${blockId}"]`);
            if (!currentBlock) {
                return null;
            }
            
            // 查找前一个兄弟块（在编辑器中）
            let prevBlock = currentBlock.previousElementSibling;
            
            // 跳过非块元素
            while (prevBlock && !prevBlock.getAttribute('data-node-id')) {
                prevBlock = prevBlock.previousElementSibling;
            }
            
            if (!prevBlock) {
                log.debug('诊断: 没有找到前一个块');
                return '当前标题是第一个块或所在容器不允许此操作';
            }
            
            const prevType = prevBlock.getAttribute('data-type');
            const prevSubtype = prevBlock.getAttribute('data-subtype');
            
            log.debug(`诊断: 前一个块类型=${prevType}, 子类型=${prevSubtype}`);
            
            // 检查前一个块是否是标题
            if (prevType === 'NodeHeading') {
                const prevLevel = getHeadingLevelFromAttributes(prevBlock);
                log.debug(`诊断: 前一个块是 h${prevLevel} 标题`);
                
                // 分析层级关系
                // 思源的标题层级规则：标题之间存在父子关系
                // 例如：h1 -> h2 -> h3，其中 h2 是 h1 的子标题，h3 是 h2 的子标题
                
                if (prevLevel === newLevel) {
                    // 前面已经有同级标题，当前标题是该标题下的子标题
                    return `前面已有 h${newLevel} 标题，当前 h${currentLevel} 被视为其下级标题`;
                } else if (prevLevel === currentLevel - 1) {
                    // 前面的标题正好比当前标题高一级（如 h2 -> h3）
                    // 这种情况下，当前标题确实是前面标题的直接子标题
                    return `当前 h${currentLevel} 是前面 h${prevLevel} 的直接子标题，需要先调整上级标题结构`;
                } else if (prevLevel < currentLevel - 1) {
                    // 前面的标题比当前标题高多级（如 h1 -> h3）
                    // 这种情况说明当前标题跨级了
                    return `标题层级跨越（h${prevLevel} → h${currentLevel}），思源可能要求先补充中间级别（h${prevLevel + 1}）`;
                } else if (prevLevel >= currentLevel) {
                    // 前面的标题级别等于或小于当前标题（如 h3 -> h3 或 h4 -> h3）
                    return `前面是 h${prevLevel}，当前是 h${currentLevel}，但思源仍拒绝升到 h${newLevel}（可能文档结构限制）`;
                }
            } else {
                log.debug(`诊断: 前一个块不是标题，类型是 ${prevType}`);
                return `前面是${getBlockTypeName(prevType)}而非标题，但思源仍禁止此操作（可能需要前置标题）`;
            }
            
            // 检查父容器
            const parentContainer = currentBlock.parentElement;
            if (parentContainer) {
                const containerType = parentContainer.getAttribute('data-type');
                if (containerType && containerType !== 'NodeDocument') {
                    log.debug(`诊断: 在特殊容器中，类型=${containerType}`);
                    return `标题在特殊容器中（${getBlockTypeName(containerType)}），可能有层级限制`;
                }
            }
            
            return null;
            
        } catch (error) {
            log.error('诊断失败:', error);
            return null;
        }
    }
    
    /**
     * 从块元素属性中获取标题级别
     */
    function getHeadingLevelFromAttributes(blockElement) {
        const subtype = blockElement.getAttribute('data-subtype');
        if (subtype && /^h[1-6]$/.test(subtype)) {
            return parseInt(subtype.substring(1));
        }
        return 0;
    }
    
    /**
     * 获取块类型的友好名称
     */
    function getBlockTypeName(type) {
        const typeNames = {
            'NodeParagraph': '段落',
            'NodeHeading': '标题',
            'NodeList': '列表',
            'NodeListItem': '列表项',
            'NodeCodeBlock': '代码块',
            'NodeBlockquote': '引用块',
            'NodeSuperBlock': '超级块',
            'NodeTable': '表格',
            'NodeMathBlock': '数学公式',
            'NodeThematicBreak': '分割线',
            'NodeDocument': '文档',
        };
        return typeNames[type] || type;
    }
    
    /**
     * 通过模拟快捷键来修改标题级别（使用思源原生机制）
     */
    function changeHeadingLevelByShortcut(newLevel) {
        try {
            log.debug(`⌨️ 模拟快捷键: Ctrl+Alt+${newLevel}`);
            
            // 创建键盘事件
            const event = new KeyboardEvent('keydown', {
                key: String(newLevel),
                code: `Digit${newLevel}`,
                keyCode: 48 + newLevel, // 0的keyCode是48
                which: 48 + newLevel,
                ctrlKey: true,
                altKey: true,
                shiftKey: false,
                metaKey: false,
                bubbles: true,
                cancelable: true
            });
            
            // 在当前焦点元素上触发事件
            const activeElement = document.activeElement;
            if (activeElement) {
                log.debug(`  - 在元素上触发: ${activeElement.tagName}`);
                activeElement.dispatchEvent(event);
            } else {
                log.debug(`  - 在 document 上触发`);
                document.dispatchEvent(event);
            }
            
            return true;
            
        } catch (error) {
            log.error('❌ 模拟快捷键失败:', error);
            return false;
        }
    }
    
    /**
     * 显示提示消息
     */
    function showMessage(message, timeout = 2000, type = 'info') {
        if (!CONFIG.showNotification) return;
        
        if (window.siyuan && window.siyuan.showMessage) {
            window.siyuan.showMessage(message, timeout, type);
        }
    }
    
    /**
     * 保存光标在块内的相对位置
     */
    function saveCursorPosition(blockElement) {
        try {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                return null;
            }
            
            const range = selection.getRangeAt(0);
            const editableDiv = blockElement.querySelector('[contenteditable="true"]');
            if (!editableDiv) {
                return null;
            }
            
            // 获取光标在可编辑元素内的偏移量
            const textContent = editableDiv.textContent || '';
            const offset = range.startOffset;
            
            log.debug(`💾 保存光标位置: offset=${offset}, textLength=${textContent.length}`);
            
            return {
                offset: offset,
                textLength: textContent.length,
                // 保存为百分比，以防文本长度变化
                percentage: textContent.length > 0 ? offset / textContent.length : 0
            };
        } catch (error) {
            log.error('保存光标位置失败:', error);
            return null;
        }
    }
    
    /**
     * 恢复光标位置（只恢复到编辑器内的主块）
     */
    function restoreCursorPosition(blockId, savedPosition) {
        try {
            log.debug(`🔍 开始恢复光标到块: ${blockId}`);
            
            // 查找所有匹配的块
            const allMatchingBlocks = document.querySelectorAll(`[data-node-id="${blockId}"]`);
            log.debug(`📦 找到 ${allMatchingBlocks.length} 个匹配的块`);
            
            if (allMatchingBlocks.length === 0) {
                log.error('恢复光标: 未找到更新后的块');
                return false;
            }
            
            // 筛选出在编辑器内的块（排除大纲、面包屑等）
            let updatedBlock = null;
            for (const block of allMatchingBlocks) {
                const inEditor = block.closest('.protyle-wysiwyg');
                log.debug(`  块 ${block.getAttribute('data-node-id')}: ${inEditor ? '✅ 在编辑器内' : '❌ 在其他位置（大纲/面包屑等）'}`);
                if (inEditor) {
                    updatedBlock = block;
                    break;
                }
            }
            
            if (!updatedBlock) {
                log.error('恢复光标: 未找到编辑器内的块');
                return false;
            }
            
            log.debug(`✅ 使用编辑器内的块: ${blockId}, data-type=${updatedBlock.getAttribute('data-type')}, data-subtype=${updatedBlock.getAttribute('data-subtype')}`);
            
            const editableDiv = updatedBlock.querySelector('[contenteditable="true"]');
            if (!editableDiv) {
                log.error('恢复光标: 未找到可编辑元素');
                return false;
            }
            
            log.debug(`📝 可编辑元素内容: "${editableDiv.textContent}"`);
            
            // 获取第一个文本节点
            let textNode = editableDiv.firstChild;
            let depth = 0;
            while (textNode && textNode.nodeType !== Node.TEXT_NODE && depth < 10) {
                textNode = textNode.firstChild;
                depth++;
            }
            
            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
                // 如果没有文本节点，聚焦到可编辑元素
                log.debug('恢复光标: 没有文本节点，聚焦到可编辑元素');
                editableDiv.focus();
                
                // 尝试将光标放到元素内
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(editableDiv);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                
                return true;
            }
            
            // 计算新的光标位置
            const textContent = textNode.textContent || '';
            let newOffset;
            
            if (savedPosition) {
                // 优先使用原始偏移量，如果超出范围则使用百分比
                if (savedPosition.offset <= textContent.length) {
                    newOffset = savedPosition.offset;
                } else {
                    newOffset = Math.floor(textContent.length * savedPosition.percentage);
                }
            } else {
                // 如果没有保存位置，默认放在末尾
                newOffset = textContent.length;
            }
            
            // 确保 offset 不超出范围
            newOffset = Math.min(newOffset, textContent.length);
            
            log.debug(`📍 恢复光标位置: offset=${newOffset}, textLength=${textContent.length}, textContent="${textContent}"`);
            
            // 设置光标位置
            const range = document.createRange();
            const selection = window.getSelection();
            
            range.setStart(textNode, newOffset);
            range.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(range);
            
            // 验证光标是否设置成功
            const verifySelection = window.getSelection();
            const verifyFocusNode = verifySelection.focusNode;
            log.debug(`✔️ 验证光标: focusNode=${verifyFocusNode ? verifyFocusNode.textContent : 'null'}, offset=${verifySelection.focusOffset}`);
            
            // 确保元素在视图中（温和滚动，不打断用户）
            editableDiv.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            
            log.debug('✅ 光标位置已恢复到编辑器内的块');
            return true;
            
        } catch (error) {
            log.error('恢复光标位置失败:', error);
            log.error('错误堆栈:', error.stack);
            return false;
        }
    }
    
    /**
     * 处理标题级别调整
     */
    async function handleHeadingLevelChange(isIncrease) {
        // 防止重复触发
        if (isProcessing) {
            log.debug('⏸️ 正在处理中，跳过此次请求');
            return false;
        }
        
        isProcessing = true;
        log.debug(`🎯 开始处理标题级别调整: ${isIncrease ? '下沉' : '上升'}`);
        
        try {
            // 获取当前块
            const blockElement = getCurrentBlock();
            if (!blockElement) {
                log.debug('❌ 未找到当前块');
                return false;
            }
            
            // 检查是否是标题块
            if (!isHeadingBlock(blockElement)) {
                log.debug('❌ 当前块不是标题块');
                return false;
            }
            
            // 获取当前级别
            const currentLevel = getHeadingLevel(blockElement);
            if (currentLevel === 0) {
                log.debug('❌ 无法获取当前标题级别');
                return false;
            }
            
            // 计算新级别
            const newLevel = isIncrease ? currentLevel + 1 : currentLevel - 1;
            
            // 检查级别范围
            if (newLevel < CONFIG.minLevel || newLevel > CONFIG.maxLevel) {
                log.debug(`⚠️ 级别超出范围: ${newLevel}`);
                if (newLevel < CONFIG.minLevel) {
                    showMessage(`⚠️ 已经是最高级别标题 (h${CONFIG.minLevel})`, 1500, 'info');
                } else {
                    showMessage(`⚠️ 已经是最低级别标题 (h${CONFIG.maxLevel})`, 1500, 'info');
                }
                return false;
            }
            
            // 获取块ID
            const blockId = blockElement.getAttribute('data-node-id');
            if (!blockId) {
                log.error('❌ 无法获取块ID');
                return false;
            }
            
            log.info(`📝 修改标题级别: h${currentLevel} -> h${newLevel}, blockId=${blockId}`);
            
            // 通过模拟思源原生快捷键来修改级别
            const success = changeHeadingLevelByShortcut(newLevel);
            
            if (success) {
                showMessage(`✅ 标题级别已调整: h${currentLevel} → h${newLevel}`, 1500, 'info');
            }
            
            return success;
        } finally {
            // 无论成功与否，都释放处理标志
            // 稍微延迟一下，确保DOM更新完成
            setTimeout(() => {
                isProcessing = false;
                log.debug('✅ 处理标志已释放');
            }, 100);
        }
    }
    
    /**
     * 监听键盘事件
     */
    function initKeyboardListener() {
        // 在protyle-wysiwyg上监听，使用捕获阶段
        document.addEventListener('keydown', async (event) => {
            // 只处理 Tab 键
            if (event.key !== 'Tab') {
                return;
            }
            
            // 检查是否按了其他修饰键（Ctrl/Alt/Meta，但允许Shift）
            if (event.ctrlKey || event.altKey || event.metaKey) {
                return;
            }
            
            log.debug(`⌨️ 检测到 Tab 键: ${event.shiftKey ? 'Shift+Tab' : 'Tab'}`);
            
            // 检查是否在编辑器内
            const target = event.target;
            if (!target.closest) {
                return;
            }
            
            const protyleWysiwyg = target.closest('.protyle-wysiwyg');
            if (!protyleWysiwyg) {
                log.debug('❌ 不在编辑器内');
                return;
            }
            
            // 获取当前块并检查是否是标题块
            const blockElement = getCurrentBlock();
            if (!blockElement) {
                log.debug('❌ 未找到当前块');
                return;
            }
            
            if (!isHeadingBlock(blockElement)) {
                // 不是标题块，不拦截 Tab 键，让思源正常处理
                log.debug('❌ 不是标题块，跳过');
                return;
            }
            
            log.debug(`✅ 检测到标题块: ${blockElement.getAttribute('data-node-id')}`);
            
            // 检查配置
            const isShiftTab = event.shiftKey;
            if (isShiftTab && !CONFIG.enableShiftTab) {
                log.debug('⚠️ Shift+Tab 被禁用');
                return;
            }
            if (!isShiftTab && !CONFIG.enableTab) {
                log.debug('⚠️ Tab 被禁用');
                return;
            }
            
            // 是标题块，阻止默认行为
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            log.debug(`🎯 准备处理标题级别调整: ${isShiftTab ? '上升' : '下沉'}`);
            
            // 处理标题级别调整
            const isIncrease = !isShiftTab; // Tab 是下沉（增加级别），Shift+Tab 是上升（减少级别）
            await handleHeadingLevelChange(isIncrease);
            
        }, true); // 使用捕获阶段，优先于思源的监听器
        
        log.info('✓ 键盘监听器已启动（捕获阶段）');
    }
    
    /**
     * 初始化
     */
    function init() {
        if (typeof window.siyuan === 'undefined') {
            log.debug('⏳ 等待思源 API 加载...');
            setTimeout(init, 300);
            return;
        }
        
        // 启动键盘监听
        initKeyboardListener();
        
        log.info('✅ 启动成功！');
        log.info('📖 使用说明:');
        log.info('  - 光标在标题块内时:');
        log.info('    • Tab - 标题级别下沉 (h1→h2→h3→h4→h5)');
        log.info('    • Shift+Tab - 标题级别上升 (h5→h4→h3→h2→h1)');
        log.info('  - 快捷键范围: h1 ~ h5');
        log.info('');
        log.info('🔧 调试命令:');
        log.info('  - headingLevelSwitch.enableDebug()  - 启用调试日志');
        log.info('  - headingLevelSwitch.disableDebug() - 关闭调试日志');
        log.info('  - headingLevelSwitch.getConfig()    - 查看配置');
        log.info('  - headingLevelSwitch.help()         - 显示帮助');
        
        // 暴露全局接口
        window.headingLevelSwitch = {
            version: '1.0',
            config: CONFIG,
            
            // 启用调试
            enableDebug: () => {
                CONFIG.debugMode = true;
                log.info('✓ 调试模式已启用');
            },
            
            // 关闭调试
            disableDebug: () => {
                CONFIG.debugMode = false;
                log.info('✓ 调试模式已关闭');
            },
            
            // 获取配置
            getConfig: () => {
                console.table(CONFIG);
                return CONFIG;
            },
            
            // 切换提示
            toggleNotification: () => {
                CONFIG.showNotification = !CONFIG.showNotification;
                log.info(`✓ 提示消息已${CONFIG.showNotification ? '启用' : '关闭'}`);
            },
            
            // 手动调整（用于测试）
            adjustLevel: async (increase = true) => {
                return await handleHeadingLevelChange(increase);
            },
            
            // 帮助
            help: () => {
                console.log(`
╔══════════════════════════════════════════════════════════╗
║     标题级别快捷切换 v1.0 - 使用帮助                     ║
╠══════════════════════════════════════════════════════════╣
║ 🎯 功能说明：                                             ║
║  📝 在标题块内按 Tab/Shift+Tab 快速调整级别              ║
║     • Tab         - 标题级别下沉 (h1→h2→h3→h4→h5)        ║
║     • Shift+Tab   - 标题级别上升 (h5→h4→h3→h2→h1)        ║
║                                                           ║
║ 📌 使用范围：                                             ║
║  • 仅在编辑器内的标题块上生效                            ║
║  • 级别范围: h1 ~ h5                                      ║
║  • 超出范围时会显示提示                                   ║
║                                                           ║
║ 🔧 配置命令：                                             ║
║  .enableDebug()        - 启用调试日志                     ║
║  .disableDebug()       - 关闭调试日志                     ║
║  .getConfig()          - 查看当前配置                     ║
║  .toggleNotification() - 切换提示消息                     ║
║  .adjustLevel(true)    - 手动下沉一级（测试用）           ║
║  .adjustLevel(false)   - 手动上升一级（测试用）           ║
║  .help()               - 显示此帮助                       ║
║                                                           ║
║ 💡 提示：                                                 ║
║  • 思源默认快捷键: Ctrl+Alt+1/2/3/4/5                    ║
║  • 此脚本提供更便捷的渐进式调整方式                      ║
║  • 两种方式可以同时使用，互不影响                        ║
╚══════════════════════════════════════════════════════════╝
                `);
            }
        };
        
        // 简化访问
        window.hls = window.headingLevelSwitch;
    }
    
    // 启动
    log.debug('🚀 准备初始化...');
    
    if (document.readyState === 'loading') {
        log.debug('等待 DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
            log.debug('DOMContentLoaded 触发');
            init();
        });
    } else {
        log.debug('DOM 已就绪，延迟启动...');
        setTimeout(() => {
            log.debug('开始初始化...');
            init();
        }, 1000);
    }
    
})();

// 立即执行标记
console.log('[标题级别切换] ✓ v1.0 脚本文件已加载');

