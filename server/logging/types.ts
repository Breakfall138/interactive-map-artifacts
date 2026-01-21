import type { LogEntry, LogLevel, LogContext } from "../../shared/logging/logSchema";

/**
 * Logger adapter interface - implementations: ConsoleAdapter, FileAdapter, AppInsightsAdapter
 */
export interface ILogAdapter {
  /** Adapter identifier for configuration */
  readonly name: string;

  /** Minimum log level this adapter will process */
  minLevel: LogLevel;

  /** Log a message at the specified level */
  log(entry: LogEntry): void | Promise<void>;

  /** Flush any pending logs (for async adapters) */
  flush(): Promise<void>;

  /** Graceful shutdown */
  close(): Promise<void>;
}

/**
 * Composite logger interface that coordinates multiple adapters
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;

  /** Create a child logger with additional context */
  child(context: LogContext): ILogger;

  /** Flush all adapters */
  flush(): Promise<void>;

  /** Graceful shutdown of all adapters */
  shutdown(): Promise<void>;
}

/**
 * Configuration for individual adapters
 */
export interface ConsoleAdapterConfig {
  minLevel?: LogLevel;
}

export interface FileAdapterConfig {
  path: string;
  minLevel?: LogLevel;
  maxSize?: number;
  maxFiles?: number;
}

export interface AppInsightsAdapterConfig {
  connectionString: string;
  minLevel?: LogLevel;
  cloudRole?: string;
}

// Augment Express Request to include logger
declare module "express-serve-static-core" {
  interface Request {
    logger: ILogger;
    requestId: string;
  }
}
