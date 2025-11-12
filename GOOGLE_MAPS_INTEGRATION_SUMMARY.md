# Google Maps Integration Summary

## Overview
Implemented a safe, test-friendly Google Maps integration for the customer active delivery experience. The implementation follows strict principles to never block core flows and gracefully handles missing API keys or script failures.

## Files Created/Modified

### 1. `package.json`
- **Added**: `@react-google-maps/api`: `^2.19.3`
- **Purpose**: Google Maps React library

### 2. `src/lib/env.ts`
- **Added**: `VITE_GOOGLE_MAPS_API_KEY` (optional)
- **Added**: `VITE_APP_ENV` (optional, supports 'development' | 'staging' | 'production')
- **Added exports**:
  - `googleMapsApiKey`: Returns the API key (never throws)
  - `appEnv`: Returns app environment (falls back to VITE_API_ENV)
  - `isProd`: Checks if running in production
  - `hasGoogleMaps`: Checks if Google Maps API key is available

### 3. `src/components/map/BenjaminMap.tsx` (NEW)
- **Purpose**: Safe wrapper around Google Maps API
- **Features**:
  - Handles script loading with `LoadScript`
  - Shows fallback UI if API key missing or script fails
  - Clean map UI (minimal controls, no POI labels)
  - Supports customer/runner markers and path polyline
  - Never throws errors; gracefully degrades
- **Props**:
  - `center`: Map center position (required)
  - `runnerPosition`: Optional runner marker
  - `customerPosition`: Optional customer marker
  - `path`: Optional polyline path
  - `zoom`: Zoom level (default: 14)
  - `height`: Map height (default: '220px')
  - `fallback`: Custom fallback content
  - `onLoadError`: Callback when map fails to load

### 4. `src/components/customer/CustomerActiveDeliveryMap.tsx` (NEW)
- **Purpose**: Customer-facing map component for active deliveries
- **Features**:
  - Only shows map when `canShowLiveLocation(order.status)` is true
  - In dev/non-prod: Uses mock Brickell coordinates with animated runner path
  - In prod: Uses real coordinates from `order.address_snapshot` (future-ready)
  - Shows "Location hidden" UI for early order states
  - Displays runner info when allowed by reveal rules
  - Animates runner marker along mock path in dev mode
- **Behavior**:
  - **Before cash withdrawn**: Shows "Location hidden" card with safety message
  - **After cash withdrawn**: Shows live map with runner → customer path
  - **Dev mode**: Animates runner along hard-coded path (Brickell area)
  - **Prod mode**: Ready for real coordinates (when available in DB)

### 5. `src/pages/customer/CustomerHome.tsx`
- **Modified**: Integrated `CustomerActiveDeliveryMap` into active delivery card
- **Changes**:
  - Replaced static runner info with map component
  - Map automatically shows/hides based on order status
  - Button text changed from "Track delivery" to "View full tracking"

## Mock Data (Dev/Non-Prod)

### Mock Coordinates
- **Customer Location**: Brickell City Centre area (25.7683, -80.1937)
- **Runner Path**: 4-point path from north of customer to customer location
- **Animation**: Runner marker moves along path every 2 seconds

### Mock Path Points
```typescript
[
  { lat: 25.7730, lng: -80.1900 }, // Start (north)
  { lat: 25.7715, lng: -80.1915 }, // Mid 1
  { lat: 25.7700, lng: -80.1925 }, // Mid 2
  { lat: 25.7683, lng: -80.1937 }, // Customer
]
```

## Safety Features

1. **Never Blocks Core Flows**:
   - If API key missing → Shows fallback UI
   - If script fails to load → Shows fallback UI
   - If coordinates missing → Shows fallback UI
   - No errors thrown to user

2. **Status-Based Visibility**:
   - Map only shows when `order.status >= 'Cash Withdrawn'`
   - Early states show "Location hidden" message
   - Respects existing `canShowLiveLocation` logic

3. **Production-Ready**:
   - Same components work in prod with real coordinates
   - No refactoring needed when real location tracking is added
   - Ready to read `order.runner_lat/lng` when available in DB

## Environment Variables

### Required (for Maps to work)
```bash
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Optional
```bash
VITE_APP_ENV=production  # or 'development' | 'staging'
```

### Fallback Behavior
- If `VITE_GOOGLE_MAPS_API_KEY` is missing → Fallback UI shown
- If `VITE_APP_ENV` is not set → Falls back to `VITE_API_ENV` or 'development'
- In non-production → Uses mock coordinates
- In production → Uses real coordinates (when available)

## Testing Checklist

- [x] No map shown for pending/unassigned requests
- [x] "Location hidden" shown for early states
- [x] Map appears when status >= 'Cash Withdrawn'
- [x] Mock animation works in dev mode
- [x] Fallback UI shown when API key missing
- [x] No TypeScript errors
- [x] No console errors when Maps unavailable
- [x] Core flows not blocked

## Future Enhancements

1. **Real Runner Location**:
   - Add `runner_lat` and `runner_lng` fields to `orders` table
   - Update `CustomerActiveDeliveryMap` to use real coordinates in prod
   - No component changes needed; just pass real data

2. **Live Location Updates**:
   - Subscribe to runner location updates via Supabase Realtime
   - Update `runnerPosition` in real-time
   - Animate marker smoothly between updates

3. **Admin Map View**:
   - Create `AdminActiveDeliveriesMap` component
   - Show all active deliveries on one map
   - Filter by status, runner, etc.

## Notes

- Mock coordinates are hard-coded in `CustomerActiveDeliveryMap.tsx`
- Animation only runs in dev/non-prod mode
- No database writes for mock locations (purely visual)
- Map respects existing reveal rules (`canShowLiveLocation`, `canRevealRunnerIdentity`)
- Styles match existing customer theme (neutral colors, rounded cards)

