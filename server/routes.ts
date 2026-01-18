import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  boundsSchema,
  circleSelectionSchema,
  insertArtifactSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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

  app.get("/api/artifacts/count", async (req, res) => {
    try {
      const count = await storage.getArtifactCount();
      res.json({ count });
    } catch (error) {
      console.error("Error getting count:", error);
      res.status(500).json({ error: "Failed to get count" });
    }
  });

  return httpServer;
}
