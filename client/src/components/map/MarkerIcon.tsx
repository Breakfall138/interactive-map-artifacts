import L from "leaflet";
import { getCategoryColor } from "@/lib/mapTypes";

export function createMarkerIcon(category: string, isSelected = false): L.DivIcon {
  const color = getCategoryColor(category);
  const size = isSelected ? 16 : 12;
  const borderWidth = isSelected ? 3 : 2;
  const borderColor = isSelected ? "#ffffff" : "rgba(255,255,255,0.9)";
  const shadow = isSelected
    ? "0 0 0 4px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.3)"
    : "0 2px 6px rgba(0,0,0,0.3)";

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: ${borderWidth}px solid ${borderColor};
        border-radius: 50%;
        box-shadow: ${shadow};
        transition: all 0.15s ease;
        cursor: pointer;
      "></div>
    `,
    iconSize: [size + borderWidth * 2, size + borderWidth * 2],
    iconAnchor: [(size + borderWidth * 2) / 2, (size + borderWidth * 2) / 2],
  });
}

export function createClusterIcon(count: number): L.DivIcon {
  let size = 40;
  let fontSize = 14;

  if (count > 100) {
    size = 56;
    fontSize = 16;
  } else if (count > 50) {
    size = 48;
    fontSize = 15;
  }

  const displayCount = count > 999 ? "999+" : count.toString();

  return L.divIcon({
    className: "custom-cluster",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, hsl(210, 85%, 45%) 0%, hsl(210, 85%, 35%) 100%);
        border: 3px solid rgba(255,255,255,0.9);
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: ${fontSize}px;
        font-family: system-ui, -apple-system, sans-serif;
        cursor: pointer;
        transition: all 0.2s ease;
      "
      onmouseover="this.style.transform='scale(1.1)'"
      onmouseout="this.style.transform='scale(1)'"
      >
        ${displayCount}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
