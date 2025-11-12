# Debugging Hover Effects in Mobile App Viewport

## Quick Debug Steps

1. **Check if `mobile-app-viewport` class is applied:**
   - Open DevTools (F12)
   - Inspect the `<body>` element
   - Look for `class="mobile-app-viewport"` or `class="responsive-viewport"`
   - If you see `responsive-viewport`, the hook isn't working correctly

2. **Check current route:**
   - The viewport class should be `mobile-app-viewport` for:
     - `/customer/*` routes
     - `/runner/*` routes
   - The viewport class should be `responsive-viewport` for:
     - `/admin/*` routes

3. **Test CSS specificity:**
   - In DevTools, hover over an element that's changing
   - Check the "Computed" tab
   - Look for hover-related properties (background-color, transform, etc.)
   - See which CSS rules are being applied

4. **Check for inline hover classes:**
   - Many components use Tailwind hover classes like `hover:bg-black/90`
   - These need to be overridden with higher specificity

## Common Issues

1. **Class not applied:** The `useViewport` hook might not be running
2. **CSS specificity too low:** Tailwind hover classes might have higher specificity
3. **`revert-layer` not working:** Browser might not support it or it's reverting to wrong layer

## Quick Fix Test

Add this to your browser console to force the class:
```javascript
document.body.classList.add('mobile-app-viewport');
document.body.classList.remove('responsive-viewport');
```

Then test if hover effects are gone.

