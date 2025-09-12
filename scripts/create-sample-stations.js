/**
 * Create a sample set of German stations for testing
 * Before applying the full 28k+ dataset
 */

const fs = require('fs').promises;

async function createSample() {
  console.log('📖 Loading station data...');
  
  const rawData = await fs.readFile('stations_raw.json', 'utf8');
  const allStations = JSON.parse(rawData);
  
  // Get sample from major cities and spread across Germany
  const sampleStations = [];
  const targetCities = ['Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt am Main', 'Stuttgart', 'Düsseldorf', 'Essen', 'Leipzig', 'Dresden'];
  const stationsPerCity = 10; // 5 fire + 5 EMS per major city
  
  // Get stations from target cities
  targetCities.forEach(city => {
    const cityStations = allStations.filter(s => s.city === city);
    const fireStations = cityStations.filter(s => s.type === 'fire_station').slice(0, 5);
    const emsStations = cityStations.filter(s => s.type === 'ems_station').slice(0, 5);
    
    sampleStations.push(...fireStations, ...emsStations);
    console.log(`${city}: ${fireStations.length} fire + ${emsStations.length} EMS stations`);
  });
  
  // Add some random stations for variety
  const remainingStations = allStations.filter(s => !targetCities.includes(s.city));
  const randomStations = remainingStations
    .sort(() => Math.random() - 0.5)
    .slice(0, 50);
  
  sampleStations.push(...randomStations);
  
  console.log(`📊 Sample: ${sampleStations.length} stations`);
  const stats = sampleStations.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});
  console.log('📈 Sample stats:', stats);
  
  // Generate SQL
  const sqlInserts = sampleStations.map(station => {
    const { name, lat, lng, city, type } = station;
    const escapedName = name.replace(/'/g, "''");
    const escapedCity = city.replace(/'/g, "''");
    
    return `('${escapedName}', ${lat}, ${lng}, '${escapedCity}', '${type}')`;
  }).join(',\n    ');
  
  const sql = `-- Sample German Emergency Stations for Testing
-- Generated on ${new Date().toISOString()}
-- Total stations: ${sampleStations.length}

-- Clear existing data
DELETE FROM station_blueprints;

-- Insert sample data
INSERT INTO station_blueprints (name, lat, lng, city, type) VALUES
    ${sqlInserts};

-- Statistics:
${Object.entries(stats).map(([type, count]) => `-- ${type}: ${count} stations`).join('\n')}
`;
  
  await fs.writeFile('supabase/seed_data/004_sample_stations.sql', sql, 'utf8');
  console.log('💾 Generated: supabase/seed_data/004_sample_stations.sql');
  
  return sampleStations.length;
}

if (require.main === module) {
  createSample().then(count => {
    console.log(`🎉 Created sample with ${count} stations for testing!`);
  }).catch(console.error);
}