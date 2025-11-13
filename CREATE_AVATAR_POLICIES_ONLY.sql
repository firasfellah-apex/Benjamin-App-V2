-- ============================================================================
-- CREATE AVATAR STORAGE POLICIES (ONLY)
-- ============================================================================
-- IMPORTANT: You MUST create the "avatars" bucket via Dashboard first!
-- 
-- Steps:
-- 1. Go to Storage → New Bucket
-- 2. Name: avatars
-- 3. Public: Yes
-- 4. File size limit: 5242880 (5MB)
-- 5. Allowed MIME types: image/jpeg, image/png, image/webp
-- 6. Then run this script to create the policies
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;

-- Policy 1: Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow public read access to all avatars
CREATE POLICY "Public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================================================
-- VERIFICATION (Run these after creating the bucket and policies)
-- ============================================================================

-- Check that the bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Check that policies are created (should return 4 rows):
-- SELECT policyname, cmd, roles 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
--   AND tablename = 'objects' 
--   AND policyname LIKE '%avatar%';









