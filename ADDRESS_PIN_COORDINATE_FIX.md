# Address Pin Coordinate Fix

## Problem
When customers dragged the pin on the address map to adjust the exact meeting spot, the new coordinates were not being persisted to the database. This caused ATM selection to run with null or stale coordinates, leading to incorrect ATM selections.

## Root Cause
1. **Geocoding overwrote pin coordinates**: When the user typed in address fields, geocoding would run and overwrite manually adjusted pin coordinates.
2. **No validation**: The system didn't validate that coordinates were present before attempting ATM selection, leading to silent failures.

## Solution

### 1. Track Pin Movement State (`AddressForm.tsx`)
- Added `pinManuallyMoved` state to track when the user has manually dragged the pin
- When pin is dragged, set `pinManuallyMoved = true` and update coordinates
- Geocoding now respects `pinManuallyMoved` flag and won't overwrite manually adjusted coordinates

### 2. Coordinate Source Logging
- Added logging to track when pin coordinates vs geocoded coordinates are used
- Logs include:
  - `[ADDRESS_FORM] Pin manually moved` - when user drags pin
  - `[ADDRESS_FORM] Using geocoded coordinates` - when geocoding updates coordinates
  - `[ADDRESS_FORM] Skipping geocoded coordinates - pin was manually moved` - when geocoding is prevented
  - `[ADDRESS_FORM] Submitting address` - includes coordinate source (pin/geocoded/none)

### 3. Coordinate Validation Guards
- **`selectBestAtmForAddress.ts`**: Added validation at the start of the function to ensure coordinates are present and valid numbers. Throws an error if coordinates are missing.
- **`api.ts createOrder()`**: Changed from warning to throwing an error when address coordinates are missing. This prevents orders from being created with invalid ATM selections.

### 4. Address Autocomplete Handling
- Updated `onAddressSelected` and `onPlaceSelect` callbacks to respect `pinManuallyMoved` flag
- If pin was manually moved, autocomplete selections won't overwrite the pin coordinates

## Changes Made

### `src/components/address/AddressForm.tsx`
- Added `pinManuallyMoved` state
- Modified `geocodeAddress` to check `pinManuallyMoved` before updating coordinates
- Modified `onMarkerDrag` to set `pinManuallyMoved = true` and log pin movement
- Updated `onAddressSelected` and `onPlaceSelect` to respect pin movement
- Added coordinate source logging in `handleSubmit`

### `src/lib/atm/selectBestAtmForAddress.ts`
- Added coordinate validation guard at function start
- Throws error with detailed logging if coordinates are missing or invalid

### `src/db/api.ts`
- Changed `createOrder()` to throw error instead of warning when address coordinates are missing
- Re-throws ATM selection errors to prevent order creation with invalid ATM selections

## Testing Instructions

### Test 1: Normal Address Creation (No Pin Drag)
1. Add a new delivery address: "1123 Ocean Dr, Miami Beach, FL 33139"
2. Don't drag the pin
3. Save the address
4. **Expected**: Coordinates are geocoded and saved to database
5. Create a cash order from that address
6. **Expected**: ATM selection works correctly, logs show `coordSource: 'geocoded'`

### Test 2: Address with Pin Drag
1. Add a new delivery address: "1123 Ocean Dr, Miami Beach, FL 33139"
2. Drag the pin to a slightly different spot
3. Save the address
4. **Expected**: Pin coordinates are saved, not geocoded coordinates
5. In Supabase, verify:
   ```sql
   SELECT id, line1, city, latitude, longitude, created_at
   FROM customer_addresses
   WHERE line1 ILIKE '%1123%Ocean Dr%'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - `latitude` and `longitude` should NOT be NULL
   - They should match the pin position, not the geocoded position
6. Create a cash order from that address
7. **Expected**: 
   - Console logs show `[ADDRESS_FORM] Pin manually moved`
   - Console logs show `coordSource: 'pin'`
   - ATM selection works correctly with pin coordinates
   - Selected ATM is near the pin location, not the geocoded location

### Test 3: Address Editing with Pin Drag
1. Edit an existing address
2. Drag the pin to a new location
3. Save the address
4. **Expected**: New pin coordinates are saved
5. Create a cash order from that address
6. **Expected**: ATM selection uses the new pin coordinates

### Test 4: Address Editing Without Pin Drag
1. Edit an existing address
2. Change the street address (line1)
3. Don't drag the pin
4. Save the address
5. **Expected**: New geocoded coordinates are saved (since pin wasn't moved)
6. Create a cash order from that address
7. **Expected**: ATM selection uses geocoded coordinates

### Test 5: Missing Coordinates Error
1. Manually set an address's `latitude` and `longitude` to NULL in Supabase
2. Try to create a cash order from that address
3. **Expected**: 
   - Error is thrown: "Address {id} is missing coordinates"
   - Order creation fails
   - Error is logged to console with address details

## Database Verification

After testing, verify coordinates are saved correctly:

```sql
SELECT 
  id,
  line1,
  city,
  latitude,
  longitude,
  created_at,
  updated_at
FROM customer_addresses
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

All addresses should have non-null `latitude` and `longitude` values.

## Console Logs to Watch For

### Successful Pin Movement
```
[ADDRESS_FORM] Pin manually moved { latitude: 25.7907, longitude: -80.1300 }
[ADDRESS_FORM] Submitting address { coordSource: 'pin', pinManuallyMoved: true }
[ATM_SELECTION] start { addressId: '...', addressLat: 25.7907, addressLng: -80.1300 }
```

### Successful Geocoding (No Pin Movement)
```
[ADDRESS_FORM] Using geocoded coordinates { latitude: 25.7907, longitude: -80.1300 }
[ADDRESS_FORM] Submitting address { coordSource: 'geocoded', pinManuallyMoved: false }
[ATM_SELECTION] start { addressId: '...', addressLat: 25.7907, addressLng: -80.1300 }
```

### Geocoding Prevented (Pin Was Moved)
```
[ADDRESS_FORM] Pin manually moved { latitude: 25.7907, longitude: -80.1300 }
[ADDRESS_FORM] Skipping geocoded coordinates - pin was manually moved { pinLat: 25.7907, pinLng: -80.1300 }
```

### Error: Missing Coordinates
```
[ORDER_CREATE][ATM_MISSING] Address missing coordinates { addressId: '...', line1: '...', city: '...' }
Error: Address {id} is missing coordinates
```

## Summary

The fix ensures that:
1. ✅ Pin coordinates are always saved when the user drags the pin
2. ✅ Geocoding never overwrites manually adjusted pin coordinates
3. ✅ Coordinates are validated before ATM selection
4. ✅ Orders cannot be created with missing coordinates
5. ✅ Detailed logging helps diagnose coordinate issues

The system now guarantees that every order receives valid `latitude` and `longitude` from the address, ensuring accurate ATM selection.

