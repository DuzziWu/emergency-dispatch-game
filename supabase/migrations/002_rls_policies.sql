-- Row Level Security (RLS) Policies
-- These ensure users can only access their own data

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

-- Station blueprints and types are public (read-only for all users)
ALTER TABLE station_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_types ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Stations policies  
CREATE POLICY "Users can view own stations" ON stations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stations" ON stations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stations" ON stations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stations" ON stations
    FOR DELETE USING (auth.uid() = user_id);

-- Vehicles policies
CREATE POLICY "Users can view own vehicles" ON vehicles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicles" ON vehicles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles" ON vehicles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles" ON vehicles
    FOR DELETE USING (auth.uid() = user_id);

-- Missions policies
CREATE POLICY "Users can view own missions" ON missions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own missions" ON missions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own missions" ON missions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own missions" ON missions
    FOR DELETE USING (auth.uid() = user_id);

-- Public read-only policies for reference data
CREATE POLICY "Station blueprints are viewable by all users" ON station_blueprints
    FOR SELECT USING (true);

CREATE POLICY "Vehicle types are viewable by all users" ON vehicle_types
    FOR SELECT USING (true);

CREATE POLICY "Mission types are viewable by all users" ON mission_types
    FOR SELECT USING (true);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, home_city_name, home_city_lat, home_city_lng)
    VALUES (NEW.id, 
            COALESCE(NEW.raw_user_meta_data->>'username', 'User' || substr(NEW.id::text, 1, 8)),
            'Berlin',  -- Default city
            52.5200,   -- Berlin latitude
            13.4050    -- Berlin longitude
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();