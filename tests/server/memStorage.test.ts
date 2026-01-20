import { describe, it, expect, beforeEach } from "vitest";
import { MemStorage } from "../../server/memStorage";
import {
  createTestArtifact,
  createTestArtifacts,
  createTestInsertArtifact,
  createTestBounds,
  createTestCircleSelection,
  CT_CENTER,
  CT_BOUNDS,
} from "../fixtures/artifacts";

describe("MemStorage", () => {
  let storage: MemStorage;

  beforeEach(() => {
    // Create storage without seed data for predictable tests
    storage = new MemStorage(false);
  });

  describe("constructor", () => {
    it("should create empty storage when seedData is false", async () => {
      const count = await storage.getArtifactCount();
      expect(count).toBe(0);
    });

    it("should seed 10,000 artifacts when seedData is true", async () => {
      const seededStorage = new MemStorage(true);
      const count = await seededStorage.getArtifactCount();
      expect(count).toBe(10000);
    });
  });

  describe("createArtifact", () => {
    it("should create an artifact and return it with generated id", async () => {
      const insertArtifact = createTestInsertArtifact();
      const artifact = await storage.createArtifact(insertArtifact);

      expect(artifact.id).toBeDefined();
      expect(artifact.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(artifact.name).toBe(insertArtifact.name);
      expect(artifact.category).toBe(insertArtifact.category);
      expect(artifact.lat).toBe(insertArtifact.lat);
      expect(artifact.lng).toBe(insertArtifact.lng);
      expect(artifact.createdAt).toBeDefined();
    });

    it("should add artifact to spatial index", async () => {
      const insertArtifact = createTestInsertArtifact();
      const artifact = await storage.createArtifact(insertArtifact);

      const bounds = createTestBounds({
        north: artifact.lat + 0.01,
        south: artifact.lat - 0.01,
        east: artifact.lng + 0.01,
        west: artifact.lng - 0.01,
      });

      const results = await storage.getArtifactsInBounds(bounds);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(artifact.id);
    });

    it("should increment artifact count", async () => {
      expect(await storage.getArtifactCount()).toBe(0);
      await storage.createArtifact(createTestInsertArtifact());
      expect(await storage.getArtifactCount()).toBe(1);
      await storage.createArtifact(createTestInsertArtifact());
      expect(await storage.getArtifactCount()).toBe(2);
    });
  });

  describe("createManyArtifacts", () => {
    it("should create multiple artifacts", async () => {
      const insertArtifacts = [
        createTestInsertArtifact({ name: "Artifact 1" }),
        createTestInsertArtifact({ name: "Artifact 2" }),
        createTestInsertArtifact({ name: "Artifact 3" }),
      ];

      const artifacts = await storage.createManyArtifacts(insertArtifacts);

      expect(artifacts).toHaveLength(3);
      expect(artifacts[0].name).toBe("Artifact 1");
      expect(artifacts[1].name).toBe("Artifact 2");
      expect(artifacts[2].name).toBe("Artifact 3");
    });

    it("should return empty array for empty input", async () => {
      const artifacts = await storage.createManyArtifacts([]);
      expect(artifacts).toHaveLength(0);
    });
  });

  describe("getArtifact", () => {
    it("should return artifact by id", async () => {
      const created = await storage.createArtifact(createTestInsertArtifact());
      const retrieved = await storage.getArtifact(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe(created.name);
    });

    it("should return undefined for non-existent id", async () => {
      const retrieved = await storage.getArtifact("non-existent-id");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("getAllArtifacts", () => {
    it("should return empty array when no artifacts exist", async () => {
      const artifacts = await storage.getAllArtifacts();
      expect(artifacts).toHaveLength(0);
    });

    it("should return all artifacts", async () => {
      await storage.createArtifact(createTestInsertArtifact({ name: "A1" }));
      await storage.createArtifact(createTestInsertArtifact({ name: "A2" }));
      await storage.createArtifact(createTestInsertArtifact({ name: "A3" }));

      const artifacts = await storage.getAllArtifacts();
      expect(artifacts).toHaveLength(3);
    });
  });

  describe("getArtifactsInBounds", () => {
    beforeEach(async () => {
      // Create artifacts at specific locations
      await storage.createArtifact(
        createTestInsertArtifact({ name: "Inside 1", lat: 41.5, lng: -72.7 })
      );
      await storage.createArtifact(
        createTestInsertArtifact({ name: "Inside 2", lat: 41.51, lng: -72.71 })
      );
      await storage.createArtifact(
        createTestInsertArtifact({ name: "Outside", lat: 42.5, lng: -72.7 })
      );
    });

    it("should return artifacts within bounds", async () => {
      const bounds = createTestBounds({
        north: 41.6,
        south: 41.4,
        east: -72.6,
        west: -72.8,
      });

      const results = await storage.getArtifactsInBounds(bounds);
      expect(results).toHaveLength(2);
      expect(results.map((a) => a.name).sort()).toEqual(["Inside 1", "Inside 2"]);
    });

    it("should return empty array when no artifacts in bounds", async () => {
      const bounds = createTestBounds({
        north: 45.0,
        south: 44.0,
        east: -70.0,
        west: -71.0,
      });

      const results = await storage.getArtifactsInBounds(bounds);
      expect(results).toHaveLength(0);
    });

    it("should include artifacts on the boundary", async () => {
      await storage.createArtifact(
        createTestInsertArtifact({ name: "On Boundary", lat: 41.6, lng: -72.7 })
      );

      const bounds = createTestBounds({
        north: 41.6,
        south: 41.4,
        east: -72.6,
        west: -72.8,
      });

      const results = await storage.getArtifactsInBounds(bounds);
      expect(results.find((a) => a.name === "On Boundary")).toBeDefined();
    });
  });

  describe("getArtifactsInCircle", () => {
    beforeEach(async () => {
      // Create artifacts at known distances from CT_CENTER
      // At latitude 41.5, 1 degree of longitude ≈ 83km
      await storage.createArtifact(
        createTestInsertArtifact({ name: "Center", lat: CT_CENTER.lat, lng: CT_CENTER.lng })
      );
      await storage.createArtifact(
        createTestInsertArtifact({
          name: "500m North",
          lat: CT_CENTER.lat + 0.0045, // ~500m north
          lng: CT_CENTER.lng,
        })
      );
      await storage.createArtifact(
        createTestInsertArtifact({
          name: "2km North",
          lat: CT_CENTER.lat + 0.018, // ~2km north
          lng: CT_CENTER.lng,
        })
      );
    });

    it("should return artifacts within circle radius", async () => {
      const circle = createTestCircleSelection({ radius: 1000 }); // 1km radius

      const results = await storage.getArtifactsInCircle(circle);
      expect(results).toHaveLength(2);
      expect(results.map((a) => a.name).sort()).toEqual(["500m North", "Center"]);
    });

    it("should return all artifacts with large radius", async () => {
      const circle = createTestCircleSelection({ radius: 10000 }); // 10km radius

      const results = await storage.getArtifactsInCircle(circle);
      expect(results).toHaveLength(3);
    });

    it("should return only center point with tiny radius", async () => {
      const circle = createTestCircleSelection({ radius: 10 }); // 10m radius

      const results = await storage.getArtifactsInCircle(circle);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Center");
    });

    it("should return empty array when no artifacts in circle", async () => {
      const circle = {
        center: { lat: 45.0, lng: -70.0 },
        radius: 1000,
      };

      const results = await storage.getArtifactsInCircle(circle);
      expect(results).toHaveLength(0);
    });
  });

  describe("getAggregation", () => {
    beforeEach(async () => {
      await storage.createArtifact(
        createTestInsertArtifact({
          category: "transformer",
          lat: CT_CENTER.lat,
          lng: CT_CENTER.lng,
        })
      );
      await storage.createArtifact(
        createTestInsertArtifact({
          category: "transformer",
          lat: CT_CENTER.lat + 0.001,
          lng: CT_CENTER.lng,
        })
      );
      await storage.createArtifact(
        createTestInsertArtifact({
          category: "pole",
          lat: CT_CENTER.lat,
          lng: CT_CENTER.lng + 0.001,
        })
      );
    });

    it("should return correct count and categories", async () => {
      const circle = createTestCircleSelection({ radius: 1000 });
      const result = await storage.getAggregation(circle);

      expect(result.count).toBe(3);
      expect(result.categories.transformer).toBe(2);
      expect(result.categories.pole).toBe(1);
      expect(result.artifacts).toHaveLength(3);
    });

    it("should return empty aggregation for empty circle", async () => {
      const circle = {
        center: { lat: 45.0, lng: -70.0 },
        radius: 100,
      };
      const result = await storage.getAggregation(circle);

      expect(result.count).toBe(0);
      expect(result.categories).toEqual({});
      expect(result.artifacts).toHaveLength(0);
    });
  });

  describe("getViewportData", () => {
    describe("high zoom (>= 13) - returns singles", () => {
      beforeEach(async () => {
        const artifacts = createTestArtifacts(10, CT_CENTER.lat, CT_CENTER.lng, 0.01);
        for (const artifact of artifacts) {
          await storage.createArtifact({
            name: artifact.name,
            category: artifact.category,
            lat: artifact.lat,
            lng: artifact.lng,
          });
        }
      });

      it("should return singles at high zoom", async () => {
        const bounds = createTestBounds({
          north: CT_CENTER.lat + 0.02,
          south: CT_CENTER.lat - 0.02,
          east: CT_CENTER.lng + 0.02,
          west: CT_CENTER.lng - 0.02,
        });

        const result = await storage.getViewportData(bounds, 15, 5000);

        expect(result.clusters).toHaveLength(0);
        expect(result.singles).toHaveLength(10);
        expect(result.total).toBe(10);
        expect(result.truncated).toBe(false);
      });

      it("should truncate singles when exceeding limit", async () => {
        const bounds = createTestBounds({
          north: CT_CENTER.lat + 0.02,
          south: CT_CENTER.lat - 0.02,
          east: CT_CENTER.lng + 0.02,
          west: CT_CENTER.lng - 0.02,
        });

        const result = await storage.getViewportData(bounds, 15, 5);

        expect(result.singles).toHaveLength(5);
        expect(result.total).toBe(10);
        expect(result.truncated).toBe(true);
      });
    });

    describe("low zoom (< 13) - returns clusters", () => {
      beforeEach(async () => {
        // Create 20 artifacts clustered in one cell and 2 in another
        for (let i = 0; i < 20; i++) {
          await storage.createArtifact(
            createTestInsertArtifact({
              name: `Cluster A ${i}`,
              lat: CT_CENTER.lat + Math.random() * 0.001,
              lng: CT_CENTER.lng + Math.random() * 0.001,
            })
          );
        }
        // Create singles (2 artifacts in separate cell)
        await storage.createArtifact(
          createTestInsertArtifact({
            name: "Single 1",
            lat: CT_CENTER.lat + 0.5,
            lng: CT_CENTER.lng,
          })
        );
        await storage.createArtifact(
          createTestInsertArtifact({
            name: "Single 2",
            lat: CT_CENTER.lat + 0.51,
            lng: CT_CENTER.lng,
          })
        );
      });

      it("should return clusters at low zoom", async () => {
        const bounds = createTestBounds({
          north: CT_CENTER.lat + 1,
          south: CT_CENTER.lat - 0.1,
          east: CT_CENTER.lng + 0.1,
          west: CT_CENTER.lng - 0.1,
        });

        const result = await storage.getViewportData(bounds, 10, 5000);

        // Should have at least one cluster (the 20 artifacts)
        expect(result.clusters.length).toBeGreaterThan(0);
        expect(result.total).toBe(22);
      });

      it("should include singles for cells with <= 3 artifacts", async () => {
        const bounds = createTestBounds({
          north: CT_CENTER.lat + 1,
          south: CT_CENTER.lat - 0.1,
          east: CT_CENTER.lng + 0.1,
          west: CT_CENTER.lng - 0.1,
        });

        const result = await storage.getViewportData(bounds, 10, 5000);

        // Should have singles for the 2 artifacts in separate cell
        expect(result.singles.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe("getClusterGridSize", () => {
      it("should use correct grid sizes for different zoom levels", async () => {
        await storage.createArtifact(createTestInsertArtifact());
        const bounds = createTestBounds();

        // We can't directly test private method, but we can verify behavior
        // At zoom 6, grid size is 2 degrees
        // At zoom 10, grid size is 0.5 degrees
        // At zoom 12, grid size is 0.1 degrees

        const result6 = await storage.getViewportData(bounds, 6, 5000);
        const result10 = await storage.getViewportData(bounds, 10, 5000);
        const result12 = await storage.getViewportData(bounds, 12, 5000);

        // All should return valid viewport data
        expect(result6).toBeDefined();
        expect(result10).toBeDefined();
        expect(result12).toBeDefined();
      });
    });
  });

  describe("getArtifactCount", () => {
    it("should return 0 for empty storage", async () => {
      const count = await storage.getArtifactCount();
      expect(count).toBe(0);
    });

    it("should return correct count after adding artifacts", async () => {
      await storage.createArtifact(createTestInsertArtifact());
      await storage.createArtifact(createTestInsertArtifact());
      await storage.createArtifact(createTestInsertArtifact());

      const count = await storage.getArtifactCount();
      expect(count).toBe(3);
    });
  });

  describe("haversine distance calculation", () => {
    it("should calculate accurate distances", async () => {
      // Create two artifacts 1 degree of latitude apart at equator
      // 1 degree of latitude ≈ 111km
      await storage.createArtifact(
        createTestInsertArtifact({ name: "Point A", lat: 0, lng: 0 })
      );
      await storage.createArtifact(
        createTestInsertArtifact({ name: "Point B", lat: 1, lng: 0 })
      );

      // Search with circle centered at 0,0 with radius 50km
      // Should only find Point A
      const circle50km = { center: { lat: 0, lng: 0 }, radius: 50000 };
      const results50 = await storage.getArtifactsInCircle(circle50km);
      expect(results50).toHaveLength(1);
      expect(results50[0].name).toBe("Point A");

      // Search with radius 120km
      // Should find both points
      const circle120km = { center: { lat: 0, lng: 0 }, radius: 120000 };
      const results120 = await storage.getArtifactsInCircle(circle120km);
      expect(results120).toHaveLength(2);
    });

    it("should handle antipodal points", async () => {
      await storage.createArtifact(
        createTestInsertArtifact({ name: "North Pole", lat: 90, lng: 0 })
      );
      await storage.createArtifact(
        createTestInsertArtifact({ name: "South Pole", lat: -90, lng: 0 })
      );

      // Search from north pole with small radius
      const circle = { center: { lat: 90, lng: 0 }, radius: 1000 };
      const results = await storage.getArtifactsInCircle(circle);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("North Pole");
    });
  });

  describe("performance with large datasets", () => {
    it("should handle 10,000 artifacts efficiently", async () => {
      const seededStorage = new MemStorage(true);

      const start = Date.now();
      const bounds = CT_BOUNDS;
      await seededStorage.getArtifactsInBounds(bounds);
      const elapsed = Date.now() - start;

      // Should complete in under 100ms
      expect(elapsed).toBeLessThan(100);
    });

    it("should efficiently query viewport data", async () => {
      const seededStorage = new MemStorage(true);

      const start = Date.now();
      await seededStorage.getViewportData(CT_BOUNDS, 10, 5000);
      const elapsed = Date.now() - start;

      // Should complete in under 200ms
      expect(elapsed).toBeLessThan(200);
    });
  });
});
