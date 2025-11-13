-- ============================================================================
-- ADD AVATAR POLICIES WITH CORRECT BUCKET ID
-- ============================================================================
-- IMPORTANT: First run CHECK_BUCKET_AND_POLICIES.sql to find the exact bucket ID
-- Then update the bucket_id in this script to match (might be 'Avatars' not 'avatars')
-- ============================================================================

-- STEP 1: Check the actual bucket ID (run this first!)
-- SELECT id FROM storage.buckets WHERE LOWER(name) LIKE '%avatar%';
-- If it returns 'Avatars' (capital A), change all 'avatars' below to 'Avatars'

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;

-- ============================================================================
-- IMPORTANT: Check your bucket ID first!
-- If your bucket ID is "Avatars" (capital A), change 'avatars' to 'Avatars' below
-- ============================================================================

-- Policy 1: Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND  -- CHANGE THIS if your bucket ID is 'Avatars'
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND  -- CHANGE THIS if your bucket ID is 'Avatars'
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND  -- CHANGE THIS if your bucket ID is 'Avatars'
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND  -- CHANGE THIS if your bucket ID is 'Avatars'
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow public read access to all avatars
CREATE POLICY "Public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');  -- CHANGE THIS if your bucket ID is 'Avatars'

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running, verify policies were created:
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname LIKE '%avatar%';
-- ============================================================================









