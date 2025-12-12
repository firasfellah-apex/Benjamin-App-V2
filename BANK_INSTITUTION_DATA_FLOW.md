# Bank Institution Data Flow

## Files Involved

### 1. **Storing Data (Backend)**
**File:** `supabase/functions/plaid/index.ts`

**Flow:**
1. **Lines 158-190**: Fetches institution data from Plaid API
   - Gets `institution_id` from `itemGet()` response
   - Calls `institutionsGetById()` with `include_display_data: true`
   - Extracts `institution.name` → `institutionName`
   - Converts `institution.logo` (base64) → `data:image/png;base64,...` → `institutionLogoUrl`

2. **Lines 287-295**: Updates database
   - Adds `bank_institution_name` and `bank_institution_logo_url` to `updateData`
   - Updates `profiles` table with these fields

**Key Code:**
```typescript
// Fetch institution data
const institutionResponse = await plaidClient.institutionsGetById({
  institution_id: institutionId,
  country_codes: [CountryCode.Us],
  options: {
    include_optional_metadata: true,
    include_display_data: true, // This includes the logo
  },
});

const institution = institutionResponse.data.institution;
institutionName = institution.name || null;

if (institution.logo) {
  institutionLogoUrl = `data:image/png;base64,${institution.logo}`;
}

// Update database
if (institutionName !== null) {
  updateData.bank_institution_name = institutionName;
}
if (institutionLogoUrl !== null) {
  updateData.bank_institution_logo_url = institutionLogoUrl;
}
```

### 2. **Rendering Data (Frontend)**
**File:** `src/pages/customer/BankAccounts.tsx`

**Flow:**
1. **Lines 238-247**: Debug logging to check what data is in profile
2. **Lines 249-250**: Reads from profile
   ```typescript
   const institutionName = profile.bank_institution_name || "Primary bank";
   const institutionLogo = profile.bank_institution_logo_url;
   ```
3. **Lines 423-440**: Renders the data
   - Shows logo if `institutionLogo` exists, otherwise shows green icon
   - Shows `institutionName` in the title

**Key Code:**
```typescript
{institutionLogo ? (
  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
    <img
      src={institutionLogo}
      alt={institutionName}
      className="h-8 w-8 object-contain"
    />
  </div>
) : (
  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
    <Landmark className="h-6 w-6 text-green-600" />
  </div>
)}

<h3 className="text-lg font-semibold text-slate-900">
  {institutionName}
</h3>
```

### 3. **Profile Data Hook**
**File:** `src/hooks/useProfile.ts`

- **Lines 33-44**: Fetches profile from database using `select('*')` which should include all fields
- **Lines 47-59**: Syncs profile data to localStorage

### 4. **Plaid Connection Hook**
**File:** `src/hooks/usePlaidLinkKyc.ts`

- **Lines 44-67**: After successful Plaid connection:
  - Calls `exchangePublicToken()` which triggers the Edge Function
  - Invalidates and refetches profile query to get fresh data

## Debugging Steps

1. **Check Edge Function logs** in Supabase Dashboard → Edge Functions → plaid → Logs
   - Look for `[Plaid] Institution data:` log
   - Look for `[Plaid] Updating profile with institution data:` log

2. **Check browser console** on Bank Accounts page
   - Look for `[BankAccounts] Profile institution data:` log
   - Should show `bank_institution_name` and `bank_institution_logo_url` values

3. **Check database directly**
   ```sql
   SELECT bank_institution_name, bank_institution_logo_url, plaid_item_id
   FROM profiles
   WHERE id = '<your-user-id>';
   ```

4. **If data is missing:**
   - Disconnect and reconnect bank account
   - This will trigger the Edge Function to fetch and store institution data

## Common Issues

1. **Migration not applied**: Columns don't exist → Edge Function will skip storing data
2. **Bank connected before migration**: Old connections don't have institution data → Need to reconnect
3. **Plaid API error**: Institution data fetch fails → Check Edge Function logs
4. **Profile cache stale**: Frontend showing old data → Check browser console logs

