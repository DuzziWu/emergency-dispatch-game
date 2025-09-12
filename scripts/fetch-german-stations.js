/**
 * Fetch German Emergency Stations from OpenStreetMap Overpass API
 * Includes Fire Stations, EMS Stations, and Police Stations
 * Handles both coordinates and addresses with geocoding
 */

const fs = require('fs').promises;

// Overpass API query for German emergency stations
const OVERPASS_QUERY = `
[out:json][timeout:180];
(
  // Fire stations in Germany (using area filter for better results)
  area["ISO3166-1"="DE"]["admin_level"="2"];
)->.searchArea;
(
  // Fire stations
  nwr["amenity"="fire_station"](area.searchArea);
  
  // EMS/Ambulance stations  
  nwr["emergency"="ambulance_station"](area.searchArea);
  nwr["amenity"="hospital"]["emergency"="yes"](area.searchArea);
  
  // Police stations (for future use)
  nwr["amenity"="police"](area.searchArea);
);
out center meta;
`;

async function fetchFromOverpass() {
  console.log('🔍 Fetching German emergency stations from Overpass API...');
  
  const url = 'https://overpass-api.de/api/interpreter';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: OVERPASS_QUERY
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`📊 Raw data: ${data.elements.length} elements found`);
  
  return data.elements;
}

async function geocodeAddress(address) {
  // Use Nominatim for address geocoding (same as in CitySelector)
  const query = encodeURIComponent(address + ', Germany');
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1&countrycodes=de`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.warn(`Geocoding failed for: ${address}`, error.message);
  }
  
  return null;
}

function extractCoordinates(element) {
  if (element.lat && element.lon) {
    return { lat: element.lat, lng: element.lon };
  }
  
  // For ways and relations, try to get center point
  if (element.center) {
    return { lat: element.center.lat, lng: element.center.lon };
  }
  
  return null;
}

function buildAddress(tags) {
  const parts = [];
  
  if (tags['addr:street'] && tags['addr:housenumber']) {
    parts.push(`${tags['addr:street']} ${tags['addr:housenumber']}`);
  } else if (tags['addr:street']) {
    parts.push(tags['addr:street']);
  }
  
  if (tags['addr:city']) {
    parts.push(tags['addr:city']);
  } else if (tags['addr:municipality']) {
    parts.push(tags['addr:municipality']);
  }
  
  if (tags['addr:postcode']) {
    parts.unshift(tags['addr:postcode']);
  }
  
  return parts.length > 0 ? parts.join(', ') : null;
}

function determineStationType(tags) {
  // Fire stations
  if (tags.amenity === 'fire_station') {
    return 'fire_station';
  }
  
  // EMS stations
  if (tags.emergency === 'ambulance_station' || 
      (tags.amenity === 'hospital' && tags.emergency === 'yes')) {
    return 'ems_station';
  }
  
  // Police stations (for future use)
  if (tags.amenity === 'police') {
    return 'police_station';
  }
  
  return null;
}

function getCity(tags) {
  return tags['addr:city'] || 
         tags['addr:municipality'] || 
         tags['addr:town'] || 
         tags['addr:village'] || 
         'Unbekannt';
}

async function processStations() {
  try {
    const rawElements = await fetchFromOverpass();
    const processedStations = [];
    let geocodingCount = 0;
    
    console.log('🔄 Processing stations...');
    
    for (const element of rawElements) {
      const tags = element.tags || {};
      
      // Filter: Must have name
      if (!tags.name || tags.name.trim() === '') {
        continue;
      }
      
      // Get station type
      const stationType = determineStationType(tags);
      if (!stationType) {
        continue;
      }
      
      // Only process fire and EMS for now (skip police for Phase 4)
      if (stationType === 'police_station') {
        continue;
      }
      
      // Try to get coordinates
      let coordinates = extractCoordinates(element);
      
      // If no coordinates, try to geocode address
      if (!coordinates) {
        const address = buildAddress(tags);
        if (address) {
          coordinates = await geocodeAddress(address);
          if (coordinates) {
            geocodingCount++;
            // Rate limiting for Nominatim
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // Filter: Must have coordinates OR address
      if (!coordinates && !buildAddress(tags)) {
        continue;
      }
      
      // If we still don't have coordinates, skip this station
      if (!coordinates) {
        continue;
      }
      
      const station = {
        name: tags.name.trim(),
        lat: coordinates.lat,
        lng: coordinates.lng,
        city: getCity(tags),
        type: stationType,
        source: 'openstreetmap',
        osm_id: element.id,
        osm_type: element.type
      };
      
      processedStations.push(station);
    }
    
    console.log(`✅ Processed ${processedStations.length} stations`);
    console.log(`🌍 Geocoded ${geocodingCount} addresses`);
    
    // Group by type for statistics
    const stats = processedStations.reduce((acc, station) => {
      acc[station.type] = (acc[station.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📈 Station types:', stats);
    
    return processedStations;
    
  } catch (error) {
    console.error('❌ Error processing stations:', error);
    throw error;
  }
}

async function generateSQL(stations) {
  const sqlInserts = stations.map(station => {
    const { name, lat, lng, city, type } = station;
    const escapedName = name.replace(/'/g, "''");
    const escapedCity = city.replace(/'/g, "''");
    
    return `('${escapedName}', ${lat}, ${lng}, '${escapedCity}', '${type}')`;
  }).join(',\n    ');
  
  const sql = `-- German Emergency Stations from OpenStreetMap
-- Generated on ${new Date().toISOString()}
-- Total stations: ${stations.length}

INSERT INTO station_blueprints (name, lat, lng, city, type) VALUES
    ${sqlInserts};

-- Statistics:
${Object.entries(stations.reduce((acc, s) => {
  acc[s.type] = (acc[s.type] || 0) + 1;
  return acc;
}, {})).map(([type, count]) => `-- ${type}: ${count} stations`).join('\n')}
`;
  
  return sql;
}

async function main() {
  console.log('🚨 German Emergency Stations Fetcher');
  console.log('====================================');
  
  try {
    const stations = await processStations();
    const sql = await generateSQL(stations);
    
    // Write SQL file
    const filename = `supabase/seed_data/004_station_blueprints.sql`;
    await fs.writeFile(filename, sql, 'utf8');
    
    console.log(`💾 Generated SQL file: ${filename}`);
    console.log(`🎉 Ready to seed ${stations.length} German emergency stations!`);
    
    // Also save raw data for debugging
    await fs.writeFile('stations_raw.json', JSON.stringify(stations, null, 2));
    console.log('🔍 Raw data saved to: stations_raw.json');
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}