/**
 * Load all German station blueprints directly to Supabase PostgreSQL
 * Uses direct database connection to handle large dataset
 */

const { Pool } = require("pg");
const fs = require("fs").promises;

// Database connection - you'll need to provide the password
const DB_CONFIG = {
  connectionString:
    "postgresql://postgres.ilnrpwrzwbgqzurddxrp:lk6hFLoW4uKwAZZR@aws-1-eu-central-1.pooler.supabase.com:6543/postgres",
  ssl: {
    rejectUnauthorized: false,
  },
};

async function loadStationData() {
  console.log("📖 Loading station data...");

  try {
    const rawData = await fs.readFile("stations_raw.json", "utf8");
    const stations = JSON.parse(rawData);

    console.log(`📊 Loaded ${stations.length} stations`);
    const stats = stations.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {});
    console.log("📈 Station types:", stats);

    return stations;
  } catch (error) {
    console.error("❌ Failed to load station data:", error.message);
    throw error;
  }
}

async function connectToDatabase(password) {
  const connectionString = DB_CONFIG.connectionString.replace(
    "lk6hFLoW4uKwAZZR",
    password
  );
  const pool = new Pool({
    connectionString,
    ssl: DB_CONFIG.ssl,
  });

  console.log("🔌 Connecting to Supabase PostgreSQL...");

  try {
    const client = await pool.connect();
    console.log("✅ Connected to database successfully");
    return { pool, client };
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
    throw error;
  }
}

async function clearExistingStations(client) {
  console.log("🗑️  Clearing existing station blueprints...");

  try {
    const result = await client.query("DELETE FROM station_blueprints");
    console.log(`✅ Cleared ${result.rowCount} existing stations`);
  } catch (error) {
    console.error("❌ Failed to clear existing stations:", error.message);
    throw error;
  }
}

async function insertStationsBatch(client, stations, batchSize = 1000) {
  const totalStations = stations.length;
  let insertedCount = 0;

  console.log(
    `📦 Inserting ${totalStations} stations in batches of ${batchSize}...`
  );

  for (let i = 0; i < totalStations; i += batchSize) {
    const batch = stations.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(totalStations / batchSize);

    console.log(
      `⏳ Processing batch ${batchNumber}/${totalBatches} (${batch.length} stations)...`
    );

    // Build batch insert query
    const values = [];
    const params = [];
    let paramIndex = 1;

    batch.forEach((station, index) => {
      const baseIndex = paramIndex - 1;
      values.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
      );
      params.push(
        station.name,
        station.lat,
        station.lng,
        station.city,
        station.type
      );
    });

    const query = `
      INSERT INTO station_blueprints (name, lat, lng, city, type) 
      VALUES ${values.join(", ")}
    `;

    try {
      const result = await client.query(query, params);
      insertedCount += result.rowCount;
      console.log(
        `✅ Batch ${batchNumber} completed. Total inserted: ${insertedCount}/${totalStations}`
      );

      // Small delay between batches
      if (i + batchSize < totalStations) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ Failed to insert batch ${batchNumber}:`, error.message);
      throw error;
    }
  }

  return insertedCount;
}

async function verifyInsertion(client) {
  console.log("🔍 Verifying insertion...");

  try {
    const result = await client.query(`
      SELECT type, COUNT(*) as count 
      FROM station_blueprints 
      GROUP BY type
    `);

    console.log("📈 Station counts by type:");
    let totalCount = 0;
    result.rows.forEach((row) => {
      console.log(`  ${row.type}: ${row.count} stations`);
      totalCount += parseInt(row.count);
    });

    console.log(`🎉 Total stations in database: ${totalCount}`);
    return totalCount;
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    throw error;
  }
}

async function main() {
  console.log("🚨 Loading German Station Blueprints to Supabase");
  console.log("===============================================");

  // Get password from command line argument
  const password = process.argv[2];
  if (!password) {
    console.error("❌ Please provide database password as argument:");
    console.log(
      "   node scripts/load-stations-direct.js YOUR_DATABASE_PASSWORD"
    );
    process.exit(1);
  }

  let pool, client;

  try {
    // Load station data
    const stations = await loadStationData();

    // Connect to database
    ({ pool, client } = await connectToDatabase(password));

    // Clear existing data
    await clearExistingStations(client);

    // Insert in batches
    const insertedCount = await insertStationsBatch(client, stations);

    // Verify
    const verifiedCount = await verifyInsertion(client);

    if (insertedCount === verifiedCount) {
      console.log("✅ Successfully loaded all station blueprints!");
      console.log(
        `🎯 ${verifiedCount} German emergency stations are now available for players`
      );
    } else {
      console.warn(
        `⚠️  Count mismatch: inserted ${insertedCount}, verified ${verifiedCount}`
      );
    }
  } catch (error) {
    console.error("💥 Script failed:", error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
      console.log("🔌 Database connection closed");
    }
    if (pool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  main();
}

// Also create a package.json script entry for convenience
module.exports = { loadStationData, connectToDatabase, insertStationsBatch };
