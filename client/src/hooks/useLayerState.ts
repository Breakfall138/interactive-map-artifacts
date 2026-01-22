import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Layer } from "@shared/schema";

export function useLayerState() {
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);

  // Fetch all layers from the API
  const {
    data: layers = [],
    isLoading,
    error,
  } = useQuery<Layer[]>({
    queryKey: ["/api/layers"],
    queryFn: async () => {
      const response = await fetch("/api/layers");
      if (!response.ok) {
        throw new Error("Failed to fetch layers");
      }
      return response.json();
    },
    staleTime: 60000, // Consider fresh for 1 minute
  });

  // Local state for visible layers (for optimistic updates)
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());

  // Initialize visible layers from server data - only once on first load
  useEffect(() => {
    if (layers.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      const visible = new Set(
        layers.filter((l) => l.visible).map((l) => l.id)
      );
      setVisibleLayers(visible);
    }
  }, [layers]);

  // Mutation for updating layer visibility
  const visibilityMutation = useMutation({
    mutationFn: async ({
      layerId,
      visible,
    }: {
      layerId: string;
      visible: boolean;
    }) => {
      const response = await fetch(`/api/layers/${layerId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible }),
      });
      if (!response.ok) {
        throw new Error("Failed to update layer visibility");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate layers query to refetch
      queryClient.invalidateQueries({ queryKey: ["/api/layers"] });
    },
  });

  // Toggle layer visibility
  const toggleLayer = useCallback(
    (layerId: string) => {
      const newVisible = !visibleLayers.has(layerId);

      // Optimistic update
      setVisibleLayers((prev) => {
        const next = new Set(prev);
        if (newVisible) {
          next.add(layerId);
        } else {
          next.delete(layerId);
        }
        return next;
      });

      // Persist to server
      visibilityMutation.mutate({ layerId, visible: newVisible });
    },
    [visibleLayers, visibilityMutation]
  );

  // Set multiple layers visible at once
  const setLayersVisible = useCallback((layerIds: string[]) => {
    setVisibleLayers(new Set(layerIds));
  }, []);

  // Get array of visible layer IDs for query parameters
  const getVisibleLayerIds = useCallback(() => {
    return Array.from(visibleLayers);
  }, [visibleLayers]);

  // Check if a specific layer is visible
  const isLayerVisible = useCallback(
    (layerId: string) => {
      return visibleLayers.has(layerId);
    },
    [visibleLayers]
  );

  return {
    layers,
    visibleLayers,
    isLoading,
    error,
    toggleLayer,
    setLayersVisible,
    getVisibleLayerIds,
    isLayerVisible,
  };
}
