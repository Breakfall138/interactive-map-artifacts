import type { Artifact, Bounds, CircleSelection } from "@shared/schema";

export interface MapState {
  center: [number, number];
  zoom: number;
  bounds: Bounds | null;
}

export interface ClusterData {
  id: string;
  lat: number;
  lng: number;
  count: number;
  artifacts: Artifact[];
}

export interface MarkerClusterGroup {
  id: string;
  bounds: Bounds;
  markers: Artifact[];
  cluster?: ClusterData;
}

export interface SelectionState {
  isDrawing: boolean;
  circle: CircleSelection | null;
  selectedArtifacts: Artifact[];
  isLoading: boolean;
}

export interface TooltipData {
  artifact: Artifact;
  position: { x: number; y: number };
}

export interface PopupData {
  artifact: Artifact;
  position: [number, number];
}

export type DrawingMode = "none" | "circle";

export interface SpatialIndexItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  artifact: Artifact;
}

export const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#ef4444",
  hotel: "#3b82f6",
  museum: "#8b5cf6",
  park: "#22c55e",
  shopping: "#f59e0b",
  landmark: "#ec4899",
  transport: "#06b6d4",
  default: "#6b7280",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.default;
}
