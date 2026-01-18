import { useMemo, useCallback } from "react";
import RBush from "rbush";
import type { Artifact, CircleSelection, Bounds } from "@shared/schema";
import type { SpatialIndexItem } from "@/lib/mapTypes";

class ArtifactRBush extends RBush<SpatialIndexItem> {
  toBBox(item: SpatialIndexItem) {
    return {
      minX: item.minX,
      minY: item.minY,
      maxX: item.maxX,
      maxY: item.maxY,
    };
  }

  compareMinX(a: SpatialIndexItem, b: SpatialIndexItem) {
    return a.minX - b.minX;
  }

  compareMinY(a: SpatialIndexItem, b: SpatialIndexItem) {
    return a.minY - b.minY;
  }
}

export function useSpatialIndex(artifacts: Artifact[]) {
  const index = useMemo(() => {
    const tree = new ArtifactRBush();
    const items: SpatialIndexItem[] = artifacts.map((artifact) => ({
      minX: artifact.lng,
      minY: artifact.lat,
      maxX: artifact.lng,
      maxY: artifact.lat,
      artifact,
    }));
    tree.load(items);
    return tree;
  }, [artifacts]);

  const queryBounds = useCallback(
    (bounds: Bounds): Artifact[] => {
      const results = index.search({
        minX: bounds.west,
        minY: bounds.south,
        maxX: bounds.east,
        maxY: bounds.north,
      });
      return results.map((item) => item.artifact);
    },
    [index]
  );

  const queryCircle = useCallback(
    (selection: CircleSelection): Artifact[] => {
      const { center, radius } = selection;
      const radiusInDegrees = radius / 111320;

      const boundingBox = {
        minX: center.lng - radiusInDegrees,
        minY: center.lat - radiusInDegrees,
        maxX: center.lng + radiusInDegrees,
        maxY: center.lat + radiusInDegrees,
      };

      const candidates = index.search(boundingBox);

      return candidates
        .filter((item) => {
          const distance = haversineDistance(
            center.lat,
            center.lng,
            item.artifact.lat,
            item.artifact.lng
          );
          return distance <= radius;
        })
        .map((item) => item.artifact);
    },
    [index]
  );

  return { queryBounds, queryCircle, index };
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
