/**
 * Apply German station blueprints to Supabase in batches
 * Handles large datasets by splitting into smaller chunks
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;

const supabaseUrl = 'https://ilnrpwrzwbgqzurddxrp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsbnJwd3J6d2JncXp1cmRkeHJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI1MjM2OCwiZXhwIjoyMDcyODI4MzY4fQ.PIKvP11H5bLT96NzZafNb6t0PBb8M7e8GjVZNd9nTas'; // Service role key for admin operations

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function loadStationData() {
  console.log('📖 Loading station data...');
  
  try {
    const rawData = await fs.readFile('stations_raw.json', 'utf8');
    const stations = JSON.parse(rawData);
    
    console.log(`📊 Loaded ${stations.length} stations`);
    return stations;
  } catch (error) {
    console.error('❌ Failed to load station data:', error.message);
    throw error;
  }
}

async function clearExistingBlueprints() {
  console.log('🗑️  Clearing existing station blueprints...');
  
  const { error } = await supabase
    .from('station_blueprints')
    .delete()
    .neq('id', 0); // Delete all records
    
  if (error) {
    console.error('❌ Failed to clear blueprints:', error);
    throw error;
  }
  
  console.log('✅ Cleared existing station blueprints');
}

async function insertStationBatch(stations, batchSize = 1000) {
  const totalStations = stations.length;
  let insertedCount = 0;
  
  console.log(`📦 Inserting ${totalStations} stations in batches of ${batchSize}...`);
  
  for (let i = 0; i < totalStations; i += batchSize) {
    const batch = stations.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(totalStations / batchSize);
    
    console.log(`⏳ Processing batch ${batchNumber}/${totalBatches} (${batch.length} stations)...`);
    
    // Map to database format
    const dbStations = batch.map(station => ({
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      city: station.city,
      type: station.type
    }));
    
    const { data, error } = await supabase
      .from('station_blueprints')
      .insert(dbStations)
      .select('id');
    
    if (error) {
      console.error(`❌ Failed to insert batch ${batchNumber}:`, error);
      throw error;
    }
    
    insertedCount += batch.length;
    console.log(`✅ Batch ${batchNumber} completed. Total inserted: ${insertedCount}/${totalStations}`);
    
    // Small delay to avoid rate limiting
    if (i + batchSize < totalStations) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return insertedCount;
}

async function verifyInsertion() {
  console.log('🔍 Verifying insertion...');
  
  const { data: counts, error } = await supabase
    .from('station_blueprints')
    .select('type')
    .then(({ data, error }) => {
      if (error) throw error;
      
      const typeCounts = data.reduce((acc, station) => {
        acc[station.type] = (acc[station.type] || 0) + 1;
        return acc;
      }, {});
      
      return { data: typeCounts, error };
    });
  
  if (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
  
  console.log('📈 Station counts by type:');
  Object.entries(counts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} stations`);
  });
  
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(`🎉 Total stations in database: ${totalCount}`);
  
  return totalCount;
}

async function main() {
  console.log('🚨 Applying German Station Blueprints to Supabase');
  console.log('================================================');
  
  try {
    // Load station data
    const stations = await loadStationData();
    
    // Clear existing data
    await clearExistingBlueprints();
    
    // Insert in batches
    const insertedCount = await insertStationBatch(stations);
    
    // Verify
    const verifiedCount = await verifyInsertion();
    
    if (insertedCount === verifiedCount) {
      console.log('✅ Successfully applied all station blueprints!');
      console.log(`🎯 ${verifiedCount} German emergency stations are now available for players`);
    } else {
      console.warn(`⚠️  Count mismatch: inserted ${insertedCount}, verified ${verifiedCount}`);
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}