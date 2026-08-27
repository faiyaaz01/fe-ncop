import {
  ClipboardList,
  Clock3,
  Eye,
  Package,
  Pencil,
  Plus,
  Search,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardGridLoader, PageHeader, Panel, TableRowLoader, StatusChip } from "@/components/kit";
import { ViewModeToggle, type ViewMode } from "@/components/view-mode-toggle";
import type { CustomerInquiry } from "@/lib/inquiry-types";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InquiryList({
  inquiries,
  loading,
  onAdd,
  assignedOnly = false,
  canCreate = true,
  canEdit,
  onEdit,
  onView,
}: {
  inquiries: CustomerInquiry[];
  loading: boolean;
  onAdd: () => void;
  assignedOnly?: boolean;
  canCreate?: boolean;
  canEdit?: (inquiry: CustomerInquiry) => boolean;
  onEdit?: (inquiry: CustomerInquiry) => void;
  onView: (inquiry: CustomerInquiry) => void;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
      awaitingReview: inquiries.filter((inquiry) =>
        ["SUBMITTED", "SUBMITTED_TO_QA", "SUBMITTED_TO_QC"].includes(inquiry.status),
      ).length,
      highPriority: inquiries.filter((inquiry) => ["HIGH", "CRITICAL"].includes(inquiry.priority))
        .length,
      dueSoon: inquiries.filter((inquiry) => {
        if (!inquiry.targetQuoteDate) return false;
        const targetDate = new Date(`${inquiry.targetQuoteDate}T00:00:00`);
        return targetDate >= today && targetDate <= nextWeek;
      }).length,
      productLines: inquiries.reduce((total, inquiry) => total + inquiry.lines.length, 0),
    };
  }, [inquiries]);
  const sources = useMemo(
    () => [...new Set(inquiries.map((inquiry) => inquiry.inquirySource).filter(Boolean))].sort(),
    [inquiries],
  );
  const statuses = useMemo(
    () => [...new Set(inquiries.map((inquiry) => inquiry.status).filter(Boolean))].sort(),
    [inquiries],
  );
  const filteredInquiries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return inquiries.filter((inquiry) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          inquiry.rfqNo,
          inquiry.customerName,
          inquiry.contactPersonName,
          ...inquiry.lines.flatMap((line) => [line.productName, line.genericName]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      return (
        matchesSearch &&
        (priorityFilter === "ALL" || inquiry.priority === priorityFilter) &&
        (sourceFilter === "ALL" || inquiry.inquirySource === sourceFilter) &&
        (statusFilter === "ALL" || inquiry.status === statusFilter)
      );
    });
  }, [inquiries, priorityFilter, search, sourceFilter, statusFilter]);

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
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="RFQ summary">
        <RfqMetric
          icon={ClipboardList}
          label="RFQs"
          value={inquiries.length}
          detail={assignedOnly ? "Assigned or raised by you" : "Available in this workspace"}
          loading={loading}
          tone="primary"
        />
        <RfqMetric
          icon={Clock3}
          label="Awaiting review"
          value={metrics.awaitingReview}
          detail="Submitted to QA or QC"
          loading={loading}
          tone="success"
        />
        <RfqMetric
          icon={TriangleAlert}
          label="High priority"
          value={metrics.highPriority}
          detail="High and critical RFQs"
          loading={loading}
          tone="warning"
        />
        <RfqMetric
          icon={Package}
          label="Product requests"
          value={metrics.productLines}
          detail={`${metrics.dueSoon} quote due within 7 days`}
          loading={loading}
          tone="violet"
        />
      </section>
      <div className="surface flex flex-col gap-3 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search RFQ number, customer, contact, or product"
            className="pl-9"
          />
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3 xl:w-auto xl:min-w-[650px]">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority[0] + priority.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sources</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="surface rounded-xl border border-border/60 overflow-hidden">
        {/* Mobile / Card View */}
        <div
          className={`grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3 ${viewMode === "list" ? "md:hidden" : ""}`}
        >
          {loading ? (
            <CardGridLoader cards={6} />
          ) : filteredInquiries.length === 0 ? (
            <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardList className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">
                  {inquiries.length ? "No RFQs match these filters" : "No inquiries submitted yet"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {inquiries.length
                    ? "Try changing or clearing your search and filters."
                    : assignedOnly
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
            filteredInquiries.map((inquiry, index) => (
              <motion.article
                key={inquiry.id}
                className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(index * 0.04, 0.25),
                  ease: [0.22, 1, 0.36, 1],
                }}
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

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onView(inquiry)}
                  >
                    <Eye className="size-4" /> View RFQ
                  </Button>
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
                </div>
              </motion.article>
            ))
          )}
        </div>

        {/* Desktop List View */}
        <div
          className={`hidden overflow-x-auto overflow-y-hidden ${viewMode === "list" ? "md:block" : ""}`}
        >
          <table className="min-w-[720px] w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">RFQ no.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer / Contact</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Sales owner</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <TableRowLoader colSpan={8} rows={6} />
              ) : filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    {inquiries.length
                      ? "No RFQs match the selected filters."
                      : assignedOnly
                        ? "You have not raised or been assigned any RFQs yet."
                        : "No inquiries submitted yet."}
                  </td>
                </tr>
              ) : (
                filteredInquiries.map((inquiry, i) => (
                  <motion.tr
                    key={inquiry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.025, duration: 0.25 }}
                    className="hover:bg-muted/30 transition-colors duration-150"
                  >
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onView(inquiry)}>
                          <Eye className="size-4" /> View RFQ
                        </Button>
                        {onEdit && canEdit?.(inquiry) && (
                          <Button variant="ghost" size="sm" onClick={() => onEdit(inquiry)}>
                            <Pencil className="size-4" /> Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RfqMetric({
  icon: Icon,
  label,
  value,
  detail,
  loading,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
  loading: boolean;
  tone: "primary" | "success" | "warning" | "violet";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };
  return (
    <div className="surface flex min-h-28 items-center gap-4 p-5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${toneClasses[tone]}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-3 w-28" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
            <p className="text-sm font-medium">{label}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
          </>
        )}
      </div>
    </div>
  );
}
