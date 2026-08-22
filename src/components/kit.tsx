import { motion, useInView, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ── Shared Skeleton Loading States ───────────────────────────────────────────

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-primary/10", className)} />
  );
}

/**
 * Consistent section-level skeleton — use inside a `<div>` container
 * (e.g. product table div wrapper)
 */
export function SectionLoader({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/40">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <SkeletonBox className="size-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBox className="h-3.5 w-2/5" />
            <SkeletonBox className="h-2.5 w-1/4" />
          </div>
          <SkeletonBox className="h-3 w-24 hidden sm:block" />
          <SkeletonBox className="h-3 w-16 hidden md:block" />
          <SkeletonBox className="h-6 w-16 rounded-full hidden lg:block" />
          <SkeletonBox className="h-7 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/**
 * Consistent table-row skeleton — drop inside `<tbody>` as the only rows
 * when `isLoading` is true. Renders `rows` skeleton rows with `colSpan` cells.
 */
export function TableRowLoader({
  colSpan,
  rows = 5,
}: {
  colSpan: number;
  rows?: number;
}) {
  // Build per-cell widths for a natural look
  const cellWidths: Record<number, string[]> = {
    7: ["w-32", "w-20", "w-16", "w-24", "w-20", "w-20", "w-16"],
    6: ["w-32", "w-40", "w-16", "w-16", "w-24", "w-16"],
    5: ["w-32", "w-28", "w-40", "w-20", "w-16"],
  };
  const widths = cellWidths[colSpan] ?? Array(colSpan).fill("w-24");

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-border/40 last:border-0">
          {widths.map((w, colIdx) => (
            <td key={colIdx} className="px-5 py-4">
              {colIdx === 0 ? (
                <div className="flex items-center gap-3">
                  <SkeletonBox className="size-8 rounded-lg shrink-0" />
                  <div className="space-y-1.5">
                    <SkeletonBox className={cn("h-3", w)} />
                    <SkeletonBox className="h-2.5 w-16" />
                  </div>
                </div>
              ) : (
                <SkeletonBox
                  className={cn(
                    "h-3 rounded",
                    w,
                    // vary opacity slightly per row for a natural stagger
                    rowIdx % 2 === 0 ? "opacity-80" : "opacity-60"
                  )}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  className,
  children,
  hover = false,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
}) {
  return <div className={cn("surface flex flex-col justify-between p-5", hover && "lift", className)}>{children}</div>;
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Counter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 70, damping: 18 });

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, mv, value]);

  useEffect(() => {
    return spring.on("change", (v: number) => {
      if (ref.current) {
        ref.current.textContent =
          prefix +
          v.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) +
          suffix;
      }
    });
  }, [spring, prefix, suffix, decimals]);

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone = ["active", "won", "delivered", "available", "quoted"].includes(s)
    ? "bg-accent/12 text-accent border-accent/25"
    : ["on hold", "under review", "qa release", "low stock", "in production"].includes(s)
      ? "bg-chart-4/15 text-chart-4 border-chart-4/30"
      : ["lost", "discontinued"].includes(s)
        ? "bg-destructive/10 text-destructive border-destructive/25"
        : "bg-primary/10 text-primary border-primary/20";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        tone,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Timeline({ items }: { items: { date: string; title: string; detail: string }[] }) {
  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {items.map((item, i) => (
        <motion.li
          key={item.title}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          className="relative"
        >
          <span className="absolute -left-[26px] top-1 grid size-3 place-items-center rounded-full border-2 border-background bg-primary" />
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.date}
          </p>
          <p className="text-sm font-semibold">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.detail}</p>
        </motion.li>
      ))}
    </ol>
  );
}