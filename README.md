# Highlight Assistant

A highlight tool designed specifically for SiYuan mobile, providing WeChat Reading-style text highlighting and annotation features.

## ✨ Features

- 🎨 **Multi-color Highlighting**: 4 color options (yellow, blue, green, pink)
- 💭 **Smart Annotations**: Add personal notes to highlighted text
- 📱 **Mobile Optimized**: Floating toolbar designed for SiYuan mobile
- 🔄 **State Management**: Support for modifying and deleting existing highlights and annotations
- 🌙 **Theme Adaptive**: Perfect adaptation to light and dark theme switching
- ⚡ **Performance Optimized**: Lightweight implementation that doesn't affect editing experience

## 🚀 How to Use

1. **Select Text**: Select any text in SiYuan mobile
2. **Choose Color**: Click color buttons in the popup toolbar to highlight
3. **Add Annotation**: Click the annotation button to add personal thoughts to highlighted text
4. **Manage Highlights**: Click on already highlighted text to modify color or delete

## 📋 System Requirements

- SiYuan v3.2.1+
- Mobile environment (iOS/Android/mobile browser)
- Desktop version not currently supported

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