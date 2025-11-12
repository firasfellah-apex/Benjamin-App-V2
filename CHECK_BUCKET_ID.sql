-- ============================================================================
-- CHECK BUCKET ID (Case-Sensitive)
-- ============================================================================
-- Run this to see the EXACT bucket ID (case matters!)
-- ============================================================================

SELECT id, name, public 
FROM storage.buckets 
WHERE LOWER(name) LIKE '%avatar%' OR LOWER(id) LIKE '%avatar%';

-- The 'id' column is what you use in the API calls
-- If it shows 'Avatars' (capital A), update the code to use 'Avatars'
-- If it shows 'avatars' (lowercase), the code should work as-is

