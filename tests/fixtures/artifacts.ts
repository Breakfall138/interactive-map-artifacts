import type { Artifact, InsertArtifact, Bounds, CircleSelection } from "@shared/schema";

/**
 * Test fixtures for MapUI artifacts
 */

// Connecticut center coordinates (same as seed data)
export const CT_CENTER = {
  lat: 41.5,
  lng: -72.7,
};

// Connecticut bounding box
export const CT_BOUNDS: Bounds = {
  north: 42.0505,
  south: 40.9509,
  east: -71.7872,
  west: -73.7278,
};

/**
 * Generate a valid artifact for testing
 */
export function createTestArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: "Test Artifact",
    category: "transformer",
    lat: CT_CENTER.lat,
    lng: CT_CENTER.lng,
    description: "A test artifact",
    metadata: { voltage: "13.8kV", status: "active" },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate a valid insert artifact (no id)
 */
export function createTestInsertArtifact(overrides: Partial<InsertArtifact> = {}): InsertArtifact {
  return {
    name: "Test Artifact",
    category: "transformer",
    lat: CT_CENTER.lat,
    lng: CT_CENTER.lng,
    description: "A test artifact",
    metadata: { voltage: "13.8kV", status: "active" },
    ...overrides,
  };
}

/**
 * Generate multiple test artifacts spread around a center point
 */
export function createTestArtifacts(
  count: number,
  centerLat: number = CT_CENTER.lat,
  centerLng: number = CT_CENTER.lng,
  spread: number = 0.1
): Artifact[] {
  const categories = ["substation", "transformer", "pole", "meter", "switch"];
  const artifacts: Artifact[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    const distance = (i / count) * spread;

    artifacts.push(
      createTestArtifact({
        id: `test-artifact-${i}`,
        name: `Test Artifact #${i + 1}`,
        category: categories[i % categories.length],
        lat: centerLat + Math.sin(angle) * distance,
        lng: centerLng + Math.cos(angle) * distance,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(), // Each artifact 1 day older
      })
    );
  }

  return artifacts;
}

/**
 * Create valid bounds for testing
 */
export function createTestBounds(overrides: Partial<Bounds> = {}): Bounds {
  return {
    north: CT_CENTER.lat + 0.1,
    south: CT_CENTER.lat - 0.1,
    east: CT_CENTER.lng + 0.1,
    west: CT_CENTER.lng - 0.1,
    ...overrides,
  };
}

/**
 * Create a circle selection for testing
 */
export function createTestCircleSelection(overrides: Partial<CircleSelection> = {}): CircleSelection {
  return {
    center: {
      lat: CT_CENTER.lat,
      lng: CT_CENTER.lng,
    },
    radius: 1000, // 1km radius
    ...overrides,
  };
}

/**
 * Test data for invalid coordinates
 */
export const INVALID_COORDINATES = {
  latTooHigh: { lat: 91, lng: -72.7 },
  latTooLow: { lat: -91, lng: -72.7 },
  lngTooHigh: { lat: 41.5, lng: 181 },
  lngTooLow: { lat: 41.5, lng: -181 },
};

/**
 * Test data for boundary conditions
 */
export const BOUNDARY_COORDINATES = {
  northPole: { lat: 90, lng: 0 },
  southPole: { lat: -90, lng: 0 },
  dateLine: { lat: 0, lng: 180 },
  dateLineNeg: { lat: 0, lng: -180 },
  equatorPrimeMeridian: { lat: 0, lng: 0 },
};

/**
 * Sample categories used in the application
 */
export const TEST_CATEGORIES = [
  "substation",
  "transformer",
  "pole",
  "meter",
  "transmission_line",
  "distribution_line",
  "switch",
  "capacitor_bank",
];
