import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal, Search } from "lucide-react";
import { motion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchKeys,
  onRowClick,
  filters,
  pageSize = 6,
  empty,
}: {
  rows: T[];
  columns: Column<T>[];
  searchKeys: (row: T) => string;
  onRowClick?: (row: T) => void;
  filters?: ReactNode;
  pageSize?: number;
  empty?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q ? rows.filter((r) => searchKeys(r).toLowerCase().includes(q)) : [...rows];
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out.sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search records…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">{filters}</div>
      </div>

      {visible.length === 0 ? (
        <div className="p-6">{empty}</div>
      ) : (
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-secondary/80 backdrop-blur-md">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "border-b border-border px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground",
                      col.className,
                    )}
                  >
                    {col.sortable ? (
                      <button
                        onClick={() =>
                          setSort((s) =>
                            s?.key === col.key
                              ? { key: col.key, dir: s.dir === "asc" ? "desc" : "asc" }
                              : { key: col.key, dir: "asc" },
                          )
                        }
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                      >
                        {col.header}
                        <ArrowUpDown className="size-3" />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
                <th className="w-12 border-b border-border" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.035, duration: 0.3 }}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-border/70 transition-colors last:border-0",
                    onRowClick && "cursor-pointer hover:bg-secondary/60",
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3.5 align-middle", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                  <td className="px-2 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Row actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass">
                        <DropdownMenuItem onClick={() => onRowClick?.(row)}>
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success(`${row.id} duplicated`)}>
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast(`Export queued for ${row.id}`)}
                        >
                          Export
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {visible.length} of {filtered.length} records
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          {Array.from({ length: pages }).map((_, i) => (
            <Button
              key={i}
              variant={current === i + 1 ? "default" : "outline"}
              size="icon"
              className="size-8 text-xs"
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Next page"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}