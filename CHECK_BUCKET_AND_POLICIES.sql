-- ============================================================================
-- CHECK BUCKET ID AND POLICIES
-- ============================================================================
-- Run this first to see what the actual bucket ID is
-- ============================================================================

-- Check what buckets exist and their exact IDs
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
ORDER BY id;

-- Check if any policies exist for storage.objects
SELECT 
  policyname, 
  cmd as operation,
  roles,
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- Check specifically for avatar-related policies
SELECT 
  policyname, 
  cmd as operation,
  roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND (policyname LIKE '%avatar%' OR policyname LIKE '%Avatar%')
ORDER BY policyname;

