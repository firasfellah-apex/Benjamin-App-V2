# Quick Setup: Avatar Storage Bucket

## ⚠️ Important: Create Bucket via Dashboard First!

Supabase requires you to create storage buckets via the Dashboard UI. You cannot create them via SQL.

## Step-by-Step Instructions

### Step 1: Create the Bucket via Dashboard

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage**
   - Click **"Storage"** in the left sidebar
   - Click **"New bucket"** button

3. **Configure the Bucket**
   - **Name**: `avatars` (must be exactly this)
   - **Public bucket**: ✅ **Enable this** (toggle ON)
   - **File size limit**: `5242880` (5MB in bytes)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/png`
     - `image/webp`
   - Click **"Create bucket"**

### Step 2: Create RLS Policies via SQL

After creating the bucket, run the SQL script to create the security policies:

1. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

2. **Run the Policy Script**
   - Copy the contents of `CREATE_AVATAR_POLICIES_ONLY.sql`
   - Paste into the SQL Editor
   - Click **"Run"** (or press Cmd/Ctrl + Enter)
   - **Note**: If you see an error about the bucket not existing, create the bucket first (Step 1)!

3. **Verify Setup**
   - The script will check if the bucket exists
   - It will create 4 RLS policies
   - Check the results - you should see:
     - 1 row for the bucket verification
     - 4 rows for the policies

### Step 3: Test Upload

1. Go to your app's "My Account" page
2. Try uploading a profile photo
3. It should work without errors!

## Troubleshooting

### Error: "bucket does not exist"
- Make sure you created the bucket via Dashboard first (Step 1)
- Verify the bucket name is exactly `avatars` (lowercase)

### Error: "policy already exists"
- This is fine - the script will drop and recreate policies
- If you get this error, the policies are already set up

### Error: "permission denied"
- Make sure you're running the SQL as the `postgres` role
- Check that you have admin access to the Supabase project

### Warning about bucket creation
- **Ignore this warning** - you cannot create buckets via SQL in Supabase
- Always create buckets via the Dashboard UI first

## Alternative: Manual Policy Setup

If the SQL script doesn't work, you can create policies manually via Dashboard:

1. Go to **Storage** → **Policies**
2. Select the `avatars` bucket
3. Click **"New policy"**
4. Create each policy as described in `AVATAR_STORAGE_SETUP.md`

## Quick Checklist

- [ ] Created `avatars` bucket via Dashboard
- [ ] Set bucket as public
- [ ] Set file size limit to 5MB
- [ ] Added MIME types (jpeg, png, webp)
- [ ] Ran the SQL policy script
- [ ] Verified policies were created
- [ ] Tested upload in the app

## Need Help?

If you're still having issues:
1. Check the browser console for detailed error messages
2. Verify the bucket exists in Storage section
3. Check that policies are visible in Storage → Policies
4. Make sure you're logged in when testing uploads

