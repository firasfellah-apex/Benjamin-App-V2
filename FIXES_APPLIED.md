# Fixes Applied

## Issue 1: Runner offline/online error - `is_online` column missing

**Error:** "Could not find the 'is_online' column of 'profiles' in the schema cache"

**Solution:** Run the database migration

### Steps to Fix:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the migration**
   - Copy and paste the following SQL:

```sql
-- Add is_online column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_online IS 'Runner availability status. When true, runner can see and accept available orders.';

-- Create index for faster queries when filtering by online status
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles (is_online) WHERE is_online = true;
```

3. **Click "Run"** to execute the migration

4. **Verify**
   - The migration should complete successfully
   - The `is_online` column should now exist in the `profiles` table
   - The runner online/offline toggle should now work without errors

---

## Issue 2: Admin app not showing dark charcoal theme

**Status:** ✅ **FIXED**

### Changes Made:

1. **Added Admin Theme to CSS** (`src/index.css`)
   - Added `.app-admin` theme variables with charcoal colors
   - Background: `#111827` (charcoal)
   - Cards: `#1F2937` (darker charcoal)
   - Text: `#E5E7EB` (light gray)

2. **Updated Admin Dashboard** (`src/pages/admin/Dashboard.tsx`)
   - All Cards now use dark charcoal theme: `bg-[#1F2937] border-slate-700 text-[#E5E7EB]`
   - All text colors updated to use charcoal theme colors
   - Headings use `text-[#E5E7EB]`
   - Muted text uses `text-slate-400`

3. **PageContainer** already supports `variant="admin"` with charcoal background

### What You Should See:

- **Admin Header:** Charcoal background (`#111827`) with light text
- **Admin Pages:** Charcoal background (`#111827`) with dark cards (`#1F2937`)
- **Admin Cards:** Dark charcoal with light text, distinct from runner's navy blue

### Note:

The admin theme is now distinct from the runner theme:
- **Runner:** Deep navy blue (`#020817`)
- **Admin:** Charcoal/graphite (`#111827`)

---

## Next Steps:

1. **Run the migration** (Issue 1) - This is critical for the runner online/offline toggle to work
2. **Refresh your browser** - The admin theme changes should be visible immediately
3. **Test the runner toggle** - After running the migration, test the online/offline toggle

---

## Files Modified:

- `src/index.css` - Added admin theme variables
- `src/pages/admin/Dashboard.tsx` - Updated all cards to use dark charcoal theme
- `RUN_MIGRATION.md` - Created migration instructions

