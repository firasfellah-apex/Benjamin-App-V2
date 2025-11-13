-- ============================================================================
-- ADD AVATAR POLICIES (Auto-detect bucket ID)
-- ============================================================================
-- This script automatically detects the bucket ID and creates policies
-- ============================================================================

-- First, find the actual bucket ID
DO $$
DECLARE
  v_bucket_id text;
BEGIN
  -- Get the bucket ID (case-sensitive)
  SELECT id INTO v_bucket_id
  FROM storage.buckets
  WHERE LOWER(name) LIKE '%avatar%' OR LOWER(id) LIKE '%avatar%'
  LIMIT 1;
  
  IF v_bucket_id IS NULL THEN
    RAISE EXCEPTION 'No avatar bucket found. Please create it via Dashboard first.';
  END IF;
  
  RAISE NOTICE 'Found bucket ID: %', v_bucket_id;
  
  -- Drop existing policies
  EXECUTE 'DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects';
  
  -- Create policies with the correct bucket ID
  EXECUTE format('
    CREATE POLICY "Users can upload their own avatar"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = %L AND
      (storage.foldername(name))[1] = auth.uid()::text
    )', v_bucket_id);
  
  EXECUTE format('
    CREATE POLICY "Users can update their own avatar"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = %L AND
      (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = %L AND
      (storage.foldername(name))[1] = auth.uid()::text
    )', v_bucket_id, v_bucket_id);
  
  EXECUTE format('
    CREATE POLICY "Users can delete their own avatar"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = %L AND
      (storage.foldername(name))[1] = auth.uid()::text
    )', v_bucket_id);
  
  EXECUTE format('
    CREATE POLICY "Public read access to avatars"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = %L)', v_bucket_id);
  
  RAISE NOTICE 'Policies created successfully for bucket: %', v_bucket_id;
END $$;

-- Verify policies were created
SELECT 
  policyname, 
  cmd as operation,
  roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND (policyname LIKE '%avatar%' OR policyname LIKE '%Avatar%')
ORDER BY policyname;









