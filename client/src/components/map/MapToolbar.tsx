import { Circle, X, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMapContext } from "./MapContext";

export function MapToolbar() {
  const { drawingMode, startDrawing, clearSelection, selectionState } =
    useMapContext();

  const isCircleMode = drawingMode === "circle";
  const hasSelection = selectionState.circle !== null;

  return (
    <div
      className="absolute top-4 left-4 z-[1000] flex items-center gap-3"
      data-testid="map-toolbar"
    >
      <div className="flex items-center gap-2 bg-card/95 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-card-border">
        <Button
          size="sm"
          variant={isCircleMode ? "default" : "ghost"}
          onClick={startDrawing}
          className="gap-2"
          data-testid="button-circle-select"
        >
          <Circle className="h-4 w-4" />
          <span className="hidden sm:inline">Circle Select</span>
        </Button>

        {hasSelection && (
          <>
            <div className="w-px h-6 bg-border" />
            <Badge variant="secondary" className="gap-1">
              {selectionState.selectedArtifacts.length} selected
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              onClick={clearSelection}
              data-testid="button-clear-selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {isCircleMode && (
        <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg animate-pulse">
          Click and drag to draw a circle
        </div>
      )}
    </div>
  );
}
