# Development Environment Deployment

This guide covers setting up the MapUI development environment using Docker.

## Prerequisites

- Docker installed and running
- Node.js 24+ (inside container)
- Git

## Quick Start with Docker

### 1. Create and start the container

```bash
docker run -d -p 5000:5000 --name mapui-server node:24-alpine sh -c "mkdir -p /app && cd /app && sleep infinity"
```

### 2. Copy project files to container

```bash
docker cp /path/to/MapUI/. mapui-server:/app/
```

### 3. Install dependencies

```bash
docker exec mapui-server sh -c "cd /app && npm install"
```

### 4. Start the development server

```bash
docker exec -d -e HOST=0.0.0.0 mapui-server sh -c "cd /app && npx tsx server/index.ts"
```

### 5. Access the application

Open your browser to: **http://localhost:5000**

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` (dev) / `0.0.0.0` (prod) | Server bind address |
| `PORT` | `5000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `ALLOWED_ORIGINS` | (empty) | Comma-separated CORS origins for production |

## Docker Commands Reference

### View server logs
```bash
docker exec mapui-server sh -c "cat /tmp/server.log"
```

### Check running processes
```bash
docker exec mapui-server sh -c "ps aux | grep node"
```

### Restart the server
```bash
docker exec mapui-server sh -c "pkill -f node" || true
docker exec -d -e HOST=0.0.0.0 mapui-server sh -c "cd /app && npx tsx server/index.ts > /tmp/server.log 2>&1"
```

### Stop the container
```bash
docker stop mapui-server
```

### Remove the container
```bash
docker rm mapui-server
```

### Start fresh
```bash
docker stop mapui-server && docker rm mapui-server
docker run -d -p 5000:5000 --name mapui-server node:24-alpine sh -c "mkdir -p /app && sleep infinity"
docker cp /path/to/MapUI/. mapui-server:/app/
docker exec mapui-server sh -c "cd /app && npm install"
docker exec -d -e HOST=0.0.0.0 mapui-server sh -c "cd /app && npx tsx server/index.ts"
```

## Local Development (without Docker)

If you prefer to run without Docker:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The server will start on `http://localhost:5000`.

## Production Build

```bash
# Build the application
npm run build

# Start production server
NODE_ENV=production npm start
```

## Architecture

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

## Security Features

The server includes several security measures:

- **Helmet.js** - Sets security headers (CSP, X-Frame-Options, etc.)
- **CORS** - Configurable cross-origin resource sharing
- **Rate Limiting** - 1000 requests per 15 minutes per IP
- **Request Timeouts** - 30-second timeout for all requests
- **Input Validation** - Zod schemas for all API inputs
- **Graceful Shutdown** - Handles SIGTERM/SIGINT properly

## Troubleshooting

### ERR_EMPTY_RESPONSE in browser
- Ensure the server is binding to `0.0.0.0` not `127.0.0.1`
- Set `HOST=0.0.0.0` environment variable
- Check Docker port mapping: `docker port mapui-server`

### Missing dependencies errors
```bash
docker exec mapui-server sh -c "cd /app && npm install"
```

### Port already in use
```bash
docker stop mapui-server && docker rm mapui-server
# Then recreate the container
```

### Server crashes on startup
Check the logs:
```bash
docker exec mapui-server sh -c "cat /tmp/server.log"
```
