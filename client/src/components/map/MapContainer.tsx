import {
  MapContainer as LeafletMapContainer,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapProvider, useMapContext } from "./MapContext";
import { MapControls } from "./MapControls";
import { MapToolbar } from "./MapToolbar";
import { MarkerLayer } from "./MarkerLayer";
import { CircleDrawTool } from "./CircleDrawTool";
import { SelectionCircle } from "./SelectionCircle";
import { SelectionResultsPanel } from "./SelectionResultsPanel";
import { MapLoadingState } from "./MapLoadingState";
import { MapInitializer } from "./MapInitializer";
import type { Artifact } from "@shared/schema";

interface MapViewProps {
  artifacts: Artifact[];
  isLoading?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export function MapView({
  artifacts,
  isLoading = false,
  initialCenter = [40.7128, -74.006],
  initialZoom = 12,
}: MapViewProps) {
  return (
    <MapProvider artifacts={artifacts}>
      <div className="relative w-full h-full" data-testid="map-container">
        {isLoading ? (
          <MapLoadingState />
        ) : (
          <>
            <LeafletMapContainer
              center={initialCenter}
              zoom={initialZoom}
              zoomControl={false}
              className="w-full h-full"
              preferCanvas={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapInitializer />
              <MarkerLayer />
              <CircleDrawTool />
              <SelectionCircle />
              <MapControls />
            </LeafletMapContainer>
            <MapToolbar />
            <SelectionResultsPanelWrapper />
          </>
        )}
      </div>
    </MapProvider>
  );
}

function SelectionResultsPanelWrapper() {
  const { selectionState } = useMapContext();

  if (!selectionState.circle) {
    return null;
  }

  return <SelectionResultsPanel />;
}
