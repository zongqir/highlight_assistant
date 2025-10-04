import Logger from './logger';

/**
 * 标签选择对话框UI组件
 */

// 内置标签配置类型
export type PresetTag = {
    id: string;
    name: string;
    color: string;
    emoji: string;
};

export interface TagDialogResult {
    tag?: PresetTag;
    comment?: string;
}

/**
 * 显示标签选择对话框
 */
export function showTagSelectionDialog(
    blockText: string,
    presetTags: readonly PresetTag[],
    isHeading: boolean = false
): Promise<TagDialogResult | null> {
    return new Promise((resolve) => {
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes tagOverlayFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes tagDialogSlideUp {
                from { 
                    opacity: 0;
                    transform: translateY(30px) scale(0.9);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        document.head.appendChild(style);
        
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(6px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            animation: tagOverlayFadeIn 0.25s ease-out;
        `;
        
        // 创建对话框
        const dialog = document.createElement('div');
        // 检测是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        
        dialog.style.cssText = `
            background: var(--b3-theme-background);
            padding: ${isMobile ? '20px' : '32px'};
            border-radius: ${isMobile ? '16px' : '20px'};
            box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
            max-width: ${isMobile ? '95vw' : '90vw'};
            width: ${isMobile ? '100%' : '560px'};
            max-height: ${isMobile ? '85vh' : 'none'};
            overflow-y: ${isMobile ? 'auto' : 'visible'};
            box-sizing: border-box;
            animation: tagDialogSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        `;
        
        // 标题
        const title = document.createElement('div');
        title.innerHTML = `
            <div style="display: flex; align-items: center; gap: ${isMobile ? '8px' : '12px'};">
                <span style="font-size: ${isMobile ? '24px' : '28px'}; line-height: 1;">🏷️</span>
                <span style="font-size: ${isMobile ? '18px' : '22px'}; font-weight: 600; letter-spacing: -0.5px;">快速打标签</span>
            </div>
        `;
        title.style.cssText = `
            color: var(--b3-theme-on-background);
            margin-bottom: ${isMobile ? '8px' : '10px'};
        `;
        
        // 块文本预览
        const preview = document.createElement('div');
        const displayText = blockText.length > (isMobile ? 40 : 60) ? blockText.substring(0, isMobile ? 40 : 60) + '...' : blockText;
        preview.textContent = displayText;
        preview.style.cssText = `
            font-size: ${isMobile ? '13px' : '14px'};
            line-height: 1.6;
            color: var(--b3-theme-on-surface-light);
            margin-bottom: ${isMobile ? '16px' : '28px'};
            padding: ${isMobile ? '12px 14px' : '16px 18px'};
            background: linear-gradient(135deg, var(--b3-theme-surface) 0%, var(--b3-theme-surface-light) 100%);
            border-radius: ${isMobile ? '8px' : '12px'};
            border-left: ${isMobile ? '3px' : '4px'} solid var(--b3-theme-primary);
            max-height: ${isMobile ? '60px' : '80px'};
            overflow-y: auto;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        `;
        
        // 评论输入区域（提前创建，以便在标签按钮中使用）
        const commentTextarea = document.createElement('textarea');
        commentTextarea.placeholder = isHeading ? '标题块不支持评论' : '输入评论';
        commentTextarea.disabled = isHeading;
        commentTextarea.style.cssText = `
            width: 100%;
            min-height: ${isMobile ? '60px' : '80px'};
            padding: ${isMobile ? '10px' : '12px'};
            border: 1px solid var(--b3-theme-surface-lighter);
            border-radius: ${isMobile ? '6px' : '8px'};
            background: var(--b3-theme-background);
            color: var(--b3-theme-on-background);
            font-size: ${isMobile ? '14px' : '14px'};
            line-height: 1.5;
            resize: vertical;
            box-sizing: border-box;
            outline: none;
            transition: all 0.25s;
        `;
        
        // 输入框聚焦效果
        commentTextarea.addEventListener('focus', () => {
            commentTextarea.style.borderColor = 'var(--b3-theme-primary)';
            commentTextarea.style.boxShadow = `0 0 0 2px var(--b3-theme-primary)20`;
        });
        
        commentTextarea.addEventListener('blur', () => {
            commentTextarea.style.borderColor = 'var(--b3-theme-surface-lighter)';
            commentTextarea.style.boxShadow = 'none';
        });
        
        // 标签网格容器
        const tagsGrid = document.createElement('div');
        tagsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: ${isMobile ? '10px' : '16px'};
            margin-bottom: ${isMobile ? '16px' : '28px'};
        `;
        
        // 创建标签按钮
        presetTags.forEach((tag, index) => {
            const tagButton = document.createElement('button');
            
            // 创建按钮内容
            const content = document.createElement('div');
            content.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                position: relative;
                z-index: 1;
            `;
            content.innerHTML = `
                <span style="font-size: ${isMobile ? '20px' : '24px'}; line-height: 1;">${tag.emoji}</span>
                <span style="font-weight: 600; font-size: ${isMobile ? '14px' : '16px'};">${tag.name}</span>
            `;
            
            tagButton.appendChild(content);
            tagButton.style.cssText = `
                padding: ${isMobile ? '14px 12px' : '20px 16px'};
                border: 2px solid transparent;
                background: linear-gradient(135deg, ${tag.color}18, ${tag.color}28);
                color: var(--b3-theme-on-background);
                border-radius: ${isMobile ? '10px' : '14px'};
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                animation: tagDialogSlideUp ${0.35 + index * 0.06}s cubic-bezier(0.34, 1.56, 0.64, 1);
            `;
            
            // 创建光效层
            const shine = document.createElement('div');
            shine.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, ${tag.color}40, ${tag.color}60);
                opacity: 0;
                transition: opacity 0.3s;
                border-radius: 12px;
            `;
            tagButton.appendChild(shine);
            
            tagButton.addEventListener('mouseenter', () => {
                tagButton.style.borderColor = tag.color;
                tagButton.style.transform = 'translateY(-4px) scale(1.03)';
                tagButton.style.boxShadow = `0 12px 28px ${tag.color}50, 0 0 0 1px ${tag.color}30`;
                shine.style.opacity = '1';
            });
            
            tagButton.addEventListener('mouseleave', () => {
                tagButton.style.borderColor = 'transparent';
                tagButton.style.transform = 'translateY(0) scale(1)';
                tagButton.style.boxShadow = 'none';
                shine.style.opacity = '0';
            });
            
            tagButton.addEventListener('click', () => {
                tagButton.style.transform = 'scale(0.96)';
                setTimeout(() => {
                    // 获取评论内容
                    const commentText = commentTextarea.value.trim();
                    resolve({
                        tag: tag,
                        comment: commentText || undefined
                    });
                    cleanup();
                }, 120);
            });
            
            tagsGrid.appendChild(tagButton);
        });
        
        // 评论区域
        const commentSection = document.createElement('div');
        commentSection.style.cssText = `
            margin-top: ${isMobile ? '12px' : '20px'};
            margin-bottom: ${isMobile ? '12px' : '20px'};
            padding: ${isMobile ? '12px' : '16px'};
            background: linear-gradient(135deg, var(--b3-theme-surface) 0%, var(--b3-theme-surface-light) 100%);
            border-radius: ${isMobile ? '8px' : '12px'};
            border: 1px solid var(--b3-theme-surface-lighter);
        `;
        
        // 评论标题和按钮
        const commentHeader = document.createElement('div');
        commentHeader.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        `;
        
        const commentTitle = document.createElement('div');
        commentTitle.style.cssText = `
            display: flex;
            align-items: center;
            gap: ${isMobile ? '6px' : '8px'};
            color: var(--b3-theme-on-background);
            font-size: ${isMobile ? '13px' : '14px'};
            font-weight: 500;
        `;
        commentTitle.innerHTML = isHeading ? `
            <span style="font-size: ${isMobile ? '16px' : '18px'};">💭</span>
            <span>添加评论（标题块不支持）</span>
        ` : `
            <span style="font-size: ${isMobile ? '16px' : '18px'};">💭</span>
            <span>添加评论</span>
        `;
        
        // 仅保存评论按钮
        const saveCommentBtn = document.createElement('button');
        saveCommentBtn.textContent = '保存';
        saveCommentBtn.disabled = isHeading;
        saveCommentBtn.style.cssText = `
            padding: ${isMobile ? '8px 12px' : '6px 14px'};
            background: ${isHeading ? 'var(--b3-theme-surface)' : 'var(--b3-theme-primary)'};
            color: ${isHeading ? 'var(--b3-theme-on-surface-light)' : 'white'};
            border: none;
            border-radius: ${isMobile ? '6px' : '8px'};
            cursor: ${isHeading ? 'not-allowed' : 'pointer'};
            font-size: ${isMobile ? '13px' : '13px'};
            font-weight: 600;
            transition: all 0.25s;
            opacity: ${isHeading ? '0.5' : '1'};
            white-space: nowrap;
        `;
        
        if (!isHeading) {
            saveCommentBtn.addEventListener('mouseenter', () => {
                saveCommentBtn.style.transform = 'translateY(-1px)';
                saveCommentBtn.style.boxShadow = '0 4px 12px var(--b3-theme-primary)40';
            });
            
            saveCommentBtn.addEventListener('mouseleave', () => {
                saveCommentBtn.style.transform = 'translateY(0)';
                saveCommentBtn.style.boxShadow = 'none';
            });
        }
        
        saveCommentBtn.addEventListener('click', () => {
            if (isHeading) {
                return; // 标题块不支持评论
            }
            const commentText = commentTextarea.value.trim();
            if (!commentText) {
                commentTextarea.style.borderColor = 'var(--b3-theme-error)';
                commentTextarea.placeholder = '请先输入评论！';
                setTimeout(() => {
                    commentTextarea.style.borderColor = 'var(--b3-theme-surface-lighter)';
                    commentTextarea.placeholder = '输入评论';
                }, 2000);
                return;
            }
            resolve({
                comment: commentText
            });
            cleanup();
        });
        
        commentHeader.appendChild(commentTitle);
        commentHeader.appendChild(saveCommentBtn);
        commentSection.appendChild(commentHeader);
        commentSection.appendChild(commentTextarea);
        
        // 分隔线
        const divider = document.createElement('div');
        divider.style.cssText = `
            margin: ${isMobile ? '12px 0' : '20px 0'};
            text-align: center;
            color: var(--b3-theme-on-surface-light);
            font-size: ${isMobile ? '12px' : '13px'};
        `;
        divider.innerHTML = `
            <span style="background: var(--b3-theme-background); padding: 0 ${isMobile ? '8px' : '10px'}; position: relative; z-index: 1;">
                ${isMobile ? '或选择标签' : '或选择标签（可同时添加标签+评论）'}
            </span>
            <div style="border-top: 1px solid var(--b3-theme-surface-lighter); margin-top: -10px;"></div>
        `;
        
        // 取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.cssText = `
            width: 100%;
            padding: ${isMobile ? '12px' : '15px'};
            border: 2px solid var(--b3-theme-surface-lighter);
            background: var(--b3-theme-surface);
            color: var(--b3-theme-on-surface);
            border-radius: ${isMobile ? '8px' : '12px'};
            cursor: pointer;
            font-size: ${isMobile ? '14px' : '15px'};
            font-weight: 600;
            transition: all 0.25s;
        `;
        
        cancelButton.addEventListener('mouseenter', () => {
            cancelButton.style.background = 'var(--b3-theme-surface-light)';
            cancelButton.style.borderColor = 'var(--b3-theme-on-surface-light)';
            cancelButton.style.transform = 'translateY(-1px)';
        });
        
        cancelButton.addEventListener('mouseleave', () => {
            cancelButton.style.background = 'var(--b3-theme-surface)';
            cancelButton.style.borderColor = 'var(--b3-theme-surface-lighter)';
            cancelButton.style.transform = 'translateY(0)';
        });
        
        cancelButton.addEventListener('click', () => {
            resolve(null);
            cleanup();
        });
        
        // 组装界面
        dialog.appendChild(title);
        dialog.appendChild(preview);
        dialog.appendChild(commentSection);
        dialog.appendChild(divider);
        dialog.appendChild(tagsGrid);
        dialog.appendChild(cancelButton);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 清理函数
        const cleanup = () => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        };
        
        // ESC 关闭
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                resolve(null);
                cleanup();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // 点击遮罩关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                resolve(null);
                cleanup();
            }
        });
    });
}

