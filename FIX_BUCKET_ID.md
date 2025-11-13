# Fix Bucket ID Issue

## Problem
The code is trying to use bucket ID `'avatars'` (lowercase), but your bucket might be `'Avatars'` (capital A). Bucket IDs are case-sensitive!

## Solution

### Step 1: Check the Exact Bucket ID

Run this SQL query in Supabase SQL Editor:

```sql
SELECT id, name, public 
FROM storage.buckets 
WHERE LOWER(name) LIKE '%avatar%' OR LOWER(id) LIKE '%avatar%';
```

This will show you the **exact** bucket ID (case-sensitive).

### Step 2: Update the Code

If the bucket ID is `'Avatars'` (capital A), update `src/hooks/use-avatar.ts`:

1. Find line 102: `const bucketId = 'avatars';`
2. Change it to: `const bucketId = 'Avatars';`
3. Also update line 176: `const bucketId = 'avatars';` to `const bucketId = 'Avatars';`

### Step 3: Test Upload

After updating the bucket ID, try uploading a photo again.

## Alternative: Rename Bucket to Lowercase

If you prefer, you can rename the bucket in the Dashboard to `avatars` (lowercase):
1. Go to Storage → Buckets
2. Click the three dots (⋮) next to "Avatars"
3. Rename to "avatars" (lowercase)
4. Then the code will work as-is

## Quick Test

After fixing the bucket ID, the upload should work. If you still get errors, check the browser console for the exact error message.









