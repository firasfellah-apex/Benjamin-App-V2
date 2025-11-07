# UI Upgrade Integration Guide

This guide explains how to integrate the new UI components into your existing pages.

## ✅ Completed Components

### 1. Avatar System

**Components:**
- `Avatar` - Reusable avatar with blur support
- `AvatarUploader` - Drag & drop upload with auto-crop

**Already Integrated:**
- ✅ Account page (Profile picture upload)

**Usage Example:**
```tsx
import { Avatar } from '@/components/common/Avatar';
import { AvatarUploader } from '@/components/common/AvatarUploader';

// Display avatar
<Avatar
  src={user.avatar_url}
  fallback={user.name}
  size="lg"
  blurred={false}
/>

// Upload avatar
<AvatarUploader
  currentAvatarUrl={profile.avatar_url}
  userName={`${profile.first_name} ${profile.last_name}`}
  onUploadComplete={() => refreshProfile()}
  onRemoveComplete={() => refreshProfile()}
/>
```

---

### 2. Safe Reveal Logic

**Files:**
- `src/lib/reveal.ts` - Helper functions for privacy protection

**Functions:**
```tsx
import { canRevealRunner, canShowLiveRoute, getRevealMessage } from '@/lib/reveal';

// Check if runner info can be shown
const canReveal = canRevealRunner(order.status); // true after 'Cash Withdrawn'

// Check if live map can be shown
const showMap = canShowLiveRoute(order.status); // true after 'Cash Withdrawn'

// Get user-friendly message
const message = getRevealMessage(order.status);
```

**Status Flow:**
1. Pending
2. Runner Accepted
3. Runner at ATM
4. **Cash Withdrawn** ← REVEAL POINT
5. Pending Handoff
6. Completed

---

### 3. RunnerIdentity Component

**Component:** `src/components/order/RunnerIdentity.tsx`

**Features:**
- Blurred avatar + initial before cash pickup
- Full avatar + name after cash pickup
- Smooth transition animation

**Usage:**
```tsx
import { RunnerIdentity } from '@/components/order/RunnerIdentity';

<RunnerIdentity
  runnerName={order.runner?.first_name + ' ' + order.runner?.last_name}
  runnerAvatarUrl={order.runner?.avatar_url}
  orderStatus={order.status}
  size="md"
  showLabel={true}
/>
```

**Integration Points:**
- Customer order tracking page
- Customer order detail page
- Admin order drawer (already integrated)

---

### 4. OrderTimeline Component

**Component:** `src/components/order/OrderTimeline.tsx`

**Features:**
- Horizontal timeline with status chips
- Current step pulses with animation
- Completed steps show checkmark + timestamp
- Cancelled state handling

**Usage:**
```tsx
import { OrderTimeline } from '@/components/order/OrderTimeline';

<OrderTimeline
  currentStatus={order.status}
  timestamps={{
    'Pending': order.created_at,
    'Runner Accepted': order.runner_accepted_at,
    'Runner at ATM': order.runner_at_atm_at,
    'Cash Withdrawn': order.cash_withdrawn_at,
    'Pending Handoff': order.handoff_completed_at,
    'Completed': order.status === 'Completed' ? order.updated_at : undefined
  }}
/>
```

**Integration Points:**
- Customer order tracking page
- Runner order detail page
- Admin order drawer (already integrated)

---

### 5. Map Components

**Components:**
- `CustomerOrderMap` - Status-gated map for customers
- `RunnerOrderMap` - Route guidance for runners
- `MapProvider` - Context for map functionality

**CustomerOrderMap Usage:**
```tsx
import { CustomerOrderMap } from '@/components/order/CustomerOrderMap';

<CustomerOrderMap
  orderStatus={order.status}
  customerLocation={{
    lat: 40.7128,
    lng: -74.0060,
    address: order.customer_address
  }}
  runnerLocation={runnerLocation} // Optional, for live tracking
  estimatedArrival="5 minutes"
/>
```

**Features:**
- Hidden until 'Cash Withdrawn' status
- Shows blurred placeholder with lock icon before reveal
- Live runner location + ETA after reveal
- Safety banner integration
- Copy address button

**RunnerOrderMap Usage:**
```tsx
import { RunnerOrderMap } from '@/components/order/RunnerOrderMap';

<RunnerOrderMap
  orderStatus={order.status}
  customerLocation={{
    lat: 40.7128,
    lng: -74.0060,
    address: order.customer_address
  }}
  atmLocation={{
    lat: 40.7580,
    lng: -73.9855,
    address: 'ATM at 123 Main St'
  }}
/>
```

**Features:**
- Shows ATM location before cash pickup
- Shows ATM → Customer route after pickup
- Navigate button (opens Google/Apple Maps)
- Copy address functionality

**Integration Points:**
- Customer order tracking page (CustomerOrderMap)
- Runner order detail page (RunnerOrderMap)

---

### 6. SafetyBanner Component

**Component:** `src/components/common/SafetyBanner.tsx`

**Features:**
- Dismissible safety notice
- Stores preference in localStorage
- Shows before runner info is revealed

**Usage:**
```tsx
import { SafetyBanner } from '@/components/common/SafetyBanner';

<SafetyBanner
  message="Runner photo and live location will be visible after cash pickup"
  storageKey="benjamin-safety-banner-dismissed"
/>
```

**Integration Points:**
- Customer order tracking page (before reveal)
- CustomerOrderMap (already integrated)

---

### 7. Status Chip Component

**Component:** `src/components/common/Chip.tsx`

**Features:**
- Unified status badge styling
- Consistent colors across app

**Usage:**
```tsx
import { Chip } from '@/components/common/Chip';

<Chip status={order.status} />
```

**Integration Points:**
- Order lists (customer, runner, admin)
- Order detail pages
- Admin order drawer (already integrated)

---

### 8. Empty States & Skeletons

**Components:**
- `EmptyState` - Shows when no data available
- `OrderListSkeleton` - Loading placeholder

**EmptyState Usage:**
```tsx
import { EmptyState } from '@/components/common/EmptyState';
import { Package } from 'lucide-react';

<EmptyState
  icon={Package}
  title="No orders yet"
  description="Your orders will appear here once you make a request"
  actionLabel="Request Cash"
  onAction={() => navigate('/customer/request')}
/>
```

**OrderListSkeleton Usage:**
```tsx
import { OrderListSkeleton } from '@/components/order/OrderListSkeleton';

{loading ? (
  <OrderListSkeleton count={3} />
) : (
  <OrderList orders={orders} />
)}
```

**Integration Points:**
- All order list pages (customer, runner, admin)
- Loading states

---

### 9. AdminOrderDrawer Component

**Component:** `src/components/admin/AdminOrderDrawer.tsx`

**Features:**
- Slide-in drawer with order details
- Timeline, avatars, locations, event log
- Financial breakdown

**Usage:**
```tsx
import { AdminOrderDrawer } from '@/components/admin/AdminOrderDrawer';
import { useState } from 'react';

const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
const [drawerOpen, setDrawerOpen] = useState(false);

// In your order table/list
<Button onClick={() => {
  setSelectedOrder(order);
  setDrawerOpen(true);
}}>
  View Details
</Button>

// Drawer component
<AdminOrderDrawer
  order={selectedOrder}
  open={drawerOpen}
  onOpenChange={setDrawerOpen}
/>
```

**Integration Points:**
- Admin Monitor page (order table click)

---

### 10. Confetti Utility

**File:** `src/lib/confetti.ts`

**Usage:**
```tsx
import { triggerConfetti } from '@/lib/confetti';
import { toast } from 'sonner';

// When order is completed
if (newStatus === 'Completed') {
  triggerConfetti(3000); // 3 seconds
  toast.success('Order completed! 🎉');
}
```

**Integration Points:**
- Customer order tracking (when status becomes 'Completed')
- Runner order detail (when marking as completed)

---

## 📋 Integration Checklist

### Customer Pages

#### `/customer/orders` (MyOrders.tsx)
- [ ] Add `OrderListSkeleton` for loading state
- [ ] Add `EmptyState` when no orders
- [ ] Add `Chip` for status badges
- [ ] Add `Avatar` for runner (with blur logic)

#### `/customer/tracking/:id` (OrderTracking.tsx)
- [ ] Add `OrderTimeline` at top
- [ ] Add `RunnerIdentity` component
- [ ] Add `CustomerOrderMap` component
- [ ] Add `SafetyBanner` before reveal
- [ ] Add confetti on completion
- [ ] Replace status text with `Chip`

### Runner Pages

#### `/runner/orders` (AvailableOrders.tsx)
- [ ] Add `OrderListSkeleton` for loading state
- [ ] Add `EmptyState` when no orders
- [ ] Add `Avatar` for customer

#### `/runner/deliveries` (MyDeliveries.tsx)
- [ ] Add `OrderListSkeleton` for loading state
- [ ] Add `EmptyState` when no deliveries
- [ ] Add `Chip` for status badges
- [ ] Add `Avatar` for customer

#### `/runner/order/:id` (RunnerOrderDetail.tsx)
- [ ] Add `OrderTimeline` at top
- [ ] Add `RunnerOrderMap` component
- [ ] Add `Avatar` for customer
- [ ] Add confetti on completion
- [ ] Replace status text with `Chip`

### Admin Pages

#### `/admin/monitor` (Admin Monitor)
- [ ] Add `AdminOrderDrawer` on row click
- [ ] Add `Chip` for status column
- [ ] Add `Avatar` for customer/runner columns
- [ ] Add `OrderListSkeleton` for loading

---

## 🎨 Toast Notifications

The app already has Sonner toast set up. Use it for user feedback:

```tsx
import { toast } from 'sonner';

// Success
toast.success('Order accepted!');

// Error
toast.error('Failed to update order');

// Info
toast.info('Runner is on the way');

// With confetti
triggerConfetti();
toast.success('Order completed! 🎉');
```

---

## 🔐 Database Migration

The avatar support migration has been created:

**File:** `supabase/migrations/20251107_add_avatar_support.sql`

**What it does:**
- Adds `avatar_url` column to `profiles` table
- Creates `avatars` storage bucket
- Sets up RLS policies (users can only manage their own avatars)
- Public read access for all avatars

**Status:** ✅ Already applied

---

## 🚀 Next Steps

1. **Integrate components into existing pages** (see checklist above)
2. **Test safe-reveal logic** with different order statuses
3. **Test avatar upload** on Account page
4. **Add toast notifications** for status changes
5. **Test map components** with real coordinates
6. **Add confetti** to completion flows
7. **Test AdminOrderDrawer** in Admin Monitor

---

## 💡 Tips

1. **Status Gating:** Always use `canRevealRunner()` and `canShowLiveRoute()` helpers
2. **Avatars:** Use `Avatar` component everywhere instead of plain `<img>`
3. **Loading States:** Always show `OrderListSkeleton` while loading
4. **Empty States:** Always show `EmptyState` when no data
5. **Toasts:** Add toast notifications for all user actions
6. **Confetti:** Only trigger on 'Completed' status
7. **Maps:** Use static maps by default (no API key needed)

---

## 🐛 Troubleshooting

**Avatar upload not working:**
- Check that migration was applied
- Check that user is authenticated
- Check browser console for errors

**Map not showing:**
- Check that coordinates are valid
- Check that address is provided
- Check browser console for iframe errors

**Blur not working:**
- Check that order status is correct
- Check that `canRevealRunner()` returns expected value
- Check CSS classes are applied

**Timeline not updating:**
- Check that timestamps are provided
- Check that status matches one of the timeline steps
- Check that timestamps are valid ISO strings

---

## 📚 Component Reference

All components are documented with JSDoc comments. Check the source files for detailed prop types and usage examples.

**Key directories:**
- `src/components/common/` - Reusable UI components
- `src/components/order/` - Order-specific components
- `src/components/admin/` - Admin-specific components
- `src/lib/` - Utility functions
- `src/hooks/` - Custom React hooks
