# ✨ 最佳实践指南

## 📝 代码规范

### 1. TypeScript 代码风格

#### 命名约定
```typescript
// 类名：大驼峰命名
class PluginManager {
    // 私有属性：下划线前缀
    private _settingUtils: SettingUtils;
    
    // 公共属性：小驼峰命名
    public isMobile: boolean;
    
    // 常量：全大写下划线分隔
    private static readonly DEFAULT_CONFIG = {
        TIMEOUT: 5000,
        MAX_RETRY: 3
    };
    
    // 方法名：小驼峰命名，动词开头
    public async loadConfiguration(): Promise<void> {
        // 局部变量：小驼峰命名
        const configData = await this.fetchConfig();
    }
    
    // 私有方法：下划线前缀
    private _validateConfig(config: any): boolean {
        return config !== null;
    }
}

// 接口：I前缀，大驼峰命名
interface IPluginConfig {
    apiUrl: string;
    timeout: number;
}

// 类型别名：大驼峰命名
type BlockOperationType = 'insert' | 'update' | 'delete';

// 枚举：大驼峰命名
enum PluginStatus {
    LOADING = 'loading',
    READY = 'ready',
    ERROR = 'error'
}
```

#### 函数设计原则
```typescript
// ✅ 好的函数设计
class BlockManager {
    // 单一职责：只负责创建块
    async createBlock(content: string, parentId: BlockId): Promise<BlockId> {
        const blockData = this._formatBlockContent(content);
        return await insertBlock("markdown", blockData, undefined, undefined, parentId);
    }
    
    // 纯函数：无副作用，相同输入产生相同输出
    private _formatBlockContent(content: string): string {
        return content.trim().replace(/\n{3,}/g, '\n\n');
    }
    
    // 错误处理：明确的错误类型
    async updateBlock(blockId: BlockId, content: string): Promise<void> {
        if (!blockId) {
            throw new Error('BlockId is required');
        }
        
        try {
            await updateBlock("markdown", content, blockId);
        } catch (error) {
            throw new Error(`Failed to update block ${blockId}: ${error.message}`);
        }
    }
}

// ❌ 避免的模式
class BadExample {
    // 职责过多的函数
    async doEverything(data: any): Promise<any> {
        // 验证数据
        // 处理业务逻辑
        // 更新UI
        // 保存到文件
        // 发送通知
        // ... 太多职责
    }
    
    // 全局状态修改
    updateGlobalState(newValue: any): void {
        window.globalData = newValue; // 避免直接修改全局状态
    }
}
```

### 2. Svelte 组件规范

#### 组件结构标准
```svelte
<!-- ComponentName.svelte -->
<script lang="ts">
    // 1. 导入依赖（按类型分组）
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { showMessage } from 'siyuan';
    import type { IComponentProps } from '@/types';
    
    // 2. 组件属性定义
    export let title: string;
    export let data: IComponentProps;
    export let onSave: (data: any) => void = () => {};
    
    // 3. 事件派发器
    const dispatch = createEventDispatcher<{
        save: { data: any };
        cancel: void;
    }>();
    
    // 4. 响应式变量
    let isLoading = false;
    let errorMessage = '';
    
    // 5. 计算属性
    $: hasError = errorMessage.length > 0;
    $: canSave = !isLoading && !hasError;
    
    // 6. 生命周期函数
    onMount(async () => {
        await initializeComponent();
    });
    
    onDestroy(() => {
        cleanup();
    });
    
    // 7. 事件处理函数
    async function handleSave() {
        if (!canSave) return;
        
        try {
            isLoading = true;
            await onSave(data);
            dispatch('save', { data });
        } catch (error) {
            errorMessage = error.message;
        } finally {
            isLoading = false;
        }
    }
    
    // 8. 工具函数
    function cleanup() {
        // 清理资源
    }
    
    async function initializeComponent() {
        // 初始化逻辑
    }
</script>

<!-- HTML模板：保持简洁，复杂逻辑提取到script中 -->
<div class="component-container" class:loading={isLoading}>
    <header class="component-header">
        <h2>{title}</h2>
    </header>
    
    <main class="component-content">
        {#if hasError}
            <div class="error-message" role="alert">
                {errorMessage}
            </div>
        {/if}
        
        <slot />
    </main>
    
    <footer class="component-actions">
        <button 
            type="button"
            disabled={!canSave}
            on:click={handleSave}
        >
            {isLoading ? '保存中...' : '保存'}
        </button>
    </footer>
</div>

<!-- 样式：使用SCSS，遵循BEM命名 -->
<style lang="scss">
    .component-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        
        &.loading {
            opacity: 0.7;
            pointer-events: none;
        }
    }
    
    .component-header {
        padding: 1rem;
        border-bottom: 1px solid var(--b3-theme-surface-lighter);
        
        h2 {
            margin: 0;
            font-size: 1.2rem;
            color: var(--b3-theme-on-surface);
        }
    }
    
    .component-content {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
    }
    
    .error-message {
        background-color: var(--b3-theme-error-lighter);
        color: var(--b3-theme-error);
        padding: 0.75rem;
        border-radius: 4px;
        margin-bottom: 1rem;
    }
    
    .component-actions {
        padding: 1rem;
        border-top: 1px solid var(--b3-theme-surface-lighter);
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        
        button {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            background-color: var(--b3-theme-primary);
            color: var(--b3-theme-on-primary);
            cursor: pointer;
            
            &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            &:hover:not(:disabled) {
                background-color: var(--b3-theme-primary-hover);
            }
        }
    }
</style>
```

### 3. 样式规范

#### CSS变量使用
```scss
// 使用思源笔记的设计系统变量
.plugin-container {
    // 颜色
    background-color: var(--b3-theme-background);
    color: var(--b3-theme-on-background);
    border: 1px solid var(--b3-theme-surface-lighter);
    
    // 间距（使用思源的间距系统）
    padding: var(--b3-space-medium);
    margin: var(--b3-space-small);
    
    // 字体
    font-family: var(--b3-font-family);
    font-size: var(--b3-font-size-base);
    
    // 阴影
    box-shadow: var(--b3-shadow-1);
    
    // 圆角
    border-radius: var(--b3-border-radius);
    
    // 过渡
    transition: var(--b3-transition-default);
}

// 响应式设计
.responsive-grid {
    display: grid;
    gap: 1rem;
    
    // 桌面端
    @media (min-width: 768px) {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
    
    // 移动端
    @media (max-width: 767px) {
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }
}
```

## 🎯 性能优化

### 1. 组件性能优化

#### 避免不必要的重渲染
```svelte
<script lang="ts">
    import { writable, derived } from 'svelte/store';
    
    // ✅ 使用计算属性避免重复计算
    $: filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // ✅ 使用stores管理状态
    const itemsStore = writable([]);
    const searchStore = writable('');
    
    const filteredStore = derived(
        [itemsStore, searchStore],
        ([$items, $search]) => $items.filter(item => 
            item.name.toLowerCase().includes($search.toLowerCase())
        )
    );
    
    // ❌ 避免在模板中直接计算
    // {items.filter(item => item.name.includes(searchTerm))}
</script>

<!-- ✅ 使用key优化列表渲染 -->
{#each filteredItems as item (item.id)}
    <ItemComponent {item} />
{/each}
```

#### 懒加载和代码分割
```typescript
// 动态导入大型组件
async function loadHeavyComponent() {
    const module = await import('./HeavyComponent.svelte');
    return module.default;
}

// 条件加载
let HeavyComponent: any = null;

async function showHeavyComponent() {
    if (!HeavyComponent) {
        HeavyComponent = await loadHeavyComponent();
    }
    // 使用组件
}
```

### 2. API调用优化

#### 请求防抖和节流
```typescript
class APIManager {
    private _debounceTimers = new Map<string, NodeJS.Timeout>();
    private _requestCache = new Map<string, any>();
    
    // 防抖：延迟执行，适用于搜索输入
    debounce<T extends any[]>(
        key: string,
        fn: (...args: T) => void,
        delay: number = 300
    ) {
        return (...args: T) => {
            if (this._debounceTimers.has(key)) {
                clearTimeout(this._debounceTimers.get(key)!);
            }
            
            const timer = setTimeout(() => {
                fn(...args);
                this._debounceTimers.delete(key);
            }, delay);
            
            this._debounceTimers.set(key, timer);
        };
    }
    
    // 缓存机制
    async cachedRequest(url: string, params: any, ttl: number = 60000): Promise<any> {
        const cacheKey = `${url}_${JSON.stringify(params)}`;
        const cached = this._requestCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.data;
        }
        
        const data = await request(url, params);
        this._requestCache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
        
        return data;
    }
    
    // 批量请求
    async batchRequests<T>(requests: (() => Promise<T>)[]): Promise<T[]> {
        return Promise.all(requests.map(req => req()));
    }
}
```

### 3. 内存管理

#### 清理资源
```typescript
class PluginManager {
    private _subscriptions: (() => void)[] = [];
    private _timers: NodeJS.Timeout[] = [];
    
    onload() {
        // 添加事件监听时记录清理函数
        const unsubscribe = this.eventBus.on('event', this.handler);
        this._subscriptions.push(unsubscribe);
        
        // 记录定时器
        const timer = setInterval(this.periodicTask, 1000);
        this._timers.push(timer);
    }
    
    onunload() {
        // 清理所有订阅
        this._subscriptions.forEach(unsubscribe => unsubscribe());
        this._subscriptions = [];
        
        // 清理所有定时器
        this._timers.forEach(timer => clearInterval(timer));
        this._timers = [];
        
        // 清理缓存
        this._requestCache.clear();
    }
}
```

## 🛡️ 错误处理

### 1. 异常处理策略

#### 分层错误处理
```typescript
// 错误类型定义
class PluginError extends Error {
    constructor(
        message: string,
        public code: string,
        public context?: any
    ) {
        super(message);
        this.name = 'PluginError';
    }
}

class APIError extends PluginError {
    constructor(message: string, public statusCode: number, context?: any) {
        super(message, 'API_ERROR', context);
    }
}

// API层错误处理
class APIService {
    async request(url: string, data: any): Promise<any> {
        try {
            const response = await fetchSyncPost(url, data);
            
            if (response.code !== 0) {
                throw new APIError(
                    response.msg || 'API request failed',
                    response.code,
                    { url, data }
                );
            }
            
            return response.data;
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            
            // 网络错误等
            throw new APIError('Network error', 500, { originalError: error });
        }
    }
}

// 业务层错误处理
class BlockService {
    constructor(private apiService: APIService) {}
    
    async createBlock(content: string, parentId: BlockId): Promise<BlockId> {
        try {
            if (!content.trim()) {
                throw new PluginError('Content cannot be empty', 'INVALID_INPUT');
            }
            
            const result = await this.apiService.request('/api/block/insertBlock', {
                dataType: 'markdown',
                data: content,
                parentID: parentId
            });
            
            return result[0]?.doOperations?.[0]?.id;
        } catch (error) {
            if (error instanceof PluginError) {
                throw error;
            }
            
            throw new PluginError(
                'Failed to create block',
                'BLOCK_CREATION_FAILED',
                { content, parentId, originalError: error }
            );
        }
    }
}

// UI层错误处理
class UIManager {
    async handleAction(action: () => Promise<void>) {
        try {
            await action();
        } catch (error) {
            this.handleError(error);
        }
    }
    
    private handleError(error: Error) {
        console.error('Plugin error:', error);
        
        if (error instanceof APIError) {
            if (error.statusCode >= 500) {
                showMessage('服务器错误，请稍后重试', 6000, 'error');
            } else {
                showMessage(`请求失败: ${error.message}`, 4000, 'error');
            }
        } else if (error instanceof PluginError) {
            switch (error.code) {
                case 'INVALID_INPUT':
                    showMessage('输入数据无效', 3000, 'error');
                    break;
                default:
                    showMessage(`操作失败: ${error.message}`, 4000, 'error');
            }
        } else {
            showMessage('未知错误，请查看控制台', 5000, 'error');
        }
    }
}
```

### 2. 用户友好的错误提示

```typescript
class ErrorMessageManager {
    private readonly errorMessages = {
        'zh_CN': {
            'NETWORK_ERROR': '网络连接失败，请检查网络设置',
            'INVALID_INPUT': '输入内容不符合要求',
            'PERMISSION_DENIED': '权限不足，无法执行操作',
            'RESOURCE_NOT_FOUND': '请求的资源不存在'
        },
        'en_US': {
            'NETWORK_ERROR': 'Network connection failed',
            'INVALID_INPUT': 'Invalid input data',
            'PERMISSION_DENIED': 'Permission denied',
            'RESOURCE_NOT_FOUND': 'Resource not found'
        }
    };
    
    getErrorMessage(code: string, language: string = 'zh_CN'): string {
        return this.errorMessages[language]?.[code] || 
               this.errorMessages['en_US'][code] || 
               '未知错误';
    }
}
```

## 🔐 安全最佳实践

### 1. 输入验证
```typescript
class InputValidator {
    static validateBlockId(id: string): boolean {
        // 思源笔记块ID格式：YYYYMMDDHHMMSS-7位随机字符
        const blockIdPattern = /^\d{14}-[a-z0-9]{7}$/;
        return blockIdPattern.test(id);
    }
    
    static validatePath(path: string): boolean {
        // 防止路径遍历攻击
        const normalizedPath = path.normalize();
        return !normalizedPath.includes('..') && 
               !normalizedPath.startsWith('/') &&
               normalizedPath.length <= 255;
    }
    
    static sanitizeHTML(content: string): string {
        // 移除潜在的危险HTML标签
        return content
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
    }
    
    static validateFileSize(file: File, maxSize: number = 5 * 1024 * 1024): boolean {
        return file.size <= maxSize; // 默认5MB限制
    }
}
```

### 2. 数据加密
```typescript
class DataSecurity {
    // 敏感数据加密存储
    async encryptSensitiveData(data: string, key: string): Promise<string> {
        // 实际项目中应使用专业的加密库
        const encoder = new TextEncoder();
        const keyBuffer = await crypto.subtle.importKey(
            'raw',
            encoder.encode(key),
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            keyBuffer,
            encoder.encode(data)
        );
        
        return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    }
}
```

## 🧪 测试策略

### 1. 单元测试
```typescript
// 使用Vitest进行单元测试
import { describe, it, expect, vi } from 'vitest';
import { BlockService } from '@/services/BlockService';

describe('BlockService', () => {
    it('should create block with valid content', async () => {
        const mockAPI = vi.fn().mockResolvedValue([{
            doOperations: [{ id: 'test-block-id' }]
        }]);
        
        const blockService = new BlockService({ request: mockAPI });
        const result = await blockService.createBlock('Test content', 'parent-id');
        
        expect(result).toBe('test-block-id');
        expect(mockAPI).toHaveBeenCalledWith('/api/block/insertBlock', {
            dataType: 'markdown',
            data: 'Test content',
            parentID: 'parent-id'
        });
    });
    
    it('should throw error for empty content', async () => {
        const blockService = new BlockService({ request: vi.fn() });
        
        await expect(
            blockService.createBlock('', 'parent-id')
        ).rejects.toThrow('Content cannot be empty');
    });
});
```

### 2. 集成测试
```typescript
// 测试插件生命周期
describe('Plugin Integration', () => {
    let plugin: PluginSample;
    
    beforeEach(() => {
        plugin = new PluginSample();
    });
    
    it('should initialize correctly', async () => {
        await plugin.onload();
        
        expect(plugin.settingUtils).toBeDefined();
        expect(plugin.data).toHaveProperty('menu-config');
    });
    
    it('should clean up on unload', async () => {
        await plugin.onload();
        const cleanupSpy = vi.spyOn(plugin, 'removeData');
        
        await plugin.onunload();
        
        expect(cleanupSpy).toHaveBeenCalled();
    });
});
```

## 📚 文档规范

### 1. API文档
```typescript
/**
 * 创建新的文档块
 * 
 * @param content - 块的内容，支持Markdown格式
 * @param parentId - 父块的ID，如果为空则创建为根块
 * @param options - 可选配置
 * @returns Promise<BlockId> 新创建块的ID
 * 
 * @example
 * ```typescript
 * const blockId = await createBlock(
 *   '# 新标题\n\n这是内容',
 *   'parent-block-id'
 * );
 * ```
 * 
 * @throws {PluginError} 当内容为空或父块不存在时抛出错误
 * 
 * @since 1.0.0
 */
async function createBlock(
    content: string,
    parentId?: BlockId,
    options?: CreateBlockOptions
): Promise<BlockId> {
    // 实现...
}
```

### 2. README文档结构
```markdown
# 插件名称

简要描述插件的功能和用途。

## 功能特性

- ✅ 特性1
- ✅ 特性2  
- 🚧 开发中的特性

## 安装说明

### 从集市安装（推荐）
1. 打开思源笔记
2. 进入集市 -> 插件
3. 搜索"插件名称"
4. 点击安装

### 手动安装
[详细步骤...]

## 使用方法

### 基础使用
[截图和说明...]

### 高级配置
[配置项说明...]

## API文档

详见 [API.md](./API.md)

## 开发指南

详见 [DEVELOPMENT.md](./DEVELOPMENT.md)

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

## 贡献指南

1. Fork本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交改动：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建Pull Request

## 许可证

[MIT License](./LICENSE)

## 支持

- 🐛 [问题反馈](./issues)
- 💬 [讨论区](./discussions)
- 📧 联系邮箱：xxx@example.com
```

## 🌟 插件扩展指南

### 1. 插件架构设计
```typescript
// 插件模块化架构
interface IPluginModule {
    name: string;
    version: string;
    init(plugin: Plugin): Promise<void>;
    destroy(): Promise<void>;
}

class ModularPlugin extends Plugin {
    private modules: Map<string, IPluginModule> = new Map();
    
    async onload() {
        // 加载核心模块
        await this.loadModule(new CoreModule());
        await this.loadModule(new UIModule());
        await this.loadModule(new APIModule());
    }
    
    async loadModule(module: IPluginModule) {
        await module.init(this);
        this.modules.set(module.name, module);
    }
    
    async onunload() {
        for (const module of this.modules.values()) {
            await module.destroy();
        }
        this.modules.clear();
    }
}
```

### 2. 插件间通信
```typescript
// 事件总线扩展
class PluginEventBus {
    private static instance: PluginEventBus;
    private listeners = new Map<string, Function[]>();
    
    static getInstance(): PluginEventBus {
        if (!this.instance) {
            this.instance = new PluginEventBus();
        }
        return this.instance;
    }
    
    emit(event: string, data: any): void {
        const handlers = this.listeners.get(event) || [];
        handlers.forEach(handler => handler(data));
    }
    
    on(event: string, handler: Function): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(handler);
        
        // 返回取消订阅函数
        return () => {
            const handlers = this.listeners.get(event) || [];
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        };
    }
}
```

### 3. 第三方库集成
```typescript
// 安全的第三方库加载
class LibraryLoader {
    private static loadedLibs = new Set<string>();
    
    static async loadLibrary(name: string, url: string): Promise<any> {
        if (this.loadedLibs.has(name)) {
            return window[name];
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => {
                this.loadedLibs.add(name);
                resolve(window[name]);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// 使用示例
class ChartPlugin extends Plugin {
    private chart: any;
    
    async onload() {
        // 动态加载Chart.js
        const Chart = await LibraryLoader.loadLibrary(
            'Chart', 
            'https://cdn.jsdelivr.net/npm/chart.js'
        );
        
        this.chart = new Chart(/* ... */);
    }
}
```

---

*上一章节: [构建与部署](./DEPLOYMENT_GUIDE.md)*

## 🎉 总结

这份完整的Wiki文档涵盖了思源笔记插件开发的所有重要方面：

- **架构设计**: 深入理解项目结构和技术选型
- **环境搭建**: 从零开始的完整开发环境配置
- **开发实践**: 核心API使用和组件开发技巧
- **构建部署**: 从开发到生产的完整流程
- **最佳实践**: 代码规范、性能优化、错误处理等

遵循这些指南，你将能够开发出高质量、可维护的思源笔记插件。
