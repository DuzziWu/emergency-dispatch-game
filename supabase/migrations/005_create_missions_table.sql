-- Create missions table for active missions
CREATE TABLE IF NOT EXISTS public.missions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_type_id INTEGER REFERENCES public.mission_types(id) ON DELETE CASCADE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  address TEXT,
  caller_name TEXT,
  business_name TEXT,
  status TEXT CHECK (status IN ('new', 'dispatched', 'en_route', 'on_scene', 'scouted', 'completed', 'failed')) DEFAULT 'new',
  caller_text TEXT NOT NULL,
  payout INTEGER NOT NULL DEFAULT 0,
  outcome_type TEXT,
  required_vehicles JSONB DEFAULT '[]'::jsonb,
  assigned_vehicle_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS missions_user_id_idx ON public.missions(user_id);
CREATE INDEX IF NOT EXISTS missions_status_idx ON public.missions(status);
CREATE INDEX IF NOT EXISTS missions_created_at_idx ON public.missions(created_at);

-- Enable Row Level Security
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for missions
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

-- Grant permissions to authenticated users
GRANT ALL ON public.missions TO authenticated;
GRANT USAGE ON SEQUENCE public.missions_id_seq TO authenticated;