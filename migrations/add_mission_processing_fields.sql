-- Migration: Add mission processing fields
-- This adds the necessary columns for the 30-second mission processing timer system

-- Add processing fields to missions table
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_duration INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN missions.processing_started_at IS 'Timestamp when mission processing started (when vehicles arrived on scene)';
COMMENT ON COLUMN missions.processing_duration IS 'Duration in seconds for mission processing (default 30)';
COMMENT ON COLUMN missions.processing_progress IS 'Current processing progress as percentage (0-100)';

-- Create index for performance on processing queries
CREATE INDEX IF NOT EXISTS idx_missions_processing_started_at ON missions(processing_started_at) WHERE processing_started_at IS NOT NULL;

-- Add RPC function for adding credits if it doesn't exist
CREATE OR REPLACE FUNCTION add_credits(user_id UUID, amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles 
    SET credits = credits + amount 
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', user_id;
    END IF;
END;
$$;

-- Grant execute permission on the RPC function
GRANT EXECUTE ON FUNCTION add_credits TO authenticated;