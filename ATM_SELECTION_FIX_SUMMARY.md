# ATM Selection Fix - Summary

## Problem
For address **1091 W 59th Pl, Hialeah, FL 33012**, the system was selecting gas station ATMs (Exxon) and "D & B ATM Services" instead of nearby bank ATMs (Bank of America, Regions, TD Bank, Ocean Bank, Space Coast Credit Union) that exist within 1-2km.

## Root Causes Identified

1. **Data Coverage Issue**: Import script only searched for `type=atm`, missing `type=bank` locations
2. **Missing Bank Detection**: `is_in_branch` and `is_in_store` were always `false` because place types weren't being checked
3. **Bad ATMs Not Filtered**: Gas stations and ATM services companies were being considered as candidates
4. **No Status Filtering**: Inactive/temp_closed ATMs weren't being filtered out

## Changes Made

### 1. Import Script (`scripts/importMiamiAtms.ts`)

**Enhanced to capture bank ATMs:**
- Now searches for **both** `type=atm` **and** `type=bank` from Google Places API
- Fetches `types` field from Place Details API
- Properly detects `is_in_branch` from place types (`bank`, `credit_union`) or name patterns
- Properly detects `is_in_store` from place types (`convenience_store`, `gas_station`, etc.) or name patterns
- Marks bad locations (bitcoin ATMs, smoke shops, liquor stores) as `status='inactive'`

**Key changes:**
- `searchNearbyAtms()`: Now makes two API calls (atm + bank) and merges results
- `getPlaceDetails()`: Now includes `types` field in API request
- `mapPlaceToAtmLocation()`: 
  - Detects `is_in_branch` from types or name
  - Detects `is_in_store` from types or name
  - Calls `isBadLocation()` to mark undesirable ATMs as inactive

### 2. Database Migration (`supabase/migrations/20251127_add_inactive_status.sql`)

**Added 'inactive' status:**
- Updated `atm_locations_status_check` constraint to include `'inactive'`
- Allows marking bad locations (bitcoin/crypto, smoke shops, etc.) without deleting them

### 3. Selection Logic (`src/lib/atm/selectBestAtmForAddress.ts`)

**Hardened to prefer banks and exclude bad ATMs:**

1. **Status Filtering:**
   - Now filters to only `status='active'` or `status IS NULL` (backward compatibility)
   - Excludes `inactive`, `temp_closed`, `perm_closed` ATMs

2. **Bad ATM Exclusion:**
   - In `findScoredAtms()`, bad ATMs (gas stations, ATM services) are **completely excluded** from candidates if they're not bank-quality
   - This means "ATM (Exxon)" and "D & B ATM Services" will never be considered unless there are literally zero other options

3. **Enhanced Debug Logging:**
   - Added `candidateCheck` log showing for closest 10 candidates:
     - `isBank`: Whether it's bank-quality
     - `hasBadKeyword`: Whether it has bad keywords
     - `isInBranch`, `isInStore`: Location type flags

### 4. Diagnostic Script (`scripts/checkAtmCoverage.ts`)

**New utility to check data coverage:**
- Queries all ATMs within 3km of a target address
- Checks for expected bank ATMs
- Shows summary by type (bank, gas station, ATM services)
- Helps diagnose data coverage issues

## Next Steps

### Step 1: Run Migration
```sql
-- Apply the migration to add 'inactive' status
-- This is in: supabase/migrations/20251127_add_inactive_status.sql
```

Or via Supabase CLI:
```bash
supabase migration up
```

### Step 2: Re-import Miami ATMs
```bash
npm run import:miami-atms
```

This will:
- Search for both `type=atm` and `type=bank`
- Properly detect `is_in_branch` and `is_in_store`
- Mark bad locations as `inactive`
- Should capture bank ATMs that were previously missing

### Step 3: Verify Data Coverage
```bash
npx tsx scripts/checkAtmCoverage.ts
```

This will show:
- Total ATMs within 3km of 1091 W 59th Pl
- Whether expected bank ATMs exist (Bank of America, Regions, TD Bank, etc.)
- Summary by type

### Step 4: Clear Bad Preferences
```sql
DELETE FROM address_atm_preferences
WHERE customer_address_id = 'f02ca17f-c9ca-46b6-b177-142af722fa47';
```

### Step 5: Test Order Creation
1. Create a new order from 1091 W 59th Pl, Hialeah, FL 33012
2. Check console logs for:
   - `[ATM_SELECTION][DEBUG] candidateCheck` - Should show bank ATMs with `isBank: true`
   - `[ATM_SELECTION] nearbyBankAtms` - Should list bank ATMs within 4km
   - `[ATM_SELECTION] chosen` - Should be a bank ATM (not Exxon or D&B)

### Step 6: Verify in Database
```sql
SELECT 
  o.id,
  o.pickup_name,
  o.pickup_address,
  o.pickup_lat,
  o.pickup_lng,
  a.name AS atm_name,
  a.address AS atm_address,
  a.city AS atm_city,
  a.is_in_branch,
  a.is_in_store
FROM orders o
LEFT JOIN atm_locations a ON o.atm_id = a.id
WHERE o.customer_address_id = 'f02ca17f-c9ca-46b6-b177-142af722fa47'
ORDER BY o.created_at DESC
LIMIT 5;
```

**Expected result:** `pickup_name` should be a bank ATM (e.g., "Bank of America ATM", "Regions ATM", "TD Bank ATM") within ~1-2km, NOT "ATM (Exxon)" or "D & B ATM Services".

## Key Improvements

1. **Data Completeness**: Import now captures bank ATMs that were previously missed
2. **Quality Detection**: Properly identifies branch vs store locations
3. **Bad ATM Exclusion**: Gas stations and ATM services are excluded unless no other options
4. **Status Filtering**: Only active ATMs are considered
5. **Better Logging**: Enhanced debug logs help diagnose issues

## Testing Checklist

- [ ] Migration applied (`inactive` status available)
- [ ] Re-import completed (both `type=atm` and `type=bank` searched)
- [ ] Coverage check shows bank ATMs within 3km
- [ ] Bad preferences cleared
- [ ] New order created from 1091 W 59th Pl
- [ ] Console shows bank ATMs in `nearbyBankAtms`
- [ ] Selected ATM is a bank (not Exxon/D&B)
- [ ] Database query confirms bank ATM selected

## Files Modified

1. `scripts/importMiamiAtms.ts` - Enhanced to search banks and detect branch/store
2. `supabase/migrations/20251127_add_inactive_status.sql` - Added inactive status
3. `src/lib/atm/selectBestAtmForAddress.ts` - Hardened selection logic
4. `scripts/checkAtmCoverage.ts` - New diagnostic utility

## Notes

- The import script will take longer now (2x API calls per grid point), but will capture more complete data
- Bad locations are marked as `inactive` rather than deleted, so they can be reviewed later
- The selection logic now has multiple layers of protection against bad ATMs:
  1. Status filter (excludes inactive)
  2. Bad keyword exclusion (excludes gas stations, ATM services)
  3. Bank-first strategy (prefers banks within 4km)
  4. Safety guard (prefers banks even if far)

