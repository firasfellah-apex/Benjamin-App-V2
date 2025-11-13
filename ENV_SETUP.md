# Environment Variables Setup

This project uses a **runtime environment selector** that automatically picks the correct environment variables based on the current route. This allows switching between customer/runner/admin apps without rebuilding.

## File Structure

```
.env.local                    # Single file with prefixed variables for all apps
```

## Setup Instructions

1. **Create `.env.local`** with prefixed variables:

```bash
# ——— CUSTOMER APP KEYS ———
VITE_CUSTOMER_SUPABASE_URL=https://uqpcyqcpnhjkpyyjlmqr.supabase.co
VITE_CUSTOMER_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcGN5cWNwbmhqa3B5eWpsbXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzUzMjksImV4cCI6MjA3ODExMTMyOX0.ZEF7UZh-QOUoFj8hUKncDcF7R3az6IrHUkAoKBjhddM
VITE_CUSTOMER_GOOGLE_MAPS_API_KEY=AIzaSyAcmh3qYJXZrCbw54X_IPk6umsvPY_6roE

# ——— RUNNER APP KEYS ———
VITE_RUNNER_SUPABASE_URL=https://uqpcyqcpnhjkpyyjlmqr.supabase.co
VITE_RUNNER_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcGN5cWNwbmhqa3B5eWpsbXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzUzMjksImV4cCI6MjA3ODExMTMyOX0.ZEF7UZh-QOUoFj8hUKncDcF7R3az6IrHUkAoKBjhddM
VITE_RUNNER_GOOGLE_MAPS_API_KEY=PASTE_RUNNER_MAPS_KEY

# ——— ADMIN WEB KEYS ———
VITE_ADMIN_SUPABASE_URL=https://uqpcyqcpnhjkpyyjlmqr.supabase.co
VITE_ADMIN_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcGN5cWNwbmhqa3B5eWpsbXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzUzMjksImV4cCI6MjA3ODExMTMyOX0.ZEF7UZh-QOUoFj8hUKncDcF7R3az6IrHUkAoKBjhddM
VITE_ADMIN_GOOGLE_MAPS_API_KEY=AIzaSyAcmh3qYJXZrCbw54X_IPk6umsvPY_6roE
```

**Note**: In development, you can reuse the same Supabase project for all three apps (paste the same URL/key into each section), but keep the prefixes — this prevents cross-app mixing later.

## How It Works

- **Runtime Selection**: The `getEnv()` function in `src/lib/env.ts` automatically detects the current route:
  - Routes starting with `/runner` → uses `VITE_RUNNER_*` variables
  - Routes starting with `/admin` → uses `VITE_ADMIN_*` variables
  - All other routes (including `/customer`) → uses `VITE_CUSTOMER_*` variables

- **No Rebuild Required**: Switching between apps is instant — just navigate to a different route and the correct keys are used automatically.

- **Single Dev Server**: Run `npm run dev` and all three apps work on the same server:
  - `/customer/home` → customer keys
  - `/runner/work` → runner keys
  - `/admin/dashboard` → admin keys

## Usage

- **Default dev server**: `npm run dev` (all apps work on the same server)
- The runtime selector automatically picks the correct keys based on the URL

## Debug

Check the browser console on app load — you'll see:
```
[ENV] active profile: customer { SUPABASE_URL: '...', ... }
```

This confirms which app profile is active and which keys are being used.

## Notes

- `.env.local` is gitignored (never commit secrets)
- All three app sets can share the same Supabase project in dev
- The prefixes (`CUSTOMER_`, `RUNNER_`, `ADMIN_`) prevent cross-app mixing
