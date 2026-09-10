import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FlaskConical,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Trash2,
  Sliders,
  Sparkles,
  Building2,
  Calendar,
  Loader2,
  RotateCcw,
  ChevronDown,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { userSessionService } from "@/lib/user-session";
import {
  Counter,
  MetricCard,
  MetricGrid,
  PageHeader,
  Panel,
  TableRowLoader,
  CardGridLoader,
  EmptyState,
  EntityFormPage,
  FormSection,
  FormCodeBanner,
  UniversalFilterBar,
} from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ViewModeToggle, type ViewMode } from "@/components/view-mode-toggle";
import {
  fetchQaRfqs,
  fetchQaKpis,
  createQaRfq,
  deleteQaRfq,
  fetchMfrMatches,
  cloneMfr,
} from "@/lib/qa-api";
import { fetchAllClients } from "@/lib/client-api";
import { CUSTOMER_TYPE_LABELS, type Client } from "@/lib/client-types";
import { fetchInquiries } from "@/lib/inquiry-api";
import type { CustomerInquiry } from "@/lib/inquiry-types";
import {
  QA_RFQ_STATUS_LABELS,
  QA_RFQ_STATUS_COLORS,
  QA_PRIORITY_LABELS,
  QA_PRIORITY_COLORS,
  DOSAGE_FORMS,
  PHARMACOPEIAS,
  type QaRfq,
  type QaRfqRequestDto,
  type QaRfqStatus,
  type QaPriority,
  type MfrMatchResult,
} from "@/lib/qa-types";

export const Route = createFileRoute("/_shell/qa")({
  head: () => ({
    meta: [
      { title: "QA & MFR System · Nourish Pharmaceutical ERP" },
      {
        name: "description",
        content:
          "QA RFQ composition workbench, Master Formula Records (MFR), and automated formula matching engine.",
      },
    ],
  }),
  component: QaDashboardPage,
});


function QaDashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Filters & State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dosageFilter, setDosageFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [newRfqModalOpen, setNewRfqModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; rfqNo: string } | null>(null);
  const [matchModalRfq, setMatchModalRfq] = useState<QaRfq | null>(null);

  // New RFQ Form State
  const sessionUser = userSessionService.getCurrentUser();
  const defaultInitiator = sessionUser?.name || sessionUser?.username || "Sales Team";

  const [newRfq, setNewRfq] = useState<QaRfqRequestDto>({
    productName: "",
    brandName: "",
    dosageForm: "Tablet",
    dosageVariant: "",
    category: "General",
    pharmacopeia: "IP",
    standard: "IP",
    customerName: "",
    customerCode: "",
    priority: "MEDIUM",
    orderQty: 12000,
    packingSpecs: "10x1x10",
    totalTablets: 1200000,
    targetBatchSize: 1200000,
    batchUnit: "Tablets",
    assignedBy: defaultInitiator,
    dueDate: "",
    remarks: "",
    inquiryId: "",
  });
  const [inquirySearch, setInquirySearch] = useState("");
  const [inquiryDropdownOpen, setInquiryDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  // Queries (instant cache + keepPreviousData for fast loading)
  const { data: kpis } = useQuery({
    queryKey: ["qa-kpis"],
    queryFn: fetchQaKpis,
    staleTime: 30000,
  });

  const { data: inquiriesPage } = useQuery({
    queryKey: ["inquiries-for-qa"],
    queryFn: () => fetchInquiries(0, 100),
    staleTime: 60000,
    enabled: newRfqModalOpen,
  });

  const { data: clientsList = [] } = useQuery<Client[]>({
    queryKey: ["clients", "all"],
    queryFn: fetchAllClients,
    staleTime: 60000,
    enabled: newRfqModalOpen,
  });

  const inquiriesList: CustomerInquiry[] = inquiriesPage?.content ?? [];
  const filteredInquiries = inquirySearch.trim()
    ? inquiriesList.filter(
        (inq) =>
          inq.rfqNo?.toLowerCase().includes(inquirySearch.toLowerCase()) ||
          inq.customerName?.toLowerCase().includes(inquirySearch.toLowerCase()) ||
          inq.lines?.some((l) =>
            l.productName?.toLowerCase().includes(inquirySearch.toLowerCase()),
          ),
      )
    : inquiriesList;

  const filteredClients = clientSearch.trim()
    ? clientsList.filter(
        (c) =>
          c.companyName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
          c.customerCode?.toLowerCase().includes(clientSearch.toLowerCase()) ||
          c.tradeName?.toLowerCase().includes(clientSearch.toLowerCase()),
      )
    : clientsList;

  const { data: rfqsPage, isLoading: rfqsLoading } = useQuery({
    queryKey: ["qa-rfqs", page, pageSize, search, statusFilter, priorityFilter, dosageFilter],
    queryFn: () =>
      fetchQaRfqs({
        page,
        size: pageSize,
        search,
        status: statusFilter,
        priority: priorityFilter,
        dosageForm: dosageFilter,
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 15000,
  });

  // Match Modal Query
  const { data: matches = [], isLoading: matchesLoading } = useQuery<MfrMatchResult[]>({
    queryKey: ["qa-matches", matchModalRfq?.id],
    queryFn: () => fetchMfrMatches(matchModalRfq!.id),
    enabled: Boolean(matchModalRfq?.id),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (dto: QaRfqRequestDto) => createQaRfq(dto),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["qa-rfqs"] });
      queryClient.invalidateQueries({ queryKey: ["qa-kpis"] });
      toast.success(`QA RFQ ${created.rfqNo} created successfully`);
      setNewRfqModalOpen(false);
      navigate({ to: "/qa/rfq/$rfqId", params: { rfqId: created.id } });
    },
    onError: (err: Error) => {
      toast.error(`Failed to create RFQ: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQaRfq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa-rfqs"] });
      queryClient.invalidateQueries({ queryKey: ["qa-kpis"] });
      toast.success("RFQ deleted");
      setDeleteConfirm(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete RFQ: ${err.message}`);
    },
  });

  const cloneMfrMutation = useMutation({
    mutationFn: ({ match, rfqId }: { match: MfrMatchResult; rfqId: string }) =>
      cloneMfr(match.targetType, match.targetId, rfqId),
    onSuccess: (mfr) => {
      queryClient.invalidateQueries({ queryKey: ["qa-rfqs"] });
      queryClient.invalidateQueries({ queryKey: ["qa-kpis"] });
      toast.success(`Cloned formula into ${mfr.mfrNo}!`);
      setMatchModalRfq(null);
      navigate({ to: "/qa/mfr/$mfrId", params: { mfrId: mfr.id } });
    },
    onError: (err: Error) => {
      toast.error(`Failed to clone formula: ${err.message}`);
    },
  });

  const rfqList = rfqsPage?.content ?? [];
  const totalElements = rfqsPage?.totalElements ?? 0;
  const totalPages = rfqsPage?.totalPages ?? 1;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRfq.productName?.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    createMutation.mutate(newRfq);
  };

  if (newRfqModalOpen) {
    return (
      <EntityFormPage
        eyebrow="QUALITY ASSURANCE & TECHNICAL"
        title="Register New QA RFQ"
        description="Fill in the details below. RFQ code will be auto-generated."
        backLabel="Back to QA RFQs"
        onBack={() => setNewRfqModalOpen(false)}
        formId="qa-rfq-form"
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
        submitLabel="Create & Open RFQ"
        submittingLabel="Creating..."
      >
        {/* ── Section 1: Product & Formulation Specification ── */}
        <FormSection
          title="Product & Formulation Specification"
          description="Define the product identity, therapeutic category, standard, and dosage form."
        >
          <FormCodeBanner
            label="RFQ Number"
            code="RFQ-QA-YYYY-XXXX"
            hint="Auto-assigned on save"
          />

          {/* ── Link from Sales Inquiry (Dropdown Combobox) ── */}
          <div className="space-y-2">
            <Label>Link to Sales Inquiry (Optional)</Label>
            <Popover open={inquiryDropdownOpen} onOpenChange={setInquiryDropdownOpen}>
              <PopoverTrigger asChild>
                <div
                  role="combobox"
                  aria-expanded={inquiryDropdownOpen}
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-muted/40 transition-colors",
                    !newRfq.inquiryId && "text-muted-foreground",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    {newRfq.inquiryId ? (
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-semibold text-primary">
                          {inquiriesList.find((i) => i.id === newRfq.inquiryId)?.rfqNo || newRfq.inquiryId}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-medium text-foreground truncate">
                          {inquiriesList.find((i) => i.id === newRfq.inquiryId)?.customerName || newRfq.customerName}
                        </span>
                        {inquiriesList.find((i) => i.id === newRfq.inquiryId)?.lines?.[0] && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                            ({inquiriesList.find((i) => i.id === newRfq.inquiryId)?.lines?.[0]?.productName})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="truncate">Search by Inquiry No, Customer, or Product...</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {newRfq.inquiryId && (
                      <span
                        role="button"
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewRfq({
                            ...newRfq,
                            inquiryId: "",
                            customerId: "",
                            customerName: "",
                            customerCode: "",
                            customerType: "",
                          });
                          setInquirySearch("");
                        }}
                        title="Unlink inquiry"
                      >
                        <X className="size-3.5" />
                      </span>
                    )}
                    <ChevronDown className="size-4 opacity-50" />
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-[min(var(--radix-popover-trigger-width),calc(100vw-2rem))] max-w-[640px] p-0 shadow-lg border"
                align="start"
              >
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Type inquiry no, customer, product..."
                      value={inquirySearch}
                      onChange={(e) => setInquirySearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-border/40">
                  {filteredInquiries.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No matching inquiries found
                    </div>
                  ) : (
                    filteredInquiries.map((inq) => {
                      const isSelected = newRfq.inquiryId === inq.id;
                      const firstLine = inq.lines?.[0];
                      const matchedClient = clientsList.find(
                        (c) =>
                          (inq.customerId && c.id === inq.customerId) ||
                          (inq.customerName && c.companyName?.toLowerCase() === inq.customerName.toLowerCase()),
                      );
                      return (
                        <button
                          key={inq.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm hover:bg-muted/80 transition-colors cursor-pointer",
                            isSelected && "bg-primary/10 text-primary font-semibold",
                          )}
                          onClick={() => {
                            if (isSelected) {
                              setNewRfq({
                                ...newRfq,
                                inquiryId: "",
                                customerId: "",
                                customerName: "",
                                customerCode: "",
                                customerType: "",
                                assignedBy: defaultInitiator,
                              });
                              setInquirySearch("");
                            } else {
                              setNewRfq({
                                ...newRfq,
                                inquiryId: inq.id,
                                customerId: matchedClient?.id || inq.customerId || "",
                                customerName: inq.customerName ?? matchedClient?.companyName ?? newRfq.customerName,
                                customerCode: matchedClient?.customerCode || newRfq.customerCode || "",
                                customerType: matchedClient?.customerType,
                                productName: firstLine?.productName ?? newRfq.productName,
                                dosageForm: firstLine?.dosageForm ?? newRfq.dosageForm,
                                dosageVariant: firstLine?.dosageVariant ?? newRfq.dosageVariant,
                                pharmacopeia: firstLine?.pharmacopeia ?? newRfq.pharmacopeia,
                                standard: firstLine?.pharmacopeia ?? newRfq.standard,
                                assignedBy: inq.salesAssigneeName || inq.raisedByUserName || "Sales Team",
                              });
                              setInquirySearch("");
                            }
                            setInquiryDropdownOpen(false);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium font-mono text-xs">{inq.rfqNo}</span>
                            <span className="text-muted-foreground text-xs">{inq.customerName}</span>
                          </div>
                          {firstLine && (
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {firstLine.productName} · {firstLine.dosageForm}
                              {firstLine.strength ? ` · ${firstLine.strength}` : ""}
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {newRfq.inquiryId && (
              <p className="text-xs text-primary font-medium flex items-center gap-1.5 pt-0.5">
                <CheckCircle2 className="size-3.5" /> Linked to Sales Inquiry ID: {newRfq.inquiryId}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={newRfq.productName}
                onChange={(e) => setNewRfq({ ...newRfq, productName: e.target.value })}
                placeholder="e.g. Paracetamol & Ibuprofen Tablets"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandName">Brand / Trade Name</Label>
              <Input
                id="brandName"
                value={newRfq.brandName}
                onChange={(e) => setNewRfq({ ...newRfq, brandName: e.target.value })}
                placeholder="e.g. Nourish-ParaPlus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Therapeutic Category</Label>
              <Input
                id="category"
                value={newRfq.category}
                onChange={(e) => setNewRfq({ ...newRfq, category: e.target.value })}
                placeholder="e.g. Analgesics & Antipyretics"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosageForm">Dosage Form (Level 1)</Label>
              <Select
                value={newRfq.dosageForm}
                onValueChange={(val) => setNewRfq({ ...newRfq, dosageForm: val })}
              >
                <SelectTrigger id="dosageForm">
                  <SelectValue placeholder="Select dosage form" />
                </SelectTrigger>
                <SelectContent>
                  {DOSAGE_FORMS.map((df) => (
                    <SelectItem key={df} value={df}>
                      {df}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="standard">Pharmacopeia Standard</Label>
              <Select
                value={newRfq.standard}
                onValueChange={(val) => setNewRfq({ ...newRfq, standard: val, pharmacopeia: val })}
              >
                <SelectTrigger id="standard">
                  <SelectValue placeholder="Select standard" />
                </SelectTrigger>
                <SelectContent>
                  {PHARMACOPEIAS.map((ph) => (
                    <SelectItem key={ph} value={ph}>
                      {ph}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select
                value={newRfq.priority}
                onValueChange={(val) => setNewRfq({ ...newRfq, priority: val as QaPriority })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QA_PRIORITY_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        <Separator />

        {/* ── Section 2: Manufacturing & Commercial Packaging Scope ── */}
        <FormSection
          title="Target Batch & Commercial Packaging Scope"
          description="Specify commercial order quantity and packaging specifications. Total tablet batch size will calculate automatically."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderQty">Order Quantity (Commercial Packs) *</Label>
              <Input
                id="orderQty"
                type="number"
                value={newRfq.orderQty}
                onChange={(e) => {
                  const qty = Number(e.target.value);
                  const specs = newRfq.packingSpecs || "10x1x10";
                  const parts = specs.toLowerCase().split(/[x*]/);
                  let mult = 1;
                  for (const p of parts) {
                    const val = parseFloat(p.replace(/[^0-9.]/g, ""));
                    if (!isNaN(val) && val > 0) mult *= val;
                  }
                  const total = Math.round(qty * mult);
                  setNewRfq({ ...newRfq, orderQty: qty, totalTablets: total, targetBatchSize: total });
                }}
                placeholder="12000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="packingSpecs">Packing Specs (e.g. 10x1x10)</Label>
              <Input
                id="packingSpecs"
                value={newRfq.packingSpecs || ""}
                onChange={(e) => {
                  const specs = e.target.value;
                  const qty = Number(newRfq.orderQty) || 0;
                  const parts = specs.toLowerCase().split(/[x*]/);
                  let mult = 1;
                  for (const p of parts) {
                    const val = parseFloat(p.replace(/[^0-9.]/g, ""));
                    if (!isNaN(val) && val > 0) mult *= val;
                  }
                  const total = Math.round(qty * mult);
                  setNewRfq({ ...newRfq, packingSpecs: specs, totalTablets: total, targetBatchSize: total });
                }}
                placeholder="10x1x10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetBatchSize">
                Total Tablet Batch Size <span className="text-primary font-mono text-xs">(= Order Qty × Specs)</span>
              </Label>
              <Input
                id="targetBatchSize"
                type="number"
                value={newRfq.targetBatchSize}
                onChange={(e) => setNewRfq({ ...newRfq, targetBatchSize: Number(e.target.value), totalTablets: Number(e.target.value) })}
                className="font-mono font-bold text-primary"
                placeholder="1200000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="batchUnit">Batch Unit</Label>
              <Input
                id="batchUnit"
                value={newRfq.batchUnit}
                onChange={(e) => setNewRfq({ ...newRfq, batchUnit: e.target.value })}
                placeholder="e.g. Tablets, Capsules, Litres"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="assignedBy">Assigned By (Initiator / Team)</Label>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Read-Only
                </span>
              </div>
              <Input
                id="assignedBy"
                value={newRfq.assignedBy || defaultInitiator}
                readOnly
                disabled
                tabIndex={-1}
                className="bg-muted/60 text-muted-foreground cursor-not-allowed select-none border-border/70 font-medium"
              />
              <p className="text-[11px] text-muted-foreground">
                Auto-assigned by originating sales inquiry or initiator session.
              </p>
            </div>
          </div>
        </FormSection>

        <Separator />

        {/* ── Section 3: Commercial Client & Timeline ── */}
        <FormSection
          title="Client Details & Timeline"
          description="Map to existing client accounts, specify target QA evaluation delivery date, and technical remarks."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client / Customer Name Dropdown Combobox */}
            <div className="space-y-2">
              <Label htmlFor="customerName">Client / Customer Name</Label>
              <Popover open={clientDropdownOpen} onOpenChange={setClientDropdownOpen}>
                <PopoverTrigger asChild>
                  <div
                    role="combobox"
                    aria-expanded={clientDropdownOpen}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-muted/40 transition-colors",
                      !newRfq.customerName && "text-muted-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Building2 className="size-4 shrink-0 text-muted-foreground" />
                      {newRfq.customerName ? (
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-semibold text-foreground truncate">
                            {newRfq.customerName}
                          </span>
                          {newRfq.customerType && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase font-mono">
                              {CUSTOMER_TYPE_LABELS[newRfq.customerType as keyof typeof CUSTOMER_TYPE_LABELS] || newRfq.customerType}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="truncate">Select or search client...</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {newRfq.customerName && (
                        <span
                          role="button"
                          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewRfq({
                              ...newRfq,
                              customerId: "",
                              customerName: "",
                              customerCode: "",
                              customerType: "",
                            });
                            setClientSearch("");
                          }}
                          title="Clear client"
                        >
                          <X className="size-3.5" />
                        </span>
                      )}
                      <ChevronDown className="size-4 opacity-50" />
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[min(var(--radix-popover-trigger-width),calc(100vw-2rem))] max-w-[640px] p-0 shadow-lg border"
                  align="start"
                >
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Type client name, code, or type..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-8 h-8 text-xs"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-border/40">
                    {filteredClients.length === 0 ? (
                      <div className="p-4 text-center space-y-2">
                        <p className="text-xs text-muted-foreground">No matching clients found</p>
                        {clientSearch.trim() && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="text-xs h-7"
                            onClick={() => {
                              setNewRfq({
                                ...newRfq,
                                customerId: "",
                                customerName: clientSearch.trim(),
                                customerCode: "",
                                customerType: "",
                              });
                              setClientDropdownOpen(false);
                            }}
                          >
                            Use custom: &quot;{clientSearch.trim()}&quot;
                          </Button>
                        )}
                      </div>
                    ) : (
                      filteredClients.map((client) => {
                        const isSelected =
                          newRfq.customerId === client.id ||
                          newRfq.customerName === client.companyName;
                        return (
                          <button
                            key={client.id}
                            type="button"
                            className={cn(
                              "w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted/80 transition-colors cursor-pointer space-y-0.5",
                              isSelected && "bg-primary/10 text-primary font-semibold",
                            )}
                            onClick={() => {
                              if (isSelected) {
                                setNewRfq({
                                  ...newRfq,
                                  customerId: "",
                                  customerName: "",
                                  customerCode: "",
                                  customerType: "",
                                });
                                setClientSearch("");
                              } else {
                                setNewRfq({
                                  ...newRfq,
                                  customerId: client.id,
                                  customerName: client.companyName,
                                  customerCode: client.customerCode,
                                  customerType: client.customerType,
                                });
                                setClientSearch("");
                              }
                              setClientDropdownOpen(false);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-foreground text-sm truncate">
                                {client.companyName}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="outline" className="font-mono text-[11px] font-semibold text-primary">
                                  {client.customerCode}
                                </Badge>
                                {client.customerType && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                    {CUSTOMER_TYPE_LABELS[client.customerType] || client.customerType}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {client.tradeName && (
                              <p className="text-xs text-muted-foreground truncate">
                                Trade: {client.tradeName}
                              </p>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Client Code / Customer ID (Automatically Fetched) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="customerCode">Client Code (if existing)</Label>
                {newRfq.customerCode && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Auto-fetched from Client Master
                  </span>
                )}
              </div>
              <Input
                id="customerCode"
                value={newRfq.customerCode || ""}
                onChange={(e) => setNewRfq({ ...newRfq, customerCode: e.target.value })}
                placeholder="e.g. CUST-000045"
                className="font-mono bg-muted/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Target Technical Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newRfq.dueDate}
                onChange={(e) => setNewRfq({ ...newRfq, dueDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Technical Remarks / Notes</Label>
              <Input
                id="remarks"
                value={newRfq.remarks}
                onChange={(e) => setNewRfq({ ...newRfq, remarks: e.target.value })}
                placeholder="e.g. Special stability study required, moisture-sensitive API"
              />
            </div>
          </div>
        </FormSection>
      </EntityFormPage>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        eyebrow="Quality Assurance & Technical"
        title="QA / RFQ / MFR System"
        description="Formulation workbench, master formula records, and automated matching."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <Button className="gap-2 shadow-sm" onClick={() => setNewRfqModalOpen(true)}>
              <Plus className="size-4" /> New QA RFQ
            </Button>
          </div>
        }
      />

      {/* ── Metrics Cards (Responsive on Mobile, Tablet & Desktop) ── */}
      <MetricGrid columns={6} label="QA task summary">
        <MetricCard
          compact
          icon={Clock}
          label="Formula pending"
          value={kpis?.pendingFormulaCount ?? 0}
          detail="Awaiting formulation"
          tone="warning"
        />
        <MetricCard
          compact
          icon={Sliders}
          label="Specification pending"
          value={kpis?.specPendingCount ?? 0}
          detail="Specification work"
          tone="info"
        />
        <MetricCard
          compact
          icon={CheckCircle2}
          label="Completed today"
          value={kpis?.completedTodayCount ?? 0}
          detail="Finished today"
          tone="success"
        />
        <MetricCard
          compact
          icon={AlertCircle}
          label="My pending tasks"
          value={
            kpis?.myPendingTasksCount ??
            (kpis?.pendingFormulaCount ?? 0) + (kpis?.specPendingCount ?? 0)
          }
          detail="Assigned workload"
          tone="primary"
        />
        <MetricCard
          compact
          icon={AlertTriangle}
          label="Overdue tasks"
          value={kpis?.overdueTasksCount ?? 0}
          detail="Past the due date"
          tone="danger"
        />
        <MetricCard
          compact
          icon={HelpCircle}
          label="Technical queries"
          value={kpis?.openQueriesCount ?? 0}
          detail="Open clarifications"
          tone="violet"
        />
      </MetricGrid>

      {/* ── Universal Search & Filters (Standardized from RFQ Module) ── */}
      <UniversalFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(0);
        }}
        searchPlaceholder="Search RFQ number, product, customer, or standard..."
        hasActiveFilters={Boolean(
          search || statusFilter !== "all" || priorityFilter !== "all" || dosageFilter !== "all"
        )}
        onReset={() => {
          setSearch("");
          setStatusFilter("all");
          setPriorityFilter("all");
          setDosageFilter("all");
          setPage(0);
        }}
        filterColumns={3}
      >
        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setPage(0);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(QA_RFQ_STATUS_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={priorityFilter}
          onValueChange={(val) => {
            setPriorityFilter(val);
            setPage(0);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {Object.entries(QA_PRIORITY_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Dosage Form Filter */}
        <Select
          value={dosageFilter}
          onValueChange={(val) => {
            setDosageFilter(val);
            setPage(0);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All dosage forms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dosage forms</SelectItem>
            {DOSAGE_FORMS.map((df) => (
              <SelectItem key={df} value={df}>
                {df}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </UniversalFilterBar>

      {/* Table / Grid Content */}
      {viewMode === "list" ? (
        <Panel className="overflow-hidden p-0">
          {/* Specification Task List Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-border/70 bg-muted/20 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm text-foreground">Task List</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                Double click to open Specific RFQ
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              <Counter key={totalElements} value={totalElements} /> total RFQs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  <th className="py-3 px-4 w-28">Date</th>
                  <th className="py-3 px-4">RFQ No</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Assigned By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rfqsLoading && !rfqsPage ? (
                  <TableRowLoader colSpan={7} rows={pageSize || 6} />
                ) : rfqList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12">
                      <EmptyState
                        icon={<FlaskConical className="size-6 text-muted-foreground" />}
                        title="No QA RFQs found"
                        description={
                          search || statusFilter !== "all" || priorityFilter !== "all" || dosageFilter !== "all"
                            ? "No QA RFQs match your search and filter criteria."
                            : "Create a new QA RFQ to begin formulating active compositions, change parts, and MFRs."
                        }
                        action={
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNewRfqModalOpen(true)}
                            className="gap-2 mt-2"
                          >
                            <Plus className="size-4" /> Create First RFQ
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  rfqList.map((rfq) => {
                    const statusColor = QA_RFQ_STATUS_COLORS[rfq.status] ?? QA_RFQ_STATUS_COLORS.FORMULA_PENDING;
                    const priorityColor = QA_PRIORITY_COLORS[rfq.priority] ?? QA_PRIORITY_COLORS.MEDIUM;
                    const displayDate = rfq.createdDate || (rfq.createdOn ? rfq.createdOn.slice(0, 10) : "Today");

                    return (
                      <tr
                        key={rfq.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() =>
                          navigate({ to: "/qa/rfq/$rfqId", params: { rfqId: rfq.id } })
                        }
                        onDoubleClick={() =>
                          navigate({ to: "/qa/rfq/$rfqId", params: { rfqId: rfq.id } })
                        }
                        title="Double click to open Specific RFQ"
                      >
                        <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {displayDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-medium text-xs text-primary">
                            {rfq.sourceRfqNo || rfq.rfqNo}
                          </div>
                          {rfq.sourceRfqNo && (
                            <div className="font-mono text-[10px] text-muted-foreground">
                              QA task {rfq.rfqNo}
                            </div>
                          )}
                          <div className="font-medium text-foreground text-xs mt-0.5 truncate max-w-[220px]">
                            {rfq.productName}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {rfq.dosageForm} {rfq.standard ? `(${rfq.standard})` : ""}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-foreground font-medium text-xs">
                            {rfq.customerName || "—"}
                          </div>
                          {rfq.customerCode && (
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {rfq.customerCode}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-medium text-foreground">
                            {rfq.assignedBy || "Sales Team"}
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium mt-0.5",
                              priorityColor.bg
                            )}
                          >
                            {QA_PRIORITY_LABELS[rfq.priority]}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                              statusColor.bg,
                              statusColor.text,
                              statusColor.border
                            )}
                          >
                            {QA_RFQ_STATUS_LABELS[rfq.status]}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {rfq.dueDate ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="size-3.5" />
                              {rfq.dueDate}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Run MFR Matcher"
                              className="h-8 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => setMatchModalRfq(rfq)}
                            >
                              <Sparkles className="size-3.5" /> Match MFR
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Open RFQ Workbench"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                navigate({ to: "/qa/rfq/$rfqId", params: { rfqId: rfq.id } })
                              }
                            >
                              <ArrowRight className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete RFQ"
                              className="size-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                setDeleteConfirm({ id: rfq.id, rfqNo: rfq.rfqNo })
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : rfqsLoading && !rfqsPage ? (
        <CardGridLoader cards={pageSize || 6} />
      ) : rfqList.length === 0 ? (
        <Panel className="py-12">
          <EmptyState
            icon={<FlaskConical className="size-6 text-muted-foreground" />}
            title="No QA RFQs found"
            description={
              search || statusFilter !== "all" || priorityFilter !== "all" || dosageFilter !== "all"
                ? "No QA RFQs match your search and filter criteria."
                : "Create a new QA RFQ to begin formulating active compositions, change parts, and MFRs."
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewRfqModalOpen(true)}
                className="gap-2 mt-2"
              >
                <Plus className="size-4" /> Create First RFQ
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rfqList.map((rfq) => {
            const statusColor = QA_RFQ_STATUS_COLORS[rfq.status] ?? QA_RFQ_STATUS_COLORS.FORMULA_PENDING;
            const priorityColor = QA_PRIORITY_COLORS[rfq.priority] ?? QA_PRIORITY_COLORS.MEDIUM;

            return (
              <Panel
                key={rfq.id}
                className="hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between"
                onClick={() =>
                  navigate({ to: "/qa/rfq/$rfqId", params: { rfqId: rfq.id } })
                }
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {rfq.sourceRfqNo || rfq.rfqNo}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                        statusColor.bg,
                        statusColor.text,
                        statusColor.border
                      )}
                    >
                      {QA_RFQ_STATUS_LABELS[rfq.status]}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground text-base line-clamp-1">
                      {rfq.productName}
                    </h4>
                    {rfq.customerName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Building2 className="size-3.5 shrink-0" />
                        {rfq.customerName}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="outline" className="text-xs">
                      {rfq.dosageForm}
                    </Badge>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                        priorityColor.bg
                      )}
                    >
                      {QA_PRIORITY_LABELS[rfq.priority]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-4 text-xs text-muted-foreground">
                  <span>
                    {rfq.compositionLines?.length ?? 0} API(s)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 gap-1 text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMatchModalRfq(rfq);
                      }}
                    >
                      <Sparkles className="size-3" /> Match
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({ to: "/qa/rfq/$rfqId", params: { rfqId: rfq.id } });
                      }}
                    >
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
        />
      )}


      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirm)}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete QA RFQ</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete RFQ {deleteConfirm?.rfqNo}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete RFQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MFR Matcher Modal (Universal UI Layout) */}
      <Dialog
        open={Boolean(matchModalRfq)}
        onOpenChange={(open) => !open && setMatchModalRfq(null)}
      >
        <DialogContent className="max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0 sm:w-[94vw] sm:max-w-4xl sm:max-h-[88vh] sm:rounded-2xl flex flex-col p-0 overflow-hidden shadow-2xl">
          {/* Fixed Header */}
          <DialogHeader className="px-4 sm:px-6 py-3.5 sm:py-4 shrink-0 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base font-semibold text-foreground">
                    MFR Matching Engine
                  </DialogTitle>
                  <span className="font-mono text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-md bg-muted border border-border/60">
                    {matchModalRfq?.rfqNo}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Ranked formulation matches from master product catalogue and approved MFRs based on active APIs, dosage form, and pharmacopeial standard.
                </DialogDescription>
              </div>
            </div>

            {/* Target RFQ Context Bar */}
            {matchModalRfq && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border/60 bg-background/70 px-3.5 py-2 text-xs">
                <span className="text-muted-foreground font-medium">Target RFQ:</span>
                <span className="font-semibold text-foreground truncate max-w-[280px]">
                  {matchModalRfq.productName || matchModalRfq.brandName}
                </span>
                {matchModalRfq.dosageForm && (
                  <span className="text-muted-foreground">
                    • <span className="font-medium text-foreground">{matchModalRfq.dosageForm}</span>
                  </span>
                )}
                {(matchModalRfq.standard || matchModalRfq.pharmacopeia) && (
                  <span className="text-muted-foreground">
                    • Standard: <span className="font-medium text-foreground">{matchModalRfq.standard || matchModalRfq.pharmacopeia}</span>
                  </span>
                )}
                {matchModalRfq.compositionLines && (
                  <span className="text-muted-foreground sm:ml-auto">
                    Composition: <strong className="text-foreground">{matchModalRfq.compositionLines.length}</strong> {matchModalRfq.compositionLines.length === 1 ? "API" : "APIs"} configured
                  </span>
                )}
              </div>
            )}
          </DialogHeader>

          {/* Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3.5 sm:py-4 space-y-3">
            {matchesLoading ? (
              <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2.5">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span>Running formula similarity matching algorithm...</span>
              </div>
            ) : matches.length === 0 ? (
              <div className="p-10 text-center border rounded-xl bg-muted/20 space-y-2">
                <p className="text-sm font-semibold text-foreground">No matching formulations found</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  No existing product or MFR scored above the similarity threshold (15%). You can configure active ingredients in the RFQ detail page to improve matching, or create a new MFR manually.
                </p>
                {matchModalRfq && (
                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const targetId = matchModalRfq.id;
                        setMatchModalRfq(null);
                        navigate({ to: "/qa/rfq/$rfqId", params: { rfqId: targetId } });
                      }}
                    >
                      Open RFQ Specification Workbench <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              matches.map((match) => {
                const isProduct = match.targetType === "PRODUCT";
                const formattedCode = isProduct
                  ? (/^[0-9a-fA-F]{24}$/.test(match.targetCode)
                      ? `PRD-${match.targetCode.slice(-6).toUpperCase()}`
                      : match.targetCode || "PRODUCT")
                  : (match.targetCode || "MFR");

                const isHighMatch = match.totalScore >= 75;
                const isMedMatch = match.totalScore >= 45;

                return (
                  <div
                    key={`${match.targetType}-${match.targetId}`}
                    className="p-4 rounded-xl border border-border/70 hover:border-border transition-colors bg-card shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] font-medium tracking-wide",
                              isProduct
                                ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25"
                                : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25"
                            )}
                          >
                            {isProduct ? "Product Dossier" : "Approved MFR"}
                          </Badge>
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {formattedCode}
                          </span>
                          {match.dosageForm && (
                            <Badge variant="secondary" className="text-[11px] font-normal text-muted-foreground">
                              {match.dosageForm}
                              {match.dosageVariant ? ` (${match.dosageVariant})` : ""}
                            </Badge>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-semibold text-foreground leading-snug">
                          {match.targetName}
                        </h4>

                        {/* Composition */}
                        {match.composition && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/80">Composition: </span>
                            {match.composition}
                          </p>
                        )}
                      </div>

                      {/* Similarity & Clone Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2.5 shrink-0 pt-1 sm:pt-0">
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[11px] text-muted-foreground mr-1.5">Similarity</span>
                            <span
                              className={cn(
                                "font-bold text-sm",
                                isHighMatch
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : isMedMatch
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              )}
                            >
                              <Counter key={match.totalScore} value={match.totalScore} suffix="%" />
                            </span>
                          </div>
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                isHighMatch
                                  ? "bg-emerald-500"
                                  : isMedMatch
                                  ? "bg-primary"
                                  : "bg-muted-foreground/40"
                              )}
                              style={{ width: `${Math.min(match.totalScore, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs"
                            onClick={() => {
                              const targetId = matchModalRfq!.id;
                              setMatchModalRfq(null);
                              navigate({
                                to: "/qa/rfq/$rfqId",
                                params: { rfqId: targetId },
                              });
                            }}
                          >
                            RFQ <ArrowRight className="size-3 ml-1" />
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs gap-1.5 shadow-sm"
                            onClick={() =>
                              cloneMfrMutation.mutate({ match, rfqId: matchModalRfq!.id })
                            }
                            disabled={cloneMfrMutation.isPending}
                          >
                            {cloneMfrMutation.isPending ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="size-3.5" />
                            )}
                            Clone Formula
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Score factors breakdown */}
                    <div className="pt-2.5 border-t border-border/50 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-muted-foreground mr-1">Match Factors:</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded border text-[11px]",
                          match.productNameScore > 0
                            ? "bg-muted/60 text-foreground border-border/70"
                            : "text-muted-foreground/60 border-transparent"
                        )}
                      >
                        Name: {match.productNameScore > 0 ? `${match.productNameScore} pts` : "0"}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded border text-[11px]",
                          match.compositionScore > 0
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 font-medium"
                            : "text-muted-foreground/60 border-transparent"
                        )}
                      >
                        APIs: {match.compositionScore > 0 ? `${match.compositionScore} pts` : "None"}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded border text-[11px]",
                          match.strengthScore > 0
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 font-medium"
                            : "text-muted-foreground/60 border-transparent"
                        )}
                      >
                        Strength: {match.strengthScore > 0 ? `${match.strengthScore} pts` : "Differs"}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded border text-[11px]",
                          match.dosageFormScore > 0
                            ? "bg-muted/60 text-foreground border-border/70"
                            : "text-muted-foreground/60 border-transparent"
                        )}
                      >
                        Dosage Form: {match.dosageFormScore > 0 ? "Matched" : "Differs"}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded border text-[11px]",
                          match.standardScore >= 5
                            ? "bg-muted/60 text-foreground border-border/70"
                            : "text-muted-foreground/60 border-transparent"
                        )}
                      >
                        Standard: {match.standardScore >= 5 ? "Matched" : "Baseline"}
                      </span>

                      {match.matchedIngredients && match.matchedIngredients.length > 0 && (
                        <span className="sm:ml-auto text-emerald-600 dark:text-emerald-400 font-medium">
                          Matched APIs: {match.matchedIngredients.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="px-4 sm:px-6 py-2.5 sm:py-3 shrink-0 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-2 sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Showing {matches.length} {matches.length === 1 ? "match" : "matches"} ranked by formula similarity
            </div>
            <Button variant="outline" size="sm" onClick={() => setMatchModalRfq(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
