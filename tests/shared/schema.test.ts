import { describe, it, expect } from "vitest";
import {
  artifactSchema,
  insertArtifactSchema,
  boundsSchema,
  circleSelectionSchema,
  viewportQuerySchema,
  areaQuerySchema,
  aggregationResultSchema,
  clusterDataSchema,
  viewportResponseSchema,
  layerSchema,
} from "@shared/schema";
import {
  createTestArtifact,
  createTestBounds,
  createTestCircleSelection,
  INVALID_COORDINATES,
  BOUNDARY_COORDINATES,
} from "../fixtures/artifacts";

describe("Zod Schemas", () => {
  describe("artifactSchema", () => {
    it("should validate a valid artifact", () => {
      const artifact = createTestArtifact();
      const result = artifactSchema.safeParse(artifact);
      expect(result.success).toBe(true);
    });

    it("should validate artifact with minimal required fields", () => {
      const artifact = {
        id: "test-id",
        name: "Test",
        category: "transformer",
        lat: 41.5,
        lng: -72.7,
      };
      const result = artifactSchema.safeParse(artifact);
      expect(result.success).toBe(true);
    });

    it("should reject artifact without id", () => {
      const artifact = {
        name: "Test",
        category: "transformer",
        lat: 41.5,
        lng: -72.7,
      };
      const result = artifactSchema.safeParse(artifact);
      expect(result.success).toBe(false);
    });

    it("should reject artifact with empty name", () => {
      const artifact = createTestArtifact({ name: "" });
      const result = artifactSchema.safeParse(artifact);
      expect(result.success).toBe(false);
    });

    it("should reject artifact with name exceeding 500 characters", () => {
      const artifact = createTestArtifact({ name: "a".repeat(501) });
      const result = artifactSchema.safeParse(artifact);
      expect(result.success).toBe(false);
    });

    it("should reject artifact with empty category", () => {
      const artifact = createTestArtifact({ category: "" });
      const result = artifactSchema.safeParse(artifact);
      expect(result.success).toBe(false);
    });

    it("should reject artifact with category exceeding 100 characters", () => {
      const artifact = createTestArtifact({ category: "a".repeat(101) });
      const result = artifactSchema.safeParse(artifact);
      expect(result.success).toBe(false);
    });

    it("should accept description up to 5000 characters", () => {
      const artifact = createTestArtifact({ description: "a".repeat(5000) });
      const result = artifactSchema.safeParse(artifact);
      expect(result.success).toBe(true);
    });

    it("should reject description exceeding 5000 characters", () => {
      const artifact = createTestArtifact({ description: "a".repeat(5001) });
      const result = artifactSchema.safeParse(artifact);
      expect(result.success).toBe(false);
    });

    describe("latitude validation", () => {
      it("should reject latitude below -90", () => {
        const artifact = createTestArtifact({ lat: INVALID_COORDINATES.latTooLow.lat });
        const result = artifactSchema.safeParse(artifact);
        expect(result.success).toBe(false);
      });

      it("should reject latitude above 90", () => {
        const artifact = createTestArtifact({ lat: INVALID_COORDINATES.latTooHigh.lat });
        const result = artifactSchema.safeParse(artifact);
        expect(result.success).toBe(false);
      });

      it("should accept latitude at boundaries (-90, 90)", () => {
        const artifactNorth = createTestArtifact({ lat: 90 });
        const artifactSouth = createTestArtifact({ lat: -90 });
        expect(artifactSchema.safeParse(artifactNorth).success).toBe(true);
        expect(artifactSchema.safeParse(artifactSouth).success).toBe(true);
      });
    });

    describe("longitude validation", () => {
      it("should reject longitude below -180", () => {
        const artifact = createTestArtifact({ lng: INVALID_COORDINATES.lngTooLow.lng });
        const result = artifactSchema.safeParse(artifact);
        expect(result.success).toBe(false);
      });

      it("should reject longitude above 180", () => {
        const artifact = createTestArtifact({ lng: INVALID_COORDINATES.lngTooHigh.lng });
        const result = artifactSchema.safeParse(artifact);
        expect(result.success).toBe(false);
      });

      it("should accept longitude at boundaries (-180, 180)", () => {
        const artifactEast = createTestArtifact({ lng: 180 });
        const artifactWest = createTestArtifact({ lng: -180 });
        expect(artifactSchema.safeParse(artifactEast).success).toBe(true);
        expect(artifactSchema.safeParse(artifactWest).success).toBe(true);
      });
    });

    it("should accept valid metadata object", () => {
      const artifact = createTestArtifact({
        metadata: { voltage: "13.8kV", count: 5, nested: { deep: true } },
      });
      const result = artifactSchema.safeParse(artifact);
      expect(result.success).toBe(true);
    });

    describe("layer validation", () => {
      it("should accept valid layer", () => {
        const artifact = createTestArtifact({ layer: "eversource-substations" });
        const result = artifactSchema.safeParse(artifact);
        expect(result.success).toBe(true);
      });

      it("should use default layer when not provided", () => {
        const artifact = {
          id: "test-id",
          name: "Test",
          category: "transformer",
          lat: 41.5,
          lng: -72.7,
        };
        const result = artifactSchema.safeParse(artifact);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.layer).toBe("default");
        }
      });

      it("should reject empty layer", () => {
        const artifact = createTestArtifact({ layer: "" });
        const result = artifactSchema.safeParse(artifact);
        expect(result.success).toBe(false);
      });

      it("should reject layer exceeding 100 characters", () => {
        const artifact = createTestArtifact({ layer: "a".repeat(101) });
        const result = artifactSchema.safeParse(artifact);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("insertArtifactSchema", () => {
    it("should validate insert artifact without id", () => {
      const insertArtifact = {
        name: "Test",
        category: "transformer",
        lat: 41.5,
        lng: -72.7,
      };
      const result = insertArtifactSchema.safeParse(insertArtifact);
      expect(result.success).toBe(true);
    });

    it("should omit id from the schema", () => {
      const insertArtifact = {
        id: "should-be-ignored",
        name: "Test",
        category: "transformer",
        lat: 41.5,
        lng: -72.7,
      };
      const result = insertArtifactSchema.safeParse(insertArtifact);
      expect(result.success).toBe(true);
      // id should be stripped
      if (result.success) {
        expect(result.data).not.toHaveProperty("id");
      }
    });
  });

  describe("boundsSchema", () => {
    it("should validate valid bounds", () => {
      const bounds = createTestBounds();
      const result = boundsSchema.safeParse(bounds);
      expect(result.success).toBe(true);
    });

    it("should reject bounds where north < south", () => {
      const bounds = createTestBounds({ north: 40.0, south: 42.0 });
      const result = boundsSchema.safeParse(bounds);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "North must be greater than or equal to south"
        );
      }
    });

    it("should accept bounds where north === south (single point)", () => {
      const bounds = createTestBounds({ north: 41.5, south: 41.5 });
      const result = boundsSchema.safeParse(bounds);
      expect(result.success).toBe(true);
    });

    it("should reject invalid latitude in north", () => {
      const bounds = createTestBounds({ north: 91 });
      const result = boundsSchema.safeParse(bounds);
      expect(result.success).toBe(false);
    });

    it("should reject invalid longitude in west", () => {
      const bounds = createTestBounds({ west: -181 });
      const result = boundsSchema.safeParse(bounds);
      expect(result.success).toBe(false);
    });

    it("should accept full world bounds", () => {
      const bounds = {
        north: 90,
        south: -90,
        east: 180,
        west: -180,
      };
      const result = boundsSchema.safeParse(bounds);
      expect(result.success).toBe(true);
    });
  });

  describe("circleSelectionSchema", () => {
    it("should validate valid circle selection", () => {
      const circle = createTestCircleSelection();
      const result = circleSelectionSchema.safeParse(circle);
      expect(result.success).toBe(true);
    });

    it("should reject zero radius", () => {
      const circle = createTestCircleSelection({ radius: 0 });
      const result = circleSelectionSchema.safeParse(circle);
      expect(result.success).toBe(false);
    });

    it("should reject negative radius", () => {
      const circle = createTestCircleSelection({ radius: -100 });
      const result = circleSelectionSchema.safeParse(circle);
      expect(result.success).toBe(false);
    });

    it("should reject radius exceeding Earth circumference", () => {
      const circle = createTestCircleSelection({ radius: 40075001 }); // > 40,075,000m
      const result = circleSelectionSchema.safeParse(circle);
      expect(result.success).toBe(false);
    });

    it("should accept radius at Earth circumference", () => {
      const circle = createTestCircleSelection({ radius: 40075000 });
      const result = circleSelectionSchema.safeParse(circle);
      expect(result.success).toBe(true);
    });

    it("should reject invalid center coordinates", () => {
      const circle = {
        center: { lat: 91, lng: -72.7 },
        radius: 1000,
      };
      const result = circleSelectionSchema.safeParse(circle);
      expect(result.success).toBe(false);
    });

    it("should accept very small radius (1 meter)", () => {
      const circle = createTestCircleSelection({ radius: 1 });
      const result = circleSelectionSchema.safeParse(circle);
      expect(result.success).toBe(true);
    });
  });

  describe("viewportQuerySchema", () => {
    it("should validate valid viewport query", () => {
      const query = {
        bounds: createTestBounds(),
        zoom: 10,
      };
      const result = viewportQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it("should accept zoom level 0", () => {
      const query = {
        bounds: createTestBounds(),
        zoom: 0,
      };
      const result = viewportQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it("should accept zoom level 22", () => {
      const query = {
        bounds: createTestBounds(),
        zoom: 22,
      };
      const result = viewportQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it("should accept fractional zoom levels", () => {
      const query = {
        bounds: createTestBounds(),
        zoom: 10.5,
      };
      const result = viewportQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });
  });

  describe("areaQuerySchema", () => {
    it("should validate query with circle only", () => {
      const query = {
        circle: createTestCircleSelection(),
      };
      const result = areaQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it("should validate query with bounds only", () => {
      const query = {
        bounds: createTestBounds(),
      };
      const result = areaQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it("should validate query with both circle and bounds", () => {
      const query = {
        circle: createTestCircleSelection(),
        bounds: createTestBounds(),
      };
      const result = areaQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it("should validate empty query", () => {
      const query = {};
      const result = areaQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });
  });

  describe("aggregationResultSchema", () => {
    it("should validate valid aggregation result", () => {
      const result = {
        count: 10,
        categories: { transformer: 5, pole: 3, meter: 2 },
        artifacts: [createTestArtifact()],
      };
      const parsed = aggregationResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it("should validate empty aggregation result", () => {
      const result = {
        count: 0,
        categories: {},
        artifacts: [],
      };
      const parsed = aggregationResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe("clusterDataSchema", () => {
    it("should validate valid cluster data", () => {
      const cluster = {
        id: "cluster-1:2",
        lat: 41.5,
        lng: -72.7,
        count: 25,
      };
      const result = clusterDataSchema.safeParse(cluster);
      expect(result.success).toBe(true);
    });

    it("should reject cluster without count", () => {
      const cluster = {
        id: "cluster-1:2",
        lat: 41.5,
        lng: -72.7,
      };
      const result = clusterDataSchema.safeParse(cluster);
      expect(result.success).toBe(false);
    });
  });

  describe("viewportResponseSchema", () => {
    it("should validate valid viewport response", () => {
      const response = {
        clusters: [{ id: "cluster-1:2", lat: 41.5, lng: -72.7, count: 25 }],
        singles: [createTestArtifact()],
        total: 26,
        truncated: false,
      };
      const result = viewportResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should validate empty viewport response", () => {
      const response = {
        clusters: [],
        singles: [],
        total: 0,
        truncated: false,
      };
      const result = viewportResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should validate truncated response", () => {
      const response = {
        clusters: [],
        singles: [],
        total: 10000,
        truncated: true,
      };
      const result = viewportResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe("layerSchema", () => {
    it("should validate valid layer", () => {
      const layer = {
        id: "eversource-substations",
        name: "Eversource Substations",
        description: "HIFLD transmission substations",
        source: "HIFLD/ORNL",
        artifactCount: 1072,
        visible: true,
        style: { color: "#ef4444" },
      };
      const result = layerSchema.safeParse(layer);
      expect(result.success).toBe(true);
    });

    it("should validate layer with minimal required fields", () => {
      const layer = {
        id: "test-layer",
        name: "Test Layer",
        artifactCount: 0,
        visible: true,
      };
      const result = layerSchema.safeParse(layer);
      expect(result.success).toBe(true);
    });

    it("should reject layer without id", () => {
      const layer = {
        name: "Test Layer",
        artifactCount: 0,
        visible: true,
      };
      const result = layerSchema.safeParse(layer);
      expect(result.success).toBe(false);
    });

    it("should reject layer with empty id", () => {
      const layer = {
        id: "",
        name: "Test Layer",
        artifactCount: 0,
        visible: true,
      };
      const result = layerSchema.safeParse(layer);
      expect(result.success).toBe(false);
    });

    it("should reject layer with negative artifact count", () => {
      const layer = {
        id: "test-layer",
        name: "Test Layer",
        artifactCount: -1,
        visible: true,
      };
      const result = layerSchema.safeParse(layer);
      expect(result.success).toBe(false);
    });

    it("should use default visible=true when not provided", () => {
      const layer = {
        id: "test-layer",
        name: "Test Layer",
        artifactCount: 0,
      };
      const result = layerSchema.safeParse(layer);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visible).toBe(true);
      }
    });
  });
});
