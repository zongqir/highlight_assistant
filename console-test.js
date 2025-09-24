/**
 * 直接在思源控制台运行的测试代码
 * 复制粘贴到F12控制台中执行
 */

console.log('🚀 开始事件测试...');

let testCounter = 0;
let lastSelection = '';

// 方案1: 测试所有可能的事件
function testAllEvents() {
    console.log('📝 注册所有事件监听器...');
    
    // touchstart
    document.addEventListener('touchstart', function(e) {
        testCounter++;
        alert(`测试${testCounter}: touchstart 事件触发！`);
        console.log('✅ touchstart 工作');
    }, true);
    
    // touchend  
    document.addEventListener('touchend', function(e) {
        testCounter++;
        alert(`测试${testCounter}: touchend 事件触发！`);
        console.log('✅ touchend 工作');
    }, true);
    
    // selectionchange
    document.addEventListener('selectionchange', function(e) {
        testCounter++;
        alert(`测试${testCounter}: selectionchange 事件触发！`);
        console.log('✅ selectionchange 工作');
    }, true);
    
    // mouseup
    document.addEventListener('mouseup', function(e) {
        testCounter++;
        alert(`测试${testCounter}: mouseup 事件触发！`);
        console.log('✅ mouseup 工作');
    }, true);
    
    // click
    document.addEventListener('click', function(e) {
        testCounter++;
        alert(`测试${testCounter}: click 事件触发！`);
        console.log('✅ click 工作');
    }, true);
    
    alert('✅ 所有事件监听器已注册！请在编辑器中选择文本测试。');
}

// 方案2: 轮询检查选择状态（最暴力的方法）
function startPollingTest() {
    console.log('🔄 开始轮询测试...');
    alert('🔄 开始轮询测试，每500ms检查一次选择状态');
    
    setInterval(function() {
        const selection = window.getSelection();
        const currentText = selection ? selection.toString().trim() : '';
        
        if (currentText && currentText !== lastSelection) {
            lastSelection = currentText;
            alert('🎯 轮询检测到文本选择: ' + currentText.substring(0, 30));
            console.log('🎯 轮询检测到选择:', currentText);
            
            // 检查是否在protyle中
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const element = range.startContainer.nodeType === Node.TEXT_NODE ? 
                    range.startContainer.parentElement : range.startContainer;
                
                let inProtyle = false;
                let current = element;
                for (let i = 0; i < 10 && current; i++) {
                    if (current.classList && current.classList.contains('protyle-wysiwyg')) {
                        inProtyle = true;
                        break;
                    }
                    current = current.parentElement;
                }
                
                if (inProtyle) {
                    alert('✅ 在protyle编辑器中选择了文本！这个方法有效！');
                    console.log('✅ 在protyle中选择了文本:', currentText);
                }
            }
        } else if (!currentText && lastSelection) {
            lastSelection = '';
            console.log('❌ 选择已清除');
        }
    }, 500);
}

// 方案3: 测试DOM变化监听
function testMutationObserver() {
    console.log('👁️ 测试DOM变化监听...');
    alert('👁️ 开始监听DOM变化...');
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes') {
                alert('🔄 DOM属性变化: ' + mutation.attributeName);
                console.log('DOM变化:', mutation);
            }
        });
    });
    
    // 监听整个document的变化
    observer.observe(document, {
        attributes: true,
        childList: true,
        subtree: true
    });
}

// 方案4: 直接hook选择API
function hookSelectionAPI() {
    console.log('🎣 Hook选择API...');
    
    const originalAddRange = Selection.prototype.addRange;
    Selection.prototype.addRange = function(range) {
        alert('🎯 Selection.addRange 被调用！');
        console.log('Selection.addRange 调用:', range);
        return originalAddRange.call(this, range);
    };
    
    const originalRemoveAllRanges = Selection.prototype.removeAllRanges;
    Selection.prototype.removeAllRanges = function() {
        alert('🗑️ Selection.removeAllRanges 被调用！');
        console.log('Selection.removeAllRanges 调用');
        return originalRemoveAllRanges.call(this);
    };
    
    alert('✅ Selection API已被hook！');
}

// 主测试函数
function runAllTests() {
    alert('🧪 开始运行所有测试方法...');
    
    console.log('=== 思源手机版事件测试 ===');
    
    // 1. 测试所有事件
    testAllEvents();
    
    // 2. 延迟启动轮询（给用户时间看alert）
    setTimeout(function() {
        if (confirm('是否启动轮询测试？（会每500ms检查一次选择状态）')) {
            startPollingTest();
        }
    }, 2000);
    
    // 3. Hook API
    if (confirm('是否Hook选择API？')) {
        hookSelectionAPI();
    }
    
    alert('🎯 请在编辑器中选择文本，观察哪个方法能触发alert！');
}

// 提供简单的启动方式
window.runEventTest = runAllTests;
window.startPolling = startPollingTest;
window.testEvents = testAllEvents;

console.log('✅ 测试代码已加载！');
console.log('📝 使用方式：');
console.log('  runEventTest() - 运行所有测试');
console.log('  startPolling() - 只启动轮询测试');  
console.log('  testEvents() - 只测试事件监听');

alert('✅ 测试代码已加载！\n\n使用方法：\n1. runEventTest() - 运行所有测试\n2. startPolling() - 轮询检查选择\n3. testEvents() - 事件监听测试\n\n请在控制台输入以上命令执行！');

