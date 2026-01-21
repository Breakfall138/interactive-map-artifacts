import type { ILogAdapter, AppInsightsAdapterConfig } from "../types";
import type { LogEntry, LogLevel } from "../../../shared/logging/logSchema";

// Type for the Application Insights SDK (dynamically imported)
type AppInsightsModule = typeof import("applicationinsights");
type TelemetryClient = InstanceType<AppInsightsModule["TelemetryClient"]>;

// Map log levels to Application Insights severity levels
const SEVERITY_MAP: Record<LogLevel, number> = {
  debug: 0, // Verbose
  info: 1, // Information
  warn: 2, // Warning
  error: 3, // Error
};

/**
 * Azure Application Insights logging adapter
 */
export class AppInsightsAdapter implements ILogAdapter {
  readonly name = "appinsights";
  minLevel: LogLevel;
  private client: TelemetryClient | null = null;
  private isInitialized = false;
  private initPromise: Promise<void>;

  constructor(config: AppInsightsAdapterConfig) {
    this.minLevel = config.minLevel || "info";
    this.initPromise = this.initialize(config);
  }

  private async initialize(config: AppInsightsAdapterConfig): Promise<void> {
    try {
      // Dynamic import for optional dependency
      const appInsights = await import("applicationinsights");

      appInsights
        .setup(config.connectionString)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(false) // We handle logging ourselves
        .setAutoDependencyCorrelation(true)
        .setSendLiveMetrics(false)
        .start();

      this.client = appInsights.defaultClient;

      if (config.cloudRole && this.client) {
        this.client.context.tags[this.client.context.keys.cloudRole] =
          config.cloudRole;
      }

      this.isInitialized = true;
    } catch (error) {
      // Application Insights package not installed or failed to initialize
      // This is expected in development without the optional dependency
      console.warn(
        "Application Insights initialization skipped:",
        error instanceof Error ? error.message : "unknown error"
      );
    }
  }

  log(entry: LogEntry): void {
    if (!this.client || !this.isInitialized) return;

    const properties: Record<string, string> = {
      source: entry.context?.source || "unknown",
    };

    if (entry.context?.module) {
      properties.module = entry.context.module;
    }
    if (entry.context?.requestId) {
      properties.requestId = entry.context.requestId;
    }
    if (entry.context?.correlationId) {
      properties.correlationId = entry.context.correlationId;
    }
    if (entry.context?.operation) {
      properties.operation = entry.context.operation;
    }
    if (entry.context?.userId) {
      properties.userId = entry.context.userId;
    }
    if (entry.context?.metadata) {
      properties.metadata = JSON.stringify(entry.context.metadata);
    }

    if (entry.level === "error" && entry.error) {
      // Track as exception for errors
      const exception = new Error(entry.error.message);
      exception.name = entry.error.name;
      exception.stack = entry.error.stack;

      this.client.trackException({
        exception,
        severity: SEVERITY_MAP[entry.level],
        properties: {
          ...properties,
          originalMessage: entry.message,
        },
      });
    } else {
      // Track as trace for other levels
      this.client.trackTrace({
        message: entry.message,
        severity: SEVERITY_MAP[entry.level],
        properties,
      });
    }
  }

  async flush(): Promise<void> {
    // Wait for initialization to complete
    await this.initPromise;

    if (this.client) {
      return new Promise<void>((resolve) => {
        this.client!.flush({
          callback: () => resolve(),
        });
      });
    }
  }

  async close(): Promise<void> {
    await this.flush();
    // Application Insights doesn't have a close method
    // The SDK will be garbage collected when the process exits
  }
}
