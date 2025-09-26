/**
 * 创建高亮助手图标
 * 使用Canvas API生成PNG图标
 */

import fs from 'fs';
import { createCanvas } from 'canvas';

function createIcon() {
    // 创建128x128的画布
    const canvas = createCanvas(128, 128);
    const ctx = canvas.getContext('2d');
    
    // 背景圆形 - 蓝色渐变
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    gradient.addColorStop(0, '#4dabf7');
    gradient.addColorStop(1, '#007bff');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    
    // 外圈装饰
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.stroke();
    
    // 高亮笔图标
    ctx.fillStyle = '#ffffff';
    
    // 笔身
    ctx.fillRect(61, 30, 6, 40);
    
    // 笔尖
    ctx.beginPath();
    ctx.moveTo(61, 70);
    ctx.lineTo(67, 70);
    ctx.lineTo(64, 80);
    ctx.closePath();
    ctx.fill();
    
    // 高亮效果线条
    const colors = ['#ffd700', '#87ceeb', '#90ee90', '#ffb6c1'];
    const widths = [18, 15, 12, 10];
    
    colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        
        const y = 45 + i * 4;
        const width = widths[i];
        const x = 35;
        
        // 圆角矩形模拟
        ctx.fillRect(x, y, width, 3);
    });
    
    ctx.globalAlpha = 1;
    
    // 备注气泡
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(85, 45, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#007bff';
    ctx.beginPath();
    ctx.arc(85, 45, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // 备注符号 - 用简单的点表示
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(83, 43, 1.5, 0, Math.PI * 2);
    ctx.arc(87, 43, 1.5, 0, Math.PI * 2);
    ctx.arc(85, 47, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas;
}

try {
    console.log('正在生成图标...');
    
    // 检查是否安装了canvas依赖
    try {
        const canvas = createIcon();
        const buffer = canvas.toBuffer('image/png');
        
        // 保存图标
        fs.writeFileSync('./icon.png', buffer);
        console.log('✅ 图标已生成: icon.png');
        
        // 也复制到dist目录
        if (fs.existsSync('./dist')) {
            fs.writeFileSync('./dist/icon.png', buffer);
            console.log('✅ 图标已复制到: dist/icon.png');
        }
        
    } catch (canvasError) {
        console.log('❌ Canvas依赖未安装，请安装: npm install canvas');
        console.log('或者使用备用方案创建图标...');
        
        // 备用方案：创建一个简单的SVG图标
        createSVGIcon();
    }
    
} catch (error) {
    console.error('生成图标失败:', error);
    createSVGIcon();
}

function createSVGIcon() {
    console.log('使用SVG备用方案...');
    
    const svgContent = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <!-- 背景圆形 -->
        <defs>
            <radialGradient id="bg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#4dabf7;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#007bff;stop-opacity:1" />
            </radialGradient>
        </defs>
        
        <circle cx="64" cy="64" r="60" fill="url(#bg)"/>
        <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        
        <!-- 高亮笔 -->
        <rect x="61" y="30" width="6" height="40" rx="3" fill="#ffffff"/>
        <polygon points="61,70 67,70 64,80" fill="#ffffff"/>
        
        <!-- 高亮线条 -->
        <rect x="35" y="45" width="18" height="3" rx="1.5" fill="#ffd700" opacity="0.8"/>
        <rect x="35" y="49" width="15" height="3" rx="1.5" fill="#87ceeb" opacity="0.8"/>
        <rect x="35" y="53" width="12" height="3" rx="1.5" fill="#90ee90" opacity="0.8"/>
        <rect x="35" y="57" width="10" height="3" rx="1.5" fill="#ffb6c1" opacity="0.8"/>
        
        <!-- 备注气泡 -->
        <circle cx="85" cy="45" r="10" fill="#ffffff" opacity="0.9"/>
        <circle cx="85" cy="45" r="8" fill="#007bff"/>
        <circle cx="83" cy="43" r="1.5" fill="#ffffff"/>
        <circle cx="87" cy="43" r="1.5" fill="#ffffff"/>
        <circle cx="85" cy="47" r="1.5" fill="#ffffff"/>
    </svg>`;
    
    fs.writeFileSync('./icon.svg', svgContent);
    console.log('✅ SVG图标已生成: icon.svg');
    console.log('💡 你可以使用在线工具将SVG转换为PNG，或者访问 create_icon.html');
}
