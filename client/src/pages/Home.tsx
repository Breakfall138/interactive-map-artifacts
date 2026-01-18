import { useQuery } from "@tanstack/react-query";
import { MapView } from "@/components/map";
import "leaflet/dist/leaflet.css";
import type { Artifact } from "@shared/schema";

export default function Home() {
  const { data: artifacts = [], isLoading, error } = useQuery<Artifact[]>({
    queryKey: ["/api/artifacts"],
  });

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Unable to load map data
          </h1>
          <p className="text-muted-foreground">
            Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <MapView
        artifacts={artifacts}
        isLoading={isLoading}
        initialCenter={[40.7128, -74.006]}
        initialZoom={12}
      />
    </div>
  );
}
