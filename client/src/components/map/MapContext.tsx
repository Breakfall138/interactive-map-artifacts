import { createContext, useContext, type ReactNode } from "react";
import { useMapState } from "@/hooks/useMapState";
import { useLayerState } from "@/hooks/useLayerState";

type MapStateReturn = ReturnType<typeof useMapState>;
type LayerStateReturn = ReturnType<typeof useLayerState>;

interface MapContextValue extends MapStateReturn {
  layerState: LayerStateReturn;
}

const MapContext = createContext<MapContextValue | null>(null);

interface MapProviderProps {
  children: ReactNode;
}

export function MapProvider({ children }: MapProviderProps) {
  const mapState = useMapState();
  const layerState = useLayerState();

  return (
    <MapContext.Provider value={{ ...mapState, layerState }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapContext must be used within a MapProvider");
  }
  return context;
}
