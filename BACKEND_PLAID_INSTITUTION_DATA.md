# Backend Implementation: Storing Bank Institution Data from Plaid

## Overview
When a customer connects their bank account via Plaid, we need to fetch and store the bank institution name and logo. This document outlines what needs to be implemented in the backend Supabase Edge Function.

## Current State
- ✅ Database columns added: `bank_institution_name` and `bank_institution_logo_url` in `profiles` table
- ✅ Frontend TypeScript types updated
- ✅ Frontend code updated to use typed fields
- ⚠️ **Backend Edge Function needs to be updated** to fetch and store this data

## What Needs to Be Done

### 1. Update the `/exchange-public-token` Edge Function

The Edge Function at `supabase/functions/plaid/exchange-public-token/index.ts` (or similar path) needs to:

1. **Exchange the public token** (already done)
2. **Get the institution ID** from the item:
   ```typescript
   // After exchanging the public token, you'll have an item_id
   // Use Plaid's /item/get endpoint to get institution_id
   const itemResponse = await plaidClient.itemGet({
     access_token: accessToken
   });
   const institutionId = itemResponse.data.item.institution_id;
   ```

3. **Fetch institution details** including logo:
   ```typescript
   // Use Plaid's /institutions/get_by_id endpoint
   const institutionResponse = await plaidClient.institutionsGetById({
     institution_id: institutionId,
     country_codes: ['US'],
     options: {
       include_optional_metadata: true,
       include_display_data: true  // This includes the logo
     }
   });
   
   const institution = institutionResponse.data.institution;
   const institutionName = institution.name;
   const institutionLogo = institution.logo; // Base64-encoded PNG (152x152)
   ```

4. **Convert logo to data URL** (optional, but recommended):
   ```typescript
   // Plaid returns logo as base64 string
   // Convert to data URL for easy display
   const logoDataUrl = institutionLogo 
     ? `data:image/png;base64,${institutionLogo}`
     : null;
   ```

5. **Update the profile** with institution data:
   ```typescript
   // Update the profile in Supabase
   const { error: updateError } = await supabase
     .from('profiles')
     .update({
       plaid_item_id: itemId,
       kyc_status: 'verified',
       kyc_verified_at: new Date().toISOString(),
       bank_institution_name: institutionName,
       bank_institution_logo_url: logoDataUrl,
       updated_at: new Date().toISOString()
     })
     .eq('id', userId);
   ```

## Plaid API Endpoints Needed

1. **`/item/get`** - Get item details including `institution_id`
   - Already available in most Plaid integrations
   - Returns: `item.institution_id`

2. **`/institutions/get_by_id`** - Get institution details including logo
   - Requires: `institution_id`, `country_codes`
   - Options: `include_display_data: true` to get logo
   - Returns: `institution.name`, `institution.logo` (base64 string)

## Example Response Structure

```typescript
// From /institutions/get_by_id
{
  institution: {
    institution_id: "ins_109508",
    name: "First Platypus Bank",
    logo: "iVBORw0KGgoAAAANSUhEUgAAAZgAAAGYCAYAAAB..." // base64 PNG
  }
}
```

## Error Handling

- If institution data cannot be fetched, still proceed with storing `plaid_item_id` and KYC status
- Log the error but don't fail the entire flow
- Institution name/logo can be added later via a background job if needed

## Testing

After implementing:
1. Connect a bank account via Plaid
2. Verify in Supabase that `bank_institution_name` and `bank_institution_logo_url` are populated
3. Check the frontend displays the bank name and logo correctly

## Notes

- Plaid logos are 152x152 PNG images encoded as base64 strings
- We're storing them as data URLs for simplicity (no need for separate image storage)
- If storage becomes an issue, we could download and store logos in Supabase Storage instead
- The logo is optional - if Plaid doesn't provide one, `bank_institution_logo_url` will be null

