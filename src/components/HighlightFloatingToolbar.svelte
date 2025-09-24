<!--
高亮悬浮工具栏组件
参考sy-tomato-plugin的悬浮按钮实现
-->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { showMessage } from 'siyuan';
    
    export let visible = false;
    export let position = { x: 50, y: 50 };
    export let onColorSelect: (color: string) => void = () => {};
    export let onClose: () => void = () => {};
    
    let toolbarElement: HTMLElement;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    // 颜色配置
    const colors = [
        { key: 'yellow', icon: '🟡', bg: '#fff3cd', name: '黄色' },
        { key: 'blue', icon: '🔵', bg: '#cce5ff', name: '蓝色' },
        { key: 'green', icon: '🟢', bg: '#d4e6d4', name: '绿色' },
        { key: 'pink', icon: '🩷', bg: '#f8d7da', name: '粉色' }
    ];
    
    onMount(() => {
        updatePosition();
        setupEventListeners();
    });
    
    onDestroy(() => {
        removeEventListeners();
    });
    
    function updatePosition() {
        if (!toolbarElement) return;
        
        toolbarElement.style.left = `${position.x}px`;
        toolbarElement.style.top = `${position.y}px`;
    }
    
    function setupEventListeners() {
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    function removeEventListeners() {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }
    
    function handleDragStart(event: MouseEvent | TouchEvent) {
        isDragging = true;
        
        const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
        const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
        
        const rect = toolbarElement.getBoundingClientRect();
        dragOffset = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    function handleTouchMove(event: TouchEvent) {
        if (!isDragging) return;
        event.preventDefault();
        
        const touch = event.touches[0];
        updateDragPosition(touch.clientX, touch.clientY);
    }
    
    function handleMouseMove(event: MouseEvent) {
        if (!isDragging) return;
        updateDragPosition(event.clientX, event.clientY);
    }
    
    function updateDragPosition(clientX: number, clientY: number) {
        const newX = clientX - dragOffset.x;
        const newY = clientY - dragOffset.y;
        
        // 边界检查
        const maxX = window.innerWidth - toolbarElement.offsetWidth;
        const maxY = window.innerHeight - toolbarElement.offsetHeight;
        
        position.x = Math.max(0, Math.min(newX, maxX));
        position.y = Math.max(0, Math.min(newY, maxY));
        
        updatePosition();
    }
    
    function handleTouchEnd() {
        isDragging = false;
    }
    
    function handleMouseUp() {
        isDragging = false;
    }
    
    function handleColorClick(color: string) {
        onColorSelect(color);
        onClose();
    }
    
    // 响应式更新位置
    $: if (toolbarElement && visible) {
        updatePosition();
    }
</script>

{#if visible}
<div 
    bind:this={toolbarElement}
    class="highlight-floating-toolbar"
    class:visible
    on:mousedown={handleDragStart}
    on:touchstart={handleDragStart}
    role="toolbar"
    aria-label="高亮颜色选择"
    tabindex="0"
>
    <div class="toolbar-header">
        <span class="toolbar-title">选择高亮颜色</span>
        <button 
            class="close-btn"
            on:click={onClose}
            aria-label="关闭"
        >
            ✕
        </button>
    </div>
    
    <div class="toolbar-buttons">
        {#each colors as color}
            <button
                class="color-btn"
                style="background-color: {color.bg};"
                title={color.name}
                on:click={() => handleColorClick(color.key)}
                aria-label="选择{color.name}高亮"
            >
                {color.icon}
            </button>
        {/each}
    </div>
    
    <div class="toolbar-tip">
        <small>长按可拖拽移动</small>
    </div>
</div>
{/if}

<style lang="scss">
    .highlight-floating-toolbar {
        position: fixed;
        z-index: 999999;
        background: var(--b3-theme-background);
        border: 2px solid var(--b3-theme-primary);
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        padding: 12px;
        min-width: 280px;
        user-select: none;
        cursor: move;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        
        &.visible {
            opacity: 1;
            transform: scale(1);
        }
    }
    
    .toolbar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--b3-theme-border);
    }
    
    .toolbar-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--b3-theme-on-background);
    }
    
    .close-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--b3-theme-on-background);
        font-size: 14px;
        
        &:hover {
            background: var(--b3-theme-surface-lighter);
        }
    }
    
    .toolbar-buttons {
        display: flex;
        gap: 8px;
        justify-content: center;
        margin-bottom: 8px;
    }
    
    .color-btn {
        width: 48px;
        height: 48px;
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        transition: all 0.2s ease;
        position: relative;
        
        &:hover {
            transform: scale(1.1);
            border-color: var(--b3-theme-primary);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        &:active {
            transform: scale(0.95);
        }
    }
    
    .toolbar-tip {
        text-align: center;
        color: var(--b3-theme-on-background-light);
        
        small {
            font-size: 11px;
        }
    }
    
    /* 移动端适配 */
    @media (max-width: 768px) {
        .highlight-floating-toolbar {
            min-width: 260px;
            padding: 16px;
        }
        
        .color-btn {
            width: 52px;
            height: 52px;
            font-size: 22px;
        }
        
        .toolbar-title {
            font-size: 16px;
        }
    }
    
    /* 动画效果 */
    .color-btn {
        animation: none;
    }
    
    .color-btn:hover {
        animation: colorPulse 0.6s ease infinite;
    }
    
    @keyframes colorPulse {
        0%, 100% {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        50% {
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        }
    }
</style>
