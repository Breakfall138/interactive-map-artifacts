import { z } from "zod";

export const artifactSchema = z.object({
  id: z.string(),
  lat: z.number(),
  lng: z.number(),
  name: z.string(),
  category: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
});

export type Artifact = z.infer<typeof artifactSchema>;

export const insertArtifactSchema = artifactSchema.omit({ id: true });
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;

export const boundsSchema = z.object({
  north: z.number(),
  south: z.number(),
  east: z.number(),
  west: z.number(),
});

export type Bounds = z.infer<typeof boundsSchema>;

export const circleSelectionSchema = z.object({
  center: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  radius: z.number(),
});

export type CircleSelection = z.infer<typeof circleSelectionSchema>;

export const viewportQuerySchema = z.object({
  bounds: boundsSchema,
  zoom: z.number(),
});

export type ViewportQuery = z.infer<typeof viewportQuerySchema>;

export const areaQuerySchema = z.object({
  circle: circleSelectionSchema.optional(),
  bounds: boundsSchema.optional(),
});

export type AreaQuery = z.infer<typeof areaQuerySchema>;

export const aggregationResultSchema = z.object({
  count: z.number(),
  categories: z.record(z.string(), z.number()),
  artifacts: z.array(artifactSchema),
});

export type AggregationResult = z.infer<typeof aggregationResultSchema>;

export const users = {
  id: "",
  username: "",
  password: "",
};

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };
