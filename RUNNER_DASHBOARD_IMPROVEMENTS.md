# Runner Dashboard Improvements

## Summary

This document outlines the improvements made to the Runner dashboard, including real earnings data, online/offline toggle, and role-specific headers.

## Changes Implemented

### 1. Runner Earnings: Real Data + Motivating UI ✅

**Files Modified:**
- `src/lib/payouts.ts` (NEW) - Centralized payout calculation helpers
- `src/db/api.ts` - Added `getRunnerEarningsStats()` function
- `src/pages/runner/MyDeliveries.tsx` - Updated to use real earnings data

**Features:**
- Monthly Earnings: Calculated from completed orders in the current month
- Active Deliveries: Count of in-progress orders (Runner Accepted, Runner at ATM, Cash Withdrawn, Pending Handoff)
- Completed This Month: Count of completed orders in the current month
- Real-time updates via Supabase Realtime
- Improved UI with emerald accents for earnings and completed stats
- Loading states with skeletons

**Payout Calculation:**
- Runner earns `delivery_fee` from each completed order
- Helper function: `getRunnerPayout(order)` in `src/lib/payouts.ts`
- Monthly earnings calculated from `handoff_completed_at` or `updated_at` timestamps

### 2. Runner Online/Offline Toggle ✅

**Files Modified:**
- `supabase/migrations/20251111_add_runner_online_status.sql` (NEW) - Migration to add `is_online` column
- `src/types/types.ts` - Added `is_online: boolean` to Profile interface
- `src/db/api.ts` - Added `updateRunnerOnlineStatus()` function
- `src/components/layout/RunnerHeader.tsx` - Added online/offline toggle UI
- `src/pages/runner/AvailableOrders.tsx` - Respects `is_online` status

**Features:**
- Toggle in RunnerHeader to switch between online/offline
- When offline: Shows friendly empty state in Available Orders
- When offline: Does not subscribe to or show available orders
- When online: Shows real-time list of available orders
- Status persists in database (`profiles.is_online`)

**Database Migration:**
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;
```

### 3. Role-Specific Headers & Navigation ✅

**Files Created:**
- `src/components/layout/CustomerHeader.tsx` - Light theme header for customers
- `src/components/layout/RunnerHeader.tsx` - Dark theme header for runners (with online/offline toggle)
- `src/components/layout/AdminHeader.tsx` - Dark theme header for admins
- `src/components/layout/RoleBasedLayout.tsx` - Wrapper for role-based layout selection

**Files Modified:**
- `src/components/layout/CustomerLayout.tsx` - Now includes CustomerHeader
- `src/components/layout/RunnerLayout.tsx` - Now includes RunnerHeader
- `src/components/layout/AdminLayout.tsx` (NEW) - Admin layout with AdminHeader
- `src/routes.tsx` - Updated admin routes to use AdminLayout
- `src/App.tsx` - Removed global Header (each layout has its own)

**Header Themes:**
- **CustomerHeader**: Light background (`bg-background`), dark text, white theme
- **RunnerHeader**: Dark background (`bg-[#0B1020]`), light text, indigo accents, includes online/offline toggle
- **AdminHeader**: Dark background (`bg-[#0B1020]`), light text, indigo accents, admin-specific navigation

**Navigation Menus:**
- **Customer Menu**: My Profile, Home, Log Out
- **Runner Menu**: My Profile, Available Orders, My Deliveries, Log Out
- **Admin Menu**: My Profile, Dashboard, Users, Invitations, Orders, Training, Log Out

## Database Migration Required

Run this SQL in your Supabase SQL Editor:

```sql
-- Add is_online column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_online IS 'Runner availability status. When true, runner can see and accept available orders.';

-- Create index for faster queries when filtering by online status
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles (is_online) WHERE is_online = true;
```

Or use the migration file: `supabase/migrations/20251111_add_runner_online_status.sql`

## Testing Checklist

### Runner Dashboard
- [ ] Monthly Earnings shows correct amount from completed orders
- [ ] Active Deliveries count is accurate
- [ ] Completed This Month count is accurate
- [ ] Earnings display with emerald accent
- [ ] Real-time updates when orders complete

### Online/Offline Toggle
- [ ] Toggle appears in RunnerHeader
- [ ] Toggle updates database when clicked
- [ ] Profile refreshes after toggle
- [ ] When offline: Available Orders shows "You're currently offline" message
- [ ] When offline: No orders are shown or subscribed to
- [ ] When online: Available Orders shows real-time list

### Role-Specific Headers
- [ ] Customer pages show light header
- [ ] Runner pages show dark header with online/offline toggle
- [ ] Admin pages show dark header with admin navigation
- [ ] Account page uses appropriate header based on role
- [ ] Navigation menus are role-specific (no cross-contamination)

## Notes

- All existing flows remain intact (auth, order status, realtime subscriptions)
- TypeScript types updated to include `is_online`
- Payout calculation is centralized in `src/lib/payouts.ts`
- Headers are role-specific and theme-appropriate
- Online/offline status is enforced in UI and queries

