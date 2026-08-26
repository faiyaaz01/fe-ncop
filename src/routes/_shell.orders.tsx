import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileText, Package, Ship, Truck } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, Panel, StatusChip, Timeline } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mockClients as clients, orders, products } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/orders")({
  head: () => ({
    meta: [
      { title: "Final Order · Nourish Pharmaceutical ERP" },
      {
        name: "description",
        content:
          "Confirmed export order summary with products, shipping details, commercial totals, payment info and a live status tracker.",
      },
      { property: "og:title", content: "Final Order · Nourish Pharmaceutical ERP" },
      {
        property: "og:description",
        content: "Export order summary and shipment status tracker for pharmaceutical trade.",
      },
    ],
  }),
  component: FinalOrder,
});

const stages = ["Confirmed", "In Production", "QA Release", "Shipped", "Delivered"];

function FinalOrder() {
  const [selected, setSelected] = useState(orders[0]!.id);
  const order = orders.find((o) => o.id === selected)!;
  const client = clients.find((c) => c.name === order.client)!;
  const lines = products.slice(0, order.items);
  const stageIndex = stages.indexOf(order.status);
  const subtotal = order.value;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fulfilment"
        title="Final Order"
        description="Confirmed orders with commercial summary, shipping documents and live status tracking."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => toast("Proforma invoice exported as PDF")}
              className="gap-2 font-medium"
            >
              <Download className="size-4 text-primary dark:text-accent" /> Proforma
            </Button>
            <Button onClick={() => toast.success("Packing list shared with logistics")}>
              <Ship className="size-4" /> Share with logistics
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {orders.map((o) => (
          <button
            key={o.id}
            onClick={() => setSelected(o.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              selected === o.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary",
            )}
          >
            {o.id}
          </button>
        ))}
      </div>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {order.id}
            </p>
            <h2 className="text-xl font-bold">{order.client}</h2>
            <p className="text-sm text-muted-foreground">
              {client.city}, {client.country} · {order.incoterm} · ETA {order.eta}
            </p>
          </div>
          <div className="text-right">
            <StatusChip status={order.status} />
            <p className="mt-2 text-2xl font-bold tabular-nums">
              ${order.value.toLocaleString("en-US")}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Order progress</span>
            <span>{order.progress}%</span>
          </div>
          <Progress value={order.progress} className="h-2" />
          <ol className="mt-5 grid gap-4 sm:grid-cols-5">
            {stages.map((s, i) => (
              <li key={s} className="flex items-center gap-2.5 sm:flex-col sm:items-start">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full border text-[11px] font-bold",
                    i <= stageIndex
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    i <= stageIndex ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Package className="size-4 text-primary" /> Order lines
          </h3>
          <ul className="divide-y divide-border/70">
            {lines.map((p, i) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.id} · {p.packaging}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{(i + 2) * 250_000} units</p>
                <p className="text-sm font-semibold tabular-nums">
                  $
                  {((i + 2) * 250_000 * p.price).toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            {[
              ["Subtotal", `$${subtotal.toLocaleString("en-US")}`],
              ["Freight & insurance", "$8,400"],
              ["Documentation", "$620"],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-muted-foreground">
                <dt>{l}</dt>
                <dd className="tabular-nums">{v}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">${(subtotal + 9020).toLocaleString("en-US")}</dd>
            </div>
          </dl>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Truck className="size-4 text-primary" /> Shipping
            </h3>
            <dl className="space-y-2 text-xs">
              {[
                ["Incoterm", order.incoterm],
                ["Mode", "Sea freight · 2 x 40ft"],
                ["Consignee", order.client],
                ["ETA", order.eta],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{l}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel>
            <h3 className="mb-3 text-base font-semibold">Payment</h3>
            <dl className="space-y-2 text-xs">
              {[
                ["Terms", client.paymentTerms],
                ["Currency", client.currency],
                ["Bank", client.bank.name],
                ["SWIFT", client.bank.swift],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{l}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel>
            <h3 className="mb-3 text-base font-semibold">Attachments</h3>
            {client.documents.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-5" />}
                title="No documents attached"
                description="Shipping documents will appear here once QA releases the batch."
              />
            ) : (
              <ul className="space-y-2">
                {client.documents.map((d) => (
                  <li key={d.name} className="flex items-center gap-2.5 text-xs">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{d.name}</span>
                    <span className="text-muted-foreground">{d.size}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Panel>
        <h3 className="mb-4 text-base font-semibold">Order activity</h3>
        <Timeline
          items={[
            {
              date: order.eta,
              title: "Estimated delivery",
              detail: `${order.incoterm} · consignee warehouse`,
            },
            {
              date: "28 Jul 2026",
              title: "Batch documentation issued",
              detail: "CoA & CoO uploaded by QA",
            },
            {
              date: "21 Jul 2026",
              title: "Production completed",
              detail: `${order.items} line items packed`,
            },
            {
              date: "12 Jul 2026",
              title: "Order confirmed",
              detail: `PO received from ${order.client}`,
            },
          ]}
        />
      </Panel>
    </div>
  );
}
