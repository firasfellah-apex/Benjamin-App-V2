-- ============================================================================
-- VERIFY AVATAR POLICIES
-- ============================================================================
-- Run this to check if the avatar policies were created successfully
-- ============================================================================

-- Check what buckets exist (to see the exact bucket ID)
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id LIKE '%avatar%' OR name LIKE '%avatar%';

-- Check if policies exist for the avatars bucket
SELECT 
  policyname, 
  cmd as operation,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND (policyname LIKE '%avatar%' OR qual::text LIKE '%avatars%' OR with_check::text LIKE '%avatars%')
ORDER BY policyname;

-- Count total policies for storage.objects
SELECT COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';









