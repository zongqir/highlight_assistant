# 💻 开发指南

## 🎯 核心概念

### 插件生命周期

```typescript
export default class PluginSample extends Plugin {
    // 1. 插件加载 - 初始化阶段
    async onload() {
        // 注册UI组件、事件监听器、命令等
        // 加载配置数据
        // 初始化服务
    }

    // 2. 布局就绪 - UI可用阶段  
    onLayoutReady() {
        // 添加顶栏按钮
        // 注册状态栏
        // 绑定界面事件
    }

    // 3. 插件卸载 - 清理阶段
    async onunload() {
        // 清理资源
        // 保存状态
        // 移除监听器
    }

    // 4. 插件彻底移除
    uninstall() {
        // 删除数据文件
        // 清理配置
    }
}
```

## 🔧 核心API详解

### 1. 思源笔记 API 封装

项目中的 `src/api.ts` 提供了完整的SiYuan API封装：

#### 笔记本操作
```typescript
import { lsNotebooks, createNotebook, openNotebook } from '@/api';

// 获取所有笔记本
const notebooks = await lsNotebooks();

// 创建新笔记本
const newNotebook = await createNotebook("我的笔记本");

// 打开笔记本
await openNotebook(newNotebook.id);
```

#### 文档操作
```typescript
import { createDocWithMd, renameDoc, removeDoc } from '@/api';

// 用Markdown创建文档
const docId = await createDocWithMd(
    notebookId, 
    "/新文档.md", 
    "# 标题\n\n内容"
);

// 重命名文档
await renameDoc(notebookId, "/新文档.md", "重命名后的文档");

// 删除文档
await removeDoc(notebookId, "/路径/文档.md");
```

#### 块操作
```typescript
import { insertBlock, updateBlock, deleteBlock } from '@/api';

// 插入新块
const operations = await insertBlock(
    "markdown",           // 数据类型
    "## 新标题",          // 内容
    undefined,            // nextID
    undefined,            // previousID  
    parentBlockId         // 父块ID
);

// 更新块内容
await updateBlock("dom", "<p>新内容</p>", blockId);

// 删除块
await deleteBlock(blockId);
```

#### SQL查询
```typescript
import { sql, getBlockByID } from '@/api';

// 执行SQL查询
const blocks = await sql(`
    SELECT * FROM blocks 
    WHERE content LIKE '%关键词%' 
    LIMIT 10
`);

// 根据ID获取块
const block = await getBlockByID("20230101120000-abcdefg");
```

### 2. UI组件系统

#### 添加顶栏按钮
```typescript
onLayoutReady() {
    const topBarElement = this.addTopBar({
        icon: "iconFace",              // 图标ID
        title: this.i18n.addTopBarIcon, // 提示文本
        position: "right",             // 位置: left/right
        callback: () => {
            // 点击回调
            this.showMenu();
        }
    });
}
```

#### 添加状态栏
```typescript
onLayoutReady() {
    const statusIcon = document.createElement("div");
    statusIcon.className = "toolbar__item";
    statusIcon.innerHTML = `<svg><use xlink:href="#iconTrashcan"></use></svg>`;
    
    statusIcon.addEventListener("click", () => {
        // 状态栏点击事件
    });

    this.addStatusBar({
        element: statusIcon
    });
}
```

#### 自定义标签页
```typescript
onload() {
    this.addTab({
        type: "custom_tab_type",
        init() {
            // 初始化标签页内容
            const app = new HelloExample({
                target: this.element,
                props: { app: this.app }
            });
        },
        destroy() {
            // 清理资源
            app?.$destroy();
        }
    });
}
```

#### 停靠面板
```typescript
onload() {
    this.addDock({
        config: {
            position: "LeftBottom",        // 位置
            size: { width: 200, height: 0 }, // 尺寸
            icon: "iconSaving",            // 图标
            title: "自定义面板",           // 标题
            hotkey: "⌥⌘W"                // 快捷键
        },
        data: { text: "面板数据" },
        type: "dock_type",
        init: (dock) => {
            // 初始化面板HTML
            dock.element.innerHTML = `<div>面板内容</div>`;
        }
    });
}
```

### 3. 命令系统

```typescript
onload() {
    // 注册命令
    this.addCommand({
        langKey: "showDialog",         // 国际化键
        hotkey: "⇧⌘O",               // 快捷键
        callback: () => {
            this.showDialog();
        },
        // 全局回调(即使没有焦点文档也会执行)
        globalCallback: () => {
            console.log("全局命令执行");
        }
    });
}
```

### 4. 菜单系统

```typescript
import { Menu } from "siyuan";

private addMenu(rect?: DOMRect) {
    const menu = new Menu("menuId", () => {
        console.log("菜单关闭");
    });

    // 添加菜单项
    menu.addItem({
        icon: "iconSettings",
        label: "设置",
        accelerator: "⌘,",           // 快捷键显示
        click: () => {
            this.openSettings();
        }
    });

    // 添加分隔符
    menu.addSeparator();

    // 添加子菜单
    menu.addItem({
        icon: "iconMore",
        label: "更多",
        type: "submenu",
        submenu: [{
            icon: "iconHelp",
            label: "帮助",
            click: () => {}
        }]
    });

    // 显示菜单
    if (this.isMobile) {
        menu.fullscreen();
    } else {
        menu.open({
            x: rect.right,
            y: rect.bottom,
            isLeft: true
        });
    }
}
```

## 🎨 Svelte组件开发

### 基础组件结构

```svelte
<!-- HelloExample.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { showMessage } from "siyuan";
    
    // 组件属性
    export let app;
    export let blockID: string;
    
    // 响应式变量
    let time: string = "";
    let protyle: any;
    
    // 生命周期
    onMount(async () => {
        // 组件挂载时执行
        await initData();
    });
    
    onDestroy(() => {
        // 组件销毁时清理
        protyle?.destroy();
    });
    
    // 异步方法
    async function initData() {
        const response = await fetchPost("/api/system/currentTime", {});
        time = new Date(response.data).toString();
    }
</script>

<!-- HTML模板 -->
<div class="plugin-container">
    <h1>当前时间: {time}</h1>
    <button on:click={() => showMessage("Hello!")}>
        点击我
    </button>
</div>

<!-- 样式 -->
<style lang="scss">
    .plugin-container {
        padding: 1rem;
        
        h1 {
            color: var(--b3-theme-primary);
        }
        
        button {
            @apply bg-blue-500 text-white px-4 py-2 rounded;
        }
    }
</style>
```

### 表单组件

```svelte
<!-- 设置面板组件 -->
<script lang="ts">
    import SettingPanel from "./libs/components/setting-panel.svelte";
    
    let groups = ["基础设置", "高级设置"];
    let focusGroup = groups[0];
    
    const basicSettings: ISettingItem[] = [
        {
            type: 'textinput',
            title: '插件名称',
            description: '显示在界面上的插件名称',
            key: 'pluginName',
            value: 'My Plugin',
            placeholder: '请输入插件名称'
        },
        {
            type: 'checkbox',
            title: '启用功能',
            description: '是否启用核心功能',
            key: 'enableFeature',
            value: true
        },
        {
            type: 'select',
            title: '主题',
            description: '选择界面主题',
            key: 'theme',
            value: 'dark',
            options: {
                'light': '浅色主题',
                'dark': '深色主题', 
                'auto': '跟随系统'
            }
        }
    ];
    
    // 事件处理
    const onSettingChanged = ({ detail }) => {
        console.log(`设置变更: ${detail.key} = ${detail.value}`);
        // 保存设置到插件配置
    };
</script>

<div class="setting-container">
    <ul class="tab-bar">
        {#each groups as group}
            <li 
                class:active={group === focusGroup}
                on:click={() => focusGroup = group}
            >
                {group}
            </li>
        {/each}
    </ul>
    
    <div class="setting-content">
        <SettingPanel
            group={groups[0]}
            settingItems={basicSettings}
            display={focusGroup === groups[0]}
            on:changed={onSettingChanged}
        />
    </div>
</div>
```

## ⚙️ 设置管理系统

### 使用SettingUtils

```typescript
import { SettingUtils } from "./libs/setting-utils";

onload() {
    // 初始化设置管理器
    this.settingUtils = new SettingUtils({
        plugin: this,
        name: "plugin-config",     // 配置文件名
        width: "800px",           // 设置面板宽度
        height: "600px",          // 设置面板高度
        callback: (data) => {     // 保存回调
            console.log("设置已保存:", data);
        }
    });

    // 添加设置项
    this.settingUtils.addItem({
        key: "apiUrl",
        value: "https://api.example.com",
        type: "textinput",
        title: "API地址",
        description: "服务器API的URL地址",
        action: {
            callback: () => {
                // 实时保存
                const value = this.settingUtils.takeAndSave("apiUrl");
                console.log("API地址已更新:", value);
            }
        }
    });

    // 加载已保存的配置
    this.settingUtils.load();
}

// 在代码中使用配置
someMethod() {
    const apiUrl = this.settingUtils.get("apiUrl");
    // 使用配置值...
}
```

### 设置项类型

```typescript
// 文本输入
{
    type: "textinput",
    key: "username",
    value: "",
    placeholder: "请输入用户名"
}

// 多行文本
{
    type: "textarea", 
    key: "description",
    value: "",
    placeholder: "请输入描述"
}

// 复选框
{
    type: "checkbox",
    key: "enabled",
    value: true
}

// 下拉选择
{
    type: "select",
    key: "language",
    value: "zh_CN",
    options: {
        "en_US": "English",
        "zh_CN": "中文"
    }
}

// 滑动条
{
    type: "slider",
    key: "opacity",
    value: 80,
    slider: {
        min: 0,
        max: 100,
        step: 1
    }
}

// 按钮
{
    type: "button",
    key: "reset",
    button: {
        label: "重置设置",
        callback: () => {
            this.resetSettings();
        }
    }
}

// 自定义元素
{
    type: "custom",
    key: "colorPicker",
    createElement: (currentVal) => {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = currentVal;
        return input;
    },
    getEleVal: (ele) => ele.value,
    setEleVal: (ele, val) => ele.value = val
}
```

## 🌐 国际化支持

### 配置文件

`public/i18n/zh_CN.json`:
```json
{
    "helloPlugin": "你好，插件！",
    "settings": "设置",
    "save": "保存",
    "cancel": "取消",
    "confirmDelete": "确认删除 ${name} 吗？"
}
```

`public/i18n/en_US.json`:
```json
{
    "helloPlugin": "Hello, Plugin!",
    "settings": "Settings", 
    "save": "Save",
    "cancel": "Cancel",
    "confirmDelete": "Confirm to delete ${name}?"
}
```

### 在代码中使用

```typescript
// TypeScript中
onload() {
    console.log(this.i18n.helloPlugin);
    
    // 带参数的国际化
    const message = this.i18n.confirmDelete.replace("${name}", "test.md");
    showMessage(message);
}
```

```svelte
<!-- Svelte组件中 -->
<script>
    import { getI18n } from "siyuan";
    const i18n = getI18n();
</script>

<button>{i18n.save}</button>
<p>{i18n.helloPlugin}</p>
```

## 🚌 事件系统

### 监听思源事件

```typescript
onload() {
    // 监听块图标点击
    this.eventBus.on("click-blockicon", this.blockIconEvent.bind(this));
    
    // 监听WebSocket消息
    this.eventBus.on("ws-main", this.onWebSocketMessage.bind(this));
    
    // 监听编辑器内容点击
    this.eventBus.on("click-editorcontent", this.onEditorClick.bind(this));
}

private blockIconEvent({ detail }) {
    // 添加右键菜单项
    detail.menu.addItem({
        id: "myPlugin_action",
        iconHTML: "",
        label: "我的插件操作",
        click: () => {
            // 处理块操作
            const blockElements = detail.blockElements;
            blockElements.forEach((element) => {
                // 操作每个选中的块
            });
        }
    });
}

onunload() {
    // 移除事件监听
    this.eventBus.off("click-blockicon", this.blockIconEvent);
}
```

### 可用事件列表

| 事件名 | 说明 | 详情数据 |
|--------|------|----------|
| `click-blockicon` | 块图标点击 | `{menu, blockElements, protyle}` |
| `click-editorcontent` | 编辑器内容点击 | `{protyle, event}` |
| `loaded-protyle-static` | 编辑器静态加载完成 | `{protyle}` |
| `loaded-protyle-dynamic` | 编辑器动态加载完成 | `{protyle}` |
| `switch-protyle` | 切换编辑器 | `{protyle}` |
| `destroy-protyle` | 销毁编辑器 | `{protyle}` |
| `ws-main` | WebSocket主消息 | `{cmd, data}` |
| `paste` | 粘贴事件 | `{textPlain, textHtml, files}` |

## 🎭 对话框系统

### 使用dialog工具类

```typescript
import { 
    inputDialog, 
    confirmDialog, 
    simpleDialog, 
    svelteDialog 
} from "./libs/dialog";

// 输入对话框
inputDialog({
    title: "请输入内容",
    placeholder: "在这里输入...",
    defaultText: "默认值",
    confirm: (text) => {
        console.log("用户输入:", text);
    },
    cancel: () => {
        console.log("用户取消");
    }
});

// 确认对话框
confirmDialog({
    title: "确认操作",
    content: "您确定要执行这个操作吗？",
    confirm: () => {
        // 执行操作
    }
});

// Svelte组件对话框
svelteDialog({
    title: "设置",
    width: "600px",
    height: "400px",
    constructor: (container) => {
        return new SettingExample({
            target: container
        });
    },
    callback: () => {
        console.log("对话框关闭");
    }
});
```

## 🔍 调试技巧

### 1. 浏览器开发者工具

```typescript
// 在代码中添加断点
debugger;

// 输出调试信息
console.log("调试信息:", data);
console.warn("警告:", warning);
console.error("错误:", error);

// 检查对象
console.table(arrayData);
console.dir(objectData);
```

### 2. 思源笔记调试

```typescript
// 获取当前编辑器
const editor = getAllEditor()[0];
console.log("当前编辑器:", editor);

// 获取选中的块
const selectedBlocks = editor.protyle.wysiwyg.element.querySelectorAll('.protyle-wysiwyg--select');
console.log("选中的块:", selectedBlocks);

// 检查插件状态
console.log("插件数据:", this.data);
console.log("插件设置:", this.settingUtils.dump());
```

### 3. 性能监控

```typescript
// 测量函数执行时间
console.time("操作耗时");
await someAsyncOperation();
console.timeEnd("操作耗时");

// 内存使用监控
const memBefore = performance.memory.usedJSHeapSize;
// ... 执行操作 ...
const memAfter = performance.memory.usedJSHeapSize;
console.log("内存增量:", memAfter - memBefore, "bytes");
```

---

*上一章节: [开发环境搭建](./SETUP_GUIDE.md) | 下一章节: [构建与部署](./DEPLOYMENT_GUIDE.md)*
