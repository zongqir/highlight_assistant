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
    // 高亮助手相关 - 手机版专用
    private toolbarHijacker: ToolbarHijacker | null = null;

    async onload() {
        console.log("loading highlight-assistant", this.i18n);

        const frontEnd = getFrontend();
        const backEnd = getBackend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        
        // 详细的环境检测
        console.log("🔍 环境检测:", {
            frontEnd,
            backEnd,
            isMobile: this.isMobile,
            userAgent: navigator.userAgent,
            screenWidth: window.innerWidth,
            touchSupport: 'ontouchstart' in window
        });
        
        // 启动弹窗 - 证明插件已部署
        const modeText = this.isMobile ? " [手机版模式]" : " [桌面版模式]";
        const envText = ` (${frontEnd}/${backEnd})`;
        showMessage("🎉 高亮助手已成功加载！" + modeText + envText, 5000);
        
        // 额外的手机版确认
        if (this.isMobile) {
            setTimeout(() => {
                showMessage("📱 已确认为手机版环境，正在初始化工具栏劫持...", 3000);
            }, 1000);
        }
        
        // 只支持手机版
        if (this.isMobile) {
            this.initToolbarHijacker();
        } else {
            showMessage("⚠️ 此插件专为手机版设计，桌面版暂不支持", 3000);
        }

        console.log(this.i18n.helloPlugin);
    }

    onLayoutReady() {
        // 在 onLayoutReady 中启动手机版劫持（确保编辑器完全加载）
        if (this.isMobile && this.toolbarHijacker) {
            setTimeout(() => {
                console.log('[Plugin] 在 onLayoutReady 中启动工具栏劫持...');
                this.toolbarHijacker.hijack();
                
                // 再次确认劫持成功
                setTimeout(() => {
                    if (this.toolbarHijacker?.hijacked) {
                        showMessage("📱 手机版工具栏劫持成功！请选择文本测试高亮功能", 4000);
                    } else {
                        showMessage("⚠️ 手机版工具栏劫持失败，请查看控制台", 4000);
                    }
                }, 1000);
                
                // 添加全局调试函数
                (window as any).testHijack = () => {
                    console.log('🧪 手动测试劫持状态...');
                    console.log('- 劫持器存在:', !!this.toolbarHijacker);
                    console.log('- 劫持状态:', this.toolbarHijacker?.hijacked);
                    console.log('- 是否手机版:', this.isMobile);
                    
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
        
        showMessage("Goodbye Highlight Assistant");
        console.log("onunload");
    }

    uninstall() {
        console.log("uninstall");
    }

    /**
     * 初始化工具栏劫持器（手机版）
     */
    private initToolbarHijacker(): void {
        try {
            this.toolbarHijacker = new ToolbarHijacker(this.isMobile);
            console.log('工具栏劫持器创建完成，将在 onLayoutReady 中启动');
            
        } catch (error) {
            console.error('工具栏劫持器初始化失败:', error);
            showMessage(`手机版高亮初始化失败: ${error.message}`, 5000, 'error');
        }
    }
}