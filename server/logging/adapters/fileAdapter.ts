import type { ILogAdapter, FileAdapterConfig } from "../types";
import type { LogEntry, LogLevel } from "../../../shared/logging/logSchema";
import fs from "fs/promises";
import path from "path";

/**
 * File logging adapter with JSON Lines format and rotation
 */
export class FileAdapter implements ILogAdapter {
  readonly name = "file";
  minLevel: LogLevel;
  private filePath: string;
  private maxSize: number;
  private maxFiles: number;
  private buffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isWriting = false;

  constructor(config: FileAdapterConfig) {
    this.minLevel = config.minLevel || "info";
    this.filePath = config.path;
    this.maxSize = config.maxSize || 10 * 1024 * 1024; // 10MB default
    this.maxFiles = config.maxFiles || 5;

    // Flush buffer every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flush().catch(() => {
        // Silently handle flush errors
      });
    }, 5000);
  }

  log(entry: LogEntry): void {
    const line = JSON.stringify(entry) + "\n";
    this.buffer.push(line);

    // Flush immediately if buffer is large
    if (this.buffer.length >= 100) {
      this.flush().catch(() => {
        // Silently handle flush errors
      });
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isWriting) return;

    this.isWriting = true;
    const lines = this.buffer.splice(0);
    const content = lines.join("");

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });

      // Check if rotation needed
      try {
        const stats = await fs.stat(this.filePath);
        if (stats.size + content.length > this.maxSize) {
          await this.rotate();
        }
      } catch {
        // File doesn't exist yet, that's fine
      }

      await fs.appendFile(this.filePath, content);
    } catch {
      // Re-add to buffer on failure
      this.buffer.unshift(...lines);
    } finally {
      this.isWriting = false;
    }
  }

  private async rotate(): Promise<void> {
    // Rotate files: log.4 -> delete, log.3 -> log.4, etc.
    for (let i = this.maxFiles - 1; i >= 0; i--) {
      const from = i === 0 ? this.filePath : `${this.filePath}.${i}`;
      const to = `${this.filePath}.${i + 1}`;

      try {
        if (i === this.maxFiles - 1) {
          await fs.unlink(from);
        } else {
          await fs.rename(from, to);
        }
      } catch {
        // File doesn't exist, that's fine
      }
    }
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }
}
