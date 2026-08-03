import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Building2,
  Download,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, Reveal, StatusChip, Timeline, EmptyState } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { clients, type Client } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/clients")({
  head: () => ({
    meta: [
      { title: "Client Master · NCOP ERP" },
      {
        name: "description",
        content:
          "Company records, contacts, payment terms, banking details and document dossiers for every pharmaceutical partner.",
      },
      { property: "og:title", content: "Client Master · NCOP ERP" },
      {
        property: "og:description",
        content: "Complete pharmaceutical client dossiers with documents and activity timelines.",
      },
    ],
  }),
  component: ClientMaster,
});

const segments = ["All", "Manufacturer", "Distributor", "Wholesaler", "Government Tender"] as const;

function ClientMaster() {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<(typeof segments)[number]>("All");
  const [active, setActive] = useState<Client | null>(null);

  const filtered = clients.filter(
    (c) =>
      (segment === "All" || c.segment === segment) &&
      `${c.name} ${c.country} ${c.contactPerson} ${c.code}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Client Master</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}

      <PageHeader
        eyebrow="ERP"
        title="Client Master"
        description="148 registered partners across 42 markets. Select a company to open its full dossier."
        actions={
          <>
            <Button variant="outline" onClick={() => toast("Client list exported as XLSX")}>
              <Download className="size-4" /> Export
            </Button>
            <Button onClick={() => toast.success("New client draft created")}>
              <Plus className="size-4" /> Add client
            </Button>
          </>
        }
      />

      <Panel className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by company, contact or country…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {segments.map((s) => (
            <button
              key={s}
              onClick={() => setSegment(s)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                segment === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No clients match your filters"
          description="Try a different segment or clear the search term to see all registered partners."
          action={
            <Button variant="outline" size="sm" onClick={() => { setQuery(""); setSegment("All"); }}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.05}>
              <button onClick={() => setActive(c)} className="w-full text-left">
                <Panel hover className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold leading-tight">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.code} · {c.segment}
                        </p>
                      </div>
                    </div>
                    <StatusChip status={c.status} />
                  </div>

                  <dl className="mt-5 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Globe2 className="size-3.5" /> {c.city}, {c.country}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5" /> {c.email}
                    </div>
                  </dl>

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Revenue YTD
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        ${(c.revenue / 1_000_000).toFixed(2)}M
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Open orders
                      </p>
                      <p className="text-sm font-semibold">{c.openOrders}</p>
                    </div>
                  </div>
                </Panel>
              </button>
            </Reveal>
          ))}
        </div>
      )}

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="glass w-full overflow-y-auto sm:max-w-xl">
          {active && (
            <>
              <SheetHeader className="border-b border-border/60">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-base font-bold text-primary">
                    {active.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="space-y-1">
                    <SheetTitle className="text-lg">{active.name}</SheetTitle>
                    <div className="flex items-center gap-2">
                      <StatusChip status={active.status} />
                      <span className="text-xs text-muted-foreground">
                        Client since {active.registeredSince}
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="px-4 pb-8">
                <Tabs defaultValue="overview">
                  <TabsList className="w-full">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="commercial">Commercial</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-5 space-y-5">
                    <div className="surface p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Primary contact
                      </p>
                      <p className="mt-2 text-sm font-semibold">{active.contactPerson}</p>
                      <p className="text-xs text-muted-foreground">{active.designation}</p>
                      <div className="mt-3 space-y-1.5 text-xs">
                        <p className="flex items-center gap-2">
                          <Mail className="size-3.5 text-muted-foreground" /> {active.email}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="size-3.5 text-muted-foreground" /> {active.phone}
                        </p>
                      </div>
                    </div>
                    <div className="surface p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Registered address
                      </p>
                      <p className="mt-2 flex items-start gap-2 text-sm">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        {active.address}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="commercial" className="mt-5 space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { l: "Payment terms", v: active.paymentTerms },
                        { l: "Currency", v: active.currency },
                        { l: "Credit limit", v: active.creditLimit },
                        { l: "Segment", v: active.segment },
                      ].map((f) => (
                        <div key={f.l} className="surface p-4">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {f.l}
                          </p>
                          <p className="mt-1 text-sm font-semibold">{f.v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="surface p-4">
                      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Building2 className="size-3.5" /> Bank details
                      </p>
                      <dl className="space-y-2 text-xs">
                        {[
                          ["Bank", active.bank.name],
                          ["Account / IBAN", active.bank.account],
                          ["SWIFT", active.bank.swift],
                          ["Branch", active.bank.branch],
                        ].map(([l, v]) => (
                          <div key={l} className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">{l}</dt>
                            <dd className="text-right font-medium">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="mt-5">
                    {active.documents.length === 0 ? (
                      <EmptyState
                        icon={<FileText className="size-5" />}
                        title="No documents uploaded"
                        description="Regulatory and legal dossiers for this client have not been attached yet."
                        action={
                          <Button size="sm" variant="outline" onClick={() => toast("Upload dialog opened")}>
                            Upload document
                          </Button>
                        }
                      />
                    ) : (
                      <ul className="space-y-2.5">
                        {active.documents.map((d) => (
                          <motion.li
                            key={d.name}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="surface flex items-center gap-3 p-3.5"
                          >
                            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                              <FileText className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{d.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {d.type} · {d.size} · {d.date}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Download"
                              onClick={() => toast.success(`${d.name} downloaded`)}
                            >
                              <Download className="size-4" />
                            </Button>
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="activity" className="mt-5">
                    <Timeline items={active.timeline} />
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}