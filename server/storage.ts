import type {
  Artifact,
  InsertArtifact,
  Bounds,
  CircleSelection,
  AggregationResult,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getAllArtifacts(): Promise<Artifact[]>;
  getArtifact(id: string): Promise<Artifact | undefined>;
  getArtifactsInBounds(bounds: Bounds): Promise<Artifact[]>;
  getArtifactsInCircle(circle: CircleSelection): Promise<Artifact[]>;
  getAggregation(circle: CircleSelection): Promise<AggregationResult>;
  createArtifact(artifact: InsertArtifact): Promise<Artifact>;
  createManyArtifacts(artifacts: InsertArtifact[]): Promise<Artifact[]>;
  getArtifactCount(): Promise<number>;
}

export class MemStorage implements IStorage {
  private artifacts: Map<string, Artifact>;

  constructor() {
    this.artifacts = new Map();
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

    console.log(`Seeded ${this.artifacts.size} artifacts`);
  }

  async getAllArtifacts(): Promise<Artifact[]> {
    return Array.from(this.artifacts.values());
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    return this.artifacts.get(id);
  }

  async getArtifactsInBounds(bounds: Bounds): Promise<Artifact[]> {
    return Array.from(this.artifacts.values()).filter(
      (artifact) =>
        artifact.lat >= bounds.south &&
        artifact.lat <= bounds.north &&
        artifact.lng >= bounds.west &&
        artifact.lng <= bounds.east
    );
  }

  async getArtifactsInCircle(circle: CircleSelection): Promise<Artifact[]> {
    const { center, radius } = circle;
    const radiusInDegrees = radius / 111320;

    const candidates = Array.from(this.artifacts.values()).filter(
      (artifact) =>
        artifact.lat >= center.lat - radiusInDegrees &&
        artifact.lat <= center.lat + radiusInDegrees &&
        artifact.lng >= center.lng - radiusInDegrees &&
        artifact.lng <= center.lng + radiusInDegrees
    );

    return candidates.filter((artifact) => {
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
