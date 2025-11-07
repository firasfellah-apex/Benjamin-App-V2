# Benjamin Cash Delivery Service - Project Overview

## Application Description

Benjamin is a comprehensive cash delivery service platform that enables secure, real-time cash delivery with role-based access control. The system supports three user roles: Customers, Runners, and Admins, each with dedicated interfaces and functionalities.

## Key Features

### Customer Features
- **Cash Request**: Request cash delivery from $100 to $1,000 (in $20 increments)
- **Real-time Tracking**: Track order status from pending to completion
- **OTP Verification**: Secure delivery verification with 6-digit OTP codes
- **Order History**: View all past and current orders
- **Fee Transparency**: Clear breakdown of all fees (platform, compliance, delivery)

### Runner Features
- **Order Acceptance**: View and accept available delivery orders
- **Status Updates**: Update delivery progress through multiple stages
- **Earnings Tracking**: Monitor monthly earnings and completed deliveries
- **Secure Handoff**: Complete deliveries using OTP verification
- **Invitation-Only Access**: Join through admin invitations

### Admin Features
- **Dashboard**: Comprehensive overview of orders, users, and revenue
- **User Management**: Manage user accounts, roles, and permissions
- **Invitation System**: Send invitations to new admins and runners
- **Order Monitoring**: Real-time monitoring of all orders
- **Analytics**: View statistics and performance metrics

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime subscriptions
- **State Management**: React Context + Hooks
- **Form Handling**: React Hook Form + Zod
- **Notifications**: Sonner (toast notifications)

## Database Schema

### Tables

1. **profiles**: User profile information with role-based access
   - Supports multiple roles per user (customer, runner, admin)
   - Tracks KYC status, daily limits, and monthly earnings
   - First registered user automatically becomes admin

2. **invitations**: Invitation system for runners and admins
   - Token-based with 7-day expiration
   - Tracks invitation status and usage

3. **orders**: Cash delivery orders
   - Complete order lifecycle tracking
   - OTP verification for secure handoff
   - Fee calculation and breakdown

4. **audit_logs**: Complete audit trail for compliance
   - Tracks all system operations
   - Stores old and new values for changes

## Security Features

- **Row Level Security (RLS)**: Enabled on all tables
- **Role-Based Access Control**: Granular permissions based on user roles
- **OTP Verification**: 6-digit codes with 10-minute expiration and 3-attempt limit
- **Audit Trail**: Complete logging of all operations
- **Invitation Tokens**: Secure, single-use tokens for onboarding

## Fee Calculation

- **Profit**: max($3.50, 2% of requested amount)
- **Compliance Fee**: (1.01% of requested amount) + $1.90
- **Delivery Fee**: Fixed $8.16
- **Total Service Fee**: Sum of all fees
- **Customer Payment**: Requested amount + Total service fee

## User Roles and Permissions

### Customer (Default Role)
- Free registration via Google OAuth
- Can request cash deliveries
- View and track own orders
- Daily limit: $1,000 (configurable)

### Runner (Invitation-Only)
- Invited by admins
- Accept and complete delivery orders
- Update order status
- Track earnings

### Admin (First User + Invitations)
- Full access to all features
- Manage users and roles
- Send invitations
- Monitor all orders
- View analytics and audit logs

## Real-time Features

The application uses Supabase Realtime for:
- Order status updates
- New order notifications for runners
- Live dashboard updates for admins

## Environment Variables

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_LOGIN_TYPE=gmail
VITE_APP_ID=app-7dlmcs8ryyv5
VITE_SHOW_POLICY=false
VITE_PRIVACY_POLICY_URL=
VITE_USER_POLICY_URL=
VITE_POLICY_PREFIX=
```

## Getting Started

1. **First User Setup**:
   - Register using Google OAuth
   - First user automatically becomes admin
   - Admin can then invite other admins and runners

2. **Inviting Runners**:
   - Admin navigates to Invitations page
   - Sends invitation email with role assignment
   - Invitee registers and gets assigned runner role

3. **Creating Orders**:
   - Customer selects cash amount
   - Provides delivery address
   - Order enters pending state

4. **Completing Deliveries**:
   - Runner accepts order
   - Updates status at each stage
   - Generates OTP after cash withdrawal
   - Verifies OTP with customer to complete

## Design Philosophy

The application follows a sleek, modern design inspired by Uber's aesthetic:
- **Color Scheme**: Black and white primary colors with blue accents
- **Typography**: Clean, hierarchical font system
- **Layout**: 8pt grid system with consistent spacing
- **Interactions**: Real-time feedback with loading states and toast notifications

## Future Enhancements

The architecture is designed to support:
- Plaid KYC integration for identity verification
- Marqeta JIT card funding for runners
- Coastal Community Bank RTP for real-time payments
- Google Maps integration for route planning
- Geofencing for location-based order dispatch
- Machine learning for delivery time prediction
