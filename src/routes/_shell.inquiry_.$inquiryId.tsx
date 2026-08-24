import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel, SectionLoader, StatusChip } from "@/components/kit";
import { fetchInquiryById } from "@/lib/inquiry-api";

export const Route = createFileRoute("/_shell/inquiry_/$inquiryId")({ component: InquiryDetail });

const display = (value: unknown) => String(value ?? "—").replaceAll("_", " ");
const formatNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : "—";
};

function InquiryDetail() {
  const { inquiryId } = Route.useParams();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const {
    data: inquiry,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["inquiries", inquiryId],
    queryFn: () => fetchInquiryById(inquiryId),
  });
  if (pathname.endsWith("/edit")) return <Outlet />;
  if (isLoading) return <SectionLoader />;
  if (isError || !inquiry)
    return (
      <div className="grid min-h-[50vh] place-items-center gap-3 text-center">
        <p className="text-muted-foreground">Inquiry not found or no longer accessible.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/inquiry" })}>
          <ChevronLeft className="size-4" /> Back to inquiries
        </Button>
      </div>
    );

  return (
    <div className="space-y-6 pb-10">
      <Button variant="outline" onClick={() => navigate({ to: "/inquiry" })}>
        <ChevronLeft className="size-4" /> Back to inquiries
      </Button>
      <PageHeader
        eyebrow="Customer inquiry"
        title={inquiry.rfqNo || "RFQ"}
        description={`${inquiry.customerName || "—"} · ${inquiry.contactPersonName || "—"}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={display(inquiry.status)} />
            <Button
              onClick={() => navigate({ to: "/inquiry/$inquiryId/edit", params: { inquiryId } })}
            >
              <Pencil className="size-4" /> Edit RFQ
            </Button>
          </div>
        }
      />
      <Panel className="grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="Inquiry date" value={inquiry.inquiryDate || "—"} />
        <DetailItem label="Source" value={display(inquiry.inquirySource)} />
        <DetailItem label="Priority" value={display(inquiry.priority)} />
        <DetailItem label="Target quote date" value={inquiry.targetQuoteDate || "—"} />
        <DetailItem
          label="Sales owner"
          value={inquiry.salesAssigneeName || inquiry.raisedByUserName || "—"}
        />
        <DetailItem label="QA reviewer" value={inquiry.qaAssigneeName || "—"} />
        <DetailItem label="QC reviewer" value={inquiry.qcAssigneeName || "—"} />
      </Panel>
      <Panel className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Products</h2>
        {(inquiry.lines || []).map((line, index) => (
          <article key={`${line.productId}-${index}`} className="rounded-xl border p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-medium">{line.productName || "Product"}</h3>
                <p className="text-sm text-muted-foreground">
                  {line.genericName || "—"}
                  {line.dosageForm ? ` · ${line.dosageForm}` : ""}
                </p>
              </div>
              <Badge variant="outline">
                {line.sourcing === "OUTSOURCED" ? "Outsourced" : "In-house"}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="Packing" value={line.packagingNotes || "—"} />
              <DetailItem
                label="Order quantity"
                value={`${formatNumber(line.quantityRequired)} ${display(line.orderQuantityUnit)}`}
              />
              <DetailItem
                label="Total tablets"
                value={formatNumber(line.calculatedTabletQuantity ?? line.quantityRequired)}
              />
              <DetailItem
                label="Target price"
                value={line.targetPrice == null ? "—" : String(line.targetPrice)}
              />
            </div>
          </article>
        ))}
      </Panel>
      {inquiry.notes && (
        <Panel className="p-5">
          <h2 className="mb-2 text-lg font-semibold">Internal notes</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{inquiry.notes}</p>
        </Panel>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium capitalize">{value}</p>
    </div>
  );
}
