# Claude Code Project Context

## Project Overview

MapUI is an interactive map application for visualizing and querying geospatial artifacts using Leaflet, React, and Express.

## Key Documentation

- [Deployment Guide](../docs/DEPLOYMENT.md) - Docker setup and dev environment
- [Planned Updates](../PLANNED_UPDATES.md) - Roadmap and enhancement plans

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, shadcn/ui, react-leaflet
- **Backend**: Express.js, TypeScript, tsx
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
│   ├── routes.ts     # API routes
│   ├── storage.ts    # Data storage with spatial indexing
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared types and schemas
│   └── schema.ts     # Zod validation schemas
└── docs/             # Documentation
```

## Running the Project

### Docker (Recommended)
See [Deployment Guide](../docs/DEPLOYMENT.md)

### Local
```bash
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/artifacts/viewport` | Get clustered artifacts for viewport |
| GET | `/api/artifacts` | Get all artifacts (with optional bounds) |
| GET | `/api/artifacts/:id` | Get single artifact |
| POST | `/api/artifacts` | Create new artifact |
| POST | `/api/artifacts/query/circle` | Query artifacts in circle selection |

## Security Notes

- Helmet.js configured with CSP
- CORS restricted in production (set `ALLOWED_ORIGINS` env var)
- Rate limiting: 1000 req/15min per IP
- Input validation on all endpoints
- No plain-text password storage (auth schemas removed)
