import { Plus, Minus, RotateCcw, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMap } from "react-leaflet";
import { useMapContext } from "./MapContext";

export function MapControls() {
  const map = useMap();
  const { drawingMode, startDrawing, clearSelection, selectionState } = useMapContext();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleResetView = () => {
    map.setView([40.7128, -74.006], 12);
  };

  const handleToggleCircle = () => {
    if (drawingMode === "circle") {
      clearSelection();
    } else {
      startDrawing();
    }
  };

  const isDrawingActive = drawingMode === "circle";
  const hasSelection = selectionState.circle !== null;

  return (
    <div
      className="absolute top-4 right-4 z-[1000] flex flex-col gap-2"
      data-testid="map-controls"
    >
      <Button
        size="icon"
        variant="secondary"
        onClick={handleZoomIn}
        className="shadow-lg"
        data-testid="button-zoom-in"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={handleZoomOut}
        className="shadow-lg"
        data-testid="button-zoom-out"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={handleResetView}
        className="shadow-lg"
        data-testid="button-reset-view"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant={isDrawingActive ? "default" : "secondary"}
        onClick={handleToggleCircle}
        className={`shadow-lg ${isDrawingActive ? "ring-2 ring-primary ring-offset-2" : ""}`}
        data-testid="button-draw-circle"
        title={isDrawingActive ? "Cancel drawing" : "Draw circle to select area"}
      >
        <Circle className="h-4 w-4" />
      </Button>
      {hasSelection && (
        <Button
          size="icon"
          variant="destructive"
          onClick={clearSelection}
          className="shadow-lg"
          data-testid="button-clear-selection"
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
