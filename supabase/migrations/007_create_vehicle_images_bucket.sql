-- Vehicle Images Storage Configuration
-- 
-- IMPORTANT: The 'vehicle-images' bucket must be created manually via Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard  
-- 2. Create new bucket named 'vehicle-images'
-- 3. Set as Public bucket
-- 4. Set file size limit to 10MB
-- 5. Allow image file types (jpeg, jpg, png, webp)
--
-- This migration only sets up the policies (bucket creation via SQL requires superuser access)

-- Storage policies for vehicle-images bucket (only run if bucket exists)
DO $$
BEGIN
    -- Check if bucket exists before creating policies
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'vehicle-images') THEN
        
        -- Create storage policy to allow public read access
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' 
            AND policyname = 'Vehicle images are publicly readable'
        ) THEN
            CREATE POLICY "Vehicle images are publicly readable" ON storage.objects
                FOR SELECT USING (bucket_id = 'vehicle-images');
        END IF;

        -- Create storage policy to allow authenticated uploads
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' 
            AND policyname = 'Authenticated users can upload vehicle images'
        ) THEN
            CREATE POLICY "Authenticated users can upload vehicle images" ON storage.objects
                FOR INSERT WITH CHECK (
                    bucket_id = 'vehicle-images' AND 
                    auth.role() = 'authenticated'
                );
        END IF;

        -- Create storage policy to allow authenticated updates  
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' 
            AND policyname = 'Authenticated users can update vehicle images'
        ) THEN
            CREATE POLICY "Authenticated users can update vehicle images" ON storage.objects
                FOR UPDATE USING (
                    bucket_id = 'vehicle-images' AND 
                    auth.role() = 'authenticated'
                );
        END IF;

        -- Create storage policy to allow authenticated deletes
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' 
            AND policyname = 'Authenticated users can delete vehicle images'
        ) THEN
            CREATE POLICY "Authenticated users can delete vehicle images" ON storage.objects
                FOR DELETE USING (
                    bucket_id = 'vehicle-images' AND 
                    auth.role() = 'authenticated'
                );
        END IF;

        RAISE NOTICE 'Vehicle images storage policies created successfully';
    ELSE
        RAISE NOTICE 'vehicle-images bucket not found. Please create it manually via Supabase Dashboard first.';
    END IF;
END $$;