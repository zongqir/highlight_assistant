/**
 * 高亮助手调试脚本
 * 在思源笔记控制台中运行此脚本来调试问题
 */

console.log('🔧 高亮助手调试脚本启动...');

// 1. 基础环境检查
function checkBasicEnvironment() {
    console.log('\n📋 基础环境检查:');
    console.log('- 用户代理:', navigator.userAgent);
    console.log('- 屏幕尺寸:', `${window.innerWidth}x${window.innerHeight}`);
    console.log('- 是否触摸设备:', 'ontouchstart' in window);
    console.log('- 思源移动端标识:', !!document.querySelector('.fn__mobile'));
    console.log('- 思源桌面端标识:', !!document.querySelector('.fn__desktop'));
    console.log('- 当前URL:', window.location.href);
}

// 2. 检查插件加载状态
function checkPluginStatus() {
    console.log('\n🔌 插件状态检查:');
    
    // 检查全局函数
    const globalFunctions = [
        'testHijack',
        'getAllEditor',
        'highlightAssistant'
    ];
    
    globalFunctions.forEach(funcName => {
        const exists = typeof window[funcName] === 'function';
        console.log(`- ${funcName}: ${exists ? '✅ 可用' : '❌ 不可用'}`);
    });
    
    // 运行testHijack如果可用
    if (typeof window.testHijack === 'function') {
        console.log('\n🧪 运行 testHijack():');
        try {
            window.testHijack();
        } catch (error) {
            console.error('testHijack 执行出错:', error);
        }
    }
}

// 3. 检查编辑器状态
function checkEditorStatus() {
    console.log('\n📝 编辑器状态检查:');
    
    if (typeof window.getAllEditor === 'function') {
        try {
            const editors = window.getAllEditor();
            console.log(`- 编辑器数量: ${editors.length}`);
            
            editors.forEach((editor, i) => {
                console.log(`\n编辑器 ${i}:`);
                console.log('  - hasProtyle:', !!editor.protyle);
                console.log('  - hasToolbar:', !!(editor.protyle?.toolbar));
                console.log('  - hasShowContent:', !!(editor.protyle?.toolbar?.showContent));
                console.log('  - isReadOnly:', editor.protyle?.options?.readonly);
                console.log('  - toolbarKeys:', editor.protyle?.toolbar ? Object.keys(editor.protyle.toolbar) : []);
                
                if (editor.protyle?.toolbar) {
                    const toolbar = editor.protyle.toolbar;
                    console.log('  - toolbar.element:', !!toolbar.element);
                    console.log('  - toolbar.subElement:', !!toolbar.subElement);
                    console.log('  - showContent类型:', typeof toolbar.showContent);
                    console.log('  - showContent是原生:', toolbar.showContent.toString().includes('[native code]'));
                }
            });
        } catch (error) {
            console.error('检查编辑器状态出错:', error);
        }
    } else {
        console.log('❌ getAllEditor 函数不可用');
    }
}

// 4. 检查DOM结构
function checkDOMStructure() {
    console.log('\n🏗️ DOM结构检查:');
    
    // 查找工具栏相关元素
    const toolbarSelectors = [
        '.protyle-toolbar',
        '.keyboard',
        '.fn__flex',
        '[class*="toolbar"]',
        '[class*="keyboard"]',
        '.b3-tooltips',
        '.highlight-assistant-custom-toolbar'
    ];
    
    toolbarSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`✅ 找到 ${elements.length} 个 ${selector} 元素`);
            elements.forEach((el, i) => {
                const rect = el.getBoundingClientRect();
                console.log(`  ${i}: 可见=${rect.width > 0 && rect.height > 0}, 类名=${el.className}`);
            });
        }
    });
}

// 5. 测试文本选择
function testTextSelection() {
    console.log('\n📖 文本选择测试:');
    
    // 查找可选择的文本
    const textSelectors = [
        'p',
        'div[contenteditable]',
        'span',
        'h1, h2, h3, h4, h5, h6',
        '.protyle-wysiwyg p',
        '.protyle-wysiwyg div'
    ];
    
    let textElements = [];
    textSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        textElements.push(...Array.from(elements));
    });
    
    console.log(`- 找到 ${textElements.length} 个可选择的文本元素`);
    
    if (textElements.length > 0) {
        // 选择第一个有文本内容的元素
        const testElement = textElements.find(el => el.textContent && el.textContent.trim().length > 0);
        
        if (testElement) {
            console.log('- 测试元素:', {
                tagName: testElement.tagName,
                className: testElement.className,
                textContent: testElement.textContent.substring(0, 50) + '...'
            });
            
            // 创建选择
            try {
                const range = document.createRange();
                range.selectNodeContents(testElement);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                console.log('✅ 已选择文本，请检查是否出现工具栏');
                console.log('- 选中文本:', selection.toString().substring(0, 30));
                
                // 监听选择变化
                const handleSelectionChange = () => {
                    const sel = window.getSelection();
                    if (sel && sel.toString().trim()) {
                        console.log('📝 检测到选择变化:', sel.toString().substring(0, 30));
                        
                        // 检查是否有工具栏出现
                        setTimeout(() => {
                            const toolbars = document.querySelectorAll('.highlight-assistant-custom-toolbar, [class*="toolbar"]');
                            const visibleToolbars = Array.from(toolbars).filter(tb => 
                                tb.offsetWidth > 0 && tb.offsetHeight > 0
                            );
                            console.log(`🔧 选择后出现 ${visibleToolbars.length} 个可见工具栏`);
                            
                            visibleToolbars.forEach((tb, i) => {
                                console.log(`工具栏 ${i}:`, {
                                    className: tb.className,
                                    children: tb.children.length,
                                    position: {
                                        top: tb.offsetTop,
                                        left: tb.offsetLeft,
                                        width: tb.offsetWidth,
                                        height: tb.offsetHeight
                                    }
                                });
                            });
                        }, 500);
                    }
                };
                
                document.addEventListener('selectionchange', handleSelectionChange);
                console.log('✅ 已添加选择变化监听器');
                
            } catch (error) {
                console.error('创建选择失败:', error);
            }
        } else {
            console.log('❌ 未找到有文本内容的元素');
        }
    }
}

// 6. 检查控制台错误
function checkConsoleErrors() {
    console.log('\n🚨 控制台错误检查:');
    
    // 重写console.error来捕获错误
    const originalError = console.error;
    const errors = [];
    
    console.error = function(...args) {
        errors.push(args.join(' '));
        originalError.apply(console, args);
    };
    
    // 等待一段时间收集错误
    setTimeout(() => {
        if (errors.length > 0) {
            console.log(`- 发现 ${errors.length} 个错误:`);
            errors.forEach((error, i) => {
                console.log(`  ${i + 1}: ${error}`);
            });
        } else {
            console.log('✅ 未发现控制台错误');
        }
        
        // 恢复原始console.error
        console.error = originalError;
    }, 2000);
}

// 7. 运行所有检查
function runAllChecks() {
    console.log('🚀 开始运行所有检查...\n');
    
    checkBasicEnvironment();
    checkPluginStatus();
    checkEditorStatus();
    checkDOMStructure();
    testTextSelection();
    checkConsoleErrors();
    
    console.log('\n✅ 所有检查完成！');
    console.log('💡 请查看上述输出，找出问题所在');
    console.log('💡 如果看到自定义工具栏，说明备用方案正在工作');
}

// 8. 手动测试函数
function manualTest() {
    console.log('\n🧪 手动测试:');
    
    // 清除所有选择
    const selection = window.getSelection();
    if (selection) {
        selection.removeAllRanges();
    }
    
    // 查找第一个段落
    const firstP = document.querySelector('p');
    if (firstP && firstP.textContent.trim()) {
        console.log('选择第一个段落进行测试...');
        
        const range = document.createRange();
        range.selectNodeContents(firstP);
        selection.addRange(range);
        
        console.log('✅ 已选择文本，请等待工具栏出现');
    } else {
        console.log('❌ 未找到可选择的段落');
    }
}

// 自动运行检查
runAllChecks();

// 导出函数供手动调用
window.debugHighlightAssistant = {
    runAllChecks,
    checkBasicEnvironment,
    checkPluginStatus,
    checkEditorStatus,
    checkDOMStructure,
    testTextSelection,
    checkConsoleErrors,
    manualTest
};

console.log('\n💡 可以使用以下函数进行手动测试:');
console.log('- debugHighlightAssistant.runAllChecks() - 运行所有检查');
console.log('- debugHighlightAssistant.manualTest() - 手动测试文本选择');
console.log('- debugHighlightAssistant.checkPluginStatus() - 检查插件状态');
