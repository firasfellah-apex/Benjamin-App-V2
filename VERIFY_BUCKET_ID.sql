-- ============================================================================
-- VERIFY BUCKET ID
-- ============================================================================
-- Run this to see the EXACT bucket ID (this is what you use in the code)
-- ============================================================================

SELECT 
  id as bucket_id,  -- This is what you use in .from('bucket_id')
  name as bucket_name,  -- This is the display name
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE LOWER(name) LIKE '%avatar%' OR LOWER(id) LIKE '%avatar%';

-- IMPORTANT: Use the 'id' column value in your code
-- If id = 'Avatars', use: .from('Avatars')
-- If id = 'avatars', use: .from('avatars')
-- ============================================================================

