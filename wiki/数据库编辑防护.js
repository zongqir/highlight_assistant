/**
 * 思源笔记数据库编辑防护脚本 v2.1
 * 
 * 功能：在编辑数据库单元格时，禁止自动排序和过滤，防止内容意外被移动或隐藏
 * 
 * 使用方法：
 * 1. 将此 JS 代码添加到 思源笔记 - 设置 - 外观 - 代码片段 - JS 片段中
 * 2. 重启思源笔记或刷新页面即可生效
 * 
 * 更新日志：
 * v2.1 - 优化性能和用户体验
 *      - 添加调试模式开关
 *      - 添加拦截统计
 *      - 优化日志输出
 *      - 添加配置选项
 * v2.0 - 完全重写拦截逻辑，采用更精准的编辑状态检测
 */

(function() {
    'use strict';
    
    // ==================== 配置选项 ====================
    const CONFIG = {
        debugMode: false,              // 是否启用详细调试日志
        showNotification: false,       // 是否显示拦截提示
        editDelay: 2000,              // 编辑后保持保护的时间（毫秒）
        focusOutDelay: 500,           // 失去焦点后保持保护的时间（毫秒）
        renderDelay: 500,             // 视图渲染延迟时间（毫秒）
    };
    
    // 全局启用/禁用状态（从 localStorage 读取）
    let globalEnabled = localStorage.getItem('dbProtection_enabled') !== 'false'; // 默认启用
    
    // 检测是否为移动端
    const isMobile = () => {
        return window.siyuan?.mobile !== undefined || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    
    // ==================== 全局状态 ====================
    let isEditingDatabase = false;
    let isEditingProtyle = false;
    let editingTimeout = null;
    let lastOperationType = null;
    
    // 统计信息
    const stats = {
        blockedSorts: 0,
        blockedFilters: 0,
        delayedRenders: 0,
        startTime: Date.now()
    };
    
    // ==================== 日志工具 ====================
    const log = {
        info: (msg, ...args) => console.log(`[数据库编辑防护] ${msg}`, ...args),
        warn: (msg, ...args) => console.warn(`[数据库编辑防护] ${msg}`, ...args),
        error: (msg, ...args) => console.error(`[数据库编辑防护] ${msg}`, ...args),
        debug: (msg, ...args) => {
            if (CONFIG.debugMode) {
                console.log(`[数据库编辑防护 DEBUG] ${msg}`, ...args);
            }
        }
    };
    
    log.info('v2.2 脚本开始加载...');
    
    /**
     * 设置编辑状态
     */
    function setEditingState(type, value) {
        if (type === 'database') {
            isEditingDatabase = value;
            log.debug(value ? '🔒 数据库编辑模式已启用' : '🔓 数据库编辑模式已关闭');
        } else if (type === 'protyle') {
            isEditingProtyle = value;
            log.debug(value ? '🔒 编辑器编辑模式已启用' : '🔓 编辑器编辑模式已关闭');
        }
    }
    
    /**
     * 延迟重置编辑状态（防抖）
     */
    function delayResetEditingState(type, delay = 1000) {
        if (editingTimeout) {
            clearTimeout(editingTimeout);
        }
        editingTimeout = setTimeout(() => {
            setEditingState(type, false);
        }, delay);
    }
    
    /**
     * 监听数据库单元格的编辑事件
     */
    function monitorDatabaseEditing() {
        // 监听所有的 focusin 事件
        document.addEventListener('focusin', (e) => {
            const target = e.target;
            
            // 排除下拉菜单和面板（单选/多选）
            if (target.closest('.av__panel, .b3-menu, .b3-select, .protyle-util')) {
                return;
            }
            
            // 检查是否在数据库区域内
            const avCell = target.closest('.av__cell, .av__calc');
            if (avCell) {
                setEditingState('database', true);
                return;
            }
            
            // 检查是否在编辑器内
            const protyleWysiwyg = target.closest('.protyle-wysiwyg');
            if (protyleWysiwyg || target.getAttribute('contenteditable') === 'true') {
                setEditingState('protyle', true);
                return;
            }
        }, true);
        
        // 监听所有的 input 事件
        document.addEventListener('input', (e) => {
            const target = e.target;
            
            // 排除下拉菜单和面板
            if (target.closest('.av__panel, .b3-menu, .b3-select, .protyle-util')) {
                return;
            }
            
            // 检查是否在数据库区域内输入
            const avCell = target.closest('.av__cell, .av__calc, .av');
            if (avCell) {
                setEditingState('database', true);
                delayResetEditingState('database', CONFIG.editDelay);
                return;
            }
            
            // 检查是否在编辑器内输入
            const protyleWysiwyg = target.closest('.protyle-wysiwyg');
            if (protyleWysiwyg) {
                setEditingState('protyle', true);
                delayResetEditingState('protyle', CONFIG.editDelay);
                return;
            }
        }, true);
        
        // 监听所有的 click 事件（点击数据库单元格）
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // 排除下拉菜单、面板的点击（不触发编辑状态）
            if (target.closest('.av__panel, .b3-menu, .b3-select, .protyle-util')) {
                // 点击选项只是操作，不改变编辑状态
                // 如果已经在编辑中，保持编辑状态，延迟渲染
                return;
            }
            
            // 点击数据库单元格
            const avCell = target.closest('.av__cell');
            if (avCell && !avCell.classList.contains('av__cell--header')) {
                setEditingState('database', true);
                delayResetEditingState('database', CONFIG.editDelay);
                return;
            }
        }, true);
        
        // 监听 focusout 事件
        document.addEventListener('focusout', () => {
            // 延迟重置状态，给后续操作留时间
            delayResetEditingState('database', CONFIG.focusOutDelay);
            delayResetEditingState('protyle', CONFIG.focusOutDelay);
        }, true);
        
        // 监听键盘事件（在数据库中输入）
        document.addEventListener('keydown', (e) => {
            const target = e.target;
            const avCell = target.closest('.av__cell, .av__calc, .av');
            if (avCell) {
                setEditingState('database', true);
                delayResetEditingState('database', CONFIG.editDelay);
            }
        }, true);
        
        log.info('✓ 编辑状态监听器已启动');
    }
    
    /**
     * 拦截排序和过滤请求
     */
    function interceptRequests() {
        const originalFetch = window.fetch;
        
        window.fetch = function(...args) {
            const [url, options] = args;
            
            // 调试：记录所有 API 请求
            log.debug('📡 API请求:', url);
            
            // 拦截数据库视图渲染请求（检查全局开关）
            if (globalEnabled && url && url.includes('/api/av/renderAttributeView') && (isEditingDatabase || isEditingProtyle)) {
                // 如果是插入操作，立即渲染
                if (lastOperationType === 'insert') {
                    log.debug('ℹ️ 检测到插入操作，允许立即渲染');
                    lastOperationType = null;
                    return originalFetch.apply(this, args);
                }
                
                // 如果不是更新操作（可能是其他操作如添加表格等），也立即渲染
                if (lastOperationType !== 'update') {
                    log.debug('ℹ️ 非更新操作，允许立即渲染');
                    lastOperationType = null;
                    return originalFetch.apply(this, args);
                }
                
                // 所有单元格更新操作（文本、单选、多选等）都延迟渲染
                stats.delayedRenders++;
                log.debug('⚠️ 延迟渲染视图（单元格编辑中，包括单选/多选）');
                
                return new Promise((resolve) => {
                    const executeRender = () => {
                        log.debug('✅ 编辑完成，执行视图渲染');
                        lastOperationType = null;
                        originalFetch.apply(this, args).then(resolve);
                    };
                    
                    const checkAndExecute = () => {
                        if (!isEditingDatabase && !isEditingProtyle) {
                            executeRender();
                        } else {
                            log.debug('⏳ 仍在编辑中，继续等待...');
                            setTimeout(checkAndExecute, CONFIG.renderDelay);
                        }
                    };
                    
                    setTimeout(checkAndExecute, CONFIG.renderDelay);
                });
            }
            
            // 拦截 transactions API
            if (url && url.includes('/api/transactions') && options && options.body) {
                log.debug('🔍 检测到 transactions 请求');
                log.debug('当前编辑状态:', { isEditingDatabase, isEditingProtyle });
                
                try {
                    const body = JSON.parse(options.body);
                    log.debug('📦 请求体:', body);
                    
                    if (body.transactions && Array.isArray(body.transactions)) {
                        log.debug(`发现 ${body.transactions.length} 个 transaction`);
                        
                        let hasBlocked = false;
                        const filteredTransactions = [];
                        
                        body.transactions.forEach((transaction, tIndex) => {
                            if (!transaction.doOperations || !Array.isArray(transaction.doOperations)) {
                                filteredTransactions.push(transaction);
                                return;
                            }
                            
                            log.debug(`Transaction ${tIndex} 包含 ${transaction.doOperations.length} 个操作`);
                            
                            // 详细调试模式下才打印所有操作
                            if (CONFIG.debugMode) {
                                log.debug('========== 操作列表 START ==========');
                                try {
                                    log.debug('原始数组:', JSON.stringify(transaction.doOperations, null, 2));
                                } catch(e) {
                                    log.error('JSON序列化失败:', e);
                                }
                            }
                            
                            // 记录操作类型（优先级：insert > update > 其他）
                            let foundInsert = false;
                            let foundUpdate = false;
                            
                            for (let i = 0; i < transaction.doOperations.length; i++) {
                                const op = transaction.doOperations[i];
                                log.debug(`操作 #${i}: ${op.action}`);
                                
                                // 插入类操作（优先级最高）
                                if (op.action === 'insertAttrViewBlock' || 
                                    op.action === 'appendAttrViewBlock' || 
                                    op.action === 'insert' ||
                                    op.action === 'addAttrViewCol' ||
                                    op.action === 'addAttrViewView') {
                                    foundInsert = true;
                                }
                                // 所有单元格更新操作（包括文本、单选、多选等）
                                else if (op.action === 'updateAttrViewCell') {
                                    foundUpdate = true;
                                }
                            }
                            
                            // 设置操作类型（插入 > 更新 > 其他）
                            if (foundInsert) {
                                lastOperationType = 'insert';
                            } else if (foundUpdate) {
                                lastOperationType = 'update'; // 所有更新操作（包括单选/多选）都延迟
                            } else {
                                lastOperationType = 'other'; // 其他操作
                            }
                            
                            if (CONFIG.debugMode) {
                                log.debug('========== 操作列表 END ==========');
                                log.debug('最后操作类型:', lastOperationType);
                            }
                            
                            const filteredOps = transaction.doOperations.filter((op, opIndex) => {
                                // 检查全局开关，如果正在编辑数据库或编辑器，阻止排序和过滤操作
                                if (globalEnabled && (isEditingDatabase || isEditingProtyle) && 
                                    (op.action === 'setAttrViewSorts' || op.action === 'setAttrViewFilters')) {
                                    
                                    // 更新统计
                                    if (op.action === 'setAttrViewSorts') {
                                        stats.blockedSorts++;
                                    } else if (op.action === 'setAttrViewFilters') {
                                        stats.blockedFilters++;
                                    }
                                    
                                    log.warn(`⛔ 已阻止 ${op.action}（编辑中）`);
                                    hasBlocked = true;
                                    
                                    // 显示提示（如果启用）
                                    if (CONFIG.showNotification && window.siyuan && window.siyuan.showMessage) {
                                        window.siyuan.showMessage('⚠️ 编辑中，已暂停排序/过滤', 3000, 'info');
                                    }
                                    
                                    return false;
                                }
                                log.debug(`✓ 保留操作 ${opIndex}: ${op.action}`);
                                return true;
                            });
                            
                            if (filteredOps.length > 0) {
                                filteredTransactions.push({
                                    ...transaction,
                                    doOperations: filteredOps
                                });
                            }
                        });
                        
                        // 如果所有操作都被过滤，返回空成功响应
                        if (filteredTransactions.length === 0 && hasBlocked) {
                            log.debug('⏭️ 请求已被完全拦截');
                            return Promise.resolve(new Response(JSON.stringify({
                                code: 0,
                                msg: '',
                                data: [{doOperations: []}]
                            }), {
                                status: 200,
                                headers: {'Content-Type': 'application/json'}
                            }));
                        }
                        
                        // 更新请求体
                        if (hasBlocked) {
                            log.debug('✂️ 已过滤操作，更新请求体');
                            body.transactions = filteredTransactions;
                            options.body = JSON.stringify(body);
                        }
                    }
                } catch (e) {
                    log.error('❌ 解析请求失败:', e);
                }
            }
            
            return originalFetch.apply(this, args);
        };
        
        log.info('✓ 请求拦截器已注入');
    }
    
    /**
     * 创建UI开关按钮
     */
    function createToggleButton() {
        // 查找数据库工具栏
        const observer = new MutationObserver((mutations) => {
            // 查找所有数据库视图头部
            document.querySelectorAll('.av__header').forEach((header) => {
                // 检查是否已经添加过按钮
                if (header.querySelector('.db-protection-toggle')) {
                    return;
                }
                
                // 找到工具栏按钮区域（在搜索按钮旁边）
                const searchBtn = header.querySelector('[data-type="av-search-icon"]');
                if (!searchBtn) return;
                
                // 创建开关按钮
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'block__icon ariaLabel db-protection-toggle';
                toggleBtn.setAttribute('data-position', '8south');
                
                // 移动端使用简化的提示（因为长按才能看到）
                const mobileMode = isMobile();
                toggleBtn.setAttribute('aria-label', globalEnabled 
                    ? (mobileMode ? '🔒 锁定排序（已启用）' : '🔒 编辑时锁定排序/过滤（已启用）\n点击关闭：允许编辑时自动排序')
                    : (mobileMode ? '🔓 正常排序' : '🔓 编辑时自动排序/过滤（正常模式）\n点击启用：编辑时锁定排序'));
                toggleBtn.style.marginRight = '4px';
                
                // 设置图标和颜色
                const updateButtonStyle = () => {
                    toggleBtn.innerHTML = globalEnabled 
                        ? '<svg><use xlink:href="#iconLock"></use></svg>'  // 锁定图标
                        : '<svg><use xlink:href="#iconUnlock"></use></svg>'; // 解锁图标
                    toggleBtn.style.color = globalEnabled ? '#4CAF50' : '#999'; // 绿色=启用，灰色=禁用
                    toggleBtn.setAttribute('aria-label', globalEnabled 
                        ? (mobileMode ? '🔒 锁定排序（已启用）' : '🔒 编辑时锁定排序/过滤（已启用）\n点击关闭：允许编辑时自动排序')
                        : (mobileMode ? '🔓 正常排序' : '🔓 编辑时自动排序/过滤（正常模式）\n点击启用：编辑时锁定排序'));
                };
                
                updateButtonStyle();
                
                // 点击事件
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // 切换状态
                    globalEnabled = !globalEnabled;
                    
                    // 保存到 localStorage
                    localStorage.setItem('dbProtection_enabled', String(globalEnabled));
                    
                    // 更新按钮样式
                    updateButtonStyle();
                    
                    // 更新所有按钮（因为可能有多个数据库视图）
                    document.querySelectorAll('.db-protection-toggle').forEach(btn => {
                        if (btn !== toggleBtn) {
                            btn.innerHTML = toggleBtn.innerHTML;
                            btn.style.color = toggleBtn.style.color;
                            btn.setAttribute('aria-label', toggleBtn.getAttribute('aria-label'));
                        }
                    });
                    
                    // 显示提示（更详细的说明）
                    if (window.siyuan && window.siyuan.showMessage) {
                        const message = globalEnabled 
                            ? '🔒 已启用：编辑单元格时不会自动排序/过滤（内容不会被移走）' 
                            : '🔓 已关闭：编辑单元格时会自动排序/过滤（恢复正常行为）';
                        window.siyuan.showMessage(message, 3000, globalEnabled ? 'info' : 'error');
                    }
                    
                    log.info(globalEnabled ? '✅ 保护已启用' : '❌ 保护已禁用');
                });
                
                // 插入到搜索按钮之前
                searchBtn.parentElement.insertBefore(toggleBtn, searchBtn);
                searchBtn.parentElement.insertBefore(document.createElement('div').cloneNode(), searchBtn).className = 'fn__space';
            });
        });
        
        // 开始观察DOM变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        log.info('✓ UI开关按钮已创建');
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
        
        // 启动监听
        monitorDatabaseEditing();
        
        // 拦截请求
        interceptRequests();
        
        // 创建UI开关
        createToggleButton();
        
        log.info('✅ 启动成功！');
        log.info(`📱 运行环境：${isMobile() ? '移动端' : '桌面端'}`);
        log.info(`📌 当前状态：${globalEnabled ? '🔒 已启用 - 编辑时锁定排序/过滤' : '🔓 已禁用 - 编辑时正常排序/过滤'}`);
        log.info(`💡 提示：可在数据库工具栏点击锁图标切换${isMobile() ? '（长按查看提示）' : ''}`);
        
        // 暴露全局接口
        window.siyuanDbProtection = {
            version: '2.2',
            get enabled() { return globalEnabled; },
            get isMobile() { return isMobile(); },
            config: CONFIG,
            
            // 状态查询
            getState: () => ({
                globalEnabled,
                isMobile: isMobile(),
                isEditingDatabase,
                isEditingProtyle,
                lastOperationType
            }),
            
            // 统计信息
            getStats: () => ({
                ...stats,
                uptime: Math.floor((Date.now() - stats.startTime) / 1000),
                totalBlocked: stats.blockedSorts + stats.blockedFilters
            }),
            
            // 全局开关控制
            toggle: () => {
                globalEnabled = !globalEnabled;
                localStorage.setItem('dbProtection_enabled', String(globalEnabled));
                
                // 更新所有UI按钮
                document.querySelectorAll('.db-protection-toggle').forEach(btn => {
                    btn.innerHTML = globalEnabled 
                        ? '<svg><use xlink:href="#iconLock"></use></svg>' 
                        : '<svg><use xlink:href="#iconUnlock"></use></svg>';
                    btn.style.color = globalEnabled ? '#4CAF50' : '#999';
                    btn.setAttribute('aria-label', globalEnabled 
                        ? '🔒 编辑时锁定排序/过滤（已启用）\n点击关闭：允许编辑时自动排序' 
                        : '🔓 编辑时自动排序/过滤（正常模式）\n点击启用：编辑时锁定排序');
                });
                
                log.info(globalEnabled 
                    ? '✅ 已启用：编辑单元格时锁定排序/过滤' 
                    : '❌ 已禁用：编辑单元格时自动排序/过滤');
                return globalEnabled;
            },
            
            // 编辑状态控制（已废弃，保留用于兼容）
            enable: () => setEditingState('database', true),
            disable: () => {
                setEditingState('database', false);
                setEditingState('protyle', false);
            },
            
            // 配置功能
            enableDebug: () => {
                CONFIG.debugMode = true;
                log.info('✓ 调试模式已启用');
            },
            disableDebug: () => {
                CONFIG.debugMode = false;
                log.info('✓ 调试模式已关闭');
            },
            toggleNotification: () => {
                CONFIG.showNotification = !CONFIG.showNotification;
                log.info(`✓ 通知提示已${CONFIG.showNotification ? '启用' : '关闭'}`);
            },
            
            // 统计重置
            resetStats: () => {
                stats.blockedSorts = 0;
                stats.blockedFilters = 0;
                stats.delayedRenders = 0;
                stats.startTime = Date.now();
                log.info('✓ 统计数据已重置');
            },
            
            // 帮助信息
            help: () => {
                const mobile = isMobile();
                console.log(`
╔══════════════════════════════════════════════════════════╗
║     思源笔记数据库编辑防护 v2.2 - 使用帮助               ║
╠══════════════════════════════════════════════════════════╣
║ 🎯 功能说明：                                             ║
║  🔒 启用时：编辑单元格时锁定排序/过滤                   ║
║            防止编辑中的行被移走或过滤隐藏               ║
║  📝 保护范围：文本、单选、多选、数字等所有字段           ║
║  ⏱️  完成编辑后 0.5 秒自动应用排序/过滤                  ║
║  ✅ 智能识别：添加新行/列等操作立即显示                  ║
║  🔓 禁用时：恢复默认行为（编辑时自动排序/过滤）         ║
║  📱 当前环境：${mobile ? '移动端 ✓' : '桌面端 ✓'}                                     ║
║                                                           ║
║ 📊 查询命令：                                             ║
║  .enabled         - 查看是否启用（true/false）            ║
║  .isMobile        - 查看是否为移动端                      ║
║  .getState()      - 查看当前编辑状态                      ║
║  .getStats()      - 查看拦截统计                          ║
║  .config          - 查看配置选项                          ║
║                                                           ║
║ 🎛️  全局开关：                                            ║
║  .toggle()        - 切换启用/禁用                         ║
║  💡 推荐：在数据库工具栏点击锁图标切换                   ║
${mobile ? '║     移动端：长按图标可查看提示                         ║' : ''}
║                                                           ║
║ 🔧 调试命令：                                             ║
║  .enableDebug()   - 启用详细日志                          ║
║  .disableDebug()  - 关闭详细日志                          ║
║  .toggleNotification() - 切换拦截提示                     ║
║                                                           ║
║ 📈 其他命令：                                             ║
║  .resetStats()    - 重置统计数据                          ║
║  .help()          - 显示此帮助                            ║
╚══════════════════════════════════════════════════════════╝
                `);
            }
        };
        
        // 简化访问
        window.dbp = window.siyuanDbProtection;
    }
    
    // 启动
    log.debug('🚀 准备初始化...');
    log.debug('document.readyState:', document.readyState);
    
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
console.log('[数据库编辑防护] ✓ v2.1 脚本文件已加载');

