import pg from "pg";

const { Pool } = pg;

interface PoolConfig {
  connectionString?: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  ssl?: { rejectUnauthorized: boolean } | false;
}

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
};

export const pool = new Pool(poolConfig);

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

/**
 * Gracefully close the connection pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log("PostgreSQL connection pool closed");
}

/**
 * Check if database connection is healthy
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}

/**
 * Check if PostGIS extension is available
 */
export async function checkPostGIS(): Promise<boolean> {
  try {
    const result = await pool.query(
      "SELECT PostGIS_Version() as version"
    );
    console.log(`PostGIS version: ${result.rows[0].version}`);
    return true;
  } catch (error) {
    console.error("PostGIS not available:", error);
    return false;
  }
}
