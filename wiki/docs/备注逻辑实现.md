# 备注功能 API 交互文档

> 本文档详细说明思源笔记备注(Memo)功能的API交互流程，便于迁移到其他模块。

## 目录

- [核心API](#核心api)
- [备注的创建流程](#备注的创建流程)
- [备注的编辑流程](#备注的编辑流程)
- [备注的删除流程](#备注的删除流程)
- [关键数据结构](#关键数据结构)
- [完整代码示例](#完整代码示例)

---

## 核心API

### 1. 获取块内容 (`getBlockKramdown`)

**API端点**: `/api/block/getBlockKramdown`

**请求方法**: POST

**请求参数**:
```typescript
{
  id: string  // 块ID
}
```

**响应格式**:
```typescript
{
  code: number,      // 0表示成功
  msg: string,       // 消息
  data: {
    id: string,
    kramdown: string // Kramdown格式的内容
  }
}
```

**使用示例**:
```typescript
const response = await fetch('/api/block/getBlockKramdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: blockId })
});

const result = await response.json();
if (result.code === 0) {
    const kramdown = result.data.kramdown;
    // 处理内容...
}
```

---

### 2. 更新块内容 (`updateBlock`)

**API端点**: `/api/block/updateBlock`

**请求方法**: POST

**请求参数**:
```typescript
{
  id: string,        // 块ID
  data: string,      // 新的内容
  dataType: string   // 数据类型: "markdown" 或 "dom"
}
```

**响应格式**:
```typescript
{
  code: number,      // 0表示成功
  msg: string,       // 消息
  data: Array<{      // 操作结果
    doOperations: Array<any>
  }>
}
```

**使用示例**:
```typescript
const payload = {
    id: blockId,
    data: newContent,
    dataType: "markdown"
};

const response = await fetch('/api/block/updateBlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
});

const result = await response.json();
if (result.code === 0) {
    console.log('更新成功');
}
```

---

## 备注的创建流程

### 1. 获取用户选择

```typescript
// 获取选中的文本
const selectedText = range.toString().trim();
if (!selectedText) {
    return; // 没有选中文本
}
```

### 2. 找到所在的块元素

```typescript
// 查找包含选择的块元素
function findBlockElement(node: Node): HTMLElement | null {
    let current = node;
    
    while (current && current !== document) {
        if (current.nodeType === Node.ELEMENT_NODE && 
            (current as HTMLElement).getAttribute("data-node-id")) {
            
            const element = current as HTMLElement;
            const className = element.className || '';
            
            // 排除容器类元素
            if (!className.includes('protyle-content') && 
                !className.includes('protyle-wysiwyg')) {
                return element;
            }
        }
        current = current.parentNode!;
    }
    
    return null;
}

const blockElement = findBlockElement(range.startContainer);
const blockId = blockElement.getAttribute("data-node-id");
```

### 3. 显示备注输入框

```typescript
// 弹出输入框让用户输入备注内容
const memoText = await showMemoInput();
if (!memoText) {
    return; // 用户取消
}
```

### 4. 创建备注元素

```typescript
// 创建备注span元素（思源的标准格式）
const memoSpan = document.createElement("span");
memoSpan.setAttribute("data-type", "inline-memo");
memoSpan.setAttribute("data-inline-memo-content", memoText);
memoSpan.textContent = selectedText;

// DOM操作 - 替换选中内容
range.deleteContents();
range.insertNode(memoSpan);
```

**关键点**:
- 使用 `data-type="inline-memo"` 标记备注类型
- 备注内容存储在 `data-inline-memo-content` 属性中
- 保持选中文本作为span的显示内容

### 5. 提取块内容

```typescript
async function extractMarkdownFromBlock(blockElement: HTMLElement): Promise<string> {
    const blockId = blockElement.getAttribute("data-node-id");
    
    // 方案1: 通过API获取原始Markdown
    const response = await fetch('/api/block/getBlockKramdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: blockId })
    });
    
    const result = await response.json();
    if (result.code === 0 && result.data && result.data.kramdown) {
        const originalMarkdown = result.data.kramdown;
        // 合并当前DOM修改到Markdown中
        return mergeHighlightIntoMarkdown(originalMarkdown, blockElement);
    }
    
    // 方案2: 从DOM提取（备用）
    // 查找contenteditable的div
    let contentDiv = blockElement.querySelector('div[contenteditable]');
    if (contentDiv) {
        return contentDiv.innerHTML;
    }
    
    return blockElement.innerHTML;
}
```

### 6. 更新时间戳

```typescript
// 更新块的时间戳
const timestamp = new Date().getTime().toString().substring(0, 10);
blockElement.setAttribute("updated", timestamp);
```

### 7. 保存到思源

```typescript
// 提取并保存内容
const newContent = await extractMarkdownFromBlock(blockElement);

const updateResult = await fetch('/api/block/updateBlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        id: blockId,
        data: newContent,
        dataType: "markdown"
    })
});

const result = await updateResult.json();

if (result.code === 0) {
    console.log('✅ 备注添加成功');
    // 恢复只读状态
    restoreReadOnlyState(blockId);
} else {
    console.error('❌ 备注添加失败');
    // 恢复原始内容
    blockElement.innerHTML = oldContent;
}
```

### 8. 恢复只读状态

```typescript
function restoreReadOnlyState(blockId: string): void {
    const blockElement = document.querySelector(`[data-node-id="${blockId}"]`);
    if (!blockElement) return;
    
    // 将所有可编辑的div设置为只读
    const editableDivs = blockElement.querySelectorAll('div[contenteditable="true"]');
    editableDivs.forEach(div => {
        div.setAttribute('contenteditable', 'false');
    });
    
    // 移除编辑状态的class
    blockElement.classList.remove('protyle-wysiwyg__block--editing');
}
```

---

## 备注的编辑流程

### 1. 拦截备注点击事件

```typescript
// 监听点击事件
document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // 检查是否点击了备注元素
    if (target && target.getAttribute('data-type') === 'inline-memo') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // 显示自定义备注编辑框
        showCustomMemoDialog(target);
        
        return false;
    }
}, true); // 使用捕获阶段拦截
```

### 2. 获取现有备注内容

```typescript
const existingContent = memoElement.getAttribute('data-inline-memo-content') || '';
const selectedText = memoElement.textContent || '';
```

### 3. 显示编辑界面

```typescript
const memoText = await showMemoInput(selectedText, existingContent);

if (memoText !== null) {
    if (memoText === '__DELETE_MEMO__') {
        // 删除备注
        deleteMemoFromElement(memoElement);
    } else {
        // 更新备注内容
        memoElement.setAttribute('data-inline-memo-content', memoText);
        saveMemoToSiYuan(memoElement, memoText);
    }
}
```

### 4. 保存更新

```typescript
async function saveMemoToSiYuan(memoElement: HTMLElement, memoText: string): Promise<void> {
    // 找到包含备注的块
    const blockElement = findBlockElement(memoElement);
    const blockId = blockElement.getAttribute("data-node-id");
    
    // 提取并保存内容
    const newContent = await extractMarkdownFromBlock(blockElement);
    
    const response = await fetch('/api/block/updateBlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: blockId,
            data: newContent,
            dataType: "markdown"
        })
    });
    
    const result = await response.json();
    
    if (result.code === 0) {
        console.log('✅ 备注保存成功');
        restoreReadOnlyState(blockId);
    }
}
```

---

## 备注的删除流程

### 1. 删除备注元素

```typescript
async function deleteMemoFromElement(memoElement: HTMLElement): Promise<void> {
    // 找到包含备注的块
    const blockElement = findBlockElement(memoElement);
    const blockId = blockElement.getAttribute("data-node-id");
    
    // 保存原始内容用于回滚
    const oldContent = blockElement.innerHTML;
    
    // 将备注元素替换为纯文本
    const textContent = memoElement.textContent || '';
    const textNode = document.createTextNode(textContent);
    memoElement.parentNode?.replaceChild(textNode, memoElement);
    
    // 提取并保存内容
    const newContent = await extractMarkdownFromBlock(blockElement);
    
    const response = await fetch('/api/block/updateBlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: blockId,
            data: newContent,
            dataType: "markdown"
        })
    });
    
    const result = await response.json();
    
    if (result.code === 0) {
        console.log('✅ 备注删除成功');
        restoreReadOnlyState(blockId);
    } else {
        console.error('❌ 备注删除失败');
        // 恢复原始内容
        blockElement.innerHTML = oldContent;
    }
}
```

---

## 关键数据结构

### 备注元素的HTML结构

```html
<span 
    data-type="inline-memo" 
    data-inline-memo-content="这是备注内容">
    被备注的文本
</span>
```

### 块元素的基本结构

```html
<div 
    data-node-id="20231201120000-xxxxxxx" 
    data-type="NodeParagraph" 
    class="p" 
    updated="1701417600">
    <div 
        contenteditable="false" 
        spellcheck="false">
        <!-- 文本内容，包含备注span -->
    </div>
    <div class="protyle-attr" contenteditable="false">​</div>
</div>
```

---

## 完整代码示例

### 完整的备注添加流程

```typescript
class MemoManager {
    private api = {
        updateBlock: async (blockId: string, data: string, dataType: string) => {
            const response = await fetch('/api/block/updateBlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: blockId,
                    data: data,
                    dataType: dataType
                })
            });
            return await response.json();
        },
        
        getBlockKramdown: async (blockId: string) => {
            const response = await fetch('/api/block/getBlockKramdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: blockId })
            });
            return await response.json();
        }
    };
    
    /**
     * 添加备注到选中文本
     */
    async addMemo(range: Range, memoText: string): Promise<boolean> {
        try {
            const selectedText = range.toString().trim();
            if (!selectedText) {
                console.warn('请先选择要添加备注的文本');
                return false;
            }
            
            // 1. 找到块元素
            const blockElement = this.findBlockElement(range.startContainer);
            if (!blockElement) {
                console.warn('未找到目标块元素');
                return false;
            }
            
            const blockId = blockElement.getAttribute("data-node-id");
            if (!blockId) {
                console.warn('未找到块ID');
                return false;
            }
            
            // 2. 保存原始内容用于回滚
            const oldContent = blockElement.innerHTML;
            
            // 3. 创建备注span元素
            const memoSpan = document.createElement("span");
            memoSpan.setAttribute("data-type", "inline-memo");
            memoSpan.setAttribute("data-inline-memo-content", memoText);
            memoSpan.textContent = selectedText;
            
            // 4. DOM操作 - 替换选中内容
            range.deleteContents();
            range.insertNode(memoSpan);
            
            // 5. 更新时间戳
            const timestamp = new Date().getTime().toString().substring(0, 10);
            blockElement.setAttribute("updated", timestamp);
            
            // 6. 提取并保存内容
            const newContent = await this.extractMarkdownFromBlock(blockElement);
            const updateResult = await this.api.updateBlock(blockId, newContent, "markdown");
            
            if (updateResult.code === 0) {
                console.log('✅ 备注添加成功');
                // 7. 恢复只读状态
                setTimeout(() => this.restoreReadOnlyState(blockId), 100);
                return true;
            } else {
                console.error('❌ 备注添加失败');
                // 回滚
                blockElement.innerHTML = oldContent;
                return false;
            }
            
        } catch (error) {
            console.error('添加备注出错:', error);
            return false;
        }
    }
    
    /**
     * 查找块元素
     */
    private findBlockElement(node: Node): HTMLElement | null {
        let current = node;
        
        while (current && current !== document) {
            if (current.nodeType === Node.ELEMENT_NODE && 
                (current as HTMLElement).getAttribute &&
                (current as HTMLElement).getAttribute("data-node-id")) {
                
                const element = current as HTMLElement;
                const className = element.className || '';
                
                // 排除容器类元素
                if (!className.includes('protyle-content') && 
                    !className.includes('protyle-wysiwyg')) {
                    return element;
                }
            }
            current = current.parentNode!;
        }
        
        return null;
    }
    
    /**
     * 从块元素提取markdown内容
     */
    private async extractMarkdownFromBlock(blockElement: HTMLElement): Promise<string> {
        const blockId = blockElement.getAttribute("data-node-id");
        
        if (blockId) {
            try {
                // 通过API获取原始Markdown
                const response = await this.api.getBlockKramdown(blockId);
                
                if (response && response.code === 0 && response.data && response.data.kramdown) {
                    const originalMarkdown = response.data.kramdown;
                    // 合并当前DOM修改
                    return this.mergeHighlightIntoMarkdown(originalMarkdown, blockElement);
                }
            } catch (error) {
                console.warn('API获取失败，使用DOM解析:', error);
            }
        }
        
        // 备用方案：从DOM提取
        let contentDiv = blockElement.querySelector('div[contenteditable]');
        if (contentDiv) {
            return contentDiv.innerHTML;
        }
        
        return blockElement.innerHTML;
    }
    
    /**
     * 合并DOM修改到Markdown
     */
    private mergeHighlightIntoMarkdown(originalMarkdown: string, blockElement: HTMLElement): string {
        // 查找内容区域
        let contentDiv = blockElement.querySelector('div[contenteditable]');
        if (!contentDiv) {
            contentDiv = blockElement.querySelector('div');
        }
        
        if (contentDiv) {
            // 直接返回修改后的HTML（思源支持HTML格式）
            return contentDiv.innerHTML;
        }
        
        return originalMarkdown;
    }
    
    /**
     * 恢复只读状态
     */
    private restoreReadOnlyState(blockId: string): void {
        const blockElement = document.querySelector(`[data-node-id="${blockId}"]`);
        if (!blockElement) return;
        
        // 将所有可编辑的div设置为只读
        const editableDivs = blockElement.querySelectorAll('div[contenteditable="true"]');
        editableDivs.forEach(div => {
            div.setAttribute('contenteditable', 'false');
        });
        
        // 移除编辑状态
        blockElement.classList.remove('protyle-wysiwyg__block--editing');
    }
}

// 使用示例
const memoManager = new MemoManager();

// 获取用户选择
const selection = window.getSelection();
if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const memoText = "这是我的备注内容";
    
    // 添加备注
    await memoManager.addMemo(range, memoText);
}
```

---

## 注意事项

### 1. API调用时序

- **必须先获取原始内容** (`getBlockKramdown`)
- **再进行DOM修改**
- **最后保存更新** (`updateBlock`)

### 2. 错误处理

```typescript
// 保存原始内容用于回滚
const oldContent = blockElement.innerHTML;

try {
    // ... 执行操作
    
    if (result.code !== 0) {
        // 恢复原始内容
        blockElement.innerHTML = oldContent;
    }
} catch (error) {
    // 异常时也要恢复
    blockElement.innerHTML = oldContent;
}
```

### 3. 数据类型

- 使用 `dataType: "markdown"` 时，思源会自动处理HTML标签
- 备注元素的HTML会被保留在Markdown中
- 不需要手动转换为Markdown语法

### 4. 只读模式恢复

```typescript
// 必须在操作完成后恢复只读状态
setTimeout(() => {
    restoreReadOnlyState(blockId);
}, 100);
```

### 5. 跨块选择检测

```typescript
function isCrossBlockSelection(range: Range): boolean {
    const startBlock = findBlockElement(range.startContainer);
    const endBlock = findBlockElement(range.endContainer);
    
    const startBlockId = startBlock?.getAttribute('data-node-id');
    const endBlockId = endBlock?.getAttribute('data-node-id');
    
    return startBlockId !== endBlockId;
}
```

---

## 迁移建议

### 1. 核心功能抽取

可以将以下核心功能抽取为独立模块：

- `MemoManager` - 备注管理器
- `BlockElementFinder` - 块元素查找器
- `ContentExtractor` - 内容提取器
- `APIClient` - API客户端封装

### 2. 配置化

```typescript
interface MemoConfig {
    apiEndpoint: {
        getBlock: string;
        updateBlock: string;
    };
    dataAttributes: {
        memoType: string;
        memoContent: string;
        blockId: string;
    };
    ui: {
        showNativeDialog: boolean;
        customDialogClass: string;
    };
}
```

### 3. 事件系统

```typescript
class MemoEventEmitter {
    on(event: 'memo:created' | 'memo:updated' | 'memo:deleted', handler: Function);
    emit(event: string, data: any);
}

// 使用
memoManager.on('memo:created', (data) => {
    console.log('备注已创建:', data);
});
```

---

## 相关文件

- `src/utils/toolbarHijacker.ts` - 工具栏劫持和备注功能实现
- `src/api.ts` - API封装
- `src/utils/domUtils.ts` - DOM工具函数

---

**文档版本**: 1.0  
**最后更新**: 2024-10-01

