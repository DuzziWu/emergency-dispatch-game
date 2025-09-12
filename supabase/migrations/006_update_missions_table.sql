-- Update missions table to add missing columns
-- First drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own missions" ON public.missions;
DROP POLICY IF EXISTS "Users can update their own missions" ON public.missions;
DROP POLICY IF EXISTS "Users can delete their own missions" ON public.missions;
DROP POLICY IF EXISTS "Users can view their own missions" ON public.missions;

-- Add missing columns if they don't exist
ALTER TABLE public.missions 
  ADD COLUMN IF NOT EXISTS payout INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS caller_name TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS outcome_type TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update status column to include new enum values
ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_status_check;
ALTER TABLE public.missions 
  ADD CONSTRAINT missions_status_check 
  CHECK (status IN ('new', 'dispatched', 'en_route', 'on_scene', 'scouted', 'completed', 'failed'));

-- Update required_vehicles column type if needed
ALTER TABLE public.missions 
  ALTER COLUMN required_vehicles TYPE JSONB USING required_vehicles::jsonb,
  ALTER COLUMN required_vehicles SET DEFAULT '[]'::jsonb;

-- Ensure assigned_vehicle_ids is correct type
ALTER TABLE public.missions 
  ALTER COLUMN assigned_vehicle_ids TYPE INTEGER[] USING assigned_vehicle_ids::INTEGER[],
  ALTER COLUMN assigned_vehicle_ids SET DEFAULT ARRAY[]::INTEGER[];

-- Create fresh RLS policies
CREATE POLICY "Users can view their own missions"
  ON public.missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own missions"
  ON public.missions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own missions"
  ON public.missions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own missions"
  ON public.missions FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON public.missions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.missions_id_seq TO authenticated;