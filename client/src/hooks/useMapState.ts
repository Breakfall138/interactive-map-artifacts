import { useState, useCallback } from "react";
import type { MapState, SelectionState, DrawingMode } from "@/lib/mapTypes";
import type { Bounds, CircleSelection, Artifact } from "@shared/schema";

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006];
const DEFAULT_ZOOM = 12;

export function useMapState() {
  const [mapState, setMapState] = useState<MapState>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    bounds: null,
  });

  const [selectionState, setSelectionState] = useState<SelectionState>({
    isDrawing: false,
    circle: null,
    selectedArtifacts: [],
    isLoading: false,
  });

  const [drawingMode, setDrawingMode] = useState<DrawingMode>("none");

  const updateBounds = useCallback((bounds: Bounds) => {
    setMapState((prev) => ({ ...prev, bounds }));
  }, []);

  const updateZoom = useCallback((zoom: number) => {
    setMapState((prev) => ({ ...prev, zoom }));
  }, []);

  const updateCenter = useCallback((center: [number, number]) => {
    setMapState((prev) => ({ ...prev, center }));
  }, []);

  const startDrawing = useCallback(() => {
    setDrawingMode("circle");
    setSelectionState((prev) => ({
      ...prev,
      isDrawing: true,
      circle: null,
      selectedArtifacts: [],
    }));
  }, []);

  const finishDrawing = useCallback(
    (circle: CircleSelection, artifacts: Artifact[]) => {
      setDrawingMode("none");
      setSelectionState({
        isDrawing: false,
        circle,
        selectedArtifacts: artifacts,
        isLoading: false,
      });
    },
    []
  );

  const clearSelection = useCallback(() => {
    setDrawingMode("none");
    setSelectionState({
      isDrawing: false,
      circle: null,
      selectedArtifacts: [],
      isLoading: false,
    });
  }, []);

  const setSelectedArtifacts = useCallback((artifacts: Artifact[]) => {
    setSelectionState((prev) => ({
      ...prev,
      selectedArtifacts: artifacts,
      isLoading: false,
    }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setSelectionState((prev) => ({ ...prev, isLoading }));
  }, []);

  return {
    mapState,
    selectionState,
    drawingMode,
    updateBounds,
    updateZoom,
    updateCenter,
    startDrawing,
    finishDrawing,
    clearSelection,
    setSelectedArtifacts,
    setLoading,
  };
}
