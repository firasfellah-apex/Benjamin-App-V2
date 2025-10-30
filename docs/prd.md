# Benjamin Cash Delivery Service Requirements Document

## 1. Application Overview

### 1.1 Application Name
Benjamin Cash Delivery Service

### 1.2 Application Description
Benjamin is a dual-interface cash delivery service platform that provides users with secure, real-time cash delivery services. The system includes a customer app, runner app, and admin dashboard, utilizing real-time communication technology to ensure instant synchronization of order status and secure cash handoff processes.

### 1.3 Core Value
- Provide convenient cash delivery services\n- Ensure transaction security and regulatory compliance
- Enable real-time order tracking and status updates\n- Establish complete operational audit chain
- Maintain controlled access through invitation-based role management

## 2. Functional Architecture

### 2.1 Customer App Features
- **Cash Request**: Users can request $100-$1000 cash delivery (in $20 increments)
- **Fee Calculation**: Real-time display of service fee breakdown (platform compliance fee, runner compensation)
- **Order Tracking**: Real-time tracking of delivery status (Pending → Runner Accepted → Runner at ATM → Cash Withdrawal → Handoff Verification)
- **Security Verification**: OTP verification code ensures secure delivery
- **Order Management**: View order history and current order status
- **Free Registration**: Customers can sign up freely using Google OAuth

### 2.2 Runner App Features
- **Order Reception**: Receive nearby delivery orders (geographic location filtering)
- **Status Updates**: Update delivery progress (Arrived at ATM, Cash Withdrawn, Ready for Handoff)
- **Secure Delivery**: Complete cash delivery through OTP verification
- **Earnings Tracking**: View monthly earnings statistics
- **Invitation-Only Access**: Runners can only join through admin invitations

### 2.3 Admin Dashboard Features\n- **User Management**: Manage customer and runner accounts, support multi-admin role assignment
- **Invitation System**: Send invitations to new admins and runners via email
- **Order Monitoring**: Real-time monitoring of all order statuses and detailed information
- **Audit Logs**: View complete operational audit chain and system logs
- **Data Analytics**: Order statistics, user activity, revenue analysis
- **Role Management**: Assign and revoke admin/runner roles with proper authorization

## 3. User Access Control & Invitation System
\n### 3.1 Registration Types
- **Customers**: Free registration via Google OAuth - no invitation required
- **Runners**: Invitation-only access through admin dashboard
- **Admins**: Invitation-only access through existing admin accounts

### 3.2 Invitation Architecture
- **Invitation Model**: Store pending invitations with expiration dates and role assignments
- **Email Integration**: Send invitation emails with secure registration links
- **Role Verification**: Validate invitation tokens during registration process
- **Multi-Admin Support**: First admin can invite additional admins to prevent lockouts

### 3.3 Admin Invitation Flow
1. Existing admin enters new admin's email address
2. System generates secure invitation token with 7-day expiration
3. Invitation email sent with registration link
4. Invitee clicks link and completes Google OAuth registration
5. System assigns admin role and activates account
6. Original admin receives confirmation notification

### 3.4 Runner Invitation Flow\n1. Admin enters runner candidate's email and basic information
2. System creates invitation record with runner role designation
3. Invitation email sent with onboarding instructions
4. Invitee completes registration and KYC verification
5. Admin approves runner account activation
6. Runner gains access to runner app interface

## 4. Technical Architecture

### 4.1 Technology Stack
- **Frontend**: React Native (cross-platform mobile apps)
- **Backend**: Node.js + Express.js
- **Database**: MongoDB
- **Real-time Communication**: Socket.io\n- **Authentication**: Google OAuth + JWT
- **Email Service**: SMTP integration for invitation emails
- **Payment Integration**: Reserved interfaces for Plaid KYC, Marqeta cards, Coastal Community Bank RTP

### 4.2 Core Features
- **Real-time Sync**: Real-time updates of all order statuses via WebSocket
- **Security Compliance**: Progressive information disclosure, controlling sensitive information access based on order status
- **Audit Trail**: Record every operational step to ensure complete regulatory chain
- **Environment Configuration**: Control MVP and production environment behavior through environment variables
- **Invitation Management**: Secure token-based invitation system with role validation

### 4.3 Enhanced Data Models

#### User Collection (Updated)
```javascript
{
  _id: 'mongo_object_id',
  email: 'user@gmail.com',
  googleId: 'google_oauth_id_string',
  role: ['Customer'], // Array: ['Customer'], ['Runner'], ['Admin'], or ['Admin', 'Runner']\n  
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    phone: '+15551234567',
    avatarUrl: 'https://.../image.png'
  },

  accountStatus: {
    isActive: true,
    isSuspended: false,
    kycStatus: 'Pending', // ['Pending', 'Approved', 'Failed']
    invitedBy: 'admin_user_id', // null for customers, admin_id for runners/admins
    invitationAcceptedAt: '2025-11-06T09:00:00Z'
  },

  customerDetails: {
    dailyLimit: 1000.00,
    dailyUsage: 0.00,
    dailyLimitLastReset: '2025-11-06T00:00:00Z'
  },
  
  runnerDetails: {
    monthlyEarnings: 0.00,
    approvedBy: 'admin_user_id'
  },

  createdAt: '2025-11-06T09:00:00Z'
}
```
\n#### Invitation Collection (New)\n```javascript
{
  _id: 'mongo_object_id',
  email: 'invitee@gmail.com',\n  invitedBy: 'admin_user_id',
  roleToAssign: 'Runner', // 'Admin' or 'Runner'
  \n  invitation: {
    token: 'secure_random_token',
    expiresAt: '2025-11-13T09:00:00Z', // 7 days from creation
    isUsed: false,
    usedAt: null
  },
  
  metadata: {
    inviteeFirstName: 'Jane', // Optional, for personalized emails
    inviteeLastName: 'Smith',
    notes: 'Experienced delivery driver' // Admin notes
  },
  
  status: 'Pending', // ['Pending', 'Accepted', 'Expired', 'Revoked']
  createdAt: '2025-11-06T09:00:00Z'
}
```
\n## 5. Business Process\n
### 5.1 Order Creation Process
1. Customer selects cash amount ($100-$1000)
2. System calculates service fees (profit + compliance fee + delivery fee)
3. Display fee breakdown and confirm order
4. Process payment (simulated in MVP, real payment in production)
5. Order enters pending acceptance status
\n### 5.2 Delivery Execution Process
1. System broadcasts new order to runners (MVP: broadcast to all, production: geo-targeted)
2. Runner accepts job, order status updates to 'Runner Accepted'
3. Runner heads to ATM, updates status to 'Runner at ATM'
4. Runner arrives at ATM, status updates to 'Runner at ATM' (customer cancellation disabled)
5. After cash withdrawal, OTP verification code generated, status updates to 'Pending Handoff'
6. Runner meets customer, completes delivery through OTP verification

### 5.3 Security Verification Mechanism
- **Progressive Information Disclosure**: Gradually reveal sensitive information based on order status
- **OTP Verification**: 6-digit verification code, 10-minute validity, maximum 3 attempts
- **Operation Logs**: Every critical operation recorded in audit logs
- **Multi-factor Authentication**: Google OAuth + JWT token verification
- **Role-Based Access Control**: Invitation tokens validate role assignments during registration

## 6. Fee Calculation Rules

### 6.1 Pricing Formula
- **Profit**: max(3.50, 0.02 × requested amount)
- **Compliance Fee**: (0.0101 × requested amount) + 1.90
- **Delivery Fee**: Fixed $8.16
- **Total Service Fee**: Profit + Compliance Fee + Delivery Fee
- **Customer Total Payment**: Requested Amount + Total Service Fee
\n### 6.2 Limit Management
- **Single Transaction Limit**: $100-$1000
- **Daily Limit**: $1000 (configurable)
- **Increment Unit**: $20
\n## 7. Security & Compliance

### 7.1 Data Security
- **Sensitive Information Encryption**: Addresses, names and other sensitive information controlled based on order status
- **OTP Security**: Stored using bcrypt hash, with expiration time and attempt limit
- **API Security**: All endpoints require JWT authentication, implement rate limiting
- **Invitation Security**: Secure token generation with expiration and single-use validation

### 7.2 Compliance Preparation
- **KYC Integration**: Reserved Plaid identity verification interface
- **Payment Compliance**: Reserved Coastal Community Bank RTP payment interface
- **Card Management**: Reserved Marqeta JIT card funding interface
- **Audit Logs**: Complete recording of all operations to meet regulatory requirements
- **Access Control Audit**: Log all invitation activities and role assignments
\n## 8. API Endpoints (Enhanced)

### 8.1 Invitation Management APIs
- **POST /api/invitations/send-admin**: Send admin invitation (admin only)
- **POST /api/invitations/send-runner**: Send runner invitation (admin only)
- **GET /api/invitations/pending**: List pending invitations (admin only)
- **POST /api/invitations/revoke**: Revoke pending invitation (admin only)
- **POST /api/auth/register-with-invitation**: Complete registration using invitation token
- **GET /api/invitations/validate-token**: Validate invitation token before registration

### 8.2 Enhanced User Management APIs
- **POST /api/users/assign-role**: Assign additional roles (admin only)
- **POST /api/users/revoke-role**: Revoke user roles (admin only, with safeguards)
- **GET /api/users/by-role**: List users by role (admin only)
- **POST /api/users/approve-runner**: Approve runner account after KYC (admin only)
\n## 9. User Interface Design

### 9.1 Design Style
- **Design Philosophy**: Inspired by Uber's sleek black aesthetic, creating secure, efficient, and discreet user experience
- **Color Scheme**: Black and white as primary colors, blue for interactive elements, green for success, red for errors
- **Typography System**: Inter font with clear font hierarchy (Display, Heading, Body, Label)
- **Layout Principles**: 8pt grid system, 24px horizontal margins, utilizing whitespace for hierarchy
- **Interactive Feedback**: Real-time loading animations, toast notifications, status badges for instant feedback

### 9.2 Key Interfaces
- **Cash Request Interface**: Large amount display, slider selection, fee breakdown, confirmation button
- **Order Tracking Interface**: Map background, bottom sheet card, status progress bar, OTP display
- **Runner Work Interface**: Job list, accept button, status updates, OTP input
- **Admin Dashboard**: Tab navigation, real-time data tables, user role management, invitation management panel
- **Invitation Interface**: Email input forms, role selection, invitation status tracking, bulk invitation options

## 10. Real-time Communication Architecture

### 10.1 Socket.io Room Design
- **admin_room**: All administrators
- **runner_room**: All runners (for order broadcasting)
- **order_[orderId]**: Customer, runner, and admins for specific orders
- **invitation_room**: Real-time invitation status updates for admins

### 10.2 Event Flow
- **Connection Authentication**: Use JWT token for Socket connection authentication
- **Room Joining**: Automatically join appropriate rooms based on user role
- **Status Broadcasting**: Broadcast updates to relevant rooms when order status changes
- **Real-time Logs**: Admins receive system operation logs in real-time
- **Invitation Updates**: Real-time notifications for invitation acceptance/expiration

## 11. Environment Configuration & Deployment
\n### 11.1 Environment Variable Configuration
- **APP_ENVIRONMENT**: Controls development/production environment behavior
- **WEBSOCKET_DISPATCH_MODE**: Controls order dispatch mode (broadcast all/geo-targeted)
- **BYPASS_***: Controls third-party service integration switches (KYC, payment, cards)
- **ENABLE_MULTI_ADMIN**: Enable multi-admin support\n- **LOG_LEVEL**: Controls log detail level
- **INVITATION_EXPIRY_DAYS**: Days before invitation expires (default: 7)\n- **SMTP_CONFIG**: Email service configuration for invitations

### 11.2 MVP Strategy
- **Mock Integrations**: MVP phase simulates all third-party services for rapid core process validation
- **Feature Flags**: Control feature switches through environment variables for progressive rollout
- **Scalability Preparation**: Architecture designed to seamlessly switch to production environment real integrations
- **Email Integration**: Use SMTP service for invitation emails in MVP, prepare for advanced email services in production
\n## 12. Quality Assurance\n
### 12.1 Testing Strategy
- **Unit Testing**: Use Jest to test core business logic (pricing, OTP verification, invitation validation)
- **End-to-End Testing**: Use Cypress to test complete user flows including invitation processes
- **Real-time Communication Testing**: Verify correct triggering and handling of Socket.io events
- **Security Testing**: Validate invitation token security and role-based access controls

### 12.2 Performance Optimization
- **Database Indexing**: Create indexes on key fields (_id, status, createdAt, invitation tokens)
- **Redis Adapter**: Use Redis as Socket.io adapter in production for improved performance
- **Atomic Operations**: Use MongoDB transactions to ensure atomicity of status updates
- **Email Queue**: Implement email queue system for reliable invitation delivery
\n## 13. Expansion Planning

### 13.1 Production Environment Integration
- **Plaid KYC**: User identity verification and risk assessment\n- **Marqeta JIT**: Runner virtual card instant funding
- **Coastal Community Bank**: RTP real-time payments and MT compliance
- **Google Maps**: Real-time mapping and route planning
- **Advanced Email Services**: SendGrid or AWS SES for scalable email delivery

### 13.2 Feature Enhancement
- **Geofencing**: Location-based intelligent order dispatch
- **Machine Learning**: Delivery time prediction and risk assessment
- **Multi-language Support**: Internationalization expansion
- **Advanced Analytics**: Business intelligence and data insights
- **Bulk Invitation Management**: CSV upload for mass runner recruitment
- **Invitation Analytics**: Track invitation conversion rates and optimize recruitment

## Reference Files
1. Technical Specification: Benjamin (Cash Delivery Service): Comprehensive Technical Pack & Implementation Guide (v3)