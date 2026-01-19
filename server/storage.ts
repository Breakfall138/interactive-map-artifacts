import type {
  Artifact,
  InsertArtifact,
  Bounds,
  CircleSelection,
  AggregationResult,
  ViewportResponse,
} from "@shared/schema";

/**
 * Storage interface for artifact persistence
 * Implementations: PostgresStorage (PostGIS), MemStorage (in-memory fallback)
 */
export interface IStorage {
  getAllArtifacts(): Promise<Artifact[]>;
  getArtifact(id: string): Promise<Artifact | undefined>;
  getArtifactsInBounds(bounds: Bounds): Promise<Artifact[]>;
  getArtifactsInCircle(circle: CircleSelection): Promise<Artifact[]>;
  getAggregation(circle: CircleSelection): Promise<AggregationResult>;
  getViewportData(bounds: Bounds, zoom: number, limit: number): Promise<ViewportResponse>;
  createArtifact(artifact: InsertArtifact): Promise<Artifact>;
  createManyArtifacts(artifacts: InsertArtifact[]): Promise<Artifact[]>;
  getArtifactCount(): Promise<number>;
}

let storageInstance: IStorage | null = null;

/**
 * Creates the appropriate storage backend based on environment configuration
 * - If DATABASE_URL is set: uses PostgreSQL with PostGIS
 * - Otherwise: uses in-memory storage with RBush spatial index
 */
export async function createStorage(): Promise<IStorage> {
  if (process.env.DATABASE_URL) {
    try {
      const { PostgresStorage } = await import("./db/postgresStorage");
      const { checkConnection, checkPostGIS } = await import("./db/config");

      const connected = await checkConnection();
      if (!connected) {
        throw new Error("Failed to connect to PostgreSQL database");
      }

      const hasPostGIS = await checkPostGIS();
      if (!hasPostGIS) {
        throw new Error("PostGIS extension not available");
      }

      console.log("Using PostgreSQL/PostGIS storage backend");
      return new PostgresStorage();
    } catch (error) {
      console.error("Failed to initialize PostgreSQL storage:", error);
      console.log("Falling back to in-memory storage");
    }
  }

  // Fallback to in-memory storage
  const { MemStorage } = await import("./memStorage");
  console.log("Using in-memory storage backend");
  return new MemStorage();
}

/**
 * Returns the singleton storage instance, creating it if necessary
 */
export async function getStorage(): Promise<IStorage> {
  if (!storageInstance) {
    storageInstance = await createStorage();
  }
  return storageInstance;
}

/**
 * Resets the storage instance (useful for testing)
 */
export function resetStorage(): void {
  storageInstance = null;
}
