/**
 * 思源笔记数据库编辑防护脚本 v2.3
 * 
 * 功能：在编辑数据库单元格时，禁止自动排序和过滤，防止内容意外被移动或隐藏
 * 
 * 使用方法：
 * 1. 将此 JS 代码添加到 思源笔记 - 设置 - 外观 - 代码片段 - JS 片段中
 * 2. 重启思源笔记或刷新页面即可生效
 * 3. 在屏幕右下角可看到浮动的锁按钮（点击切换，可拖动）
 * 
 * 更新日志：
 * v2.3 - 全平台浮动按钮支持
 *      - 移动端和桌面端都使用浮动按钮
 *      - 支持触摸和鼠标拖动
 *      - 按钮位置可自定义并记忆
 *      - 只在有数据库时显示按钮
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
    
    log.info('v2.3 脚本开始加载...');
    
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
     * 创建UI开关按钮（统一使用浮动按钮）
     */
    function createToggleButton() {
        // 所有平台都使用相同的浮动按钮
        createFloatingButton();
        
        log.info('✓ UI开关按钮已创建');
    }
    
    /**
     * 创建浮动按钮（支持移动端和桌面端）
     */
    function createFloatingButton() {
        log.info('🎯 开始创建浮动按钮...');
        
        // 避免重复创建
        if (document.getElementById('db-protection-floating-btn')) {
            log.warn('浮动按钮已存在，跳过创建');
                    return;
                }
                
        // 创建浮动按钮容器
        const floatingBtn = document.createElement('div');
        floatingBtn.id = 'db-protection-floating-btn';
        floatingBtn.className = 'db-protection-floating';
        
        log.info('浮动按钮元素已创建，设置样式...');
        
        // 从 localStorage 读取保存的位置，默认位置
        const savedPos = localStorage.getItem('dbProtection_btnPos');
        let btnPos = savedPos ? JSON.parse(savedPos) : { bottom: 160, right: 16 };
        
        // 验证位置是否合理（防止按钮在屏幕外）
        const maxBottom = window.innerHeight - 50; // 按钮至少要有 50px 在屏幕内
        const maxRight = window.innerWidth - 50;
        
        if (btnPos.bottom > maxBottom || btnPos.right > maxRight || btnPos.bottom < 0 || btnPos.right < 0) {
            log.warn(`⚠️  检测到按钮位置异常: bottom=${btnPos.bottom}, right=${btnPos.right}`);
            log.info('🔧 自动重置到默认位置');
            btnPos = { bottom: 160, right: 16 };
            // 清除错误的保存位置
            localStorage.removeItem('dbProtection_btnPos');
        }
        
        // 设置样式（初始可见，后续根据数据库可见性调整）
        floatingBtn.style.cssText = `
            position: fixed;
            bottom: ${btnPos.bottom}px;
            right: ${btnPos.right}px;
            width: 36px;
            height: 36px;
            border-radius: 18px;
            background: ${globalEnabled ? '#4CAF50' : '#999'};
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            cursor: move;
            transition: opacity 0.3s ease, background 0.3s ease, transform 0.15s ease;
            color: white;
            font-size: 18px;
            opacity: 1;
            pointer-events: auto;
            touch-action: none;
        `;
        
        // 设置图标
        const updateFloatingButton = () => {
            floatingBtn.innerHTML = globalEnabled 
                ? '<svg style="width: 20px; height: 20px;"><use xlink:href="#iconLock"></use></svg>'
                : '<svg style="width: 20px; height: 20px;"><use xlink:href="#iconUnlock"></use></svg>';
            floatingBtn.style.background = globalEnabled ? '#4CAF50' : '#999';
        };
        
        updateFloatingButton();
        
        // 拖动功能（支持触摸和鼠标）
        let isDragging = false;
        let isMouseDown = false; // 标记鼠标是否在按钮上按下
        let startX, startY;
        let startTime = 0;
        const CLICK_THRESHOLD = 200; // 200ms内认为是点击
        const MOVE_THRESHOLD = 10; // 移动超过10px认为是拖动
        
        // 处理点击切换状态
        const handleClick = (e) => {
            e.preventDefault();
                    e.stopPropagation();
                    
                    // 切换状态
                    globalEnabled = !globalEnabled;
                    
                    // 保存到 localStorage
                    localStorage.setItem('dbProtection_enabled', String(globalEnabled));
                    
            // 更新浮动按钮
            updateFloatingButton();
            
            // 更新所有按钮
            updateAllButtons();
            
            // 添加点击动画
            floatingBtn.style.transition = 'transform 0.15s ease';
            floatingBtn.style.transform = 'scale(0.85)';
            setTimeout(() => {
                floatingBtn.style.transform = 'scale(1)';
            }, 150);
            
            // 显示提示
                    if (window.siyuan && window.siyuan.showMessage) {
                        const message = globalEnabled 
                    ? '🔒 编辑时锁定排序/过滤' 
                    : '🔓 编辑时正常排序/过滤';
                window.siyuan.showMessage(message, 2000, globalEnabled ? 'info' : 'error');
                    }
                    
                    log.info(globalEnabled ? '✅ 保护已启用' : '❌ 保护已禁用');
        };
        
        // 处理拖动移动
        const handleMove = (clientX, clientY) => {
            const rect = floatingBtn.getBoundingClientRect();
            const newRight = window.innerWidth - clientX - rect.width / 2;
            const newBottom = window.innerHeight - clientY - rect.height / 2;
            
            // 限制边界
            const clampedRight = Math.max(0, Math.min(newRight, window.innerWidth - rect.width));
            const clampedBottom = Math.max(0, Math.min(newBottom, window.innerHeight - rect.height));
            
            floatingBtn.style.right = `${clampedRight}px`;
            floatingBtn.style.bottom = `${clampedBottom}px`;
        };
        
        // 保存位置
        const savePosition = () => {
            const right = parseInt(floatingBtn.style.right);
            const bottom = parseInt(floatingBtn.style.bottom);
            localStorage.setItem('dbProtection_btnPos', JSON.stringify({ bottom, right }));
            log.debug(`浮动按钮位置已保存: bottom=${bottom}, right=${right}`);
        };
        
        // ===== 触摸事件（移动端） =====
        floatingBtn.addEventListener('touchstart', (e) => {
            startTime = Date.now();
            isDragging = false;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            floatingBtn.style.transition = 'none';
        }, { passive: true });
        
        floatingBtn.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const moveX = Math.abs(touch.clientX - startX);
            const moveY = Math.abs(touch.clientY - startY);
            
            if (moveX > MOVE_THRESHOLD || moveY > MOVE_THRESHOLD) {
                isDragging = true;
                e.preventDefault();
                handleMove(touch.clientX, touch.clientY);
            }
        }, { passive: false });
        
        floatingBtn.addEventListener('touchend', (e) => {
            const duration = Date.now() - startTime;
            
            if (!isDragging && duration < CLICK_THRESHOLD) {
                handleClick(e);
            } else if (isDragging) {
                savePosition();
            }
            
            floatingBtn.style.transition = 'background 0.3s ease, transform 0.15s ease';
            isDragging = false;
        }, { passive: false });
        
        // ===== 鼠标事件（桌面端） =====
        floatingBtn.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            startTime = Date.now();
            isDragging = false;
            startX = e.clientX;
            startY = e.clientY;
            floatingBtn.style.transition = 'none';
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return; // 只有在按钮上按下才响应
            
            const moveX = Math.abs(e.clientX - startX);
            const moveY = Math.abs(e.clientY - startY);
            
            if (moveX > MOVE_THRESHOLD || moveY > MOVE_THRESHOLD) {
                isDragging = true;
                handleMove(e.clientX, e.clientY);
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (!isMouseDown) return; // 只有在按钮上按下才响应
            
            const duration = Date.now() - startTime;
            
            if (!isDragging && duration < CLICK_THRESHOLD) {
                handleClick(e);
            } else if (isDragging) {
                savePosition();
            }
            
            floatingBtn.style.transition = 'background 0.3s ease, transform 0.15s ease';
            isDragging = false;
            isMouseDown = false;
            startTime = 0;
        });
        
        // 检查数据库可见性
        let hideTimeout;
        const checkDatabaseVisibility = () => {
            const hasDatabase = document.querySelector('.av__header') !== null;
            
            log.debug(`检查数据库可见性: hasDatabase=${hasDatabase}`);
            
            if (hasDatabase) {
                // 检查是否有可见的数据库
                const hasVisibleDatabase = Array.from(document.querySelectorAll('.av__header')).some(header => {
                    const rect = header.getBoundingClientRect();
                    return rect.top < window.innerHeight && rect.bottom > 0;
                });
                
                log.debug(`可见数据库: ${hasVisibleDatabase}`);
                
                if (hasVisibleDatabase) {
                    floatingBtn.style.opacity = '1';
                    floatingBtn.style.pointerEvents = 'auto';
                    clearTimeout(hideTimeout);
                } else {
                    // 延迟隐藏，避免快速滚动时闪烁
                    hideTimeout = setTimeout(() => {
                        floatingBtn.style.opacity = '0';
                        floatingBtn.style.pointerEvents = 'none';
                    }, 1000);
                }
            } else {
                // 没有数据库，隐藏按钮
                log.debug('页面没有数据库，隐藏按钮');
                floatingBtn.style.opacity = '0';
                floatingBtn.style.pointerEvents = 'none';
            }
        };
        
        // 添加到页面（延迟添加，确保body已加载）
        const addToBody = () => {
            if (document.body) {
                document.body.appendChild(floatingBtn);
                log.info('✓ 浮动按钮已创建并添加到页面');
                log.info(`📍 按钮位置: bottom=${btnPos.bottom}px, right=${btnPos.right}px`);
                
                // 延迟检查，确保DOM已渲染
                setTimeout(() => {
                    checkDatabaseVisibility();
                    log.debug('初始可见性检查完成');
                }, 500);
            } else {
                setTimeout(addToBody, 100);
            }
        };
        
        // 监听滚动和窗口大小变化
        let scrollTimer;
        document.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(checkDatabaseVisibility, 100);
        }, true);
        
        window.addEventListener('resize', checkDatabaseVisibility);
        
        // 监听DOM变化（数据库出现/消失）
        const dbObserver = new MutationObserver(() => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(checkDatabaseVisibility, 200);
        });
        
        dbObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        addToBody();
    }
    
    /**
     * 更新浮动按钮状态（统一逻辑）
     */
    function updateAllButtons() {
        const floatingBtn = document.getElementById('db-protection-floating-btn');
        if (floatingBtn) {
            floatingBtn.innerHTML = globalEnabled 
                ? '<svg style="width: 20px; height: 20px;"><use xlink:href="#iconLock"></use></svg>'
                : '<svg style="width: 20px; height: 20px;"><use xlink:href="#iconUnlock"></use></svg>';
            floatingBtn.style.background = globalEnabled ? '#4CAF50' : '#999';
        }
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
        log.info(`💡 提示：在屏幕右下角查看浮动的锁按钮（圆形，${globalEnabled ? '绿色' : '灰色'}）`);
        log.info(`🖱️  操作：点击切换状态，按住拖动调整位置`);
        log.info(`🔍 如果看不到按钮，请在控制台输入: dbp.showButton()`);
        
        // 暴露全局接口
        window.siyuanDbProtection = {
            version: '2.3',
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
                
                // 更新所有UI按钮（包括浮动按钮）
                updateAllButtons();
                
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
            
            // 显示/调试浮动按钮
            showButton: () => {
                const btn = document.getElementById('db-protection-floating-btn');
                if (btn) {
                    const style = window.getComputedStyle(btn);
                    log.info('✅ 浮动按钮已存在');
                    log.info(`📍 位置: bottom=${btn.style.bottom}, right=${btn.style.right}`);
                    log.info(`👁️  可见性: opacity=${style.opacity}, pointerEvents=${style.pointerEvents}`);
                    log.info(`📏 大小: ${style.width} x ${style.height}`);
                    log.info(`🎨 背景色: ${style.background}`);
                    log.info(`🔢 Z-index: ${style.zIndex}`);
                    
                    // 检查位置是否异常
                    const bottom = parseInt(btn.style.bottom);
                    const right = parseInt(btn.style.right);
                    if (bottom > 800 || right > 500) {
                        log.warn('⚠️  按钮位置异常（可能在屏幕外），建议重置位置');
                        log.info('💡 输入 dbp.resetButtonPosition() 重置到默认位置');
                    }
                    
                    // 强制显示按钮
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'auto';
                    log.info('🔧 已强制显示按钮');
                    
                    return {
                        exists: true,
                        element: btn,
                        position: { bottom: btn.style.bottom, right: btn.style.right },
                        visible: style.opacity === '1',
                        zIndex: style.zIndex
                    };
                } else {
                    log.error('❌ 浮动按钮不存在！');
                    log.info('尝试重新创建按钮...');
                    createFloatingButton();
                    return { exists: false };
                }
            },
            
            // 重置按钮位置
            resetButtonPosition: () => {
                const btn = document.getElementById('db-protection-floating-btn');
                if (btn) {
                    // 清除保存的位置
                    localStorage.removeItem('dbProtection_btnPos');
                    
                    // 重置到默认位置
                    btn.style.bottom = '160px';
                    btn.style.right = '16px';
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'auto';
                    
                    log.info('✅ 按钮位置已重置到默认位置: bottom=160px, right=16px');
                    log.info('💡 现在应该能在屏幕右下角看到按钮了');
                    
                    return { bottom: '160px', right: '16px' };
                } else {
                    log.error('❌ 浮动按钮不存在');
                    return null;
                }
            },
            
            // 帮助信息
            help: () => {
                const mobile = isMobile();
                console.log(`
╔══════════════════════════════════════════════════════════╗
║     思源笔记数据库编辑防护 v2.3 - 使用帮助               ║
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
║  💡 推荐：点击屏幕右下角的浮动锁按钮                     ║
║     （绿色=启用，灰色=禁用，可拖动调整位置）             ║
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
console.log('[数据库编辑防护] ✓ v2.3 脚本文件已加载');

