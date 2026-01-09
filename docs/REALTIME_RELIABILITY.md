# Realtime Reliability - Root Cause & Fix

## Problem

Supabase Realtime subscriptions were experiencing `CHANNEL_ERROR` and `TIMED_OUT` errors, causing:
- Console spam with repeated error messages
- Potential unread message count failures
- User confusion about realtime updates

## Root Cause Analysis

### Identified Issues

1. **Channel Name Conflicts**: Multiple hook instances using same channel names
   - `useOrderChat` used `order-chat:${orderId}` 
   - `useUnreadMessages` used `unread-messages:${orderId}` without instance IDs
   - React StrictMode double-invoke caused duplicate subscriptions

2. **Server-Side Filtering**: Using complex RLS filters in channel subscriptions
   - `filter: order_id=eq.${orderId}` caused CHANNEL_ERROR in some cases
   - RLS policies blocking realtime subscriptions

3. **No Fallback Mechanism**: When realtime failed, app had no polling fallback
   - Unread counts would stop updating
   - Messages would only update on manual refresh

4. **Error Spam**: Every CHANNEL_ERROR was logged, causing console spam

## Fixes Implemented

### 1. Unique Channel Names
- `useUnreadMessages`: Added instance ID to channel name: `unread-messages:${orderId}:${instanceId}`
- Prevents channel name collisions between multiple hook instances

### 2. Client-Side Filtering
- Moved from server-side filters to client-side filtering where possible
- Reduces RLS-related CHANNEL_ERROR issues
- Example: `useOrdersRealtime` uses client-side filtering for customer/runner modes

### 3. Polling Fallback
- `useUnreadMessages`: Added 5-second polling interval when realtime fails
- Ensures unread counts continue updating even if realtime is unavailable
- Automatically stops polling when realtime reconnects

### 4. Error Logging Reduction
- Changed `console.error` to `console.warn` for CHANNEL_ERROR
- Only log once per session (not on every retry)
- Added context: "Will fall back to polling" message

### 5. Graceful Degradation
- Realtime is treated as a performance optimization, not critical
- App continues to work via polling/refetch if realtime fails
- No user-visible errors when realtime is unavailable

## Files Changed

1. `src/hooks/useUnreadMessages.ts`
   - Added instance ID to channel name
   - Added polling fallback (5-second interval)
   - Reduced error logging

2. `src/hooks/useOrderChat.ts`
   - Reduced error logging (warn instead of error)
   - Added context about polling fallback

3. `src/hooks/useOrdersRealtime.ts`
   - Already had good error handling
   - Uses client-side filtering to avoid RLS issues

## Testing

### Before Fix
- Console spam: `[Chat] Channel error for order ...` repeated
- Unread counts would stop updating if realtime failed
- No fallback mechanism

### After Fix
- Errors logged once per session (not spam)
- Unread counts continue updating via polling if realtime fails
- App works reliably even if realtime is unavailable

## Recommendations

1. **Monitor Realtime Health**: Track CHANNEL_ERROR rate in production
2. **Consider WebSocket Proxy**: If errors persist, may need WebSocket proxy for native builds
3. **RLS Policies**: Review RLS policies to ensure they don't block realtime subscriptions
4. **Network Security**: Ensure native builds allow WebSocket connections to Supabase

## Known Limitations

- Polling fallback adds 5-second delay (vs instant realtime)
- Multiple polling intervals if multiple hooks fail (acceptable trade-off)
- Realtime may still fail in emulator/simulator environments (expected)

## Status

✅ **Fixed**: CHANNEL_ERROR spam eliminated
✅ **Fixed**: Polling fallback implemented
✅ **Fixed**: Error logging reduced
✅ **Verified**: App works reliably even if realtime fails

