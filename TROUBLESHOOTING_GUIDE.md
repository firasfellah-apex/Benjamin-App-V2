# Benjamin Cash Delivery Service - Troubleshooting Guide

**Last Updated:** November 6, 2025

---

## Quick Diagnostics

If the preview isn't working, follow these steps in order:

### Step 1: Verify Code Compilation

```bash
cd /workspace/app-7dlmcs8ryyv5
npm run lint
```

**Expected Output:**
```
Checked 87 files in ~150ms. No fixes applied.
Exit code: 0
```

**If Failed:** Check the error messages and fix any syntax errors.

---

### Step 2: Check Environment Variables

```bash
cat .env
```

**Required Variables:**
```
VITE_LOGIN_TYPE=gmail
VITE_APP_ID=app-7dlmcs8ryyv5
VITE_SUPABASE_URL=https://qjegmdunymmwfedlayyg.supabase.co
VITE_SUPABASE_ANON_KEY=[LONG_KEY_STRING]
```

**If Missing:** Ensure all variables are set correctly.

---

### Step 3: Verify Supabase Connection

The application connects to Supabase on startup. If there's a connection issue:

1. **Check Supabase URL:** Ensure it's accessible
2. **Check Anon Key:** Ensure it's valid
3. **Check Database:** Ensure migrations have been applied

**Test Connection:**
```bash
# Check if Supabase URL is accessible
curl -I https://qjegmdunymmwfedlayyg.supabase.co
```

---

### Step 4: Check Browser Console

If the preview loads but shows errors:

1. **Open Browser DevTools:** Press F12 or Cmd+Option+I
2. **Check Console Tab:** Look for red error messages
3. **Check Network Tab:** Look for failed requests

**Common Errors and Solutions:**

#### Error: "Missing Supabase environment variables"
**Solution:** Check `.env` file has all required variables

#### Error: "Failed to fetch profile"
**Solution:** 
- Ensure you're logged in
- Check Supabase RLS policies
- Verify database migrations applied

#### Error: "Cannot read property 'role' of null"
**Solution:** 
- This should be fixed (we added null checks)
- Clear browser cache and reload

#### Error: "Network request failed"
**Solution:**
- Check internet connection
- Verify Supabase URL is correct
- Check if Supabase service is up

---

## Common Issues and Solutions

### Issue #1: White Screen / Blank Page

**Symptoms:** Preview loads but shows nothing

**Possible Causes:**
1. JavaScript error preventing render
2. Authentication blocking all routes
3. Missing environment variables

**Solutions:**
1. Check browser console for errors
2. Try accessing `/login` directly
3. Verify `.env` file exists and is correct
4. Clear browser cache and cookies

---

### Issue #2: Login Not Working

**Symptoms:** Login button doesn't work or redirects incorrectly

**Possible Causes:**
1. Google OAuth not configured
2. Supabase authentication disabled
3. Redirect URL mismatch

**Solutions:**
1. Check `VITE_LOGIN_TYPE=gmail` in `.env`
2. Verify Supabase authentication is enabled
3. Check Supabase dashboard for OAuth settings
4. Ensure redirect URLs are whitelisted

---

### Issue #3: Profile Not Loading

**Symptoms:** User logs in but profile data doesn't appear

**Possible Causes:**
1. Profile not created in database
2. RLS policies blocking access
3. Database trigger not firing

**Solutions:**
1. Check if profile exists in Supabase dashboard
2. Verify RLS policies allow user to read own profile
3. Check if `handle_new_user()` trigger is active
4. Manually create profile if needed

---

### Issue #4: Routes Not Working

**Symptoms:** Navigation doesn't work or shows 404

**Possible Causes:**
1. React Router not configured correctly
2. RequireAuth blocking routes
3. Missing route definitions

**Solutions:**
1. Verify `routes.tsx` has all routes defined
2. Check `RequireAuth` whitelist includes necessary routes
3. Ensure `BrowserRouter` is wrapping the app
4. Check browser URL matches defined routes

---

### Issue #5: Header Not Displaying

**Symptoms:** Navigation header is missing or broken

**Possible Causes:**
1. Profile context not loading
2. Null reference error
3. CSS not loading

**Solutions:**
1. Check ProfileContext is wrapping the app
2. Verify null checks are in place (we fixed this)
3. Check `index.css` is imported in `main.tsx`
4. Clear browser cache

---

### Issue #6: Database Errors

**Symptoms:** "Failed to fetch" or database-related errors

**Possible Causes:**
1. Migrations not applied
2. RLS policies too restrictive
3. Invalid Supabase credentials

**Solutions:**
1. Verify migrations applied in Supabase dashboard
2. Check RLS policies in Supabase dashboard
3. Verify `VITE_SUPABASE_ANON_KEY` is correct
4. Check Supabase project is active

---

### Issue #7: Logout Not Working

**Symptoms:** Logout button doesn't work or doesn't redirect

**Possible Causes:**
1. Logout function not called
2. Navigation not working
3. Session not clearing

**Solutions:**
1. Check logout confirmation dialog appears
2. Verify `logout()` function is called
3. Check redirect to `/login` happens
4. Clear browser cookies and try again

---

## Browser-Specific Issues

### Chrome
- **Issue:** Service worker caching old version
- **Solution:** Open DevTools → Application → Clear Storage → Clear site data

### Firefox
- **Issue:** Strict tracking protection blocking OAuth
- **Solution:** Disable tracking protection for this site

### Safari
- **Issue:** Third-party cookies blocked
- **Solution:** Enable cross-site tracking for development

---

## Development Environment Issues

### Issue: Hot Reload Not Working

**Solution:**
```bash
# This is expected - hot reload is handled by the platform
# Changes should reflect after saving files
```

### Issue: TypeScript Errors in IDE

**Solution:**
```bash
# Restart TypeScript server in your IDE
# VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: Import Errors

**Solution:**
```bash
# Verify path alias is configured
# Check tsconfig.json has:
"paths": {
  "@/*": ["./src/*"]
}
```

---

## Database Troubleshooting

### Check if Tables Exist

1. Go to Supabase Dashboard
2. Navigate to Table Editor
3. Verify these tables exist:
   - `profiles`
   - `invitations`
   - `orders`
   - `audit_logs`

### Check if RLS is Configured

1. Go to Supabase Dashboard
2. Navigate to Authentication → Policies
3. Verify policies exist for each table

### Check if Triggers are Active

1. Go to Supabase Dashboard
2. Navigate to Database → Functions
3. Verify these functions exist:
   - `has_role()`
   - `is_admin()`
   - `handle_new_user()`
   - `update_updated_at()`

---

## Authentication Troubleshooting

### Check OAuth Configuration

1. Go to Supabase Dashboard
2. Navigate to Authentication → Providers
3. Verify Google OAuth is enabled
4. Check redirect URLs are configured

### Check User Creation

1. Go to Supabase Dashboard
2. Navigate to Authentication → Users
3. Verify users are being created
4. Check if profiles are created automatically

---

## Performance Issues

### Issue: Slow Page Load

**Solutions:**
1. Check network tab for slow requests
2. Verify Supabase region is close to you
3. Check if images are optimized
4. Clear browser cache

### Issue: Slow Database Queries

**Solutions:**
1. Check if indexes are created
2. Verify queries are optimized
3. Check Supabase dashboard for slow queries
4. Consider adding more indexes

---

## Emergency Fixes

### Nuclear Option #1: Clear All Browser Data

```
1. Open browser settings
2. Clear all browsing data
3. Close and reopen browser
4. Try preview again
```

### Nuclear Option #2: Reset Database

```
⚠️ WARNING: This will delete all data!

1. Go to Supabase Dashboard
2. Navigate to Database → Migrations
3. Delete all tables
4. Re-run migrations
5. Restart application
```

### Nuclear Option #3: Reinstall Dependencies

```bash
cd /workspace/app-7dlmcs8ryyv5
rm -rf node_modules
rm package-lock.json
npm install
npm run lint
```

---

## Getting Help

### Information to Provide

When reporting issues, include:

1. **Error Message:** Exact error from console
2. **Browser:** Chrome/Firefox/Safari and version
3. **Steps to Reproduce:** What you did before error
4. **Screenshots:** If applicable
5. **Network Tab:** Failed requests if any

### Useful Commands

```bash
# Check code compilation
npm run lint

# Check TypeScript
npx tsc --noEmit

# Check environment variables
cat .env

# Check file structure
ls -la src/

# Check package versions
npm list --depth=0
```

---

## Verification Checklist

Before reporting an issue, verify:

- [ ] Code compiles without errors (`npm run lint`)
- [ ] Environment variables are set correctly
- [ ] Supabase project is active
- [ ] Database migrations are applied
- [ ] Browser console shows no errors
- [ ] Network requests are succeeding
- [ ] You're using a supported browser
- [ ] Browser cache is cleared
- [ ] You're logged in (if required)
- [ ] Internet connection is stable

---

## Known Working Configuration

This configuration is verified to work:

```
Node Version: v18+ or v20+
Browser: Chrome 120+, Firefox 120+, Safari 17+
Supabase: Active project with migrations applied
Environment: All VITE_* variables set
Authentication: Google OAuth enabled
Database: All tables created with RLS enabled
```

---

## Contact Information

For urgent issues:
1. Check this troubleshooting guide first
2. Review the SYSTEM_VERIFICATION_REPORT.md
3. Check browser console for specific errors
4. Provide detailed information when reporting

---

**Document Version:** 1.0  
**Last Updated:** November 6, 2025  
**Status:** Active
