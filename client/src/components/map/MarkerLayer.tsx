import { useMemo, useState, useCallback } from "react";
import { Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useMapContext } from "./MapContext";
import { useMapMarkers } from "@/hooks/useMapMarkers";
import { createMarkerIcon, createClusterIcon } from "./MarkerIcon";
import { MetadataPopup } from "./MetadataPopup";
import { createTooltipContent } from "./HoverTooltip";
import type { Artifact } from "@shared/schema";
import type { ClusterData } from "@/lib/mapTypes";

export function MarkerLayer() {
  const map = useMap();
  const { artifacts, mapState, selectionState, updateBounds, updateZoom } =
    useMapContext();
  const { bounds, zoom } = mapState;
  const { selectedArtifacts } = selectionState;

  const [selectedMarker, setSelectedMarker] = useState<Artifact | null>(null);

  const selectedIds = useMemo(
    () => new Set(selectedArtifacts.map((a) => a.id)),
    [selectedArtifacts]
  );

  const { clusters, singles } = useMapMarkers(artifacts, bounds, zoom);

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
    (cluster: ClusterData) => {
      if (cluster.artifacts && cluster.artifacts.length > 0) {
        const latLngs = cluster.artifacts.map(
          (a) => [a.lat, a.lng] as [number, number]
        );
        const clusterBounds = L.latLngBounds(latLngs);
        
        if (clusterBounds.isValid()) {
          map.fitBounds(clusterBounds, { 
            padding: [50, 50], 
            maxZoom: Math.min(map.getZoom() + 3, 18) 
          });
        } else {
          map.setView([cluster.lat, cluster.lng], map.getZoom() + 2);
        }
      } else {
        map.setView([cluster.lat, cluster.lng], map.getZoom() + 2);
      }
    },
    [map]
  );

  return (
    <>
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
              <div
                dangerouslySetInnerHTML={{
                  __html: createTooltipContent(artifact),
                }}
              />
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
