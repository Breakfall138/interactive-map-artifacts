import { X, MapPin, Tag, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Artifact } from "@shared/schema";
import { getCategoryColor } from "@/lib/mapTypes";

interface MetadataPopupProps {
  artifact: Artifact;
  onClose: () => void;
}

export function MetadataPopup({ artifact, onClose }: MetadataPopupProps) {
  const categoryColor = getCategoryColor(artifact.category);

  return (
    <div
      className="bg-card border border-card-border rounded-xl shadow-2xl w-80 overflow-hidden"
      data-testid={`popup-artifact-${artifact.id}`}
    >
      <div
        className="h-2"
        style={{ backgroundColor: categoryColor }}
      />
      
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-lg text-foreground truncate"
              data-testid={`text-artifact-name-${artifact.id}`}
            >
              {artifact.name}
            </h3>
            <Badge
              variant="secondary"
              className="mt-1"
              style={{
                backgroundColor: `${categoryColor}20`,
                color: categoryColor,
                borderColor: categoryColor,
              }}
            >
              {artifact.category}
            </Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="flex-shrink-0"
            data-testid={`button-close-popup-${artifact.id}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {artifact.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {artifact.description}
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              {artifact.lat.toFixed(6)}, {artifact.lng.toFixed(6)}
            </span>
          </div>

          {artifact.createdAt && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                {new Date(artifact.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {artifact.metadata && Object.keys(artifact.metadata).length > 0 && (
          <>
            <div className="my-4 border-t border-border" />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Additional Details
              </h4>
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {Object.entries(artifact.metadata).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-2 text-sm"
                    >
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="text-foreground font-medium text-right">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
