-- Create refund_jobs table for refund processing audit and idempotency
-- This table tracks all refund attempts and prevents double-refunding

CREATE TABLE IF NOT EXISTS public.refund_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE, -- Idempotency: one refund job per order
  customer_id uuid NOT NULL REFERENCES profiles(id),
  amount_cents integer NOT NULL, -- Refund amount in cents (from orders.total_payment)
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'succeeded', 'failed')),
  destination_bank_account_id uuid NOT NULL REFERENCES bank_accounts(id),
  fallback_reason text, -- NULL if using pinned bank, 'PINNED_UNAVAILABLE' if using primary fallback
  provider text, -- 'stripe', 'plaid_transfer', 'dwolla', etc.
  provider_ref text, -- External provider transaction ID/reference
  error text, -- Error message if status = 'failed'
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refund_jobs_order_id ON public.refund_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_jobs_customer_id ON public.refund_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_refund_jobs_status ON public.refund_jobs(status);
CREATE INDEX IF NOT EXISTS idx_refund_jobs_created_at ON public.refund_jobs(created_at DESC);

-- Add comment
COMMENT ON TABLE public.refund_jobs IS 
  'Tracks refund processing jobs. Ensures idempotency (one refund per order) and provides audit trail for money movements.';

COMMENT ON COLUMN public.refund_jobs.order_id IS 
  'Unique constraint ensures only one refund job per order (idempotency key)';

COMMENT ON COLUMN public.refund_jobs.amount_cents IS 
  'Refund amount in cents. Should match orders.total_payment * 100';

COMMENT ON COLUMN public.refund_jobs.destination_bank_account_id IS 
  'Bank account where refund was sent. Either orders.bank_account_id (pinned) or primary (fallback)';

COMMENT ON COLUMN public.refund_jobs.fallback_reason IS 
  'NULL if using pinned bank_account_id from order. Set to reason if fallback to primary was used';

-- Enable RLS (restrictive: service_role only for money operations)
ALTER TABLE public.refund_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service_role can access (Edge Functions use service_role)
-- No public/authenticated access for security
CREATE POLICY "Service role only for refund jobs"
  ON public.refund_jobs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

