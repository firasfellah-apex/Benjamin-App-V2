# Viewport Testing Guide

This guide explains how to test the Benjamin app in the correct viewports for each user role.

## Viewport Configuration

The app automatically configures viewports based on the current route:

- **Admin** (`/admin/*`): **Responsive** - Desktop/mobile, web + app
- **Runner** (`/runner/*`): **Mobile-only** - Phone app viewport
- **Customer** (`/customer/*`): **Mobile-only** - Phone app viewport

## Testing in Browser DevTools

### Chrome/Edge DevTools

1. **Open DevTools**: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
2. **Toggle Device Toolbar**: Press `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows)
3. **Select Device**:
   - **Admin**: Test on desktop (1920x1080) and mobile (iPhone 14 Pro, etc.)
   - **Runner/Customer**: Test on mobile devices only (iPhone 14 Pro, Samsung Galaxy S21, etc.)

### Recommended Viewport Sizes

#### Admin (Responsive)
- **Desktop**: 1920x1080, 1440x900, 1280x720
- **Tablet**: 1024x768, 768x1024
- **Mobile**: 428x926 (iPhone 14 Pro Max), 390x844 (iPhone 14 Pro)

#### Runner (Mobile-only)
- **iPhone 14 Pro Max**: 428x926
- **iPhone 14 Pro**: 390x844
- **iPhone SE**: 375x667
- **Samsung Galaxy S21**: 360x800
- **Pixel 5**: 393x851

#### Customer (Mobile-only)
- Same as Runner above

## Quick Testing Shortcuts

### Chrome DevTools Presets

1. Open DevTools → Device Toolbar
2. Click the device dropdown
3. Select a preset:
   - **Admin**: "Desktop" or "Responsive"
   - **Runner/Customer**: "iPhone 14 Pro" or "Samsung Galaxy S21"

### Custom Viewport

1. Open DevTools → Device Toolbar
2. Click "Edit" next to device dropdown
3. Add custom device:
   - **Name**: "Mobile App (428x926)"
   - **Width**: 428
   - **Height**: 926
   - **Device Pixel Ratio**: 3
   - **User Agent**: Mobile (optional)

## Visual Indicators

When testing, you'll see:

### Mobile App Viewport (Runner/Customer)
- On desktop: App appears in a centered container (max-width: 428px)
- On mobile: Full-width, no zoom allowed
- Body class: `mobile-app-viewport`

### Responsive Viewport (Admin)
- On desktop: Full-width layout
- On mobile: Responsive layout with zoom allowed
- Body class: `responsive-viewport`

## Testing Checklist

### Admin App
- [ ] Desktop (1920x1080) - Full layout visible
- [ ] Tablet (1024x768) - Responsive layout
- [ ] Mobile (428x926) - Mobile-optimized layout
- [ ] Zoom functionality works
- [ ] All navigation accessible

### Runner App
- [ ] iPhone 14 Pro Max (428x926) - Primary test size
- [ ] iPhone 14 Pro (390x844) - Standard iPhone
- [ ] Samsung Galaxy (360x800) - Android
- [ ] No horizontal scrolling
- [ ] Touch targets adequate (44x44px minimum)
- [ ] No zoom allowed (user-scalable=no)

### Customer App
- [ ] iPhone 14 Pro Max (428x926) - Primary test size
- [ ] iPhone 14 Pro (390x844) - Standard iPhone
- [ ] Samsung Galaxy (360x800) - Android
- [ ] No horizontal scrolling
- [ ] Touch targets adequate (44x44px minimum)
- [ ] No zoom allowed (user-scalable=no)

## Browser Console Commands

You can check the current viewport mode in the browser console:

```javascript
// Check current viewport mode
document.body.classList.contains('mobile-app-viewport') 
  ? 'Mobile-only' 
  : 'Responsive';

// Check viewport meta tag
document.querySelector('meta[name="viewport"]').content;
```

## Common Issues

### Issue: App looks too wide on desktop
**Solution**: Make sure you're testing Runner/Customer routes. The app should show in a centered container on desktop.

### Issue: Can't zoom on mobile
**Solution**: This is intentional for Runner/Customer apps. Admin allows zoom.

### Issue: Layout breaks on mobile
**Solution**: 
1. Check if you're on the correct route
2. Verify viewport meta tag is set correctly
3. Check browser DevTools device emulation is active

## Development Tips

1. **Keep DevTools Open**: Always test with DevTools device toolbar active
2. **Test Real Devices**: Use Chrome DevTools remote debugging for real device testing
3. **Check Console**: Viewport mode is logged when route changes
4. **Refresh After Route Change**: Viewport updates automatically, but refresh if issues persist

## Real Device Testing

### iOS (Safari)
1. Connect iPhone/iPad via USB
2. Enable "Web Inspector" in Settings → Safari → Advanced
3. Open Safari on Mac → Develop → [Your Device] → [Your Tab]
4. Use Responsive Design Mode in Safari DevTools

### Android (Chrome)
1. Enable "USB Debugging" on Android device
2. Connect via USB
3. Open Chrome on desktop → `chrome://inspect`
4. Click "Inspect" next to your device
5. Use device emulation in Chrome DevTools

## Viewport Meta Tags

The app automatically sets viewport meta tags:

**Mobile-only (Runner/Customer)**:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

**Responsive (Admin)**:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
```

These are set automatically based on the current route - no manual configuration needed!

