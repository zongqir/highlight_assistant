# 插件使用 setInlineMark 的完整指南

## ✅ 结论：插件**完全可以**直接使用 setInlineMark

### 证据 1: getAllEditor 返回的是完整的 Protyle 对象

```typescript
// siyuan-master/app/src/layout/getAll.ts:18
export const getAllEditor = () => {
    const editors: Protyle[] = [];  // ✅ 返回 Protyle 数组
    // ...
    return editors;
};
```

### 证据 2: Protyle 对象包含 toolbar 属性

```typescript
// 从 siyuan 包导入的类型定义
interface Protyle {
    protyle: IProtyle;
}

interface IProtyle {
    toolbar: Toolbar;  // ✅ Toolbar 实例
    wysiwyg: any;
    // ... 其他属性
}
```

### 证据 3: Toolbar 类有 setInlineMark 方法

```typescript
// siyuan-master/app/src/protyle/toolbar/index.ts:50
export class Toolbar {
    public element: HTMLElement;
    public subElement: HTMLElement;
    public range: Range;
    
    // ✅ setInlineMark 是公开方法
    public setInlineMark(protyle: IProtyle, type: string, action: "range" | "toolbar", textObj?: ITextOption) {
        // 实现代码...
    }
}
```

### 证据 4: 思源核心代码就是这样用的

```typescript
// siyuan-master/app/src/layout/Wnd.ts:540
if (!currentTab.model.editor.protyle.toolbar.range) {
    // ...
}

// siyuan-master/app/src/editor/util.ts:392
editor.editor.protyle.toolbar.range = newRange;
```

---

## 📝 正确的使用方式

### 方式 1: 在工具栏劫持中使用（你的场景）

```typescript
// toolbarHijacker.ts
import { getAllEditor } from "siyuan";

private enhanceToolbar(toolbar: any, range: Range, nodeElement: Element, protyle: any): void {
    const btn = document.createElement('button');
    
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // ✅ 直接调用 setInlineMark
        protyle.toolbar.setInlineMark(protyle, "text", "range", {
            type: "backgroundColor",
            color: "#fff3cd"
        });
        
        // 隐藏工具栏
        this.hideToolbar(toolbar);
        this.clearSelection();
    });
}
```

### 方式 2: 通过 getAllEditor 获取（适合快捷键、菜单等场景）

```typescript
// index.ts
import { Plugin, getAllEditor } from "siyuan";

export default class HighlightPlugin extends Plugin {
    async onload() {
        // 注册快捷键
        this.addCommand({
            langKey: "highlightYellow",
            hotkey: "⌘⇧H",
            callback: () => {
                this.applyHighlight("#fff3cd");
            }
        });
    }
    
    private applyHighlight(color: string) {
        const editors = getAllEditor();
        
        if (editors.length === 0) {
            console.warn('没有活动的编辑器');
            return;
        }
        
        // 获取当前活动的编辑器
        const currentEditor = editors[0];
        
        // 检查是否有选中内容
        if (!currentEditor.protyle.toolbar.range) {
            console.warn('没有选中内容');
            return;
        }
        
        const selectedText = currentEditor.protyle.toolbar.range.toString().trim();
        if (!selectedText) {
            console.warn('选中内容为空');
            return;
        }
        
        // ✅ 调用 setInlineMark
        currentEditor.protyle.toolbar.setInlineMark(
            currentEditor.protyle,
            "text",
            "range",
            {
                type: "backgroundColor",
                color: color
            }
        );
    }
}
```

---

## 🧪 验证代码（你可以在控制台测试）

### 测试 1: 检查 getAllEditor 是否可用

```typescript
// 在思源控制台运行
(async () => {
    const { getAllEditor } = await import('/appearance/themes/Rem Craft/template.js');
    const editors = getAllEditor();
    
    console.log('编辑器数量:', editors.length);
    console.log('第一个编辑器:', editors[0]);
    console.log('toolbar 对象:', editors[0]?.protyle?.toolbar);
    console.log('setInlineMark 方法:', typeof editors[0]?.protyle?.toolbar?.setInlineMark);
})();

// 预期输出:
// 编辑器数量: 1 (或更多)
// toolbar 对象: Toolbar {element: div.protyle-toolbar, ...}
// setInlineMark 方法: "function" ✅
```

### 测试 2: 实际应用高亮

```typescript
// 在思源控制台运行（先选中一段文本）
(async () => {
    const { getAllEditor } = await import('/appearance/themes/Rem Craft/template.js');
    const editors = getAllEditor();
    const editor = editors[0];
    
    if (!editor || !editor.protyle.toolbar.range) {
        console.log('请先选中一段文本');
        return;
    }
    
    // ✅ 应用黄色高亮
    editor.protyle.toolbar.setInlineMark(
        editor.protyle,
        "text",
        "range",
        {
            type: "backgroundColor",
            color: "#fff3cd"
        }
    );
    
    console.log('✅ 高亮已应用！');
})();
```

---

## ⚠️ 注意事项

### 1. 确保 protyle 对象存在

```typescript
const editors = getAllEditor();

// ❌ 错误：没有检查
editors[0].protyle.toolbar.setInlineMark(...);

// ✅ 正确：检查是否存在
if (editors.length > 0 && editors[0].protyle && editors[0].protyle.toolbar) {
    editors[0].protyle.toolbar.setInlineMark(...);
}
```

### 2. 确保有选中内容

```typescript
const editor = editors[0];

// ✅ 检查 range
if (!editor.protyle.toolbar.range) {
    console.warn('没有选中内容');
    return;
}

const selectedText = editor.protyle.toolbar.range.toString().trim();
if (!selectedText) {
    console.warn('选中内容为空');
    return;
}
```

### 3. 传递正确的 protyle 对象

```typescript
// ✅ 正确：传递完整的 protyle 对象
editor.protyle.toolbar.setInlineMark(
    editor.protyle,  // ← 第一个参数是 protyle 对象
    "text",
    "range",
    { type, color }
);

// ❌ 错误：传递 editor
editor.protyle.toolbar.setInlineMark(
    editor,  // ← 错误！
    "text",
    "range",
    { type, color }
);
```

---

## 🎯 你的插件应该如何修改

### 当前代码问题 (toolbarHijacker.ts:845)

```typescript
// ❌ 你的代码：手动实现
private async applyHighlight(protyle: any, range: Range, nodeElement: Element, colorConfig: {name: string, color: string}): Promise<void> {
    const blockElement = this.findBlockElement(range.startContainer);
    const blockId = blockElement.getAttribute("data-node-id");
    const oldContent = blockElement.innerHTML;
    
    // 手动创建 span
    const highlightSpan = document.createElement("span");
    highlightSpan.setAttribute("data-type", "text");
    highlightSpan.style.backgroundColor = colorConfig.color;
    highlightSpan.textContent = selectedText;
    
    range.deleteContents();
    range.insertNode(highlightSpan);
    
    // 使用错误的 API
    const newContent = await this.extractMarkdownFromBlock(blockElement);
    await this.api.updateBlock(blockId, newContent, "markdown");
}
```

### 修改后的代码（简化 90%）

```typescript
// ✅ 正确代码：调用思源原生方法
private applyHighlight(protyle: any, range: Range, colorConfig: {name: string, color: string}): void {
    // 检查是否有有效选择
    const selectedText = range.toString().trim();
    if (!selectedText) {
        console.warn('选中内容为空');
        return;
    }
    
    // ✅ 直接调用 setInlineMark
    protyle.toolbar.setInlineMark(protyle, "text", "range", {
        type: "backgroundColor",
        color: colorConfig.color
    });
    
    // 完成！思源会自动：
    // 1. 创建符合规范的 <span data-type="text" style="...">
    // 2. 生成 IAL 属性
    // 3. 调用 /api/transactions（包含 doOperations 和 undoOperations）
    // 4. 更新数据库（blocks、spans、attributes 三个表）
    // 5. 支持 Ctrl+Z 撤销
    // 6. 处理所有边界情况（表格、代码块、零宽字符等）
}
```

### 修改按钮点击事件

```typescript
// toolbarHijacker.ts:512 - createHighlightButton 方法
btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // ❌ 删除这些复杂的逻辑
    // const apiColorConfig = { name: ..., color: ... };
    // await this.applyHighlight(protyle, range, nodeElement, apiColorConfig);
    
    // ✅ 改为直接调用
    this.applyHighlight(protyle, range, {
        name: colorConfig.displayName,
        color: colorConfig.bg
    });
    
    // 隐藏工具栏和清除选择
    this.hideToolbar(toolbar);
    this.clearSelection();
});
```

---

## 📊 代码对比

| 操作 | 你的手动实现 | 使用 setInlineMark |
|------|-------------|-------------------|
| 创建 span | 手动 createElement | ✅ 自动处理 |
| 设置样式 | 手动 style.backgroundColor | ✅ 自动处理 |
| 生成 IAL | ❌ 没有 | ✅ 自动生成 |
| API 调用 | /api/block/updateBlock ❌ | /api/transactions ✅ |
| undoOperations | ❌ 没有 | ✅ 自动包含 |
| 数据库更新 | ❌ 不完整 | ✅ 完整更新 3 个表 |
| 边界处理 | ❌ 缺少 | ✅ 完整处理 |
| 代码行数 | 2600+ 行 | ~10 行 ✅ |

---

## 🔥 完整的简化版实现

```typescript
// toolbarHijacker.ts - 简化版（只保留核心逻辑）
import { getAllEditor } from "siyuan";

export class ToolbarHijacker {
    private originalShowContent: any = null;
    
    public hijack(): void {
        const editors = getAllEditor();
        
        editors.forEach((editor) => {
            if (!editor.protyle?.toolbar?.showContent) return;
            
            // 保存原始方法
            if (!this.originalShowContent) {
                this.originalShowContent = editor.protyle.toolbar.showContent;
            }
            
            // 劫持 showContent
            const hijacker = this;
            editor.protyle.toolbar.showContent = function(protyle: any, range: Range, nodeElement: Element) {
                // 调用原始方法
                hijacker.originalShowContent.call(this, protyle, range, nodeElement);
                
                // 添加自定义按钮
                setTimeout(() => {
                    hijacker.enhanceToolbar(this, range, nodeElement, protyle);
                }, 50);
            };
        });
    }
    
    private enhanceToolbar(toolbar: any, range: Range, nodeElement: Element, protyle: any): void {
        const subElement = toolbar.subElement;
        if (!subElement) return;
        
        const container = subElement.querySelector('.fn__flex');
        if (!container) return;
        
        // 自定义颜色
        const colors = [
            { name: '黄色', bg: '#fff3cd' },
            { name: '绿色', bg: '#d4edda' },
            { name: '蓝色', bg: '#cce5ff' },
            { name: '粉色', bg: '#fce4ec' }
        ];
        
        // 添加分隔符
        const separator = document.createElement('div');
        separator.className = 'keyboard__split';
        container.appendChild(separator);
        
        // 添加颜色按钮
        colors.forEach(color => {
            const btn = document.createElement('button');
            btn.className = 'keyboard__action';
            btn.style.cssText = `
                width: 28px;
                height: 28px;
                background: ${color.bg} !important;
                border: none;
                border-radius: 6px;
                margin: auto 4px;
                cursor: pointer;
            `;
            btn.title = color.name;
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // ✅ 核心：调用思源原生方法
                protyle.toolbar.setInlineMark(protyle, "text", "range", {
                    type: "backgroundColor",
                    color: color.bg
                });
                
                // 隐藏工具栏
                toolbar.subElement.style.display = 'none';
                
                // 清除选择
                window.getSelection()?.removeAllRanges();
            });
            
            container.appendChild(btn);
        });
    }
}
```

---

## ✅ 验证步骤

### 1. 在你的插件中测试

```typescript
// src/index.ts
import { Plugin, getAllEditor } from "siyuan";
import { ToolbarHijacker } from "./utils/toolbarHijacker";

export default class HighlightPlugin extends Plugin {
    async onload() {
        // 添加测试命令
        (window as any).testSetInlineMark = () => {
            const editors = getAllEditor();
            console.log('编辑器数量:', editors.length);
            
            if (editors.length > 0) {
                console.log('protyle 存在:', !!editors[0].protyle);
                console.log('toolbar 存在:', !!editors[0].protyle?.toolbar);
                console.log('setInlineMark 类型:', typeof editors[0].protyle?.toolbar?.setInlineMark);
                
                // 尝试应用高亮
                if (editors[0].protyle?.toolbar?.range) {
                    editors[0].protyle.toolbar.setInlineMark(
                        editors[0].protyle,
                        "text",
                        "range",
                        { type: "backgroundColor", color: "#fff3cd" }
                    );
                    console.log('✅ 高亮已应用！');
                } else {
                    console.log('⚠️ 请先选中一段文本');
                }
            }
        };
        
        console.log('💡 在控制台运行 testSetInlineMark() 来测试');
    }
}
```

### 2. 控制台测试

1. 在思源中选中一段文本
2. 打开控制台（F12）
3. 运行 `testSetInlineMark()`
4. 检查是否成功应用高亮

### 3. 检查数据库

```sql
-- 验证 spans 表
SELECT * FROM spans WHERE type = 'textmark text' ORDER BY id DESC LIMIT 1;

-- 验证 attributes 表
SELECT * FROM attributes WHERE name = 'style' ORDER BY id DESC LIMIT 1;
```

---

## 🎉 总结

### ✅ 你可以直接使用 setInlineMark

1. **完全可以访问**：通过 `getAllEditor()` 或劫持工具栏获取 protyle 对象
2. **是公开 API**：setInlineMark 是 public 方法，专门设计给调用
3. **思源核心也在用**：思源自己的代码就是这样调用的
4. **推荐使用**：比自己实现更可靠、更简洁、功能更完整

### 🚀 建议的修改

1. **删除 845-1381 行**：所有手动实现的 Markdown 转换逻辑
2. **删除 28-57 行**：自定义 API 封装
3. **简化 applyHighlight**：只调用 setInlineMark
4. **代码减少 96%**：从 2600+ 行 → ~100 行

需要我帮你重写这个简化版的代码吗？

