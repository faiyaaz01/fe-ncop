import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, ClipboardList, FileCheck2, ListChecks, PackageCheck, Users } from "lucide-react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Counter, Reveal, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { fetchAllClients, fetchClientCount } from "@/lib/client-api";
import { fetchProductMetrics } from "@/lib/product-api";
import { fetchInquiries, fetchMyInquiries } from "@/lib/inquiry-api";
import { canAccessRoute, userSessionService } from "@/lib/user-session";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · NCOP ERP" },
      { name: "description", content: "Live, permission-aware NCOP ERP dashboard." },
    ],
  }),
  component: Dashboard,
});

const LIVE_REFRESH_INTERVAL = 30_000;

function Dashboard() {
  const [user, setUser] = useState(() => userSessionService.getCurrentUser());

  useEffect(() => userSessionService.subscribe((currentUser) => setUser(currentUser)), []);

  const canViewClients = canAccessRoute(user, "/clients");
  const canViewProducts = canAccessRoute(user, "/products");
  const canViewInquiries = canAccessRoute(user, "/inquiry");
  const roles = [user?.role, ...(user?.roles || [])].map((role) => String(role).toUpperCase());
  const useMyInquiries = roles.some((role) => ["SALES", "QA", "QC"].includes(role));

  const clientCount = useQuery({
    queryKey: ["dashboard", "client-count"],
    queryFn: fetchClientCount,
    enabled: canViewClients,
    refetchInterval: LIVE_REFRESH_INTERVAL,
  });
  const clients = useQuery({
    queryKey: ["dashboard", "clients"],
    queryFn: fetchAllClients,
    enabled: canViewClients,
    refetchInterval: LIVE_REFRESH_INTERVAL,
  });
  const productMetrics = useQuery({
    queryKey: ["dashboard", "product-metrics"],
    queryFn: fetchProductMetrics,
    enabled: canViewProducts,
    refetchInterval: LIVE_REFRESH_INTERVAL,
  });
  const inquiries = useQuery({
    queryKey: ["dashboard", "inquiries", useMyInquiries ? "mine" : "all"],
    queryFn: () => (useMyInquiries ? fetchMyInquiries(0, 100) : fetchInquiries(0, 100)),
    enabled: canViewInquiries,
    refetchInterval: LIVE_REFRESH_INTERVAL,
  });

  const inquiryCounts = useMemo(() => {
    const source = inquiries.data?.content || [];
    const open = source.filter((inquiry) => !["CLOSED", "REJECTED", "CANCELLED"].includes(inquiry.status));
    const awaitingAction = source.filter((inquiry) =>
      ["SUBMITTED", "SUBMITTED_TO_QA", "SUBMITTED_TO_QC"].includes(inquiry.status),
    );
    return { open: open.length, awaitingAction: awaitingAction.length };
  }, [inquiries.data]);

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  const firstName = user?.firstName?.trim() || user?.name?.trim() || "there";
  const countryDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const client of clients.data || []) {
      const country = client.addresses?.[0]?.country?.trim() || "Not specified";
      counts.set(country, (counts.get(country) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [clients.data]);
  const monthlyRfqActivity = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString(undefined, { month: "short" }), rfqs: 0 };
    });
    for (const inquiry of inquiries.data?.content || []) {
      const date = new Date(inquiry.inquiryDate);
      const match = months.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`);
      if (match) match.rfqs += 1;
    }
    return months;
  }, [inquiries.data]);
  const recentInquiries = useMemo(
    () => [...(inquiries.data?.content || [])].sort((a, b) => +new Date(b.inquiryDate) - +new Date(a.inquiryDate)).slice(0, 5),
    [inquiries.data],
  );

  const cards = [
    canViewClients && {
      label: "Total clients", value: clientCount.data, loading: clientCount.isLoading,
      detail: "Live client master count", icon: Users, to: "/clients" as const,
    },
    canViewProducts && {
      label: "Products", value: productMetrics.data?.total, loading: productMetrics.isLoading,
      detail: `${productMetrics.data?.active ?? 0} active products`, icon: Boxes, to: "/products" as const,
    },
    canViewInquiries && {
      label: "Open RFQs", value: inquiryCounts.open, loading: inquiries.isLoading,
      detail: `${inquiryCounts.awaitingAction} awaiting action`, icon: ClipboardList, to: "/inquiry" as const,
    },
    canViewProducts && {
      label: "Active products", value: productMetrics.data?.active, loading: productMetrics.isLoading,
      detail: `${productMetrics.data?.underDevelopment ?? 0} in development`, icon: PackageCheck, to: "/products" as const,
    },
    canViewInquiries && {
      label: "RFQs awaiting action", value: inquiryCounts.awaitingAction, loading: inquiries.isLoading,
      detail: useMyInquiries ? "Assigned or raised by you" : "Across all accessible RFQs",
      icon: ListChecks, to: "/inquiry" as const,
    },
  ].filter(Boolean) as DashboardCard[];

  return (
    <div className="space-y-6">
      <Reveal>
        <section className="relative overflow-hidden rounded-[24px] bg-primary px-6 py-8 text-primary-foreground shadow-soft sm:px-8 sm:py-10">
          <div className="absolute inset-0 opacity-50 [background:radial-gradient(36rem_22rem_at_85%_-30%,color-mix(in_oklab,var(--accent)_70%,transparent),transparent)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">{todayLabel}</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Good day, {firstName}</h1>
              <p className="max-w-2xl text-sm leading-6 text-primary-foreground/80 sm:text-base">
                Your live workspace summary, tailored to the modules assigned to your account.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canViewInquiries && <Button asChild variant="secondary" className="shadow-none"><Link to="/inquiry">New inquiry</Link></Button>}
              {canAccessRoute(user, "/reports") && (
                <Button asChild variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  <Link to="/reports">View reports</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </Reveal>

      {cards.length > 0 ? (
        <section className="flex flex-wrap gap-3">
          {cards.map((card, index) => (
            <Reveal key={card.label} delay={index * 0.04} className="min-w-[260px] flex-1">
              <Link to={card.to} className="group flex min-h-[132px] h-full flex-col justify-between rounded-[20px] border border-border/70 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p>
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><card.icon className="size-5" /></span>
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight tabular-nums">
                    {card.loading ? (
                      <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" />
                    ) : (
                      <Counter key={card.value ?? 0} value={card.value ?? 0} />
                    )}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </section>
      ) : (
        <div className="rounded-[20px] border border-dashed border-border bg-card p-8 text-center">
          <FileCheck2 className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">No module data assigned</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ask an administrator to assign the modules you need to your account.</p>
        </div>
      )}

      {(canViewInquiries || canViewClients || canViewProducts) && (
        <section className="grid gap-4 xl:grid-cols-3">
          {canViewInquiries && (
            <Reveal className="xl:col-span-2">
              <Panel className="h-full p-5">
                <div>
                  <h2 className="text-base font-semibold">RFQ activity</h2>
                  <p className="text-xs text-muted-foreground">Live inquiries created over the last six months</p>
                </div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRfqActivity} margin={{ left: -24, right: 8, top: 8 }}>
                      <defs><linearGradient id="rfq-activity" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3654b3" stopOpacity={0.32} /><stop offset="100%" stopColor="#3654b3" stopOpacity={0} /></linearGradient></defs>
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <Tooltip cursor={{ stroke: "var(--border)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                      <Area type="monotone" dataKey="rfqs" name="RFQs" stroke="#3654b3" strokeWidth={2.5} fill="url(#rfq-activity)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </Reveal>
          )}
          {canViewClients && (
            <Reveal>
              <Panel className="h-full p-5">
                <div><h2 className="text-base font-semibold">Client distribution</h2><p className="text-xs text-muted-foreground">By registered country</p></div>
                {countryDistribution.length ? (
                  <>
                    <div className="h-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={countryDistribution} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={3}>{countryDistribution.map((entry, index) => <Cell key={entry.name} fill={["#3654b3", "#52a476", "#6ea4d7", "#d1ae4e", "#8d6bc1"][index]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} /></PieChart></ResponsiveContainer></div>
                    <ul className="space-y-1.5">{countryDistribution.map((entry, index) => <li key={entry.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: ["#3654b3", "#52a476", "#6ea4d7", "#d1ae4e", "#8d6bc1"][index] }} />{entry.name}</span><span className="font-semibold tabular-nums">{entry.value}</span></li>)}</ul>
                  </>
                ) : <EmptyAnalytics message={clients.isLoading ? "Loading client distribution…" : "No client addresses available yet."} />}
              </Panel>
            </Reveal>
          )}
          {canViewInquiries && (
            <Reveal className={canViewClients ? "xl:col-span-2" : undefined}>
              <Panel className="h-full justify-start p-5">
                <div className="mb-3 flex items-center justify-between"><div><h2 className="text-base font-semibold">Recent RFQs</h2><p className="text-xs text-muted-foreground">Latest accessible inquiry activity</p></div><Button asChild variant="ghost" size="sm"><Link to="/inquiry">View all</Link></Button></div>
                {recentInquiries.length ? <ul className="divide-y divide-border/60">{recentInquiries.map((inquiry) => <li key={inquiry.id} className="flex items-center justify-between gap-4 py-3 first:pt-1"><div className="min-w-0"><p className="truncate text-sm font-medium">{inquiry.customerName}</p><p className="text-xs text-muted-foreground">{inquiry.rfqNo} · {new Date(inquiry.inquiryDate).toLocaleDateString()}</p></div><span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">{inquiry.status.replaceAll("_", " ")}</span></li>)}</ul> : <EmptyAnalytics message={inquiries.isLoading ? "Loading RFQs…" : "No RFQs available yet."} />}
              </Panel>
            </Reveal>
          )}
          {canViewProducts && (
            <Reveal>
              <Panel className="h-full p-5"><div><h2 className="text-base font-semibold">Product lifecycle</h2><p className="text-xs text-muted-foreground">Live product master status</p></div><div className="mt-5 space-y-4"><LifecycleRow label="Active" value={productMetrics.data?.active} total={productMetrics.data?.total} loading={productMetrics.isLoading} /><LifecycleRow label="In development" value={productMetrics.data?.underDevelopment} total={productMetrics.data?.total} loading={productMetrics.isLoading} /><LifecycleRow label="Discontinued" value={productMetrics.data?.discontinued} total={productMetrics.data?.total} loading={productMetrics.isLoading} /></div></Panel>
            </Reveal>
          )}
        </section>
      )}
    </div>
  );
}

type DashboardCard = {
  label: string;
  value: number | undefined;
  loading: boolean;
  detail: string;
  icon: typeof Users;
  to: "/clients" | "/products" | "/inquiry";
};

function EmptyAnalytics({ message }: { message: string }) { return <p className="grid min-h-40 place-items-center text-center text-sm text-muted-foreground">{message}</p>; }
function LifecycleRow({ label, value = 0, total = 0, loading }: { label: string; value?: number; total?: number; loading: boolean }) { const percentage = total ? Math.round((value / total) * 100) : 0; return <div><div className="mb-1.5 flex justify-between text-sm"><span>{label}</span><span className="font-semibold tabular-nums">{loading ? "—" : `${value} (${percentage}%)`}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${loading ? 0 : percentage}%` }} /></div></div>; }
