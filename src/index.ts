import {
    Plugin,
    showMessage,
    getFrontend,
    getBackend,
    getAllEditor,
} from "siyuan";
import "./index.scss";

// 导入高亮助手模块
import { ToolbarHijacker } from "./utils/toolbarHijacker";

export default class HighlightAssistantPlugin extends Plugin {
    private isMobile: boolean;
    private isDesktop: boolean;
    // 高亮助手相关 - 支持手机版和电脑版
    private toolbarHijacker: ToolbarHijacker | null = null;

    async onload() {
        console.log("loading highlight-assistant", this.i18n);

        const frontEnd = getFrontend();
        const backEnd = getBackend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        this.isDesktop = frontEnd === "desktop" || frontEnd === "browser-desktop";
        
        // 详细的环境检测
        console.log("🔍 环境检测:", {
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

        console.log(this.i18n.helloPlugin);
    }

    onLayoutReady() {
        // 在 onLayoutReady 中启动工具栏劫持（确保编辑器完全加载）
        if ((this.isMobile || this.isDesktop) && this.toolbarHijacker) {
            setTimeout(() => {
                console.log('[Plugin] 在 onLayoutReady 中启动工具栏劫持...');
                this.toolbarHijacker.hijack();
                
                // 静默确认劫持状态（仅在控制台记录）
                setTimeout(() => {
                    if (this.toolbarHijacker?.hijacked) {
                        console.log(`✅ ${this.isMobile ? '手机版' : '电脑版'}工具栏劫持成功`);
                    } else {
                        console.warn(`⚠️ ${this.isMobile ? '手机版' : '电脑版'}工具栏劫持失败`);
                    }
                }, 1000);
                
                // 添加全局调试函数
                (window as any).testHijack = () => {
                    console.log('🧪 手动测试劫持状态...');
                    console.log('- 劫持器存在:', !!this.toolbarHijacker);
                    console.log('- 劫持状态:', this.toolbarHijacker?.hijacked);
                    console.log('- 是否手机版:', this.isMobile);
                    console.log('- 是否电脑版:', this.isDesktop);
                    
                    const editors = getAllEditor();
                    console.log('- 编辑器数量:', editors.length);
                    editors.forEach((editor, i) => {
                        console.log(`- 编辑器${i}:`, {
                            hasProtyle: !!editor.protyle,
                            hasToolbar: !!(editor.protyle?.toolbar),
                            hasShowContent: !!(editor.protyle?.toolbar?.showContent)
                        });
                    });
                };
                
                console.log('💡 可以在控制台运行 testHijack() 来检查劫持状态');
                
            }, 2000);
        }
        
        console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);
    }

    async onunload() {
        console.log(this.i18n.byePlugin);
        
        // 销毁工具栏劫持器
        if (this.toolbarHijacker) {
            this.toolbarHijacker.unhijack();
            this.toolbarHijacker = null;
        }
        
        // 静默卸载
        console.log("onunload");
    }

    uninstall() {
        console.log("uninstall");
    }

    /**
     * 初始化工具栏劫持器（支持手机版和电脑版）
     */
    private initToolbarHijacker(): void {
        try {
            this.toolbarHijacker = new ToolbarHijacker(this.isMobile, this.isDesktop);
            console.log(`工具栏劫持器创建完成，将在 onLayoutReady 中启动 (${this.isMobile ? '手机版' : '电脑版'})`);
            
        } catch (error) {
            console.error('工具栏劫持器初始化失败:', error);
            // 静默处理错误，不显示弹窗
        }
    }
}