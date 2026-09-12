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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Loader2, Search, RotateCcw, type LucideIcon } from "lucide-react";

// ── Shared Skeleton Loading States ───────────────────────────────────────────

function SkeletonBox({ className }: { className?: string }) {
  return <Skeleton className={className} />;
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
                  className={cn("h-3 rounded", w, rowIdx % 2 === 0 ? "opacity-90" : "opacity-70")}
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
  onClick,
  ...props
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onClick">) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: smoothEase }}
      onClick={onClick}
      className={cn("surface flex flex-col justify-between p-5", hover && "lift", className)}
      {...props}
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

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
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

export type MetricTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet"
  | "orange"
  | "neutral";

const metricToneClasses: Record<
  MetricTone,
  { icon: string; line: string; glow: string }
> = {
  primary: {
    icon: "bg-primary/10 text-primary ring-primary/15",
    line: "from-primary/80 via-primary/25",
    glow: "bg-primary/8",
  },
  success: {
    icon: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-400",
    line: "from-emerald-500/80 via-emerald-500/25",
    glow: "bg-emerald-500/8",
  },
  warning: {
    icon: "bg-amber-500/10 text-amber-600 ring-amber-500/15 dark:text-amber-400",
    line: "from-amber-500/80 via-amber-500/25",
    glow: "bg-amber-500/8",
  },
  danger: {
    icon: "bg-rose-500/10 text-rose-600 ring-rose-500/15 dark:text-rose-400",
    line: "from-rose-500/80 via-rose-500/25",
    glow: "bg-rose-500/8",
  },
  info: {
    icon: "bg-sky-500/10 text-sky-600 ring-sky-500/15 dark:text-sky-400",
    line: "from-sky-500/80 via-sky-500/25",
    glow: "bg-sky-500/8",
  },
  violet: {
    icon: "bg-violet-500/10 text-violet-600 ring-violet-500/15 dark:text-violet-400",
    line: "from-violet-500/80 via-violet-500/25",
    glow: "bg-violet-500/8",
  },
  orange: {
    icon: "bg-orange-500/10 text-orange-600 ring-orange-500/15 dark:text-orange-400",
    line: "from-orange-500/80 via-orange-500/25",
    glow: "bg-orange-500/8",
  },
  neutral: {
    icon: "bg-slate-500/10 text-slate-600 ring-slate-500/15 dark:text-slate-400",
    line: "from-slate-500/65 via-slate-500/20",
    glow: "bg-slate-500/7",
  },
};

/** Consistent KPI/summary widget used throughout every application module. */
export function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "primary",
  loading = false,
  decimals = 0,
  prefix = "",
  suffix = "",
  compact = false,
  className,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  detail?: ReactNode;
  tone?: MetricTone;
  loading?: boolean;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
  className?: string;
  /** Makes the summary card an accessible action when supplied. */
  onClick?: () => void;
}) {
  const palette = metricToneClasses[tone];
  return (
    <div
      className={cn(
        "surface group relative isolate flex min-h-[108px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-3.5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:p-4",
        compact && "min-h-[100px] p-3 sm:p-3.5",
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent",
          palette.line,
        )}
      />
      <span
        aria-hidden
        className={cn(
          "absolute -right-7 -top-7 size-20 rounded-full blur-2xl transition-transform duration-300 group-hover:scale-125",
          palette.glow,
        )}
      />

      <div className="relative flex items-start justify-between gap-2.5">
        <p
          className="min-w-0 flex-1 truncate pt-0.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground sm:text-xs"
          title={label}
        >
          {label}
        </p>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg ring-1 transition-transform duration-300 group-hover:scale-105",
            compact && "size-8",
            palette.icon,
          )}
        >
          <Icon className={compact ? "size-3.5" : "size-4"} />
        </span>
      </div>

      <div className="relative mt-2.5 min-w-0">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-16" />
            {detail && <Skeleton className="h-3 w-3/4" />}
          </div>
        ) : (
          <>
            <p className="truncate text-[1.4rem] font-bold leading-none tracking-tight text-foreground tabular-nums sm:text-2xl">
              {typeof value === "number" ? (
                <Counter
                  key={`${value}-${prefix}-${suffix}`}
                  value={value}
                  decimals={decimals}
                  prefix={prefix}
                  suffix={suffix}
                />
              ) : (
                `${prefix}${value}${suffix}`
              )}
            </p>
            {detail && (
              <div className="mt-1 truncate text-[11px] leading-4 text-muted-foreground sm:text-xs">
                {detail}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const metricGridColumns = {
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  6: "sm:grid-cols-3 xl:grid-cols-6",
};

export function MetricGrid({
  children,
  columns = 4,
  className,
  label,
}: {
  children: ReactNode;
  columns?: 3 | 4 | 5 | 6;
  className?: string;
  label?: string;
}) {
  return (
    <section
      className={cn("grid grid-cols-2 gap-3", metricGridColumns[columns], className)}
      aria-label={label}
    >
      {children}
    </section>
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

// ── Universal Entity Form Architecture ────────────────────────────────────────

export interface EntityFormPageProps {
  eyebrow?: string;
  title: string;
  description?: string;
  backLabel?: string;
  onBack: () => void;
  formId?: string;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Universal full-page form layout matching the standard established in Products & QA.
 * Provides a responsive shell with:
 * - Top PageHeader with back navigation
 * - Panel container that expands with its content
 * - Standardized spacing and layout
 * - Bottom action bar with Cancel, Submit, and loading spinner
 */
export function EntityFormPage({
  eyebrow,
  title,
  description,
  backLabel = "Back",
  onBack,
  formId = "entity-form",
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save Changes",
  submittingLabel = "Saving…",
  cancelLabel = "Cancel",
  onCancel,
  actions,
  children,
  className,
}: EntityFormPageProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="mr-2 size-4" /> {backLabel}
          </Button>
        }
      />

      <Panel className="overflow-hidden p-0">
        <form id={formId} onSubmit={onSubmit} className="flex flex-col">
          <div className="p-6 sm:p-8">
            <div className="space-y-8">{children}</div>
          </div>

          <div className="relative z-10 flex shrink-0 flex-col gap-3 border-t border-border/60 bg-card px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
            {actions}
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onCancel || onBack}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto gap-1.5"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Standardized form section fieldset with clean typography.
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      {(title || description) && (
        <div>
          {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </fieldset>
  );
}

export interface FormCodeBannerProps {
  label?: string;
  code: string;
  hint?: string;
  className?: string;
}

/**
 * Standardized auto-generated entity code banner for forms.
 */
export function FormCodeBanner({
  label = "Code",
  code,
  hint = "Auto-assigned on save",
  className,
}: FormCodeBannerProps) {
  return (
    <div
      className={cn(
        "surface flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold font-mono text-primary">{code}</span>
      </div>
      {hint && (
        <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-medium">
          {hint}
        </span>
      )}
    </div>
  );
}

export interface UniversalFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  resetLabel?: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Number of filter columns on sm screens (default 3, matches the RFQ filter bar) */
  filterColumns?: number;
}

/**
 * Universal Search & Filter Bar standardized from the RFQ / Inquiry module.
 * Responsive two-pane grid: Search input on left (1.05fr), equal-width filter dropdowns on right (0.95fr) with reset button.
 */
export function UniversalFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  hasActiveFilters = false,
  onReset,
  resetLabel = "Reset",
  children,
  actions,
  className,
  filterColumns = 3,
}: UniversalFilterBarProps) {
  return (
    <div
      className={cn(
        "surface grid gap-3 p-4 sm:p-5 rounded-xl border border-border/70 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-center",
        className,
      )}
    >
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div
          className={cn(
            "grid min-w-0 flex-1 grid-cols-1 gap-3",
            filterColumns === 1 && (hasActiveFilters ? "sm:grid-cols-[1fr_auto]" : "sm:grid-cols-1"),
            filterColumns === 2 && (hasActiveFilters ? "sm:grid-cols-[repeat(2,minmax(0,1fr))_auto]" : "sm:grid-cols-2"),
            filterColumns === 3 && (hasActiveFilters ? "sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]" : "sm:grid-cols-3"),
            filterColumns === 4 && (hasActiveFilters ? "sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]" : "sm:grid-cols-4"),
            filterColumns > 4 && "sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]",
          )}
        >
          {children}
          {hasActiveFilters && onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-10 shrink-0 self-center whitespace-nowrap px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3 mr-1" />
              {resetLabel}
            </Button>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// Alias for universal naming
export const EntityFilterBar = UniversalFilterBar;

// Universal View Mode Toggle
export { ViewModeToggle, type ViewMode } from "@/components/view-mode-toggle";
