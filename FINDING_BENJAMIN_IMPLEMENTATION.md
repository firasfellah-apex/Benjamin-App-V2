# Finding Benjamin Animation & Mapbox Brand Style Implementation

## Summary

Implemented the "Finding your Benjamin" animation screen and updated Mapbox maps to use a consistent dark/green brand style that matches the animation aesthetic.

## Changes Made

### 1. FindingBenjamin Animation Component ✅

**File:** `src/components/Loading/FindingBenjamin.tsx`

- Created full-screen loading/transition component
- Uses Lottie animation (placeholder for now)
- Brand colors matching Mapbox theme:
  - Background: `#05060A` (very dark)
  - Primary green: `#02C97A`
  - Highlight green: `#4BF5A7`
- Displays message and subtitle
- Fixed position overlay with z-index 9999

**Note:** Currently uses a placeholder animation. Replace with actual `finding-benjamin.json` Lottie file when available.

### 2. Order Flow Integration ✅

**File:** `src/pages/customer/OrderTracking.tsx`

- Added `isFindingBenjamin` state to control animation display
- Shows FindingBenjamin screen:
  - When order is first loading
  - For minimum 1.5 seconds (1500ms) to ensure smooth transition
- Transitions to tracking view after:
  - Order is loaded AND
  - Minimum animation duration has passed
- Uses `findingBenjaminStartTimeRef` to track animation start time

**Flow:**
1. User confirms order → navigates to `/customer/deliveries/{orderId}`
2. FindingBenjamin screen appears immediately
3. Order loads in background
4. After order loads + 1.5s minimum, transitions to tracking map

### 3. Mapbox Style URL Configuration ✅

**Files:**
- `src/lib/env.ts` - Added `MAPBOX_STYLE_URL` to env bundle
- `src/lib/mapboxTheme.ts` - Updated `getBenjaminMapStyle()` to use env variable
- `src/components/maps/TrackingMap.tsx` - Updated to use env style URL
- `src/components/maps/RunnerDirectionsMap.tsx` - Already uses `getBenjaminMapStyle()`

**Environment Variable:**
- Add to `.env.local`: `VITE_MAPBOX_STYLE_URL=mapbox://styles/youraccount/your-benjamin-style`
- Falls back to `mapbox://styles/mapbox/dark-v11` if not set
- Theme colors are still applied via `applyBenjaminTheme()` if using fallback

### 4. Updated Brand Colors ✅

**File:** `src/lib/mapboxTheme.ts`

Updated `BENJAMIN_COLORS` to match new brand spec:

**Base / Land:**
- Canvas: `#05060A` (very dark background)
- Land: `#0C1016` (slightly lighter)
- Water: `#050A12` (very dark blue-green)

**Buildings:**
- Fill: `#151923`
- Outline: `#1F2430` (at low opacity)

**Roads:**
- Primary: `#1F2430` - `#262C3A`
- Minor/local: `rgba(31, 36, 48, 0.7)` (darker with opacity)

**Labels / POIs:**
- Text: `#9CA3AF` (very subtle, low opacity)
- Reduced font size and opacity

**Route Line:**
- Stroke: `#02C97A` (primary green)
- Outline/glow: `#4BF5A7` (highlight green at low opacity)

**New Colors Added:**
- `emeraldDeep: '#007A4B'` - Deep glow base
- `emeraldAmbient: '#10231A'` - Ambient dark green

**New Function:**
- `createBenjaminRouteLayerWithGlow()` - Creates route with glow effect using highlight green

## Next Steps

### 1. Add Actual Lottie Animation File

**Location:** `public/lottie/finding-benjamin.json` or `src/assets/lottie/finding-benjamin.json`

**Requirements:**
- Abstract city map roads with green paths flowing toward central green dot
- Match brand colors:
  - Background tones: `#0C1016`, `#151923`, `#1F2430`
  - Green paths: `#02C97A` (primary), `#4BF5A7` (highlight)
  - Deep glow: `#007A4B`

**Update FindingBenjamin.tsx:**
```typescript
// Replace placeholder with:
import findingBenjaminAnimation from '@/assets/lottie/finding-benjamin.json';
// or
import findingBenjaminAnimation from '/lottie/finding-benjamin.json';
```

### 2. Create Mapbox Studio Style

**In Mapbox Studio:**

1. Start from `dark-v11` style
2. Override colors to match spec:
   - **Base / Land:** `#05060A` to `#0C1016`
   - **Buildings:** Fill `#151923`, Outline `#1F2430` (low opacity)
   - **Roads:** Main `#1F2430` - `#262C3A`, Minor `rgba(31, 36, 48, 0.7)`
   - **Water:** `#050A12`
   - **Labels:** `#9CA3AF` (low opacity, reduced size)
3. Save and copy the Style URL
4. Add to `.env.local`: `VITE_MAPBOX_STYLE_URL=mapbox://styles/youraccount/your-benjamin-style`

### 3. Test the Flow

**Customer Flow:**
1. Place an order
2. After confirming, FindingBenjamin screen should appear
3. After ~1.5-2s and order hydration, transitions to tracking map
4. Map should use dark brand style (custom or fallback with theme applied)

**Map Style Verification:**
- Both customer & runner maps share the same dark style
- No bright blue/white default Mapbox colors
- Route/markers show properly over dark base
- Green route lines match animation colors

### 4. Optional: Dynamic Subtitle

The subtitle can be made dynamic based on ATM selection status:

```typescript
// In OrderTracking.tsx, when order has ATM assigned:
const subtitle = order.atm_id 
  ? "Locking in the closest bank ATM near you."
  : "Matching the closest bank ATM and best runner for you.";
```

## Files Modified

1. ✅ `src/components/Loading/FindingBenjamin.tsx` (new)
2. ✅ `src/pages/customer/OrderTracking.tsx`
3. ✅ `src/lib/env.ts`
4. ✅ `src/lib/mapboxTheme.ts`
5. ✅ `src/components/maps/TrackingMap.tsx`

## Files Using Mapbox (Already Updated)

- ✅ `src/components/maps/RunnerDirectionsMap.tsx` - Uses `getBenjaminMapStyle()`
- ✅ Other map components will inherit the style via `getBenjaminMapStyle()`

## Environment Variables

Add to `.env.local`:
```bash
# Mapbox custom style URL (optional - falls back to dark-v11 with theme applied)
VITE_MAPBOX_STYLE_URL=mapbox://styles/youraccount/your-benjamin-style
```

## Testing Checklist

- [ ] FindingBenjamin screen appears after order confirmation
- [ ] Animation plays smoothly (placeholder or real)
- [ ] Minimum 1.5s duration is respected
- [ ] Transition to tracking map is smooth
- [ ] Mapbox maps use dark brand style
- [ ] Route lines are green (#02C97A)
- [ ] Both customer and runner maps match
- [ ] No bright default Mapbox colors visible

## Notes

- The placeholder animation is a simple pulsing green dot
- Replace with actual Lottie file when available
- Mapbox style URL is optional - theme colors are applied if using fallback
- All colors match the brand spec provided
- Animation is full-screen overlay, blocking interaction until transition

