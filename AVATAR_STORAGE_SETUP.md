# Avatar Storage Setup Guide

## Problem
The `avatars` storage bucket doesn't exist in your Supabase instance, which prevents profile photo uploads.

## Solution
Run the migration to create the storage bucket and policies.

## Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**
   - Copy the contents of `supabase/migrations/20251107_add_avatars_bucket.sql`
   - Paste it into the SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify the Bucket**
   - Go to "Storage" in the left sidebar
   - You should see an `avatars` bucket
   - Click on it to verify it's configured correctly

## Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push

# Or run the specific migration file
supabase migration up
```

## Option 3: Manual Setup via Dashboard

If the migration doesn't work, you can create the bucket manually:

1. **Create Storage Bucket**
   - Go to "Storage" in Supabase Dashboard
   - Click "New bucket"
   - Set:
     - **Name**: `avatars`
     - **Public bucket**: ✅ Enabled
     - **File size limit**: `5242880` (5MB)
     - **Allowed MIME types**: `image/jpeg, image/png, image/webp`

2. **Set up RLS Policies**
   - Go to "Storage" → "Policies"
   - Click on the `avatars` bucket
   - Add the following policies:

   **Policy 1: Users can upload their own avatar**
   - Policy name: `Users can upload their own avatar`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - USING expression: Leave empty
   - WITH CHECK expression:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```

   **Policy 2: Users can update their own avatar**
   - Policy name: `Users can update their own avatar`
   - Allowed operation: `UPDATE`
   - Target roles: `authenticated`
   - USING expression:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
   - WITH CHECK expression:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```

   **Policy 3: Users can delete their own avatar**
   - Policy name: `Users can delete their own avatar`
   - Allowed operation: `DELETE`
   - Target roles: `authenticated`
   - USING expression:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```

   **Policy 4: Public read access**
   - Policy name: `Public read access to avatars`
   - Allowed operation: `SELECT`
   - Target roles: `public`
   - USING expression:
     ```sql
     bucket_id = 'avatars'
     ```

## Verification

After setting up the bucket, verify it works:

1. **Check Bucket Exists**
   - Go to "Storage" → You should see `avatars` bucket
   - It should be marked as "Public"

2. **Test Upload**
   - Go to your app's "My Account" page
   - Try uploading a profile photo
   - It should work without errors

## Troubleshooting

### Error: "Bucket not found"
- Make sure the bucket name is exactly `avatars` (lowercase)
- Verify the bucket exists in Storage section

### Error: "Permission denied"
- Check that RLS policies are set up correctly
- Verify you're logged in as an authenticated user
- Check that the policy conditions match your user ID format

### Error: "File size too large"
- Make sure the file is under 5MB
- Check that the bucket's file size limit is set to 5242880 bytes

### Error: "Invalid file type"
- Make sure the file is JPEG, PNG, or WebP
- Check that the bucket allows these MIME types

## Need Help?

If you're still having issues:
1. Check the browser console for detailed error messages
2. Verify your Supabase project settings
3. Make sure you're using the correct Supabase project
4. Check that Storage is enabled for your project









