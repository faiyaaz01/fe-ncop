import { ClipboardList, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel, SectionLoader, StatusChip } from "@/components/kit";
import { ViewModeToggle, type ViewMode } from "@/components/view-mode-toggle";
import type { CustomerInquiry } from "@/lib/inquiry-types";

export function InquiryList({
  inquiries,
  loading,
  onAdd,
  assignedOnly = false,
  canCreate = true,
  canEdit,
  onEdit,
}: {
  inquiries: CustomerInquiry[];
  loading: boolean;
  onAdd: () => void;
  assignedOnly?: boolean;
  canCreate?: boolean;
  canEdit?: (inquiry: CustomerInquiry) => boolean;
  onEdit?: (inquiry: CustomerInquiry) => void;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title={assignedOnly ? "My Inquiries" : "Customer Inquiries"}
        description={
          assignedOnly
            ? "RFQs you raised or that are assigned to you."
            : "Submitted RFQs and their QA/QC review routing."
        }
        actions={
          <div className="flex items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            {canCreate && (
              <Button onClick={onAdd}>
                <Plus className="size-4" /> Add Inquiry
              </Button>
            )}
          </div>
        }
      />
      <Panel className="overflow-hidden p-0">
        {loading ? (
          <SectionLoader />
        ) : inquiries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ClipboardList className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">No inquiries submitted yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {assignedOnly
                  ? "You have not raised or been assigned any RFQs yet."
                  : "Create the first customer RFQ to begin the review workflow."}
              </p>
            </div>
            {canCreate && (
              <Button onClick={onAdd}>
                <Plus className="size-4" /> Add Inquiry
              </Button>
            )}
          </div>
        ) : (
          <>
            <div
              className={`grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3 ${viewMode === "list" ? "md:hidden" : ""}`}
            >
              {inquiries.map((inquiry) => (
                <article
                  key={inquiry.id}
                  className="space-y-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold">{inquiry.rfqNo}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{inquiry.inquiryDate}</p>
                    </div>
                    <StatusChip status={inquiry.status.replaceAll("_", " ")} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{inquiry.customerName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {inquiry.contactPersonName}
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted/45 p-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Products
                    </p>
                    <div className="space-y-1.5">
                      {inquiry.lines.map((line) => (
                        <p key={`${inquiry.id}-${line.productId}`} className="break-words text-xs">
                          <span className="font-medium">{line.productName}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {line.sourcing === "OUTSOURCED" ? "QC" : "QA"}:{" "}
                            {line.sourcing === "OUTSOURCED"
                              ? inquiry.qcAssigneeName || "Unassigned"
                              : inquiry.qaAssigneeName || "Unassigned"}
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Sales owner: </span>
                      <span className="break-words">
                        {inquiry.salesAssigneeName || inquiry.raisedByUserName || "—"}
                      </span>
                    </div>
                    <Badge variant="outline">{inquiry.priority}</Badge>
                  </div>

                  {onEdit && canEdit?.(inquiry) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onEdit(inquiry)}
                    >
                      <Pencil className="size-4" /> Edit inquiry
                    </Button>
                  )}
                </article>
              ))}
            </div>

            <div className={`hidden overflow-x-auto ${viewMode === "list" ? "md:block" : ""}`}>
              <table className="min-w-[720px] w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">RFQ no.</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer / Contact</th>
                    <th className="px-4 py-3">Products</th>
                    <th className="px-4 py-3">Sales owner</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    {onEdit && (
                      <th className="px-4 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {inquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono font-medium">{inquiry.rfqNo}</td>
                      <td className="whitespace-nowrap px-4 py-3">{inquiry.inquiryDate}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{inquiry.customerName}</p>
                        <p className="text-xs text-muted-foreground">{inquiry.contactPersonName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {inquiry.lines.map((line) => (
                            <p key={`${inquiry.id}-${line.productId}`} className="text-xs">
                              <span className="font-medium">{line.productName}</span>
                              <span className="text-muted-foreground">
                                {" "}
                                · {line.sourcing === "OUTSOURCED" ? "QC" : "QA"}:{" "}
                                {line.sourcing === "OUTSOURCED"
                                  ? inquiry.qcAssigneeName
                                  : inquiry.qaAssigneeName}
                              </span>
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {inquiry.salesAssigneeName || inquiry.raisedByUserName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{inquiry.priority}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={inquiry.status.replaceAll("_", " ")} />
                      </td>
                      {onEdit && (
                        <td className="px-4 py-3 text-right">
                          {canEdit?.(inquiry) && (
                            <Button variant="ghost" size="sm" onClick={() => onEdit(inquiry)}>
                              <Pencil className="size-4" /> Edit
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
