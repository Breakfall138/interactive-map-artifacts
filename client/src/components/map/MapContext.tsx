import { createContext, useContext, type ReactNode } from "react";
import { useMapState } from "@/hooks/useMapState";

type MapStateReturn = ReturnType<typeof useMapState>;

interface MapContextValue extends MapStateReturn {}

const MapContext = createContext<MapContextValue | null>(null);

interface MapProviderProps {
  children: ReactNode;
}

export function MapProvider({ children }: MapProviderProps) {
  const mapState = useMapState();

  return (
    <MapContext.Provider value={mapState}>
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
