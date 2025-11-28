# ATM Selection System - Improvements Applied

## Changes Made

### 1. Enhanced "D & B ATM Services" Detection

**Problem**: "D & B ATM Services" was still being selected despite being a generic ATM service company (not a bank).

**Solution**:
- Added `'d & b'` and `'d&b'` to `BAD_KEYWORDS` array
- Increased penalty score from -150 to -200 for ATM services companies
- Improved case-insensitive matching for bad keywords

**Files Modified**:
- `src/lib/atm/selectBestAtmForAddress.ts`:
  - Lines 585-586: Added "d & b" variants to BAD_KEYWORDS
  - Lines 643-647: Increased penalty and added explicit "d & b" check
  - Lines 601-603: Improved case-insensitive bad keyword matching

### 2. Enhanced Debug Logging

**Problem**: Limited visibility into why Wells Fargo might not appear or why only 31 ATMs are found.

**Solution**: Added comprehensive debug logging:

1. **Total ATM Count & Status Breakdown**:
   - Logs total ATMs in database
   - Shows breakdown by status (active, temp_closed, perm_closed, null)
   - Helps identify if RLS or status filtering is removing ATMs

2. **Wells Fargo Detection**:
   - Enhanced logging to show count of Wells Fargo ATMs found
   - Shows total ATM count for context
   - Includes status for each Wells Fargo ATM found

3. **Major Bank Counts**:
   - Logs counts for all major banks (Chase, Bank of America, Citi, TD Bank, PNC, BankUnited)
   - Helps verify data completeness

4. **Low Candidate Count Warning**:
   - If fewer than 50 candidates found, logs distance distribution
   - Helps diagnose if search radius or coordinates are the issue

**Files Modified**:
- `src/lib/atm/selectBestAtmForAddress.ts`:
  - Lines 472-487: Enhanced ATM fetch logging with status breakdown
  - Lines 489-508: Enhanced Wells Fargo debug with major bank counts
  - Lines 200-211: Added low candidate count warning

## Testing & Debugging Guide

### 1. Verify Wells Fargo in Database

Run this SQL query to check if Wells Fargo ATMs exist:

```sql
SELECT 
  id,
  name,
  address,
  lat,
  lng,
  status
FROM atm_locations
WHERE LOWER(name) LIKE '%wells fargo%'
ORDER BY name;
```

**Expected**: Should return multiple Wells Fargo ATMs in Miami area.

**If empty**: 
- Check if data import completed successfully
- Verify you're querying the correct database/environment
- Check RLS policies aren't blocking access

### 2. Check Total ATM Count

```sql
SELECT 
  status,
  COUNT(*) as count
FROM atm_locations
GROUP BY status
ORDER BY status;
```

**Expected**: Should see ~1,600 total ATMs (mostly 'active' status).

**If low count**:
- Verify migration `20251127_create_atm_system.sql` ran successfully
- Check if import script completed
- Verify RLS policies allow SELECT access

### 3. Test ATM Selection for Specific Address

1. Clear any cached preferences:
   ```sql
   DELETE FROM address_atm_preferences
   WHERE customer_address_id = '<ADDRESS_ID>';
   ```

2. Create a new order from the address

3. Check browser console for:
   - `[ATM_SELECTION][DEBUG] Total ATMs in database` - Should show ~1,600
   - `[ATM_SELECTION][DEBUG] wellsInAllAtms` - Should show Wells Fargo count > 0
   - `[ATM_SELECTION][DEBUG] Major bank counts` - Should show counts for all major banks
   - `[ATM_SELECTION] candidates` - Should show 200+ within 10km for Miami addresses
   - `[ATM_SELECTION] nearbyBankAtms` - Should show bank ATMs within 4km
   - `[ATM_SELECTION] chosen` - Final selection should be a bank (isBank: true)

### 4. Verify "D & B ATM Services" is Avoided

1. Check if any orders have "D & B ATM Services" selected:
   ```sql
   SELECT 
     o.id,
     o.pickup_name,
     o.pickup_address,
     a.name AS atm_name
   FROM orders o
   LEFT JOIN atm_locations a ON o.atm_id = a.id
   WHERE LOWER(a.name) LIKE '%d & b%' 
      OR LOWER(a.name) LIKE '%d&b%'
   ORDER BY o.created_at DESC
   LIMIT 10;
   ```

2. If found, clear the bad preference and test again:
   ```sql
   DELETE FROM address_atm_preferences
   WHERE atm_id IN (
     SELECT id FROM atm_locations 
     WHERE LOWER(name) LIKE '%d & b%' OR LOWER(name) LIKE '%d&b%'
   );
   ```

### 5. Diagnose Low ATM Count (31 ATMs)

If only 31 ATMs are found within 10km:

1. **Check coordinates are correct**:
   - Verify address coordinates are in Miami area
   - Miami center: ~25.7617° N, 80.1918° W
   - 10km radius should cover most of Miami

2. **Check distance calculation**:
   - Look at `[ATM_SELECTION] closestByDistance (debug)` log
   - Verify distances are reasonable (should be < 10km for Miami addresses)

3. **Check if ATMs are being filtered**:
   - Look at `[ATM_SELECTION][DEBUG] Total ATMs in database` log
   - If total is low (< 100), data import may have failed
   - If total is high (~1,600) but candidates are low, check coordinates

4. **Verify RLS policies**:
   ```sql
   -- Check RLS is enabled and policies exist
   SELECT 
     schemaname,
     tablename,
     policyname,
     permissive,
     roles,
     cmd,
     qual
   FROM pg_policies
   WHERE tablename = 'atm_locations';
   ```

## Known Issues Status

### ✅ Fixed
- "D & B ATM Services" detection improved (added to BAD_KEYWORDS, increased penalty)
- Case-insensitive bad keyword matching
- Enhanced debug logging for troubleshooting

### 🔍 Needs Investigation
1. **Wells Fargo not appearing**: 
   - Use enhanced debug logs to verify if Wells Fargo exists in database
   - Check if RLS is filtering them out
   - Verify data import included Wells Fargo locations

2. **Only 31 ATMs found**:
   - Use enhanced logging to see total ATM count
   - Verify coordinates are correct for Miami addresses
   - Check if distance calculation is working correctly
   - Verify RLS policies aren't filtering out ATMs

## Next Steps

1. **Run tests** with the enhanced logging to gather diagnostic data
2. **Check database** to verify ATM data completeness
3. **Review console logs** from order creation to identify root causes
4. **Update status filter** once ATM curation is implemented (currently disabled intentionally)

## Key Constants

- `MAX_BANK_RADIUS_METERS = 4000` (4km bank window)
- `MAX_SEARCH_RADIUS_METERS = 10000` (10km max search)
- `MAX_REASONABLE_DISTANCE_METERS = 4000` (4km safety guard threshold)
- `BAD_KEYWORDS` now includes: `'d & b'`, `'d&b'` (case-insensitive)
- ATM Services penalty: `-200` (increased from -150)

## Important Notes

- Status filter is intentionally disabled in `findScoredAtms()` to ensure full dataset access
- Cached preferences are validated for bank-quality before use
- Safety guard prefers bank ATMs even if chosen ATM is far
- All keyword matching is now case-insensitive for better detection

