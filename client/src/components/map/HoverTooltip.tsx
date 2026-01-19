import type { Artifact } from "@shared/schema";
import { getCategoryColor } from "@/lib/mapTypes";

interface HoverTooltipProps {
  artifact: Artifact;
}

// Sanitize text to prevent XSS - escapes HTML special characters
function sanitizeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

// Safe tooltip content component for use in Leaflet tooltips
export function TooltipContent({ artifact }: HoverTooltipProps) {
  const categoryColor = getCategoryColor(artifact.category);

  return (
    <div
      style={{
        background: "hsl(var(--popover))",
        border: "1px solid hsl(var(--popover-border))",
        borderRadius: "8px",
        padding: "8px 12px",
        maxWidth: "200px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: categoryColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontWeight: 500,
            fontSize: "14px",
            color: "hsl(var(--foreground))",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {artifact.name}
        </span>
      </div>
      <p
        style={{
          fontSize: "12px",
          color: "hsl(var(--muted-foreground))",
          textTransform: "capitalize",
          margin: 0,
        }}
      >
        {artifact.category}
      </p>
    </div>
  );
}
