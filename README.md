# Annotation Assistant (标注助手)

A powerful annotation tool for SiYuan Note, featuring quick tag insertion, memo block creation, and multi-color highlighting. Delivers a WeChat Reading-style experience optimized for mobile devices.

## ✨ Features

### 🎨 Highlighting & Annotations
- **Multi-color Highlighting**: 4 color options (yellow, blue, green, pink)
- **Smart Annotations**: Add personal notes to highlighted text
- **Mobile Optimized**: Floating toolbar designed for SiYuan mobile
- **Desktop Support**: Full support for desktop version in read-only mode
- **State Management**: Support for modifying and deleting existing highlights and annotations
- **Theme Adaptive**: Perfect adaptation to light and dark theme switching

### 🏷️ Quick Tag Marking
- **Fast Tagging**: Right-click or long-press to quickly add tags (desktop & mobile)
- **Preset Tags**: 8 well-designed tags (Important⭐, Difficult🔥, Mistake⚡, Memory💭, Explore🔍, Check✅, Practice✍️, Question❓)
- **Smart Protection**: Auto-detect code blocks, math formulas to avoid format damage
- **State Protection**: Read-only state protection for data safety

## 🚀 How to Use

### 🎨 Highlighting & Annotations

1. **Select Text**: Select any text in SiYuan (mobile or desktop)
2. **Choose Color**: Click color buttons in the popup toolbar to highlight
3. **Add Annotation**: Click the annotation button to add personal thoughts to highlighted text
4. **Manage Highlights**: Click on already highlighted text to modify color or delete

### 🏷️ Quick Tag Marking

**How to Trigger:**
- **Mobile**: Double-tap on a block
- **Desktop**: Ctrl + Right-click on a block

**How It Works:**
- The plugin automatically handles document lock state
- Works in both locked and unlocked states
- Temporarily unlocks if needed, then restores original state

**Steps:**
1. Double-tap (mobile) or Ctrl+Right-click (desktop) on any block
2. Select an appropriate tag from the popup panel
3. The tag will be automatically added to the end of the block
4. Document lock state is automatically restored

**Preset Tags:**
- ⭐ Important - Mark important content
- 🔥 Difficult - Mark difficult knowledge points
- ⚡ Mistake - Mark error-prone areas
- 💭 Memory - Content that needs memorization
- 🔍 Explore - Needs in-depth research
- ✅ Check - Content that needs review
- ✍️ Practice - Exercises to practice
- ❓ Question - Areas with questions

## 📋 System Requirements

- SiYuan v3.2.1+
- Mobile environment (iOS/Android/mobile browser) - Full support
- Desktop environment (Windows/macOS/Linux) - Read-only mode support

## 🛠 Technical Features

- **Smart Hijacking**: Hijacks SiYuan native toolbar for seamless integration
- **Markdown Compatible**: Preserves original Markdown format markers
- **Event Management**: Comprehensive event listener management to avoid memory leaks
- **State Reset**: Automatically resets toolbar state for each use

## 📦 Installation

1. Download the latest `package.zip`
2. Open SiYuan → `Settings` → `Marketplace` → `Downloaded` → `Plugins`
3. Click `Install plugin from local` and select the downloaded zip file
4. Enable the plugin and restart SiYuan

## 🔧 Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm run dev

# Build plugin
pnpm run build

# Install to SiYuan
pnpm run make-install
```

## 📝 Changelog

### v2.2.0 (2025-10-16)
- 🗑️ **Feature Cleanup**: Removed tag click popup feature for simpler codebase
- 🎯 **Focus on Core**: Streamlined to focus on core annotation features
- 🧹 **Code Optimization**: Cleaner and more maintainable code structure

### v2.1.0 (2025-10-05)
- 🎯 **Brand Repositioning**: Renamed plugin to "Annotation Assistant" (标注助手)
- 📋 **Feature Clarity**: Emphasized core features (Tag Insertion, Memo Blocks, Annotations, Highlighting)
- 📱 **Experience Positioning**: Emphasized WeChat Reading-style experience and mobile optimization

### v2.0.0 (2025-10-02)
- 🎉 **Major Update**: Quick Tag Marking System
- 🔧 Technical improvements and performance optimization

### v1.1.0
- ✅ Added desktop support for read-only mode
- ✅ Enhanced platform detection (mobile/desktop)
- ✅ Optimized UI for desktop environment

### v1.0.1
- ✅ Fixed toolbar only working once issue
- ✅ Improved event listener management
- ✅ Optimized Markdown format preservation logic

### v1.0.0
- 🎉 Initial release
- 🎨 Support for 4 color highlighting
- 💭 Support for annotation features
- 📱 Mobile optimization

## 💖 Support Development

If this plugin helps you, welcome to support the developer!

<div align="center">
<img src="https://i0.hdslb.com/bfs/openplatform/3b4d37a5285096d3493d09ca88280d9acf90129e.png@1e_1c.webp" width="200" alt="Support QR Code"/>

**Scan to Support Developer** ☕
</div>

Your support is my motivation to continue optimizing the plugin!

## 🤝 Contributing

Welcome to submit Issues and Pull Requests!

## 📄 License

MIT License
