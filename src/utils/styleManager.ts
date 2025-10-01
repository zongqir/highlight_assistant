/**
 * 样式管理器 - 统一管理工具栏按钮样式
 * 从 toolbarHijacker.ts 中提取，减少主文件大小
 */

/**
 * 高亮颜色配置 - 全局统一
 */
export const HIGHLIGHT_COLORS = [
    { name: 'yellow' as const, bg: '#fff3cd', displayName: '黄色高亮' },
    { name: 'green' as const, bg: '#d4edda', displayName: '绿色高亮' },
    { name: 'blue' as const, bg: '#cce5ff', displayName: '蓝色高亮' },
    { name: 'pink' as const, bg: '#fce4ec', displayName: '粉色高亮' }
] as const;

export class StyleManager {
    /**
     * 获取高亮按钮样式
     */
    static getHighlightButtonStyle(isMobile: boolean, backgroundColor: string): string {
        const buttonSize = isMobile ? '22px' : '28px';
        const borderRadius = isMobile ? '50%' : '6px';
        const margin = isMobile ? 'auto 2px' : 'auto 4px';
        
        return `
            background: ${backgroundColor} !important;
            border: none !important;
            border-radius: ${borderRadius} !important;
            width: ${buttonSize} !important;
            height: ${buttonSize} !important;
            margin: ${margin} !important;
            padding: 0 !important;
            display: inline-block !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2) !important;
            vertical-align: middle !important;
        `;
    }

    /**
     * 获取移除高亮按钮样式（白色小球）
     */
    static getRemoveButtonStyle(isMobile: boolean): string {
        const buttonSize = isMobile ? '22px' : '28px';
        const borderRadius = isMobile ? '50%' : '6px';
        const margin = isMobile ? 'auto 2px' : 'auto 4px';
        
        return `
            background: #ffffff !important;
            border: 1px solid #ddd !important;
            border-radius: ${borderRadius} !important;
            width: ${buttonSize} !important;
            height: ${buttonSize} !important;
            margin: ${margin} !important;
            padding: 0 !important;
            display: inline-block !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2) !important;
            vertical-align: middle !important;
        `;
    }

    /**
     * 获取备注按钮样式（灰色小球）
     */
    static getCommentButtonStyle(isMobile: boolean): string {
        const buttonSize = isMobile ? '22px' : '28px';
        const borderRadius = isMobile ? '50%' : '6px';
        const margin = isMobile ? 'auto 2px' : 'auto 4px';
        
        return `
            background: #f5f5f5 !important;
            border: 1px solid #ddd !important;
            border-radius: ${borderRadius} !important;
            width: ${buttonSize} !important;
            height: ${buttonSize} !important;
            margin: ${margin} !important;
            padding: 0 !important;
            display: inline-block !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2) !important;
            vertical-align: middle !important;
        `;
    }

    /**
     * 获取自定义工具栏容器样式
     */
    static getCustomToolbarStyle(top: number, left: number): string {
        return `
            position: fixed;
            top: ${top}px;
            left: ${left}px;
            transform: translateX(-50%);
            background: var(--b3-theme-background, white);
            border: 1px solid var(--b3-theme-border, #ddd);
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 999999;
            display: flex;
            gap: 6px;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
        `;
    }

    /**
     * 获取自定义工具栏中的颜色按钮样式
     */
    static getCustomToolbarColorButtonStyle(isMobile: boolean, backgroundColor: string): string {
        const buttonSize = isMobile ? '22px' : '28px';
        const borderRadius = isMobile ? '50%' : '6px';
        
        return `
            width: ${buttonSize};
            height: ${buttonSize};
            border: none;
            border-radius: ${borderRadius};
            background: ${backgroundColor};
            cursor: pointer;
            transition: all 0.2s ease;
        `;
    }

    /**
     * 获取自定义工具栏中的删除按钮样式
     */
    static getCustomToolbarRemoveButtonStyle(isMobile: boolean): string {
        const buttonSize = isMobile ? '22px' : '28px';
        const borderRadius = isMobile ? '50%' : '6px';
        
        return `
            width: ${buttonSize};
            height: ${buttonSize};
            border: 1px solid #ddd;
            border-radius: ${borderRadius};
            background: white;
            cursor: pointer;
            font-size: ${isMobile ? '10px' : '12px'};
            color: #666;
        `;
    }

    /**
     * 获取自定义工具栏中的备注按钮样式
     */
    static getCustomToolbarCommentButtonStyle(isMobile: boolean): string {
        const buttonSize = isMobile ? '22px' : '28px';
        const borderRadius = isMobile ? '50%' : '6px';
        
        return `
            width: ${buttonSize};
            height: ${buttonSize};
            border: 1px solid #ddd;
            border-radius: ${borderRadius};
            background: #f8f9fa;
            cursor: pointer;
            font-size: ${isMobile ? '10px' : '12px'};
            color: #666;
        `;
    }

    /**
     * 添加按钮交互效果（触摸和鼠标）
     */
    static addButtonInteractionEffects(button: HTMLElement): void {
        // 触摸效果
        button.addEventListener('touchstart', () => {
            button.style.opacity = '0.7';
        });
        
        button.addEventListener('touchend', () => {
            button.style.opacity = '1';
        });
        
        // 鼠标效果
        button.addEventListener('mousedown', () => {
            button.style.opacity = '0.7';
        });
        
        button.addEventListener('mouseup', () => {
            button.style.opacity = '1';
        });
    }

    /**
     * 获取按钮尺寸配置
     */
    static getButtonSizeConfig(isMobile: boolean): {
        buttonSize: string;
        borderRadius: string;
        margin: string;
    } {
        return {
            buttonSize: isMobile ? '22px' : '28px',
            borderRadius: isMobile ? '50%' : '6px',
            margin: isMobile ? 'auto 2px' : 'auto 4px'
        };
    }
}

