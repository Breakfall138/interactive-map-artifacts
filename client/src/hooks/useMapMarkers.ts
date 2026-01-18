import { useMemo } from "react";
import type { Artifact, Bounds } from "@shared/schema";
import type { ClusterData } from "@/lib/mapTypes";

const MIN_ZOOM_FOR_CLUSTERING = 14;

interface ClusterResult {
  clusters: ClusterData[];
  singles: Artifact[];
}

export function useMapMarkers(
  artifacts: Artifact[],
  bounds: Bounds | null,
  zoom: number
): ClusterResult {
  return useMemo(() => {
    if (!bounds || artifacts.length === 0) {
      return { clusters: [], singles: [] };
    }

    const bufferLat = (bounds.north - bounds.south) * 0.1;
    const bufferLng = (bounds.east - bounds.west) * 0.1;

    const visible = artifacts.filter(
      (a) =>
        a.lat >= bounds.south - bufferLat &&
        a.lat <= bounds.north + bufferLat &&
        a.lng >= bounds.west - bufferLng &&
        a.lng <= bounds.east + bufferLng
    );

    if (zoom >= MIN_ZOOM_FOR_CLUSTERING) {
      return { clusters: [], singles: visible };
    }

    const gridSize = getGridSize(zoom);
    const grid = new Map<string, Artifact[]>();

    visible.forEach((artifact) => {
      const cellX = Math.floor(artifact.lng / gridSize);
      const cellY = Math.floor(artifact.lat / gridSize);
      const key = `${cellX}:${cellY}`;

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(artifact);
    });

    const clusters: ClusterData[] = [];
    const singles: Artifact[] = [];

    grid.forEach((cellArtifacts, key) => {
      if (cellArtifacts.length >= 3) {
        const centerLat =
          cellArtifacts.reduce((sum, a) => sum + a.lat, 0) /
          cellArtifacts.length;
        const centerLng =
          cellArtifacts.reduce((sum, a) => sum + a.lng, 0) /
          cellArtifacts.length;

        clusters.push({
          id: `cluster-${key}`,
          lat: centerLat,
          lng: centerLng,
          count: cellArtifacts.length,
          artifacts: cellArtifacts,
        });
      } else {
        singles.push(...cellArtifacts);
      }
    });

    return { clusters, singles };
  }, [artifacts, bounds, zoom]);
}

function getGridSize(zoom: number): number {
  if (zoom <= 6) return 2;
  if (zoom <= 8) return 1;
  if (zoom <= 10) return 0.5;
  if (zoom <= 12) return 0.1;
  return 0.05;
}
