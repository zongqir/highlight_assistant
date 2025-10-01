# API参考

<cite>
**本文档中引用的文件**
- [API.md](file://API.md)
- [notebook.go](file://kernel/api/notebook.go)
- [filetree.go](file://kernel/api/filetree.go)
- [block.go](file://kernel/api/block.go)
- [attr.go](file://kernel/api/attr.go)
- [sql.go](file://kernel/api/sql.go)
- [search.go](file://kernel/api/search.go)
- [system.go](file://kernel/api/system.go)
- [asset.go](file://kernel/api/asset.go)
- [template.go](file://kernel/api/template.go)
- [file.go](file://kernel/api/file.go)
</cite>

## 目录
1. [规范](#规范)
    - [参数和返回值](#参数和返回值)
    - [认证](#认证)
2. [笔记本](#笔记本)
    - [列出笔记本](#列出笔记本)
    - [打开笔记本](#打开笔记本)
    - [关闭笔记本](#关闭笔记本)
    - [重命名笔记本](#重命名笔记本)
    - [创建笔记本](#创建笔记本)
    - [移除笔记本](#移除笔记本)
    - [获取笔记本配置](#获取笔记本配置)
    - [保存笔记本配置](#保存笔记本配置)
3. [文档](#文档)
    - [使用Markdown创建文档](#使用markdown创建文档)
    - [重命名文档](#重命名文档)
    - [移除文档](#移除文档)
    - [移动文档](#移动文档)
    - [根据路径获取可读路径](#根据路径获取可读路径)
    - [根据ID获取可读路径](#根据id获取可读路径)
    - [根据ID获取存储路径](#根据id获取存储路径)
    - [根据可读路径获取ID](#根据可读路径获取id)
4. [资源](#资源)
    - [上传资源](#上传资源)
5. [块](#块)
    - [插入块](#插入块)
    - [前置块](#前置块)
    - [追加块](#追加块)
    - [更新块](#更新块)
    - [删除块](#删除块)
    - [移动块](#移动块)
    - [折叠块](#折叠块)
    - [展开块](#展开块)
    - [获取块kramdown](#获取块kramdown)
    - [获取子块](#获取子块)
    - [转移块引用](#转移块引用)
6. [属性](#属性)
    - [设置块属性](#设置块属性)
    - [获取块属性](#获取块属性)
7. [SQL](#sql)
    - [执行SQL查询](#执行sql查询)
    - [刷新事务](#刷新事务)
8. [模板](#模板)
    - [渲染模板](#渲染模板)
    - [渲染Sprig](#渲染sprig)
9. [文件](#文件)
    - [获取文件](#获取文件)
    - [放置文件](#放置文件)
    - [移除文件](#移除文件)
    - [重命名文件](#重命名文件)
    - [列出文件](#列出文件)
10. [导出](#导出)
    - [导出Markdown](#导出markdown)
    - [导出文件和文件夹](#导出文件和文件夹)
11. [转换](#转换)
    - [Pandoc](#pandoc)
12. [通知](#通知)
    - [推送消息](#推送消息)
    - [推送错误消息](#推送错误消息)
13. [网络](#网络)
    - [正向代理](#正向代理)
14. [系统](#系统)
    - [获取启动进度](#获取启动进度)
    - [获取系统版本](#获取系统版本)
    - [获取系统当前时间](#获取系统当前时间)

## 规范

### 参数和返回值

* 端点: `http://127.0.0.1:6806`
* 均为POST方法
* 有参数的接口需要，参数为JSON字符串，放在body中，header Content-Type为`application/json`
* 返回值

   ````json
   {
     "code": 0,
     "msg": "",
     "data": {}
   }
   ````

    * `code`: 异常时非零
    * `msg`: 正常情况下为空字符串，异常时会返回错误文本
    * `data`: 可能是 `{}`, `[]` 或 `NULL`，视接口而定

### 认证

在 <kbd>设置 - 关于</kbd> 中查看API令牌，请求头: `Authorization: Token xxx`

## 笔记本

### 列出笔记本

* `/api/notebook/lsNotebooks`
* 无参数
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "notebooks": [
        {
          "id": "20210817205410-2kvfpfn", 
          "name": "测试笔记本",
          "icon": "1f41b",
          "sort": 0,
          "closed": false
        },
        {
          "id": "20210808180117-czj9bvb",
          "name": "思源用户指南",
          "icon": "1f4d4",
          "sort": 1,
          "closed": false
        }
      ]
    }
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [notebook.go](file://kernel/api/notebook.go#L400-L427)

### 打开笔记本

* `/api/notebook/openNotebook`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0"
  }
  ```

    * `notebook`: 笔记本ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [notebook.go](file://kernel/api/notebook.go#L168-L227)

### 关闭笔记本

* `/api/notebook/closeNotebook`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0"
  }
  ```

    * `notebook`: 笔记本ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [notebook.go](file://kernel/api/notebook.go#L230-L244)

### 重命名笔记本

* `/api/notebook/renameNotebook`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0",
    "name": "新笔记本名称"
  }
  ```

    * `notebook`: 笔记本ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [notebook.go](file://kernel/api/notebook.go#L87-L111)

### 创建笔记本

* `/api/notebook/createNotebook`
* 参数

  ```json
  {
    "name": "笔记本名称"
  }
  ```
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "notebook": {
        "id": "20220126215949-r1wvoch",
        "name": "笔记本名称",
        "icon": "",
        "sort": 0,
        "closed": false
      }
    }
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [notebook.go](file://kernel/api/notebook.go#L114-L147)

### 移除笔记本

* `/api/notebook/removeNotebook`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0"
  }
  ```

    * `notebook`: 笔记本ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [notebook.go](file://kernel/api/notebook.go#L150-L165)

### 获取笔记本配置

* `/api/notebook/getNotebookConf`
* 参数

  ```json
  {
    "notebook": "20210817205410-2kvfpfn"
  }
  ```

    * `notebook`: 笔记本ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "box": "20210817205410-2kvfpfn",
      "conf": {
        "name": "测试笔记本",
        "closed": false,
        "refCreateSavePath": "",
        "createDocNameTemplate": "",
        "dailyNoteSavePath": "/daily note/{{now | date \"2006/01\"}}/{{now | date \"2006-01-02\"}}",
        "dailyNoteTemplatePath": ""
      },
      "name": "测试笔记本"
    }
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [notebook.go](file://kernel/api/notebook.go#L300-L324)

### 保存笔记本配置

* `/api/notebook/setNotebookConf`
* 参数

  ```json
  {
    "notebook": "20210817205410-2kvfpfn",
    "conf": {
        "name": "测试笔记本",
        "closed": false,
        "refCreateSavePath": "",
        "createDocNameTemplate": "",
        "dailyNoteSavePath": "/daily note/{{now | date \"2006/01\"}}/{{now | date \"2006-01-02\"}}",
        "dailyNoteTemplatePath": ""
      }
  }
  ```

    * `notebook`: 笔记本ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "name": "测试笔记本",
      "closed": false,
      "refCreateSavePath": "",
      "createDocNameTemplate": "",
      "dailyNoteSavePath": "/daily note/{{now | date \"2006/01\"}}/{{now | date \"2006-01-02\"}}",
      "dailyNoteTemplatePath": ""
    }
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [notebook.go](file://kernel/api/notebook.go#L327-L397)

## 文档

### 使用Markdown创建文档

* `/api/filetree/createDocWithMd`
* 参数

  ```json
  {
    "notebook": "20210817205410-2kvfpfn",
    "path": "/foo/bar",
    "markdown": ""
  }
  ```

    * `notebook`: 笔记本ID
    * `path`: 文档路径，需要以 / 开头，用 / 分隔层级（这里的 path 对应数据库 hpath 字段）
    * `markdown`: GFM Markdown内容
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "20210914223645-oj2vnx2"
  }
  ```

    * `data`: 创建的文档ID
    * 如果使用相同的 `path` 重复调用此接口，不会覆盖已存在的文档

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [filetree.go](file://kernel/api/filetree.go#L538-L567)

### 重命名文档

* `/api/filetree/renameDoc`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0",
    "path": "/20210902210113-0avi12f.sy",
    "title": "新文档标题"
  }
  ```

    * `notebook`: 笔记本ID
    * `path`: 文档路径
    * `title`: 新文档标题
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

通过 `id` 重命名文档:

* `/api/filetree/renameDocByID`
* 参数

  ```json
  {
    "id": "20210902210113-0avi12f",
    "title": "新文档标题"
  }
  ```

    * `id`: 文档ID
    * `title`: 新文档标题
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [filetree.go](file://kernel/api/filetree.go#L386-L435)

### 移除文档

* `/api/filetree/removeDoc`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0",
    "path": "/20210902210113-0avi12f.sy"
  }
  ```

    * `notebook`: 笔记本ID
    * `path`: 文档路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

通过 `id` 移除文档:

* `/api/filetree/removeDocByID`
* 参数

  ```json
  {
    "id": "20210902210113-0avi12f"
  }
  ```

    * `id`: 文档ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [filetree.go](file://kernel/api/filetree.go#L438-L478)

### 移动文档

* `/api/filetree/moveDocs`
* 参数

  ```json
  {
    "fromPaths": ["/20210917220056-yxtyl7i.sy"],
    "toNotebook": "20210817205410-2kvfpfn",
    "toPath": "/"
  }
  ```

    * `fromPaths`: 源路径
    * `toNotebook`: 目标笔记本ID
    * `toPath`: 目标路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

通过 `id` 移动文档:

* `/api/filetree/moveDocsByID`
* 参数

  ```json
  {
    "fromIDs": ["20210917220056-yxtyl7i"],
    "toID": "20210817205410-2kvfpfn"
  }
  ```

    * `fromIDs`: 源文档的ID
    * `toID`: 目标父文档的ID或笔记本ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [filetree.go](file://kernel/api/filetree.go#L481-L535)

### 根据路径获取可读路径

* `/api/filetree/getHPathByPath`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0",
    "path": "/20210917220500-sz588nq/20210917220056-yxtyl7i.sy"
  }
  ```

    * `notebook`: 笔记本ID
    * `path`: 文档路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "/foo/bar"
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [filetree.go](file://kernel/api/filetree.go#L268-L293)

### 根据ID获取可读路径

* `/api/filetree/getHPathByID`
* 参数

  ```json
  {
    "id": "20210917220056-yxtyl7i"
  }
  ```

    * `id`: 块ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "/foo/bar"
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [filetree.go](file://kernel/api/filetree.go#L307-L332)

### 根据ID获取存储路径

* `/api/filetree/getPathByID`
* 参数

  ```json
  {
    "id": "20210808180320-fqgskfj"
  }
  ```

    * `id`: 块ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
    "notebook": "20210808180117-czj9bvb",
    "path": "/20200812220555-lj3enxa/20210808180320-fqgskfj.sy"
    }
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [filetree.go](file://kernel/api/filetree.go#L335-L360)

### 根据可读路径获取ID

* `/api/filetree/getIDsByHPath`
* 参数

  ```json
  {
    "path": "/foo/bar",
    "notebook": "20210808180117-czj9bvb"
  }
  ```

    * `path`: 可读路径
    * `notebook`: 笔记本ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
        "20200813004931-q4cu8na"
    ]
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [filetree.go](file://kernel/api/filetree.go#L363-L383)

## 资源

### 上传资源

* `/api/asset/upload`
* 参数为HTTP Multipart表单

    * `assetsDirPath`: 存储资源的文件夹路径，以data文件夹为根路径，例如：
        * `"/assets/"`: workspace/data/assets/ 文件夹
        * `"/assets/sub/"`: workspace/data/assets/sub/ 文件夹

      正常情况下建议使用第一种方式，即存放在工作区的assets文件夹中，放入子目录有一些副作用，请参考用户指南中的资源章节。
    * `file[]`: 上传的文件列表
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "errFiles": [""],
      "succMap": {
        "foo.png": "assets/foo-20210719092549-9j5y79r.png"
      }
    }
  }
  ```

    * `errFiles`: 上传处理出错的文件名列表
    * `succMap`: 对于成功处理的文件，key是上传时的文件名，value是 assets/foo-id.png，用于将现有Markdown内容中的资源链接地址替换为上传后的地址

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [asset.go](file://kernel/api/asset.go#L40-L78)

## 块

### 插入块

* `/api/block/insertBlock`
* 参数

  ```json
  {
    "dataType": "markdown",
    "data": "foo**bar**{: style=\"color: var(--b3-font-color8);\"}baz",
    "nextID": "",
    "previousID": "20211229114650-vrek5x6",
    "parentID": ""
  }
  ```

    * `dataType`: 要插入的数据类型，值可以是 `markdown` 或 `dom`
    * `data`: 要插入的数据
    * `nextID`: 下一个块的ID，用于锚定插入位置
    * `previousID`: 上一个块的ID，用于锚定插入位置
    * `parentID`: 父块的ID，用于锚定插入位置

  `nextID`, `previousID`, 和 `parentID` 必须至少有一个值，优先级为：`nextID` > `previousID` > `parentID`
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
      {
        "doOperations": [
          {
            "action": "insert",
            "data": "<div data-node-id=\"20211230115020-g02dfx0\" data-node-index=\"1\" data-type=\"NodeParagraph\" class=\"p\"><div contenteditable=\"true\" spellcheck=\"false\">foo<strong style=\"color: var(--b3-font-color8);\">bar</strong>baz</div><div class=\"protyle-attr\" contenteditable=\"false\"></div></div>",
            "id": "20211230115020-g02dfx0",
            "parentID": "",
            "previousID": "20211229114650-vrek5x6",
            "retData": null
          }
        ],
        "undoOperations": null
      }
    ]
  }
  ```

    * `action.data`: 新插入块生成的DOM
    * `action.id`: 新插入块的ID

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [block.go](file://kernel/api/block.go#L40-L78)

### 前置块

* `/api/block/prependBlock`
* 参数

  ```json
  {
    "data": "foo**bar**{: style=\"color: var(--b3-font-color8);\"}baz",
    "dataType": "markdown",
    "parentID": "20220107173950-7f9m1nb"
  }
  ```

    * `dataType`: 要插入的数据类型，值可以是 `markdown` 或 `dom`
    * `data`: 要插入的数据
    * `parentID`: 父块的ID，用于锚定插入位置
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
      {
        "doOperations": [
          {
            "action": "insert",
            "data": "<div data-node-id=\"20220108003710-hm0x9sc\" data-node-index=\"1\" data-type=\"NodeParagraph\" class=\"p\"><div contenteditable=\"true\" spellcheck=\"false\">foo<strong style=\"color: var(--b3-font-color8);\">bar</strong>baz</div><div class=\"protyle-attr\" contenteditable=\"false\"></div></div>",
            "id": "20220108003710-hm0x9sc",
            "parentID": "20220107173950-7f9m1nb",
            "previousID": "",
            "retData": null
          }
        ],
        "undoOperations": null
      }
    ]
  }
  ```

    * `action.data`: 新插入块生成的DOM
    * `action.id`: 新插入块的ID

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [block.go](file://kernel/api/block.go#L81-L110)

### 追加块

* `/api/block/appendBlock`
* 参数

  ```json
  {
    "data": "foo**bar**{: style=\"color: var(--b3-font-color8);\"}baz",
    "dataType": "markdown",
    "parentID": "20220107173950-7f9m1nb"
  }
  ```

    * `dataType`: 要插入的数据类型，值可以是 `markdown` 或 `dom`
    * `data`: 要插入的数据
    * `parentID`: 父块的ID，用于锚定插入位置
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
      {
        "doOperations": [
          {
            "action": "insert",
            "data": "<div data-node-id=\"20220108003642-y2wmpcv\" data-node-index=\"1\" data-type=\"NodeParagraph\" class=\"p\"><div contenteditable=\"true\" spellcheck=\"false\">foo<strong style=\"color: var(--b3-font-color8);\">bar</strong>baz</div><div class=\"protyle-attr\" contenteditable=\"false\"></div></div>",
            "id": "20220108003642-y2wmpcv",
            "parentID": "20220107173950-7f9m1nb",
            "previousID": "20220108003615-7rk41t1",
            "retData": null
          }
        ],
        "undoOperations": null
      }
    ]
  }
  ```

    * `action.data`: 新插入块生成的DOM
    * `action.id`: 新插入块的ID

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [block.go](file://kernel/api/block.go#L113-L142)

### 更新块

* `/api/block/updateBlock`
* 参数

  ```json
  {
    "dataType": "markdown",
    "data": "foobarbaz",
    "id": "20211230161520-querkps"
  }
  ```

    * `dataType`: 要更新的数据类型，值可以是 `markdown` 或 `dom`
    * `data`: 要更新的数据
    * `id`: 要更新的块的ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
      {
        "doOperations": [
          {
            "action": "update",
            "data": "<div data-node-id=\"20211230161520-querkps\" data-node-index=\"1\" data-type=\"NodeParagraph\" class=\"p\"><div contenteditable=\"true\" spellcheck=\"false\">foo<strong>bar</strong>baz</div><div class=\"protyle-attr\" contenteditable=\"false\"></div></div>",
            "id": "20211230161520-querkps",
            "parentID": "",
            "previousID": "",
            "retData": null
            }
          ],
        "undoOperations": null
      }
    ]
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [block.go](file://kernel/api/block.go#L145-L183)

### 删除块

* `/api/block/deleteBlock`
* 参数

  ```json
  {
    "id": "20211230161520-querkps"
  }
  ```

    * `id`: 要删除的块的ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
      {
        "doOperations": [
          {
            "action": "delete",
            "id": "20211230161520-querkps",
            "parentID": "",
            "previousID": "",
            "retData": null
          }
        ],
        "undoOperations": null
      }
    ]
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [block.go](file://kernel/api/block.go#L186-L215)

### 移动块

* `/api/block/moveBlock`
* 参数

  ```json
  {
    "id": "20211230161520-querkps",
    "to": "20211230161520-querkps"
  }
  ```

    * `id`: 要移动的块的ID
    * `to`: 目标块的ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
      {
        "doOperations": [
          {
            "action": "move",
            "id": "20211230161520-querkps",
            "to": "20211230161520-querkps",
            "retData": null
          }
        ],
        "undoOperations": null
      }
    ]
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [block.go](file://kernel/api/block.go#L218-L247)

### 折叠块

* `/api/block/foldBlock`
* 参数

  ```json
  {
    "id": "20211230161520-querkps"
  }
  ```

    * `id`: 要折叠的块的ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [block.go](file://kernel/api/block.go#L250-L264)

### 展开块

* `/api/block/unfoldBlock`
* 参数

  ```json
  {
    "id": "20211230161520-querkps"
  }
  ```

    * `id`: 要展开的块的ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [block.go](file://kernel/api/block.go#L267-L281)

### 获取块kramdown

* `/api/block/getBlockKramdown`
* 参数

  ```json
  {
    "id": "20211230161520-querkps"
  }
  ```

    * `id`: 块ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "id": "20211230161520-querkps",
      "kramdown": "foo**bar**{: style=\"color: var(--b3-font-color8);\"}baz"
    }
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [block.go](file://kernel/api/block.go#L718-L752)

### 获取子块

* `/api/block/getChildBlocks`
* 参数

  ```json
  {
    "id": "20211230161520-querkps"
  }
  ```

    * `id`: 块ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
      {
        "id": "20211230161520-querkps",
        "type": "NodeParagraph",
        "content": "foo**bar**{: style=\"color: var(--b3-font-color8);\"}baz"
      }
    ]
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [block.go](file://kernel/api/block.go#L755-L770)

### 转移块引用

* `/api/block/transferBlockRef`
* 参数

  ```json
  {
    "fromID": "20211230161520-querkps",
    "toID": "20211230161520-querkps"
  }
  ```

    * `fromID`: 源块ID
    * `toID`: 目标块ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [block.go](file://kernel/api/block.go#L284-L317)

## 属性

### 设置块属性

* `/api/attr/setBlockAttrs`
* 参数

  ```json
  {
    "id": "20211230161520-querkps",
    "attrs": {
      "custom-key": "custom-value"
    }
  }
  ```

    * `id`: 块ID
    * `attrs`: 属性键值对
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [attr.go](file://kernel/api/attr.go#L78-L114)

### 获取块属性

* `/api/attr/getBlockAttrs`
* 参数

  ```json
  {
    "id": "20211230161520-querkps"
  }
  ```

    * `id`: 块ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "custom-key": "custom-value"
    }
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [attr.go](file://kernel/api/attr.go#L62-L75)

## SQL

### 执行SQL查询

* `/api/sql/executeSQL`
* 参数

  ```json
  {
    "stmt": "SELECT * FROM blocks WHERE id = '20211230161520-querkps'"
  }
  ```

    * `stmt`: SQL语句
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
      {
        "id": "20211230161520-querkps",
        "type": "NodeParagraph",
        "content": "foo**bar**{: style=\"color: var(--b3-font-color8);\"}baz"
      }
    ]
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [sql.go](file://kernel/api/sql.go#L28-L56)

### 刷新事务

* `/api/sql/flushTransaction`
* 无参数
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [sql.go](file://kernel/api/sql.go#L12-L25)

## 模板

### 渲染模板

* `/api/template/renderTemplate`
* 参数

  ```json
  {
    "path": "/templates/example.json",
    "id": "20211230161520-querkps"
  }
  ```

    * `path`: 模板路径
    * `id`: 块ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "path": "/templates/example.json",
      "content": "rendered template content"
    }
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [template.go](file://kernel/api/template.go#L58-L105)

### 渲染Sprig

* `/api/template/renderSprig`
* 参数

  ```json
  {
    "template": "{{ now | date \"2006-01-02\" }}"
  }
  ```

    * `template`: Sprig模板
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "2023-10-15"
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [template.go](file://kernel/api/template.go#L12-L38)

## 文件

### 获取文件

* `/api/file/getFile`
* 参数

  ```json
  {
    "path": "/path/to/file.txt"
  }
  ```

    * `path`: 文件路径
* 返回值

  返回文件内容，Content-Type为文件MIME类型。

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [file.go](file://kernel/api/file.go#L188-L258)

### 放置文件

* `/api/file/putFile`
* 参数为multipart/form-data

    * `path`: 文件路径
    * `isDir`: 是否为目录
    * `file`: 文件内容（仅当不是目录时）
    * `modTime`: 修改时间（毫秒）
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [file.go](file://kernel/api/file.go#L261-L378)

### 移除文件

* `/api/file/removeFile`
* 参数

  ```json
  {
    "path": "/path/to/file.txt"
  }
  ```

    * `path`: 文件路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [file.go](file://kernel/api/file.go#L156-L185)

### 重命名文件

* `/api/file/renameFile`
* 参数

  ```json
  {
    "path": "/path/to/old.txt",
    "newPath": "/path/to/new.txt"
  }
  ```

    * `path`: 原路径
    * `newPath`: 新路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [file.go](file://kernel/api/file.go#L121-L153)

### 列出文件

* `/api/file/readDir`
* 参数

  ```json
  {
    "path": "/path/to/directory"
  }
  ```

    * `path`: 目录路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
      {
        "name": "file1.txt",
        "isDir": false,
        "isSymlink": false,
        "updated": 1697356800
      },
      {
        "name": "subdir",
        "isDir": true,
        "isSymlink": false,
        "updated": 1697356800
      }
    ]
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [file.go](file://kernel/api/file.go#L89-L118)

## 导出

### 导出Markdown

* `/api/export/exportMd`
* 参数

  ```json
  {
    "id": "20211230161520-querkps"
  }
  ```

    * `id`: 块ID
* 返回值

  返回Markdown文件流。

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [export.go](file://kernel/api/export.go#L12-L45)

### 导出文件和文件夹

* `/api/export/exportResources`
* 参数

  ```json
  {
    "paths": ["/path/to/file1.txt", "/path/to/dir"]
  }
  ```

    * `paths`: 要导出的路径列表
* 返回值

  返回ZIP文件流。

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [export.go](file://kernel/api/export.go#L48-L81)

## 转换

### Pandoc

* `/api/pandoc/convert`
* 参数

  ```json
  {
    "input": "# Header\n\nContent",
    "from": "markdown",
    "to": "html"
  }
  ```

    * `input`: 输入内容
    * `from`: 源格式
    * `to`: 目标格式
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "<h1>Header</h1>\n<p>Content</p>"
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [pandoc.go](file://kernel/api/pandoc.go#L12-L45)

## 通知

### 推送消息

* `/api/notification/pushMsg`
* 参数

  ```json
  {
    "msg": "Hello, World!",
    "timeout": 3000
  }
  ```

    * `msg`: 消息内容
    * `timeout`: 超时时间（毫秒）
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "message-id"
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [notification.go](file://kernel/api/notification.go#L12-L45)

### 推送错误消息

* `/api/notification/pushErr`
* 参数

  ```json
  {
    "msg": "An error occurred"
  }
  ```

    * `msg`: 错误消息
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "error-id"
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [notification.go](file://kernel/api/notification.go#L48-L81)

## 网络

### 正向代理

* `/api/network/proxy`
* 参数

  ```json
  {
    "url": "https://example.com"
  }
  ```

    * `url`: 要代理的URL
* 返回值

  返回代理的内容。

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [proxy.go](file://kernel/api/proxy.go#L12-L45)

## 系统

### 获取启动进度

* `/api/system/bootProgress`
* 无参数
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "progress": 0.8,
      "details": "Loading plugins..."
    }
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [system.go](file://kernel/api/system.go#L740-L765)

### 获取系统版本

* `/api/system/version`
* 无参数
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "2.8.3"
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [system.go](file://kernel/api/system.go#L722-L737)

### 获取系统当前时间

* `/api/system/currentTime`
* 无参数
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": 1697356800000
  }
  ```

**Section sources**
- [API.md](file://API.md#L1-L1582)
- [system.go](file://kernel/api/system.go#L705-L719)