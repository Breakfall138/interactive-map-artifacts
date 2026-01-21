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

// Handle pool errors - use lazy logger import to avoid circular dependency
pool.on("error", async (err) => {
  const { getLogger } = await import("../logging/logger");
  const logger = await getLogger();
  logger.error("Unexpected error on idle PostgreSQL client", err, { source: "postgres" });
});

/**
 * Gracefully close the connection pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
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
    const { getLogger } = await import("../logging/logger");
    const logger = await getLogger();
    logger.error("Database connection check failed", error as Error, { source: "postgres" });
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
    const { getLogger } = await import("../logging/logger");
    const logger = await getLogger();
    logger.info(`PostGIS version: ${result.rows[0].version}`, { source: "postgres" });
    return true;
  } catch (error) {
    const { getLogger } = await import("../logging/logger");
    const logger = await getLogger();
    logger.error("PostGIS not available", error as Error, { source: "postgres" });
    return false;
  }
}
