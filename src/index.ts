import {
    Plugin,
    showMessage,
    getFrontend,
    getBackend,
    getAllEditor,
} from "siyuan";
import "./index.scss";
import Logger from "./utils/logger";

// 导入高亮助手模块
import { ToolbarHijacker } from "./utils/toolbarHijacker";

export default class HighlightAssistantPlugin extends Plugin {
    private isMobile: boolean;
    private isDesktop: boolean;
    // 高亮助手相关 - 支持手机版和电脑版
    private toolbarHijacker: ToolbarHijacker | null = null;

    async onload() {
        Logger.log("loading highlight-assistant", this.i18n);

        const frontEnd = getFrontend();
        const backEnd = getBackend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        this.isDesktop = frontEnd === "desktop" || frontEnd === "browser-desktop";
        
        // 详细的环境检测
        Logger.log("🔍 环境检测:", {
            frontEnd,
            backEnd,
            isMobile: this.isMobile,
            isDesktop: this.isDesktop,
            userAgent: navigator.userAgent,
            screenWidth: window.innerWidth,
            touchSupport: 'ontouchstart' in window
        });
        
        // 静默加载，不显示弹窗
        
        // 支持手机版和电脑版
        if (this.isMobile || this.isDesktop) {
            this.initToolbarHijacker();
        }

        Logger.log(this.i18n.helloPlugin);
    }

    onLayoutReady() {
        // 在 onLayoutReady 中启动工具栏劫持（确保编辑器完全加载）
        if ((this.isMobile || this.isDesktop) && this.toolbarHijacker) {
            setTimeout(async () => {
                Logger.log('[Plugin] 在 onLayoutReady 中启动工具栏劫持...');
                await this.toolbarHijacker.hijack();
                
                // 静默确认劫持状态（仅在控制台记录）
                setTimeout(() => {
                    if (this.toolbarHijacker?.hijacked) {
                        Logger.log(`✅ ${this.isMobile ? '手机版' : '电脑版'}工具栏劫持成功`);
                    } else {
                        Logger.warn(`⚠️ ${this.isMobile ? '手机版' : '电脑版'}工具栏劫持失败`);
                    }
                }, 1000);
                
                // 添加全局调试函数
                (window as any).testHijack = () => {
                    Logger.log('🧪 手动测试劫持状态...');
                    Logger.log('- 劫持器存在:', !!this.toolbarHijacker);
                    Logger.log('- 劫持状态:', this.toolbarHijacker?.hijacked);
                    Logger.log('- 是否手机版:', this.isMobile);
                    Logger.log('- 是否电脑版:', this.isDesktop);
                    
                    const editors = getAllEditor();
                    Logger.log('- 编辑器数量:', editors.length);
                    editors.forEach((editor, i) => {
                        Logger.log(`- 编辑器${i}:`, {
                            hasProtyle: !!editor.protyle,
                            hasToolbar: !!(editor.protyle?.toolbar),
                            hasShowContent: !!(editor.protyle?.toolbar?.showContent)
                        });
                    });
                };
                
                // 添加高亮点击调试控制命令
                (window as any).highlightDebug = {
                    enable: () => {
                        const manager = this.toolbarHijacker?.getHighlightClickManager();
                        if (manager) {
                            manager.enableDebug();
                        } else {
                            Logger.error('❌ 高亮点击管理器不可用');
                        }
                    },
                    disable: () => {
                        const manager = this.toolbarHijacker?.getHighlightClickManager();
                        if (manager) {
                            manager.disableDebug();
                        } else {
                            Logger.error('❌ 高亮点击管理器不可用');
                        }
                    }
                };
                
                // 添加标签管理调试控制命令
                (window as any).tagDebug = {
                    enable: () => {
                        const manager = this.toolbarHijacker?.getTagManager();
                        if (manager) {
                            manager.enableDebug();
                        } else {
                            Logger.error('❌ 标签管理器不可用');
                        }
                    },
                    disable: () => {
                        const manager = this.toolbarHijacker?.getTagManager();
                        if (manager) {
                            manager.disableDebug();
                        } else {
                            Logger.error('❌ 标签管理器不可用');
                        }
                    }
                };
                
                // 添加标签点击调试控制命令
                (window as any).tagClickDebug = {
                    enable: () => {
                        const manager = this.toolbarHijacker?.getTagClickManager();
                        if (manager) {
                            manager.enableDebug();
                        } else {
                            Logger.error('❌ 标签点击管理器不可用');
                        }
                    },
                    disable: () => {
                        const manager = this.toolbarHijacker?.getTagClickManager();
                        if (manager) {
                            manager.disableDebug();
                        } else {
                            Logger.error('❌ 标签点击管理器不可用');
                        }
                    }
                };
                
                Logger.log('💡 可用命令:');
                Logger.log('  - testHijack() - 检查劫持状态');
                Logger.log('  - highlightDebug.enable() - 开启高亮点击调试');
                Logger.log('  - highlightDebug.disable() - 关闭高亮点击调试');
                Logger.log('  - tagDebug.enable() - 开启标签管理调试');
                Logger.log('  - tagDebug.disable() - 关闭标签管理调试');
                Logger.log('  - tagClickDebug.enable() - 开启标签点击调试');
                Logger.log('  - tagClickDebug.disable() - 关闭标签点击调试');
                Logger.log('💡 操作提示:');
                Logger.log('  - 桌面版：右键点击块 - 快速打标签（仅锁定状态）');
                Logger.log('  - 手机版：长按块（500ms）- 快速打标签（仅锁定状态）');
                Logger.log('  - 点击标签 - 显示自定义搜索面板（已替代原生搜索）');
                
            }, 2000);
        }
        
        Logger.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);
    }

    async onunload() {
        Logger.log(this.i18n.byePlugin);
        
        // 销毁工具栏劫持器
        if (this.toolbarHijacker) {
            this.toolbarHijacker.unhijack();
            this.toolbarHijacker = null;
        }
        
        // 静默卸载
        Logger.log("onunload");
    }

    uninstall() {
        Logger.log("uninstall");
    }

    /**
     * 初始化工具栏劫持器（支持手机版和电脑版）
     */
    private initToolbarHijacker(): void {
        try {
            this.toolbarHijacker = new ToolbarHijacker(this.isMobile, this.isDesktop);
            Logger.log(`工具栏劫持器创建完成，将在 onLayoutReady 中启动 (${this.isMobile ? '手机版' : '电脑版'})`);
            
        } catch (error) {
            Logger.error('工具栏劫持器初始化失败:', error);
            // 静默处理错误，不显示弹窗
        }
    }
}
