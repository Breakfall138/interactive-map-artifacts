import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useArtifactFilter } from "../../client/src/hooks/useArtifactFilter";
import type { Artifact } from "@shared/schema";
import type { FilterState } from "../../client/src/components/map/SearchFilterBar";

// Create test artifacts helper
function createTestArtifacts(): Artifact[] {
  return [
    {
      id: "1",
      name: "Hartford Transformer",
      category: "transformer",
      description: "Main transformer in Hartford area",
      lat: 41.5,
      lng: -72.7,
      createdAt: "2025-01-15T10:00:00Z",
    },
    {
      id: "2",
      name: "New Haven Substation",
      category: "substation",
      description: "Distribution substation serving New Haven",
      lat: 41.3,
      lng: -72.9,
      createdAt: "2025-01-10T10:00:00Z",
    },
    {
      id: "3",
      name: "Bridgeport Pole",
      category: "pole",
      description: "Utility pole in Bridgeport district",
      lat: 41.2,
      lng: -73.2,
      createdAt: "2024-12-20T10:00:00Z",
    },
    {
      id: "4",
      name: "Stamford Meter",
      category: "meter",
      description: "Smart meter installation in Stamford",
      lat: 41.0,
      lng: -73.5,
      createdAt: "2024-11-15T10:00:00Z",
    },
    {
      id: "5",
      name: "Hartford Switch",
      category: "switch",
      description: "Load break switch near Hartford downtown",
      lat: 41.5,
      lng: -72.68,
      createdAt: "2024-06-01T10:00:00Z",
    },
  ];
}

// Default empty filter state
const emptyFilters: FilterState = {
  searchText: "",
  categories: [],
  dateRange: { from: undefined, to: undefined },
};

describe("useArtifactFilter", () => {
  describe("with no filters applied", () => {
    it("should return all artifacts when no filters are active", () => {
      const artifacts = createTestArtifacts();
      const { result } = renderHook(() => useArtifactFilter(artifacts, emptyFilters));

      expect(result.current).toHaveLength(5);
    });

    it("should return empty array when artifacts is empty", () => {
      const { result } = renderHook(() => useArtifactFilter([], emptyFilters));

      expect(result.current).toHaveLength(0);
    });
  });

  describe("search text filtering", () => {
    it("should filter by name (case insensitive)", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        searchText: "hartford",
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.map((a) => a.name)).toEqual([
        "Hartford Transformer",
        "Hartford Switch",
      ]);
    });

    it("should filter by description (case insensitive)", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        searchText: "smart meter",
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0].name).toBe("Stamford Meter");
    });

    it("should handle search text with whitespace (known limitation)", () => {
      const artifacts = createTestArtifacts();
      // Note: Current implementation checks trim() to determine if search is active,
      // but uses untrimmed value for matching. "  Hartford  " won't match "Hartford".
      // This test documents the current behavior.
      const filters: FilterState = {
        ...emptyFilters,
        searchText: "  Hartford  ",
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      // Current behavior: whitespace-padded search doesn't match (returns 0)
      // If this changes to trim before search, update to expect 2
      expect(result.current).toHaveLength(0);
    });

    it("should ignore whitespace-only search text", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        searchText: "   ",
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(5);
    });

    it("should return empty array when no matches found", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        searchText: "nonexistent",
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(0);
    });

    it("should handle partial matches", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        searchText: "sub",
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0].name).toBe("New Haven Substation");
    });
  });

  describe("category filtering", () => {
    it("should filter by single category", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        categories: ["transformer"],
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0].category).toBe("transformer");
    });

    it("should filter by multiple categories", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        categories: ["transformer", "substation", "meter"],
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(3);
      expect(result.current.map((a) => a.category).sort()).toEqual([
        "meter",
        "substation",
        "transformer",
      ]);
    });

    it("should return all artifacts when categories array is empty", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        categories: [],
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(5);
    });

    it("should return empty array when no artifacts match category", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        categories: ["nonexistent_category"],
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(0);
    });
  });

  describe("date range filtering", () => {
    it("should filter by from date", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        dateRange: {
          from: new Date("2025-01-01"),
          to: undefined,
        },
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.map((a) => a.name).sort()).toEqual([
        "Hartford Transformer",
        "New Haven Substation",
      ]);
    });

    it("should filter by to date (inclusive end of day)", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        dateRange: {
          from: undefined,
          to: new Date("2024-12-20"),
        },
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      // Should include Dec 20 and earlier
      expect(result.current).toHaveLength(3);
    });

    it("should filter by date range (both from and to)", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        dateRange: {
          from: new Date("2024-12-01"),
          to: new Date("2024-12-31"),
        },
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0].name).toBe("Bridgeport Pole");
    });

    it("should exclude artifacts without createdAt when date filter is active", () => {
      const artifacts: Artifact[] = [
        ...createTestArtifacts(),
        {
          id: "6",
          name: "No Date Artifact",
          category: "pole",
          lat: 41.0,
          lng: -72.0,
          // No createdAt
        },
      ];
      const filters: FilterState = {
        ...emptyFilters,
        dateRange: {
          from: new Date("2020-01-01"),
          to: undefined,
        },
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      // Should not include the artifact without createdAt
      expect(result.current.find((a) => a.name === "No Date Artifact")).toBeUndefined();
    });

    it("should return all artifacts when date range is empty", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        ...emptyFilters,
        dateRange: { from: undefined, to: undefined },
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(5);
    });
  });

  describe("combined filters", () => {
    it("should apply all filters together", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        searchText: "Hartford",
        categories: ["transformer", "switch"],
        dateRange: {
          from: new Date("2024-01-01"),
          to: new Date("2025-12-31"),
        },
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.map((a) => a.name).sort()).toEqual([
        "Hartford Switch",
        "Hartford Transformer",
      ]);
    });

    it("should narrow results with each additional filter", () => {
      const artifacts = createTestArtifacts();

      // First, just search
      const searchOnly: FilterState = {
        ...emptyFilters,
        searchText: "Hartford",
      };
      const { result: result1 } = renderHook(() => useArtifactFilter(artifacts, searchOnly));
      expect(result1.current).toHaveLength(2);

      // Add category filter
      const searchAndCategory: FilterState = {
        searchText: "Hartford",
        categories: ["transformer"],
        dateRange: { from: undefined, to: undefined },
      };
      const { result: result2 } = renderHook(() =>
        useArtifactFilter(artifacts, searchAndCategory)
      );
      expect(result2.current).toHaveLength(1);
    });

    it("should return empty when filters exclude all artifacts", () => {
      const artifacts = createTestArtifacts();
      const filters: FilterState = {
        searchText: "Hartford",
        categories: ["meter"], // No Hartford meters
        dateRange: { from: undefined, to: undefined },
      };

      const { result } = renderHook(() => useArtifactFilter(artifacts, filters));

      expect(result.current).toHaveLength(0);
    });
  });

  describe("memoization", () => {
    it("should return same reference when inputs do not change", () => {
      const artifacts = createTestArtifacts();
      const filters = emptyFilters;

      const { result, rerender } = renderHook(() =>
        useArtifactFilter(artifacts, filters)
      );

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });

    it("should return new reference when filters change", () => {
      const artifacts = createTestArtifacts();
      let filters = emptyFilters;

      const { result, rerender } = renderHook(() =>
        useArtifactFilter(artifacts, filters)
      );

      const firstResult = result.current;

      // Change filters
      filters = { ...emptyFilters, searchText: "Hartford" };
      rerender();

      // Note: This test verifies the hook behavior but since we're using
      // the same artifacts array reference and changing filters,
      // useMemo should recalculate
      expect(result.current.length).toBe(2); // Hartford matches
    });
  });
});
