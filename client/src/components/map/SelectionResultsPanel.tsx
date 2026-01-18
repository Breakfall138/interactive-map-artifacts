import { X, Download, Filter, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMapContext } from "./MapContext";
import { getCategoryColor } from "@/lib/mapTypes";
import type { Artifact } from "@shared/schema";
import { useMemo } from "react";

interface SelectionResultsPanelProps {
  onArtifactClick?: (artifact: Artifact) => void;
}

export function SelectionResultsPanel({
  onArtifactClick,
}: SelectionResultsPanelProps) {
  const { selectionState, clearSelection } = useMapContext();
  const { selectedArtifacts, circle, isLoading } = selectionState;

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    selectedArtifacts.forEach((artifact) => {
      stats[artifact.category] = (stats[artifact.category] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [selectedArtifacts]);

  if (!circle) {
    return null;
  }

  const radiusInKm = (circle.radius / 1000).toFixed(2);

  return (
    <div
      className="absolute top-0 right-0 h-full w-full sm:w-[400px] bg-card border-l border-card-border shadow-2xl z-[1001] flex flex-col animate-in slide-in-from-right duration-300"
      data-testid="selection-results-panel"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="font-semibold text-lg">Area Selection</h2>
          <p className="text-sm text-muted-foreground">
            Radius: {radiusInKm} km
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={clearSelection}
          data-testid="button-close-results"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Total"
                value={selectedArtifacts.length}
                color="hsl(var(--primary))"
              />
              <StatCard
                label="Categories"
                value={categoryStats.length}
                color="hsl(var(--chart-2))"
              />
              <StatCard
                label="Avg/Category"
                value={
                  categoryStats.length > 0
                    ? Math.round(selectedArtifacts.length / categoryStats.length)
                    : 0
                }
                color="hsl(var(--chart-3))"
              />
            </div>
          </div>

          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              By Category
            </h3>
            <div className="flex flex-wrap gap-2">
              {categoryStats.map(([category, count]) => (
                <Badge
                  key={category}
                  variant="outline"
                  className="gap-1.5"
                  style={{
                    borderColor: getCategoryColor(category),
                    color: getCategoryColor(category),
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCategoryColor(category) }}
                  />
                  {category}: {count}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <div className="px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Items ({selectedArtifacts.length})
              </h3>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                data-testid="button-export-selection"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="px-4 pb-4 space-y-2">
                {selectedArtifacts.map((artifact) => (
                  <ArtifactListItem
                    key={artifact.id}
                    artifact={artifact}
                    onClick={() => onArtifactClick?.(artifact)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="p-3 text-center">
      <div
        className="text-2xl font-bold"
        style={{ color }}
        data-testid={`stat-${label.toLowerCase()}`}
      >
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

function ArtifactListItem({
  artifact,
  onClick,
}: {
  artifact: Artifact;
  onClick?: () => void;
}) {
  const categoryColor = getCategoryColor(artifact.category);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer transition-colors"
      onClick={onClick}
      data-testid={`list-item-${artifact.id}`}
    >
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: categoryColor }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">
          {artifact.name}
        </p>
        <p className="text-xs text-muted-foreground capitalize">
          {artifact.category}
        </p>
      </div>
      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
}
