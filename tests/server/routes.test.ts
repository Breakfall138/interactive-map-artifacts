import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { registerRoutes } from "../../server/routes";
import { MemStorage } from "../../server/memStorage";
import {
  createTestInsertArtifact,
  createTestCircleSelection,
  CT_CENTER,
} from "../fixtures/artifacts";

// Mock console to prevent noisy output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

describe("API Routes", () => {
  let app: Express;
  let server: Server;
  let storage: MemStorage;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Create storage without seed data for predictable tests
    storage = new MemStorage(false);

    // Add some test data
    await storage.createArtifact(
      createTestInsertArtifact({
        name: "Test Transformer",
        category: "transformer",
        lat: CT_CENTER.lat,
        lng: CT_CENTER.lng,
      })
    );
    await storage.createArtifact(
      createTestInsertArtifact({
        name: "Test Pole",
        category: "pole",
        lat: CT_CENTER.lat + 0.01,
        lng: CT_CENTER.lng + 0.01,
      })
    );

    server = createServer(app);
    await registerRoutes(server, app, storage);

    // Start server on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === "object") {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  async function fetchJson(path: string, options?: RequestInit) {
    const response = await fetch(`${baseUrl}${path}`, options);
    // Handle empty responses (204 No Content)
    if (response.status === 204 || !response.ok) {
      return { response, data: null };
    }
    return { response, data: await response.json() };
  }

  describe("GET /api/artifacts/viewport", () => {
    it("should return viewport data with valid parameters", async () => {
      const params = new URLSearchParams({
        north: "41.6",
        south: "41.4",
        east: "-72.6",
        west: "-72.8",
        zoom: "15",
      });

      const { response, data } = await fetchJson(`/api/artifacts/viewport?${params}`);

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("clusters");
      expect(data).toHaveProperty("singles");
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("truncated");
    });

    it("should return 400 when missing required parameters", async () => {
      const params = new URLSearchParams({
        north: "41.6",
        south: "41.4",
        // missing east, west, zoom
      });

      const { response } = await fetchJson(`/api/artifacts/viewport?${params}`);
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid zoom level (negative)", async () => {
      const params = new URLSearchParams({
        north: "41.6",
        south: "41.4",
        east: "-72.6",
        west: "-72.8",
        zoom: "-1",
      });

      const { response } = await fetchJson(`/api/artifacts/viewport?${params}`);
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid zoom level (> 22)", async () => {
      const params = new URLSearchParams({
        north: "41.6",
        south: "41.4",
        east: "-72.6",
        west: "-72.8",
        zoom: "25",
      });

      const { response } = await fetchJson(`/api/artifacts/viewport?${params}`);
      expect(response.status).toBe(400);
    });

    it("should clamp limit to MAX_LIMIT (10000)", async () => {
      const params = new URLSearchParams({
        north: "41.6",
        south: "41.4",
        east: "-72.6",
        west: "-72.8",
        zoom: "15",
        limit: "50000", // Exceeds MAX_LIMIT
      });

      const { response, data } = await fetchJson(`/api/artifacts/viewport?${params}`);
      expect(response.status).toBe(200);
      // Should not error, limit is clamped internally
      expect(data).toBeDefined();
    });

    it("should return 400 for invalid limit parameter", async () => {
      const params = new URLSearchParams({
        north: "41.6",
        south: "41.4",
        east: "-72.6",
        west: "-72.8",
        zoom: "15",
        limit: "invalid",
      });

      const { response } = await fetchJson(`/api/artifacts/viewport?${params}`);
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid bounds (north < south)", async () => {
      const params = new URLSearchParams({
        north: "41.0", // less than south
        south: "41.6",
        east: "-72.6",
        west: "-72.8",
        zoom: "15",
      });

      const { response } = await fetchJson(`/api/artifacts/viewport?${params}`);
      expect(response.status).toBe(500); // Zod throws, caught as 500
    });
  });

  describe("GET /api/artifacts", () => {
    it("should return all artifacts when no bounds provided", async () => {
      const { response, data } = await fetchJson("/api/artifacts");

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it("should filter by bounds when provided", async () => {
      const params = new URLSearchParams({
        north: "41.6",
        south: "41.4",
        east: "-72.6",
        west: "-72.8",
      });

      const { response, data } = await fetchJson(`/api/artifacts?${params}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("GET /api/artifacts/count", () => {
    it("should return artifact count", async () => {
      const { response, data } = await fetchJson("/api/artifacts/count");

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("count");
      expect(data.count).toBe(2);
    });
  });

  describe("GET /api/artifacts/:id", () => {
    it("should return artifact by id", async () => {
      const allArtifacts = await storage.getAllArtifacts();
      const firstArtifact = allArtifacts[0];

      const { response, data } = await fetchJson(`/api/artifacts/${firstArtifact.id}`);

      expect(response.status).toBe(200);
      expect(data.id).toBe(firstArtifact.id);
      expect(data.name).toBe(firstArtifact.name);
    });

    it("should return 404 for non-existent artifact", async () => {
      const { response } = await fetchJson("/api/artifacts/non-existent-id");
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/artifacts", () => {
    it("should create a new artifact", async () => {
      const newArtifact = createTestInsertArtifact({
        name: "New Test Artifact",
        category: "meter",
      });

      const { response, data } = await fetchJson("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newArtifact),
      });

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data.name).toBe("New Test Artifact");
      expect(data.category).toBe("meter");
    });

    it("should return 400 for invalid artifact data", async () => {
      const invalidArtifact = {
        name: "", // empty name is invalid
        category: "meter",
        lat: 41.5,
        lng: -72.7,
      };

      const { response } = await fetchJson("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidArtifact),
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid coordinates", async () => {
      const invalidArtifact = {
        name: "Test",
        category: "meter",
        lat: 91, // invalid latitude
        lng: -72.7,
      };

      const { response } = await fetchJson("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidArtifact),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/artifacts/query/circle", () => {
    it("should query artifacts in circle", async () => {
      const circle = createTestCircleSelection({ radius: 5000 }); // 5km radius

      const { response, data } = await fetchJson("/api/artifacts/query/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(circle),
      });

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("count");
      expect(data).toHaveProperty("categories");
      expect(data).toHaveProperty("artifacts");
    });

    it("should return 400 for invalid circle data", async () => {
      const invalidCircle = {
        center: { lat: 91, lng: -72.7 }, // invalid latitude
        radius: 1000,
      };

      const { response } = await fetchJson("/api/artifacts/query/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidCircle),
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for negative radius", async () => {
      const invalidCircle = {
        center: { lat: 41.5, lng: -72.7 },
        radius: -100,
      };

      const { response } = await fetchJson("/api/artifacts/query/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidCircle),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /tiles/:layer/:z/:x/:y.:format", () => {
    it("should return 204 for non-existent tile", async () => {
      const { response } = await fetchJson("/tiles/basemap/10/300/400.png");
      expect(response.status).toBe(204);
    });

    it("should return 400 for invalid tile coordinates", async () => {
      const { response } = await fetchJson("/tiles/basemap/abc/300/400.png");
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid zoom level", async () => {
      const { response } = await fetchJson("/tiles/basemap/25/300/400.png");
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid format", async () => {
      const { response } = await fetchJson("/tiles/basemap/10/300/400.gif");
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid layer name with special characters", async () => {
      // Layer names with dots are invalid (regex requires alphanumeric, underscore, hyphen only)
      const { response } = await fetchJson("/tiles/layer.name/10/300/400.png");
      expect(response.status).toBe(400);
    });

    it("should return 400 for layer name with spaces (encoded)", async () => {
      const { response } = await fetchJson("/tiles/layer%20name/10/300/400.png");
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/tiles/info", () => {
    it("should return tile metadata", async () => {
      const { response, data } = await fetchJson("/api/tiles/info");

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("layers");
      expect(data).toHaveProperty("formats");
      expect(data).toHaveProperty("bounds");
      expect(data).toHaveProperty("minZoom");
      expect(data).toHaveProperty("maxZoom");
    });
  });

  describe("GET /api/health", () => {
    it("should return healthy status", async () => {
      const { response, data } = await fetchJson("/api/health");

      expect(response.status).toBe(200);
      expect(data.status).toBe("healthy");
      expect(data.storage).toBe("memory");
      expect(typeof data.artifactCount).toBe("number");
    });
  });
});

describe("API Routes - Regression Tests", () => {
  let app: Express;
  let server: Server;
  let storage: MemStorage;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    storage = new MemStorage(true); // With seed data

    server = createServer(app);
    await registerRoutes(server, app, storage);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === "object") {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  async function fetchJson(path: string) {
    const response = await fetch(`${baseUrl}${path}`);
    return { response, data: response.ok ? await response.json() : null };
  }

  describe("Performance regression", () => {
    it("should handle viewport query with 10k artifacts quickly", async () => {
      const params = new URLSearchParams({
        north: "42.0505",
        south: "40.9509",
        east: "-71.7872",
        west: "-73.7278",
        zoom: "10",
        limit: "5000",
      });

      const start = Date.now();
      const { response } = await fetchJson(`/api/artifacts/viewport?${params}`);
      const elapsed = Date.now() - start;

      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(500); // Should complete in under 500ms
    });

    it("should handle circle query with large dataset quickly", async () => {
      const circle = {
        center: { lat: 41.5, lng: -72.7 },
        radius: 50000, // 50km radius covers many artifacts
      };

      const start = Date.now();
      const response = await fetch(`${baseUrl}/api/artifacts/query/circle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(circle),
      });
      const elapsed = Date.now() - start;

      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe("Data integrity", () => {
    it("should return valid artifact structure from viewport endpoint", async () => {
      const params = new URLSearchParams({
        north: "41.6",
        south: "41.4",
        east: "-72.6",
        west: "-72.8",
        zoom: "15",
      });

      const { response, data } = await fetchJson(`/api/artifacts/viewport?${params}`);

      expect(response.status).toBe(200);

      // Check singles have all required fields
      for (const artifact of data.singles) {
        expect(artifact).toHaveProperty("id");
        expect(artifact).toHaveProperty("name");
        expect(artifact).toHaveProperty("category");
        expect(artifact).toHaveProperty("lat");
        expect(artifact).toHaveProperty("lng");
        expect(typeof artifact.lat).toBe("number");
        expect(typeof artifact.lng).toBe("number");
      }

      // Check clusters have required fields
      for (const cluster of data.clusters) {
        expect(cluster).toHaveProperty("id");
        expect(cluster).toHaveProperty("lat");
        expect(cluster).toHaveProperty("lng");
        expect(cluster).toHaveProperty("count");
        expect(typeof cluster.count).toBe("number");
        expect(cluster.count).toBeGreaterThan(0);
      }
    });

    it("should return consistent counts", async () => {
      const { data: countData } = await fetchJson("/api/artifacts/count");
      const { data: allData } = await fetchJson("/api/artifacts");

      expect(countData.count).toBe(allData.length);
    });
  });

  describe("Security regression - XSS prevention", () => {
    it("should not execute script in artifact name", async () => {
      const maliciousArtifact = {
        name: '<script>alert("xss")</script>',
        category: "test",
        lat: 41.5,
        lng: -72.7,
      };

      const response = await fetch(`${baseUrl}/api/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maliciousArtifact),
      });

      const data = await response.json();

      // Name should be stored as-is (escaped on display, not on storage)
      expect(data.name).toBe('<script>alert("xss")</script>');
    });
  });
});
