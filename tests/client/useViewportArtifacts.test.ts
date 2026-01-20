import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { Bounds } from "@shared/schema";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

// Import the hook (will be mocked in setup)
async function importHook() {
  return await import("../../client/src/hooks/useViewportArtifacts");
}

describe("useViewportArtifacts", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("bounds rounding", () => {
    it("should round bounds to 3 decimal places for cache key stability", async () => {
      const { useViewportArtifacts } = await importHook();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            clusters: [],
            singles: [],
            total: 0,
            truncated: false,
          }),
      });

      const bounds: Bounds = {
        north: 41.12345678,
        south: 41.00000001,
        east: -72.12345678,
        west: -72.99999999,
      };

      renderHook(() => useViewportArtifacts({ bounds, zoom: 10, limit: 5000 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchUrl = mockFetch.mock.calls[0][0] as string;

      // Check that bounds are rounded to 3 decimal places
      expect(fetchUrl).toContain("north=41.123");
      expect(fetchUrl).toContain("south=41");
      expect(fetchUrl).toContain("east=-72.123");
      expect(fetchUrl).toContain("west=-73");
    });

    it("should round zoom level to integer", async () => {
      const { useViewportArtifacts } = await importHook();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            clusters: [],
            singles: [],
            total: 0,
            truncated: false,
          }),
      });

      const bounds: Bounds = {
        north: 42,
        south: 41,
        east: -72,
        west: -73,
      };

      renderHook(() => useViewportArtifacts({ bounds, zoom: 10.7, limit: 5000 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain("zoom=11"); // Math.round(10.7) = 11
    });
  });

  describe("query behavior", () => {
    it("should not fetch when bounds is null", async () => {
      const { useViewportArtifacts } = await importHook();

      const { result } = renderHook(
        () => useViewportArtifacts({ bounds: null, zoom: 10 }),
        {
          wrapper: createWrapper(),
        }
      );

      // Query is disabled when bounds is null, so data is undefined
      // and fetch should not be called
      expect(result.current.data).toBeUndefined();
      expect(result.current.isFetching).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fetch when bounds is provided", async () => {
      const { useViewportArtifacts } = await importHook();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            clusters: [{ id: "cluster-1", lat: 41.5, lng: -72.7, count: 10 }],
            singles: [],
            total: 10,
            truncated: false,
          }),
      });

      const bounds: Bounds = {
        north: 42,
        south: 41,
        east: -72,
        west: -73,
      };

      const { result } = renderHook(
        () => useViewportArtifacts({ bounds, zoom: 10 }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.clusters).toHaveLength(1);
      expect(result.current.data?.total).toBe(10);
    });

    it("should use default limit of 5000", async () => {
      const { useViewportArtifacts } = await importHook();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            clusters: [],
            singles: [],
            total: 0,
            truncated: false,
          }),
      });

      const bounds: Bounds = {
        north: 42,
        south: 41,
        east: -72,
        west: -73,
      };

      renderHook(() => useViewportArtifacts({ bounds, zoom: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain("limit=5000");
    });

    it("should use custom limit when provided", async () => {
      const { useViewportArtifacts } = await importHook();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            clusters: [],
            singles: [],
            total: 0,
            truncated: false,
          }),
      });

      const bounds: Bounds = {
        north: 42,
        south: 41,
        east: -72,
        west: -73,
      };

      renderHook(() => useViewportArtifacts({ bounds, zoom: 10, limit: 1000 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain("limit=1000");
    });
  });

  describe("error handling", () => {
    it("should handle fetch errors", async () => {
      const { useViewportArtifacts } = await importHook();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const bounds: Bounds = {
        north: 42,
        south: 41,
        east: -72,
        west: -73,
      };

      const { result } = renderHook(
        () => useViewportArtifacts({ bounds, zoom: 10 }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it("should handle network errors", async () => {
      const { useViewportArtifacts } = await importHook();

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const bounds: Bounds = {
        north: 42,
        south: 41,
        east: -72,
        west: -73,
      };

      const { result } = renderHook(
        () => useViewportArtifacts({ bounds, zoom: 10 }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("query key and caching", () => {
    it("should use correct query key structure", async () => {
      const { useViewportArtifacts } = await importHook();

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            clusters: [],
            singles: [],
            total: 0,
            truncated: false,
          }),
      });

      const bounds: Bounds = {
        north: 42,
        south: 41,
        east: -72,
        west: -73,
      };

      // First render
      const { rerender } = renderHook(
        ({ b, z, l }) => useViewportArtifacts({ bounds: b, zoom: z, limit: l }),
        {
          wrapper: createWrapper(),
          initialProps: { b: bounds, z: 10, l: 5000 },
        }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Re-render with same props should use cache (no new fetch)
      rerender({ b: bounds, z: 10, l: 5000 });

      // Should still be 1 call (cached)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should refetch when bounds change significantly", async () => {
      const { useViewportArtifacts } = await importHook();

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            clusters: [],
            singles: [],
            total: 0,
            truncated: false,
          }),
      });

      const bounds1: Bounds = {
        north: 42,
        south: 41,
        east: -72,
        west: -73,
      };

      const bounds2: Bounds = {
        north: 43, // Different
        south: 42, // Different
        east: -71, // Different
        west: -72, // Different
      };

      const { rerender } = renderHook(
        ({ b }) => useViewportArtifacts({ bounds: b, zoom: 10 }),
        {
          wrapper: createWrapper(),
          initialProps: { b: bounds1 },
        }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Change bounds
      rerender({ b: bounds2 });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it("should not refetch when bounds change within rounding threshold", async () => {
      const { useViewportArtifacts } = await importHook();

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            clusters: [],
            singles: [],
            total: 0,
            truncated: false,
          }),
      });

      const bounds1: Bounds = {
        north: 42.0001,
        south: 41.0001,
        east: -72.0001,
        west: -73.0001,
      };

      const bounds2: Bounds = {
        north: 42.0002, // Within rounding threshold
        south: 41.0002, // Within rounding threshold
        east: -72.0002, // Within rounding threshold
        west: -73.0002, // Within rounding threshold
      };

      const { rerender } = renderHook(
        ({ b }) => useViewportArtifacts({ bounds: b, zoom: 10 }),
        {
          wrapper: createWrapper(),
          initialProps: { b: bounds1 },
        }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Change bounds slightly
      rerender({ b: bounds2 });

      // Should still be 1 call (rounded bounds are the same)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("URL construction", () => {
    it("should construct correct URL with all parameters", async () => {
      const { useViewportArtifacts } = await importHook();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            clusters: [],
            singles: [],
            total: 0,
            truncated: false,
          }),
      });

      const bounds: Bounds = {
        north: 42,
        south: 41,
        east: -72,
        west: -73,
      };

      renderHook(() => useViewportArtifacts({ bounds, zoom: 15, limit: 2000 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toBe(
        "/api/artifacts/viewport?north=42&south=41&east=-72&west=-73&zoom=15&limit=2000"
      );
    });
  });
});
