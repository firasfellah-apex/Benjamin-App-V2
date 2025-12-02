# Benjamin Design System

## Core Principles

1. **Single Source of Truth**: All button and input styles are controlled from canonical primitives in `src/components/ui/`
2. **No Inline Radius Overrides**: Feature components must NOT set their own `rounded-*` classes on buttons/inputs
3. **Consistent 12px Radius**: All action buttons and inputs use `rounded-xl` (12px) by default
4. **Pill Shape Only When Explicit**: `rounded-full` is only allowed for intentionally pill-shaped elements (chips, avatars, status badges)

---

## Canonical Primitives

### 1. Button (`src/components/ui/button.tsx`)

**Purpose:** All primary, secondary, outline, and ghost action buttons.

**Default Radius:** `rounded-xl` (12px)

**Variants:**
- `default`: Primary button (bg-primary)
- `outline`: Outlined button with border
- `secondary`: Secondary button
- `ghost`: Transparent button with hover
- `destructive`: Red destructive action
- `link`: Text link style

**Sizes:**
- `default`: `h-9` (36px)
- `sm`: `h-8` (32px)
- `lg`: `h-10` (40px)

**Usage:**
```tsx
import { Button } from "@/components/ui/button";

<Button variant="default" size="default">Click me</Button>
<Button variant="outline">Cancel</Button>
```

**Rules:**
- ✅ Use for all action buttons (Save, Cancel, Submit, etc.)
- ❌ Do NOT add `rounded-full` or `rounded-*` classes
- ❌ Do NOT use raw `<button>` elements for primary UI

---

### 2. IconButton (`src/components/ui/icon-button.tsx`)

**Purpose:** Icon-only buttons (close X, menu toggles, etc.)

**Default Radius:** `rounded-xl` (12px) - **NEVER rounded-full**

**Default Size:** `w-10 h-10` (40×40px)

**Default Background:** `#F7F7F7`

**No Border:** By default, no border is applied

**Variants:**
- `default`: `bg-[#F7F7F7]` with hover `#EDEDED`
- `ghost`: Transparent with hover
- `destructive`: Red background

**Sizes:**
- `default`: `w-10 h-10` (40×40px)
- `sm`: `w-8 h-8` (32×32px)
- `lg`: `w-12 h-12` (48×48px)

**Usage:**
```tsx
import { IconButton } from "@/components/ui/icon-button";

<IconButton variant="default" size="default" aria-label="Close">
  <X className="h-5 w-5" />
</IconButton>
```

**Rules:**
- ✅ Use for all close buttons, menu toggles, icon-only actions
- ❌ Do NOT add `rounded-full` or `rounded-*` classes
- ❌ Do NOT use raw `<button>` elements for icon buttons

---

### 3. Input (`src/components/ui/input.tsx`)

**Purpose:** All text input fields

**Default Radius:** `rounded-xl` (12px)

**Usage:**
```tsx
import { Input } from "@/components/ui/input";

<Input type="text" placeholder="Enter text" />
```

**Rules:**
- ✅ Use for all text inputs
- ❌ Do NOT add `rounded-full` or `rounded-*` classes
- ❌ Do NOT use raw `<input>` elements for primary UI

---

## When `rounded-full` IS Allowed

The following components are **intentionally** pill-shaped and may use `rounded-full`:

### ✅ Safe to Keep `rounded-full`:

1. **Avatars** (`src/components/ui/avatar.tsx`)
   - Reason: Avatars are circular by design

2. **Status Chips** (`src/components/ui/StatusChip.tsx`)
   - Reason: Status badges are pill-shaped

3. **UI Primitives:**
   - Sliders (`src/components/ui/slider.tsx`) - Track and thumb
   - Progress bars (`src/components/ui/progress.tsx`)
   - Scrollbars (`src/components/ui/scroll-area.tsx`)
   - Drawer handles (`src/components/ui/drawer.tsx`)
   - Switches (`src/components/ui/switch.tsx`) - Toggle
   - Radio buttons (`src/components/ui/radio-group.tsx`)
   - Carousel navigation (`src/components/ui/carousel.tsx`)

4. **Multi-Select Chips** (`src/components/ui/multi-select.tsx`)
   - Reason: Selection chips are pill-shaped

5. **Info Tooltips** (`src/components/ui/InfoTooltip.tsx`)
   - Reason: Tooltip icons are circular

6. **Skeleton Loaders** (loading states)
   - Reason: Loading placeholders for avatars/progress

---

## When `rounded-full` Should Be Refactored

The following should be replaced with canonical components:

### ⚠️ Needs Refactoring:

1. **Close/X Buttons** - Replace with `IconButton`
   - Files:
     - `src/pages/customer/ManageAddresses.tsx`
     - `src/pages/customer/CashRequest.tsx`
     - `src/pages/customer/OrderTracking.tsx`
     - `src/components/customer/ActiveDeliverySheet.tsx`
     - `src/components/customer/ReportIssueSheet.tsx`
     - `src/components/customer/CompletionRatingModal.tsx`
     - `src/components/common/AvatarCropModal.tsx`

2. **Action Buttons** - Replace with `Button`
   - Check `src/pages/customer/components/CustomerButton.tsx` - may need to be replaced or refactored

3. **Form Buttons** - Replace with `Button`
   - All Save, Cancel, Submit buttons should use canonical `Button`

---

## How to Change Radius App-Wide

### For Buttons:
1. Open `src/components/ui/button.tsx`
2. Edit line 19: Change `rounded-xl` to desired radius
3. All buttons across the app will update automatically

### For IconButtons:
1. Open `src/components/ui/icon-button.tsx`
2. Edit line 45: Change `rounded-xl` to desired radius
3. All icon buttons will update automatically

### For Inputs:
1. Open `src/components/ui/input.tsx`
2. Edit line 13: Change `rounded-xl` to desired radius
3. All inputs will update automatically

---

## Enforcement Rules

### Rule 1: No Raw HTML Elements
- ❌ Never use `<button>` directly in feature components
- ✅ Always use `<Button>` or `<IconButton>`

### Rule 2: No Inline Radius Overrides
- ❌ Never add `rounded-full`, `rounded-xl`, etc. to buttons/inputs in feature components
- ✅ All radius is controlled in `src/components/ui/`

### Rule 3: Single Source of Truth
- ✅ All button styles come from `src/components/ui/button.tsx`
- ✅ All icon button styles come from `src/components/ui/icon-button.tsx`
- ✅ All input styles come from `src/components/ui/input.tsx`

---

## Migration Checklist

When refactoring a component:

- [ ] Replace all `<button>` elements with `<Button>` or `<IconButton>`
- [ ] Remove all `rounded-full` classes from action buttons
- [ ] Remove all `rounded-*` classes from buttons/inputs
- [ ] Remove inline `borderRadius` styles
- [ ] Use canonical components from `src/components/ui/`
- [ ] Test visual appearance matches design
- [ ] Verify no console warnings or errors

---

## File Locations

### Canonical Components:
- `src/components/ui/button.tsx` - All action buttons
- `src/components/ui/icon-button.tsx` - Icon-only buttons
- `src/components/ui/input.tsx` - Text inputs

### Design System Documentation:
- `DESIGN_SYSTEM.md` (this file)
- `ROUNDED_FULL_AUDIT.md` - Complete audit of `rounded-full` usage

---

## Questions?

If you're unsure whether to use `rounded-full`:
1. Is it an avatar, chip, or UI primitive (slider, switch, etc.)? → ✅ Yes, use `rounded-full`
2. Is it an action button (Save, Cancel, Close, etc.)? → ❌ No, use `Button` or `IconButton` with `rounded-xl`
3. Is it a text input? → ❌ No, use `Input` with `rounded-xl`

When in doubt, use the canonical primitives with their default `rounded-xl` styling.

