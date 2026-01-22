import type {
  Artifact,
  InsertArtifact,
  Bounds,
  CircleSelection,
  AggregationResult,
  ViewportResponse,
  Layer,
} from "@shared/schema";
import { randomUUID } from "crypto";
import RBush from "rbush";
import type { IStorage } from "./storage";

interface RBushItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  artifact: Artifact;
}

export class MemStorage implements IStorage {
  private artifacts: Map<string, Artifact>;
  private spatialIndex: RBush<RBushItem>;
  private layers: Map<string, Layer>;

  constructor(seedData: boolean = true) {
    this.artifacts = new Map();
    this.spatialIndex = new RBush<RBushItem>();
    this.layers = new Map();
    this.initializeLayers();
    if (seedData) {
      this.seedData();
    }
  }

  private initializeLayers() {
    this.layers.set("utility-poc", {
      id: "utility-poc",
      name: "CT Utility POC",
      description: "Connecticut utility infrastructure seed data",
      source: "generated",
      artifactCount: 0,
      visible: true,
    });
    this.layers.set("eversource-substations", {
      id: "eversource-substations",
      name: "Eversource Substations",
      description: "HIFLD transmission substations in Eversource territory (CT/MA/NH)",
      source: "HIFLD/ORNL",
      artifactCount: 0,
      visible: true,
    });
  }

  private seedData() {
    // Seed Connecticut utility data for in-memory fallback
    const categories = [
      "substation",
      "transformer",
      "pole",
      "meter",
      "transmission_line",
      "distribution_line",
      "switch",
      "capacitor_bank",
    ];

    const names: Record<string, string[]> = {
      substation: [
        "Hartford Substation",
        "New Haven Substation",
        "Bridgeport Substation",
        "Stamford Substation",
        "Waterbury Substation",
      ],
      transformer: [
        "Distribution Transformer",
        "Pad-Mount Transformer",
        "Pole-Mount Transformer",
        "Network Transformer",
      ],
      pole: [
        "Utility Pole",
        "Transmission Pole",
        "Distribution Pole",
        "Junction Pole",
      ],
      meter: [
        "Smart Meter",
        "Digital Meter",
        "Commercial Meter",
        "Industrial Meter",
      ],
      transmission_line: [
        "115kV Line",
        "345kV Line",
        "69kV Line",
        "Transmission Corridor",
      ],
      distribution_line: [
        "Primary Line",
        "Secondary Line",
        "Service Drop",
        "Feeder Line",
      ],
      switch: [
        "Recloser",
        "Sectionalizer",
        "Disconnect Switch",
        "Load Break Switch",
      ],
      capacitor_bank: [
        "Pole-Mounted Capacitor",
        "Substation Capacitor Bank",
        "Switched Capacitor",
      ],
    };

    // Connecticut center coordinates
    const centerLat = 41.5;
    const centerLng = -72.7;
    const spread = 0.5;

    for (let i = 0; i < 10000; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const nameList = names[category];
      const baseName = nameList[Math.floor(Math.random() * nameList.length)];

      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * spread;
      const lat = centerLat + Math.sin(angle) * distance;
      const lng = centerLng + Math.cos(angle) * distance * 1.3;

      const artifact: Artifact = {
        id: randomUUID(),
        name: `${baseName} #${i + 1}`,
        category,
        layer: "utility-poc",
        lat,
        lng,
        description: `Eversource ${category.replace(/_/g, " ")} in Connecticut service territory.`,
        metadata: {
          voltage:
            category === "substation" || category === "transmission_line"
              ? ["69kV", "115kV", "345kV"][Math.floor(Math.random() * 3)]
              : category === "transformer" || category === "distribution_line"
                ? ["4kV", "13.8kV", "23kV"][Math.floor(Math.random() * 3)]
                : undefined,
          status: ["active", "active", "active", "maintenance", "planned"][
            Math.floor(Math.random() * 5)
          ],
          install_year: 1980 + Math.floor(Math.random() * 45),
          asset_id: `ES-CT-${category.substring(0, 3).toUpperCase()}-${String(i).padStart(6, "0")}`,
          region: "connecticut",
          utility: "eversource",
        },
        createdAt: new Date(
          Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)
        ).toISOString(),
      };

      this.artifacts.set(artifact.id, artifact);
    }

    this.buildSpatialIndex();
    this.updateLayerCounts();
    // Log seeding info - use dynamic import to avoid initialization issues
    import("./logging/logger").then(async ({ getLogger }) => {
      const logger = await getLogger();
      logger.info(`Seeded ${this.artifacts.size} artifacts (in-memory)`, { source: "storage" });
    });
  }

  private updateLayerCounts() {
    const counts = new Map<string, number>();
    Array.from(this.artifacts.values()).forEach((artifact) => {
      const layer = artifact.layer || "default";
      counts.set(layer, (counts.get(layer) || 0) + 1);
    });
    Array.from(this.layers.entries()).forEach(([layerId, layer]) => {
      layer.artifactCount = counts.get(layerId) || 0;
    });
  }

  private buildSpatialIndex() {
    const items: RBushItem[] = Array.from(this.artifacts.values()).map((artifact) => ({
      minX: artifact.lng,
      minY: artifact.lat,
      maxX: artifact.lng,
      maxY: artifact.lat,
      artifact,
    }));
    this.spatialIndex.load(items);
  }

  async getAllArtifacts(layers?: string[]): Promise<Artifact[]> {
    let artifacts = Array.from(this.artifacts.values());
    if (layers?.length) {
      artifacts = artifacts.filter((a) => layers.includes(a.layer || "default"));
    }
    return artifacts;
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    return this.artifacts.get(id);
  }

  async getArtifactsInBounds(bounds: Bounds, layers?: string[]): Promise<Artifact[]> {
    const results = this.spatialIndex.search({
      minX: bounds.west,
      minY: bounds.south,
      maxX: bounds.east,
      maxY: bounds.north,
    });
    let artifacts = results.map((item: RBushItem) => item.artifact);
    if (layers?.length) {
      artifacts = artifacts.filter((a: Artifact) => layers.includes(a.layer || "default"));
    }
    return artifacts;
  }

  async getArtifactsInCircle(circle: CircleSelection, layers?: string[]): Promise<Artifact[]> {
    const { center, radius } = circle;
    const radiusInDegrees = radius / 111320;

    const candidateItems = this.spatialIndex.search({
      minX: center.lng - radiusInDegrees,
      minY: center.lat - radiusInDegrees,
      maxX: center.lng + radiusInDegrees,
      maxY: center.lat + radiusInDegrees,
    });

    let artifacts = candidateItems
      .map((item: RBushItem) => item.artifact)
      .filter((artifact: Artifact) => {
        const distance = this.haversineDistance(
          center.lat,
          center.lng,
          artifact.lat,
          artifact.lng
        );
        return distance <= radius;
      });

    if (layers?.length) {
      artifacts = artifacts.filter((a: Artifact) => layers.includes(a.layer || "default"));
    }
    return artifacts;
  }

  async getAggregation(circle: CircleSelection, layers?: string[]): Promise<AggregationResult> {
    const artifacts = await this.getArtifactsInCircle(circle, layers);

    const categories: Record<string, number> = {};
    artifacts.forEach((artifact) => {
      categories[artifact.category] = (categories[artifact.category] || 0) + 1;
    });

    return {
      count: artifacts.length,
      categories,
      artifacts,
    };
  }

  async createArtifact(insertArtifact: InsertArtifact): Promise<Artifact> {
    const id = randomUUID();
    const artifact: Artifact = {
      ...insertArtifact,
      id,
      layer: insertArtifact.layer || "default",
      createdAt: new Date().toISOString(),
    };
    this.artifacts.set(id, artifact);

    this.spatialIndex.insert({
      minX: artifact.lng,
      minY: artifact.lat,
      maxX: artifact.lng,
      maxY: artifact.lat,
      artifact,
    });

    // Update layer count
    const layer = this.layers.get(artifact.layer);
    if (layer) {
      layer.artifactCount++;
    }

    return artifact;
  }

  async createManyArtifacts(insertArtifacts: InsertArtifact[]): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    for (const insert of insertArtifacts) {
      const artifact = await this.createArtifact(insert);
      artifacts.push(artifact);
    }
    return artifacts;
  }

  async getArtifactCount(layers?: string[]): Promise<number> {
    if (layers?.length) {
      return Array.from(this.artifacts.values()).filter((a) =>
        layers.includes(a.layer || "default")
      ).length;
    }
    return this.artifacts.size;
  }

  async getViewportData(
    bounds: Bounds,
    zoom: number,
    limit: number,
    layers?: string[]
  ): Promise<ViewportResponse> {
    const artifacts = await this.getArtifactsInBounds(bounds, layers);
    const total = artifacts.length;

    if (zoom >= 13) {
      const truncated = artifacts.length > limit;
      const singles = truncated ? artifacts.slice(0, limit) : artifacts;
      return {
        clusters: [],
        singles,
        total,
        truncated,
      };
    }

    const gridSize = this.getClusterGridSize(zoom);
    const grid = new Map<string, Artifact[]>();

    artifacts.forEach((artifact) => {
      const cellX = Math.floor(artifact.lng / gridSize);
      const cellY = Math.floor(artifact.lat / gridSize);
      const key = `${cellX}:${cellY}`;

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(artifact);
    });

    const clusters: Array<{ id: string; lat: number; lng: number; count: number }> = [];
    const singles: Artifact[] = [];

    grid.forEach((cellArtifacts, key) => {
      if (cellArtifacts.length > 3) {
        const centerLat =
          cellArtifacts.reduce((sum, a) => sum + a.lat, 0) / cellArtifacts.length;
        const centerLng =
          cellArtifacts.reduce((sum, a) => sum + a.lng, 0) / cellArtifacts.length;

        clusters.push({
          id: `cluster-${key}`,
          lat: centerLat,
          lng: centerLng,
          count: cellArtifacts.length,
        });
      } else {
        singles.push(...cellArtifacts);
      }
    });

    const combinedCount = clusters.length + singles.length;
    const truncated = combinedCount > limit;

    if (truncated) {
      if (clusters.length <= limit) {
        const remainingLimit = limit - clusters.length;
        return {
          clusters,
          singles: singles.slice(0, remainingLimit),
          total,
          truncated: true,
        };
      } else {
        return {
          clusters: clusters.slice(0, limit),
          singles: [],
          total,
          truncated: true,
        };
      }
    }

    return {
      clusters,
      singles,
      total,
      truncated: false,
    };
  }

  private getClusterGridSize(zoom: number): number {
    if (zoom <= 6) return 2;
    if (zoom <= 8) return 1;
    if (zoom <= 10) return 0.5;
    if (zoom <= 12) return 0.1;
    return 0.05;
  }

  // Layer management methods
  async getLayers(): Promise<Layer[]> {
    return Array.from(this.layers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getLayer(id: string): Promise<Layer | undefined> {
    return this.layers.get(id);
  }

  async createLayer(layer: Omit<Layer, "artifactCount">): Promise<Layer> {
    const newLayer: Layer = {
      ...layer,
      artifactCount: 0,
    };
    this.layers.set(layer.id, newLayer);
    return newLayer;
  }

  async updateLayerVisibility(id: string, visible: boolean): Promise<void> {
    const layer = this.layers.get(id);
    if (layer) {
      layer.visible = visible;
    }
  }

  async deleteLayer(id: string): Promise<void> {
    // Delete all artifacts in the layer
    const toDelete: string[] = [];
    Array.from(this.artifacts.entries()).forEach(([artifactId, artifact]) => {
      if (artifact.layer === id) {
        toDelete.push(artifactId);
      }
    });
    toDelete.forEach((artifactId) => this.artifacts.delete(artifactId));

    // Rebuild spatial index
    this.spatialIndex = new RBush<RBushItem>();
    this.buildSpatialIndex();

    // Delete the layer
    this.layers.delete(id);
  }

  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
