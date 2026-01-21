import type { Request, Response, NextFunction } from "express";
import type { ILogger } from "../types";
import { randomUUID } from "crypto";
import { maybeRedact } from "../redact";

/**
 * Creates Express middleware for request logging with correlation
 */
export function createRequestLogger(logger: ILogger) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate unique request ID or use incoming header
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    const correlationId =
      (req.headers["x-correlation-id"] as string) || requestId;

    // Attach to request
    req.requestId = requestId;

    // Create child logger with request context
    req.logger = logger.child({
      requestId,
      correlationId,
      source: "http",
      metadata: maybeRedact({
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      }),
    });

    // Set correlation headers on response
    res.setHeader("x-request-id", requestId);
    res.setHeader("x-correlation-id", correlationId);

    const start = Date.now();
    let capturedJsonResponse: Record<string, unknown> | undefined;

    // Capture JSON response for logging
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;

      // Only log API requests
      if (req.path.startsWith("/api")) {
        const logContext = {
          operation: `${req.method} ${req.path}`,
          metadata: maybeRedact({
            statusCode: res.statusCode,
            duration,
            responseSize: res.get("content-length"),
            ...(capturedJsonResponse ? { response: capturedJsonResponse } : {}),
          }),
        };

        if (res.statusCode >= 500) {
          req.logger.error(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`, undefined, logContext);
        } else if (res.statusCode >= 400) {
          req.logger.warn(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`, logContext);
        } else {
          req.logger.info(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`, logContext);
        }
      }
    });

    next();
  };
}
