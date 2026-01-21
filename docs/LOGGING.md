# Logging Infrastructure Design

Structured logging with adapter pattern supporting multiple backends (Console, File, Azure Application Insights).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CompositeLogger (ILogger)                │
│  - Coordinates multiple adapters                            │
│  - Creates child loggers with request context               │
│  - Dispatches log entries to all active adapters            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ConsoleAdapter │    │  FileAdapter  │    │AppInsights    │
│ (ILogAdapter) │    │ (ILogAdapter) │    │   Adapter     │
└───────────────┘    └───────────────┘    └───────────────┘
```

## Design Decisions

- **Server-side only** - Client errors flow through API endpoints
- **JSON Lines format** - For file logging (one JSON object per line, easy to parse/ingest)
- **Production redaction** - Full logging in dev, sensitive fields redacted in prod
- **Factory pattern** - Follows existing `storage.ts` approach for adapter selection
- **Request correlation** - Auto-generated requestId propagates through child loggers

### Production Redaction

The logger automatically redacts in production (`NODE_ENV=production`):
- Request/response bodies (logged in dev, omitted in prod)
- Authorization headers
- Fields matching patterns: `password`, `token`, `secret`, `key`, `credential`

## File Structure

```
server/logging/
├── types.ts                    # ILogger, ILogAdapter interfaces
├── logger.ts                   # Factory + CompositeLogger singleton
├── adapters/
│   ├── consoleAdapter.ts       # Console output (replaces current log())
│   ├── fileAdapter.ts          # JSON file logging with rotation
│   └── appInsightsAdapter.ts   # Azure Application Insights
└── middleware/
    └── requestLogger.ts        # Express middleware for request correlation

shared/logging/
└── logSchema.ts                # Zod schemas for log entries
```

## Core Interfaces

### ILogAdapter

```typescript
interface ILogAdapter {
  readonly name: string;
  minLevel: LogLevel;
  log(entry: LogEntry): void | Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
}
```

### ILogger

```typescript
interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): ILogger;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}
```

### LogEntry Schema

```typescript
{
  timestamp: string;      // ISO 8601
  level: "debug" | "info" | "warn" | "error";
  message: string;
  context?: {
    requestId?: string;
    correlationId?: string;
    source?: string;
    module?: string;
    operation?: string;
    metadata?: Record<string, unknown>;
  };
  error?: { name, message, stack };
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Default log level: debug, info, warn, error |
| `LOG_CONSOLE` | `true` | Enable console adapter |
| `LOG_CONSOLE_LEVEL` | (LOG_LEVEL) | Console-specific log level |
| `LOG_FILE_PATH` | - | Enable file logging if set |
| `LOG_FILE_LEVEL` | (LOG_LEVEL) | File-specific log level |
| `LOG_FILE_MAX_SIZE` | `10485760` | 10MB max file size before rotation |
| `LOG_FILE_MAX_FILES` | `5` | Number of rotated files to keep |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | - | Enable App Insights if set |
| `LOG_APPINSIGHTS_LEVEL` | (LOG_LEVEL) | App Insights specific log level |
| `APPINSIGHTS_CLOUD_ROLE` | `mapui-server` | Cloud role name in App Insights |

## Usage Examples

### Basic logging

```typescript
const logger = await getLogger();
logger.info("Server started", { source: "startup" });
logger.error("Database connection failed", error, { module: "postgres" });
```

### Request-scoped logging

```typescript
app.get("/api/data", async (req, res) => {
  req.logger.info("Fetching data");  // Includes requestId automatically
  // ...
});
```

### Child loggers

```typescript
const dbLogger = logger.child({ module: "database" });
dbLogger.info("Query executed");  // Inherits parent context + adds module
```

## Files to Modify

| File | Changes |
|------|---------|
| `server/index.ts` | Remove `log()`, add logger init, middleware, shutdown |
| `server/routes.ts` | Replace 8x `console.error` with `req.logger` |
| `server/storage.ts` | Replace 4x console calls with logger |
| `server/db/config.ts` | Replace 5x console calls with logger |
| `server/memStorage.ts` | Replace 1x console.log with logger |
| `package.json` | Add `applicationinsights` dependency |
| `.env.example` | Add logging configuration variables |

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `shared/logging/logSchema.ts` - Zod schemas for LogLevel, LogContext, LogEntry
- [ ] Create `server/logging/types.ts` - ILogAdapter and ILogger interfaces
- [ ] Create `server/logging/logger.ts` - CompositeLogger class and factory

### Phase 2: Adapters
- [ ] Create `server/logging/adapters/consoleAdapter.ts` - Console output (matches current format)
- [ ] Create `server/logging/adapters/fileAdapter.ts` - JSON Lines with rotation
- [ ] Create `server/logging/adapters/appInsightsAdapter.ts` - Azure Application Insights

### Phase 3: Middleware
- [ ] Create `server/logging/middleware/requestLogger.ts` - Request correlation + timing

### Phase 4: Integration
- [ ] Update `server/index.ts` - Initialize logger, add middleware, update shutdown
- [ ] Update `server/routes.ts` - Replace 8x `console.error` with `req.logger`
- [ ] Update `server/storage.ts` - Replace 4x console calls with logger
- [ ] Update `server/db/config.ts` - Replace 5x console calls with logger
- [ ] Update `server/memStorage.ts` - Replace 1x console.log with logger

### Phase 5: Configuration
- [ ] Update `.env.example` with logging variables
- [ ] Add `applicationinsights` to package.json (optional dependency)
- [ ] Remove old `log()` function from `server/index.ts`

### Phase 6: Verification
- [ ] Add unit tests for each adapter
- [ ] Verify request correlation works across log entries
- [ ] Test production redaction of sensitive fields
- [ ] Test App Insights telemetry in Azure portal

---

*Created: 2026-01-19*
