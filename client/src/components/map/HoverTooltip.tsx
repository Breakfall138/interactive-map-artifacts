import type { Artifact } from "@shared/schema";
import { getCategoryColor } from "@/lib/mapTypes";

interface HoverTooltipProps {
  artifact: Artifact;
}

export function HoverTooltip({ artifact }: HoverTooltipProps) {
  const categoryColor = getCategoryColor(artifact.category);

  return (
    <div className="bg-popover border border-popover-border rounded-lg shadow-xl px-3 py-2 max-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: categoryColor }}
        />
        <span className="font-medium text-sm text-foreground truncate">
          {artifact.name}
        </span>
      </div>
      <p className="text-xs text-muted-foreground capitalize">
        {artifact.category}
      </p>
    </div>
  );
}

export function createTooltipContent(artifact: Artifact): string {
  const categoryColor = getCategoryColor(artifact.category);
  
  return `
    <div style="
      background: hsl(var(--popover));
      border: 1px solid hsl(var(--popover-border));
      border-radius: 8px;
      padding: 8px 12px;
      max-width: 200px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: ${categoryColor};
          flex-shrink: 0;
        "></div>
        <span style="
          font-weight: 500;
          font-size: 14px;
          color: hsl(var(--foreground));
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${artifact.name}</span>
      </div>
      <p style="
        font-size: 12px;
        color: hsl(var(--muted-foreground));
        text-transform: capitalize;
        margin: 0;
      ">${artifact.category}</p>
    </div>
  `;
}
