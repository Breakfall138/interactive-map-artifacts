import { useQuery } from "@tanstack/react-query";
import type { Bounds, ViewportResponse } from "@shared/schema";

interface UseViewportArtifactsOptions {
  bounds: Bounds | null;
  zoom: number;
  limit?: number;
  layers?: string[];
}

// Round bounds to 3 decimal places for cache key stability
// This prevents excessive refetching on minor viewport changes
function roundBounds(bounds: Bounds): Bounds {
  return {
    north: Math.round(bounds.north * 1000) / 1000,
    south: Math.round(bounds.south * 1000) / 1000,
    east: Math.round(bounds.east * 1000) / 1000,
    west: Math.round(bounds.west * 1000) / 1000,
  };
}

export function useViewportArtifacts({
  bounds,
  zoom,
  limit = 5000,
  layers,
}: UseViewportArtifactsOptions) {
  const roundedBounds = bounds ? roundBounds(bounds) : null;
  const roundedZoom = Math.round(zoom);
  // Create stable key for layers array
  const layerKey = layers?.sort().join(",") || "all";

  return useQuery<ViewportResponse>({
    queryKey: [
      "/api/artifacts/viewport",
      roundedBounds,
      roundedZoom,
      limit,
      layerKey,
    ],
    queryFn: async () => {
      if (!roundedBounds) {
        return {
          clusters: [],
          singles: [],
          total: 0,
          truncated: false,
        };
      }

      const params = new URLSearchParams({
        north: roundedBounds.north.toString(),
        south: roundedBounds.south.toString(),
        east: roundedBounds.east.toString(),
        west: roundedBounds.west.toString(),
        zoom: roundedZoom.toString(),
        limit: limit.toString(),
      });

      // Add layers filter if specified
      if (layers && layers.length > 0) {
        params.set("layers", layers.join(","));
      }

      const response = await fetch(`/api/artifacts/viewport?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch viewport data");
      }

      return response.json();
    },
    enabled: !!roundedBounds,
    placeholderData: (previousData) => previousData,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}
