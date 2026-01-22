/**
 * Import Eversource Substations from JSON file into database
 *
 * Usage:
 *   npx tsx scripts/import-substations.ts [jsonPath] [states]
 *
 * Examples:
 *   npx tsx scripts/import-substations.ts                           # CT only, default path
 *   npx tsx scripts/import-substations.ts .claude/Data\ migration/eversource_substations.json CT,MA,NH
 */

import { readFileSync } from "fs";
import { resolve } from "path";

interface SubstationLocation {
  latitude: number;
  longitude: number;
}

interface VoltageKV {
  max: number;
  min: number;
  max_inferred: string;
  min_inferred: string;
}

interface ServiceTerritory {
  utility_name: string;
  holding_company: string;
  website: string;
}

interface Provenance {
  substations_layer: string;
  territory_layer: string;
  substation_source: string;
  substation_source_date: string;
  substation_val_method: string;
  substation_val_date: string;
}

interface HIFLD {
  objectid: number;
  id: string;
  lines: number;
}

interface SubstationData {
  name: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  type: "TAP" | "SUBSTATION";
  status: string;
  location: SubstationLocation;
  voltage_kv: VoltageKV;
  google_maps_link: string;
  service_territory: ServiceTerritory;
  provenance: Provenance;
  hifld: HIFLD;
}

interface SubstationsFile {
  utility_brand: string;
  parent_company: string;
  states: string[];
  generated_at_utc: string;
  notes: string[];
  summary: Record<string, number>;
  substations_by_state: {
    CT: SubstationData[];
    MA: SubstationData[];
    NH: SubstationData[];
  };
}

interface InsertArtifact {
  name: string;
  lat: number;
  lng: number;
  category: string;
  layer: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

async function importSubstations(
  jsonPath: string,
  statesToImport: string[] = ["CT"]
) {
  console.log(`Loading substations from: ${jsonPath}`);
  console.log(`States to import: ${statesToImport.join(", ")}`);

  const absolutePath = resolve(process.cwd(), jsonPath);
  const fileContent = readFileSync(absolutePath, "utf-8");
  const data: SubstationsFile = JSON.parse(fileContent);

  console.log(`\nFile info:`);
  console.log(`  Utility: ${data.utility_brand}`);
  console.log(`  Generated: ${data.generated_at_utc}`);
  console.log(`  Summary: CT=${data.summary.CT}, MA=${data.summary.MA}, NH=${data.summary.NH}, Total=${data.summary.total}`);

  // Dynamic import to handle module resolution
  const { pool } = await import("../server/db/config");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure layer exists
    await client.query(`
      INSERT INTO layers (id, name, description, source, source_date)
      VALUES ('eversource-substations', 'Eversource Substations',
              'HIFLD transmission substations in Eversource territory (CT/MA/NH)',
              'HIFLD/ORNL', CURRENT_DATE)
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `);

    let imported = 0;
    let skipped = 0;

    for (const state of statesToImport) {
      const stateKey = state.toUpperCase() as keyof typeof data.substations_by_state;
      const substations = data.substations_by_state[stateKey];

      if (!substations) {
        console.log(`Warning: No data found for state ${state}`);
        continue;
      }

      console.log(`\nImporting ${substations.length} substations from ${state}...`);

      for (const sub of substations) {
        // Validate coordinates
        if (
          !sub.location ||
          typeof sub.location.latitude !== "number" ||
          typeof sub.location.longitude !== "number" ||
          sub.location.latitude < -90 ||
          sub.location.latitude > 90 ||
          sub.location.longitude < -180 ||
          sub.location.longitude > 180
        ) {
          console.log(`  Skipping ${sub.name}: invalid coordinates`);
          skipped++;
          continue;
        }

        const artifact: InsertArtifact = {
          name: sub.name,
          lat: sub.location.latitude,
          lng: sub.location.longitude,
          category: sub.type.toLowerCase(), // 'tap' or 'substation'
          layer: "eversource-substations",
          description: `${sub.type} in ${sub.city}, ${sub.state} - ${sub.status}`,
          metadata: {
            city: sub.city,
            county: sub.county,
            state: sub.state,
            zip: sub.zip,
            type: sub.type,
            status: sub.status,
            voltage_kv_max: sub.voltage_kv?.max,
            voltage_kv_min: sub.voltage_kv?.min,
            utility_name: sub.service_territory?.utility_name,
            holding_company: sub.service_territory?.holding_company,
            hifld_objectid: sub.hifld?.objectid,
            hifld_id: sub.hifld?.id,
            hifld_lines: sub.hifld?.lines,
            google_maps_link: sub.google_maps_link,
            provenance: sub.provenance,
          },
        };

        await client.query(
          `
          INSERT INTO artifacts (name, category, layer, description, metadata, location)
          VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography)
        `,
          [
            artifact.name,
            artifact.category,
            artifact.layer,
            artifact.description,
            JSON.stringify(artifact.metadata),
            artifact.lng,
            artifact.lat,
          ]
        );

        imported++;
      }
    }

    // Update layer count
    await client.query(`
      UPDATE layers SET artifact_count = (
        SELECT COUNT(*) FROM artifacts WHERE layer = 'eversource-substations'
      )
      WHERE id = 'eversource-substations'
    `);

    await client.query("COMMIT");

    console.log(`\n✓ Import complete!`);
    console.log(`  Imported: ${imported}`);
    console.log(`  Skipped: ${skipped}`);

    // Verify
    const countResult = await pool.query(
      "SELECT COUNT(*) as count FROM artifacts WHERE layer = 'eversource-substations'"
    );
    console.log(`  Total in database: ${countResult.rows[0].count}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Import failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// CLI entry point
const args = process.argv.slice(2);
const jsonPath =
  args[0] || ".claude/Data migration/eversource_substations.json";
const states = args[1]?.split(",") || ["CT", "MA", "NH"];

importSubstations(jsonPath, states)
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
