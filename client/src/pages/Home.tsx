import { useState } from "react";
import { MapView, SearchFilterBar, type FilterState } from "@/components/map";
import "leaflet/dist/leaflet.css";

export default function Home() {
  const [filters, setFilters] = useState<FilterState>({
    searchText: "",
    categories: [],
    dateRange: { from: undefined, to: undefined },
  });

  // Note: Filters are kept for future use
  // They can be applied via query params to the viewport endpoint
  // For now, we're focusing on viewport-based loading performance

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <SearchFilterBar onFilterChange={setFilters} />
      <MapView
        initialCenter={[40.7128, -74.006]}
        initialZoom={12}
      />
    </div>
  );
}
