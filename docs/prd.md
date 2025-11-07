# Benjamin Cash Delivery Service Requirements Document (Updated v3 - UI Enhancement)

## 1. Application Overview

### 1.1 Application Name
Benjamin Cash Delivery Service (Resident Cash App)

### 1.2 Application Description
Benjamin is a dual-interface cash delivery service platform that provides users with secure, real-time cash delivery services. The system includes a customer app, runner app, and admin dashboard, utilizing real-time communication technology to ensure instant synchronization of order status and secure cash handoff processes with enhanced UI/UX featuring safety-first design principles.
\n### 1.3 Core Value\n- Provide convenient cash delivery services with real-time clarity
- Ensure transaction security through progressive information reveal
- Enable real-time order tracking with safety-gated visibility
- Establish complete operational audit chain with visual timeline
- Maintain controlled access through invitation-based role management
- Enable administrative order management with enhanced drawer interface

## 2. Enhanced UI/UX Architecture

### 2.1 Safety-First Design Principles
- **Progressive Information Reveal**: Runner identity and location only visible after cash pickup
- **Status-Gated Visibility**: Map and personal details revealed based on order progression
- **Real-time Clarity**: Live updates with smooth animations and clear status indicators
- **Security Notifications**: Contextual safety banners and dismissible notices

### 2.2 Core UI Enhancement Goals
- Real-time clarity with safety-first experience
- Show runner map & photo only after cash pickup (status >= CashPicked)
- Add avatars for all user roles with blur-to-reveal transitions
- Add motion, polish, and safe-reveal logic without breaking current naming
- Implement comprehensive status timeline with visual progression

## 3. Map System with Safe Reveal Logic

### 3.1 Customer Map (Status Gated)
- **Pre-Reveal State**: Hidden until status reaches CashPicked|EnRoute|Delivered
- **Placeholder Design**: Blurred placeholder card with lock icon before reveal
- **Post-Reveal Features**: 
  - Live runner location with smooth fade-in animation (Framer Motion)
  - Real-time ETA calculations and updates
  - Safety notice display with 'Share OTP' button
  - Customer and runner pin markers with route visualization

### 3.2 Runner Map Interface
- **Route Display**: Always shows ATM → Customer route once status reaches CashPicked
- **Navigation Integration**: 'Navigate' button opens Google Maps/Apple Maps seamlessly
- **Location History**: Breadcrumb dots showing last 5 runner positions
- **Address Tools**: 'Copy address' functionality for easy access
\n### 3.3 Admin Map Drawer
- **Activation**: Clicking any order opens right-side drawer interface
- **Content**: Timeline + live map + user avatars + audit event list
- **Animation**: Smooth slide-in transition with focus management
\n## 4. Avatar System Implementation

### 4.1 Avatar Infrastructure
- **Database Field**: Add `avatar_url TEXT` to `profiles` table
- **Storage**: Supabase bucket `avatars/{user.id}/profile.jpg`
- **Sizes**: Responsive sizing (40/64/96/128/256px) with `object-fit: cover`
- **Fallback**: Circular crop with initials fallback for missing avatars

### 4.2 Avatar Security & Reveal Logic
- **Runner Avatar Blur**: Blurred (blur(12px)) until status reaches CashPicked\n- **Reveal Animation**: Smooth transition from blur(12px) → blur(0) + name reveal
- **Customer/Admin Avatars**: Always visible without restrictions
- **Upload Restrictions**: JPG/PNG format, ≤5MB, center-crop square1024px

### 4.3 Avatar Integration Points
- Profile management page with upload/change/remove functionality
- All user interaction interfaces (customer, runner, admin views)
- Order cards and detail views with appropriate blur states
- Communication interfaces and user identification areas

## 5. Status Timeline & Progress Visualization
\n### 5.1 OrderTimeline Component
- **Status Flow**: Pending → Accepted → CashPicked → EnRoute → Delivered → Completed
- **Visual Design**: Horizontal chip-based timeline with clear progression
- **Active State**: Current step pulses with Framer Motion animation
- **Completed Steps**: Show checkmark (✓) with timestamps
- **Responsive Layout**: Adapts to mobile and desktop viewports

### 5.2 Timeline Integration
- **Customer View**: Prominent timeline showing delivery progress
- **Runner View**: Task-focused timeline with next action emphasis
- **Admin View**: Detailed timeline with intervention capabilities

## 6. Enhanced User Interface Components

### 6.1 Card System & Lists
- **Runner Job Cards**: Available job cards with payout + distance display
- **Customer Order Cards**: Condensed header with building info and ETA
- **Admin Order Cards**: Table + drawer view with comprehensive audit information
- **Loading States**: Skeleton screens for all card types during data fetch

### 6.2 Empty States & Feedback
- **Empty Job Lists**: Friendly messages with refresh timestamps
- **No Orders**: Contextual empty states with action suggestions
- **Error States**: Clear error messages with retry mechanisms
\n### 6.3 Safety Banner System
- **Content**: 'Photo & live location visible after cash collection'
- **Behavior**: Dismissible via localStorage persistence
- **Placement**: Contextual placement on relevant screens
- **Styling**: Non-intrusive but clearly visible safety notice

## 7. Toast Notifications & Celebrations

### 7.1 Global Toast System
- **Implementation**: Global `useToast()` hook with success/error states
- **Triggers**: Status changes, job acceptance, cancellations, OTP verification
- **Positioning**: Non-blocking toast positioning with auto-dismiss
\n### 7.2 Celebration Animations
- **Order Completion**: Light confetti animation at 'Completed' status
- **Job Acceptance**: Subtle success animation for runners
- **Milestone Achievements**: Micro-celebrations for key status transitions

## 8. Technical Implementation Architecture

### 8.1 Shared Helper Libraries
- **`/lib/reveal.ts`**: \n  - `canRevealRunner(status)` - Determines runner info visibility
  - `canShowLiveRoute(status)` - Controls map route display
- **`/components/Chip.tsx`**: Unified status badges and indicators
- **`/components/Avatar.tsx`**: Avatar component with initials fallback + blur prop
- **`/components/SafetyBanner.tsx`**: Dismissible safety notices\n
### 8.2 Map Provider System
- **MapProvider Context**: Configurable map implementation
- **Default Mode**: Static map display (no external dependencies)
- **Enhanced Mode**: Google Maps JS integration via `VITE_ENABLE_GOOGLE_MAPS=1`
- **Usage**: CustomerOrderMap + RunnerOrderMap components

### 8.3 Database Schema Updates
\n#### Enhanced Profiles Table
```sql
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
```

#### Avatar Storage Bucket
- **Bucket Name**: `avatars`
- **RLS Policy**: Users can only manage their own avatar folder
- **File Structure**: `avatars/{user_id}/profile.jpg`

## 9. Sequential Implementation Tasks

### 9.1 Database & Storage Setup
1. Add `avatar_url` column to profiles table
2. Create `avatars` bucket with proper RLS policies
3. Implement avatar upload/management API endpoints

### 9.2 Core Components Development
4. Create `AvatarUploader.tsx` with `useAvatar.ts` hook
5. Integrate avatar functionality into Profile page
6. Implement `RunnerIdentity.tsx` with safe-reveal logic
\n### 9.3 Map System Implementation
7. Build `CustomerOrderMap.tsx` with status-gated visibility
8. Develop `RunnerOrderMap.tsx` with navigation integration
9. Create `MapProvider` context with configurable backends

### 9.4 Timeline & Feedback Systems
10. Implement `OrderTimeline.tsx` with Framer Motion animations
11. Build global Toaster system with `useToast()` hook
12. Create skeleton loading states and empty state components

### 9.5 Admin & Accessibility Enhancements
13. Develop admin drawer interface with timeline + map integration
14. Implement `SafetyBanner.tsx` with localStorage persistence
15. Add comprehensive accessibility features (aria-live, focus management)

## 10. Visual Design System

### 10.1 Enhanced Color Scheme
- **Primary Black**: #000000 (main interface elements)
- **Pure White**: #FFFFFF (backgrounds and contrast)
- **Interactive Blue**: #007AFF (buttons and links)
- **Success Green**: #34C759 (confirmations and positive states)
- **Warning Red**: #FF3B30 (errors, cancellations, and alerts)
- **Blur Overlay**: rgba(0,0,0,0.1) for privacy protection

### 10.2 Typography & Spacing\n- **Font Family**: Inter with clear hierarchy
- **Sizes**: Display (32px), Heading (24px), Body (16px), Label (14px)
- **Grid System**: 8pt grid with 24px horizontal margins
- **Border Radius**: 12px for card components, 8px for smaller elements

### 10.3 Interactive Elements
- **Haptic Feedback**: Button presses and status transitions
- **Loading States**: Skeleton screens with shimmer effects
- **Micro-animations**: Smooth transitions for status changes and reveals
- **Focus Management**: Clear focus rings and keyboard navigation

### 10.4 Accessibility Standards
- **High Contrast**: WCAG AA compliant color ratios
- **Voice-over Support**: Comprehensive screen reader compatibility
- **Touch Targets**: Minimum 44px touch areas for mobile
- **Aria Labels**: `aria-live='polite'` for status updates
- **Focus Trapping**: Proper focus management in modals and drawers

## 11. Security & Privacy Enhancements
\n### 11.1 Progressive Information Disclosure
- **Runner Identity Protection**: Blur and hide personal details until cash pickup
- **Location Privacy**: No live tracking until service phase begins
- **Customer Protection**: OTP-based verification for secure handoffs
\n### 11.2 Safety Notifications
- **Context-Aware Banners**: Safety reminders at appropriate workflow stages
- **Dismissible Notices**: User-controlled safety information display
- **Emergency Protocols**: Clear escalation paths for security concerns

## 12. Performance Optimization

### 12.1 Real-time Updates
- **Efficient Socket Management**: Optimized WebSocket connections\n- **Selective Broadcasting**: Targeted event distribution
- **Connection Resilience**: Automatic reconnection with exponential backoff

### 12.2 Asset Management
- **Avatar Optimization**: Automatic image compression and resizing
- **Lazy Loading**: Progressive loading of non-critical interface elements
- **Caching Strategy**: Intelligent caching for frequently accessed data

## 13. Testing & Validation

### 13.1 UI/UX Testing
- **Reveal Logic Testing**: Verify proper information gating at each status
- **Animation Performance**: Smooth transitions across devices
- **Accessibility Compliance**: Screen reader and keyboard navigation testing

### 13.2 Security Testing
- **Information Leakage**: Ensure no premature data exposure
- **Avatar Upload Security**: File type and size validation
- **Privacy Controls**: Verify blur and reveal mechanisms

## 14. Reference Files
1. Screenshot 2025-11-06 at 2.31.30 PM.png - Invitation link display issue
2. Screenshot 2025-11-06 at 5.50.27 PM.png - Order interface example
3. Screenshot 2025-11-06 at 6.26.36 PM.png - Runner order view
4. Screenshot 2025-11-06 at 6.38.42 PM.png - Error handling display
5. Screenshot 2025-11-06 at 6.39.26 PM.png - Console error logs
6. Screenshot 2025-11-06 at 6.39.32 PM.png - Deprecated feature warnings
7. menu 1.png - Navigation menu design reference