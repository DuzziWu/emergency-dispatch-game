-- Add mission_title column to missions table
ALTER TABLE public.missions 
  ADD COLUMN IF NOT EXISTS mission_title TEXT;

-- Update existing missions to have the correct title from mission_types
UPDATE public.missions 
SET mission_title = mission_types.title
FROM mission_types 
WHERE missions.mission_type_id = mission_types.id 
  AND missions.mission_title IS NULL;