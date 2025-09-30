/**
 * 简化的电脑版测试脚本
 * 专门测试工具栏劫持问题
 */

console.log('🔧 电脑版工具栏劫持测试...');

// 等待页面加载
setTimeout(() => {
    console.log('\n1. 检查环境:');
    console.log('- 是否桌面端:', document.querySelector('.fn__desktop') !== null);
    console.log('- 屏幕宽度:', window.innerWidth);
    console.log('- 用户代理:', navigator.userAgent.includes('Mobile') ? '移动端' : '桌面端');
    
    console.log('\n2. 检查编辑器:');
    if (typeof window.getAllEditor === 'function') {
        const editors = window.getAllEditor();
        console.log(`- 编辑器数量: ${editors.length}`);
        
        editors.forEach((editor, i) => {
            const hasToolbar = !!(editor.protyle?.toolbar?.showContent);
            console.log(`- 编辑器${i}: ${hasToolbar ? '✅ 有工具栏' : '❌ 无工具栏'}`);
            
            if (hasToolbar) {
                const showContent = editor.protyle.toolbar.showContent;
                console.log(`  - showContent类型: ${typeof showContent}`);
                console.log(`  - 是原生方法: ${showContent.toString().includes('[native code]')}`);
            }
        });
    }
    
    console.log('\n3. 测试文本选择:');
    
    // 查找可选择的文本
    const textElements = document.querySelectorAll('p, div[contenteditable], .protyle-wysiwyg p');
    console.log(`- 找到 ${textElements.length} 个文本元素`);
    
    if (textElements.length > 0) {
        const testElement = textElements[0];
        console.log(`- 测试元素: ${testElement.tagName} - ${testElement.textContent.substring(0, 30)}...`);
        
        // 创建选择
        const range = document.createRange();
        range.selectNodeContents(testElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        console.log('✅ 已选择文本');
        
        // 等待工具栏出现
        setTimeout(() => {
            const toolbars = document.querySelectorAll('[class*="toolbar"], .highlight-assistant-custom-toolbar');
            console.log(`- 找到 ${toolbars.length} 个工具栏元素`);
            
            toolbars.forEach((toolbar, i) => {
                const rect = toolbar.getBoundingClientRect();
                console.log(`- 工具栏${i}: ${rect.width > 0 ? '可见' : '隐藏'} - ${toolbar.className}`);
            });
            
            if (toolbars.length === 0) {
                console.log('❌ 没有工具栏出现，可能劫持失败');
                console.log('💡 请检查控制台是否有错误信息');
            } else {
                console.log('✅ 工具栏出现，劫持可能成功');
            }
        }, 1000);
    }
    
    console.log('\n4. 检查插件状态:');
    if (typeof window.testHijack === 'function') {
        console.log('✅ testHijack 函数可用');
        try {
            window.testHijack();
        } catch (error) {
            console.error('❌ testHijack 执行失败:', error);
        }
    } else {
        console.log('❌ testHijack 函数不可用');
    }
    
}, 2000);

console.log('💡 测试将在2秒后开始...');
