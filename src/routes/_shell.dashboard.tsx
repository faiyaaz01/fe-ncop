import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
// import {
//   Area,
//   AreaChart,
//   Bar,
//   BarChart,
//   CartesianGrid,
//   Cell,
//   Pie,
//   PieChart,
//   ResponsiveContainer,
//   Tooltip,
//   XAxis,
//   YAxis,
// } from "recharts";
import {
  // ArrowUpRight,
  // Boxes,
  // CalendarDays,
  // ClipboardList,
  // FileText,
  // ListChecks,
  // TrendingUp,
  Boxes,
  ClipboardList,
  Users,
} from "lucide-react";
import { Panel, Reveal } from "@/components/kit";
import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress";
// import {
//   mockClients as clients,
//   countryDistribution,
//   followUps,
//   monthlySales,
//   orders,
//   products,
//   rfqs,
// } from "@/lib/mock-data";
import { userSessionService } from "@/lib/user-session.ts";
import { fetchClientCount, fetchClientLevelCounts } from "@/lib/client-api";
import { fetchProductMetrics } from "@/lib/product-api";
import { fetchInquiries, fetchMyInquiries } from "@/lib/inquiry-api";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard · NCOP ERP" },
      {
        name: "description",
        content:
          "Live view of pipeline value, revenue, active export orders and follow-ups across all pharmaceutical markets.",
      },
      { property: "og:title", content: "Executive Dashboard · NCOP ERP" },
      {
        property: "og:description",
        content: "Pipeline, revenue and order performance for pharmaceutical sales teams.",
      },
    ],
  }),
  component: Dashboard,
});

/* ── COMMENTED OUT: hardcoded stats not connected to backend ──────────────────
const stats = [
  { label: "Total Clients", value: 148, delta: "+6 this quarter", icon: Users },
  { label: "Products", value: 1280, delta: "+24 registrations", icon: Boxes },
  { label: "Open RFQs", value: 37, delta: "12 awaiting quote", icon: ClipboardList },
  { label: "Active Orders", value: 21, delta: "4 shipping this week", icon: FileText },
  { label: "Revenue (YTD)", value: 14.4, prefix: "$", suffix: "M", decimals: 1, icon: TrendingUp },
  { label: "Pending Tasks", value: 9, delta: "3 overdue", icon: ListChecks },
];
──────────────────────────────────────────────────────────────────────────────── */

/* ── COMMENTED OUT: chart tooltip config (no charts currently connected) ──────
const chartTooltip = {
  contentStyle: {
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--popover)",
    color: "var(--popover-foreground)",
    fontSize: 12,
    boxShadow: "var(--shadow-soft)",
  },
};
──────────────────────────────────────────────────────────────────────────────── */

const CLIENT_LEVEL_CONFIG = [
  { key: "PLATINUM", label: "Platinum", range: "Above ₹10 Cr", dot: "bg-blue-500" },
  { key: "GOLD", label: "Gold", range: "₹5–10 Cr", dot: "bg-green-500" },
  { key: "SILVER", label: "Silver", range: "₹1–5 Cr", dot: "bg-yellow-400" },
  { key: "BRONZE", label: "Bronze", range: "₹25 Lakh–1 Cr", dot: "bg-orange-500" },
  { key: "NO_VIP", label: "No VIP", range: "Below ₹25 Lakh", dot: "bg-gray-400" },
] as const;

function Dashboard() {
  const userInfo = userSessionService.getCurrentUser();
  const roles = [userInfo?.role, ...(userInfo?.roles || [])]
    .filter(Boolean)
    .map((role) => String(role).toUpperCase());
  const isAdmin = roles.some((role) => role.includes("ADMIN"));
  const isSales = roles.includes("SALES");
  const isScopedReviewer = roles.includes("QA") || roles.includes("QC") || roles.includes("SALES");
  // ── Live client count from backend ──────────────────────────────────────
  const { data: clientCount, isLoading: isClientCountLoading } = useQuery({
    queryKey: ["clientCount"],
    queryFn: fetchClientCount,
  });

  // ── Client level distribution from backend ─────────────────────────────
  const { data: levelCounts, isLoading: isLevelCountsLoading } = useQuery({
    queryKey: ["clientLevelCounts"],
    queryFn: fetchClientLevelCounts,
  });
  const { data: productMetrics, isLoading: isProductMetricsLoading } = useQuery({
    queryKey: ["productMetrics"],
    queryFn: fetchProductMetrics,
  });
  const { data: inquiryPage, isLoading: isInquiriesLoading } = useQuery({
    queryKey: ["dashboardInquiries", isScopedReviewer ? "mine" : "all"],
    queryFn: () => (isScopedReviewer ? fetchMyInquiries(0, 100) : fetchInquiries(0, 100)),
  });
  const inquiryStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inquiry of inquiryPage?.content || []) {
      counts[inquiry.status] = (counts[inquiry.status] || 0) + 1;
    }
    return counts;
  }, [inquiryPage]);

  /* ── COMMENTED OUT: top customers from mock data ────────────────────────
  const topCustomers = [...clients].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  ──────────────────────────────────────────────────────────────────────── */

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const today = now;
  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  /* ── COMMENTED OUT: calendar variables (calendar widget not connected) ──
  const currentMonthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayDate = today.getDate();
  const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  // Monday-first weekday offset for the 1st of the month (0 = Monday).
  const firstWeekdayOffset = (new Date(today.getFullYear(), today.getMonth(), 1).getDay() + 6) % 7;
  ──────────────────────────────────────────────────────────────────────── */

  // Live time string and short timezone name (uses user's locale/system settings)
  const timeString = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const rawTzName =
    Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  // Prefer IST label for Indian timezone (UTC+5:30). Fall back to the platform-provided short name.
  const tzName = now.getTimezoneOffset() === -330 ? "IST" : rawTzName;

  // Greeting based on local hour. Special message for 02:00-04:59 (user requested 2 to 4).
  const hour = now.getHours();
  let greeting = "Good night";
  if (hour >= 2 && hour <= 4) {
    greeting = "You should probably sleeping now";
  } else if (hour >= 5 && hour < 12) {
    greeting = "Good Morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good Afternoon";
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good Evening";
  } else {
    greeting = "Good Night";
  }

  return (
    <div className="space-y-6">
      {/* ── Greeting banner ─────────────────────────────────────────────── */}
      <Reveal>
        <div className="relative overflow-hidden rounded-[20px] border border-border/60 bg-primary p-6 text-primary-foreground sm:p-8">
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(28rem_18rem_at_85%_-20%,color-mix(in_oklab,var(--accent)_60%,transparent),transparent)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
                {todayLabel.replace(",", " ·")} · {timeString} {tzName}
              </p>
              <h1 className="text-2xl font-bold sm:text-3xl">
                {greeting}, {userInfo?.firstName}
              </h1>
              <p className="max-w-xl text-sm text-primary-foreground/80">
                Track your RFQ pipeline, assignments, and master-data activity.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link to="/inquiry">View RFQs</Link>
              </Button>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">RFQ Analytics</h2>
              <p className="text-[11px] text-muted-foreground">
                {isScopedReviewer
                  ? "Your raised and assigned RFQs"
                  : "All submitted customer inquiries"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total RFQs"
              value={inquiryPage?.totalElements}
              loading={isInquiriesLoading}
            />
            <MetricCard
              label="Submitted"
              value={inquiryStatusCounts.SUBMITTED}
              loading={isInquiriesLoading}
            />
            <MetricCard
              label="To QA"
              value={inquiryStatusCounts.SUBMITTED_TO_QA}
              loading={isInquiriesLoading}
            />
            <MetricCard
              label="To QC"
              value={inquiryStatusCounts.SUBMITTED_TO_QC}
              loading={isInquiriesLoading}
            />
          </div>
        </Panel>
      </Reveal>

      {/* ── Client analytics (connected to backend) ────────────────────── */}
      {(isAdmin || isSales) && (
        <Reveal>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel className="space-y-3">
              {/* Title row — heading on left, total count badge on right */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold leading-tight">Client Analytics</h2>
                    <p className="text-[11px] text-muted-foreground">By annual business turnover</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Total</span>
                  <span className="text-lg font-bold leading-none tabular-nums">
                    {isClientCountLoading ? (
                      <span className="inline-block h-5 w-8 animate-pulse rounded bg-muted" />
                    ) : (
                      (clientCount ?? 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Compact level table */}
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="min-w-[420px] w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-secondary/40">
                      <th className="px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Level
                      </th>
                      <th className="px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Turnover Range
                      </th>
                      <th className="px-2.5 py-1.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CLIENT_LEVEL_CONFIG.map((level, i) => {
                      const count = levelCounts?.[level.key] ?? 0;
                      const hasClients = count > 0;
                      return (
                        <tr
                          key={level.key}
                          className={
                            "transition-colors hover:bg-secondary/50" +
                            (i < CLIENT_LEVEL_CONFIG.length - 1 ? " border-b border-border/40" : "")
                          }
                        >
                          <td className="px-2.5 py-2">
                            <span className="flex items-center gap-2">
                              <span className={`size-2 shrink-0 rounded-full ${level.dot}`} />
                              <span
                                className={
                                  hasClients ? "font-semibold" : "font-medium text-muted-foreground"
                                }
                              >
                                {level.label}
                              </span>
                            </span>
                          </td>
                          <td className="px-2.5 py-2 text-muted-foreground">{level.range}</td>
                          <td className="px-2.5 py-2 text-right tabular-nums">
                            {isLevelCountsLoading ? (
                              <span className="inline-block h-4 w-6 animate-pulse rounded bg-muted" />
                            ) : (
                              <span className={hasClients ? "font-bold" : "text-muted-foreground"}>
                                {count}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Boxes className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Product Analytics</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Product Master lifecycle summary
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Total products"
                  value={productMetrics?.total}
                  loading={isProductMetricsLoading}
                />
                <MetricCard
                  label="Active"
                  value={productMetrics?.active}
                  loading={isProductMetricsLoading}
                />
                <MetricCard
                  label="In development"
                  value={productMetrics?.underDevelopment}
                  loading={isProductMetricsLoading}
                />
                <MetricCard
                  label="Discontinued"
                  value={productMetrics?.discontinued}
                  loading={isProductMetricsLoading}
                />
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/products">Open Product Master</Link>
              </Button>
            </Panel>
          </div>
        </Reveal>
      )}

      {/* ── COMMENTED OUT: all sections below are not connected to backend ── */}

      {/* ── Monthly sales & revenue chart (mock data) ──────────────────────
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Monthly sales & revenue</h2>
                <p className="text-xs text-muted-foreground">Units shipped (k) vs. revenue ($k)</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-[11px] font-semibold text-accent">
                <ArrowUpRight className="size-3" /> +18.4%
              </span>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySales} margin={{ left: -18, right: 6, top: 6 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip {...chartTooltip} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="var(--chart-1)"
                    strokeWidth={2.4}
                    fill="url(#gSales)"
                    animationDuration={1200}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--chart-2)"
                    strokeWidth={2.4}
                    fill="url(#gRev)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.08}>
          <Panel className="h-full">
            <h2 className="text-base font-semibold">Country distribution</h2>
            <p className="text-xs text-muted-foreground">Share of shipped volume</p>
            <div className="mt-2 h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={countryDistribution}
                    dataKey="value"
                    nameKey="country"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                    stroke="none"
                    animationDuration={1100}
                  >
                    {countryDistribution.map((_, i) => (
                      <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-2">
              {countryDistribution.map((c, i) => (
                <li key={c.country} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: `var(--chart-${(i % 5) + 1})` }}
                    />
                    {c.country}
                  </span>
                  <span className="font-semibold text-muted-foreground">{c.value}%</span>
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>
      </div>
      ────────────────────────────────────────────────────────────────────── */}

      {/* ── Recent orders & top customers (mock data) ─────────────────────
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent orders</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/orders">View all</Link>
              </Button>
            </div>
            <ul className="divide-y divide-border/70">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{o.client}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.id} · {o.items} line items · {o.incoterm}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    ${o.value.toLocaleString("en-US")}
                  </p>
                  <StatusChip status={o.status} />
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>

        <Reveal delay={0.08}>
          <Panel className="h-full">
            <h2 className="text-base font-semibold">Top customers</h2>
            <p className="text-xs text-muted-foreground">Revenue YTD</p>
            <ul className="mt-4 space-y-4">
              {topCustomers.map((c) => (
                <li key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      ${(c.revenue / 1_000_000).toFixed(2)}M
                    </span>
                  </div>
                  <Progress value={(c.revenue / 4_820_000) * 100} className="h-1.5" />
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>
      </div>
      ────────────────────────────────────────────────────────────────────── */}

      {/* ── Calendar, follow-ups, inquiry chart (mock data) ──────────────
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal>
          <Panel className="h-full">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <h2 className="text-base font-semibold">{currentMonthLabel}</h2>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="py-1 font-semibold">
                  {d}
                </span>
              ))}
              {Array.from({ length: firstWeekdayOffset }).map((_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                const day = i + 1;
                const marked = [3, 5, 8, 11, 18].includes(day);
                const isToday = day === todayDate;
                return (
                  <span
                    key={day}
                    className={
                      "grid aspect-square place-items-center rounded-lg text-xs transition-colors " +
                      (isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : marked
                          ? "bg-accent/12 font-medium text-accent"
                          : "text-foreground/70 hover:bg-secondary")
                    }
                  >
                    {day}
                  </span>
                );
              })}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel className="h-full">
            <h2 className="text-base font-semibold">Upcoming follow-ups</h2>
            <ul className="mt-4 space-y-3.5">
              {followUps.map((f) => (
                <li key={f.client} className="flex gap-3">
                  <span className="grid h-fit shrink-0 rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold">
                    {f.date}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{f.client}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.note} · {f.owner}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>

        <Reveal delay={0.12}>
          <Panel className="h-full">
            <h2 className="text-base font-semibold">Inquiry value by client</h2>
            <p className="text-xs text-muted-foreground">Open RFQ pipeline ($k)</p>
            <div className="mt-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rfqs.map((r) => ({ name: r.client.split(" ")[0], value: r.value / 1000 }))}
                  margin={{ left: -22, right: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip {...chartTooltip} />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    fill="var(--chart-1)"
                    animationDuration={1200}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {products.length} SKUs quoted across {rfqs.length} open inquiries
            </p>
          </Panel>
        </Reveal>
      </div>
      ────────────────────────────────────────────────────────────────────── */}
    </div>
  );
}

function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value?: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {loading ? (
          <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted" />
        ) : (
          (value ?? 0)
        )}
      </p>
    </div>
  );
}
