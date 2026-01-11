/*
# Benjamin Cash Delivery Service - Initial Database Schema

## 1. New Tables

### profiles
User profile information with role-based access control
- `id` (uuid, primary key, references auth.users)
- `email` (text, unique)
- `google_id` (text, unique)
- `role` (user_role[], array of roles: customer, runner, admin)
- `first_name` (text)
- `last_name` (text)
- `phone` (text)
- `avatar_url` (text)
- `is_active` (boolean, default: true)
- `is_suspended` (boolean, default: false)
- `kyc_status` (text, default: 'Pending')
- `invited_by` (uuid, references profiles.id)
- `invitation_accepted_at` (timestamptz)
- `daily_limit` (numeric, default: 1000.00)
- `daily_usage` (numeric, default: 0.00)
- `daily_limit_last_reset` (timestamptz, default: now())
- `monthly_earnings` (numeric, default: 0.00)
- `approved_by` (uuid, references profiles.id)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

### invitations
Invitation system for runners and admins
- `id` (uuid, primary key)
- `email` (text, not null)
- `invited_by` (uuid, references profiles.id, not null)
- `role_to_assign` (text, not null, check: 'runner' or 'admin')
- `token` (text, unique, not null)
- `expires_at` (timestamptz, not null)
- `is_used` (boolean, default: false)
- `used_at` (timestamptz)
- `invitee_first_name` (text)
- `invitee_last_name` (text)
- `notes` (text)
- `status` (invitation_status, default: 'Pending')
- `created_at` (timestamptz, default: now())

### orders
Cash delivery orders
- `id` (uuid, primary key)
- `customer_id` (uuid, references profiles.id, not null)
- `runner_id` (uuid, references profiles.id)
- `requested_amount` (numeric, not null, check: >= 100 and <= 1000)
- `profit` (numeric, not null)
- `compliance_fee` (numeric, not null)
- `delivery_fee` (numeric, not null, default: 8.16)
- `total_service_fee` (numeric, not null)
- `total_payment` (numeric, not null)
- `status` (order_status, default: 'Pending', not null)
- `otp_code` (text)
- `otp_hash` (text)
- `otp_expires_at` (timestamptz)
- `otp_attempts` (integer, default: 0)
- `customer_address` (text)
- `customer_name` (text)
- `runner_accepted_at` (timestamptz)
- `runner_at_atm_at` (timestamptz)
- `cash_withdrawn_at` (timestamptz)
- `handoff_completed_at` (timestamptz)
- `cancelled_at` (timestamptz)
- `cancellation_reason` (text)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

### audit_logs
Complete audit trail for compliance
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles.id)
- `action` (text, not null)
- `entity_type` (text, not null)
- `entity_id` (uuid)
- `old_values` (jsonb)
- `new_values` (jsonb)
- `ip_address` (text)
- `user_agent` (text)
- `created_at` (timestamptz, default: now())

## 2. Security

- Enable RLS on all tables
- Admins have full access to all tables
- Customers can view/create their own orders and view/update their own profile
- Runners can view available orders and update assigned orders
- First registered user becomes admin automatically

## 3. Triggers

- Auto-update updated_at timestamp on profiles and orders
- Create first user as admin
*/

-- Create user role enum
CREATE TYPE user_role AS ENUM ('customer', 'runner', 'admin');

-- Create order status enum
CREATE TYPE order_status AS ENUM ('Pending', 'Runner Accepted', 'Runner at ATM', 'Cash Withdrawn', 'Pending Handoff', 'Completed', 'Cancelled');

-- Create invitation status enum
CREATE TYPE invitation_status AS ENUM ('Pending', 'Accepted', 'Expired', 'Revoked');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  google_id text UNIQUE,
  role user_role[] DEFAULT ARRAY['customer'::user_role] NOT NULL,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  is_active boolean DEFAULT true,
  is_suspended boolean DEFAULT false,
  kyc_status text DEFAULT 'Pending',
  invited_by uuid REFERENCES profiles(id),
  invitation_accepted_at timestamptz,
  daily_limit numeric DEFAULT 1000.00,
  daily_usage numeric DEFAULT 0.00,
  daily_limit_last_reset timestamptz DEFAULT now(),
  monthly_earnings numeric DEFAULT 0.00,
  approved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid REFERENCES profiles(id) NOT NULL,
  role_to_assign text NOT NULL CHECK (role_to_assign IN ('runner', 'admin')),
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT false,
  used_at timestamptz,
  invitee_first_name text,
  invitee_last_name text,
  notes text,
  status invitation_status DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) NOT NULL,
  runner_id uuid REFERENCES profiles(id),
  requested_amount numeric NOT NULL CHECK (requested_amount >= 100 AND requested_amount <= 1000),
  profit numeric NOT NULL,
  compliance_fee numeric NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 8.16,
  total_service_fee numeric NOT NULL,
  total_payment numeric NOT NULL,
  status order_status DEFAULT 'Pending' NOT NULL,
  otp_code text,
  otp_hash text,
  otp_expires_at timestamptz,
  otp_attempts integer DEFAULT 0,
  customer_address text,
  customer_name text,
  runner_accepted_at timestamptz,
  runner_at_atm_at timestamptz,
  cash_withdrawn_at timestamptz,
  handoff_completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles USING GIN(role);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_runner_id ON orders(runner_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(uid uuid, check_role user_role)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND check_role = ANY(p.role)
  );
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT has_role(uid, 'admin'::user_role);
$$;

-- Trigger function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    SELECT COUNT(*) INTO user_count FROM profiles;
    INSERT INTO profiles (id, phone, email, role)
    VALUES (
      NEW.id,
      NEW.phone,
      NEW.email,
      CASE WHEN user_count = 0 THEN ARRAY['admin'::user_role] ELSE ARRAY['customer'::user_role] END
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS Policies for profiles
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies for invitations
CREATE POLICY "Admins can manage invitations" ON invitations
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- RLS Policies for orders
CREATE POLICY "Admins have full access to orders" ON orders
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT TO authenticated USING (customer_id = auth.uid());

CREATE POLICY "Customers can create orders" ON orders
  FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Runners can view available and assigned orders" ON orders
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'runner'::user_role) AND 
    (status = 'Pending' OR runner_id = auth.uid())
  );

CREATE POLICY "Runners can update assigned orders" ON orders
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'runner'::user_role) AND runner_id = auth.uid()
  );

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);
