import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ClipboardList,
  FileText,
  ListChecks,
  TrendingUp,
  Users,
} from "lucide-react";
import { Counter, Panel, Reveal, StatusChip } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  clients,
  countryDistribution,
  followUps,
  monthlySales,
  orders,
  products,
  rfqs,
} from "@/lib/mock-data";
import { userSessionService } from "@/lib/user-session.ts";

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

const stats = [
  { label: "Total Clients", value: 148, delta: "+6 this quarter", icon: Users },
  { label: "Products", value: 1280, delta: "+24 registrations", icon: Boxes },
  { label: "Open RFQs", value: 37, delta: "12 awaiting quote", icon: ClipboardList },
  { label: "Active Orders", value: 21, delta: "4 shipping this week", icon: FileText },
  { label: "Revenue (YTD)", value: 14.4, prefix: "$", suffix: "M", decimals: 1, icon: TrendingUp },
  { label: "Pending Tasks", value: 9, delta: "3 overdue", icon: ListChecks },
];

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

function Dashboard() {
  const topCustomers = [...clients].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const currentMonthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayDate = today.getDate();
  const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  // Monday-first weekday offset for the 1st of the month (0 = Monday).
  const firstWeekdayOffset = (new Date(today.getFullYear(), today.getMonth(), 1).getDay() + 6) % 7;

  const userInfo = userSessionService.getCurrentUser();

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[20px] border border-border/60 bg-primary p-6 text-primary-foreground sm:p-8">
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(28rem_18rem_at_85%_-20%,color-mix(in_oklab,var(--accent)_60%,transparent),transparent)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
                {todayLabel.replace(",", " ·")}
              </p>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Good morning, {userInfo?.firstName}
              </h1>
              <p className="max-w-xl text-sm text-primary-foreground/80">
                Pipeline is up 18% against July. Three orders need QA release before Friday's vessel
                cut-off in Rotterdam.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link to="/inquiry">New inquiry</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/reports">View reports</Link>
              </Button>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.05}>
            <Panel hover className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="text-3xl font-bold">
                  <Counter
                    value={s.value}
                    prefix={s.prefix ?? ""}
                    suffix={s.suffix ?? ""}
                    decimals={s.decimals ?? 0}
                  />
                </p>
                <p className="text-xs text-muted-foreground">{s.delta ?? "vs. last period"}</p>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="size-[18px]" />
              </div>
            </Panel>
          </Reveal>
        ))}
      </div>

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
    </div>
  );
}