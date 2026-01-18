import { createContext, useContext, type ReactNode } from "react";
import { useMapState } from "@/hooks/useMapState";
import { useSpatialIndex } from "@/hooks/useSpatialIndex";
import type { Artifact } from "@shared/schema";

type MapStateReturn = ReturnType<typeof useMapState>;
type SpatialIndexReturn = ReturnType<typeof useSpatialIndex>;

interface MapContextValue extends MapStateReturn {
  artifacts: Artifact[];
  spatialIndex: SpatialIndexReturn;
}

const MapContext = createContext<MapContextValue | null>(null);

interface MapProviderProps {
  children: ReactNode;
  artifacts: Artifact[];
}

export function MapProvider({ children, artifacts }: MapProviderProps) {
  const mapState = useMapState();
  const spatialIndex = useSpatialIndex(artifacts);

  return (
    <MapContext.Provider
      value={{
        ...mapState,
        artifacts,
        spatialIndex,
      }}
    >
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
