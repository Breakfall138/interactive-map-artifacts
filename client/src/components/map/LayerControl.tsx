import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useMapContext } from "./MapContext";

// Layer color mapping for visual indicators
const LAYER_COLORS: Record<string, string> = {
  "utility-poc": "#3b82f6", // blue-500
  "eversource-substations": "#ef4444", // red-500
  default: "#6b7280", // gray-500
};

export function LayerControl() {
  const { layerState } = useMapContext();
  const { layers, visibleLayers, toggleLayer, isLoading } = layerState;

  const visibleCount = visibleLayers.size;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          data-testid="layer-control-trigger"
        >
          <Layers className="h-4 w-4" />
          <span className="hidden sm:inline">Layers</span>
          {visibleCount > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-xs">
              {visibleCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 z-[1001]" align="start">
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Data Layers
          </h4>

          {isLoading ? (
            <div className="text-sm text-muted-foreground py-2">
              Loading layers...
            </div>
          ) : layers.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              No layers available
            </div>
          ) : (
            <div className="space-y-1">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                  onClick={() => toggleLayer(layer.id)}
                  data-testid={`layer-item-${layer.id}`}
                >
                  <Checkbox
                    id={layer.id}
                    checked={visibleLayers.has(layer.id)}
                    onCheckedChange={() => toggleLayer(layer.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        LAYER_COLORS[layer.id] || LAYER_COLORS.default,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={layer.id}
                      className="text-sm font-medium cursor-pointer block truncate"
                    >
                      {layer.name}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {layer.artifactCount.toLocaleString()} items
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {layers.length > 0 && (
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Toggle layers to show/hide data on the map
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
