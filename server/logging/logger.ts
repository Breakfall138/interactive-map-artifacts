import type { ILogger, ILogAdapter } from "./types";
import type { LogEntry, LogLevel, LogContext } from "../../shared/logging/logSchema";
import { LOG_LEVEL_PRIORITY } from "../../shared/logging/logSchema";

/**
 * Composite logger that dispatches to multiple adapters
 */
class CompositeLogger implements ILogger {
  private adapters: ILogAdapter[];
  private baseContext: LogContext;
  private defaultLevel: LogLevel;

  constructor(
    adapters: ILogAdapter[],
    defaultLevel: LogLevel,
    baseContext: LogContext = {}
  ) {
    this.adapters = adapters;
    this.defaultLevel = defaultLevel;
    this.baseContext = baseContext;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.baseContext, ...context },
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };
  }

  private dispatch(entry: LogEntry): void {
    const priority = LOG_LEVEL_PRIORITY[entry.level];
    for (const adapter of this.adapters) {
      if (priority >= LOG_LEVEL_PRIORITY[adapter.minLevel]) {
        // Fire and forget for performance - errors handled internally by adapters
        Promise.resolve(adapter.log(entry)).catch(() => {
          // Adapter-level error handling - don't let one adapter break others
        });
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.dispatch(this.createEntry("debug", message, context));
  }

  info(message: string, context?: LogContext): void {
    this.dispatch(this.createEntry("info", message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.dispatch(this.createEntry("warn", message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.dispatch(this.createEntry("error", message, context, error));
  }

  child(context: LogContext): ILogger {
    return new CompositeLogger(this.adapters, this.defaultLevel, {
      ...this.baseContext,
      ...context,
    });
  }

  async flush(): Promise<void> {
    await Promise.all(this.adapters.map((a) => a.flush()));
  }

  async shutdown(): Promise<void> {
    await this.flush();
    await Promise.all(this.adapters.map((a) => a.close()));
  }
}

// Singleton instance
let loggerInstance: ILogger | null = null;

/**
 * Creates the logger with configured adapters
 * Similar pattern to createStorage() in server/storage.ts
 */
export async function createLogger(): Promise<ILogger> {
  const adapters: ILogAdapter[] = [];
  const defaultLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

  // Console adapter (enabled by default)
  if (process.env.LOG_CONSOLE !== "false") {
    const { ConsoleAdapter } = await import("./adapters/consoleAdapter");
    adapters.push(
      new ConsoleAdapter({
        minLevel: (process.env.LOG_CONSOLE_LEVEL as LogLevel) || defaultLevel,
      })
    );
  }

  // File adapter (optional - enabled if LOG_FILE_PATH is set)
  if (process.env.LOG_FILE_PATH) {
    const { FileAdapter } = await import("./adapters/fileAdapter");
    adapters.push(
      new FileAdapter({
        path: process.env.LOG_FILE_PATH,
        minLevel: (process.env.LOG_FILE_LEVEL as LogLevel) || defaultLevel,
        maxSize: parseInt(process.env.LOG_FILE_MAX_SIZE || "10485760", 10),
        maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || "5", 10),
      })
    );
  }

  // Azure Application Insights adapter (optional - enabled if connection string is set)
  if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    const { AppInsightsAdapter } = await import("./adapters/appInsightsAdapter");
    adapters.push(
      new AppInsightsAdapter({
        connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
        minLevel:
          (process.env.LOG_APPINSIGHTS_LEVEL as LogLevel) || defaultLevel,
        cloudRole: process.env.APPINSIGHTS_CLOUD_ROLE || "mapui-server",
      })
    );
  }

  // Fallback: ensure at least console adapter exists
  if (adapters.length === 0) {
    const { ConsoleAdapter } = await import("./adapters/consoleAdapter");
    adapters.push(new ConsoleAdapter({ minLevel: defaultLevel }));
  }

  return new CompositeLogger(adapters, defaultLevel, {
    source: "mapui",
  });
}

/**
 * Returns the singleton logger instance
 * Similar to getStorage() in server/storage.ts
 */
export async function getLogger(): Promise<ILogger> {
  if (!loggerInstance) {
    loggerInstance = await createLogger();
  }
  return loggerInstance;
}

/**
 * Resets the logger instance (useful for testing)
 */
export function resetLogger(): void {
  loggerInstance = null;
}

/**
 * Sets a custom logger instance (useful for testing with mocks)
 */
export function setLogger(logger: ILogger): void {
  loggerInstance = logger;
}
