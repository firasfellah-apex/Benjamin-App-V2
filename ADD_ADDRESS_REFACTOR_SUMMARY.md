# Add Delivery Address Modal - Refactor Summary

## Step 1: Found the LIVE Component ✅

**Component:** `AddressFormModal`  
**File:** `src/components/address/AddressSelector.tsx` (lines 33-228)  
**Status:** ✅ **LIVE** - This is the actual component that renders the bottom sheet

**How it's used:**
- Rendered via `createPortal` at document.body level
- Called from `AddressSelector` component when `showForm` is true
- Used in customer app when adding/editing addresses

**No other components found** - This is the only one using `addAddressCopy` for the modal.

---

## Step 2: Canonical Primitives Created ✅

### 1. **IconButton** (`src/components/ui/icon-button.tsx`)
- **Purpose:** Close/X buttons
- **Default size:** 40×40px (w-10 h-10)
- **Default radius:** 12px (`rounded-xl`)
- **Default background:** `#F7F7F7`
- **No border:** Built-in
- **Variants:** default, ghost, destructive
- **Sizes:** default (40px), sm (32px), lg (48px)

### 2. **Button** (`src/components/ui/button.tsx`)
- **Purpose:** All standard action buttons
- **Default radius:** 12px (`rounded-xl`) - **CHANGED from `rounded-md`**
- **No `rounded-full` variants** - all buttons use 12px by default
- **Variants:** default, destructive, outline, secondary, ghost, link
- **Sizes:** default, sm, lg, icon, icon-sm, icon-lg

### 3. **Input** (`src/components/ui/input.tsx`)
- **Purpose:** All text inputs
- **Default radius:** 12px (`rounded-xl`) - **CHANGED from `rounded-md`**
- **Proper focus states:** Green gradient on focus

---

## Step 3: AddressFormModal Refactored ✅

**File:** `src/components/address/AddressSelector.tsx`

### Changes Made:

1. **X Button (Close)** - Line ~127
   - **Before:** Plain `<button>` with inline styles and `!important` overrides
   - **After:** `<IconButton>` component
   - **Result:** 40×40px, 12px rounded, `#F7F7F7` background, no border

2. **Cancel Button** - Line ~177
   - **Before:** Plain `<button>` with `py-4` (variable height)
   - **After:** `<Button variant="outline">` with `h-12` (48px fixed height)
   - **Result:** 48px height, 12px rounded via component

3. **Save & Use Address Button** - Line ~192
   - **Before:** Plain `<button>` with `py-4` (variable height)
   - **After:** `<Button>` with `h-12` (48px fixed height) and custom black background
   - **Result:** 48px height, 12px rounded via component

### Removed:
- ❌ All inline `borderRadius` styles
- ❌ All `!important` Tailwind classes (`!rounded-xl`, `!bg-[#F7F7F7]`)
- ❌ All `rounded-full` classes
- ❌ All manual border overrides

---

## Step 4: Radius Control - Single Source of Truth ✅

### Button Radius:
- **File:** `src/components/ui/button.tsx`
- **Base class:** `rounded-xl` (12px)
- **No `rounded-full` anywhere** in button variants
- **To change app-wide:** Edit line 8 in `button.tsx`

### IconButton Radius:
- **File:** `src/components/ui/icon-button.tsx`
- **Base class:** `rounded-xl` (12px)
- **To change app-wide:** Edit line 8 in `icon-button.tsx`

### Input Radius:
- **File:** `src/components/ui/input.tsx`
- **Base class:** `rounded-xl` (12px)
- **To change app-wide:** Edit line 13 in `input.tsx`

### Documentation Added:
- Added header comments to all three components warning against inline radius overrides
- Added debug comment in `AddressFormModal` identifying it as the LIVE component

---

## Verification Checklist

To verify the Add Delivery Address sheet is correct:

1. **Open the modal** in the customer app
2. **Check X button (top-right):**
   - ✅ 40×40px size
   - ✅ 12px rounded (not circular)
   - ✅ `#F7F7F7` background
   - ✅ No border/stroke

3. **Check Cancel button (footer):**
   - ✅ 48px height (`h-12`)
   - ✅ 12px rounded (not pill-shaped)
   - ✅ White background with border

4. **Check Save & Use Address button (footer):**
   - ✅ 48px height (`h-12`)
   - ✅ 12px rounded (not pill-shaped)
   - ✅ Black background

5. **Check input fields:**
   - ✅ 12px rounded
   - ✅ Green focus state

---

## How to Change Button/Input Radius App-Wide

### For Buttons:
1. Open `src/components/ui/button.tsx`
2. Edit line 8: Change `rounded-xl` to desired radius
3. All buttons across the app will update automatically

### For IconButtons:
1. Open `src/components/ui/icon-button.tsx`
2. Edit line 8: Change `rounded-xl` to desired radius
3. All icon buttons will update automatically

### For Inputs:
1. Open `src/components/ui/input.tsx`
2. Edit line 13: Change `rounded-xl` to desired radius
3. All inputs will update automatically

---

## Files Changed

1. ✅ `src/components/ui/button.tsx` - Changed base radius to `rounded-xl`
2. ✅ `src/components/ui/icon-button.tsx` - **NEW** - Created canonical IconButton
3. ✅ `src/components/ui/input.tsx` - Changed base radius to `rounded-xl`
4. ✅ `src/components/address/AddressSelector.tsx` - Refactored to use canonical components

---

## Next Steps (Optional)

If you still see pill buttons after this refactor:
1. Hard refresh browser (`Cmd+Shift+R` or `Ctrl+Shift+R`)
2. Restart dev server
3. Check browser DevTools → Inspect button → Look for React component name
4. If component name doesn't match `AddressFormModal`, there may be another component rendering it

