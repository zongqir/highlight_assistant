# Annotation Assistant (标注助手)

A powerful all-in-one annotation tool for SiYuan Note, featuring quick tag insertion, memo block creation, reading annotation, and highlighting. Delivers a WeChat Reading-style experience optimized for mobile devices.

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
- **Tag Search**: Click tags to search all blocks containing that tag
- **Search Scope**: Support for current document, subdocuments, and notebook
- **Smart Protection**: Auto-detect code blocks, math formulas to avoid format damage
- **State Protection**: Read-only state protection for data safety

### ⚡ Flashcard Quick Switch
- **History Recording**: Auto-record flashcard filter history (max 10)
- **Quick Access**: Floating ball widget for fast access to history
- **Smart Management**: Support pinning favorites, deduplication, usage statistics
- **One-click Switch**: Quickly switch to historical filter targets
- **Flexible Customization**: Drag to adjust position
- **Data Persistence**: Auto-save, cleanup on plugin uninstall

## 🚀 How to Use

### 🎨 Highlighting & Annotations

1. **Select Text**: Select any text in SiYuan (mobile or desktop)
2. **Choose Color**: Click color buttons in the popup toolbar to highlight
3. **Add Annotation**: Click the annotation button to add personal thoughts to highlighted text
4. **Manage Highlights**: Click on already highlighted text to modify color or delete

### 🏷️ Quick Tag Marking (v1.1.4+)

**How to Trigger:**
- **Mobile**: Long-press (500ms) on blank area within a block (avoid selecting text)
- **Desktop**: Right-click on blank area within a block

**How It Works:**
- The plugin automatically handles document lock state
- Works in both locked and unlocked states
- Temporarily unlocks if needed, then restores original state

**Steps:**
1. Long-press (mobile) or right-click (desktop) on blank area of any block
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

**Tag Search:**
- Click any tag to search all blocks containing that tag
- Support three search scopes: current document, subdocuments, notebook
- Search results displayed in document tree structure for easy navigation

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

### v2.1.0 (2025-10-05)
- 🎯 **Brand Repositioning**: Renamed plugin to "Annotation Assistant" (标注助手)
- 📋 **Feature Clarity**: Emphasized four core features
  - Quick Tag Insertion - Fast tagging for content classification
  - Memo Block Creation - Smart annotations for highlighted text  
  - Reading Annotation - Personal notes and thoughts
  - Highlighting - Multi-color text highlighting
- 📱 **Experience Positioning**: Emphasized WeChat Reading-style experience and mobile optimization
- 📖 **Description Update**: Clearer plugin positioning and feature communication

### v3.0.3 (2025-10-02)
- 🐛 **Bug Fix**: Mobile quick tag adding issue
  - Fixed issue where tags became plain text on mobile
  - Changed from Markdown format to DOM format, no longer dependent on "Markdown inline tag syntax" setting
  - Both mobile and desktop versions now correctly add clickable tags
- 📖 **Documentation**: Improved tag feature usage instructions
  - Detailed explanation of mobile long-press and desktop right-click triggers
  - Added usage requirements (document must be locked)

### v2.0.0 (2025-10-02)
- 🎉 **Major Update**: Quick Tag Marking System (developed in v1.1.4)
  - Right-click or long-press to quickly add tags
  - 8 preset tags for various learning scenarios
  - Click tags to quickly search
  - Multiple search scope support
  - Smart style protection and state protection
- ⚡ **New Feature**: Flashcard Quick Switch
  - Auto-record filter history
  - Floating ball quick access
  - Support pinning and managing history
  - Smart deduplication and frequency statistics
- 🔧 Technical improvements and performance optimization

### v1.1.0
- ✅ Added desktop support for read-only mode
- ✅ Enhanced platform detection (mobile/desktop)
- ✅ Optimized UI for desktop environment
- ✅ Improved button styling for different platforms
- ✅ Added comprehensive testing tools

### v1.0.1
- ✅ Fixed toolbar only working once issue
- ✅ Improved event listener management
- ✅ Optimized Markdown format preservation logic
- ✅ Cleaned up unused code, reduced plugin size

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