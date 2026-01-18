import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { useMapContext } from "./MapContext";

export function MapInitializer() {
  const map = useMap();
  const { updateBounds, updateZoom } = useMapContext();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    const initializeBounds = () => {
      const mapBounds = map.getBounds();
      const north = mapBounds.getNorth();
      const south = mapBounds.getSouth();
      const east = mapBounds.getEast();
      const west = mapBounds.getWest();

      if (
        north !== south &&
        east !== west &&
        !isNaN(north) &&
        !isNaN(south) &&
        !isNaN(east) &&
        !isNaN(west)
      ) {
        updateBounds({ north, south, east, west });
        updateZoom(map.getZoom());
        initializedRef.current = true;
      }
    };

    map.whenReady(() => {
      setTimeout(() => {
        initializeBounds();
      }, 100);
    });
  }, [map, updateBounds, updateZoom]);

  return null;
}
