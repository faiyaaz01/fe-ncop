import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface PaginationBarProps {
  page: number; // 0-indexed
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function PaginationBar({
  page,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  className,
}: PaginationBarProps) {
  if (totalElements === 0) return null;

  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalElements);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (page > 2) pages.push("...");

      const startPage = Math.max(1, page - 1);
      const endPage = Math.min(totalPages - 2, page + 1);

      for (let i = startPage; i <= endPage; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (page < totalPages - 3) pages.push("...");
      if (!pages.includes(totalPages - 1)) pages.push(totalPages - 1);
    }
    return pages;
  };

  return (
    <motion.div
      key={page}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 text-xs text-muted-foreground bg-muted/20",
        className,
      )}
    >
      {/* Showing range */}
      <div className="flex items-center gap-2 text-center sm:text-left">
        <span>
          Showing <strong className="font-semibold text-foreground">{start}</strong> to{" "}
          <strong className="font-semibold text-foreground">{end}</strong> of{" "}
          <strong className="font-semibold text-foreground">{totalElements}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="hidden sm:flex items-center gap-1.5 ml-3 pl-3 border-l border-border/60">
            <span>Show:</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-7 w-16 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Page Navigation buttons */}
      <div className="flex items-center gap-1">
        {/* First */}
        <Button
          variant="outline"
          size="icon"
          className="size-7 hidden sm:flex"
          disabled={page <= 0}
          onClick={() => onPageChange(0)}
          title="First page"
        >
          <ChevronsLeft className="size-3.5" />
        </Button>

        {/* Previous */}
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          title="Previous page"
        >
          <ChevronLeft className="size-3.5" />
        </Button>

        {/* Number buttons */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="px-1.5 text-muted-foreground">
                  ...
                </span>
              );
            }
            const isCurrent = p === page;
            return (
              <Button
                key={p}
                variant={isCurrent ? "default" : "outline"}
                size="sm"
                className={cn(
                  "size-7 p-0 text-xs font-medium",
                  isCurrent ? "pointer-events-none" : "",
                )}
                onClick={() => onPageChange(p as number)}
              >
                {(p as number) + 1}
              </Button>
            );
          })}
        </div>

        {/* Next */}
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          title="Next page"
        >
          <ChevronRight className="size-3.5" />
        </Button>

        {/* Last */}
        <Button
          variant="outline"
          size="icon"
          className="size-7 hidden sm:flex"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(totalPages - 1)}
          title="Last page"
        >
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
