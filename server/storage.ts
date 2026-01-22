import type {
  Artifact,
  InsertArtifact,
  Bounds,
  CircleSelection,
  AggregationResult,
  ViewportResponse,
  Layer,
} from "@shared/schema";

/**
 * Storage interface for artifact persistence
 * Implementations: PostgresStorage (PostGIS), MemStorage (in-memory fallback)
 */
export interface IStorage {
  // Artifact queries with optional layer filtering
  getAllArtifacts(layers?: string[]): Promise<Artifact[]>;
  getArtifact(id: string): Promise<Artifact | undefined>;
  getArtifactsInBounds(bounds: Bounds, layers?: string[]): Promise<Artifact[]>;
  getArtifactsInCircle(circle: CircleSelection, layers?: string[]): Promise<Artifact[]>;
  getAggregation(circle: CircleSelection, layers?: string[]): Promise<AggregationResult>;
  getViewportData(bounds: Bounds, zoom: number, limit: number, layers?: string[]): Promise<ViewportResponse>;
  createArtifact(artifact: InsertArtifact): Promise<Artifact>;
  createManyArtifacts(artifacts: InsertArtifact[]): Promise<Artifact[]>;
  getArtifactCount(layers?: string[]): Promise<number>;

  // Layer management
  getLayers(): Promise<Layer[]>;
  getLayer(id: string): Promise<Layer | undefined>;
  createLayer(layer: Omit<Layer, "artifactCount">): Promise<Layer>;
  updateLayerVisibility(id: string, visible: boolean): Promise<void>;
  deleteLayer(id: string): Promise<void>;
}

let storageInstance: IStorage | null = null;

/**
 * Creates the appropriate storage backend based on environment configuration
 * - If DATABASE_URL is set: uses PostgreSQL with PostGIS
 * - Otherwise: uses in-memory storage with RBush spatial index
 */
export async function createStorage(): Promise<IStorage> {
  const { getLogger } = await import("./logging/logger");
  const logger = await getLogger();

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

      logger.info("Using PostgreSQL/PostGIS storage backend", { source: "storage" });
      return new PostgresStorage();
    } catch (error) {
      logger.error("Failed to initialize PostgreSQL storage", error as Error, { source: "storage" });
      logger.info("Falling back to in-memory storage", { source: "storage" });
    }
  }

  // Fallback to in-memory storage
  const { MemStorage } = await import("./memStorage");
  logger.info("Using in-memory storage backend", { source: "storage" });
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
