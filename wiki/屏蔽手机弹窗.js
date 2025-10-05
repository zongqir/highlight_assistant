/**
 * 思源笔记 - 手机端插件弹窗屏蔽脚本 v2.0
 * 
 * 功能：在手机端自动屏蔽/隐藏插件创建的弹窗、对话框和键盘工具栏
 * 
 * 使用方法：
 * 1. 将此 JS 代码添加到 思源笔记 - 设置 - 外观 - 代码片段 - JS 片段中
 * 2. 重启思源笔记或刷新页面即可生效
 * 3. 仅在手机端生效，桌面端不受影响
 * 
 * 工作原理：
 * 1. 检测当前环境是否为移动端（基于 siyuan 源码实现）
 * 2. 拦截手机端键盘工具栏（#keyboardToolbar）的显示
 * 3. 监听插件事件（mobile-keyboard-show/hide）
 * 4. 监听 DOM 变化，自动检测并隐藏插件创建的 UI 元素
 * 5. 支持手动切换启用/禁用
 * 
 * 更新日志：
 * v2.0 - 基于 siyuan 源码重写，精准拦截键盘工具栏和插件UI
 */

(function() {
    'use strict';
    
    // ==================== 配置选项 ====================
    const CONFIG = {
        debugMode: false,              // 是否启用详细调试日志
        autoHideDialogs: true,         // 是否自动隐藏弹窗
        hideDelay: 100,                // 隐藏延迟（毫秒）
        mobileOnly: true,              // 是否仅在移动端生效
        showNotification: true,        // 是否显示拦截通知
        
        // ⚠️ 屏蔽模式（默认全部关闭，避免误伤）
        blockKeyboardToolbar: false,   // 屏蔽键盘工具栏（#keyboardToolbar）
        blockPluginToolbar: false,     // 屏蔽插件自定义工具栏（protyle-util）
        blockPluginDialogs: false,     // 屏蔽插件弹窗
        blockPluginButtons: false,     // 屏蔽插件按钮（侧边栏、顶栏、菜单）
        
        // 弹窗特征选择器（根据实际需要调整）
        dialogSelectors: [
            // 高 z-index 的固定定位元素（通常是弹窗遮罩）
            '[style*="z-index: 99999"]',
            '[style*="z-index:99999"]',
            
            // 常见的弹窗遮罩特征
            'div[style*="position: fixed"][style*="background: rgba"]',
            'div[style*="position:fixed"][style*="backdrop-filter"]',
            
            // 思源笔记原生对话框
            '.b3-dialog--open',
            '.b3-dialog',
            
            // 自定义对话框（根据插件实际情况）
            '[data-type="dialog"]',
            '[data-type="popup"]',
            
            // 根据样式特征识别
            'div[style*="position: fixed"][style*="top: 0"][style*="left: 0"][style*="width: 100vw"]',
            
            // 手机端编辑器工具栏（protyle-util）
            '.protyle-util:not(.fn__none)',
            '.protyle-util--mobile:not(.fn__none)',
        ],
        
        // 插件按钮选择器
        pluginButtonSelectors: [
            // ⭐ 手机端菜单中的"插件"选项（最主要）
            '#menuPlugin',
            
            // 侧边栏的插件标签页按钮
            '[data-type="sidebar-plugin-tab"]',
            'svg[data-type="sidebar-plugin-tab"]',
            '.toolbar__icon[data-type="sidebar-plugin-tab"]',
            
            // 顶部栏的插件按钮（ID格式：plugin_插件名_序号）
            '[id^="plugin_"]',
            
            // 侧边栏插件面板
            '[data-type="sidebar-plugin"]',
        ],
        
        // 插件菜单选择器（弹窗本身）
        pluginMenuSelectors: [
            // 插件菜单弹窗（通过 data-name 识别）
            '.b3-menu[data-name="topBarPlugin"]',
        ],
        
        // 白名单：不应该被屏蔽的元素（根据需要添加）
        whitelistSelectors: [
            '.toolbar',                   // 顶部工具栏
            '.b3-menu',                   // 菜单
            '.av__panel',                 // 数据库面板
            '[data-type="wnd"]',          // 窗口
            '.protyle-wysiwyg',           // 编辑器
            '.protyle-title',             // 标题
            '.protyle-toolbar',           // 编辑器工具栏（可能是你的高亮工具栏）
        ],
    };
    
    // 全局状态（默认禁用，避免误伤用户插件）
    let enabled = localStorage.getItem('mobileDialogBlocker_enabled') === 'true'; // 默认禁用
    let observer = null;
    
    // 统计信息
    const stats = {
        hiddenDialogs: 0,
        lastHiddenTime: null,
        startTime: Date.now()
    };
    
    // ==================== 日志工具 ====================
    const log = {
        info: (msg, ...args) => console.log(`[📱弹窗屏蔽] ${msg}`, ...args),
        warn: (msg, ...args) => console.warn(`[📱弹窗屏蔽] ${msg}`, ...args),
        error: (msg, ...args) => console.error(`[📱弹窗屏蔽] ${msg}`, ...args),
        debug: (msg, ...args) => {
            if (CONFIG.debugMode) {
                console.log(`[📱弹窗屏蔽 DEBUG] ${msg}`, ...args);
            }
        }
    };
    
    log.info('v1.0 脚本开始加载...');
    
    /**
     * 检测是否为移动端
     */
    function isMobile() {
        // 方法1: 检测 window.siyuan.mobile
        if (window.siyuan?.mobile !== undefined) {
            return true;
        }
        
        // 方法2: 检测 User Agent
        const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 方法3: 检测屏幕宽度
        const mobileWidth = window.innerWidth <= 768;
        
        // 方法4: 检测触摸支持
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // 方法5: 检测思源的移动端类名
        const siyuanMobile = document.querySelector('.fn__mobile') !== null || 
                            document.body.classList.contains('body--mobile');
        
        const result = mobileUA || mobileWidth || (hasTouch && siyuanMobile);
        
        log.debug('移动端检测:', {
            siyuanMobile: window.siyuan?.mobile,
            mobileUA,
            mobileWidth,
            hasTouch,
            siyuanMobile,
            result
        });
        
        return result;
    }
    
    /**
     * 检查元素是否在白名单中
     */
    function isWhitelisted(element) {
        for (const selector of CONFIG.whitelistSelectors) {
            if (element.matches(selector) || element.closest(selector)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 检查元素是否为弹窗
     */
    function isDialog(element) {
        // 必须是元素节点
        if (element.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }
        
        // 检查白名单
        if (isWhitelisted(element)) {
            log.debug('元素在白名单中，跳过:', element);
            return false;
        }
        
        // 检查选择器匹配
        for (const selector of CONFIG.dialogSelectors) {
            try {
                if (element.matches(selector)) {
                    log.debug('匹配到弹窗选择器:', selector, element);
                    return true;
                }
            } catch (e) {
                log.debug('选择器匹配失败:', selector, e);
            }
        }
        
        // 额外检查：样式特征
        const style = window.getComputedStyle(element);
        const isFixedOverlay = 
            style.position === 'fixed' &&
            parseInt(style.zIndex) >= 1000 &&
            (style.width === '100vw' || element.offsetWidth >= window.innerWidth * 0.8) &&
            (style.height === '100vh' || element.offsetHeight >= window.innerHeight * 0.8);
        
        if (isFixedOverlay) {
            log.debug('匹配到固定遮罩层特征:', element);
            return true;
        }
        
        return false;
    }
    
    /**
     * 隐藏弹窗元素
     */
    function hideDialog(element) {
        if (!enabled || !CONFIG.autoHideDialogs) {
            return false;
        }
        
        try {
            // 检查是否已经隐藏
            if (element.style.display === 'none' || element.hasAttribute('data-mobile-dialog-hidden')) {
                return false;
            }
            
            log.info('🚫 检测到弹窗，准备隐藏:', element);
            
            // 标记元素
            element.setAttribute('data-mobile-dialog-hidden', 'true');
            
            // 保存原始样式
            if (!element.hasAttribute('data-original-display')) {
                element.setAttribute('data-original-display', element.style.display || '');
            }
            
            // 隐藏元素（使用多种方式确保隐藏）
            element.style.setProperty('display', 'none', 'important');
            element.style.setProperty('visibility', 'hidden', 'important');
            element.style.setProperty('opacity', '0', 'important');
            element.style.setProperty('pointer-events', 'none', 'important');
            
            // 更新统计
            stats.hiddenDialogs++;
            stats.lastHiddenTime = new Date().toISOString();
            
            // 显示通知
            if (CONFIG.showNotification && window.siyuan?.showMessage) {
                window.siyuan.showMessage('🚫 已屏蔽弹窗', 1500, 'info');
            }
            
            log.info('✅ 弹窗已隐藏');
            
            return true;
        } catch (e) {
            log.error('隐藏弹窗失败:', e);
            return false;
        }
    }
    
    /**
     * 显示被隐藏的弹窗
     */
    function showDialog(element) {
        try {
            if (!element.hasAttribute('data-mobile-dialog-hidden')) {
                return false;
            }
            
            log.info('👁️ 恢复弹窗显示:', element);
            
            // 恢复原始样式
            const originalDisplay = element.getAttribute('data-original-display') || '';
            element.style.display = originalDisplay;
            element.style.visibility = '';
            element.style.opacity = '';
            element.style.pointerEvents = '';
            
            // 移除标记
            element.removeAttribute('data-mobile-dialog-hidden');
            element.removeAttribute('data-original-display');
            
            log.info('✅ 弹窗已恢复显示');
            
            return true;
        } catch (e) {
            log.error('恢复弹窗显示失败:', e);
            return false;
        }
    }
    
    /**
     * 扫描并处理所有弹窗
     */
    function scanAndHideDialogs() {
        log.debug('开始扫描弹窗...');
        
        CONFIG.dialogSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                log.debug(`选择器 "${selector}" 找到 ${elements.length} 个元素`);
                
                elements.forEach(element => {
                    if (isDialog(element)) {
                        setTimeout(() => hideDialog(element), CONFIG.hideDelay);
                    }
                });
            } catch (e) {
                log.debug(`选择器 "${selector}" 执行失败:`, e);
            }
        });
        
        // 额外扫描：所有高 z-index 的固定定位元素
        const allFixed = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
        log.debug(`找到 ${allFixed.length} 个固定定位元素`);
        
        allFixed.forEach(element => {
            const zIndex = parseInt(window.getComputedStyle(element).zIndex);
            if (zIndex >= 1000 && isDialog(element)) {
                setTimeout(() => hideDialog(element), CONFIG.hideDelay);
            }
        });
    }
    
    /**
     * 监听 DOM 变化
     */
    function startObserver() {
        if (observer) {
            log.debug('观察器已存在，先停止');
            observer.disconnect();
        }
        
        observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检查新增节点本身
                        if (isDialog(node)) {
                            setTimeout(() => hideDialog(node), CONFIG.hideDelay);
                        }
                        
                        // 检查新增节点的子元素
                        if (node.querySelectorAll) {
                            CONFIG.dialogSelectors.forEach(selector => {
                                try {
                                    const dialogs = node.querySelectorAll(selector);
                                    dialogs.forEach(dialog => {
                                        if (isDialog(dialog)) {
                                            setTimeout(() => hideDialog(dialog), CONFIG.hideDelay);
                                        }
                                    });
                                } catch (e) {
                                    // 忽略选择器错误
                                }
                            });
                        }
                    }
                });
            });
        });
        
        // 开始观察
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        log.info('✅ DOM 观察器已启动');
    }
    
    /**
     * 停止观察器
     */
    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
            log.info('✅ DOM 观察器已停止');
        }
    }
    
    /**
     * 恢复所有被隐藏的弹窗
     */
    function restoreAllDialogs() {
        const hiddenDialogs = document.querySelectorAll('[data-mobile-dialog-hidden]');
        log.info(`恢复 ${hiddenDialogs.length} 个被隐藏的弹窗`);
        
        hiddenDialogs.forEach(dialog => {
            showDialog(dialog);
        });
    }
    
    /**
     * 添加全局样式（增强隐藏效果）
     */
    function addGlobalStyle() {
        const style = document.createElement('style');
        style.id = 'mobile-dialog-blocker-style';
        style.textContent = `
            /* 手机端弹窗屏蔽 - 增强隐藏效果 */
            [data-mobile-dialog-hidden] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
            }
        `;
        document.head.appendChild(style);
        log.info('✅ 全局样式已添加');
    }
    
    /**
     * 移除全局样式
     */
    function removeGlobalStyle() {
        const style = document.getElementById('mobile-dialog-blocker-style');
        if (style) {
            style.remove();
            log.info('✅ 全局样式已移除');
        }
    }
    
    /**
     * 拦截键盘工具栏
     */
    function blockKeyboardToolbar() {
        if (!CONFIG.blockKeyboardToolbar || !enabled) {
            return;
        }
        
        log.debug('开始拦截键盘工具栏...');
        
        // 方法1: 直接隐藏 #keyboardToolbar
        const keyboardToolbar = document.getElementById('keyboardToolbar');
        if (keyboardToolbar) {
            keyboardToolbar.classList.add('fn__none');
            keyboardToolbar.style.display = 'none';
            log.info('✅ 已隐藏键盘工具栏');
        }
        
        // 方法2: 拦截 showKeyboardToolbar 函数
        if (window.showKeyboardToolbar) {
            const originalShow = window.showKeyboardToolbar;
            window.showKeyboardToolbar = function(...args) {
                if (enabled && CONFIG.blockKeyboardToolbar) {
                    log.info('🚫 已拦截 showKeyboardToolbar() 调用');
                    stats.hiddenDialogs++;
                    return;
                }
                return originalShow.apply(this, args);
            };
            log.info('✅ 已拦截 showKeyboardToolbar() 函数');
        }
        
        // 方法3: 监听插件事件
        try {
            const currentEditor = window.siyuan?.mobile?.editor || window.siyuan?.mobile?.popEditor;
            if (currentEditor?.protyle?.app?.plugins) {
                currentEditor.protyle.app.plugins.forEach(plugin => {
                    plugin.eventBus.on('mobile-keyboard-show', () => {
                        if (enabled && CONFIG.blockKeyboardToolbar) {
                            log.info('🚫 检测到 mobile-keyboard-show 事件，隐藏工具栏');
                            const toolbar = document.getElementById('keyboardToolbar');
                            if (toolbar) {
                                toolbar.classList.add('fn__none');
                                toolbar.style.display = 'none';
                            }
                            stats.hiddenDialogs++;
                        }
                    });
                });
                log.info('✅ 已监听插件事件: mobile-keyboard-show');
            }
        } catch (e) {
            log.debug('监听插件事件失败:', e);
        }
    }
    
    /**
     * 拦截 protyle-util（编辑器工具栏）
     */
    function blockProtyleUtil() {
        if (!CONFIG.blockPluginToolbar || !enabled) {
            return;
        }
        
        log.debug('开始拦截 protyle-util...');
        
        // 隐藏所有 protyle-util
        const utils = document.querySelectorAll('.protyle-util:not(.fn__none), .protyle-util--mobile:not(.fn__none)');
        utils.forEach(util => {
            if (!isWhitelisted(util)) {
                hideDialog(util);
                log.info('✅ 已隐藏 protyle-util');
            }
        });
    }
    
    /**
     * 拦截插件按钮和菜单
     */
    function blockPluginButtons() {
        if (!CONFIG.blockPluginButtons || !enabled) {
            return;
        }
        
        log.debug('开始拦截插件按钮和菜单...');
        
        let hiddenCount = 0;
        
        // 1. 隐藏插件按钮（如 #menuPlugin）
        CONFIG.pluginButtonSelectors.forEach(selector => {
            try {
                const buttons = document.querySelectorAll(selector);
                buttons.forEach(button => {
                    if (!isWhitelisted(button)) {
                        button.style.display = 'none';
                        button.classList.add('fn__none');
                        button.setAttribute('data-plugin-button-hidden', 'true');
                        hiddenCount++;
                        log.debug(`已隐藏插件按钮: ${selector}`);
                    }
                });
            } catch (e) {
                log.debug(`选择器失败: ${selector}`, e);
            }
        });
        
        // 2. 隐藏插件菜单弹窗（如果已经弹出）
        CONFIG.pluginMenuSelectors.forEach(selector => {
            try {
                const menus = document.querySelectorAll(selector);
                menus.forEach(menu => {
                    if (!isWhitelisted(menu)) {
                        menu.style.display = 'none';
                        menu.classList.add('fn__none');
                        menu.setAttribute('data-plugin-menu-hidden', 'true');
                        hiddenCount++;
                        log.debug(`已隐藏插件菜单: ${selector}`);
                    }
                });
            } catch (e) {
                log.debug(`选择器失败: ${selector}`, e);
            }
        });
        
        if (hiddenCount > 0) {
            log.info(`✅ 已隐藏 ${hiddenCount} 个插件UI元素`);
            stats.hiddenDialogs += hiddenCount;
        }
    }
    
    /**
     * 恢复插件按钮和菜单
     */
    function restorePluginButtons() {
        log.debug('恢复插件按钮和菜单...');
        
        // 恢复按钮
        const hiddenButtons = document.querySelectorAll('[data-plugin-button-hidden]');
        hiddenButtons.forEach(button => {
            button.style.display = '';
            button.classList.remove('fn__none');
            button.removeAttribute('data-plugin-button-hidden');
        });
        
        // 恢复菜单
        const hiddenMenus = document.querySelectorAll('[data-plugin-menu-hidden]');
        hiddenMenus.forEach(menu => {
            menu.style.display = '';
            menu.classList.remove('fn__none');
            menu.removeAttribute('data-plugin-menu-hidden');
        });
        
        const total = hiddenButtons.length + hiddenMenus.length;
        if (total > 0) {
            log.info(`✅ 已恢复 ${total} 个插件UI元素`);
        }
    }
    
    /**
     * 初始化
     */
    function init() {
        // 检查是否为移动端
        if (CONFIG.mobileOnly && !isMobile()) {
            log.info('⏭️ 非移动端环境，脚本不生效');
            return;
        }
        
        log.info('✅ 移动端环境检测通过');
        
        // 等待思源 API 加载
        if (typeof window.siyuan === 'undefined') {
            log.debug('⏳ 等待思源 API 加载...');
            setTimeout(init, 300);
            return;
        }
        
        // 添加全局样式
        addGlobalStyle();
        
        // 初始化功能
        if (enabled) {
            log.info('🔍 开始初始化...');
            
            // 延迟执行，确保页面加载完成
            setTimeout(() => {
                // 拦截键盘工具栏
                blockKeyboardToolbar();
                
                // 拦截 protyle-util
                blockProtyleUtil();
                
                // 拦截插件按钮
                blockPluginButtons();
                
                // 扫描并隐藏弹窗
                scanAndHideDialogs();
                
                // 启动观察器
                startObserver();
            }, 1000);
        }
        
        log.info('✅ 初始化完成！');
        log.info(`📱 运行环境：移动端`);
        log.info(`📌 当前状态：${enabled ? '✅ 已启用' : '❌ 已禁用'}`);
        log.info(`🔧 屏蔽模式：`);
        log.info(`   - 键盘工具栏: ${CONFIG.blockKeyboardToolbar ? '✅' : '❌'}`);
        log.info(`   - 插件工具栏: ${CONFIG.blockPluginToolbar ? '✅' : '❌'}`);
        log.info(`   - 插件按钮: ${CONFIG.blockPluginButtons ? '✅' : '❌'}`);
        log.info(`   - 插件弹窗: ${CONFIG.blockPluginDialogs ? '✅' : '❌'}`);
        log.info(`💡 提示：在控制台输入 mdb.help() 查看使用帮助`);
        
        // 暴露全局接口
        window.mobileDialogBlocker = {
            version: '2.0',
            config: CONFIG,
            
            // 状态查询
            get enabled() { return enabled; },
            get isMobile() { return isMobile(); },
            getStats: () => ({
                ...stats,
                uptime: Math.floor((Date.now() - stats.startTime) / 1000),
            }),
            
            // 控制功能
            enable: () => {
                enabled = true;
                localStorage.setItem('mobileDialogBlocker_enabled', 'true');
                blockKeyboardToolbar();
                blockProtyleUtil();
                blockPluginButtons();
                scanAndHideDialogs();
                startObserver();
                log.info('✅ 已启用弹窗屏蔽');
                return true;
            },
            
            disable: () => {
                enabled = false;
                localStorage.setItem('mobileDialogBlocker_enabled', 'false');
                stopObserver();
                restoreAllDialogs();
                restorePluginButtons();
                // 恢复键盘工具栏
                const keyboardToolbar = document.getElementById('keyboardToolbar');
                if (keyboardToolbar) {
                    keyboardToolbar.classList.remove('fn__none');
                    keyboardToolbar.style.display = '';
                }
                log.info('❌ 已禁用弹窗屏蔽');
                return false;
            },
            
            toggle: () => {
                if (enabled) {
                    return window.mobileDialogBlocker.disable();
                } else {
                    return window.mobileDialogBlocker.enable();
                }
            },
            
            // 调试功能
            enableDebug: () => {
                CONFIG.debugMode = true;
                log.info('✅ 调试模式已启用');
            },
            
            disableDebug: () => {
                CONFIG.debugMode = false;
                log.info('❌ 调试模式已关闭');
            },
            
            // 手动控制
            scanNow: () => {
                log.info('🔍 手动扫描...');
                blockKeyboardToolbar();
                blockProtyleUtil();
                blockPluginButtons();
                scanAndHideDialogs();
            },
            
            restoreAll: () => {
                log.info('♻️ 恢复所有...');
                restoreAllDialogs();
                restorePluginButtons();
                // 恢复键盘工具栏
                const keyboardToolbar = document.getElementById('keyboardToolbar');
                if (keyboardToolbar) {
                    keyboardToolbar.classList.remove('fn__none');
                    keyboardToolbar.style.display = '';
                }
            },
            
            // 单独控制
            blockKeyboard: () => {
                CONFIG.blockKeyboardToolbar = true;
                blockKeyboardToolbar();
                log.info('✅ 已启用键盘工具栏屏蔽');
            },
            
            unblockKeyboard: () => {
                CONFIG.blockKeyboardToolbar = false;
                const keyboardToolbar = document.getElementById('keyboardToolbar');
                if (keyboardToolbar) {
                    keyboardToolbar.classList.remove('fn__none');
                    keyboardToolbar.style.display = '';
                }
                log.info('❌ 已禁用键盘工具栏屏蔽');
            },
            
            blockPlugins: () => {
                CONFIG.blockPluginButtons = true;
                blockPluginButtons();
                log.info('✅ 已启用插件按钮屏蔽');
            },
            
            unblockPlugins: () => {
                CONFIG.blockPluginButtons = false;
                restorePluginButtons();
                log.info('❌ 已禁用插件按钮屏蔽');
            },
            
            // 统计功能
            resetStats: () => {
                stats.hiddenDialogs = 0;
                stats.lastHiddenTime = null;
                stats.startTime = Date.now();
                log.info('✅ 统计数据已重置');
            },
            
            // 🔍 调试工具：查看页面上的所有工具栏
            inspectToolbars: () => {
                console.log('\n🔍 ========== 页面工具栏检查 ==========\n');
                
                // 1. 键盘工具栏
                const keyboardToolbar = document.getElementById('keyboardToolbar');
                console.log('1️⃣ 键盘工具栏 (#keyboardToolbar):');
                if (keyboardToolbar) {
                    console.log('  ✅ 存在');
                    console.log('  - 可见:', !keyboardToolbar.classList.contains('fn__none'));
                    console.log('  - display:', keyboardToolbar.style.display);
                    console.log('  - HTML:', keyboardToolbar.outerHTML.substring(0, 200) + '...');
                    console.log('  - 元素:', keyboardToolbar);
                } else {
                    console.log('  ❌ 不存在');
                }
                console.log('');
                
                // 2. 菜单中的插件按钮
                const menuPlugin = document.getElementById('menuPlugin');
                console.log('2️⃣ 菜单中的插件选项 (#menuPlugin):');
                if (menuPlugin) {
                    console.log('  ✅ 存在');
                    console.log('  - 可见:', !menuPlugin.classList.contains('fn__none'));
                    console.log('  - display:', menuPlugin.style.display);
                    console.log('  - 元素:', menuPlugin);
                } else {
                    console.log('  ❌ 不存在');
                }
                console.log('');
                
                // 3. 插件菜单弹窗
                const pluginMenu = document.querySelector('.b3-menu[data-name="topBarPlugin"]');
                console.log('3️⃣ 插件菜单弹窗 ([data-name="topBarPlugin"]):');
                if (pluginMenu) {
                    console.log('  ✅ 存在（菜单已打开）');
                    console.log('  - 可见:', !pluginMenu.classList.contains('fn__none'));
                    console.log('  - display:', pluginMenu.style.display);
                    console.log('  - 元素:', pluginMenu);
                } else {
                    console.log('  ❌ 不存在（菜单未打开）');
                    console.log('  💡 提示：点击菜单中的"插件"选项后再检查');
                }
                console.log('');
                
                // 4. protyle-util（编辑器工具栏）
                const protyleUtils = document.querySelectorAll('.protyle-util, .protyle-util--mobile');
                console.log(`4️⃣ 编辑器工具栏 (.protyle-util): ${protyleUtils.length} 个`);
                protyleUtils.forEach((util, i) => {
                    console.log(`  [${i}]:`);
                    console.log('    - 可见:', !util.classList.contains('fn__none'));
                    console.log('    - 类名:', util.className);
                    console.log('    - 元素:', util);
                });
                console.log('');
                
                // 5. protyle-toolbar（可能是高亮工具栏）
                const protyleToolbars = document.querySelectorAll('.protyle-toolbar');
                console.log(`5️⃣ Protyle工具栏 (.protyle-toolbar): ${protyleToolbars.length} 个`);
                protyleToolbars.forEach((toolbar, i) => {
                    console.log(`  [${i}]:`);
                    console.log('    - 可见:', !toolbar.classList.contains('fn__none'));
                    console.log('    - 类名:', toolbar.className);
                    console.log('    - 元素:', toolbar);
                });
                console.log('');
                
                // 6. 所有带 toolbar 类名的元素
                const allToolbars = document.querySelectorAll('[class*="toolbar"]');
                console.log(`6️⃣ 所有包含 toolbar 的元素: ${allToolbars.length} 个`);
                const toolbarSummary = {};
                allToolbars.forEach(toolbar => {
                    const className = toolbar.className;
                    toolbarSummary[className] = (toolbarSummary[className] || 0) + 1;
                });
                Object.keys(toolbarSummary).forEach(className => {
                    console.log(`  - ${className}: ${toolbarSummary[className]} 个`);
                });
                console.log('');
                
                console.log('🔍 ========== 检查完成 ==========\n');
                console.log('💡 提示：');
                console.log('   1. 查看上面的输出，找到你想屏蔽的元素');
                console.log('   2. 使用 mdb.config.blockXXX = true 来启用对应的屏蔽');
                console.log('   3. 使用 mdb.scanNow() 重新扫描');
                console.log('   4. ⭐ 要屏蔽"插件"菜单，使用: mdb.blockPlugins()');
                console.log('');
            },
            
            // 🎯 根据选择器查找元素
            findElements: (selector) => {
                console.log(`\n🔍 查找元素: ${selector}\n`);
                try {
                    const elements = document.querySelectorAll(selector);
                    console.log(`找到 ${elements.length} 个元素:`);
                    elements.forEach((el, i) => {
                        console.log(`\n[${i}]:`);
                        console.log('  - 标签:', el.tagName);
                        console.log('  - 类名:', el.className);
                        console.log('  - ID:', el.id);
                        console.log('  - 可见:', !el.classList.contains('fn__none'));
                        console.log('  - HTML:', el.outerHTML.substring(0, 150) + '...');
                        console.log('  - 元素:', el);
                    });
                    return elements;
                } catch (e) {
                    console.error('❌ 选择器错误:', e);
                    return null;
                }
            },
            
            // 帮助信息
            help: () => {
                console.log(`
╔═══════════════════════════════════════════════════════════╗
║     手机端插件弹窗屏蔽器 v2.0 - 使用帮助                  ║
╠═══════════════════════════════════════════════════════════╣
║ 🎯 功能说明：                                              ║
║  • 屏蔽手机端键盘工具栏（#keyboardToolbar）              ║
║  • 屏蔽插件自定义工具栏（protyle-util）                   ║
║  • 屏蔽插件按钮（侧边栏、顶栏、菜单中的插件）           ║
║  • 屏蔽插件创建的弹窗和对话框                            ║
║  • 仅在移动端生效，桌面端不受影响                        ║
║  • 基于 siyuan 源码实现，精准拦截                        ║
║                                                            ║
║ 📊 查询命令：                                              ║
║  .enabled         - 查看是否启用（true/false）             ║
║  .isMobile        - 查看是否为移动端                       ║
║  .getStats()      - 查看拦截统计                           ║
║  .config          - 查看配置选项                           ║
║                                                            ║
║ 🎛️  控制命令：                                             ║
║  .enable()        - 启用所有屏蔽功能                       ║
║  .disable()       - 禁用所有屏蔽功能                       ║
║  .toggle()        - 切换启用/禁用                          ║
║  .blockKeyboard() - 单独屏蔽键盘工具栏 ⭐                  ║
║  .unblockKeyboard() - 恢复键盘工具栏                       ║
║  .blockPlugins()  - 单独屏蔽插件按钮 ⭐⭐                  ║
║  .unblockPlugins() - 恢复插件按钮                          ║
║                                                            ║
║ 🔧 调试命令：                                              ║
║  .enableDebug()   - 启用详细日志                           ║
║  .disableDebug()  - 关闭详细日志                           ║
║  .scanNow()       - 手动扫描并屏蔽                         ║
║  .restoreAll()    - 恢复所有被隐藏的元素                   ║
║                                                            ║
║ 📈 其他命令：                                              ║
║  .resetStats()    - 重置统计数据                           ║
║  .help()          - 显示此帮助                             ║
║                                                            ║
║ 🔍 调试工具（重要）：                                      ║
║  .inspectToolbars() - 🔥 检查页面所有工具栏                ║
║  .findElements('选择器') - 查找指定元素                    ║
║                                                            ║
║ 💡 配置说明：                                              ║
║  config.blockKeyboardToolbar  - 是否屏蔽键盘工具栏         ║
║  config.blockPluginToolbar    - 是否屏蔽插件工具栏         ║
║  config.blockPluginButtons    - 是否屏蔽插件按钮 ⭐⭐      ║
║  config.blockPluginDialogs    - 是否屏蔽插件弹窗           ║
╚═══════════════════════════════════════════════════════════╝
                `);
            }
        };
        
        // 简化访问
        window.mdb = window.mobileDialogBlocker;
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
        }, 500);
    }
    
})();

// 立即执行标记
console.log('[📱弹窗屏蔽] ✓ v2.0 脚本文件已加载（基于 siyuan 源码实现）');

