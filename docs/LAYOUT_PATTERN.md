# Canonical Scrollable Page Pattern

## Overview
This document describes the standard pattern for creating scrollable pages in the Benjamin mobile app. This pattern ensures consistent behavior across Android and iOS, preventing "sliced screen" issues and content being hidden.

## Root Container Hierarchy

```
html, body, #root
├── height: 100% (or 100dvh for mobile-app-viewport)
├── margin: 0, padding: 0
└── overflow: hidden (prevents root scrolling)
```

## Page Layout Structure

### Standard Pattern (CustomerScreen)

```tsx
<div className="flex h-full flex-col bg-white min-h-0 w-full">
  {/* Fixed Header - NO SCROLL */}
  <header className="shrink-0">
    {/* Header content */}
  </header>

  {/* Fixed Content (dividers, etc.) - NO SCROLL */}
  {fixedContent && (
    <div className="shrink-0">
      {fixedContent}
    </div>
  )}

  {/* MAIN SCROLL CONTAINER - ONLY THIS SCROLLS */}
  <main
    className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
    style={{
      height: 0, // Critical: forces flex-1 to work with overflow-y-auto
      WebkitOverflowScrolling: "touch", // iOS smooth scrolling
    }}
  >
    {/* All scrollable content goes here */}
  </main>

  {/* Fixed Footer/Bottom Bar - NO SCROLL */}
  {bottomSlot && (
    <div className="shrink-0">
      {bottomSlot}
    </div>
  )}
</div>
```

## Key Rules

1. **Root Height**: Use `h-full` (100% of parent), not `h-screen` or `100vh` inside nested flex contexts
2. **Flex Children**: Always add `min-h-0` to flex children that need to scroll
3. **Single Scroll Container**: Only ONE element should have `overflow-y-auto` per page
4. **Fixed Elements**: Use `shrink-0` on headers, footers, and fixed content
5. **Scroll Container**: Use `flex-1 min-h-0` with `height: 0` style trick for reliable scrolling

## Common Mistakes to Avoid

❌ **Don't use `h-screen` inside nested flex containers**
```tsx
// BAD
<div className="flex flex-col">
  <div className="h-screen"> {/* Will cause cropping */}
```

✅ **Use `h-full` instead**
```tsx
// GOOD
<div className="flex flex-col h-full">
  <div className="flex-1 min-h-0 overflow-y-auto">
```

❌ **Don't add multiple scroll containers**
```tsx
// BAD
<div className="overflow-y-auto">
  <div className="overflow-y-auto"> {/* Competing scroll */}
```

✅ **Single scroll container at the page level**
```tsx
// GOOD
<div className="flex-1 min-h-0 overflow-y-auto">
  {/* All content here */}
</div>
```

## Mobile App Viewport

For Capacitor apps, the `body.mobile-app-viewport` class applies:
- `height: 100dvh` (with `100vh` fallback)
- `overflow: hidden` on root
- Flex layout constraints

Pages should inherit from this structure, not override it.

