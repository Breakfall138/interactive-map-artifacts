# Development Environment Deployment

This guide covers setting up the MapUI development environment using Docker.

## Prerequisites

- Docker installed and running
- Node.js 24+ (inside container)
- Git

## Quick Start with Docker

### Option A: Full Stack with PostGIS (Recommended)

This setup includes the PostGIS database for persistent geospatial storage.

#### 1. Start the PostGIS container

```bash
docker run -d \
  --name mapui-postgres \
  -e POSTGRES_DB=mapui \
  -e POSTGRES_USER=mapui_user \
  -e POSTGRES_PASSWORD=mapui_dev_password \
  -p 5432:5432 \
  postgis/postgis:16-3.4
```

#### 2. Wait for PostgreSQL to be ready

```bash
docker exec mapui-postgres sh -c "until pg_isready -U mapui_user -d mapui; do sleep 1; done"
```

#### 3. Initialize the database schema

```bash
docker cp /path/to/MapUI/db/migrations/001_initial_schema.sql mapui-postgres:/tmp/
docker cp /path/to/MapUI/db/migrations/002_seed_connecticut.sql mapui-postgres:/tmp/
docker exec mapui-postgres psql -U mapui_user -d mapui -f /tmp/001_initial_schema.sql
docker exec mapui-postgres psql -U mapui_user -d mapui -f /tmp/002_seed_connecticut.sql
```

#### 4. Create and start the app container (linked to PostGIS)

```bash
docker run -d -p 5000:5000 \
  --name mapui-server \
  --link mapui-postgres:postgres \
  node:24-alpine sh -c "mkdir -p /app && cd /app && sleep infinity"
```

#### 5. Copy project files and install dependencies

```bash
docker cp /path/to/MapUI/. mapui-server:/app/
docker exec mapui-server sh -c "cd /app && npm install"
```

#### 6. Start the development server

```bash
docker exec -d -e HOST=0.0.0.0 -e DATABASE_URL=postgresql://mapui_user:mapui_dev_password@postgres:5432/mapui \
  mapui-server sh -c "cd /app && npx tsx server/index.ts"
```

#### 7. Access the application

Open your browser to: **http://localhost:5000**

The map will center on Connecticut with ~10,000 utility infrastructure artifacts.

---

### Option B: In-Memory Storage (Quick Start)

For quick testing without PostGIS, use in-memory storage.

#### 1. Create and start the container

```bash
docker run -d -p 5000:5000 --name mapui-server node:24-alpine sh -c "mkdir -p /app && cd /app && sleep infinity"
```

#### 2. Copy project files to container

```bash
docker cp /path/to/MapUI/. mapui-server:/app/
```

#### 3. Install dependencies

```bash
docker exec mapui-server sh -c "cd /app && npm install"
```

#### 4. Start the development server

```bash
docker exec -d -e HOST=0.0.0.0 mapui-server sh -c "cd /app && npx tsx server/index.ts"
```

#### 5. Access the application

Open your browser to: **http://localhost:5000**

Note: Without `DATABASE_URL`, the app uses in-memory storage with seeded Connecticut data.

---

## Using Docker Compose (Alternative)

For automated setup with both containers:

```bash
cd /path/to/MapUI
docker-compose up -d
```

This starts both PostGIS and the app container with proper networking.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` (dev) / `0.0.0.0` (prod) | Server bind address |
| `PORT` | `5000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `DATABASE_URL` | (empty) | PostgreSQL connection string |
| `TILE_STORAGE_PATH` | `./tiles` | Path for raster tile storage |
| `ALLOWED_ORIGINS` | (empty) | Comma-separated CORS origins for production |

---

## Docker Commands Reference

### PostGIS Container

#### Check database status
```bash
docker exec mapui-postgres psql -U mapui_user -d mapui -c "SELECT COUNT(*) FROM artifacts;"
```

#### View PostGIS version
```bash
docker exec mapui-postgres psql -U mapui_user -d mapui -c "SELECT PostGIS_Version();"
```

#### Connect to database shell
```bash
docker exec -it mapui-postgres psql -U mapui_user -d mapui
```

#### Re-run migrations
```bash
docker exec mapui-postgres psql -U mapui_user -d mapui -c "DROP TABLE IF EXISTS artifacts, tile_metadata CASCADE;"
docker exec mapui-postgres psql -U mapui_user -d mapui -f /tmp/001_initial_schema.sql
docker exec mapui-postgres psql -U mapui_user -d mapui -f /tmp/002_seed_connecticut.sql
```

### App Container

#### View server logs
```bash
docker exec mapui-server sh -c "cat /tmp/server.log"
```

#### Check running processes
```bash
docker exec mapui-server sh -c "ps aux | grep node"
```

#### Restart the server (with PostGIS)
```bash
docker exec mapui-server sh -c "pkill -f node" || true
docker exec -d -e HOST=0.0.0.0 -e DATABASE_URL=postgresql://mapui_user:mapui_dev_password@postgres:5432/mapui \
  mapui-server sh -c "cd /app && npx tsx server/index.ts > /tmp/server.log 2>&1"
```

#### Restart the server (in-memory)
```bash
docker exec mapui-server sh -c "pkill -f node" || true
docker exec -d -e HOST=0.0.0.0 mapui-server sh -c "cd /app && npx tsx server/index.ts > /tmp/server.log 2>&1"
```

#### Check health endpoint
```bash
curl http://localhost:5000/api/health
```

### Stop and Remove Containers

```bash
# Stop containers
docker stop mapui-server mapui-postgres

# Remove containers
docker rm mapui-server mapui-postgres
```

### Start Fresh (Full Stack with PostGIS)

```bash
# Clean up
docker stop mapui-server mapui-postgres 2>/dev/null || true
docker rm mapui-server mapui-postgres 2>/dev/null || true

# Start PostGIS
docker run -d --name mapui-postgres \
  -e POSTGRES_DB=mapui -e POSTGRES_USER=mapui_user -e POSTGRES_PASSWORD=mapui_dev_password \
  -p 5432:5432 postgis/postgis:16-3.4

# Wait for ready
sleep 5

# Initialize schema
docker cp /path/to/MapUI/db/migrations/001_initial_schema.sql mapui-postgres:/tmp/
docker cp /path/to/MapUI/db/migrations/002_seed_connecticut.sql mapui-postgres:/tmp/
docker exec mapui-postgres psql -U mapui_user -d mapui -f /tmp/001_initial_schema.sql
docker exec mapui-postgres psql -U mapui_user -d mapui -f /tmp/002_seed_connecticut.sql

# Start app
docker run -d -p 5000:5000 --name mapui-server --link mapui-postgres:postgres \
  node:24-alpine sh -c "mkdir -p /app && sleep infinity"

docker cp /path/to/MapUI/. mapui-server:/app/
docker exec mapui-server sh -c "cd /app && npm install"
docker exec -d -e HOST=0.0.0.0 -e DATABASE_URL=postgresql://mapui_user:mapui_dev_password@postgres:5432/mapui \
  mapui-server sh -c "cd /app && npx tsx server/index.ts"
```

---

## Local Development (without Docker)

If you prefer to run without Docker:

```bash
# Install dependencies
npm install

# Start development server (in-memory storage)
npm run dev

# Or with PostgreSQL (requires local PostGIS instance)
DATABASE_URL=postgresql://user:pass@localhost:5432/mapui npm run dev
```

The server will start on `http://localhost:5000`.

---

## Production Build

```bash
# Build the application
npm run build

# Start production server
NODE_ENV=production npm start
```

---

## Architecture

### With PostGIS (Full Stack)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Docker Network                              │
│                                                                  │
│  ┌─────────────────────┐      ┌───────────────────────────────┐ │
│  │  mapui-postgres     │      │     mapui-server              │ │
│  │  (PostGIS 16-3.4)   │◄────►│     (Node.js 24)              │ │
│  │                     │      │  ┌─────────────────────────┐  │ │
│  │  - artifacts table  │      │  │  Express API            │  │ │
│  │  - tile_metadata    │      │  │  (port 5000)            │  │ │
│  │  - spatial indexes  │      │  └─────────────────────────┘  │ │
│  │                     │      │  ┌─────────────────────────┐  │ │
│  │  Port: 5432         │      │  │  Vite Dev Server (HMR)  │  │ │
│  └─────────────────────┘      │  └─────────────────────────┘  │ │
│                               │                               │ │
│                               │  Port: 5000                   │ │
│                               └───────────────────────────────┘ │
└───────────────────────────────────────┼─────────────────────────┘
                                        │
                                   Host Machine
                                  localhost:5000
```

### In-Memory Only

```
┌─────────────────────────────────────────────────────┐
│                    Docker Container                  │
│  ┌───────────────────────────────────────────────┐  │
│  │              Node.js Server (tsx)              │  │
│  │  ┌─────────────────┐  ┌────────────────────┐  │  │
│  │  │  Express API    │  │   Vite Dev Server  │  │  │
│  │  │  (port 5000)    │  │   (HMR middleware) │  │  │
│  │  └─────────────────┘  └────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                         │                            │
│                    Port 5000                         │
└─────────────────────────┼───────────────────────────┘
                          │
                     Host Machine
                    localhost:5000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/artifacts/viewport` | Get clustered artifacts for map viewport |
| GET | `/api/artifacts` | Get all artifacts (with optional bounds filter) |
| GET | `/api/artifacts/:id` | Get single artifact by ID |
| POST | `/api/artifacts` | Create new artifact |
| POST | `/api/artifacts/query/circle` | Query artifacts within circle selection |
| GET | `/api/artifacts/count` | Get total artifact count |
| GET | `/api/health` | Health check (storage status + count) |
| GET | `/api/tiles/info` | Tile layer metadata |
| GET | `/tiles/:layer/:z/:x/:y.:format` | Serve raster tiles |

---

## Security Features

The server includes several security measures:

- **Helmet.js** - Sets security headers (CSP, X-Frame-Options, etc.)
- **CORS** - Configurable cross-origin resource sharing
- **Rate Limiting** - 1000 requests per 15 minutes per IP
- **Request Timeouts** - 30-second timeout for all requests
- **Input Validation** - Zod schemas for all API inputs
- **Graceful Shutdown** - Handles SIGTERM/SIGINT properly
- **Path Traversal Protection** - Tile endpoint validates layer names

---

## Troubleshooting

### ERR_EMPTY_RESPONSE in browser
- Ensure the server is binding to `0.0.0.0` not `127.0.0.1`
- Set `HOST=0.0.0.0` environment variable
- Check Docker port mapping: `docker port mapui-server`

### Database connection errors
- Verify PostGIS container is running: `docker ps | grep mapui-postgres`
- Check DATABASE_URL is set correctly
- Ensure containers are linked: `--link mapui-postgres:postgres`

### Missing dependencies errors
```bash
docker exec mapui-server sh -c "cd /app && npm install"
```

### Port already in use
```bash
docker stop mapui-server mapui-postgres && docker rm mapui-server mapui-postgres
# Then recreate the containers
```

### Server crashes on startup
Check the logs:
```bash
docker exec mapui-server sh -c "cat /tmp/server.log"
```

### PostGIS extension not available
```bash
docker exec mapui-postgres psql -U mapui_user -d mapui -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```
