import type { Express } from "express";
import type { Server } from "http";
import type { IStorage } from "./storage";
import {
  boundsSchema,
  circleSelectionSchema,
  insertArtifactSchema,
} from "@shared/schema";
import path from "path";
import fs from "fs/promises";

// Constants for query validation
const MAX_LIMIT = 10000;
const DEFAULT_LIMIT = 5000;

// Tile storage path
const TILE_STORAGE_PATH = process.env.TILE_STORAGE_PATH || "./tiles";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
  storage: IStorage
): Promise<Server> {
  // Viewport data endpoint with clustering
  app.get("/api/artifacts/viewport", async (req, res) => {
    try {
      const { north, south, east, west, zoom, limit } = req.query;

      if (!north || !south || !east || !west || !zoom) {
        return res.status(400).json({
          error: "Missing required parameters: north, south, east, west, zoom",
        });
      }

      const bounds = boundsSchema.parse({
        north: parseFloat(north as string),
        south: parseFloat(south as string),
        east: parseFloat(east as string),
        west: parseFloat(west as string),
      });

      const zoomLevel = parseFloat(zoom as string);
      if (isNaN(zoomLevel) || zoomLevel < 0 || zoomLevel > 22) {
        return res.status(400).json({ error: "Invalid zoom level" });
      }

      // Validate and constrain limit parameter
      let maxResults = DEFAULT_LIMIT;
      if (limit) {
        const parsedLimit = parseInt(limit as string, 10);
        if (isNaN(parsedLimit) || parsedLimit < 1) {
          return res.status(400).json({ error: "Invalid limit parameter" });
        }
        maxResults = Math.min(parsedLimit, MAX_LIMIT);
      }

      const viewportData = await storage.getViewportData(bounds, zoomLevel, maxResults);
      res.json(viewportData);
    } catch (error) {
      console.error("Error fetching viewport data:", error);
      res.status(500).json({ error: "Failed to fetch viewport data" });
    }
  });

  // Get all artifacts or filter by bounds
  app.get("/api/artifacts", async (req, res) => {
    try {
      const { north, south, east, west } = req.query;

      if (north && south && east && west) {
        const bounds = boundsSchema.parse({
          north: parseFloat(north as string),
          south: parseFloat(south as string),
          east: parseFloat(east as string),
          west: parseFloat(west as string),
        });

        const artifacts = await storage.getArtifactsInBounds(bounds);
        return res.json(artifacts);
      }

      const artifacts = await storage.getAllArtifacts();
      res.json(artifacts);
    } catch (error) {
      console.error("Error fetching artifacts:", error);
      res.status(500).json({ error: "Failed to fetch artifacts" });
    }
  });

  // Get artifact count - MUST be before :id route
  app.get("/api/artifacts/count", async (req, res) => {
    try {
      const count = await storage.getArtifactCount();
      res.json({ count });
    } catch (error) {
      console.error("Error getting count:", error);
      res.status(500).json({ error: "Failed to get count" });
    }
  });

  // Get single artifact by ID
  app.get("/api/artifacts/:id", async (req, res) => {
    try {
      const artifact = await storage.getArtifact(req.params.id);
      if (!artifact) {
        return res.status(404).json({ error: "Artifact not found" });
      }
      res.json(artifact);
    } catch (error) {
      console.error("Error fetching artifact:", error);
      res.status(500).json({ error: "Failed to fetch artifact" });
    }
  });

  // Create new artifact
  app.post("/api/artifacts", async (req, res) => {
    try {
      const validated = insertArtifactSchema.parse(req.body);
      const artifact = await storage.createArtifact(validated);
      res.status(201).json(artifact);
    } catch (error) {
      console.error("Error creating artifact:", error);
      res.status(400).json({ error: "Invalid artifact data" });
    }
  });

  // Query artifacts in circle selection
  app.post("/api/artifacts/query/circle", async (req, res) => {
    try {
      const circle = circleSelectionSchema.parse(req.body);
      const aggregation = await storage.getAggregation(circle);
      res.json(aggregation);
    } catch (error) {
      console.error("Error querying circle:", error);
      res.status(400).json({ error: "Invalid circle query" });
    }
  });

  // Tile serving endpoint
  app.get("/tiles/:layer/:z/:x/:y.:format", async (req, res) => {
    try {
      const { layer, z, x, y, format } = req.params;

      // Validate parameters
      const zoom = parseInt(z);
      const tileX = parseInt(x);
      const tileY = parseInt(y);

      if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
        return res.status(400).json({ error: "Invalid tile coordinates" });
      }

      if (zoom < 0 || zoom > 22) {
        return res.status(400).json({ error: "Invalid zoom level" });
      }

      if (!["png", "webp", "jpg"].includes(format)) {
        return res.status(400).json({ error: "Invalid tile format" });
      }

      // Validate layer name (prevent path traversal)
      if (!/^[a-zA-Z0-9_-]+$/.test(layer)) {
        return res.status(400).json({ error: "Invalid layer name" });
      }

      const tilePath = path.join(TILE_STORAGE_PATH, layer, z, x, `${y}.${format}`);

      try {
        await fs.access(tilePath);

        const contentType: Record<string, string> = {
          png: "image/png",
          webp: "image/webp",
          jpg: "image/jpeg",
        };

        res.set({
          "Content-Type": contentType[format],
          "Cache-Control": "public, max-age=86400",
          "X-Tile-Coordinates": `${z}/${x}/${y}`,
        });

        const tileData = await fs.readFile(tilePath);
        res.send(tileData);
      } catch {
        // Tile not found - return 204 No Content
        res.status(204).end();
      }
    } catch (error) {
      console.error("Error serving tile:", error);
      res.status(500).json({ error: "Failed to serve tile" });
    }
  });

  // Tile metadata/info endpoint
  app.get("/api/tiles/info", async (_req, res) => {
    try {
      const metadataPath = path.join(TILE_STORAGE_PATH, "metadata.json");
      try {
        const metadata = await fs.readFile(metadataPath, "utf-8");
        res.json(JSON.parse(metadata));
      } catch {
        // Return default metadata if file doesn't exist
        res.json({
          layers: ["basemap", "custom"],
          formats: ["png", "webp"],
          bounds: {
            north: 42.0505,
            south: 40.9509,
            west: -73.7278,
            east: -71.7872,
          },
          minZoom: 6,
          maxZoom: 18,
          description: "Connecticut / Eversource service territory",
        });
      }
    } catch (error) {
      console.error("Error getting tile info:", error);
      res.status(500).json({ error: "Failed to get tile info" });
    }
  });

  // Health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      const count = await storage.getArtifactCount();
      res.json({
        status: "healthy",
        storage: process.env.DATABASE_URL ? "postgresql" : "memory",
        artifactCount: count,
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        error: "Storage unavailable",
      });
    }
  });

  return httpServer;
}
