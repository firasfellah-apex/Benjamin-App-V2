-- Add otp_verified_at column to orders table
-- This column tracks when the OTP was successfully verified by the runner
-- Required for counted delivery mode to ensure OTP is verified before count confirmation

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS otp_verified_at timestamptz;

COMMENT ON COLUMN orders.otp_verified_at IS 'Timestamp when the runner successfully verified the OTP code. Required for counted delivery mode before count confirmation.';

