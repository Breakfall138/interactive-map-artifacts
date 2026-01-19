import type {
  Artifact,
  InsertArtifact,
  Bounds,
  CircleSelection,
  AggregationResult,
  ViewportResponse,
} from "@shared/schema";
import { randomUUID } from "crypto";
import RBush from "rbush";

interface RBushItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  artifact: Artifact;
}

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

export class MemStorage implements IStorage {
  private artifacts: Map<string, Artifact>;
  private spatialIndex: RBush<RBushItem>;

  constructor() {
    this.artifacts = new Map();
    this.spatialIndex = new RBush<RBushItem>();
    this.seedData();
  }

  private seedData() {
    const categories = [
      "restaurant",
      "hotel",
      "museum",
      "park",
      "shopping",
      "landmark",
      "transport",
    ];

    const names: Record<string, string[]> = {
      restaurant: [
        "The Golden Spoon",
        "Bella Italia",
        "Sakura Sushi",
        "Le Petit Bistro",
        "Taco Loco",
        "Dragon Palace",
        "The Burger Joint",
        "Mediterranean Grill",
        "Curry House",
        "Pizza Paradise",
      ],
      hotel: [
        "Grand Plaza Hotel",
        "Sunset Inn",
        "City View Suites",
        "The Ritz Manor",
        "Harbor Lodge",
        "Boutique Stay",
        "Urban Retreat",
        "Royal Towers",
        "Comfort Inn",
        "The Residence",
      ],
      museum: [
        "Art Gallery",
        "Natural History Museum",
        "Science Center",
        "Maritime Museum",
        "Modern Art Museum",
        "Heritage Center",
        "Aviation Museum",
        "War Memorial",
        "Cultural Center",
        "History Museum",
      ],
      park: [
        "Central Park",
        "Riverside Gardens",
        "Botanical Garden",
        "Memorial Park",
        "City Square",
        "Waterfront Park",
        "Heritage Trail",
        "Nature Reserve",
        "Community Garden",
        "Sports Complex",
      ],
      shopping: [
        "City Mall",
        "Fashion District",
        "Market Square",
        "Outlet Center",
        "Artisan Market",
        "Tech Hub",
        "Vintage Finds",
        "Designer Row",
        "Local Crafts",
        "Antique Alley",
      ],
      landmark: [
        "Clock Tower",
        "Historic Bridge",
        "Monument Plaza",
        "Cathedral",
        "City Hall",
        "Opera House",
        "Old Fort",
        "Lighthouse",
        "Victory Arch",
        "Founders Statue",
      ],
      transport: [
        "Central Station",
        "Metro Hub",
        "Bus Terminal",
        "Ferry Port",
        "Taxi Stand",
        "Bike Share",
        "Airport Link",
        "Cable Car",
        "Tram Stop",
        "Parking Garage",
      ],
    };

    const centerLat = 40.7128;
    const centerLng = -74.006;
    const spread = 0.15;

    for (let i = 0; i < 12000; i++) {
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
        lat,
        lng,
        description: `A wonderful ${category} located in the heart of the city. Featuring excellent amenities and services.`,
        metadata: {
          rating: (3 + Math.random() * 2).toFixed(1),
          reviews: Math.floor(Math.random() * 500) + 10,
          priceLevel: Math.floor(Math.random() * 4) + 1,
          openNow: Math.random() > 0.3,
        },
        createdAt: new Date(
          Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)
        ).toISOString(),
      };

      this.artifacts.set(artifact.id, artifact);
    }

    this.buildSpatialIndex();
    console.log(`Seeded ${this.artifacts.size} artifacts`);
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

  async getAllArtifacts(): Promise<Artifact[]> {
    return Array.from(this.artifacts.values());
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    return this.artifacts.get(id);
  }

  async getArtifactsInBounds(bounds: Bounds): Promise<Artifact[]> {
    const results = this.spatialIndex.search({
      minX: bounds.west,
      minY: bounds.south,
      maxX: bounds.east,
      maxY: bounds.north,
    });
    return results.map((item) => item.artifact);
  }

  async getArtifactsInCircle(circle: CircleSelection): Promise<Artifact[]> {
    const { center, radius } = circle;
    const radiusInDegrees = radius / 111320;

    // Use spatial index for initial bounding box query
    const candidateItems = this.spatialIndex.search({
      minX: center.lng - radiusInDegrees,
      minY: center.lat - radiusInDegrees,
      maxX: center.lng + radiusInDegrees,
      maxY: center.lat + radiusInDegrees,
    });

    // Filter by actual circle distance
    return candidateItems
      .map((item) => item.artifact)
      .filter((artifact) => {
        const distance = this.haversineDistance(
          center.lat,
          center.lng,
          artifact.lat,
          artifact.lng
        );
        return distance <= radius;
      });
  }

  async getAggregation(circle: CircleSelection): Promise<AggregationResult> {
    const artifacts = await this.getArtifactsInCircle(circle);

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
      createdAt: new Date().toISOString(),
    };
    this.artifacts.set(id, artifact);

    // Add to spatial index
    this.spatialIndex.insert({
      minX: artifact.lng,
      minY: artifact.lat,
      maxX: artifact.lng,
      maxY: artifact.lat,
      artifact,
    });

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

  async getArtifactCount(): Promise<number> {
    return this.artifacts.size;
  }

  async getViewportData(
    bounds: Bounds,
    zoom: number,
    limit: number
  ): Promise<ViewportResponse> {
    // Get artifacts in viewport using spatial index
    const artifacts = await this.getArtifactsInBounds(bounds);
    const total = artifacts.length;

    // At high zoom levels (>= 13), return individual artifacts
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

    // At lower zoom levels, perform server-side clustering
    const gridSize = this.getClusterGridSize(zoom);
    const grid = new Map<string, Artifact[]>();

    // Group artifacts into grid cells
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

    // Convert grid cells to clusters or singles
    grid.forEach((cellArtifacts, key) => {
      if (cellArtifacts.length > 3) {
        // Create cluster
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
        // Add as individual markers
        singles.push(...cellArtifacts);
      }
    });

    // Apply limit to the combined results
    const combinedCount = clusters.length + singles.length;
    const truncated = combinedCount > limit;

    if (truncated) {
      // Prioritize clusters over singles when truncating
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

export const storage = new MemStorage();
