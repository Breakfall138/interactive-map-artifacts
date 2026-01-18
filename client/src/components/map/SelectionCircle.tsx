import { Circle } from "react-leaflet";
import { useMapContext } from "./MapContext";

export function SelectionCircle() {
  const { selectionState } = useMapContext();
  const { circle } = selectionState;

  if (!circle) {
    return null;
  }

  return (
    <Circle
      center={[circle.center.lat, circle.center.lng]}
      radius={circle.radius}
      pathOptions={{
        color: "hsl(210, 85%, 45%)",
        fillColor: "hsl(210, 85%, 45%)",
        fillOpacity: 0.1,
        weight: 2,
      }}
    />
  );
}
