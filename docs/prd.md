# Benjamin Cash Delivery Service Requirements Document (Updated v4 - Order Flow Enhancement)

## 1. Application Overview

### 1.1 Application Name
Benjamin Cash Delivery Service (Resident Cash App)

### 1.2 Application Description
Benjamin is a dual-interface cash delivery service platform that provides users with secure, real-time cash delivery services. The system includes a customer app, runner app, and admin dashboard, utilizing real-time communication technology to ensure instant synchronization of order status and secure cash handoff processes with enhanced UI/UX featuring safety-first design principles and location-gated order flow.

### 1.3 Core Value
- Provide convenient cash delivery services with real-time clarity
- Ensure transaction security through progressive information reveal
- Enable real-time order tracking with safety-gated visibility
- Establish complete operational audit chain with visual timeline
- Maintain controlled access through invitation-based role management
- Enable administrative order management with enhanced drawer interface
- Implement location-first order flow with address management system

## 2. Enhanced Customer Order Creation Flow

### 2.1 Page Header - Clarity & Trust
- **Title**: 'How much do you need?'
- **Subtitle**: 'Enter your details. We'll handle the rest.'
- **Note**: Title remains unchanged as sections will guide users through the flow

### 2.2 Step 1: Delivery Location (Primary)
**Section Title**: Delivery location
**Subtext**: Choose where we should deliver your cash.
\n#### 2.2.1 Saved Address Selector
- **UI Elements**: Dropdown or pill row display
- **Options**: Home, Office, Other, + Add new
- **Selected Address Summary**: Display format '123 Main St, Apt 14B, City, State'\n
#### 2.2.2 Add/Edit Address Form
**Trigger**: When 'Add new' or 'Edit' is selected
\n**Form Fields**:
- Street address (required)
- Apt/Suite (optional)
- City (required)
- State (required)
- ZIP (required)
- Label (required) - e.g., 'Home', 'Office', 'Lobby'
- Checkbox: Set as default location
- **Action Button**: 'Save & Use This Address'

#### 2.2.3 Map Confirmation (MVP-friendly)
- **Display**: Small static map with pin at geocoded location
- **Copy**: 'Make sure the pin matches where you'll receive your cash.'
- **Data Storage**: Store lat/lng from geocoding for future pricing logic

#### 2.2.4 Delivery Notes (Per Order)
- **Field Type**: Optional text input
- **Placeholder**: 'e.g., Meet at lobby, call on arrival, front desk name...'
- **Important**: This is per-order data, not stored with address

### 2.3 Gating Logic: Address → Amount
**Rule**: User must pick/confirm delivery location before unlocking amount and fee sections

**UX Behavior**:
- **Initial State**: Show Delivery Location section only
- **Disabled State**: Amount/Fee sections appear blurred with label 'Confirm your delivery location to see pricing.'
- **Enabled State**: Once address is selected and saved, enable Cash Amount slider and Fee Breakdown
- **Pricing Trigger**: Calculate pricing using base fees and address coordinates

### 2.4 Step 2: Cash Amount (Gated)
**Section Title**: Cash amount
**Subtext**: Select between $100 – $1,000 in $20 steps.

**Elements**:
- Slider and numeric input (synchronized)
- Daily limit card display:
  - Your daily limit: $X
  - Used today: $Y

**Validation**: Lock CTA if:
- No address selected
- Amount out of permitted range
- Over daily/weekly limit
\n### 2.5 Step 3: Fee Breakdown (Future-proofed)
**Section Title**: Fee Breakdown

**Breakdown Display**:
- Cash Amount
- Platform Fee
- Compliance Fee
- Delivery Fee
- Total Service Fee
- Total Payment

### 2.6 Step 4: Call-to-Action
**Button Label**: 'Request Cash Delivery'
**Subtext**: 'By confirming, you agree to Benjamin's terms and understand this request is binding once a runner prepares your order.'
\n**Enabled Conditions**: Valid address + valid amount + within limits

**On Submit Action**:
- Create order with customer_id, address_id, address_snapshot, amount, fees, status='Pending'
- Show confirmation screen
- Navigate to customer-facing status tracking

## 3. Database Schema Updates

### 3.1 Customer Addresses Table
```sql
CREATE TABLE customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id),
  label text NOT NULL, -- 'Home', 'Office', etc.
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,\n  postal_code text NOT NULL,
  latitude double precision,
  longitude double precision,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**Constraint**: One default address per customer (enforced in application logic)

### 3.2 Orders Table Updates
```sql\nALTER TABLE orders
  ADD COLUMN address_id uuid REFERENCES customer_addresses(id),
  ADD COLUMN address_snapshot jsonb; -- freeze address at order time
```

**Order Creation Logic**:
- Use address_id for reference
- Store address_snapshot with full address + lat/lng
- Prevents historical order changes when addresses are edited

### 3.3 Enhanced Profiles Table (Existing)
```sql\nALTER TABLE profiles ADD COLUMN avatar_url TEXT;
```

## 4. Pricing Architecture (Future-Ready)

### 4.1 Pricing Function Structure
```typescript
type PricingInput = {
  amount: number;
  customerAddress: { lat: number; lng: number };
  // Future extensions:
  // runnerLocation?: { lat: number; lng: number };
  // atmLocation?: { lat: number; lng: number };
  // timeOfDay?: string;\n};

type PricingBreakdown = {
  platformFee: number;\n  complianceFee: number;
  deliveryFee: number;
  totalServiceFee: number;\n  total: number;
};

function calculatePricing(input: PricingInput): PricingBreakdown {
  // MVP: Use static values, ignore location data
  // Future: Incorporate distance, time, surge pricing
}
```
\n### 4.2 Implementation Notes
- Frontend always calls calculatePricing() or API equivalent
- Current implementation uses static fees
- Architecture ready for distance-based pricing without UI changes
- Supports future enhancements: surge pricing, risk scoring, time-based fees

## 5. Enhanced UI/UX Architecture (Existing)

### 5.1 Safety-First Design Principles
- **Progressive Information Reveal**: Runner identity and location only visible after cash pickup
- **Status-Gated Visibility**: Map and personal details revealed based on order progression
- **Real-time Clarity**: Live updates with smooth animations and clear status indicators
- **Security Notifications**: Contextual safety banners and dismissible notices

### 5.2 Core UI Enhancement Goals
- Real-time clarity with safety-first experience
- Show runner map & photo only after cash pickup (status >= CashPicked)
- Add avatars for all user roles with blur-to-reveal transitions
- Add motion, polish, and safe-reveal logic without breaking current naming
- Implement comprehensive status timeline with visual progression

## 6. Map System with Safe Reveal Logic (Existing)
\n### 6.1 Customer Map (Status Gated)
- **Pre-Reveal State**: Hidden until status reaches CashPicked|EnRoute|Delivered
- **Placeholder Design**: Blurred placeholder card with lock icon before reveal
- **Post-Reveal Features**: 
  - Live runner location with smooth fade-in animation (Framer Motion)
  - Real-time ETA calculations and updates
  - Safety notice display with 'Share OTP' button
  - Customer and runner pin markers with route visualization

### 6.2 Runner Map Interface
- **Route Display**: Always shows ATM → Customer route once status reaches CashPicked
- **Navigation Integration**: 'Navigate' button opens Google Maps/Apple Maps seamlessly
- **Location History**: Breadcrumb dots showing last 5 runner positions
- **Address Tools**: 'Copy address' functionality for easy access

### 6.3 Admin Map Drawer
- **Activation**: Clicking any order opens right-side drawer interface
- **Content**: Timeline + live map + user avatars + audit event list
- **Animation**: Smooth slide-in transition with focus management
\n## 7. Avatar System Implementation (Existing)

### 7.1 Avatar Infrastructure
- **Database Field**: Add `avatar_url TEXT` to `profiles` table
- **Storage**: Supabase bucket `avatars/{user.id}/profile.jpg`
- **Sizes**: Responsive sizing (40/64/96/128/256px) with `object-fit: cover`
- **Fallback**: Circular crop with initials fallback for missing avatars
\n### 7.2 Avatar Security & Reveal Logic
- **Runner Avatar Blur**: Blurred (blur(12px)) until status reaches CashPicked
- **Reveal Animation**: Smooth transition from blur(12px) → blur(0) + name reveal
- **Customer/Admin Avatars**: Always visible without restrictions
- **Upload Restrictions**: JPG/PNG format, ≤5MB, center-crop square 1024px

### 7.3 Avatar Integration Points
- Profile management page with upload/change/remove functionality
- All user interaction interfaces (customer, runner, admin views)
- Order cards and detail views with appropriate blur states
- Communication interfaces and user identification areas

## 8. Status Timeline & Progress Visualization (Existing)

### 8.1 OrderTimeline Component
- **Status Flow**: Pending → Accepted → CashPicked → EnRoute → Delivered → Completed
- **Visual Design**: Horizontal chip-based timeline with clear progression
- **Active State**: Current step pulses with Framer Motion animation
- **Completed Steps**: Show checkmark (✓) with timestamps
- **Responsive Layout**: Adapts to mobile and desktop viewports

### 8.2 Timeline Integration
- **Customer View**: Prominent timeline showing delivery progress
- **Runner View**: Task-focused timeline with next action emphasis
- **Admin View**: Detailed timeline with intervention capabilities

## 9. Technical Implementation Architecture

### 9.1 Shared Helper Libraries
- **`/lib/reveal.ts`**: \n  - `canRevealRunner(status)` - Determines runner info visibility
  - `canShowLiveRoute(status)` - Controls map route display
- **`/lib/pricing.ts`**: 
  - `calculatePricing(input)` - Centralized pricing logic
  - `validateOrderInput(data)` - Order validation rules
- **`/components/Chip.tsx`**: Unified status badges and indicators
- **`/components/Avatar.tsx`**: Avatar component with initials fallback + blur prop
- **`/components/SafetyBanner.tsx`**: Dismissible safety notices
- **`/components/AddressManager.tsx`**: Address CRUD operations
\n### 9.2 Map Provider System
- **MapProvider Context**: Configurable map implementation
- **Default Mode**: Static map display (no external dependencies)
- **Enhanced Mode**: Google Maps JS integration via `VITE_ENABLE_GOOGLE_MAPS=1`
- **Usage**: CustomerOrderMap + RunnerOrderMap components

### 9.3 Address Management System
- **AddressSelector Component**: Saved address dropdown/pills
- **AddressForm Component**: Add/edit address form with validation
- **useAddresses Hook**: Address CRUD operations and state management
- **Geocoding Integration**: Address → lat/lng conversion for pricing

## 10. Sequential Implementation Tasks

### 10.1 Database & Address System Setup
1. Create `customer_addresses` table with proper RLS policies
2. Update `orders` table with address_id and address_snapshot columns
3. Implement address management API endpoints
4. Add geocoding service integration

### 10.2 Address Management Components
5. Create `AddressSelector.tsx` with saved address display
6. Build `AddressForm.tsx` with validation and geocoding
7. Implement `useAddresses.ts` hook for address operations
8. Create static map preview component

### 10.3 Order Flow Refactoring
9. Refactor order creation page with gated sections
10. Implement `calculatePricing()` function with future-ready signature
11. Add address validation and gating logic
12. Update order creation API to handle address data
\n### 10.4 Enhanced UI Components (Existing)
13. Complete avatar system implementation
14. Build OrderTimeline component with animations
15. Implement map system with reveal logic
16. Add toast notifications and safety banners
\n### 10.5 Testing & Polish
17. Test address management workflow end-to-end\n18. Validate gating logic and pricing calculations
19. Ensure responsive design across devices
20. Add accessibility features and error handling

## 11. Visual Design System (Existing)
\n### 11.1 Enhanced Color Scheme
- **Primary Black**: #000000 (main interface elements)
- **Pure White**: #FFFFFF (backgrounds and contrast)
- **Interactive Blue**: #007AFF (buttons and links)
- **Success Green**: #34C759 (confirmations and positive states)
- **Warning Red**: #FF3B30 (errors, cancellations, and alerts)
- **Blur Overlay**: rgba(0,0,0,0.1) for privacy protection
- **Disabled Gray**: #F2F2F7 for gated sections

### 11.2 Typography & Spacing
- **Font Family**: Inter with clear hierarchy
- **Sizes**: Display (32px), Heading (24px), Body (16px), Label (14px)
- **Grid System**: 8pt grid with 24px horizontal margins
- **Border Radius**: 12px for card components, 8px for smaller elements

### 11.3 Interactive Elements
- **Haptic Feedback**: Button presses and status transitions
- **Loading States**: Skeleton screens with shimmer effects
- **Micro-animations**: Smooth transitions for status changes and reveals
- **Focus Management**: Clear focus rings and keyboard navigation
- **Gating Animations**: Smooth blur-to-clear transitions for unlocked sections

### 11.4 Accessibility Standards
- **High Contrast**: WCAG AA compliant color ratios
- **Voice-over Support**: Comprehensive screen reader compatibility
- **Touch Targets**: Minimum 44px touch areas for mobile
- **Aria Labels**: `aria-live='polite'` for status updates
- **Focus Trapping**: Proper focus management in modals and drawers

## 12. Security & Privacy Enhancements (Existing)
\n### 12.1 Progressive Information Disclosure
- **Runner Identity Protection**: Blur and hide personal details until cash pickup
- **Location Privacy**: No live tracking until service phase begins
- **Customer Protection**: OTP-based verification for secure handoffs
- **Address Privacy**: Secure storage and controlled access to delivery locations

### 12.2 Safety Notifications
- **Context-Aware Banners**: Safety reminders at appropriate workflow stages
- **Dismissible Notices**: User-controlled safety information display
- **Emergency Protocols**: Clear escalation paths for security concerns
\n## 13. Performance Optimization (Existing)\n
### 13.1 Real-time Updates
- **Efficient Socket Management**: Optimized WebSocket connections\n- **Selective Broadcasting**: Targeted event distribution
- **Connection Resilience**: Automatic reconnection with exponential backoff

### 13.2 Asset Management
- **Avatar Optimization**: Automatic image compression and resizing
- **Lazy Loading**: Progressive loading of non-critical interface elements
- **Caching Strategy**: Intelligent caching for frequently accessed data
- **Address Geocoding**: Cache geocoded results to reduce API calls

## 14. Testing & Validation

### 14.1 UI/UX Testing
- **Address Flow Testing**: Verify complete address management workflow
- **Gating Logic Testing**: Ensure proper section enabling/disabling
- **Pricing Calculation**: Validate pricing function with various inputs
- **Reveal Logic Testing**: Verify proper information gating at each status
- **Animation Performance**: Smooth transitions across devices
- **Accessibility Compliance**: Screen reader and keyboard navigation testing

### 14.2 Security Testing
- **Information Leakage**: Ensure no premature data exposure
- **Address Data Security**: Validate secure storage and access controls
- **Avatar Upload Security**: File type and size validation
- **Privacy Controls**: Verify blur and reveal mechanisms
\n## 15. Reference Files
1. Screenshot 2025-11-06 at 2.31.30 PM.png - Invitation link display issue
2. Screenshot 2025-11-06 at 5.50.27 PM.png - Order interface example
3. Screenshot 2025-11-06 at 6.26.36 PM.png - Runner order view
4. Screenshot 2025-11-06 at 6.38.42 PM.png - Error handling display
5. Screenshot 2025-11-06 at 6.39.26 PM.png - Console error logs
6. Screenshot 2025-11-06 at 6.39.32 PM.png - Deprecated feature warnings
7. menu 1.png - Navigation menu design reference