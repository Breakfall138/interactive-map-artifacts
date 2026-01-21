import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { getStorage } from "./storage";
import { getLogger } from "./logging/logger";
import { createRequestLogger } from "./logging/middleware/requestLogger";
import type { ILogger } from "./logging/types";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      }
    : true,
  credentials: true,
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

// Request timeout middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.setTimeout(30000); // 30-second timeout
  res.setTimeout(30000);
  next();
});

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));

(async () => {
  // Initialize logger FIRST (before storage and other components)
  const logger = await getLogger();
  logger.info("Starting MapUI server", { source: "startup" });

  // Add request logging middleware (after body parsing, before routes)
  app.use(createRequestLogger(logger));

  // Initialize storage (PostgreSQL or in-memory fallback)
  const storage = await getStorage();
  const artifactCount = await storage.getArtifactCount();
  logger.info(`Storage initialized with ${artifactCount} artifacts`, {
    source: "storage",
    metadata: { count: artifactCount },
  });

  // Register routes with storage instance
  await registerRoutes(httpServer, app, storage);

  // Error handler
  app.use((err: Error & { status?: number; statusCode?: number }, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    // Don't expose internal error details in production
    const message = process.env.NODE_ENV === "production" && status === 500
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

    // Use request logger if available, otherwise use main logger
    const reqLogger: ILogger = req.logger || logger;
    reqLogger.error(`Request error: ${err.message}`, err, {
      operation: `${req.method} ${req.path}`,
    });
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Validate PORT environment variable
  const portStr = process.env.PORT || "5000";
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    logger.error(`Invalid PORT value: ${portStr}`);
    process.exit(1);
  }

  // Bind to localhost in development for security, 0.0.0.0 in production for container compatibility
  // Allow HOST env var override for container/testing scenarios
  const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

  httpServer.listen({ port, host }, () => {
    logger.info(`Server listening on ${host}:${port}`, { source: "startup" });
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    logger.info("Shutting down gracefully...", { source: "shutdown" });

    // Close database pool if using PostgreSQL
    if (process.env.DATABASE_URL) {
      try {
        const { closePool } = await import("./db/config");
        await closePool();
        logger.info("Database pool closed", { source: "shutdown" });
      } catch (error) {
        logger.error("Error closing database pool", error as Error, { source: "shutdown" });
      }
    }

    // Flush and close logger
    await logger.shutdown();

    httpServer.close(() => {
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})();
