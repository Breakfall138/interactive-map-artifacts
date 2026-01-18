import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export function MapLoadingState() {
  return (
    <div className="w-full h-full bg-muted/50 flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 opacity-30">
        <div className="w-full h-full grid grid-cols-4 gap-0.5">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-full rounded-none" />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 p-8 bg-card/90 backdrop-blur-sm rounded-xl shadow-lg border border-card-border">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium text-foreground">Loading map data</p>
          <p className="text-sm text-muted-foreground mt-1">
            Preparing {">"}10,000 items...
          </p>
        </div>
      </div>
    </div>
  );
}
