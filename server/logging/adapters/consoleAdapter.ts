import type { ILogAdapter, ConsoleAdapterConfig } from "../types";
import type { LogEntry, LogLevel } from "../../../shared/logging/logSchema";

/**
 * Console logging adapter
 * Matches the existing log() function output format for backward compatibility
 */
export class ConsoleAdapter implements ILogAdapter {
  readonly name = "console";
  minLevel: LogLevel;

  constructor(config: ConsoleAdapterConfig = {}) {
    this.minLevel = config.minLevel || "info";
  }

  log(entry: LogEntry): void {
    const formattedTime = new Date(entry.timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const level = entry.level.toUpperCase().padEnd(5);
    const source = entry.context?.source || "app";
    const requestId = entry.context?.requestId
      ? ` [${entry.context.requestId.slice(0, 8)}]`
      : "";

    const prefix = `${formattedTime} [${level}] [${source}]${requestId}`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case "debug":
        console.debug(message);
        break;
      case "info":
        console.log(message);
        break;
      case "warn":
        console.warn(message);
        break;
      case "error":
        console.error(message);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }

  async flush(): Promise<void> {
    // Console is synchronous, nothing to flush
  }

  async close(): Promise<void> {
    // Nothing to close
  }
}
