-- Fix vehicle_status enum to ensure all needed values are present
-- Add 'dispatched' as a valid vehicle status

-- First, let's see what values exist (this is just for reference)
-- The current enum should be: ('at_station', 'en_route', 'on_scene', 'returning')
-- But we want to add 'dispatched' for clarity

-- Add 'dispatched' to the vehicle_status enum if it doesn't exist
DO $$ 
BEGIN
    -- Try to add the new enum value
    -- This will fail silently if it already exists
    BEGIN
        ALTER TYPE vehicle_status ADD VALUE 'dispatched';
        RAISE NOTICE 'Added dispatched to vehicle_status enum';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'dispatched already exists in vehicle_status enum';
    END;
END $$;

-- Update the default status comment for clarity
COMMENT ON COLUMN vehicles.status IS 'Vehicle status: at_station, en_route, on_scene, returning, dispatched';