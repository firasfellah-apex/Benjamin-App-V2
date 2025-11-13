# Fix: Invalid Enum Value Error

## The Problem
Error: `invalid input value for enum user_role: "{admin}"`

This error occurs because the migration was wrapping the role extraction in a `CASE` statement, which was causing PostgreSQL to convert the array to a string representation instead of properly extracting the enum value.

## The Fix
I've updated the migration to:
1. Extract `role[1]` directly (not wrapped in CASE)
2. Explicitly cast to `user_role` enum type: `(role[1])::user_role`
3. Use `COALESCE` for the boolean checks to ensure they're never NULL

## Next Steps

### 1. Run the Updated Migration
The migration file has been fixed. You need to run it in Supabase:

1. Open Supabase Dashboard → SQL Editor
2. Copy the **entire contents** of `supabase/migrations/20251111_allow_admin_cancel_any_status.sql`
3. Paste and run it

### 2. Verify the Fix
After running the migration, test canceling an order:

1. Refresh your app
2. Try to cancel an order that's in "Pending Handoff" or "Cash Withdrawn" status
3. It should work now!

### 3. Check the Function
You can verify the function was updated correctly by running:

```sql
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'rpc_advance_order';
```

Look for the line that extracts the role - it should be:
```sql
(role[1])::user_role,
```

Not:
```sql
CASE WHEN array_length(role, 1) > 0 THEN role[1] ELSE NULL END,
```

## Why This Happened

The `CASE` statement was causing PostgreSQL's type inference to treat the result as text instead of preserving the `user_role` enum type. By extracting `role[1]` directly and explicitly casting it, we ensure the type is preserved correctly.

## Technical Details

- The `role` column is of type `user_role[]` (array of enum)
- Extracting `role[1]` should return a `user_role` enum
- The `CASE` wrapper was interfering with type inference
- Explicit cast `::user_role` ensures type safety
- The `order_events.actor_role` column expects a single `user_role` enum, not an array









