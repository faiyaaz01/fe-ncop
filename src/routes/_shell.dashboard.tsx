import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, ArrowRight, Boxes, CheckCircle2, ClipboardCheck, ClipboardList, FileCheck2, HelpCircle, ListChecks, Loader2, PackageCheck, Send, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MetricCard,
  MetricGrid,
  Reveal,
  Panel,
  type MetricTone,
} from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchAllClients, fetchClientCount } from "@/lib/client-api";
import { fetchProductMetrics } from "@/lib/product-api";
import { fetchInquiries, fetchMyInquiries } from "@/lib/inquiry-api";
import { canAccessRoute, isUserAdmin, userSessionService } from "@/lib/user-session";
import { normalizeCountryName } from "@/lib/country";
import { fetchQaKpis, fetchQaQueries, fetchQaRfqs } from "@/lib/qa-api";
import { QA_RFQ_STATUS_COLORS, QA_RFQ_STATUS_LABELS, type QaQuery, type QaRfq } from "@/lib/qa-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Nourish Pharmaceutical ERP" },
      {
        name: "description",
        content: "Live, permission-aware Nourish Pharmaceutical ERP dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

const LIVE_REFRESH_INTERVAL = 30_000;

function Dashboard() {
  const [user, setUser] = useState(() => userSessionService.getCurrentUser());

  useEffect(() => {
    const unsub = userSessionService.subscribe((currentUser) => setUser(currentUser));
    return () => {
      unsub();
    };
  }, []);

  const canViewClients = canAccessRoute(user, "/clients");
  const canViewProducts = canAccessRoute(user, "/products");
  const canViewInquiries = canAccessRoute(user, "/inquiry");
  const roles = [user?.role, ...(user?.roles || [])].map((role) => String(role).toUpperCase());
  const useMyInquiries = roles.some((role) => ["SALES", "QA", "QC"].includes(role));
  const isQaUser = roles.includes("QA");
  const isQcUser = !isQaUser && roles.includes("QC");
  const isSalesUser = !isQaUser && !isQcUser && roles.includes("SALES");
  const isAdminUser = isUserAdmin(user);
  const dashboardRole = isAdminUser ? "admin" : isQaUser ? "qa" : isQcUser ? "qc" : "sales";

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
    const open = source.filter(
      (inquiry) => !["CLOSED", "REJECTED", "CANCELLED"].includes(inquiry.status),
    );
    const awaitingAction = source.filter((inquiry) =>
      ["SUBMITTED", "SUBMITTED_TO_QA", "SUBMITTED_TO_QC"].includes(inquiry.status),
    );
    const byStatus = source.reduce<Record<string, number>>((counts, inquiry) => {
      counts[inquiry.status] = (counts[inquiry.status] || 0) + 1;
      return counts;
    }, {});
    return { open: open.length, awaitingAction: awaitingAction.length, byStatus };
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
      const country = normalizeCountryName(client.addresses?.[0]?.country) || "Not specified";
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
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString(undefined, { month: "short" }),
        rfqs: 0,
      };
    });
    for (const inquiry of inquiries.data?.content || []) {
      const date = new Date(inquiry.inquiryDate);
      const match = months.find(
        (month) => month.key === `${date.getFullYear()}-${date.getMonth()}`,
      );
      if (match) match.rfqs += 1;
    }
    return months;
  }, [inquiries.data]);
  const recentInquiries = useMemo(
    () =>
      [...(inquiries.data?.content || [])]
        .sort((a, b) => +new Date(b.inquiryDate) - +new Date(a.inquiryDate))
        .slice(0, 5),
    [inquiries.data],
  );

  const cards = [
    isAdminUser && canViewClients && {
      label: "Total clients",
      value: clientCount.data,
      loading: clientCount.isLoading,
      detail: "Live client master count",
      icon: Users,
      tone: "primary" as const,
      to: "/clients" as const,
    },
    isAdminUser && canViewProducts && {
      label: "Products",
      value: productMetrics.data?.total,
      loading: productMetrics.isLoading,
      detail: `${productMetrics.data?.active ?? 0} active products`,
      icon: Boxes,
      tone: "violet" as const,
      to: "/products" as const,
    },
    canViewInquiries && {
      label: isSalesUser ? "My RFQs" : isQcUser ? "My QC queue" : "Open RFQs",
      value: inquiryCounts.open,
      loading: inquiries.isLoading,
      detail: isQcUser
        ? `${inquiryCounts.byStatus.SUBMITTED_TO_QC ?? 0} awaiting QC review`
        : `${inquiryCounts.awaitingAction} awaiting action`,
      icon: ClipboardList,
      tone: "info" as const,
      to: "/inquiry" as const,
    },
    isAdminUser && canViewProducts && {
      label: "Active products",
      value: productMetrics.data?.active,
      loading: productMetrics.isLoading,
      detail: `${productMetrics.data?.underDevelopment ?? 0} in development`,
      icon: PackageCheck,
      tone: "success" as const,
      to: "/products" as const,
    },
    canViewInquiries && !isQaUser && {
      label: isSalesUser ? "Ready for QA" : isQcUser ? "Pending QC review" : "RFQs awaiting action",
      value: isSalesUser
        ? inquiryCounts.byStatus.SUBMITTED_TO_QA ?? 0
        : isQcUser
          ? inquiryCounts.byStatus.SUBMITTED_TO_QC ?? 0
          : inquiryCounts.awaitingAction,
      loading: inquiries.isLoading,
      detail: isSalesUser
        ? "Submitted for QA review"
        : isQcUser
          ? "Assigned to you for QC"
          : "Across all accessible RFQs",
      icon: ListChecks,
      tone: "warning" as const,
      to: "/inquiry" as const,
    },
    canViewInquiries && isSalesUser && {
      label: "Ready for QC",
      value: inquiryCounts.byStatus.SUBMITTED_TO_QC ?? 0,
      loading: inquiries.isLoading,
      detail: "RFQs now with QC",
      icon: FileCheck2,
      tone: "violet" as const,
      to: "/inquiry" as const,
    },
  ].filter(Boolean) as DashboardCard[];

  const roleCopy = {
    admin: {
      workspace: "Executive workspace",
      description: "Live operational visibility across every assigned module.",
      queueTitle: "Recent RFQs",
      queueDescription: "Latest inquiry activity across the organization",
    },
    sales: {
      workspace: "Sales workspace",
      description: "Track your RFQs and follow each handoff from sales through technical review.",
      queueTitle: "My recent RFQs",
      queueDescription: "RFQs you raised or are assigned to",
    },
    qa: {
      workspace: "QA workspace",
      description: "Prioritize formulation tasks, due dates, and technical clarifications.",
      queueTitle: "",
      queueDescription: "",
    },
    qc: {
      workspace: "QC workspace",
      description: "Review RFQs assigned to QC and keep the quality queue moving.",
      queueTitle: "My QC RFQs",
      queueDescription: "RFQs assigned to your quality-control queue",
    },
  }[dashboardRole];

  return (
    <div className="space-y-6">
      <Reveal>
        <section className="relative overflow-hidden rounded-[20px] border border-border/60 bg-primary p-6 text-primary-foreground shadow-soft sm:p-8">
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(28rem_18rem_at_85%_-20%,color-mix(in_oklab,var(--accent)_60%,transparent),transparent)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
                {roleCopy.workspace} · {todayLabel}
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {new Date().getHours() < 12
                  ? "Good morning"
                  : new Date().getHours() < 17
                    ? "Good afternoon"
                    : "Good evening"}
                , {firstName}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-primary-foreground/80 sm:text-base">
                {roleCopy.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canViewInquiries && isSalesUser && (
                <Button asChild variant="secondary" className="shadow-none">
                  <Link to="/inquiry">New inquiry</Link>
                </Button>
              )}
              {canAccessRoute(user, "/reports") && (
                <Button
                  asChild
                  className="backdrop-blur-md bg-white/15 hover:bg-white/25 text-white hover:text-white border border-white/25 hover:border-white/40 shadow-none transition-all"
                >
                  <Link to="/reports">View reports</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </Reveal>

      {(isAdminUser || isSalesUser) && (cards.length > 0 ? (
        <MetricGrid columns={isSalesUser ? 3 : 5} label={isSalesUser ? "Sales widgets" : "Workspace summary"}>
          {cards.map((card, index) => (
            <Reveal key={card.label} delay={index * 0.04} className="h-full">
              <Link to={card.to} className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <MetricCard
                  compact
                  icon={card.icon}
                  label={card.label}
                  value={card.value ?? 0}
                  detail={card.detail}
                  loading={card.loading}
                  tone={card.tone}
                  className="h-full cursor-pointer"
                />
              </Link>
            </Reveal>
          ))}
        </MetricGrid>
      ) : (
        <div className="rounded-[20px] border border-dashed border-border bg-card p-8 text-center">
          <FileCheck2 className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">No module data assigned</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask an administrator to assign the modules you need to your account.
          </p>
        </div>
      ))}

      {isQaUser && <QaTaskWidgets userId={user?.id} />}
      {isQcUser && <QcTaskWidgets userId={user?.id} />}
      {isSalesUser && <SalesPipelinePanel counts={inquiryCounts.byStatus} loading={inquiries.isLoading} />}

      {!isQaUser && (canViewInquiries || (isAdminUser && (canViewClients || canViewProducts))) && (
        <section className="grid gap-4 xl:grid-cols-3">
          {canViewInquiries && (
            <Reveal className="xl:col-span-2">
              <Panel className="h-full p-5">
                <div>
                  <h2 className="text-base font-semibold">
                    {isSalesUser ? "My RFQ activity" : isQcUser ? "My QC activity" : "RFQ activity"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isAdminUser ? "Live inquiries created over the last six months" : "Your assigned RFQ activity over the last six months"}
                  </p>
                </div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRfqActivity} margin={{ left: -24, right: 8, top: 8 }}>
                      <defs>
                        <linearGradient id="rfq-activity" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#3654b3" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="#3654b3" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <Tooltip
                        cursor={{ stroke: "var(--border)" }}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="rfqs"
                        name="RFQs"
                        stroke="#3654b3"
                        strokeWidth={2.5}
                        fill="url(#rfq-activity)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </Reveal>
          )}
          {isAdminUser && canViewClients && (
            <Reveal>
              <Panel className="h-full p-5">
                <div>
                  <h2 className="text-base font-semibold">Client distribution</h2>
                  <p className="text-xs text-muted-foreground">By registered country</p>
                </div>
                {countryDistribution.length ? (
                  <>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={countryDistribution}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={42}
                            outerRadius={68}
                            paddingAngle={3}
                          >
                            {countryDistribution.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={
                                  ["#3654b3", "#52a476", "#6ea4d7", "#d1ae4e", "#8d6bc1"][index]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid var(--border)",
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="space-y-1.5">
                      {countryDistribution.map((entry, index) => (
                        <li key={entry.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor: [
                                  "#3654b3",
                                  "#52a476",
                                  "#6ea4d7",
                                  "#d1ae4e",
                                  "#8d6bc1",
                                ][index],
                              }}
                            />
                            {entry.name}
                          </span>
                          <span className="font-semibold tabular-nums">{entry.value}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <EmptyAnalytics
                    message={
                      clients.isLoading
                        ? "Loading client distribution…"
                        : "No client addresses available yet."
                    }
                  />
                )}
              </Panel>
            </Reveal>
          )}
          {canViewInquiries && (
            <Reveal className={isAdminUser && canViewClients ? "xl:col-span-2" : undefined}>
              <Panel className="h-full justify-start p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">{roleCopy.queueTitle}</h2>
                    <p className="text-xs text-muted-foreground">
                      {roleCopy.queueDescription}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/inquiry">View all</Link>
                  </Button>
                </div>
                {recentInquiries.length ? (
                  <ul className="divide-y divide-border/60">
                    {recentInquiries.map((inquiry) => (
                      <li
                        key={inquiry.id}
                        className="flex items-center justify-between gap-4 py-3 first:pt-1"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{inquiry.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {inquiry.rfqNo} · {new Date(inquiry.inquiryDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                          {inquiry.status.replaceAll("_", " ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyAnalytics
                    message={inquiries.isLoading ? "Loading RFQs…" : "No RFQs available yet."}
                  />
                )}
              </Panel>
            </Reveal>
          )}
          {isAdminUser && canViewProducts && (
            <Reveal>
              <Panel className="h-full p-5">
                <div>
                  <h2 className="text-base font-semibold">Product lifecycle</h2>
                  <p className="text-xs text-muted-foreground">Live product master status</p>
                </div>
                <div className="mt-5 space-y-4">
                  <LifecycleRow
                    label="Active"
                    value={productMetrics.data?.active}
                    total={productMetrics.data?.total}
                    loading={productMetrics.isLoading}
                  />
                  <LifecycleRow
                    label="In development"
                    value={productMetrics.data?.underDevelopment}
                    total={productMetrics.data?.total}
                    loading={productMetrics.isLoading}
                  />
                  <LifecycleRow
                    label="Discontinued"
                    value={productMetrics.data?.discontinued}
                    total={productMetrics.data?.total}
                    loading={productMetrics.isLoading}
                  />
                </div>
              </Panel>
            </Reveal>
          )}
        </section>
      )}
    </div>
  );
}

type QaPopupMode = "pending" | "overdue" | "queries" | null;

/** QC receives the same assigned technical work-items as QA, with a QC-focused review layout. */
function QcTaskWidgets({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const workItems = useQuery({
    queryKey: ["dashboard-qc-work-items", userId],
    queryFn: () => fetchQaRfqs({ page: 0, size: 100 }),
    staleTime: 15_000,
    refetchInterval: LIVE_REFRESH_INTERVAL,
  });
  const items = workItems.data?.content || [];
  const pending = items.filter((item) => item.status !== "COMPLETED");
  const completed = items.filter((item) => item.status === "COMPLETED");
  const queries = items.filter((item) => item.status === "QUERY_RAISED");
  const today = new Date().toISOString().slice(0, 10);
  const overdue = pending.filter((item) => item.dueDate && item.dueDate < today);

  return (
    <section className="space-y-4" aria-label="QC work queue">
      <Reveal>
        <div className="flex flex-col gap-3 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-card to-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Quality control desk</p>
            <h2 className="mt-1 text-xl font-bold">Review your assigned technical work</h2>
            <p className="mt-1 text-sm text-muted-foreground">Focus on specifications, open questions, and due dates.</p>
          </div>
          <Button asChild><Link to="/qa">Open QC workbench <ArrowRight className="size-4" /></Link></Button>
        </div>
      </Reveal>
      <MetricGrid columns={4} label="QC queue summary">
        <MetricCard compact icon={ClipboardCheck} label="Assigned work" value={items.length} detail="Technical work items" tone="info" loading={workItems.isLoading} />
        <MetricCard compact icon={ListChecks} label="Awaiting review" value={pending.length} detail="Not yet completed" tone="warning" loading={workItems.isLoading} />
        <MetricCard compact icon={AlertTriangle} label="Past due" value={overdue.length} detail="Needs immediate attention" tone="danger" loading={workItems.isLoading} />
        <MetricCard compact icon={CheckCircle2} label="Completed" value={completed.length} detail="Closed work items" tone="success" loading={workItems.isLoading} />
      </MetricGrid>
      <Reveal>
        <Panel className="justify-start p-5">
          <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Priority review queue</h2><p className="text-xs text-muted-foreground">Your latest QC assignments</p></div><Badge variant="outline">{queries.length} query raised</Badge></div>
          {workItems.isLoading ? <PopupLoading label="Loading QC work items..." /> : pending.length === 0 ? <PopupEmpty label="No pending QC work items" /> : <div className="divide-y divide-border/60">{pending.slice(0, 5).map((item) => {
            const status = QA_RFQ_STATUS_COLORS[item.status];
            return <button key={item.id} type="button" onClick={() => navigate({ to: "/qa/rfq/$rfqId", params: { rfqId: item.id } })} className="group flex w-full items-center justify-between gap-4 py-3 text-left first:pt-1"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.productName}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.sourceRfqNo || item.rfqNo} · {item.customerName || "Customer not specified"}</p></div><div className="flex shrink-0 items-center gap-2"><span className={cn("hidden rounded-full border px-2 py-0.5 text-[10px] font-medium sm:inline-flex", status.bg, status.text, status.border)}>{QA_RFQ_STATUS_LABELS[item.status]}</span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" /></div></button>;
          })}</div>}
        </Panel>
      </Reveal>
    </section>
  );
}

function SalesPipelinePanel({ counts, loading }: { counts: Record<string, number>; loading: boolean }) {
  const stages = [
    { label: "Draft", value: counts.DRAFT ?? 0, icon: ClipboardList, tone: "violet" as const },
    { label: "With QA", value: counts.SUBMITTED_TO_QA ?? 0, icon: Send, tone: "warning" as const },
    { label: "With QC", value: counts.SUBMITTED_TO_QC ?? 0, icon: ClipboardCheck, tone: "info" as const },
    { label: "Fully submitted", value: counts.SUBMITTED ?? 0, icon: CheckCircle2, tone: "success" as const },
  ];
  return (
    <Reveal>
      <Panel className="justify-start overflow-hidden p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Sales pipeline</p><h2 className="mt-1 text-lg font-bold">Where your RFQs are now</h2><p className="mt-1 text-sm text-muted-foreground">Live status of RFQs you raised or own.</p></div><Button asChild variant="outline"><Link to="/inquiry">Manage RFQs <ArrowRight className="size-4" /></Link></Button></div>
        <div className="mt-5 grid divide-y divide-border/60 rounded-xl border border-border/60 sm:grid-cols-4 sm:divide-x sm:divide-y-0">{stages.map((stage) => <div key={stage.label} className="p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><stage.icon className="size-4 text-primary" />{stage.label}</div><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? <span className="inline-block h-7 w-8 animate-pulse rounded bg-muted" /> : stage.value}</p></div>)}</div>
      </Panel>
    </Reveal>
  );
}

/** QA-only work queue. Kept on the main dashboard so reviewers can act without opening QA/MFR first. */
function QaTaskWidgets({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const [popup, setPopup] = useState<QaPopupMode>(null);
  const kpis = useQuery({
    queryKey: ["qa-kpis", userId],
    queryFn: fetchQaKpis,
    staleTime: 30_000,
    refetchInterval: LIVE_REFRESH_INTERVAL,
  });
  const popupRfqs = useQuery({
    queryKey: ["dashboard-qa-popup-rfqs", userId, popup],
    queryFn: () => fetchQaRfqs({ page: 0, size: 500 }),
    enabled: popup === "pending" || popup === "overdue",
    staleTime: 15_000,
  });
  const popupQueries = useQuery<QaQuery[]>({
    queryKey: ["dashboard-qa-popup-queries", userId],
    queryFn: fetchQaQueries,
    enabled: popup === "queries",
    staleTime: 15_000,
  });

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const tasks = (popupRfqs.data?.content || []).filter((rfq) =>
    popup === "pending"
      ? rfq.status === "FORMULA_PENDING" || rfq.status === "SPECIFICATION_PENDING"
      : popup === "overdue"
        ? rfq.status !== "COMPLETED" && Boolean(rfq.dueDate) && rfq.dueDate! < today
        : false,
  );
  const queries = (popupQueries.data || []).filter((query) => query.status === "OPEN");
  const popupTitle = popup === "pending" ? "My Pending Tasks" : popup === "overdue" ? "Overdue Tasks" : "Technical Queries";

  return (
    <Reveal>
      <section aria-label="QA work queue" className="space-y-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">Quality assurance desk</p>
            <h2 className="mt-1 text-xl font-bold">Plan your formulation work</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review due tasks, build specifications, and resolve technical questions.</p>
          </div>
          <Button asChild><Link to="/qa">Open QA workbench <ArrowRight className="size-4" /></Link></Button>
        </div>
        <MetricGrid columns={3} label="QA work queue">
          <MetricCard compact icon={AlertCircle} label="My pending tasks" value={kpis.data?.myPendingTasksCount ?? 0} detail="Assigned workload" tone="primary" loading={kpis.isLoading} onClick={() => setPopup("pending")} />
          <MetricCard compact icon={AlertTriangle} label="Overdue tasks" value={kpis.data?.overdueTasksCount ?? 0} detail="Past the due date" tone="danger" loading={kpis.isLoading} onClick={() => setPopup("overdue")} />
          <MetricCard compact icon={HelpCircle} label="Technical queries" value={kpis.data?.openQueriesCount ?? 0} detail="Open clarifications" tone="violet" loading={kpis.isLoading} onClick={() => setPopup("queries")} />
        </MetricGrid>
      </section>

      <Dialog open={Boolean(popup)} onOpenChange={(open) => !open && setPopup(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[82vh] flex flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border/60 bg-muted/20 px-5 py-4">
            <div className="flex items-start gap-3 pr-6">
              <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", popup === "overdue" ? "bg-rose-500/10 text-rose-600" : popup === "queries" ? "bg-violet-500/10 text-violet-600" : "bg-primary/10 text-primary")}>
                {popup === "overdue" ? <AlertTriangle className="size-5" /> : popup === "queries" ? <HelpCircle className="size-5" /> : <AlertCircle className="size-5" />}
              </div>
              <div>
                <DialogTitle>{popupTitle}</DialogTitle>
                <DialogDescription className="mt-1 text-xs">Click an item to open the related QA workbench.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {popup === "queries" ? (
              popupQueries.isLoading ? <PopupLoading label="Loading technical queries..." /> : queries.length === 0 ? <PopupEmpty label="No open technical queries" /> : (
                <div className="space-y-2.5">{queries.map((query) => <QueryPopupRow key={query.id} query={query} onOpen={() => {
                  setPopup(null);
                  if (query.rfqId) navigate({ to: "/qa/rfq/$rfqId", params: { rfqId: query.rfqId } });
                  else if (query.mfrId) navigate({ to: "/qa/mfr/$mfrId", params: { mfrId: query.mfrId } });
                }} />)}</div>
              )
            ) : popupRfqs.isLoading ? <PopupLoading label="Loading tasks..." /> : tasks.length === 0 ? <PopupEmpty label={popup === "overdue" ? "No overdue tasks" : "No pending tasks"} /> : (
              <div className="space-y-2.5">{tasks.map((rfq) => <TaskPopupRow key={rfq.id} rfq={rfq} overdue={popup === "overdue"} onOpen={() => {
                setPopup(null);
                navigate({ to: "/qa/rfq/$rfqId", params: { rfqId: rfq.id } });
              }} />)}</div>
            )}
          </div>
          <DialogFooter className="border-t border-border/60 bg-muted/10 px-5 py-3"><Button variant="outline" onClick={() => setPopup(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}

function PopupLoading({ label }: { label: string }) {
  return <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin text-primary" />{label}</div>;
}

function PopupEmpty({ label }: { label: string }) {
  return <div className="py-12 text-center text-sm text-muted-foreground">{label}</div>;
}

function TaskPopupRow({ rfq, overdue, onOpen }: { rfq: QaRfq; overdue: boolean; onOpen: () => void }) {
  const status = QA_RFQ_STATUS_COLORS[rfq.status] ?? QA_RFQ_STATUS_COLORS.FORMULA_PENDING;
  return <button type="button" onClick={onOpen} className="group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold text-primary">{rfq.sourceRfqNo || rfq.rfqNo}</span><span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", status.bg, status.text, status.border)}>{QA_RFQ_STATUS_LABELS[rfq.status]}</span></div><p className="mt-1 truncate text-sm font-medium">{rfq.productName}</p><p className="mt-0.5 text-xs text-muted-foreground">{rfq.customerName || "No customer assigned"} · {rfq.dosageForm}</p></div>
    <div className="shrink-0 text-right"><p className={cn("text-xs font-medium", overdue ? "text-rose-600" : "text-muted-foreground")}>{rfq.dueDate ? `Due ${rfq.dueDate}` : "No due date"}</p><ArrowRight className="ml-auto mt-2 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" /></div>
  </button>;
}

function QueryPopupRow({ query, onOpen }: { query: QaQuery; onOpen: () => void }) {
  const linked = Boolean(query.rfqId || query.mfrId);
  return <button type="button" disabled={!linked} onClick={onOpen} className="group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold text-primary">{query.queryNo}</span><Badge variant="outline" className="border-violet-500/25 bg-violet-500/10 text-[10px] text-violet-700 dark:text-violet-300">Open</Badge></div><p className="mt-1 truncate text-sm font-medium">{query.subject || "Technical clarification"}</p><p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{query.queryText}</p></div>
    {linked && <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />}
  </button>;
}

type DashboardCard = {
  label: string;
  value: number | undefined;
  loading: boolean;
  detail: string;
  icon: typeof Users;
  tone: MetricTone;
  to: "/clients" | "/products" | "/inquiry";
};

function EmptyAnalytics({ message }: { message: string }) {
  return (
    <p className="grid min-h-40 place-items-center text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}
function LifecycleRow({
  label,
  value = 0,
  total = 0,
  loading,
}: {
  label: string;
  value?: number;
  total?: number;
  loading: boolean;
}) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold tabular-nums">
          {loading ? "—" : `${value} (${percentage}%)`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${loading ? 0 : percentage}%` }}
        />
      </div>
    </div>
  );
}
