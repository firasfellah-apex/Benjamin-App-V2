-- Move extensions from public schema to extensions schema
-- WARNING: Test this in a staging environment first!
-- These extensions are used by PostGIS/geography features

-- Step 1: Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Step 2: Move cube extension
-- Note: This may fail if cube is being used by other objects
-- If it fails, check what's using it:
-- SELECT * FROM pg_depend WHERE refobjid = (SELECT oid FROM pg_extension WHERE extname = 'cube');
ALTER EXTENSION cube SET SCHEMA extensions;

-- Step 3: Move earthdistance extension
-- Note: This may fail if earthdistance is being used by other objects
ALTER EXTENSION earthdistance SET SCHEMA extensions;

-- Step 4: Verify the move
SELECT 
  extname as extension_name,
  n.nspname as schema_name,
  CASE 
    WHEN n.nspname = 'extensions' THEN '✅ Moved successfully'
    WHEN n.nspname = 'public' THEN '⚠️ Still in public schema'
    ELSE '❓ Unknown schema'
  END as status
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname IN ('cube', 'earthdistance')
ORDER BY extname;

-- Step 5: Check if anything depends on these extensions
-- If you see dependencies, you may need to update them
SELECT 
  d.classid::regclass as dependent_type,
  d.objid::regclass as dependent_object,
  d.refobjid::regclass as extension
FROM pg_depend d
JOIN pg_extension e ON d.refobjid = e.oid
WHERE e.extname IN ('cube', 'earthdistance')
  AND d.deptype = 'n'; -- normal dependency

-- Note: After moving, you may need to:
-- 1. Update any code that explicitly references public.cube or public.earthdistance
-- 2. Test all location/geography queries
-- 3. Verify PostGIS functions still work correctly

