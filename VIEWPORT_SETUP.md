# Viewport Configuration Setup

## ✅ What Was Implemented

The app now automatically configures viewports based on the current route:

- **Admin** (`/admin/*`): **Responsive** - Desktop/mobile, web + app (zoom allowed)
- **Runner** (`/runner/*`): **Mobile-only** - Phone app viewport (no zoom)
- **Customer** (`/customer/*`): **Mobile-only** - Phone app viewport (no zoom)

## 🎯 How It Works

1. **Automatic Detection**: The `useViewport` hook detects the current route and sets the appropriate viewport mode
2. **Viewport Meta Tag**: Updates the viewport meta tag based on mode
3. **CSS Classes**: Adds `mobile-app-viewport` or `responsive-viewport` class to body
4. **Visual Indicator**: Shows a dev-only indicator in the bottom-right corner

## 📱 Testing in Browser DevTools

### Quick Setup

1. **Open DevTools**: `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
2. **Toggle Device Toolbar**: `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows)
3. **Select Device**:
   - **Admin**: Desktop (1920x1080) or any device
   - **Runner/Customer**: iPhone 14 Pro (390x844) or similar mobile device

### Recommended Viewport Sizes

#### Admin (Responsive)
- Desktop: 1920x1080, 1440x900, 1280x720
- Tablet: 1024x768, 768x1024
- Mobile: 428x926, 390x844

#### Runner (Mobile-only)
- iPhone 14 Pro Max: 428x926
- iPhone 14 Pro: 390x844
- iPhone SE: 375x667
- Samsung Galaxy S21: 360x800

#### Customer (Mobile-only)
- Same as Runner above

## 🔍 Visual Indicators

### Development Mode

When running in development (`npm run dev`), you'll see:

1. **Viewport Indicator** (bottom-right corner):
   - Shows current app type (Admin/Runner/Customer)
   - Shows viewport mode (responsive/mobile-only)
   - Shows current viewport size
   - Warning if testing mobile-only app on desktop

2. **Console Logs**:
   - `[Viewport] Mode: responsive | Route: /admin/dashboard`
   - `[Viewport] Mode: mobile-only | Route: /runner/home`

### Desktop Testing (Mobile Apps)

When testing Runner/Customer on desktop:
- App appears in a **centered container** (max-width: 428px)
- Container has a subtle shadow
- Simulates mobile app experience

## 📋 Testing Checklist

### Admin App
- [ ] Desktop (1920x1080) - Full layout
- [ ] Tablet (1024x768) - Responsive layout
- [ ] Mobile (428x926) - Mobile-optimized
- [ ] Zoom works (pinch-to-zoom enabled)

### Runner App
- [ ] iPhone 14 Pro (390x844) - Primary test
- [ ] Samsung Galaxy (360x800) - Android
- [ ] No horizontal scrolling
- [ ] No zoom allowed (user-scalable=no)
- [ ] Touch targets adequate (44x44px minimum)

### Customer App
- [ ] iPhone 14 Pro (390x844) - Primary test
- [ ] Samsung Galaxy (360x800) - Android
- [ ] No horizontal scrolling
- [ ] No zoom allowed (user-scalable=no)
- [ ] Touch targets adequate (44x44px minimum)

## 🛠️ Files Created/Modified

### New Files
- `src/hooks/useViewport.ts` - Viewport management hook
- `src/components/dev/ViewportIndicator.tsx` - Dev-only visual indicator
- `VIEWPORT_TESTING_GUIDE.md` - Detailed testing guide
- `VIEWPORT_SETUP.md` - This file

### Modified Files
- `src/components/common/PageMeta.tsx` - Added viewport meta tag management
- `src/App.tsx` - Added ViewportIndicator component
- `src/index.css` - Added mobile app viewport constraints

## 🚀 Usage

No configuration needed! The viewport is automatically configured based on the route:

- Navigate to `/admin/*` → Responsive viewport
- Navigate to `/runner/*` → Mobile-only viewport
- Navigate to `/customer/*` → Mobile-only viewport

## 💡 Tips

1. **Always test with DevTools open**: Use device emulation for accurate testing
2. **Check the indicator**: The dev indicator shows if you're in the right mode
3. **Console logs**: Check console for viewport mode changes
4. **Real devices**: Test on real devices for final validation

## 🐛 Troubleshooting

### Issue: App looks too wide on desktop
**Solution**: Make sure you're testing Runner/Customer routes. The app should show in a centered container.

### Issue: Can't zoom on mobile
**Solution**: This is intentional for Runner/Customer apps. Admin allows zoom.

### Issue: Viewport not updating
**Solution**: 
1. Check console for viewport logs
2. Refresh the page
3. Verify you're on the correct route

## 📚 More Information

See `VIEWPORT_TESTING_GUIDE.md` for detailed testing instructions and browser-specific setup.









