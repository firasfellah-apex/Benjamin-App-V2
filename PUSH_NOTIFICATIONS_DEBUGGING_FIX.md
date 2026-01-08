# 🔧 Push Notifications Debugging Fixes

## Issues Identified

1. ✅ **Migration file was correct** (you already fixed it)
2. ❌ **Missing RLS policies** - Token saves were being silently rejected
3. ❌ **No logging in flushPendingPushToken** - Couldn't see if it was being called
4. ❌ **Incomplete error logging** - Only logged `error.message`, missing `code`, `details`, `hint`

## Fixes Applied

### 1. ✅ Added RLS Policy Migration

**File**: `supabase/migrations/20250107_add_rls_policy_push_tokens.sql`

Enables RLS and creates policy:
- Users can only manage their own push tokens
- Policy applies to ALL operations (SELECT, INSERT, UPDATE, DELETE)
- Uses `auth.uid() = user_id` for both USING and WITH CHECK

**Quick fix SQL**: `FIX_PUSH_NOTIFICATIONS_RLS.sql` (run in Supabase SQL Editor)

### 2. ✅ Enhanced Logging in `flushPendingPushToken()`

Now logs:
- `🔄 flushPendingPushToken called with appRole: ...`
- `✅ Found pending token, attempting to save: ...` (with token preview, platform, appRole, savedAt)
- `No pending token found` (if no token cached)

### 3. ✅ Enhanced Logging in `savePushTokenToSupabase()`

Now logs:
- `💾 Attempting to save token to Supabase:` (with userId, platform, appRole, tokenPreview)
- Full error details on failure:
  - `message`
  - `code` (e.g., "42501" for permission denied)
  - `details`
  - `hint`
  - `fullError` (complete JSON)

### 4. ✅ Enhanced Auth State Change Listener

Now logs:
- `🔗 Attaching auth state change listener`
- `🔐 Auth state changed: [event]` (with session info)
- `🚀 Triggering flushPendingPushToken on [event]`

## Next Steps

### Step 1: Run RLS Policy Migration

**Option A: Run migration file**
- File: `supabase/migrations/20250107_add_rls_policy_push_tokens.sql`
- Or use your migration pipeline

**Option B: Quick fix (Supabase SQL Editor)**
- Run: `FIX_PUSH_NOTIFICATIONS_RLS.sql`
- This enables RLS and creates the policy immediately

### Step 2: Verify Migration Ran

Run in Supabase SQL Editor:

```sql
-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'user_push_tokens';

-- Check policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'user_push_tokens';
```

You should see:
- `rls_enabled = true`
- Policy named "Users manage own push tokens"

### Step 3: Test the Flow

1. **Build and run app**:
   ```bash
   pnpm build
   pnpm cap sync android  # or ios
   pnpm cap open android  # or ios
   ```

2. **Watch Logcat/Console** for these logs in order:

   **On app start:**
   - `🔗 Attaching auth state change listener`
   - `✅ PUSH TOKEN: ...` (token received)

   **If user not logged in:**
   - `[Push Notifications] No user yet; caching token for post-login upsert`

   **On login:**
   - `🔐 Auth state changed: SIGNED_IN`
   - `🚀 Triggering flushPendingPushToken on SIGNED_IN`
   - `🔄 flushPendingPushToken called with appRole: customer`
   - `✅ Found pending token, attempting to save: ...`
   - `💾 Attempting to save token to Supabase: ...`
   - `[Push Notifications] ✅ Token saved to Supabase`

   **If error occurs:**
   - `❌ Error saving push token; caching for retry:` (with full error details)

3. **Check Supabase**:
   ```sql
   SELECT * FROM user_push_tokens ORDER BY updated_at DESC LIMIT 5;
   ```

## Expected Behavior

### Scenario 1: Token arrives before login ✅

1. Token received → Cached locally
2. User logs in → `SIGNED_IN` event fires
3. `flushPendingPushToken()` called → Logs show it running
4. Token saved to Supabase → Success!

### Scenario 2: Token arrives after login ✅

1. User already logged in
2. Token received → Saved directly to Supabase
3. No caching needed

### Scenario 3: RLS blocking (before fix) ❌

1. Token received → Attempts to save
2. RLS rejects insert (no policy)
3. Error logged with full details
4. Token cached for retry

### Scenario 4: RLS blocking (after fix) ✅

1. Token received → Attempts to save
2. RLS allows insert (policy exists)
3. Token saved successfully

## Troubleshooting

### Issue: "flushPendingPushToken called" but no "Found pending token"

**Cause**: Token wasn't cached, or was already cleared

**Check**:
- Look for earlier logs showing token was cached
- Check if token was saved directly (user was logged in)

### Issue: "Error saving push token" with code "42501"

**Cause**: RLS policy missing or incorrect

**Fix**: Run `FIX_PUSH_NOTIFICATIONS_RLS.sql`

### Issue: "Error saving push token" with code "23505"

**Cause**: Unique constraint violation

**Check**:
- Verify migration ran (app_role column exists)
- Verify constraint is `(user_id, token, app_role)`
- Check if duplicate token exists

### Issue: No "Auth state changed" logs

**Cause**: Auth listener not attached

**Check**:
- Verify `initializePushNotifications()` is called
- Check for "Attaching auth state change listener" log
- Ensure it's only called once (guarded by `authListenerAttached`)

### Issue: Token saved but not in database

**Cause**: Transaction rolled back, or wrong database

**Check**:
- Verify you're checking the correct Supabase project
- Check Supabase logs for any errors
- Verify RLS policy allows your user

## Verification Checklist

- [ ] RLS policy migration ran successfully
- [ ] Policy exists: "Users manage own push tokens"
- [ ] RLS is enabled on `user_push_tokens` table
- [ ] `app_role` column exists in table
- [ ] Unique constraint is `(user_id, token, app_role)`
- [ ] Logs show "flushPendingPushToken called" on SIGNED_IN
- [ ] Logs show "Token saved to Supabase" after login
- [ ] Row appears in `user_push_tokens` table

## Files Changed

- ✅ `src/lib/pushNotifications.ts` - Enhanced logging
- ✅ `supabase/migrations/20250107_add_rls_policy_push_tokens.sql` - RLS policy
- ✅ `FIX_PUSH_NOTIFICATIONS_RLS.sql` - Quick fix SQL

---

**Next**: Run the RLS migration and test. The enhanced logging will show exactly what's happening at each step! 🔍

