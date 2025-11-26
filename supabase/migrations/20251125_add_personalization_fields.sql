-- Add personalization fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS usual_withdrawal_amount numeric,
  ADD COLUMN IF NOT EXISTS preferred_handoff_style text CHECK (preferred_handoff_style IN ('speed', 'counted', 'depends')),
  ADD COLUMN IF NOT EXISTS cash_usage_categories text[];

-- Add comment for documentation
COMMENT ON COLUMN profiles.usual_withdrawal_amount IS 'User''s typical withdrawal amount (100, 200, 300, 500, or null for "varies")';
COMMENT ON COLUMN profiles.preferred_handoff_style IS 'Preferred delivery style: speed (quick_handoff), counted (count_confirm), or depends';
COMMENT ON COLUMN profiles.cash_usage_categories IS 'Array of usage categories: valet_tipping, nightlife, home_services, splitting_bills, personal_purchases, other';

