import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FlaskConical,
  Plus,
  Trash2,
  Save,
  Sparkles,
  ArrowLeft,
  Calendar,
  Building2,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sliders,
  ChevronLeft,
  Scale,
  Layers,
  Pill,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader, Panel, Counter, EmptyState } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchQaRfqById,
  updateQaRfq,
  fetchMfrMatches,
  createMfrFromRfq,
  cloneMfr,
  raiseQaQuery,
  fetchQueriesByRfq,
  resolveQaQuery,
} from "@/lib/qa-api";
import {
  QA_RFQ_STATUS_LABELS,
  QA_RFQ_STATUS_COLORS,
  QA_PRIORITY_LABELS,
  QA_PRIORITY_COLORS,
  DOSAGE_FORMS,
  PHARMACOPEIAS,
  STRENGTH_UNITS,
  BATCH_UNITS,
  type QaRfq,
  type QaCompositionLine,
  type QaChangeParts,
  type QaRfqStatus,
  type QaPriority,
  type MfrMatchResult,
} from "@/lib/qa-types";

export const Route = createFileRoute("/_shell/qa_/rfq_/$rfqId")({
  head: () => ({
    meta: [{ title: "QA RFQ Composition Builder · Nourish ERP" }],
  }),
  component: QaRfqDetailPage,
});

function QaRfqDetailPage() {
  const { rfqId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries
  const { data: rfq, isLoading, isError } = useQuery({
    queryKey: ["qa-rfqs", rfqId],
    queryFn: () => fetchQaRfqById(rfqId),
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["qa-matches", rfqId],
    queryFn: () => fetchMfrMatches(rfqId),
    enabled: Boolean(rfqId),
  });

  const { data: queries = [] } = useQuery({
    queryKey: ["qa-queries", rfqId],
    queryFn: () => fetchQueriesByRfq(rfqId),
    enabled: Boolean(rfqId),
  });

  // Local Form State
  const [compositionLines, setCompositionLines] = useState<QaCompositionLine[]>([]);
  const [changeParts, setChangeParts] = useState<QaChangeParts>({});
  const [status, setStatus] = useState<QaRfqStatus>("FORMULA_PENDING");
  const [priority, setPriority] = useState<QaPriority>("MEDIUM");
  const [orderQty, setOrderQty] = useState<number>(12000);
  const [packingSpecs, setPackingSpecs] = useState<string>("10x1x10");
  const [totalTablets, setTotalTablets] = useState<number>(1200000);
  const [targetBatchSize, setTargetBatchSize] = useState<number>(1200000);
  const [batchUnit, setBatchUnit] = useState<string>("Tablets");
  const [assignedBy, setAssignedBy] = useState<string>("Sales Team");
  const [remarks, setRemarks] = useState<string>("");

  // Modals
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [queryModalOpen, setQueryModalOpen] = useState(false);
  const [cpUploadModalOpen, setCpUploadModalOpen] = useState(false);
  const [newQuerySubject, setNewQuerySubject] = useState("");
  const [newQueryText, setNewQueryText] = useState("");
  const [resolveQueryId, setResolveQueryId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  const calculateTotalTablets = (qty: number, specs: string) => {
    if (!qty || !specs) return qty || 0;
    const parts = specs.toLowerCase().split(/[x*]/);
    let mult = 1;
    for (const p of parts) {
      const val = parseFloat(p.replace(/[^0-9.]/g, ""));
      if (!isNaN(val) && val > 0) mult *= val;
    }
    return Math.round(qty * mult);
  };

  const handleOrderQtyChange = (qty: number) => {
    setOrderQty(qty);
    const total = calculateTotalTablets(qty, packingSpecs);
    setTotalTablets(total);
    setTargetBatchSize(total);
  };

  const handlePackingSpecsChange = (specs: string) => {
    setPackingSpecs(specs);
    const total = calculateTotalTablets(orderQty, specs);
    setTotalTablets(total);
    setTargetBatchSize(total);
  };

  // Sync state when RFQ loads
  useEffect(() => {
    if (rfq) {
      setCompositionLines(rfq.compositionLines || []);
      setChangeParts(rfq.changeParts || {});
      setStatus(rfq.status);
      setPriority(rfq.priority);
      const oQty = rfq.orderQty ?? 12000;
      const pSpecs = rfq.packingSpecs || "10x1x10";
      const total = rfq.totalTablets || rfq.targetBatchSize || 1200000;
      setOrderQty(oQty);
      setPackingSpecs(pSpecs);
      setTotalTablets(total);
      setTargetBatchSize(total);
      setBatchUnit(rfq.batchUnit || "Tablets");
      setAssignedBy(rfq.assignedBy || "Sales Team");
      setRemarks(rfq.remarks || "");
    }
  }, [rfq]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: () =>
      updateQaRfq(rfqId, {
        inquiryId: rfq!.inquiryId,
        customerId: rfq!.customerId,
        customerName: rfq!.customerName,
        customerCode: rfq!.customerCode,
        customerType: rfq!.customerType,
        productName: rfq!.productName,
        brandName: rfq!.brandName,
        dosageForm: rfq!.dosageForm,
        dosageVariant: rfq!.dosageVariant,
        category: rfq!.category,
        pharmacopeia: rfq!.pharmacopeia,
        standard: rfq!.standard,
        status,
        priority,
        orderQty,
        packingSpecs,
        totalTablets,
        targetBatchSize,
        batchUnit,
        assignedToId: rfq!.assignedToId,
        assignedToName: rfq!.assignedToName,
        assignedBy,
        dueDate: rfq!.dueDate,
        createdDate: rfq!.createdDate,
        packagingSpec: rfq!.packagingSpec,
        remarks,
        compositionLines,
        changeParts,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa-rfqs", rfqId] });
      queryClient.invalidateQueries({ queryKey: ["qa-rfqs"] });
      queryClient.invalidateQueries({ queryKey: ["qa-matches", rfqId] });
      toast.success("RFQ updated successfully");
    },
    onError: (err: Error) => {
      toast.error(`Failed to update RFQ: ${err.message}`);
    },
  });

  const createMfrMutation = useMutation({
    mutationFn: () => createMfrFromRfq(rfqId, targetBatchSize, batchUnit),
    onSuccess: (mfr) => {
      queryClient.invalidateQueries({ queryKey: ["qa-rfqs", rfqId] });
      toast.success(`MFR ${mfr.mfrNo} created from RFQ!`);
      navigate({ to: "/qa/mfr/$mfrId", params: { mfrId: mfr.id } });
    },
    onError: (err: Error) => {
      toast.error(`Failed to create MFR: ${err.message}`);
    },
  });

  const cloneMfrMutation = useMutation({
    mutationFn: (match: MfrMatchResult) =>
      cloneMfr(match.targetType, match.targetId, rfqId),
    onSuccess: (mfr) => {
      queryClient.invalidateQueries({ queryKey: ["qa-rfqs", rfqId] });
      toast.success(`Cloned formula into ${mfr.mfrNo}!`);
      setMatchModalOpen(false);
      navigate({ to: "/qa/mfr/$mfrId", params: { mfrId: mfr.id } });
    },
    onError: (err: Error) => {
      toast.error(`Failed to clone formula: ${err.message}`);
    },
  });

  const raiseQueryMutation = useMutation({
    mutationFn: () =>
      raiseQaQuery({
        rfqId,
        rfqNo: rfq?.rfqNo,
        subject: newQuerySubject,
        queryText: newQueryText,
        raisedBy: "QA Team",
        raisedTo: "Sales & Regulatory",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa-queries", rfqId] });
      queryClient.invalidateQueries({ queryKey: ["qa-rfqs", rfqId] });
      toast.success("Technical query raised");
      setQueryModalOpen(false);
      setNewQuerySubject("");
      setNewQueryText("");
    },
    onError: (err: Error) => {
      toast.error(`Failed to raise query: ${err.message}`);
    },
  });

  const resolveQueryMutation = useMutation({
    mutationFn: () => resolveQaQuery(resolveQueryId!, responseText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa-queries", rfqId] });
      queryClient.invalidateQueries({ queryKey: ["qa-rfqs", rfqId] });
      toast.success("Query marked as resolved");
      setResolveQueryId(null);
      setResponseText("");
    },
    onError: (err: Error) => {
      toast.error(`Failed to resolve query: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground text-sm">
        Loading RFQ details...
      </div>
    );
  }

  if (isError || !rfq) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-muted-foreground">RFQ not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/qa" })}>
          <ChevronLeft className="size-4 mr-1" /> Back to QA Pipeline
        </Button>
      </div>
    );
  }

  // Active Composition Line Handlers with Live Overage Calculation
  const handleAddLine = () => {
    setCompositionLines([
      ...compositionLines,
      {
        api: "",
        labelClaim: 100,
        claimUnit: "mg",
        overagePercent: 0,
        overagedQty: 100,
        reasonForOverage: "Standard assay stability",
        pharmacopeia: rfq.standard || "IP",
        functionCategory: "Active Pharmaceutical Ingredient",
      },
    ]);
  };

  const handleUpdateLine = (index: number, updates: Partial<QaCompositionLine>) => {
    const updated = [...compositionLines];
    const current: QaCompositionLine = { ...updated[index], ...updates };

    // Live recalculation: Overaged Qty = Label Claim * (1 + Overage% / 100)
    const claim = Number(current.labelClaim) || 0;
    const overage = Number(current.overagePercent) || 0;
    current.overagedQty = Number((claim * (1 + overage / 100)).toFixed(4));

    updated[index] = current;
    setCompositionLines(updated);
  };

  const handleRemoveLine = (index: number) => {
    setCompositionLines(compositionLines.filter((_, i) => i !== index));
  };

  const statusColor = QA_RFQ_STATUS_COLORS[status] ?? QA_RFQ_STATUS_COLORS.FORMULA_PENDING;
  const isTablet = rfq.dosageForm?.toLowerCase().includes("tab");
  const isCapsule = rfq.dosageForm?.toLowerCase().includes("cap");
  const isLiquid = rfq.dosageForm?.toLowerCase().includes("syr") || rfq.dosageForm?.toLowerCase().includes("susp") || rfq.dosageForm?.toLowerCase().includes("liquid");
  const isTopical = rfq.dosageForm?.toLowerCase().includes("oint") || rfq.dosageForm?.toLowerCase().includes("cream");

  return (
    <div className="space-y-6 pb-16">
      <div>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/qa" })}>
          <ChevronLeft className="size-4 mr-1" /> Back to QA
        </Button>
      </div>

      {/* Page Header */}
      <PageHeader
        eyebrow={`RFQ Specification Workbench · ${rfq.sourceRfqNo || rfq.rfqNo}`}
        title={rfq.productName}
        description={`${rfq.dosageForm} ${rfq.standard ? `(${rfq.standard})` : ""} · ${rfq.category || "General Pharma"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setMatchModalOpen(true)}
            >
              <Sparkles className="size-3.5 text-muted-foreground" /> Match MFR ({matches.length})
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setQueryModalOpen(true)}
            >
              <HelpCircle className="size-3.5 text-muted-foreground" /> Raise Query ({queries.length})
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => createMfrMutation.mutate()}
              disabled={createMfrMutation.isPending}
            >
              <FileSpreadsheet className="size-3.5" />
              {createMfrMutation.isPending ? "Generating..." : "Create MFR"}
            </Button>

            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              <Save className="size-3.5" />
              {updateMutation.isPending ? "Saving..." : "Save RFQ"}
            </Button>
          </div>
        }
      />

      {/* Overview & Metadata Panel */}
      <Panel className="grid gap-3.5 sm:gap-4 p-4 sm:p-5 text-sm grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <div>
          <span className="text-xs text-muted-foreground block mb-1">Customer</span>
          <p className="font-medium text-foreground">{rfq.customerName || "Standard Internal"}</p>
          {rfq.customerCode && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{rfq.customerCode}</p>
          )}
        </div>

        <div>
          <span className="text-xs text-muted-foreground block mb-1">Assigned By</span>
          <p className="font-medium text-foreground">{rfq.assignedBy || "Sales Team"}</p>
          <span className="text-[11px] text-muted-foreground">Initiator / Sales</span>
        </div>

        <div>
          <span className="text-xs text-muted-foreground block mb-1">Due Date</span>
          <p className="font-medium text-foreground flex items-center gap-1.5">
            <Calendar className="size-3.5 text-muted-foreground" />
            {rfq.dueDate || "Not Specified"}
          </p>
        </div>

        <div>
          <span className="text-xs text-muted-foreground block mb-1">Priority</span>
          <Select
            value={priority}
            onValueChange={(val) => setPriority(val as QaPriority)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(QA_PRIORITY_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <span className="text-xs text-muted-foreground block mb-1">Status</span>
          <Select
            value={status}
            onValueChange={(val) => setStatus(val as QaRfqStatus)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(QA_RFQ_STATUS_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <span className="text-xs text-muted-foreground block mb-1">Target Batch Size</span>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              value={targetBatchSize}
              onChange={(e) => setTargetBatchSize(Number(e.target.value))}
              className="h-8 text-xs font-mono"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{batchUnit}</span>
          </div>
        </div>
      </Panel>

      {/* ── Complete Individual RFQ Specification Table ── */}
      <Panel className="p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border/60 gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              RFQ Order & Production Specification
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Target commercial scale, packaging configuration, and calculated total production units
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {rfq.sourceRfqNo || rfq.rfqNo}
            </Badge>
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => createMfrMutation.mutate()}
              disabled={createMfrMutation.isPending}
            >
              <FileSpreadsheet className="size-3.5" />
              {createMfrMutation.isPending ? "Generating..." : "Create MFR"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-3 px-4 w-14">Nos.</th>
                <th className="py-3 px-4">Product Composition</th>
                <th className="py-3 px-4 w-36">Order Qty</th>
                <th className="py-3 px-4 w-36">Packing Specs</th>
                <th className="py-3 px-4 min-w-[200px]">Total Production Units</th>
                <th className="py-3 px-4 text-right w-24">Query</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr>
                <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">1</td>
                <td className="py-3.5 px-4">
                  <div className="font-medium text-foreground text-sm">
                    {rfq.productName}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {compositionLines.length > 0
                      ? compositionLines.map((l) => `${l.api} ${l.labelClaim}${l.claimUnit} ${l.pharmacopeia}`).join(" + ")
                      : `${rfq.productName} ${rfq.dosageForm}`}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <Input
                    type="number"
                    value={orderQty}
                    onChange={(e) => handleOrderQtyChange(Number(e.target.value))}
                    className="h-8 text-xs font-mono w-28"
                    placeholder="12000"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <Input
                    value={packingSpecs}
                    onChange={(e) => handlePackingSpecsChange(e.target.value)}
                    className="h-8 text-xs font-mono w-28"
                    placeholder="10x1x10"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <div className="text-sm font-semibold text-foreground font-mono flex items-center gap-1">
                    <Counter key={totalTablets} value={totalTablets} decimals={0} />
                    <span className="font-sans font-semibold text-sm">
                      {isTablet ? "tablets" : isCapsule ? "capsules" : "units"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    = {orderQty.toLocaleString()} × {packingSpecs}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setQueryModalOpen(true)}
                  >
                    <HelpCircle className="size-3.5" /> Query
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Tabs: Composition, Change Parts, Queries */}
      <Tabs defaultValue="composition" className="space-y-4">
        <div className="surface overflow-hidden rounded-xl border border-border/70 p-1 sm:p-1.5 shadow-sm">
          <TabsList className="flex h-auto w-full flex-wrap sm:inline-flex sm:w-auto items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/40">
            <TabsTrigger
              value="composition"
              className="gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all"
            >
              <FlaskConical className="size-4 shrink-0 text-primary" />
              <span>Active Composition</span>
              <span className="ml-0.5 inline-flex items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold font-mono text-muted-foreground">
                {compositionLines.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="changeParts"
              className="gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all"
            >
              <Sliders className="size-4 shrink-0 text-muted-foreground" />
              <span>Change Parts & Tooling Specs</span>
            </TabsTrigger>
            <TabsTrigger
              value="queries"
              className="gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all"
            >
              <HelpCircle className="size-4 shrink-0 text-muted-foreground" />
              <span>Technical Queries</span>
              {queries.length > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[11px] font-semibold font-mono border border-amber-500/25">
                  {queries.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB 1: ACTIVE COMPOSITION WORKBENCH ─────────────────────────────── */}
        <TabsContent value="composition" className="space-y-4">
          <Panel>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Active Pharmaceutical Ingredients (API) & Overages
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Specify assay label claims, pharmacopeial standards, and stability overage adjustments.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                className="gap-1.5 text-xs"
              >
                <Plus className="size-3.5" /> Add Active Ingredient
              </Button>
            </div>

            {compositionLines.length === 0 ? (
              <EmptyState
                icon={<FlaskConical className="size-6 text-muted-foreground" />}
                title="No active ingredients added yet"
                description="Click 'Add Active Ingredient' to begin specifying the formulation assay and stability overages."
                action={
                  <Button variant="outline" size="sm" onClick={handleAddLine} className="gap-1.5">
                    <Plus className="size-3.5" /> Add First Ingredient
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="py-2.5 px-3">API Name *</th>
                      <th className="py-2.5 px-3 w-28">Claim</th>
                      <th className="py-2.5 px-3 w-24">Unit</th>
                      <th className="py-2.5 px-3 w-28">Overage %</th>
                      <th className="py-2.5 px-3 w-36">Overaged Qty</th>
                      <th className="py-2.5 px-3 w-28">Standard</th>
                      <th className="py-2.5 px-3">Reason for Overage</th>
                      <th className="py-2.5 px-3 text-right w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {compositionLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <Input
                            placeholder="e.g. Paracetamol"
                            value={line.api}
                            onChange={(e) =>
                              handleUpdateLine(idx, { api: e.target.value })
                            }
                            className="h-8 text-xs font-medium"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            step="any"
                            value={line.labelClaim}
                            onChange={(e) =>
                              handleUpdateLine(idx, { labelClaim: Number(e.target.value) })
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Select
                            value={line.claimUnit}
                            onValueChange={(val) =>
                              handleUpdateLine(idx, { claimUnit: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STRENGTH_UNITS.map((u) => (
                                <SelectItem key={u} value={u} className="text-xs">
                                  {u}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            step="any"
                            value={line.overagePercent}
                            onChange={(e) =>
                              handleUpdateLine(idx, {
                                overagePercent: Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-xs font-semibold text-foreground">
                          {line.overagedQty} {line.claimUnit}
                        </td>
                        <td className="py-2 px-3">
                          <Select
                            value={line.pharmacopeia}
                            onValueChange={(val) =>
                              handleUpdateLine(idx, { pharmacopeia: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PHARMACOPEIAS.map((p) => (
                                <SelectItem key={p} value={p} className="text-xs">
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            placeholder="Reason (e.g. degradation compensation)"
                            value={line.reasonForOverage || ""}
                            onChange={(e) =>
                              handleUpdateLine(idx, {
                                reasonForOverage: e.target.value,
                              })
                            }
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveLine(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* ── TAB 2: DOSAGE-ADAPTIVE CHANGE PARTS ─────────────────────────────── */}
        <TabsContent value="changeParts" className="space-y-4">
          <Panel>
            {/* Section 1: Change Part Details (Document Specification) */}
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sliders className="size-4 text-muted-foreground" /> Section 1: Change Part Details & Packaging Dimensions
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Critical tooling geometry, strip layout and box dimensions required for packaging line setup.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Change part available:</span>
                  <div className="flex items-center rounded-lg border border-border/70 p-0.5 bg-muted/40">
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                        changeParts.changePartAvailable
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => {
                        setChangeParts({ ...changeParts, changePartAvailable: true });
                        setCpUploadModalOpen(true);
                      }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                        changeParts.changePartAvailable === false
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setChangeParts({ ...changeParts, changePartAvailable: false })}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              {/* Exact 4 dimensions specified in document */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Tablet Diameter (mm)
                  </Label>
                  <Input
                    placeholder="e.g. 9 mm"
                    value={changeParts.tabletDiameterMm || ""}
                    onChange={(e) => setChangeParts({ ...changeParts, tabletDiameterMm: e.target.value })}
                    className="h-8 text-xs font-medium bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Strip Size (mm)
                  </Label>
                  <Input
                    placeholder="e.g. 78x32"
                    value={changeParts.stripSizeMm || ""}
                    onChange={(e) => setChangeParts({ ...changeParts, stripSizeMm: e.target.value })}
                    className="h-8 text-xs font-medium bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Mono Carton Size (LxWxH)
                  </Label>
                  <Input
                    placeholder="e.g. 80x35x40"
                    value={changeParts.monoCartonSize || ""}
                    onChange={(e) => setChangeParts({ ...changeParts, monoCartonSize: e.target.value })}
                    className="h-8 text-xs font-medium bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Shipper Box Size (LxWxH)
                  </Label>
                  <Input
                    placeholder="e.g. 400x340x390"
                    value={changeParts.shipperBoxSize || ""}
                    onChange={(e) => setChangeParts({ ...changeParts, shipperBoxSize: e.target.value })}
                    className="h-8 text-xs font-medium bg-background"
                  />
                </div>
              </div>

              {/* Upload Status Banner */}
              {changeParts.changePartAvailable && (
                <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Attached Layouts:</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      Compression CP: {changeParts.compressionCpFileName || "Pending Upload"}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      Strip CP: {changeParts.stripCpFileName || "Pending Upload"}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setCpUploadModalOpen(true)}
                  >
                    Manage CAD Layout Uploads
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-4">
              <h3 className="text-base font-semibold text-foreground">
                Tooling & Machine Change Parts Specifications
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configured specifically for {rfq.dosageForm} manufacturing equipment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Tablet Tooling */}
              {isTablet && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tooling Type</Label>
                    <Select
                      value={changeParts.toolingType || "D Tooling"}
                      onValueChange={(val) =>
                        setChangeParts({ ...changeParts, toolingType: val })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="D Tooling">D Tooling</SelectItem>
                        <SelectItem value="B Tooling">B Tooling</SelectItem>
                        <SelectItem value="BB Tooling">BB Tooling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Punch Shape</Label>
                    <Input
                      placeholder="e.g. Round, Bi-convex, Oval"
                      value={changeParts.punchShape || ""}
                      onChange={(e) =>
                        setChangeParts({ ...changeParts, punchShape: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Punch Dimensions</Label>
                    <Input
                      placeholder="e.g. 12.0 mm diameter"
                      value={changeParts.punchSize || ""}
                      onChange={(e) =>
                        setChangeParts({ ...changeParts, punchSize: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Upper Punch Embossing</Label>
                    <Input
                      placeholder="e.g. N-500"
                      value={changeParts.embossingUpper || ""}
                      onChange={(e) =>
                        setChangeParts({ ...changeParts, embossingUpper: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Lower Punch Embossing</Label>
                    <Input
                      placeholder="e.g. Breakline / Score"
                      value={changeParts.embossingLower || ""}
                      onChange={(e) =>
                        setChangeParts({ ...changeParts, embossingLower: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}

              {/* Capsule Tooling */}
              {isCapsule && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Capsule Shell Size</Label>
                    <Select
                      value={changeParts.capsuleSize || "Size 0"}
                      onValueChange={(val) =>
                        setChangeParts({ ...changeParts, capsuleSize: val })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Size 00", "Size 0", "Size 1", "Size 2", "Size 3", "Size 4"].map(
                          (cs) => (
                            <SelectItem key={cs} value={cs} className="text-xs">
                              {cs}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Capsule Shell Material</Label>
                    <Select
                      value={changeParts.capsuleType || "Hard Gelatin"}
                      onValueChange={(val) =>
                        setChangeParts({ ...changeParts, capsuleType: val })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hard Gelatin">Hard Gelatin</SelectItem>
                        <SelectItem value="HPMC Vegetarian">HPMC Vegetarian</SelectItem>
                        <SelectItem value="Pullulan">Pullulan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Liquid Oral */}
              {isLiquid && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bottle Material</Label>
                    <Input
                      placeholder="e.g. Amber PET, Glass"
                      value={changeParts.bottleMaterial || ""}
                      onChange={(e) =>
                        setChangeParts({ ...changeParts, bottleMaterial: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Bottle Fill Volume</Label>
                    <Input
                      placeholder="e.g. 100 ml, 200 ml"
                      value={changeParts.bottleVolume || ""}
                      onChange={(e) =>
                        setChangeParts({ ...changeParts, bottleVolume: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Cap & Closure</Label>
                    <Input
                      placeholder="e.g. 28mm CRC Cap, ROPP Seal"
                      value={changeParts.capType || ""}
                      onChange={(e) =>
                        setChangeParts({ ...changeParts, capType: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}

              {/* Topical Ointment */}
              {isTopical && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tube Material</Label>
                    <Input
                      placeholder="e.g. Laminated (LBL) Tube"
                      value={changeParts.tubeMaterial || ""}
                      onChange={(e) =>
                        setChangeParts({ ...changeParts, tubeMaterial: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Tube Size / Weight</Label>
                    <Input
                      placeholder="e.g. 15g, 30g"
                      value={changeParts.tubeSize || ""}
                      onChange={(e) =>
                        setChangeParts({ ...changeParts, tubeSize: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}

              {/* General Packaging for all */}
              <div className="space-y-1.5">
                <Label className="text-xs">Blister / Pack Format</Label>
                <Input
                  placeholder="e.g. 10x10 Alu-Alu, 1x10 Blister"
                  value={changeParts.blisterFormat || ""}
                  onChange={(e) =>
                    setChangeParts({ ...changeParts, blisterFormat: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">PVC / Forming Film Thickness</Label>
                <Input
                  placeholder="e.g. 250 micron PVC/PVDC"
                  value={changeParts.blisterPvcThickness || ""}
                  onChange={(e) =>
                    setChangeParts({
                      ...changeParts,
                      blisterPvcThickness: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Lidding Foil Specification</Label>
                <Input
                  placeholder="e.g. 20 micron Hard Tempered Alu"
                  value={changeParts.blisterAluFoilGsm || ""}
                  onChange={(e) =>
                    setChangeParts({
                      ...changeParts,
                      blisterAluFoilGsm: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50">
              <Label className="text-xs">Technical Change Part Notes</Label>
              <Textarea
                placeholder="Additional manufacturing and engineering specifications..."
                value={changeParts.notes || ""}
                onChange={(e) =>
                  setChangeParts({ ...changeParts, notes: e.target.value })
                }
                className="mt-1.5 text-xs"
                rows={3}
              />
            </div>
          </Panel>
        </TabsContent>

        {/* ── TAB 3: TECHNICAL QUERIES ────────────────────────────────────────── */}
        <TabsContent value="queries" className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Technical Queries & Clarifications
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track technical queries raised with Sales, Client, or Regulatory teams.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setQueryModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="size-3.5" /> Raise New Query
              </Button>
            </div>

            {queries.length === 0 ? (
              <div className="p-8 text-center border rounded-xl bg-muted/10 space-y-2">
                <CheckCircle2 className="size-8 mx-auto text-emerald-500/70" />
                <p className="text-sm font-medium">No open technical queries</p>
                <p className="text-xs text-muted-foreground">
                  Everything looks clear! If there is formulation ambiguity, raise a query.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {queries.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-border/60 bg-secondary/20 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {q.queryNo}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            q.status === "OPEN"
                              ? "border-rose-500/30 text-rose-600 bg-rose-500/10"
                              : "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                          )}
                        >
                          {q.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Raised to: <strong>{q.raisedTo}</strong>
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-foreground">
                      {q.subject || "Formulation Query"}
                    </h4>
                    <p className="text-xs text-muted-foreground bg-background/50 p-2.5 rounded border border-border/30">
                      {q.queryText}
                    </p>

                    {q.responseText ? (
                      <div className="text-xs bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded space-y-1">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          Resolution Response:
                        </span>
                        <p className="text-foreground">{q.responseText}</p>
                      </div>
                    ) : (
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                          onClick={() => setResolveQueryId(q.id)}
                        >
                          Resolve Query
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      {/* MFR Matcher Modal */}
      <Dialog open={matchModalOpen} onOpenChange={setMatchModalOpen}>
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
                    {rfq?.rfqNo}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Ranked formulation matches from master product dossier and approved MFRs based on active APIs, dosage form, and pharmacopeial standard.
                </DialogDescription>
              </div>
            </div>

            {/* Target RFQ Context Bar */}
            {rfq && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border/60 bg-background/70 px-3.5 py-2 text-xs">
                <span className="text-muted-foreground font-medium">Target RFQ:</span>
                <span className="font-semibold text-foreground truncate max-w-[280px]">
                  {rfq.productName || rfq.brandName}
                </span>
                {rfq.dosageForm && (
                  <span className="text-muted-foreground">
                    • <span className="font-medium text-foreground">{rfq.dosageForm}</span>
                  </span>
                )}
                {(rfq.standard || rfq.pharmacopeia) && (
                  <span className="text-muted-foreground">
                    • Standard: <span className="font-medium text-foreground">{rfq.standard || rfq.pharmacopeia}</span>
                  </span>
                )}
                <span className="text-muted-foreground sm:ml-auto">
                  Composition: <strong className="text-foreground">{compositionLines.length}</strong> {compositionLines.length === 1 ? "API" : "APIs"} configured
                </span>
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
                  No existing product or MFR scored above the similarity threshold (15%). You can configure active ingredients in the Active Composition tab to improve matching, or create a new MFR manually.
                </p>
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

                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs gap-1.5 shadow-sm"
                          onClick={() => cloneMfrMutation.mutate(match)}
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
            <Button variant="outline" size="sm" onClick={() => setMatchModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raise Query Modal */}
      <Dialog open={queryModalOpen} onOpenChange={setQueryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Technical Query</DialogTitle>
            <DialogDescription>
              Submit a question or clarification request for this RFQ specification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="qSubject">Subject *</Label>
              <Input
                id="qSubject"
                placeholder="e.g. Discrepancy in overage % for API"
                value={newQuerySubject}
                onChange={(e) => setNewQuerySubject(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qText">Query Description *</Label>
              <Textarea
                id="qText"
                placeholder="Detail the technical questions or missing specifications..."
                rows={4}
                value={newQueryText}
                onChange={(e) => setNewQueryText(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQueryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => raiseQueryMutation.mutate()}
              disabled={raiseQueryMutation.isPending || !newQuerySubject.trim() || !newQueryText.trim()}
            >
              {raiseQueryMutation.isPending ? "Submitting..." : "Submit Query"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Query Modal */}
      <Dialog
        open={Boolean(resolveQueryId)}
        onOpenChange={(open) => !open && setResolveQueryId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Technical Query</DialogTitle>
            <DialogDescription>
              Record the clarification or response received from Sales/Regulatory.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <Label htmlFor="qResponse">Resolution / Response *</Label>
            <Textarea
              id="qResponse"
              placeholder="e.g. Client confirmed 5% overage for stability approval."
              rows={4}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveQueryId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => resolveQueryMutation.mutate()}
              disabled={resolveQueryMutation.isPending || !responseText.trim()}
            >
              {resolveQueryMutation.isPending ? "Resolving..." : "Mark as Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Part CAD Layout Upload Modal (Spec Alignment) */}
      <Dialog open={cpUploadModalOpen} onOpenChange={setCpUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Part CAD Layout Upload</DialogTitle>
            <DialogDescription className="text-xs">
              Upload compatible engineering layout drawings for compression tooling and strip packaging change parts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Compression CP */}
            <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
              <Label className="text-xs font-semibold text-foreground">
                Compression CP : Please upload compatible Compression Change Part Layout
              </Label>
              <Input
                type="file"
                className="h-9 text-xs file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setChangeParts({
                      ...changeParts,
                      changePartAvailable: true,
                      compressionCpFileName: file.name,
                    });
                    toast.success(`Compression CP layout attached: ${file.name}`);
                  }
                }}
              />
              {changeParts.compressionCpFileName && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                  ✓ Current: {changeParts.compressionCpFileName}
                </p>
              )}
            </div>

            {/* Strip CP */}
            <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
              <Label className="text-xs font-semibold text-foreground">
                Strip CP : Please upload compatible Strip Change Part Layout
              </Label>
              <Input
                type="file"
                className="h-9 text-xs file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setChangeParts({
                      ...changeParts,
                      changePartAvailable: true,
                      stripCpFileName: file.name,
                    });
                    toast.success(`Strip CP layout attached: ${file.name}`);
                  }
                }}
              />
              {changeParts.stripCpFileName && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                  ✓ Current: {changeParts.stripCpFileName}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setCpUploadModalOpen(false);
                toast.success("Change part layouts verified and linked to RFQ");
              }}
            >
              Save Layouts & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
