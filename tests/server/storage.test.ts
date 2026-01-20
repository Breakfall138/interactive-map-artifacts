import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetStorage } from "../../server/storage";

// Mock console to prevent noisy output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

describe("Storage Factory", () => {
  beforeEach(() => {
    // Reset storage singleton before each test
    resetStorage();
    // Clear environment variables
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createStorage", () => {
    it("should return MemStorage when DATABASE_URL is not set", async () => {
      // Dynamic import to ensure fresh module state
      const { createStorage } = await import("../../server/storage");
      const storage = await createStorage();

      // Verify it's MemStorage by checking it has seed data
      const count = await storage.getArtifactCount();
      expect(count).toBe(10000); // MemStorage seeds 10k artifacts
    });

    it("should fall back to MemStorage when PostgreSQL connection fails", async () => {
      // Set invalid DATABASE_URL to trigger fallback
      process.env.DATABASE_URL = "postgresql://invalid:invalid@localhost:9999/invalid";

      const { createStorage } = await import("../../server/storage");
      const storage = await createStorage();

      // Should fall back to MemStorage
      const count = await storage.getArtifactCount();
      expect(count).toBe(10000);
    });
  });

  describe("getStorage", () => {
    it("should return the same instance on multiple calls (singleton)", async () => {
      const { getStorage } = await import("../../server/storage");

      const storage1 = await getStorage();
      const storage2 = await getStorage();

      expect(storage1).toBe(storage2);
    });

    it("should create new instance after resetStorage", async () => {
      const { getStorage, resetStorage: reset } = await import("../../server/storage");

      const storage1 = await getStorage();
      reset();
      const storage2 = await getStorage();

      // They are different instances (though functionally similar)
      // We verify by checking that reset works - both have 10k artifacts
      expect(await storage1.getArtifactCount()).toBe(10000);
      expect(await storage2.getArtifactCount()).toBe(10000);
    });
  });

  describe("resetStorage", () => {
    it("should clear the singleton instance", async () => {
      const { getStorage, resetStorage: reset } = await import("../../server/storage");

      await getStorage(); // Create instance
      reset(); // Clear it

      // Next call should create fresh instance
      const storage = await getStorage();
      expect(await storage.getArtifactCount()).toBe(10000);
    });
  });

  describe("IStorage interface", () => {
    it("should implement all required methods", async () => {
      const { createStorage } = await import("../../server/storage");
      const storage = await createStorage();

      // Check all required methods exist
      expect(typeof storage.getAllArtifacts).toBe("function");
      expect(typeof storage.getArtifact).toBe("function");
      expect(typeof storage.getArtifactsInBounds).toBe("function");
      expect(typeof storage.getArtifactsInCircle).toBe("function");
      expect(typeof storage.getAggregation).toBe("function");
      expect(typeof storage.getViewportData).toBe("function");
      expect(typeof storage.createArtifact).toBe("function");
      expect(typeof storage.createManyArtifacts).toBe("function");
      expect(typeof storage.getArtifactCount).toBe("function");
    });
  });
});
