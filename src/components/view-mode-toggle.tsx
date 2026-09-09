import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewMode = "cards" | "list";

export function ViewModeToggle({
  value,
  mode,
  onChange,
  className,
}: {
  value?: ViewMode;
  mode?: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}) {
  const current = value ?? mode ?? "list";

  return (
    <div
      className={cn(
        "hidden items-center rounded-lg border border-border/80 bg-card p-1 shadow-2xs md:flex",
        className,
      )}
    >
      <Button
        type="button"
        size="sm"
        variant={current === "cards" ? "secondary" : "ghost"}
        onClick={() => onChange("cards")}
        className={cn(
          "h-7 px-2.5 text-xs font-medium gap-1.5 transition-all",
          current === "cards" && "font-semibold shadow-xs",
        )}
        aria-label="Show cards"
      >
        <LayoutGrid className="size-3.5" /> Cards
      </Button>
      <Button
        type="button"
        size="sm"
        variant={current === "list" ? "secondary" : "ghost"}
        onClick={() => onChange("list")}
        className={cn(
          "h-7 px-2.5 text-xs font-medium gap-1.5 transition-all",
          current === "list" && "font-semibold shadow-xs",
        )}
        aria-label="Show list"
      >
        <List className="size-3.5" /> List
      </Button>
    </div>
  );
}
