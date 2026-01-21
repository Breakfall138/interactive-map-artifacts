import { z } from "zod";

export const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);
export type LogLevel = z.infer<typeof logLevelSchema>;

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export const logContextSchema = z.object({
  // Request correlation
  requestId: z.string().optional(),
  correlationId: z.string().optional(),

  // Source identification
  source: z.string().optional(),
  module: z.string().optional(),

  // Operation context
  operation: z.string().optional(),
  userId: z.string().optional(),

  // Custom metadata
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type LogContext = z.infer<typeof logContextSchema>;

export const logErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  stack: z.string().optional(),
});
export type LogError = z.infer<typeof logErrorSchema>;

export const logEntrySchema = z.object({
  timestamp: z.string(),
  level: logLevelSchema,
  message: z.string(),
  context: logContextSchema.optional(),
  error: logErrorSchema.optional(),
});
export type LogEntry = z.infer<typeof logEntrySchema>;

// Configuration schema for environment validation
export const loggerConfigSchema = z.object({
  defaultLevel: logLevelSchema.default("info"),
  serviceName: z.string().default("mapui"),
  adapters: z.object({
    console: z
      .object({
        enabled: z.boolean().default(true),
        minLevel: logLevelSchema.optional(),
      })
      .default({}),
    file: z
      .object({
        enabled: z.boolean().default(false),
        minLevel: logLevelSchema.optional(),
        path: z.string().optional(),
        maxSize: z.number().optional(),
        maxFiles: z.number().optional(),
      })
      .default({}),
    appInsights: z
      .object({
        enabled: z.boolean().default(false),
        minLevel: logLevelSchema.optional(),
        connectionString: z.string().optional(),
        cloudRole: z.string().optional(),
      })
      .default({}),
  }),
});
export type LoggerConfig = z.infer<typeof loggerConfigSchema>;
