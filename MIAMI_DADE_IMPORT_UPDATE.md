# Miami-Dade County ATM Import - Update Summary

## Changes Made

### 1. Expanded Coverage
- **Previous**: Miami city only (25.60° to 25.88° lat, -80.40° to -80.10° lng)
- **New**: Entire Miami-Dade County (25.20° to 26.00° lat, -80.60° to -80.00° lng)
  - Covers from Homestead/Florida City (south) to Aventura/North Miami Beach (north)
  - Covers from Everglades border (west) to Atlantic coast (east)

### 2. Coarser Grid
- **Previous**: 0.01° step (≈1.1km spacing)
- **New**: 0.02° step (≈2.2km spacing)
- Reduces grid points from ~784 to ~1,200 (but covers much larger area)
- With 2000m search radius, ensures overlap between grid points

### 3. Larger Search Radius
- **Previous**: 1500m
- **New**: 2000m
- Ensures complete coverage with coarser grid
- Better overlap between adjacent grid points

### 4. Features Retained
- ✅ Searches both `type=atm` and `type=bank`
- ✅ Detects `is_in_branch` from place types
- ✅ Detects `is_in_store` from place types
- ✅ Marks bad locations (bitcoin, smoke shops) as `inactive`
- ✅ Proper status handling (active, inactive, temp_closed, perm_closed)

## Cost Estimation

### Grid Calculation
- Latitude range: 0.80° (25.20° to 26.00°)
- Longitude range: 0.60° (-80.60° to -80.00°)
- Grid steps: ~40 lat × 30 lng = ~1,200 grid points
- Searches per point: 2 (atm + bank) = ~2,400 nearby searches
- Place details: ~2,400 (after deduplication, likely ~1,500-2,000 unique)

### API Costs (Google Places API 2024 pricing)
- **Nearby Search**: $32 per 1,000 requests
  - ~2,400 searches = ~$76.80
- **Place Details**: $17 per 1,000 requests
  - ~2,000 unique places = ~$34.00
- **Total Estimated Cost**: ~$110-120

*Note: Actual cost may be lower due to deduplication of place_ids*

## Running the Import

### Prerequisites
1. Environment variables set in `.env.local`:
   ```
   ATM_GOOGLE_PLACES_API_KEY=your_key_here
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Migration applied:
   ```sql
   -- Run: supabase/migrations/20251127_add_inactive_status.sql
   -- Adds 'inactive' status to atm_locations
   ```

### Execution
```bash
npm run import:miami-atms
```

### Expected Output
- Grid points: ~1,200
- Nearby searches: ~2,400 (1,200 × 2 types)
- Unique places found: ~1,500-2,000
- Place details fetched: ~1,500-2,000
- Processing time: ~2-3 hours (with 200ms rate limiting)
- Final database: ~1,500-2,000 ATM locations

### Progress Indicators
- Every 10 grid points: Shows search progress
- Every 50 place details: Shows fetch progress
- Final summary: Shows new/updated counts and status breakdown

## Post-Import Verification

### Check Total Count
```sql
SELECT COUNT(*) FROM atm_locations;
-- Expected: ~1,500-2,000
```

### Check Status Breakdown
```sql
SELECT status, COUNT(*) 
FROM atm_locations 
GROUP BY status 
ORDER BY status;
-- Should show mostly 'active', some 'inactive' for bad locations
```

### Check Branch vs Store
```sql
SELECT 
  is_in_branch,
  is_in_store,
  COUNT(*) 
FROM atm_locations 
GROUP BY is_in_branch, is_in_store;
-- Should show many is_in_branch=true for bank ATMs
```

### Verify Coverage
```sql
-- Check ATMs around 1091 W 59th Pl, Hialeah
SELECT 
  name,
  address,
  city,
  is_in_branch,
  is_in_store,
  status
FROM atm_locations
WHERE lat BETWEEN 25.85 AND 25.90
  AND lng BETWEEN -80.32 AND -80.28
ORDER BY 
  (lat - 25.8764)^2 + (lng - (-80.3060))^2
LIMIT 20;
-- Should show bank ATMs (Bank of America, Regions, TD Bank, etc.)
```

## Key Improvements

1. **Complete Coverage**: All of Miami-Dade County, not just Miami city
2. **Bank ATMs Captured**: Searches `type=bank` to capture bank branches with ATMs
3. **Quality Detection**: Properly identifies branch vs store locations
4. **Bad Location Filtering**: Marks undesirable locations as inactive
5. **Cost Effective**: Coarser grid reduces API calls while maintaining coverage

## Notes

- The import will take ~2-3 hours to complete (due to rate limiting)
- All existing ATMs will be updated (upsert by `google_place_id`)
- Bad locations are marked as `inactive` rather than deleted
- The script handles API errors gracefully and continues processing
- Progress is logged to console for monitoring

## Troubleshooting

### If import fails partway through:
- The script uses upsert, so you can safely re-run it
- It will skip already-imported places (by `google_place_id`)
- Only new/updated places will be processed

### If cost is higher than expected:
- Check Google Cloud Console for actual API usage
- Verify rate limiting is working (200ms delay between calls)
- Consider reducing grid step further if needed (but may miss ATMs)

### If coverage seems incomplete:
- Verify bounding box covers your target area
- Check that search radius (2000m) is sufficient for grid spacing (0.02°)
- Re-run import with smaller grid step if needed

