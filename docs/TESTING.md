# MapUI Testing Guide

This document describes the testing strategy, test structure, and how to run tests for the MapUI application.

## Overview

MapUI uses **Vitest** as the test framework with the following supporting libraries:
- `@testing-library/react` - React component and hook testing
- `jsdom` - Browser environment simulation for client tests
- `@vitest/coverage-v8` - Code coverage reporting

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── fixtures/
│   └── artifacts.ts            # Reusable test data generators
├── shared/
│   └── schema.test.ts          # Zod schema validation tests
├── server/
│   ├── memStorage.test.ts      # In-memory storage unit tests
│   ├── storage.test.ts         # Storage factory tests
│   └── routes.test.ts          # API route integration tests
└── client/
    ├── useArtifactFilter.test.ts    # Filter hook tests
    └── useViewportArtifacts.test.ts # Viewport data hook tests
```

## Test Categories

### 1. Schema Validation Tests (`tests/shared/schema.test.ts`)

Tests for Zod schema validation covering:
- **Artifact schema**: Coordinate bounds, string length limits, metadata types
- **Bounds schema**: North/South/East/West validation, refinement (north ≥ south)
- **Circle selection schema**: Positive radius, max radius (Earth's circumference)
- **Viewport and aggregation schemas**: Response structure validation

**Key validations tested:**
- Latitude: -90 to 90
- Longitude: -180 to 180
- Name: 1-500 characters
- Category: 1-100 characters
- Description: 0-5000 characters
- Circle radius: 0 < radius ≤ 40,075,000 meters

### 2. Storage Unit Tests (`tests/server/memStorage.test.ts`)

Tests for the `MemStorage` class covering:
- **CRUD operations**: Create, read, get all, count
- **Spatial queries**: Bounds queries, circle queries with haversine distance
- **Clustering**: Grid-based clustering at different zoom levels
- **Aggregation**: Category counting within selections
- **Performance**: Query times with 10,000 artifacts (<100ms)

**Spatial logic tested:**
- RBush spatial index queries
- Haversine distance calculations at various latitudes
- Degree-to-meter conversion (111,320 m/degree)
- Grid sizes for zoom levels 6-12

### 3. Storage Factory Tests (`tests/server/storage.test.ts`)

Tests for the storage factory pattern:
- Falls back to MemStorage when DATABASE_URL is not set
- Falls back to MemStorage when PostgreSQL connection fails
- Singleton pattern behavior
- Reset functionality for test isolation

### 4. API Route Tests (`tests/server/routes.test.ts`)

Integration tests for all API endpoints:

| Endpoint | Tests |
|----------|-------|
| `GET /api/artifacts/viewport` | Valid params, missing params, invalid zoom, limit clamping |
| `GET /api/artifacts` | All artifacts, bounded query |
| `GET /api/artifacts/count` | Count accuracy |
| `GET /api/artifacts/:id` | Existing/non-existent artifacts |
| `POST /api/artifacts` | Valid creation, validation errors |
| `POST /api/artifacts/query/circle` | Circle query, invalid data |
| `GET /tiles/:layer/:z/:x/:y.:format` | Tile serving, format validation, layer validation |
| `GET /api/tiles/info` | Metadata response |
| `GET /api/health` | Health check response |

**Security tests:**
- Path traversal protection on tile endpoint
- Input validation on all endpoints
- XSS prevention (documented behavior)

**Performance regression tests:**
- Viewport query with 10k artifacts (<500ms)
- Circle query with large radius (<500ms)

### 5. Client Hook Tests

#### `useArtifactFilter` (`tests/client/useArtifactFilter.test.ts`)
- Search text filtering (case-insensitive, name and description)
- Category filtering (single and multiple)
- Date range filtering (from, to, both)
- Combined filter application
- Memoization behavior

#### `useViewportArtifacts` (`tests/client/useViewportArtifacts.test.ts`)
- Bounds rounding for cache key stability (3 decimal places)
- Zoom level rounding
- Query disabled when bounds is null
- Fetch behavior and error handling
- Caching and refetch logic

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with interactive UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Docker Container

```bash
# Run unit tests in container
docker compose --profile test run --rm test

# Run with coverage
docker compose --profile test run --rm test npm run test:coverage

# Run specific test file
docker compose --profile test run --rm test npm test -- tests/server/routes.test.ts

# Run tests matching pattern
docker compose --profile test run --rm test npm test -- --grep "viewport"
```

### Integration Tests with Database

```bash
# Start PostgreSQL and run integration tests
docker compose --profile test-integration run --rm test-integration
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)

```typescript
{
  test: {
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    environmentMatchGlobs: [
      ["tests/client/**", "jsdom"],  // Browser env for React tests
      ["tests/server/**", "node"],   // Node env for server tests
      ["tests/shared/**", "node"],
    ],
  }
}
```

### Environment-Specific Settings

- **Client tests**: Use `jsdom` environment for DOM APIs
- **Server tests**: Use `node` environment
- **Shared tests**: Use `node` environment

## Test Fixtures

Located in `tests/fixtures/artifacts.ts`:

```typescript
// Create a single test artifact
const artifact = createTestArtifact({ name: "Custom Name" });

// Create multiple artifacts spread around a point
const artifacts = createTestArtifacts(100, 41.5, -72.7, 0.1);

// Create test bounds
const bounds = createTestBounds({ north: 42, south: 41 });

// Create circle selection
const circle = createTestCircleSelection({ radius: 5000 });
```

**Available fixtures:**
- `createTestArtifact(overrides)` - Single artifact with defaults
- `createTestInsertArtifact(overrides)` - Artifact without ID (for creation)
- `createTestArtifacts(count, lat, lng, spread)` - Multiple artifacts
- `createTestBounds(overrides)` - Bounds object
- `createTestCircleSelection(overrides)` - Circle selection
- `CT_CENTER`, `CT_BOUNDS` - Connecticut coordinates
- `INVALID_COORDINATES` - Edge cases for validation testing
- `BOUNDARY_COORDINATES` - Poles, date line, etc.

## Writing New Tests

### Server-Side Test Example

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { MemStorage } from "../../server/memStorage";
import { createTestInsertArtifact } from "../fixtures/artifacts";

describe("MyFeature", () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage(false); // No seed data
  });

  it("should do something", async () => {
    const artifact = await storage.createArtifact(
      createTestInsertArtifact({ name: "Test" })
    );
    expect(artifact.id).toBeDefined();
  });
});
```

### Client Hook Test Example

```typescript
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMyHook } from "../../client/src/hooks/useMyHook";

describe("useMyHook", () => {
  it("should return initial state", () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(initialValue);
  });
});
```

## Coverage Targets

| Module | Target | Rationale |
|--------|--------|-----------|
| `server/memStorage.ts` | 95%+ | Core business logic |
| `server/routes.ts` | 90%+ | API contract |
| `shared/schema.ts` | 95%+ | Validation rules |
| `client/src/hooks/*` | 85%+ | State management |

## Known Limitations

1. **Whitespace in search**: The `useArtifactFilter` hook checks `trim()` for emptiness but uses the untrimmed value for matching. Whitespace-padded searches won't match. This is documented in tests.

2. **PostgreSQL tests**: Full database integration tests require a running PostgreSQL instance. Use the `test-integration` profile.

3. **Tile serving**: Tile endpoint tests return 204 (No Content) for missing tiles since no actual tile files exist in the test environment.

## Continuous Integration

For CI/CD pipelines, use the Docker test container:

```yaml
# Example GitHub Actions step
- name: Run Tests
  run: docker compose --profile test run --rm test

- name: Run Tests with Coverage
  run: docker compose --profile test run --rm test npm run test:coverage
```

The test container:
- Uses Node.js 20 Alpine
- Installs dependencies fresh each build
- Exits with non-zero code on test failure
- Outputs coverage reports to `coverage/` directory
