-- Update user finances - 10M EUR start and running costs tracking
-- This migration adds running costs tracking and updates default credits

-- Add running_costs column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS running_costs INTEGER DEFAULT 0 NOT NULL;

-- Update default credits for new users (10 million EUR)
ALTER TABLE profiles ALTER COLUMN credits SET DEFAULT 10000000;

-- Update existing users to have 10M credits if they still have default 6M
UPDATE profiles SET credits = 10000000 WHERE credits = 6000000;

-- Add comment for clarity
COMMENT ON COLUMN profiles.running_costs IS 'Monthly running costs in EUR cents (per hour costs * 730)';
COMMENT ON COLUMN profiles.credits IS 'User credits in EUR cents (10000000 = 100,000 EUR)';