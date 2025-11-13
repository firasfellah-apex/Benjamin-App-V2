# Desktop Testing Guide for Mobile Apps

## 🎯 Overview

When testing **Runner** and **Customer** apps on desktop browsers, they automatically display in a **centered phone frame** that mimics the mobile viewport. This makes it easy to test mobile-only apps while using desktop browsers.

## 📱 What You'll See

### On Desktop Browser (≥768px width)

When you navigate to `/runner/*` or `/customer/*` routes:

1. **Phone Frame**: The app appears in a centered phone frame (428px wide - iPhone 14 Pro Max size)
2. **Visual Indicators**:
   - Rounded corners (24px border-radius)
   - Subtle shadow for depth
   - Phone notch indicator at the top
   - Light gray background around the frame
3. **Viewport Indicator**: Bottom-right corner shows:
   - Current app type (Runner/Customer)
   - Viewport mode (mobile-only)
   - Current window size
   - ✅ Confirmation that mobile app is shown in phone frame

### On Mobile/Device Emulation (≤767px width)

When using browser DevTools device emulation or real mobile devices:

1. **Full Width**: App takes full width of the viewport
2. **No Frame**: No phone frame, shadow, or rounded corners
3. **Native Mobile**: Looks exactly like a native mobile app

## 🖥️ Testing on Desktop

### Method 1: Standard Desktop Browser

1. **Open your browser** (Chrome, Firefox, Safari, Edge)
2. **Navigate to Runner or Customer routes**:
   - `/runner/home` - Runner app
   - `/customer/home` - Customer app
3. **See the phone frame**: App appears in centered phone frame
4. **Test normally**: Click, scroll, interact as if on mobile

### Method 2: Browser DevTools Device Emulation

1. **Open DevTools**: `F12` or `Cmd+Option+I`
2. **Toggle Device Toolbar**: `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows)
3. **Select Mobile Device**: iPhone 14 Pro (390x844) or similar
4. **Phone frame disappears**: App now shows full-width (actual mobile view)
5. **Test mobile experience**: Accurate mobile viewport testing

## ✅ Benefits

### Desktop Testing (Phone Frame Mode)
- ✅ **Easy to test**: No need to resize browser window
- ✅ **Visual clarity**: Phone frame makes it obvious you're testing mobile
- ✅ **Centered view**: Easy to see and interact with
- ✅ **Quick iteration**: Fast testing without device emulation

### Device Emulation Mode
- ✅ **Accurate viewport**: Real mobile dimensions
- ✅ **Touch simulation**: Simulates touch events
- ✅ **Network throttling**: Test on slow connections
- ✅ **Device-specific**: Test iPhone, Android, etc.

## 🎨 Visual Features

### Phone Frame (Desktop)
- **Width**: 428px (iPhone 14 Pro Max)
- **Border Radius**: 24px (rounded corners)
- **Shadow**: Multi-layer shadow for depth
- **Notch**: Visual phone notch indicator at top
- **Background**: Light gray (#f5f5f7) around frame
- **Padding**: 20px around frame

### Full Width (Mobile/Emulation)
- **Width**: 100% of viewport
- **No frame**: Clean, native mobile look
- **No shadow**: Flat design
- **No notch**: Removed in mobile view

## 🔍 Viewport Indicator

The dev-only viewport indicator (bottom-right) shows:

```
📱 Viewport Mode
Runner (Mobile-only)
Mode: mobile-only
Size: 1920x1080
✅ Mobile app shown in phone frame (desktop testing)
```

This confirms:
- Which app you're testing
- Current viewport mode
- Window size
- Whether phone frame is active

## 📋 Testing Checklist

### Desktop Testing (Phone Frame)
- [ ] App appears in centered phone frame
- [ ] Phone frame has rounded corners and shadow
- [ ] Notch indicator visible at top
- [ ] Viewport indicator shows "✅ Mobile app shown in phone frame"
- [ ] Can interact with all UI elements
- [ ] Scrolling works correctly
- [ ] Layout doesn't break

### Device Emulation Testing
- [ ] Phone frame disappears
- [ ] App takes full width
- [ ] Viewport indicator shows actual device size
- [ ] Touch events work (if supported)
- [ ] Layout matches real mobile device

## 🛠️ Technical Details

### CSS Classes Applied

**Desktop (≥768px)**:
- `body.mobile-app-viewport` - Centers phone frame
- `#root` - Phone frame container (428px max-width)

**Mobile (≤767px)**:
- `body.mobile-app-viewport` - Full width
- `#root` - Full width container

### Viewport Meta Tag

**Mobile-only apps** (Runner/Customer):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

**Responsive apps** (Admin):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
```

## 💡 Tips

1. **Use Phone Frame for Quick Testing**: Perfect for rapid iteration and UI checks
2. **Use Device Emulation for Accuracy**: When you need precise mobile viewport testing
3. **Check the Indicator**: Always verify you're in the right mode
4. **Test Both Modes**: Phone frame for desktop, emulation for mobile accuracy
5. **Real Devices**: Always test on real devices for final validation

## 🐛 Troubleshooting

### Issue: Phone frame not showing
**Solution**: 
- Make sure you're on `/runner/*` or `/customer/*` route
- Check browser width is ≥768px
- Refresh the page

### Issue: App looks too wide
**Solution**: 
- You might be in device emulation mode
- Disable device toolbar in DevTools
- Or ensure window width is ≥768px

### Issue: Layout breaks in phone frame
**Solution**: 
- Check console for errors
- Verify CSS is loading correctly
- Check if any fixed-width elements exceed 428px

## 📚 Related Files

- `src/hooks/useViewport.ts` - Viewport management logic
- `src/components/dev/ViewportIndicator.tsx` - Dev indicator component
- `src/index.css` - Phone frame CSS styles
- `VIEWPORT_TESTING_GUIDE.md` - Detailed viewport testing guide









