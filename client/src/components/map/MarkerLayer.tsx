import { useMemo, useState, useCallback } from "react";
import { Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useMapContext } from "./MapContext";
import { useViewportArtifacts } from "@/hooks/useViewportArtifacts";
import { createMarkerIcon, createClusterIcon } from "./MarkerIcon";
import { MetadataPopup } from "./MetadataPopup";
import { TooltipContent } from "./HoverTooltip";
import type { Artifact } from "@shared/schema";

export function MarkerLayer() {
  const map = useMap();
  const { mapState, selectionState, layerState, updateBounds, updateZoom } =
    useMapContext();
  const { bounds, zoom } = mapState;
  const { selectedArtifacts } = selectionState;
  const { getVisibleLayerIds } = layerState;

  const [selectedMarker, setSelectedMarker] = useState<Artifact | null>(null);

  // Get visible layers for filtering
  const visibleLayers = getVisibleLayerIds();

  // Fetch viewport data with server-side clustering and layer filtering
  const { data, isLoading, error } = useViewportArtifacts({
    bounds,
    zoom,
    limit: 5000,
    layers: visibleLayers.length > 0 ? visibleLayers : undefined,
  });

  const clusters = data?.clusters || [];
  const singles = data?.singles || [];
  const truncated = data?.truncated || false;

  const selectedIds = useMemo(
    () => new Set(selectedArtifacts.map((a) => a.id)),
    [selectedArtifacts]
  );

  useMapEvents({
    moveend(e) {
      const mapInstance = e.target;
      const mapBounds = mapInstance.getBounds();
      updateBounds({
        north: mapBounds.getNorth(),
        south: mapBounds.getSouth(),
        east: mapBounds.getEast(),
        west: mapBounds.getWest(),
      });
      updateZoom(mapInstance.getZoom());
    },
    zoomend(e) {
      const mapInstance = e.target;
      updateZoom(mapInstance.getZoom());
    },
  });

  const handleMarkerClick = useCallback((artifact: Artifact) => {
    setSelectedMarker(artifact);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  const handleClusterClick = useCallback(
    (cluster: { id: string; lat: number; lng: number; count: number }) => {
      // Zoom in to the cluster location
      map.setView([cluster.lat, cluster.lng], Math.min(map.getZoom() + 2, 18));
    },
    [map]
  );

  // Show loading indicator
  if (isLoading && !data) {
    return (
      <div className="absolute top-16 right-4 z-[1000] bg-white rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="text-sm text-gray-700">Loading map data...</span>
        </div>
      </div>
    );
  }

  // Show error message
  if (error) {
    return (
      <div className="absolute top-16 right-4 z-[1000] bg-red-50 border border-red-200 rounded-lg shadow-lg p-3 max-w-xs">
        <span className="text-sm text-red-700">Failed to load map data</span>
      </div>
    );
  }

  return (
    <>
      {/* Truncation warning */}
      {truncated && (
        <div className="absolute top-16 right-4 z-[1000] bg-amber-50 border border-amber-200 rounded-lg shadow-lg p-3 max-w-xs">
          <span className="text-sm text-amber-800">
            Showing limited results. Zoom in for more detail.
          </span>
        </div>
      )}

      {/* Loading indicator while fetching in background */}
      {isLoading && data && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-50 border border-blue-200 rounded-lg shadow-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-xs text-blue-700">Updating...</span>
          </div>
        </div>
      )}

      {clusters.map((cluster) => (
        <Marker
          key={cluster.id}
          position={[cluster.lat, cluster.lng]}
          icon={createClusterIcon(cluster.count)}
          eventHandlers={{
            click: () => handleClusterClick(cluster),
          }}
        >
          <Tooltip direction="top" offset={[0, -20]}>
            <div className="text-sm font-medium">
              {cluster.count} items - Click to zoom
            </div>
          </Tooltip>
        </Marker>
      ))}

      {singles.map((artifact) => {
        const isSelected = selectedIds.has(artifact.id);

        return (
          <Marker
            key={artifact.id}
            position={[artifact.lat, artifact.lng]}
            icon={createMarkerIcon(artifact.category, isSelected)}
            eventHandlers={{
              click: () => handleMarkerClick(artifact),
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -10]}
              opacity={1}
              className="custom-tooltip"
            >
              <TooltipContent artifact={artifact} />
            </Tooltip>
          </Marker>
        );
      })}

      {selectedMarker && (
        <Marker
          position={[selectedMarker.lat, selectedMarker.lng]}
          icon={createMarkerIcon(selectedMarker.category, true)}
        >
          <Popup
            closeButton={false}
            className="custom-popup"
            offset={[0, -10]}
          >
            <MetadataPopup
              artifact={selectedMarker}
              onClose={handleClosePopup}
            />
          </Popup>
        </Marker>
      )}
    </>
  );
}
