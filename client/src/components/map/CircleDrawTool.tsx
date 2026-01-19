import { useEffect, useRef, useState, useCallback } from "react";
import { useMap, useMapEvents, Circle } from "react-leaflet";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useMapContext } from "./MapContext";
import type { CircleSelection, AggregationResult } from "@shared/schema";

export function CircleDrawTool() {
  const map = useMap();
  const { drawingMode, finishDrawing, setLoading } = useMapContext();

  const [drawingCircle, setDrawingCircle] = useState<{
    center: [number, number];
    radius: number;
  } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const startPointRef = useRef<[number, number] | null>(null);

  const circleQueryMutation = useMutation({
    mutationFn: async (selection: CircleSelection): Promise<AggregationResult> => {
      const response = await apiRequest(
        "POST",
        "/api/artifacts/query/circle",
        selection
      );
      const data = await response.json();
      if (!data || !Array.isArray(data.artifacts)) {
        throw new Error("Invalid aggregation response");
      }
      return data as AggregationResult;
    },
    onSuccess: (data, selection) => {
      if (data.artifacts && data.artifacts.length >= 0) {
        finishDrawing(selection, data.artifacts);
      }
      setLoading(false);
    },
    onError: (error) => {
      console.error("Circle query failed:", error);
      setLoading(false);
      // Could show an error toast here
    },
  });

  const calculateRadius = useCallback(
    (start: [number, number], end: [number, number]): number => {
      const startLatLng = { lat: start[0], lng: start[1] };
      const endLatLng = { lat: end[0], lng: end[1] };

      const startPoint = map.latLngToContainerPoint(startLatLng);
      const endPoint = map.latLngToContainerPoint(endLatLng);

      const pixelDistance = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) +
          Math.pow(endPoint.y - startPoint.y, 2)
      );

      const metersPerPixel =
        (40075016.686 *
          Math.abs(Math.cos((startLatLng.lat * Math.PI) / 180))) /
        Math.pow(2, map.getZoom() + 8);

      return pixelDistance * metersPerPixel;
    },
    [map]
  );

  const handleDrawStart = useCallback(
    (lat: number, lng: number) => {
      if (drawingMode !== "circle") return;

      map.dragging.disable();
      setIsDrawing(true);
      startPointRef.current = [lat, lng];
      setDrawingCircle({
        center: [lat, lng],
        radius: 0,
      });
    },
    [drawingMode, map]
  );

  const handleDrawMove = useCallback(
    (lat: number, lng: number) => {
      if (!isDrawing || drawingMode !== "circle" || !startPointRef.current) return;

      const radius = calculateRadius(startPointRef.current, [lat, lng]);
      setDrawingCircle({
        center: startPointRef.current,
        radius,
      });
    },
    [isDrawing, drawingMode, calculateRadius]
  );

  const handleDrawEnd = useCallback(
    (lat: number, lng: number) => {
      if (!isDrawing || drawingMode !== "circle" || !startPointRef.current) return;

      map.dragging.enable();
      setIsDrawing(false);

      const radius = calculateRadius(startPointRef.current, [lat, lng]);

      if (radius > 50) {
        const selection: CircleSelection = {
          center: {
            lat: startPointRef.current[0],
            lng: startPointRef.current[1],
          },
          radius,
        };

        setLoading(true);
        circleQueryMutation.mutate(selection);
      }

      startPointRef.current = null;
      setDrawingCircle(null);
    },
    [isDrawing, drawingMode, map, calculateRadius, setLoading, circleQueryMutation]
  );

  useMapEvents({
    mousedown(e) {
      handleDrawStart(e.latlng.lat, e.latlng.lng);
    },
    mousemove(e) {
      handleDrawMove(e.latlng.lat, e.latlng.lng);
    },
    mouseup(e) {
      handleDrawEnd(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (drawingMode !== "circle") return;

    const container = map.getContainer();

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const point = map.containerPointToLatLng([touch.clientX - container.getBoundingClientRect().left, touch.clientY - container.getBoundingClientRect().top]);
      handleDrawStart(point.lat, point.lng);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !isDrawing) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const point = map.containerPointToLatLng([touch.clientX - container.getBoundingClientRect().left, touch.clientY - container.getBoundingClientRect().top]);
      handleDrawMove(point.lat, point.lng);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      
      const touch = e.changedTouches[0];
      const point = map.containerPointToLatLng([touch.clientX - container.getBoundingClientRect().left, touch.clientY - container.getBoundingClientRect().top]);
      handleDrawEnd(point.lat, point.lng);
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [drawingMode, map, isDrawing, handleDrawStart, handleDrawMove, handleDrawEnd]);

  useEffect(() => {
    if (drawingMode === "circle") {
      map.getContainer().style.cursor = "crosshair";
    } else {
      map.getContainer().style.cursor = "";
    }

    return () => {
      map.getContainer().style.cursor = "";
    };
  }, [drawingMode, map]);

  if (!drawingCircle || drawingCircle.radius < 10) {
    return null;
  }

  return (
    <Circle
      center={drawingCircle.center}
      radius={drawingCircle.radius}
      pathOptions={{
        color: "hsl(210, 85%, 45%)",
        fillColor: "hsl(210, 85%, 45%)",
        fillOpacity: 0.15,
        weight: 2,
        dashArray: "8, 8",
      }}
    />
  );
}
