import { AnimatePresence, motion, useInView, useMotionValue, useSpring } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import { smoothEase, fadeInUp, staggerContainer } from "@/lib/animations";

// ── Shared Skeleton Loading States ───────────────────────────────────────────

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/70",
        "after:absolute after:inset-0 after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-primary/10 after:to-transparent",
        className,
      )}
    />
  );
}

/** Responsive card skeletons for card-based listings. */
export function CardGridLoader({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.3 }}
          className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-soft"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <SkeletonBox className="h-4 w-40" />
              <SkeletonBox className="h-3 w-24" />
            </div>
            <SkeletonBox className="h-6 w-16 rounded-full" />
          </div>
          <SkeletonBox className="h-3 w-full" />
          <SkeletonBox className="h-3 w-4/5" />
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/45 p-3">
            <SkeletonBox className="h-8 w-full" />
            <SkeletonBox className="h-8 w-full" />
          </div>
          <SkeletonBox className="h-8 w-full" />
        </motion.div>
      ))}
    </div>
  );
}

/** Responsive client card skeleton matching the actual Client Card structure */
export function ClientCardSkeleton() {
  return (
    <div className="surface flex h-full flex-col justify-between p-5">
      <div>
        {/* Top Header: Avatar initials + Company Name / Code + Tier Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SkeletonBox className="size-11 rounded-xl shrink-0" />
            <div className="min-w-0 space-y-1.5 flex-1">
              <SkeletonBox className="h-4 w-32 sm:w-36" />
              <SkeletonBox className="h-3 w-24 sm:w-28" />
            </div>
          </div>
          <SkeletonBox className="h-5 w-16 rounded-full shrink-0" />
        </div>

        {/* Middle Info: Location & Contact with icons */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBox className="size-3.5 rounded shrink-0" />
            <SkeletonBox className="h-3 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBox className="size-3.5 rounded shrink-0" />
            <SkeletonBox className="h-3 w-36" />
          </div>
        </div>
      </div>

      <div>
        {/* Footer Stats: Turnover & Documents */}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <div className="space-y-1">
            <SkeletonBox className="h-2.5 w-20" />
            <SkeletonBox className="h-4 w-20" />
          </div>
          <div className="space-y-1 flex flex-col items-end">
            <SkeletonBox className="h-2.5 w-16" />
            <SkeletonBox className="h-4 w-8" />
          </div>
        </div>

        {/* Action Buttons: View & Edit */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <SkeletonBox className="h-8 w-full rounded-md" />
          <SkeletonBox className="h-8 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Responsive client card grid loader */
export function ClientCardGridLoader({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.3 }}
          className="h-full"
        >
          <ClientCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

/** Client table loader matching the 7 columns of the client table */
export function ClientTableLoader({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <table className="min-w-[900px] w-full text-left text-sm">
        <thead className="border-b border-border/60 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Turnover</th>
            <th className="px-4 py-3">Tier</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {Array.from({ length: rows }).map((_, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.025, duration: 0.25 }}
            >
              <td className="px-4 py-3.5">
                <div className="space-y-1.5">
                  <SkeletonBox className="h-3.5 w-32" />
                  <SkeletonBox className="h-2.5 w-20" />
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="space-y-1.5">
                  <SkeletonBox className="h-3.5 w-24" />
                  <SkeletonBox className="h-2.5 w-32" />
                </div>
              </td>
              <td className="px-4 py-3.5">
                <SkeletonBox className="h-3 w-28" />
              </td>
              <td className="px-4 py-3.5">
                <SkeletonBox className="h-5 w-20 rounded-md" />
              </td>
              <td className="px-4 py-3.5">
                <SkeletonBox className="h-3.5 w-16" />
              </td>
              <td className="px-4 py-3.5">
                <SkeletonBox className="h-5 w-16 rounded-full" />
              </td>
              <td className="px-4 py-3.5 text-right">
                <div className="flex justify-end gap-1">
                  <SkeletonBox className="size-8 rounded-md" />
                  <SkeletonBox className="size-8 rounded-md" />
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
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
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.03, duration: 0.25 }}
          className="flex items-center gap-4 px-5 py-4"
        >
          <SkeletonBox className="size-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBox className="h-3.5 w-2/5" />
            <SkeletonBox className="h-2.5 w-1/4" />
          </div>
          <SkeletonBox className="h-3 w-24 hidden sm:block" />
          <SkeletonBox className="h-3 w-16 hidden md:block" />
          <SkeletonBox className="h-6 w-16 rounded-full hidden lg:block" />
          <SkeletonBox className="h-7 w-20 rounded-lg" />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Consistent table-row skeleton — drop inside `<tbody>` as the only rows
 * when `isLoading` is true. Renders `rows` skeleton rows with `colSpan` cells.
 */
export function TableRowLoader({ colSpan, rows = 5 }: { colSpan: number; rows?: number }) {
  // Build per-cell widths for a natural look
  const cellWidths: Record<number, string[]> = {
    8: ["w-28", "w-20", "w-36", "w-32", "w-24", "w-16", "w-20", "w-16"],
    7: ["w-32", "w-24", "w-28", "w-20", "w-20", "w-16", "w-16"],
    6: ["w-32", "w-40", "w-20", "w-16", "w-24", "w-16"],
    5: ["w-32", "w-28", "w-40", "w-20", "w-16"],
  };
  const widths = cellWidths[colSpan] ?? Array(colSpan).fill("w-24");

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-border/40 last:border-0">
          {widths.map((w, colIdx) => (
            <td key={colIdx} className="px-4 py-3.5 sm:px-5">
              {colIdx === 0 ? (
                <div className="flex items-center gap-3">
                  <SkeletonBox className="size-8 rounded-lg shrink-0" />
                  <div className="space-y-1.5 min-w-0">
                    <SkeletonBox className={cn("h-3.5", w)} />
                    <SkeletonBox className="h-2.5 w-16" />
                  </div>
                </div>
              ) : (
                <SkeletonBox
                  className={cn(
                    "h-3 rounded",
                    w,
                    rowIdx % 2 === 0 ? "opacity-90" : "opacity-70",
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
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: smoothEase }}
      className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold sm:text-3xl tracking-tight">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1, ease: smoothEase }}
          className="flex flex-wrap items-center gap-2"
        >
          {actions}
        </motion.div>
      )}
    </motion.div>
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
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: smoothEase }}
      className={cn("surface flex flex-col justify-between p-5", hover && "lift", className)}
    >
      {children}
    </motion.div>
  );
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
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: smoothEase }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className,
  stagger = 0.05,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      variants={staggerContainer(stagger, delay)}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeInUp} className={className}>
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
  const spring = useSpring(mv, { stiffness: 60, damping: 20 });

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
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: smoothEase }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors",
        tone,
      )}
    >
      <span className="size-1.5 rounded-full bg-current animate-pulse-subtle" />
      {status}
    </motion.span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: smoothEase }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground shadow-soft">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      </div>
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
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
          transition={{ delay: i * 0.06, duration: 0.3, ease: smoothEase }}
          className="relative"
        >
          <span className="absolute -left-[26px] top-1 grid size-3 place-items-center rounded-full border-2 border-background bg-primary shadow-soft" />
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

