# Component Audit - Button & Input Primitives

## Step 1: Audit Results

### Button Components Found

1. **`src/components/ui/button.tsx`**
   - Component: `Button`
   - Base radius: `rounded-md` (not rounded-full)
   - Status: **Main UI component** - used for general UI buttons
   - Variants: default, destructive, outline, secondary, ghost, link
   - Sizes: default, sm, lg, icon, icon-sm, icon-lg

2. **`src/pages/customer/components/CustomerButton.tsx`**
   - Component: `CustomerButton`
   - Base radius: `rounded-full` → **JUST CHANGED to `rounded-xl` (12px)**
   - Status: **Customer-specific button** - used for customer-facing buttons
   - Variants: primary, secondary, ghost
   - Sizes: lg, md, sm
   - **Issue**: Had `rounded-full` hardcoded, now has `shape` variant (default/pill)

3. **`src/components/address/AddressSelector.tsx` - AddressFormModal**
   - Component: Plain `<button>` elements (NOT using shared components)
   - Status: **One-off inline buttons** - X button, Cancel, Save
   - **Issue**: Using ad-hoc Tailwind classes with inline styles to override
   - Location: Lines 128-142 (X button), 181-218 (Cancel/Save buttons)

### Input Components Found

1. **`src/components/ui/input.tsx`**
   - Component: `Input`
   - Base radius: `rounded-md`
   - Status: **Main UI component** - used for general inputs
   - Has proper focus states and validation styles

2. **`src/components/address/AddressForm.tsx`**
   - Uses `Input` from `@/components/ui/input`
   - Status: **Uses canonical Input** ✅

### Key Findings

- **The Add Delivery Address modal** (`AddressFormModal` in `AddressSelector.tsx`) uses **plain `<button>` elements**, not shared Button components
- The X button, Cancel, and Save buttons are all inline Tailwind with manual overrides
- `CustomerButton` was using `rounded-full` but has been updated to `rounded-xl` with a shape variant
- `Button` from `ui/button.tsx` uses `rounded-md` (not the 12px we want)

## Next Steps

1. Create canonical `IconButton` component for close buttons
2. Update `Button` to use `rounded-xl` (12px) as default
3. Refactor `AddressFormModal` to use canonical primitives
4. Remove inline style hacks

