import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ilnrpwrzwbgqzurddxrp.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsbnJwd3J6d2JncXp1cmRkeHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTIzNjgsImV4cCI6MjA3MjgyODM2OH0.LfuNwonTTuPZlc7Sh0vUNyb9H2rKZWyi1AyFb583LuM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)