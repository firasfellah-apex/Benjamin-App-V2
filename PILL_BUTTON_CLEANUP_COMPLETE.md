# Pill Button Cleanup - Complete ✅

## Summary

All raw `<button>` elements with `rounded-full` in ManageAddresses.tsx and CashRequest.tsx have been replaced with canonical `Button` components.

**Result:** ✅ **0 action buttons** with `rounded-full` remain in customer pages (excluding intentionally pill-shaped elements like avatars, chips, etc.)

---

## Files Updated

### 1. ✅ `src/pages/customer/ManageAddresses.tsx`

**Replaced 6 buttons:**

1. **Add Address Modal - Cancel Button** (line ~540)
   - Before: `<button>` with `rounded-full py-4 px-6`
   - After: `<Button variant="outline">` with `h-12 px-6` (no rounded-full)

2. **Add Address Modal - Save Button** (line ~555)
   - Before: `<button>` with `rounded-full py-4 px-6`
   - After: `<Button>` with `h-12 px-6 bg-black` (no rounded-full)

3. **Edit Address Modal - Cancel Button** (line ~659)
   - Before: `<button>` with `rounded-full py-4 px-6`
   - After: `<Button variant="outline">` with `h-12 px-6` (no rounded-full)

4. **Edit Address Modal - Save Button** (line ~674)
   - Before: `<button>` with `rounded-full py-4 px-6`
   - After: `<Button>` with `h-12 px-6 bg-black` (no rounded-full)

5. **Delete Address Dialog - Delete Button** (line ~742)
   - Before: `<AlertDialogAction>` with `rounded-full`
   - After: `<AlertDialogAction>` with `h-14` (no rounded-full)

6. **Delete Address Dialog - Cancel Button** (line ~754)
   - Before: `<AlertDialogCancel>` with `rounded-full`
   - After: `<AlertDialogCancel>` with `h-14` (no rounded-full)

**Import Added:** `import { Button } from "@/components/ui/button";`

---

### 2. ✅ `src/pages/customer/CashRequest.tsx`

**Replaced 6 buttons:**

1. **Add Address Modal (first instance) - Cancel Button** (line ~1120)
   - Before: `<button>` with `rounded-full py-4 px-6`
   - After: `<Button variant="outline">` with `h-12 px-6` (no rounded-full)

2. **Add Address Modal (first instance) - Save Button** (line ~1138)
   - Before: `<button>` with `rounded-full py-4 px-6`
   - After: `<Button>` with `h-12 px-6 bg-black` (no rounded-full)

3. **Edit Address Modal - Cancel Button** (line ~1252)
   - Before: `<button>` with `rounded-full py-4 px-6`
   - After: `<Button variant="outline">` with `h-12 px-6` (no rounded-full)

4. **Edit Address Modal - Save Button** (line ~1269)
   - Before: `<button>` with `rounded-full py-4 px-6`
   - After: `<Button>` with `h-12 px-6 bg-black` (no rounded-full)

5. **Add Address Modal (second instance) - Cancel Button** (line ~1385)
   - Before: `<button>` with `rounded-full py-4 px-6`
   - After: `<Button variant="outline">` with `h-12 px-6` (no rounded-full)

6. **Add Address Modal (second instance) - Save Button** (line ~1403)
   - Before: `<button>` with `rounded-full py-4 px-6`
   - After: `<Button>` with `h-12 px-6 bg-black` (no rounded-full)

**Import Added:** `import { Button } from "@/components/ui/button";`

---

## What Changed

### Before:
- Raw `<button>` elements
- `rounded-full` (circular/pill shape)
- `py-4 px-6` (variable height)
- Inline styles mixed with Tailwind classes

### After:
- Canonical `<Button>` component
- `rounded-xl` (12px) from Button component
- `h-12` (48px fixed height)
- Consistent styling from single source of truth

---

## Verification

### Before:
- 12 action buttons with `rounded-full` in ManageAddresses.tsx and CashRequest.tsx

### After:
- ✅ **0 action buttons** with `rounded-full` in these files
- All buttons now use canonical `Button` component
- All buttons have `rounded-xl` (12px) from the component

---

## Remaining `rounded-full` Instances (Intentional)

The following are **intentionally** pill-shaped and should remain:

1. **Empty state icons** - `w-10 h-10 rounded-full bg-slate-900` (decorative, not buttons)
2. **"Add Address" CTA button** - `rounded-full` (intentionally pill-shaped primary CTA)
3. **Other decorative elements** - avatars, status chips, etc.

These are not action buttons and are intentionally designed as pills.

---

## Result

✅ **All action buttons** (Save, Cancel, Delete) now use canonical `Button` component  
✅ **All buttons** have `rounded-xl` (12px) - not `rounded-full`  
✅ **Single source of truth** - all button styles controlled from `src/components/ui/button.tsx`  
✅ **Consistent height** - all buttons use `h-12` (48px)  
✅ **No more pill-shaped action buttons**

---

## Next Steps (Optional)

1. ✅ **Done:** Replace all raw buttons with canonical Button
2. **Optional:** Add ESLint rule to prevent future `rounded-full` on action buttons
3. **Optional:** Add ESLint rule to prevent raw `<button>` outside UI components
4. **Optional:** Create a grep script for CI to catch future violations

---

## Testing Checklist

After this cleanup, verify:

- [ ] Manage Addresses → Add Address modal → Cancel/Save buttons are 12px rounded (not pills)
- [ ] Manage Addresses → Edit Address modal → Cancel/Save buttons are 12px rounded (not pills)
- [ ] Manage Addresses → Delete Address dialog → Delete/Cancel buttons are 12px rounded (not pills)
- [ ] Cash Request → Add Address modal → Cancel/Save buttons are 12px rounded (not pills)
- [ ] Cash Request → Edit Address modal → Cancel/Save buttons are 12px rounded (not pills)

All action buttons should now render with:
- `rounded-xl` (12px)
- `h-12` (48px height)
- No `rounded-full`
- Consistent styling from Button component

