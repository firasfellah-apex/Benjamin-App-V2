Benjamin App Blueprint

🧭 Project Overview
Benjamin is a secure, on-demand cash delivery platform that connects customers who need cash with verified runners who can withdraw and deliver it safely. The application consists of three integrated interfaces within a single Vite + React + TypeScript + Supabase project:

* Customer App: Light-themed interface for requesting cash deliveries

* Runner App: Dark-themed interface for fulfilling delivery requests

* Admin Dashboard: Management interface for oversight and operations

Core Technologies

* Frontend: React 18, TypeScript, Vite, Tailwind CSS

* Backend: Supabase (PostgreSQL + Auth + Realtime)

* Authentication: Google OAuth via Supabase Auth

* Real-time: Supabase Realtime channels for live order updates

* State Management: React hooks + TanStack Query (planned)

* Routing: React Router v6

* Icons: Lucide React

Architecture Flow

```
User Login (Google OAuth) → Supabase Auth → Role Detection → Layout Routing → Themed UI Components → Real-time Updates
```

🧱 Folder & File Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── PageContainer.tsx          # Theme-aware page wrapper
│   │   ├── CustomerLayout.tsx         # Customer app layout + bottom nav
│   │   ├── RunnerLayout.tsx          # Runner app dark theme layout
│   │   ├── AdminLayout.tsx           # Admin dashboard layout
│   │   └── CustomerBottomNav.tsx     # Single "Request Cash" CTA
│   ├── order/
│   │   ├── OrderProgressTimeline.tsx  # Status visualization component
│   │   ├── CustomerMap.tsx           # Gated location tracking
│   │   └── RunnerMap.tsx            # Runner navigation interface
│   ├── ui/
│   │   ├── ShellCard.tsx            # Theme-aware card container
│   │   ├── StatusChip.tsx           # Consistent status badges
│   │   └── InfoTooltip.tsx          # Contextual help tooltips
│   └── auth/
│       ├── RequireAuth.tsx          # General auth guard
│       └── RequireAdminAuth.tsx     # Admin-specific auth guard
├── pages/
│   ├── customer/
│   │   ├── CustomerHome.tsx         # Dashboard (default landing)
│   │   ├── RequestCash.tsx          # 2-step cash request flow
│   │   ├── OrderTracking.tsx        # Real-time delivery tracking
│   │   └── MyOrders.tsx            # Order history
│   ├── runner/
│   │   ├── AvailableJobs.tsx       # Job marketplace
│   │   ├── ActiveJob.tsx           # Current delivery management
│   │   └── RunnerDashboard.tsx     # Earnings & stats
│   └── admin/
│       ├── Dashboard.tsx           # Admin overview
│       ├── OrderManagement.tsx     # Order oversight
│       └── UserManagement.tsx      # Role assignments
├── lib/
│   ├── customerStatus.ts           # Customer-facing status mapping
│   ├── reveal.ts                   # Progressive disclosure rules
│   └── supabase.ts                # Database client
└── routes.tsx                      # Application routing configuration
```

💳 Customer App
User Journey

1. Landing → Google OAuth login

2. Dashboard → Summary of deliveries + active orders

3. Request Cash → 2-step flow (address → amount)

4. Track Delivery → Real-time status with progressive runner reveal

5. History → Past delivery records

Main Screens
/customer/home (Dashboard - Default Landing)

* Your Summary: Total delivered amount, completed delivery count

* Active Delivery: Current order status with tracking button

* Recent Deliveries: Last 3 orders with status chips

* Invite a Friend: Referral program placeholder

* Navigation: "View All Orders" → /customer/orders

/customer/request (2-Step Request Flow)
Step 1: Delivery Location

* Saved address selection (Home, Office, etc.)

* Add new address modal with validation

* Delivery notes per location

* Address confirmation before proceeding

Step 2: Amount & Summary

* Cash amount slider ($100-$1000, $20 increments)

* Transparent fee breakdown (always visible)

* Daily limit tracking with info tooltip

* Final "Request Cash Delivery" CTA

/customer/orders (History)

* Complete order list with filters

* Status chips and timestamps

* Clickable rows → order details

/customer/tracking/:id (Real-time Tracking)

* Map-first layout (70% screen height)

* Bottom sheet with collapsible timeline

* Progressive runner reveal based on status

* Contact options (gated by cash collection status)

CustomerBottomNav Behavior

* Single full-width "Request Cash" button

* Fixed at bottom on all customer routes

* Routes to /customer/request

* No tabs or additional navigation items

Design Principles

* Light theme: White cards on #F5F5F7 background

* Black accent: Primary CTAs and active states

* Rounded corners: 24px radius (rounded-3xl)

* Minimal shadows: Subtle depth without heaviness

* Progressive disclosure: Information revealed based on delivery status

🚗 Runner App
Theme & Layout

* Dark theme: #020817 background with #0B1020 cards

* Indigo accents: #6366F1 for active states

* Professional feel: Purpose-built tool aesthetic

Main Routes
/runner/home (Dashboard)

* Today's earnings summary

* Active job status

* Performance metrics

/runner/available (Job Marketplace)

* Real-time job list via Supabase channels

* Masked customer addresses ("Near Main St, Miami")

* Payout and estimated distance

* "Accept Job" CTAs

/runner/delivery/:id (Active Delivery Flow)
Chain of Custody Progression:

1. Accepted → "Head to ATM" button

2. At ATM → "Cash Withdrawn" button

3. Cash Picked → Full customer address revealed

4. En Route → Navigation to customer

5. Delivered → OTP verification interface

Key Behaviors

* Location privacy: Runner location only visible to customer after cash collection

* Progressive reveal: Customer details unlocked at appropriate status transitions

* Real-time sync: All status changes broadcast via Supabase channels

Components Used

* RunnerLayout (dark theme wrapper)

* StatusChip tone="runner" (dark-themed status badges)

* OrderProgressTimeline variant="internal" (detailed status chain)

🧑‍💼 Admin Dashboard
Access Control

* Role-gated: RequireAdminAuth component

* Whitelist logic:

  * firasfellah@gmail.com (explicit admin)

  * Any email containing "mock" (development/testing)

Main Routes
/admin/dashboard

* System overview and metrics

* Active delivery monitoring

* Real-time order status board

/admin/orders

* Complete order management

* Status override capabilities

* Audit trail viewing

/admin/users

* Role assignment interface

* Multi-admin support (prevents lockouts)

* User activity monitoring

/admin/invitations

* Invite system for runners and additional admins

* Role-based invitation management

Capabilities

* Full visibility: All order data unmasked

* Status management: Can intervene in delivery flow

* User administration: Assign roles, manage access

* Audit oversight: Complete chain of custody logs

🔐 Authentication & Roles
OAuth Flow

1. Google OAuth via Supabase Auth

2. Auto-role assignment on first login (default: customer)

3. Role-based routing to appropriate interface

Auth Guards

* RequireAuth: General authentication check

* RequireAdminAuth: Admin-specific with whitelist validation

Redirection Logic

```typescript
// After successful authentication:
if (user.role.includes('admin')) → '/admin/dashboard'
if (user.role.includes('runner')) → '/runner/available'  
else → '/customer/home' // Default customer experience
```

⚙️ Database & Realtime
Supabase Schema Summary
users (profiles)

```sql
- id: uuid (primary key)
- email: text
- role: text[] (array for multi-roles)
- first_name: text
- last_name: text
- avatar_url: text
- created_at: timestamptz
```

orders

```sql
- id: uuid (primary key)
- customer_id: uuid (foreign key)
- runner_id: uuid (foreign key, nullable)
- status: order_status enum
- amount: decimal
- address_id: uuid (foreign key)
- address_snapshot: jsonb
- delivery_notes: text
- created_at: timestamptz
- updated_at: timestamptz
```

customer_addresses

```sql
- id: uuid (primary key)
- customer_id: uuid (foreign key)
- label: text (Home, Office, etc.)
- line1: text
- line2: text (optional)
- city: text
- state: text
- postal_code: text
- delivery_notes: text
- is_default: boolean
```

Realtime Configuration

* Publication: supabase_realtime includes orders table

* Replica Identity: FULL for complete change events

* Channels: Order-specific rooms for targeted updates

* RLS Policies: Role-based data access control

Status Flow

```
Pending → Runner Accepted → Runner at ATM → Cash Withdrawn → Pending Handoff → Completed
```

🎨 Design System
PageContainer
Theme-aware wrapper component:

```typescript
variant: 'customer' | 'runner'
// Customer: light background, standard padding
// Runner: dark background, runner-specific styling
```

ShellCard
Reusable card container:

```typescript
variant: 'customer' | 'runner'
// Customer: white bg, subtle border, rounded-3xl
// Runner: dark bg, indigo accents, same radius
```

StatusChip
Consistent status visualization:

```typescript
status: OrderStatus
tone: 'customer' | 'runner'
// Maps internal statuses to user-friendly labels
// Theme-appropriate colors and styling
```

Color System
Customer (Light Theme)

* Background: #F5F5F7

* Cards: #FFFFFF

* Primary: #000000

* Muted: #6B7280

* Success: #16A34A

* Warning: #F97316

Runner (Dark Theme)

* Background: #020817

* Cards: #0B1020

* Primary: #6366F1

* Text: #F9FAFB

* Muted: #9CA3AF

* Success: #22C55E

Typography

* Font: Inter (Google Fonts)

* Hierarchy: Display (48px) → Heading (28px/20px) → Body (16px/14px)

* Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

🔄 Status Flows
Customer-Facing Statuses (Simplified)

* Request received (Pending)

* Runner assigned (Runner Accepted)

* Preparing your cash (Runner at ATM)

* On the way (Cash Withdrawn/En Route)

* Arrived (Pending Handoff)

* Completed (Completed)

Internal Statuses (Granular Chain of Custody)

* Pending → Awaiting runner acceptance

* Runner Accepted → Runner committed to job

* Runner at ATM → Cancellation disabled, runner at withdrawal location

* Cash Withdrawn → Cash secured, customer details revealed

* Pending Handoff → Runner en route, OTP generated

* Completed → Delivery verified and closed

Progressive Disclosure Rules

```typescript
// From lib/reveal.ts
canRevealRunnerIdentity(status) // True after "Runner Accepted"
shouldBlurRunnerAvatar(status)  // True until "Cash Withdrawn"  
canShowLiveLocation(status)     // True from "Cash Withdrawn" onward
canContactRunner(status)        // True from "Cash Withdrawn" onward
```

📦 Build & Deployment
Local Development

```bash
# Install dependencies
npm install

# Start development server  
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

Required environment variables (create a `.env` file in the project root):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ENV=development
```

**Where to find these values:**
- Go to your Supabase project dashboard
- Navigate to **Settings** → **API**
- Copy the **Project URL** → `VITE_SUPABASE_URL`
- Copy the **anon/public** key → `VITE_SUPABASE_ANON_KEY`

**Note:** The app will validate these at startup and show clear errors in dev mode if they're missing.
```

Deployment Targets

* Vercel: Zero-config deployment with automatic builds

* Netlify: Static site hosting with serverless functions

* Railway: Full-stack deployment with database

* Any static host: Builds to standard HTML/CSS/JS

Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react(), svgr()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
})
```

🧩 What's Next / Future Enhancements
Planned Integrations

* Plaid: KYC verification and identity validation

* Marqeta: JIT card funding for runner cash withdrawals

* Coastal Community Bank: RTP payments and compliance

* Google Maps: Live location tracking and routing

Feature Roadmap

* In-app messaging: Customer-runner communication (post-cash collection only)

* Smart pricing: Distance-based fees between runner ↔ ATM ↔ destination

* Saved preferences: Default addresses, delivery instructions, payment methods

* Referral program: Customer rewards for successful friend invitations

* Advanced analytics: Admin dashboard with delivery metrics and insights

* Multi-language: Spanish support for Miami market expansion

Technical Improvements

* Finite State Machine: Formal status transition validation

* Idempotency: Prevent duplicate actions from network issues

* Offline support: Basic functionality during connectivity loss

* Push notifications: Background delivery updates via FCM/APNs

* Performance: Code splitting and lazy loading optimization

📘 Summary
Benjamin is an on-demand cash delivery platform built on the philosophy of "Cash, delivered securely." The application prioritizes safety through progressive information disclosure, maintains trust through transparent pricing and real-time tracking, and ensures reliability through a robust chain of custody system.
Currently at MVP maturity level, Benjamin successfully demonstrates the complete delivery workflow from customer request to runner fulfillment, with all core safety and operational features functional. The architecture is designed for scalability, with feature flags and modular components ready for production integrations.
The platform serves the Miami market's need for convenient cash access while maintaining the security standards required for financial services. Its three-interface design (Customer, Runner, Admin) provides appropriate tools for each user type while maintaining a unified brand experience and operational oversight.
Core Value Proposition: Skip the ATM. Get cash delivered to your door by verified runners, with full transparency, real-time tracking, and progressive safety measures that protect all parties throughout the delivery process.
