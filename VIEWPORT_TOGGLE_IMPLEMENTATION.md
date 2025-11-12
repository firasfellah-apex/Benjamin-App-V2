# Viewport Toggle Implementation

## Summary

Added a dev-only viewport toggle that allows switching between different viewport modes for development/preview without affecting auth, roles, or core logic.

## Files Changed

### 1. `src/hooks/useViewport.ts`
- **Extended `ViewportMode` type**: Now supports `'auto' | 'customer' | 'runner' | 'admin' | 'full'`
- **Added `useViewportMode()` hook**: Manages explicit mode selection with localStorage persistence
- **Updated `useViewport()` hook**: Now uses explicit mode when set, falls back to auto-detection
- **Added `getAppliedMode()` function**: Maps explicit modes to actual viewport classes and modes
- **Added app-specific classes**: `customer-app-viewport`, `runner-app-viewport`, `admin-app-viewport`

### 2. `src/components/dev/ViewportToggle.tsx` (NEW)
- **Dev-only component**: Only renders in development (`import.meta.env.PROD` check)
- **Floating toggle**: Top-right corner with dropdown to switch modes
- **Persistent state**: Uses localStorage to remember selected mode
- **Clean UI**: Minimal pill design with backdrop blur

### 3. `src/App.tsx`
- **Added ViewportToggle**: Mounted at root level, before other content

### 4. `src/components/dev/ViewportIndicator.tsx`
- **Updated to show explicit mode**: Now displays both explicit and applied modes

### 5. `src/index.css`
- **Added app-specific viewport classes**: Placeholder classes for future styling needs

## How It Works

### Modes

1. **Auto** (default): Derives viewport from current route
   - `/customer/*` → Mobile phone frame + customer theme
   - `/runner/*` → Mobile phone frame + runner theme
   - `/admin/*` → Full width + admin theme
   - Default → Responsive

2. **Customer**: Forces mobile phone frame + customer theme (regardless of route)

3. **Runner**: Forces mobile phone frame + runner theme (regardless of route)

4. **Admin**: Forces full width + admin theme (regardless of route)

5. **Full Web**: Normal responsive behavior, no constraints

### State Management

- Mode is stored in `localStorage` as `'viewport-mode'`
- Defaults to `'auto'` if not set
- Changes are immediately applied and persisted

### Body Classes Applied

- **Mobile-only modes** (customer, runner): `mobile-app-viewport` + `{app}-app-viewport`
- **Responsive modes** (admin, full): `responsive-viewport` + `{app}-app-viewport` (if applicable)
- **Auto mode**: Depends on current route

## Testing

### In Development

1. **Toggle appears**: Top-right corner, visible in dev mode only
2. **Switching modes**: Immediately changes viewport behavior
3. **Persistence**: Mode persists across page refreshes
4. **Console logs**: Shows explicit mode, applied mode, and route

### In Production

1. **Toggle hidden**: Component returns `null` in production
2. **Falls back to auto**: Uses route-based detection
3. **No performance impact**: Component never renders

## Usage

1. Open app in development mode
2. Use dropdown in top-right to select viewport mode
3. Preview different app views without changing routes or auth
4. Mode persists across page refreshes

## Benefits

- ✅ **No CSS hacks**: Clean implementation, no global overrides
- ✅ **No auth changes**: Doesn't affect authentication or roles
- ✅ **No routing changes**: Works with existing routes
- ✅ **Dev-only**: Automatically hidden in production
- ✅ **Persistent**: Remembers your preference
- ✅ **Lightweight**: Minimal code, no extra dependencies

## Next Steps

Once stable, we can use this to:
- Tighten customer home flows
- Refine runner home motivation
- Polish admin god-view dashboard
- All without worrying about viewport simulation issues

