#!/usr/bin/env node

/**
 * Simple Migration Runner (ES modules)
 * Executes SQL migrations against the Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get credentials from environment or prompt for manual input
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing environment variables. Please run the migration manually.');
    console.log('🔧 Manual Steps:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy and paste this SQL:');
    console.log('');
    
    const migrationPath = path.join(__dirname, '../migrations/add_mission_processing_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(migrationSQL);
    process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Starting database migration...');

// Test connection first
try {
    const { data, error } = await supabase.from('missions').select('id').limit(1);
    if (error) {
        console.log('❌ Cannot connect to database. Running manual mode...');
        console.log('🔧 Manual Steps:');
        console.log('1. Go to Supabase Dashboard > SQL Editor');
        console.log('2. Copy and paste this SQL:');
        
        const migrationPath = path.join(__dirname, '../migrations/add_mission_processing_fields.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log(migrationSQL);
        process.exit(0);
    }
} catch (e) {
    console.log('❌ Connection failed. Please run manually in Supabase Dashboard.');
    process.exit(1);
}

console.log('📡 Connected to Supabase successfully!');
console.log('');
console.log('⚠️  For ALTER TABLE operations, please run this manually in Supabase Dashboard:');
console.log('');

const migrationPath = path.join(__dirname, '../migrations/add_mission_processing_fields.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
console.log(migrationSQL);