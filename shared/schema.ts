import { z } from "zod";

export const artifactSchema = z.object({
  id: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  name: z.string().min(1).max(500),
  category: z.string().min(1).max(100),
  description: z.string().max(5000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
});

export type Artifact = z.infer<typeof artifactSchema>;

export const insertArtifactSchema = artifactSchema.omit({ id: true });
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;

export const boundsSchema = z.object({
  north: z.number().min(-90).max(90),
  south: z.number().min(-90).max(90),
  east: z.number().min(-180).max(180),
  west: z.number().min(-180).max(180),
}).refine(
  (data) => data.north >= data.south,
  { message: "North must be greater than or equal to south" }
);

export type Bounds = z.infer<typeof boundsSchema>;

export const circleSelectionSchema = z.object({
  center: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  radius: z.number().positive().max(40075000), // Max radius is Earth's circumference
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

export const clusterDataSchema = z.object({
  id: z.string(),
  lat: z.number(),
  lng: z.number(),
  count: z.number(),
});

export type ClusterData = z.infer<typeof clusterDataSchema>;

export const viewportResponseSchema = z.object({
  clusters: z.array(clusterDataSchema),
  singles: z.array(artifactSchema),
  total: z.number(),
  truncated: z.boolean(),
});

export type ViewportResponse = z.infer<typeof viewportResponseSchema>;

// Note: User authentication schemas have been removed.
// If authentication is needed, implement properly with:
// - Password hashing (bcrypt/argon2)
// - Secure session management
// - Rate limiting for login attempts
// - Proper validation (password complexity, etc.)
