# Native Browser Viewport Testing Guide

## 🎯 Using Native Browser DevTools (Recommended)

Instead of the custom viewport indicator, use your browser's built-in DevTools for professional viewport testing.

### Chrome/Edge DevTools

1. **Open DevTools**: 
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Or right-click → "Inspect"

2. **Toggle Device Toolbar**:
   - Press `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows)
   - Or click the device icon in the toolbar

3. **Select Device**:
   - Click the device dropdown (top-left of device toolbar)
   - Choose a device:
     - **Admin**: "Responsive" or "Desktop" (1920x1080)
     - **Runner/Customer**: "iPhone 14 Pro" (390x844) or "Samsung Galaxy S21" (360x800)

4. **Viewport Info**:
   - Device toolbar shows: Device name, dimensions, zoom level
   - Network throttling, CPU throttling options
   - Touch simulation for mobile devices

### Firefox DevTools

1. **Open DevTools**: `F12` or `Cmd+Option+I` / `Ctrl+Shift+I`

2. **Toggle Responsive Design Mode**:
   - Press `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows)
   - Or click the device icon in toolbar

3. **Select Device**:
   - Use device dropdown
   - Or enter custom dimensions

### Safari DevTools

1. **Enable DevTools** (if not enabled):
   - Safari → Preferences → Advanced → "Show Develop menu"

2. **Open DevTools**: `Cmd+Option+I`

3. **Toggle Responsive Design Mode**:
   - Develop → Enter Responsive Design Mode
   - Or `Cmd+Ctrl+R`

4. **Select Device**: Use device dropdown

## 📱 Recommended Device Presets

### Admin (Responsive)
- **Desktop**: 1920x1080, 1440x900, 1280x720
- **Tablet**: 1024x768, 768x1024
- **Mobile**: 428x926, 390x844

### Runner (Mobile-only)
- **iPhone 14 Pro Max**: 428x926
- **iPhone 14 Pro**: 390x844
- **iPhone SE**: 375x667
- **Samsung Galaxy S21**: 360x800

### Customer (Mobile-only)
- Same as Runner above

## 🎨 What You'll See

### With DevTools Device Emulation

1. **Phone Frame**: Browser shows device frame (optional)
2. **Viewport Info**: Shows device name, dimensions, DPR
3. **Touch Simulation**: Simulates touch events
4. **Network Throttling**: Test on slow connections
5. **User Agent**: Changes to mobile user agent

### Our Phone Frame (Desktop Testing)

- **Centered Container**: 428px wide phone frame
- **Rounded Corners**: 24px border radius
- **Shadow**: Multi-layer shadow for depth
- **Notch Indicator**: Visual phone notch at top
- **Background**: Light gray around frame

## 🔧 Custom Viewport Indicator

The custom viewport indicator is **hidden by default** but can be toggled:

- **Toggle**: Press `Ctrl/Cmd + Shift + V`
- **Purpose**: Quick reference for viewport mode
- **Visibility**: Stored in localStorage

### When to Use

- **Custom Indicator**: Quick reference without opening DevTools
- **Native DevTools**: Professional testing with full device simulation

## ✅ Best Practice

**Use Native Browser DevTools** for:
- ✅ Accurate device simulation
- ✅ Touch event testing
- ✅ Network throttling
- ✅ Device-specific features
- ✅ Professional QA workflow

**Use Custom Indicator** for:
- ✅ Quick viewport mode check
- ✅ Development reference
- ✅ When DevTools are closed

## 🚀 Quick Start

1. **Open DevTools**: `F12`
2. **Toggle Device Mode**: `Cmd+Shift+M` / `Ctrl+Shift+M`
3. **Select Device**: Choose appropriate device
4. **Test**: Interact with app as if on real device

That's it! No custom tools needed - use your browser's native capabilities.

