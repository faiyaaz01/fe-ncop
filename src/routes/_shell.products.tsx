import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Boxes, Download, FileText, Plus, ShieldCheck, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState, PageHeader, Panel, StatusChip } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { products, type Product } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/products")({
  head: () => ({
    meta: [
      { title: "Product Master · NCOP ERP" },
      {
        name: "description",
        content:
          "Searchable pharmaceutical catalogue with dosage forms, strengths, packaging, MOQ and registration status.",
      },
      { property: "og:title", content: "Product Master · NCOP ERP" },
      {
        property: "og:description",
        content: "Pharmaceutical catalogue: dosage forms, strengths, packaging and registrations.",
      },
    ],
  }),
  component: ProductMaster,
});

function ProductMaster() {
  const [active, setActive] = useState<Product | null>(null);
  const [category, setCategory] = useState("all");
  const [form, setForm] = useState("all");

  const categories = Array.from(new Set(products.map((p) => p.category)));
  const forms = Array.from(new Set(products.map((p) => p.dosageForm)));

  const rows = products.filter(
    (p) =>
      (category === "all" || p.category === category) && (form === "all" || p.dosageForm === form),
  );

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      sortValue: (p) => p.name,
      render: (p) => (
        <div className="min-w-[220px]">
          <p className="font-semibold">{p.name}</p>
          <p className="text-xs text-muted-foreground">
            {p.id} · {p.generic}
          </p>
        </div>
      ),
    },
    { key: "category", header: "Category", sortable: true, sortValue: (p) => p.category, render: (p) => <span className="text-sm">{p.category}</span> },
    { key: "form", header: "Dosage form", render: (p) => <span className="text-sm text-muted-foreground">{p.dosageForm}</span> },
    { key: "strength", header: "Strength", render: (p) => <span className="text-sm">{p.strength}</span> },
    { key: "packaging", header: "Packaging", render: (p) => <span className="text-sm text-muted-foreground">{p.packaging}</span> },
    {
      key: "price",
      header: "Unit price",
      sortable: true,
      sortValue: (p) => p.price,
      render: (p) => (
        <span className="text-sm font-semibold tabular-nums">
          {p.currency} {p.price.toFixed(3)}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (p) => <StatusChip status={p.status} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Product Master</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        eyebrow="Catalogue"
        title="Product Master"
        description="1,280 registered SKUs. Filter by category, dosage form or strength and open a record for full specifications."
        actions={
          <>
            <Button variant="outline" onClick={() => toast("Catalogue export queued")}>
              <Download className="size-4" /> Export
            </Button>
            <Button onClick={() => toast.success("New product draft created")}>
              <Plus className="size-4" /> Add product
            </Button>
          </>
        }
      />

      <DataTable
        rows={rows}
        columns={columns}
        pageSize={6}
        onRowClick={setActive}
        searchKeys={(p) => `${p.name} ${p.generic} ${p.category} ${p.strength} ${p.id}`}
        empty={
          <EmptyState
            icon={<Boxes className="size-5" />}
            title="No products found"
            description="No SKU matches the current filters. Adjust category or dosage form to widen the search."
          />
        }
        filters={
          <>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form} onValueChange={setForm}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Dosage form" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dosage forms</SelectItem>
                {forms.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="glass w-full overflow-y-auto sm:max-w-lg">
          {active && (
            <>
              <SheetHeader className="border-b border-border/60">
                <SheetTitle className="text-lg">{active.name}</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {active.id} · {active.generic}
                </p>
                <div className="pt-1">
                  <StatusChip status={active.status} />
                </div>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-8">
                <p className="text-sm text-muted-foreground">{active.description}</p>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Category", active.category],
                    ["Dosage form", active.dosageForm],
                    ["Strength", active.strength],
                    ["Packaging", active.packaging],
                    ["MOQ", active.moq],
                    ["Shelf life", active.shelfLife],
                  ].map(([l, v]) => (
                    <div key={l} className="surface p-3.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</p>
                      <p className="mt-1 text-sm font-semibold">{v}</p>
                    </div>
                  ))}
                </div>

                <Panel>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Snowflake className="size-3.5" /> Storage conditions
                  </p>
                  <p className="mt-2 text-sm">{active.storage}</p>
                </Panel>

                <div>
                  <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ShieldCheck className="size-3.5" /> Registrations
                  </p>
                  {active.registrations.length === 0 ? (
                    <EmptyState
                      icon={<FileText className="size-5" />}
                      title="No active registrations"
                      description="This SKU has no valid market authorisation on file and cannot be quoted."
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {active.registrations.map((r) => (
                        <span
                          key={r}
                          className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Accordion type="single" collapsible className="surface px-4">
                  <AccordionItem value="specs" className="border-0">
                    <AccordionTrigger className="text-sm">Technical specification</AccordionTrigger>
                    <AccordionContent className="space-y-1.5 text-xs text-muted-foreground">
                      <p>Assay: 95.0 – 105.0% of labelled amount (HPLC).</p>
                      <p>Dissolution: NLT 80% in 30 minutes (USP Apparatus II).</p>
                      <p>Microbial limits: comply with USP &lt;61&gt; / &lt;62&gt;.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="pricing" className="border-0">
                    <AccordionTrigger className="text-sm">Commercial terms</AccordionTrigger>
                    <AccordionContent className="space-y-1.5 text-xs text-muted-foreground">
                      <p>
                        Indicative price: {active.currency} {active.price.toFixed(3)} per unit, ex-works.
                      </p>
                      <p>Lead time: 45–60 days from confirmed purchase order.</p>
                      <p>Validity: 30 days from quotation date.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}