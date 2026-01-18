import { useMemo } from "react";
import type { Artifact } from "@shared/schema";
import type { FilterState } from "@/components/map/SearchFilterBar";

export function useArtifactFilter(
  artifacts: Artifact[],
  filters: FilterState
): Artifact[] {
  return useMemo(() => {
    let filtered = artifacts;

    // Filter by search text (name or description)
    if (filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (artifact) =>
          artifact.name.toLowerCase().includes(searchLower) ||
          artifact.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by categories
    if (filters.categories.length > 0) {
      filtered = filtered.filter((artifact) =>
        filters.categories.includes(artifact.category)
      );
    }

    // Filter by date range
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter((artifact) => {
        if (!artifact.createdAt) return false;

        const artifactDate = new Date(artifact.createdAt);
        const fromDate = filters.dateRange.from;
        const toDate = filters.dateRange.to;

        if (fromDate && artifactDate < fromDate) return false;
        if (toDate) {
          // Set to end of day for 'to' date
          const endOfDay = new Date(toDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (artifactDate > endOfDay) return false;
        }

        return true;
      });
    }

    return filtered;
  }, [artifacts, filters]);
}
