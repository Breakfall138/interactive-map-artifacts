# Claude Code Project Context

## Project Overview

MapUI is an interactive map application for visualizing and querying geospatial artifacts using Leaflet, React, and Express. Features **multi-layer support** for organizing data sources, currently loaded with **1,072 Eversource substations** across Connecticut, Massachusetts, and New Hampshire.

## Key Documentation

- [Deployment Guide](../docs/DEPLOYMENT.md) - Docker setup with PostGIS
- [Testing Guide](../docs/TESTING.md) - Test strategy and running tests
- [Logging Design](../docs/LOGGING.md) - Adapter pattern logging infrastructure
- [Planned Updates](../PLANNED_UPDATES.md) - Roadmap and enhancement plans

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, shadcn/ui, react-leaflet
- **Backend**: Express.js, TypeScript, tsx
- **Database**: PostgreSQL 16 with PostGIS 3.4 (or in-memory fallback)
- **Validation**: Zod schemas
- **State**: TanStack Query (React Query)

## Project Structure

```
MapUI/
├── client/           # React frontend
│   └── src/
│       ├── components/
│       │   ├── map/      # Map components (MarkerLayer, CircleDrawTool, etc.)
│       │   └── ui/       # shadcn/ui components
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities
├── server/           # Express backend
│   ├── index.ts      # Server entry point with security middleware
│   ├── routes.ts     # API routes + tile serving
│   ├── storage.ts    # Storage factory (PostGIS or in-memory)
│   ├── memStorage.ts # In-memory storage with RBush
│   ├── db/
│   │   ├── config.ts        # PostgreSQL connection pool
│   │   └── postgresStorage.ts # PostGIS storage implementation
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared types and schemas
│   └── schema.ts     # Zod validation schemas
├── db/               # Database migrations
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   # PostGIS schema + indexes
│   │   ├── 002_seed_connecticut.sql # CT utility data (~10k artifacts)
│   │   └── 003_add_layer_support.sql # Layer system + triggers
│   └── init/
│       └── 01_init.sh    # Docker init script
├── scripts/          # Data import scripts
│   └── import-substations.ts # HIFLD substation importer
├── tiles/            # Raster tile storage
├── tests/            # Test suites
│   ├── fixtures/     # Test data generators
│   ├── shared/       # Schema tests
│   ├── server/       # Storage and route tests
│   └── client/       # React hook tests
├── docs/             # Documentation
├── docker-compose.yml # Full stack orchestration
├── Dockerfile        # App container definition
├── Dockerfile.test   # Test container definition
├── vitest.config.ts  # Test configuration
└── .env.example      # Environment template
```

## Running the Project

### Docker with PostGIS (Recommended)

See [Deployment Guide](../docs/DEPLOYMENT.md) for full instructions.

**Quick start:**
```bash
# 1. Start PostGIS
docker run -d --name mapui-postgres \
  -e POSTGRES_DB=mapui -e POSTGRES_USER=mapui_user -e POSTGRES_PASSWORD=mapui_dev_password \
  -p 5432:5432 postgis/postgis:16-3.4

# 2. Run migrations (after container is ready)
docker cp db/migrations/001_initial_schema.sql mapui-postgres:/tmp/
docker cp db/migrations/002_seed_connecticut.sql mapui-postgres:/tmp/
docker exec mapui-postgres psql -U mapui_user -d mapui -f /tmp/001_initial_schema.sql
docker exec mapui-postgres psql -U mapui_user -d mapui -f /tmp/002_seed_connecticut.sql

# 3. Start app container linked to PostGIS
docker run -d -p 5000:5000 --name mapui-server --link mapui-postgres:postgres \
  node:24-alpine sh -c "mkdir -p /app && sleep infinity"
docker cp . mapui-server:/app/
docker exec mapui-server sh -c "cd /app && npm install"
docker exec -d -e HOST=0.0.0.0 -e DATABASE_URL=postgresql://mapui_user:mapui_dev_password@postgres:5432/mapui \
  mapui-server sh -c "cd /app && npx tsx server/index.ts"
```

### In-Memory (Quick Start)
```bash
npm install
npm run dev
```
Without `DATABASE_URL`, the app uses in-memory storage with CT seed data.

## API Endpoints

### Artifacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/artifacts/viewport` | Get clustered artifacts for viewport (supports `?layers=` filter) |
| GET | `/api/artifacts` | Get all artifacts (supports `?layers=` filter) |
| GET | `/api/artifacts/:id` | Get single artifact |
| POST | `/api/artifacts` | Create new artifact |
| POST | `/api/artifacts/query/circle` | Query artifacts in circle selection |
| GET | `/api/artifacts/count` | Get total artifact count (supports `?layers=` filter) |

### Layers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/layers` | List all layers with artifact counts |
| GET | `/api/layers/:id` | Get layer details |
| PATCH | `/api/layers/:id/visibility` | Toggle layer visibility |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (storage type + counts) |
| GET | `/api/tiles/info` | Tile layer metadata |
| GET | `/tiles/:layer/:z/:x/:y.:format` | Serve raster tiles |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (empty) | PostgreSQL connection string - if not set, uses in-memory |
| `HOST` | `127.0.0.1` / `0.0.0.0` | Server bind address |
| `PORT` | `5000` | Server port |
| `TILE_STORAGE_PATH` | `./tiles` | Raster tile storage path |
| `ALLOWED_ORIGINS` | (empty) | CORS origins for production |

## Security Notes

- Helmet.js configured with CSP
- CORS restricted in production (set `ALLOWED_ORIGINS` env var)
- Rate limiting: 1000 req/15min per IP
- Input validation on all endpoints
- Path traversal protection on tile endpoint

## Recent Changes (Jan 2026)

### Layer Support System (Latest)
- **Multi-layer architecture** for organizing data from different sources
- Database schema: `layer` column on artifacts + `layers` registry table
- Automatic artifact count tracking via PostgreSQL triggers
- Frontend `LayerControl` component in toolbar for toggling layer visibility
- Layer filtering on all artifact query endpoints (`?layers=layer1,layer2`)
- `useLayerState` React hook for layer state management

### Eversource Substations Data
- Imported **1,072 HIFLD transmission substations** from Eversource territory
- Coverage: Connecticut (277), Massachusetts (596), New Hampshire (199)
- Categories: `substation` (787), `tap` (284), `riser` (1)
- Rich metadata: voltage, utility name, HIFLD IDs, Google Maps links
- Import script: `scripts/import-substations.ts`

### PostGIS Persistence Layer
- Added PostgreSQL/PostGIS support for persistent geospatial storage
- Storage factory pattern (`server/storage.ts`) - auto-selects PostGIS or in-memory
- PostGIS spatial queries: `ST_DWithin`, `ST_Intersects`, `ST_MakeEnvelope`
- GIST spatial indexes for O(log N) queries
- Connection pooling with graceful shutdown
- Raster tile serving endpoint (`/tiles/:layer/:z/:x/:y.:format`)
- Health check endpoint (`/api/health`)

### Docker Configuration
- `docker-compose.yml` for full stack orchestration
- `Dockerfile` for app container
- Database migrations in `db/migrations/`
- Updated deployment docs with PostGIS setup

### Previous Security Fixes
- Added helmet.js, CORS, rate limiting middleware
- Fixed XSS vulnerability in tooltips
- Added geographic coordinate validation
- Removed insecure plain-text User schema

### Previous Bug Fixes
- Fixed memory leak in `MapInitializer.tsx`
- Fixed toast timeout (was 11 days, now 5 seconds)
- Fixed race condition in `CircleDrawTool.tsx`
- Fixed ESM compatibility in `server/static.ts`

## Known Issues / TODO

### Needs Testing
- **Loading errors observed** - stability issues when switching between storage backends
- PostGIS connection handling under load
- Tile serving with actual raster tiles (currently returns 204 for missing tiles)
- Circle selection queries against PostGIS

### Technical Debt
- Add unit tests for `PostgresStorage` class (requires database mocking)
- Add E2E tests with Playwright
- Improve error boundaries in React components
- Add structured logging

## Testing

**148 tests** covering schemas, storage, routes, and React hooks.

```bash
# Run all tests
npm test

# Run in Docker container
docker compose --profile test run --rm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

See [Testing Guide](../docs/TESTING.md) for full documentation.

### Future Enhancements
See [PLANNED_UPDATES.md](../PLANNED_UPDATES.md) for full roadmap.

## Useful Commands

```bash
# Check server health
curl http://localhost:5000/api/health

# Check PostGIS artifact count
docker exec mapui-postgres psql -U mapui_user -d mapui -c "SELECT COUNT(*) FROM artifacts;"

# View server logs
docker exec mapui-server sh -c "cat /tmp/server.log"

# Restart server with PostGIS
docker exec mapui-server sh -c "pkill -f tsx || true"
docker exec -d -e HOST=0.0.0.0 -e DATABASE_URL=postgresql://mapui_user:mapui_dev_password@postgres:5432/mapui \
  mapui-server sh -c "cd /app && npx tsx server/index.ts > /tmp/server.log 2>&1"
```
