import { z } from "zod";

export const artifactSchema = z.object({
  id: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  name: z.string().min(1).max(500),
  category: z.string().min(1).max(100),
  layer: z.string().min(1).max(100).default("default"),
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
  layers: z.array(z.string()).optional(),
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

// Layer schema for layer management
export const layerSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  source: z.string().max(500).optional(),
  sourceDate: z.string().optional(),
  artifactCount: z.number().int().nonnegative(),
  visible: z.boolean().default(true),
  style: z.record(z.string(), z.unknown()).optional(),
});

export type Layer = z.infer<typeof layerSchema>;

// Substation-specific metadata schema (for validation during import)
export const substationMetadataSchema = z.object({
  city: z.string().optional(),
  county: z.string().optional(),
  state: z.string(),
  zip: z.string().optional(),
  type: z.enum(["TAP", "SUBSTATION"]),
  status: z.string(),
  voltage_kv_max: z.number().optional(),
  voltage_kv_min: z.number().optional(),
  utility_name: z.string().optional(),
  holding_company: z.string().optional(),
  hifld_objectid: z.number().optional(),
  hifld_id: z.string().optional(),
  hifld_lines: z.number().optional(),
  google_maps_link: z.string().url().optional(),
});

export type SubstationMetadata = z.infer<typeof substationMetadataSchema>;

// Note: User authentication schemas have been removed.
// If authentication is needed, implement properly with:
// - Password hashing (bcrypt/argon2)
// - Secure session management
// - Rate limiting for login attempts
// - Proper validation (password complexity, etc.)
