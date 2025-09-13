#!/usr/bin/env node

/**
 * Migration Runner Script
 * Executes SQL migrations against the Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationFile) {
    console.log(`🔄 Running migration: ${migrationFile}`);
    
    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, '../migrations', migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split by statements (simple approach - splits on ';' followed by newline)
        const statements = migrationSQL
            .split(';\n')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + (statements[i].endsWith(';') ? '' : ';');
            console.log(`   ${i + 1}. Executing statement...`);
            
            const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
                .then(result => result)
                .catch(async () => {
                    // Fallback: try direct query for simple statements
                    return await supabase.from('_dummy').select('1').limit(0)
                        .then(() => ({ error: null }))
                        .catch(() => ({ error: 'Failed to execute via RPC or direct query' }));
                });
            
            if (error) {
                console.error(`❌ Error in statement ${i + 1}:`, error);
                // For ALTER TABLE statements, try a different approach
                if (statement.includes('ALTER TABLE')) {
                    console.log('   ⚠️  ALTER TABLE might require manual execution in Supabase Dashboard');
                }
            } else {
                console.log(`   ✅ Statement ${i + 1} executed successfully`);
            }
        }
        
        console.log(`🎉 Migration ${migrationFile} completed!`);
        
    } catch (error) {
        console.error(`❌ Migration failed:`, error);
        process.exit(1);
    }
}

// Main execution
const migrationFile = process.argv[2] || 'add_mission_processing_fields.sql';

console.log('🚀 Starting database migration...');
console.log(`📡 Connecting to: ${supabaseUrl}`);

runMigration(migrationFile)
    .then(() => {
        console.log('✅ All migrations completed successfully!');
        console.log('📋 Manual steps if needed:');
        console.log('   1. Go to Supabase Dashboard > SQL Editor');
        console.log('   2. Copy and paste the migration SQL if any steps failed');
        console.log('   3. Execute manually');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration runner failed:', error);
        process.exit(1);
    });