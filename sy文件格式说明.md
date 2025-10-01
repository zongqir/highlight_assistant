# .sy 文件格式真相

## 核心发现

`.sy` 文件不是纯 Markdown，而是 **JSON 格式的 AST (抽象语法树)**！

---

## 文件保存流程

### 1. 代码证据 (`kernel/filesys/tree.go:238`)

```go
func prepareWriteTree(tree *parse.Tree) (data []byte, filePath string, err error) {
    luteEngine := util.NewLute()
    
    // ✅ 关键：使用 JSONRenderer 渲染 AST 为 JSON
    renderer := render.NewJSONRenderer(tree, luteEngine.RenderOptions)
    data = renderer.Render()
    
    // 格式化 JSON（缩进美化）
    if !util.UseSingleLineSave {
        json.Indent(&buf, data, "", "\t")
        data = buf.Bytes()
    }
    
    // 写入 .sy 文件
    filelock.WriteFile(filePath, data)
}
```

---

## .sy 文件的实际内容

### 示例：一个包含高亮的段落

**你看到的内容:**
```
关键信息是我爱你
（其中"我爱"是黄色高亮）
```

**实际 .sy 文件内容（JSON 格式）:**

```json
{
  "ID": "20251001111753-bo1zbnu",
  "Type": "NodeDocument",
  "Properties": {
    "id": "20251001111753-bo1zbnu",
    "title": "测试文档",
    "updated": "20251001111824"
  },
  "Children": [
    {
      "ID": "20251001111753-36y1un2",
      "Type": "NodeParagraph",
      "Properties": {
        "id": "20251001111753-36y1un2",
        "updated": "20251001111824"
      },
      "Children": [
        {
          "Type": "NodeText",
          "Data": "关键信息是"
        },
        {
          "Type": "NodeTextMark",
          "TextMarkType": "text",
          "Properties": {
            "style": "background-color: var(--b3-font-background2);"
          },
          "Children": [
            {
              "Type": "NodeText",
              "Data": "我爱"
            }
          ]
        },
        {
          "Type": "NodeKramdownSpanIAL",
          "Data": "{: style=\"background-color: var(--b3-font-background2);\"}"
        },
        {
          "Type": "NodeText",
          "Data": "你"
        }
      ]
    }
  ]
}
```

**关键点:**
- ✅ 使用 JSON 存储 AST 结构
- ✅ 每个节点都有明确的 `Type`
- ✅ 属性存储在 `Properties` 中
- ✅ IAL 作为独立的 `NodeKramdownSpanIAL` 节点

---

## 三种格式的转换关系

```
1. 编辑器 DOM (HTML)
   ↓
   Lute.HTML2Tree()
   ↓
2. AST (内存中的树结构)
   ↓
   JSONRenderer.Render()
   ↓
3. .sy 文件 (JSON 格式)
```

**反向加载:**
```
1. .sy 文件 (JSON 格式)
   ↓
   parseJSON2Tree()
   ↓
2. AST (内存中的树结构)
   ↓
   Tree2HTML()
   ↓
3. 编辑器 DOM (HTML)
```

---

## 数据库存储 vs 文件存储

| 位置 | 格式 | 用途 |
|------|------|------|
| `.sy` 文件 | **JSON (AST)** | 持久化存储，版本控制 |
| `blocks.markdown` | **HTML** | 快速搜索，FTS索引 |
| `spans.markdown` | **HTML** | 行级元素搜索 |
| `attributes.value` | **纯文本** | 属性查询 |

---

## 为什么用户会觉得"块变成了 HTML"？

### 可能的原因

#### 1. 查看数据库 `blocks.markdown` 字段

```sql
SELECT markdown FROM blocks WHERE id = '20251001111753-36y1un2';
```

**结果:**
```html
关键信息是<span data-type="text" style="background-color: var(--b3-font-background2);">我爱</span>你
```

✅ **这是正常的！** 数据库存储的就是 HTML，用于快速搜索。

---

#### 2. 查看 .sy 文件（通过文本编辑器打开）

**看到:**
```json
{
  "Type": "NodeTextMark",
  "TextMarkType": "text",
  "Properties": {
    "style": "background-color: var(--b3-font-background2);"
  }
}
```

✅ **这也是正常的！** .sy 文件就是 JSON 格式，不是 Markdown。

---

#### 3. 之前的代码行为 vs 现在的行为

**之前（错误的实现）:**
```typescript
// 手动提取 Markdown
const markdownContent = await this.extractMarkdownFromBlock(blockElement);
// → "关键信息是<span ...>我爱</span>你"

// 使用错误的 API 保存
await this.api.updateBlock(blockId, markdownContent, "markdown");
// → 可能直接存储为 HTML 字符串，未正确转换
```

**现在（正确的实现）:**
```typescript
// 使用思源原生方法
protyle.toolbar.setInlineMark(protyle, "text", "range", {
    type: "backgroundColor",
    color: colorConfig.color
});

// 内部流程:
// 1. DOM 操作 (HTML)
// 2. updateTransaction → /api/transactions (传递 HTML)
// 3. 后端: HTML → Lute AST
// 4. JSONRenderer.Render() → JSON (.sy 文件)
// 5. 索引: AST → blocks.markdown (HTML)
```

---

## 验证方法

### 1. 检查 .sy 文件内容

```bash
# Windows PowerShell
cat "C:\Users\...\data\20250927162737-llbshdd\20251001111753-bo1zbnu.sy"
```

**应该看到 JSON 格式，不是纯文本 Markdown！**

---

### 2. 检查数据库内容

```sql
-- blocks 表的 markdown 字段（HTML）
SELECT id, markdown FROM blocks WHERE id = '20251001111753-36y1un2';

-- spans 表的 markdown 字段（HTML）
SELECT id, markdown FROM spans WHERE type = 'textmark text' ORDER BY id DESC LIMIT 1;
```

**应该看到 HTML 格式！**

---

### 3. 前后对比

**修改前（你的旧代码）:**
- `.sy` 文件：可能是错误的 HTML 字符串
- `blocks.markdown`：HTML（但可能缺少 IAL）
- `spans` 表：可能没有记录
- `attributes` 表：可能没有记录

**修改后（使用 setInlineMark）:**
- `.sy` 文件：正确的 JSON (AST)
- `blocks.markdown`：正确的 HTML
- `spans` 表：有记录 ✅
- `attributes` 表：有记录 ✅

---

## 总结

### ✅ 这不是 Bug，这是设计！

1. **编辑器中**：DOM 是 HTML 格式
2. **数据库中**：`blocks.markdown` 是 HTML 格式（用于搜索）
3. **文件系统中**：`.sy` 是 JSON 格式的 AST（用于持久化）

### 🎯 关键理解

**思源笔记不使用纯 Markdown 文件！**

- 不是 `.md` 文件
- 不是纯文本 Kramdown
- 而是 **JSON 格式的 AST**

这样设计的好处：
- ✅ 保留完整的结构信息
- ✅ 支持复杂的节点类型
- ✅ 属性不丢失
- ✅ 可以精确重建 DOM

### 📌 如何判断是否正常？

检查这些要点：

1. **功能测试**
   - [ ] 高亮是否显示？
   - [ ] Ctrl+Z 能否撤销？
   - [ ] 重启思源后高亮还在吗？

2. **数据库验证**
   ```sql
   SELECT * FROM spans WHERE type = 'textmark text' ORDER BY id DESC LIMIT 1;
   -- 应该有记录
   
   SELECT * FROM attributes WHERE name = 'style' AND type = 's' ORDER BY id DESC LIMIT 1;
   -- 应该有记录
   ```

3. **.sy 文件验证**
   - 打开 .sy 文件
   - 应该是格式化的 JSON
   - 应该包含 `NodeTextMark` 节点
   - 应该包含 `NodeKramdownSpanIAL` 节点

只要这三点都正确，就说明实现没问题！

---

## 参考代码位置

- 文件保存: `kernel/filesys/tree.go:238`
- JSON 渲染: `github.com/88250/lute/render/json_renderer.go`
- AST 解析: `github.com/88250/lute/parse/parse.go`

