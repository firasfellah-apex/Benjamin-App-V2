# 🔒 Security Fixes Guide

This guide addresses all security warnings from Supabase's database linter.

## ✅ Fixed Issues (Run SQL)

### 1. Function Search Path Mutable (4 functions)
**Status**: ✅ Fixed in migration

All functions now have `SET search_path = public`:
- `has_role()`
- `is_admin()`
- `update_updated_at()`
- `ensure_single_default_address()`

**Fix**: Run `FIX_ALL_SECURITY_ISSUES.sql` or the migration will apply automatically.

---

### 2. RLS Policy Always True (2 policies)
**Status**: ✅ Fixed in migration

Policies now check `auth.uid() IS NOT NULL` instead of `WITH CHECK (true)`:
- `audit_logs` - "System can insert audit logs"
- `order_events` - "System can insert order events"

**Note**: These policies are intentionally permissive because they're used by RPC functions for system logging. The fix ensures only authenticated users can insert, which is the intended behavior.

**Fix**: Run `FIX_ALL_SECURITY_ISSUES.sql` or the migration will apply automatically.

---

## ⚠️ Manual Fixes Required

### 3. Extensions in Public Schema
**Status**: ⚠️ Requires manual intervention

**Extensions**:
- `cube`
- `earthdistance`

**Why it matters**: Extensions in the `public` schema can be a security concern. They should be moved to a dedicated `extensions` schema.

**How to fix**:

1. **Create extensions schema**:
   ```sql
   CREATE SCHEMA IF NOT EXISTS extensions;
   ```

2. **Move extensions**:
   ```sql
   ALTER EXTENSION cube SET SCHEMA extensions;
   ALTER EXTENSION earthdistance SET SCHEMA extensions;
   ```

3. **Update code references**:
   - If your code uses these extensions directly, update references
   - Most PostGIS/geography features should continue working automatically
   - Test thoroughly after moving

4. **Verify**:
   ```sql
   SELECT extname, n.nspname 
   FROM pg_extension e
   JOIN pg_namespace n ON e.extnamespace = n.oid
   WHERE extname IN ('cube', 'earthdistance');
   ```

**Risk**: Moving extensions could break location-based queries if not done carefully. Test in a staging environment first.

**Recommendation**: If these extensions are critical and you're not sure about moving them, you can leave them for now. This is a lower-priority security warning.

---

### 4. Auth Leaked Password Protection Disabled
**Status**: ⚠️ Requires Supabase Dashboard configuration

**What it is**: Supabase can check passwords against HaveIBeenPwned.org to prevent users from using compromised passwords.

**How to enable**:

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Find **Password Security** section
3. Enable **"Leaked Password Protection"**
4. Save changes

**Why enable**: Prevents users from using passwords that have been compromised in data breaches.

**Impact**: Users with compromised passwords will be rejected during signup/password reset. This is a security best practice.

---

## 📋 Summary

| Issue | Status | Action Required |
|-------|--------|----------------|
| Function search_path (4 functions) | ✅ Fixed | Run SQL or wait for migration |
| RLS policies (2 policies) | ✅ Fixed | Run SQL or wait for migration |
| Extensions in public | ⚠️ Manual | Move to extensions schema (optional) |
| Auth leaked password protection | ⚠️ Manual | Enable in Dashboard |

## 🚀 Quick Start

**To fix all SQL issues immediately**:
1. Open Supabase SQL Editor
2. Run `FIX_ALL_SECURITY_ISSUES.sql`
3. Verify fixes with the queries at the end of the file

**To enable auth protection**:
1. Go to Supabase Dashboard → Authentication → Settings
2. Enable "Leaked Password Protection"

**For extensions** (optional):
- Only move if you're comfortable with the process
- Test in staging first
- Can be deferred if not critical

---

## ✅ Verification

After running the SQL fixes, verify with:

```sql
-- Check functions have search_path
SELECT 
  p.proname,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✅'
    ELSE '❌'
  END as has_search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('has_role', 'is_admin', 'update_updated_at', 'ensure_single_default_address');

-- Check RLS policies
SELECT tablename, policyname, cmd, with_check
FROM pg_policies
WHERE tablename IN ('audit_logs', 'order_events')
  AND cmd = 'INSERT';
```

All critical security issues should now be resolved! 🎉

