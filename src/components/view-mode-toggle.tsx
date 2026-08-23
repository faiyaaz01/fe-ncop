import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewMode = "cards" | "list";

export function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div className="hidden items-center rounded-lg border border-border bg-card p-1 md:flex">
      <Button
        type="button"
        size="sm"
        variant={value === "cards" ? "secondary" : "ghost"}
        onClick={() => onChange("cards")}
        aria-label="Show cards"
      >
        <LayoutGrid className="size-4" /> Cards
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "list" ? "secondary" : "ghost"}
        onClick={() => onChange("list")}
        aria-label="Show list"
      >
        <List className="size-4" /> List
      </Button>
    </div>
  );
}
