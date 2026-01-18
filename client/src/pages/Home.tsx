import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapView, SearchFilterBar, type FilterState } from "@/components/map";
import { useArtifactFilter } from "@/hooks/useArtifactFilter";
import "leaflet/dist/leaflet.css";
import type { Artifact } from "@shared/schema";

export default function Home() {
  const { data: artifacts = [], isLoading, error } = useQuery<Artifact[]>({
    queryKey: ["/api/artifacts"],
  });

  const [filters, setFilters] = useState<FilterState>({
    searchText: "",
    categories: [],
    dateRange: { from: undefined, to: undefined },
  });

  const filteredArtifacts = useArtifactFilter(artifacts, filters);

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
    <div className="h-screen w-screen overflow-hidden relative">
      <SearchFilterBar onFilterChange={setFilters} />
      <MapView
        artifacts={filteredArtifacts}
        isLoading={isLoading}
        initialCenter={[40.7128, -74.006]}
        initialZoom={12}
      />
    </div>
  );
}
