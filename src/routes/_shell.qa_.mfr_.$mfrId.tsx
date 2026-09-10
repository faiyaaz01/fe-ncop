import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  ChevronLeft,
  Printer,
  Scale,
  FlaskConical,
  Package,
  Sliders,
  Pill,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MetricCard, MetricGrid, PageHeader, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  fetchQaMfrById,
  updateQaMfr,
  submitQaMfr,
  uploadMfrChangePart,
} from "@/lib/qa-api";
import {
  QA_STAGES,
  QA_STAGE_LABELS,
  QA_MFR_STATUS_LABELS,
  STRENGTH_UNITS,
  BATCH_UNITS,
  PHARMACOPEIAS,
  type QaMfr,
  type QaMfrItem,
  type QaStage,
  type QaMfrStatus,
  type QaChangeParts,
} from "@/lib/qa-types";

export const Route = createFileRoute("/_shell/qa_/mfr_/$mfrId")({
  head: () => ({
    meta: [{ title: "MFR Formulation Workbench · Nourish ERP" }],
  }),
  component: QaMfrWorkbenchPage,
});

// Unit conversion helper matching pharmaceutical standard:
// 1 kg = 1,000 g = 1,000,000 mg = 1,000,000,000 mcg (10^9 mcg)
// 1 L = 1,000 ml
function calculateItemBatchQty(
  batchSize: number,
  overagedPerUnit: number,
  claimUnit: string = "mg",
  batchUnit: string = "kg"
): number {
  if (!batchSize || !overagedPerUnit || batchSize <= 0 || overagedPerUnit <= 0) {
    return 0;
  }

  const u = claimUnit.trim().toLowerCase();
  const bu = batchUnit.trim().toLowerCase();

  let inBaseMgOrMl = overagedPerUnit;
  if (u === "mcg" || u === "μg") {
    inBaseMgOrMl = overagedPerUnit / 1000;
  } else if (u === "g" || u === "gm") {
    inBaseMgOrMl = overagedPerUnit * 1000;
  } else if (u === "kg") {
    inBaseMgOrMl = overagedPerUnit * 1000000;
  } else if (u === "l") {
    inBaseMgOrMl = overagedPerUnit * 1000;
  }

  const totalBase = batchSize * inBaseMgOrMl;

  let result = totalBase / 1000000; // default mg to kg
  if (bu.includes("kg")) {
    result = totalBase / 1000000;
  } else if (bu.includes("g") && !bu.includes("kg")) {
    result = totalBase / 1000;
  } else if (bu.includes("l") && !bu.includes("ml")) {
    result = totalBase / 1000;
  } else if (bu.includes("ml")) {
    result = totalBase;
  }

  return Number(result.toFixed(4));
}

// ─── Sub-Stage Table Component ───────────────────────────────────────────────
function MfrStageTable({
  title,
  subtitle,
  stage,
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  isApi = false,
}: {
  title: string;
  subtitle?: string;
  stage: QaStage;
  items: { item: QaMfrItem; originalIndex: number }[];
  onAddItem: (stage: QaStage) => void;
  onUpdateItem: (index: number, updates: Partial<QaMfrItem>) => void;
  onRemoveItem: (index: number) => void;
  isApi?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-muted/30 border-b border-border/60 gap-2">
        <div>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
            {title}
            <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">
              {items.length} items
            </Badge>
          </h4>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 self-start sm:self-auto"
          onClick={() => onAddItem(stage)}
        >
          <Plus className="size-3" /> + Add {isApi ? "API" : "Row"}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">
          No materials specified. Click "+ Add {isApi ? "API" : "Row"}" to insert an ingredient.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20 font-semibold text-muted-foreground uppercase text-[11px]">
                <th className="py-2 px-3">Name of Material *</th>
                <th className="py-2 px-3 w-28">Pharmacopeia</th>
                <th className="py-2 px-3 w-24">Qty / tablet</th>
                <th className="py-2 px-3 w-20">Unit</th>
                <th className="py-2 px-3 w-20">Overage %</th>
                <th className="py-2 px-3 w-28">Over aged Qty</th>
                <th className="py-2 px-3 w-32">Qty per batch</th>
                <th className="py-2 px-3 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {items.map(({ item, originalIndex }) => (
                <tr key={originalIndex} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2 px-3">
                    <Input
                      placeholder="e.g. Paracetamol"
                      value={item.materialName}
                      onChange={(e) => onUpdateItem(originalIndex, { materialName: e.target.value })}
                      className="h-7 text-xs font-medium"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Select
                      value={item.grade || "IP"}
                      onValueChange={(val) => onUpdateItem(originalIndex, { grade: val })}
                    >
                      <SelectTrigger className="h-7 text-xs">
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
                      type="number"
                      step="any"
                      value={item.labelClaim || 0}
                      onChange={(e) => onUpdateItem(originalIndex, { labelClaim: Number(e.target.value) })}
                      className="h-7 text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Select
                      value={item.claimUnit || "mg"}
                      onValueChange={(val) => onUpdateItem(originalIndex, { claimUnit: val })}
                    >
                      <SelectTrigger className="h-7 text-xs">
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
                      value={item.overagePercent || 0}
                      onChange={(e) => onUpdateItem(originalIndex, { overagePercent: Number(e.target.value) })}
                      className="h-7 text-xs font-mono"
                    />
                  </td>
                  <td className="py-2 px-3 font-mono text-xs font-semibold text-foreground">
                    {item.overagedQtyPerUnit} {item.claimUnit}
                  </td>
                  <td className="py-2 px-3 font-mono text-xs font-semibold text-foreground">
                    {item.qtyPerBatch} {item.batchUnit || "kg"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemoveItem(originalIndex)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QaMfrWorkbenchPage() {
  const { mfrId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query
  const { data: mfr, isLoading, isError } = useQuery({
    queryKey: ["qa-mfrs", mfrId],
    queryFn: () => fetchQaMfrById(mfrId),
  });

  // Local Editable State
  const [batchSize, setBatchSize] = useState<number>(100000);
  const [batchUnit, setBatchUnit] = useState<string>("Tablets");
  const [theoreticalYield, setTheoreticalYield] = useState<number>(100.0);
  const [proposedShelfLifeYears, setProposedShelfLifeYears] = useState<number>(2.0);
  const [tabletColour, setTabletColour] = useState<string>("White to Off-White");
  const [coatingPercentage, setCoatingPercentage] = useState<number>(3.0);
  const [items, setItems] = useState<QaMfrItem[]>([]);
  const [changeParts, setChangeParts] = useState<QaChangeParts>({});
  const [remarks, setRemarks] = useState<string>("");
  const [cpUploadModalOpen, setCpUploadModalOpen] = useState(false);

  // Sync state when MFR loads
  useEffect(() => {
    if (mfr) {
      setBatchSize(mfr.batchSize || 100000);
      setBatchUnit(mfr.batchUnit || "Tablets");
      setTheoreticalYield(mfr.theoreticalYield || 100.0);
      setProposedShelfLifeYears(mfr.proposedShelfLifeYears || 2.0);
      setTabletColour(mfr.tabletColour || "White to Off-White");
      setCoatingPercentage(mfr.coatingPercentage || 3.0);
      setItems(mfr.items || []);
      setChangeParts(mfr.changeParts || {});
      setRemarks(mfr.remarks || "");
    }
  }, [mfr]);

  // Recalculate batch quantities when batchSize changes
  const handleBatchSizeChange = (newSize: number) => {
    setBatchSize(newSize);
    const updated = items.map((item) => {
      const bQty = calculateItemBatchQty(
        newSize,
        item.overagedQtyPerUnit || 0,
        item.claimUnit,
        item.batchUnit || "kg"
      );
      return { ...item, qtyPerBatch: bQty };
    });
    setItems(updated);
  };

  // Update item handlers
  const handleItemUpdate = (index: number, updates: Partial<QaMfrItem>) => {
    const updated = [...items];
    const current: QaMfrItem = { ...updated[index], ...updates };

    const claim = Number(current.labelClaim) || 0;
    const overage = Number(current.overagePercent) || 0;
    current.overagedQtyPerUnit = Number((claim * (1 + overage / 100)).toFixed(4));

    current.qtyPerBatch = calculateItemBatchQty(
      batchSize,
      current.overagedQtyPerUnit,
      current.claimUnit || "mg",
      current.batchUnit || "kg"
    );

    updated[index] = current;
    setItems(updated);
  };

  const handleAddItem = (stage: QaStage) => {
    const count = items.filter((i) => i.stage === stage).length + 1;
    const stagePrefix =
      stage === "ACTIVE"
        ? "ACT"
        : stage === "GRANULATION"
        ? "GRN"
        : stage === "BINDER"
        ? "BND"
        : stage === "LUBRICATION"
        ? "LUB"
        : stage === "COATING"
        ? "COT"
        : "PCK";

    const newItem: QaMfrItem = {
      stage,
      itemCode: `RM-${stagePrefix}-${String(count).padStart(3, "0")}`,
      materialName: "",
      grade: mfr?.standard || "IP",
      labelClaim: 0,
      claimUnit: "mg",
      overagePercent: 0,
      overagedQtyPerUnit: 0,
      qtyPerBatch: 0,
      batchUnit: "kg",
      functionCategory: stage === "ACTIVE" ? "Active Drug" : "Excipient",
      notes: "",
    };

    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totals = useMemo(() => {
    let apiWeightMg = 0;
    let excipientsWeightMg = 0;
    let coatingWeightMg = 0;
    let totalBatchKg = 0;

    items.forEach((item) => {
      const perUnit = item.overagedQtyPerUnit || 0;
      const bQty = item.qtyPerBatch || 0;

      if (item.stage === "ACTIVE") {
        apiWeightMg += perUnit;
      } else if (item.stage === "GRANULATION" || item.stage === "BINDER" || item.stage === "LUBRICATION") {
        excipientsWeightMg += perUnit;
      } else if (item.stage === "COATING") {
        coatingWeightMg += perUnit;
      }

      if (item.batchUnit === "kg") {
        totalBatchKg += bQty;
      }
    });

    const uncoatedAvgWeightMg = Number((apiWeightMg + excipientsWeightMg).toFixed(2));
    const coatedAvgWeightMg = Number((uncoatedAvgWeightMg + coatingWeightMg).toFixed(2));

    return {
      apiWeightMg: Number(apiWeightMg.toFixed(2)),
      excipientsWeightMg: Number(excipientsWeightMg.toFixed(2)),
      uncoatedAvgWeightMg,
      coatingWeightMg: Number(coatingWeightMg.toFixed(2)),
      coatedAvgWeightMg,
      totalBatchKg: Number(totalBatchKg.toFixed(2)),
    };
  }, [items]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: () =>
      updateQaMfr(mfrId, {
        batchSize,
        batchUnit,
        theoreticalYield,
        proposedShelfLifeYears,
        tabletColour,
        coatingPercentage,
        uncoatedAvgWeightMg: totals.uncoatedAvgWeightMg,
        coatedAvgWeightMg: totals.coatedAvgWeightMg,
        items,
        changeParts,
        remarks,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa-mfrs", mfrId] });
      toast.success("Draft MFR saved successfully");
    },
    onError: (err: Error) => {
      toast.error(`Failed to save MFR: ${err.message}`);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitQaMfr(mfrId, "QA Head"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa-mfrs", mfrId] });
      queryClient.invalidateQueries({ queryKey: ["qa-rfqs"] });
      queryClient.invalidateQueries({ queryKey: ["qa-kpis"] });
      toast.success("MFR submitted and sent ahead for production release!");
    },
    onError: (err: Error) => {
      toast.error(`Failed to submit MFR: ${err.message}`);
    },
  });

  const uploadChangePartMutation = useMutation({
    mutationFn: ({ type, file }: { type: "compression" | "strip"; file: File }) => uploadMfrChangePart(mfrId, type, file),
    onSuccess: (saved) => {
      setChangeParts(saved.changeParts || {});
      queryClient.invalidateQueries({ queryKey: ["qa-mfrs", mfrId] });
      toast.success("Change-part layout uploaded");
    },
    onError: (err: Error) => toast.error(`Upload failed: ${err.message}`),
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground text-sm">
        Loading Master Formula Record...
      </div>
    );
  }

  if (isError || !mfr) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-muted-foreground">MFR not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/qa" })}>
          <ChevronLeft className="size-4 mr-1" /> Back to QA Pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/qa" })}>
          <ChevronLeft className="size-4 mr-1" /> Back to QA
        </Button>
      </div>

      {/* Header */}
      <PageHeader
        eyebrow={`Master Formula Record (MFR) · ${mfr.mfrNo}`}
        title={mfr.productName}
        description={`${mfr.dosageForm} ${mfr.standard ? `(${mfr.standard})` : ""} · Target Scale: ${batchSize.toLocaleString()} ${batchUnit}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="size-3.5" /> Print / PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="size-3.5" />
              {saveMutation.isPending ? "Saving Draft..." : "Save Draft"}
            </Button>

            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || mfr.status === "APPROVED"}
            >
              <CheckCircle2 className="size-3.5" />
              {mfr.status === "APPROVED" ? "Released / Approved" : "Submit and Send Ahead"}
            </Button>
          </div>
        }
      />

      {/* ── Section 2: Formulation Header Ribbon ── */}
      <Panel className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Section 2 : Formulation Parameters
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Target commercial batch sizing, shelf life standard, and live calculated tablet unit weights.
            </p>
          </div>
          <Badge
            variant="outline"
            className="font-mono text-xs uppercase self-start sm:self-auto"
          >
            {QA_MFR_STATUS_LABELS[mfr.status]}
          </Badge>
        </div>

        {/* Input Parameters: Batch Size & Shelf Life */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-center text-xs">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Batch Size (Tablets/Capsules) *
            </Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={batchSize}
                onChange={(e) => handleBatchSizeChange(Number(e.target.value))}
                className="h-8 font-mono font-semibold text-sm bg-background"
              />
              <span className="font-medium text-foreground">{batchUnit}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Proposed Shelf Life (Years) *
            </Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                step="0.5"
                value={proposedShelfLifeYears}
                onChange={(e) => setProposedShelfLifeYears(Number(e.target.value))}
                className="h-8 font-mono font-semibold text-sm bg-background w-28"
                placeholder="2.0"
              />
              <span className="text-muted-foreground font-medium">Years</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Batch Unit Type
            </Label>
            <Select
              value={batchUnit}
              onValueChange={(val) => setBatchUnit(val)}
            >
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BATCH_UNITS.map((bu) => (
                  <SelectItem key={bu} value={bu} className="text-xs">
                    {bu}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Process Yield Standard
            </Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                step="0.1"
                value={theoreticalYield}
                onChange={(e) => setTheoreticalYield(Number(e.target.value))}
                className="h-8 font-mono text-xs bg-background w-24"
              />
              <span className="text-muted-foreground">% standard</span>
            </div>
          </div>
        </div>

        {/* Live Formulation Metrics Ribbon with Counting Animations */}
        <MetricGrid columns={4} label="Live formulation summary" className="pt-2">
          <MetricCard
            icon={FlaskConical}
            label="Active API weight"
            value={totals.apiWeightMg}
            decimals={2}
            suffix=" mg"
            detail="Active assay with overages"
            tone="primary"
          />
          <MetricCard
            icon={Scale}
            label="Uncoated avg weight"
            value={totals.uncoatedAvgWeightMg}
            decimals={2}
            suffix=" mg"
            detail={`API ${totals.apiWeightMg} + excipients ${totals.excipientsWeightMg}`}
            tone="warning"
          />
          <MetricCard
            icon={Sparkles}
            label="Coated avg weight"
            value={totals.coatedAvgWeightMg}
            decimals={2}
            suffix=" mg"
            detail={`Uncoated ${totals.uncoatedAvgWeightMg} + coating ${totals.coatingWeightMg}`}
            tone="info"
          />
          <MetricCard
            icon={Package}
            label="Total batch mass"
            value={totals.totalBatchKg}
            decimals={2}
            suffix=" kg"
            detail={`For ${batchSize.toLocaleString()} ${batchUnit}`}
            tone="success"
          />
        </MetricGrid>
      </Panel>

      {/* ── Horizontal Stage Navigation Menu (Document Layout) ── */}
      {/* Menu: API | Excipients | Coating Material | Primary Packing | Secondary Packing | Change Part */}
      <Tabs defaultValue="api" className="space-y-4">
        <div className="surface overflow-hidden rounded-xl border border-border/70 p-1 sm:p-1.5 shadow-sm">
          <TabsList className="flex h-auto w-full flex-wrap items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/40">
            <TabsTrigger
              value="api"
              className="gap-2 px-3 py-1.5 text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all"
            >
              <FlaskConical className="size-3.5 shrink-0 text-primary" />
              <span>API</span>
              <span className="ml-0.5 inline-flex items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold font-mono text-muted-foreground">
                {items.filter(i => i.stage === "ACTIVE").length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="excipients"
              className="gap-2 px-3 py-1.5 text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all"
            >
              <Pill className="size-3.5 shrink-0 text-muted-foreground" />
              <span>Excipients</span>
            </TabsTrigger>
            <TabsTrigger
              value="coating"
              className="gap-2 px-3 py-1.5 text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all"
            >
              <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
              <span>Coating Material</span>
            </TabsTrigger>
            <TabsTrigger
              value="primaryPacking"
              className="gap-2 px-3 py-1.5 text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all"
            >
              <Package className="size-3.5 shrink-0 text-muted-foreground" />
              <span>Primary Packing</span>
            </TabsTrigger>
            <TabsTrigger
              value="secondaryPacking"
              className="gap-2 px-3 py-1.5 text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all"
            >
              <Package className="size-3.5 shrink-0 text-muted-foreground" />
              <span>Secondary Packing</span>
            </TabsTrigger>
            <TabsTrigger
              value="changePart"
              className="gap-2 px-3 py-1.5 text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all"
            >
              <Sliders className="size-3.5 shrink-0 text-muted-foreground" />
              <span>Change Part</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB 1: API SECTION ────────────────────────────────────────────── */}
        <TabsContent value="api" className="space-y-4">
          <Panel className="space-y-3">
            {/* Conversion Rule Callout */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center gap-2.5 text-xs">
              <Info className="size-4 text-muted-foreground shrink-0" />
              <div>
                <strong className="text-foreground">Conversion Rule: </strong>
                <span className="font-mono font-medium text-foreground">1 kg = 10,00,000 mg</span>
                {" | "}
                <span className="font-mono font-medium text-foreground">1 kg = 1,00,00,00,000 mcg</span>
                {" | "}
                <span className="text-muted-foreground">Based on the claim unit, batch quantity in kg or L is calculated automatically.</span>
              </div>
            </div>

            <MfrStageTable
              title="Active Pharmaceutical Ingredients (API)"
              subtitle="Formulation active drug substances with stability overages and batch scaling."
              stage="ACTIVE"
              items={items
                .map((item, originalIndex) => ({ item, originalIndex }))
                .filter(({ item }) => item.stage === "ACTIVE")}
              onAddItem={handleAddItem}
              onUpdateItem={handleItemUpdate}
              onRemoveItem={handleRemoveItem}
              isApi={true}
            />
          </Panel>
        </TabsContent>

        {/* ── TAB 2: EXCIPIENTS (MODULE 2: Granulation, Binding, Lubrication) ── */}
        <TabsContent value="excipients" className="space-y-6">
          <Panel className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Module 2 : Excipients Multi-Stage Processing
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Granulation, fluid binder addition, and final lubrication blending.
              </p>
            </div>

            {/* Granulation / RMG */}
            <MfrStageTable
              title="Granulation (RMG / Dry Mixing)"
              subtitle="Diluents, disintegrants, and dry blend excipients."
              stage="GRANULATION"
              items={items
                .map((item, originalIndex) => ({ item, originalIndex }))
                .filter(({ item }) => item.stage === "GRANULATION")}
              onAddItem={handleAddItem}
              onUpdateItem={handleItemUpdate}
              onRemoveItem={handleRemoveItem}
            />

            {/* Binding */}
            <MfrStageTable
              title="Binding (Binder Fluid / Paste)"
              subtitle="Binding polymers, solvents, and granulation fluids."
              stage="BINDER"
              items={items
                .map((item, originalIndex) => ({ item, originalIndex }))
                .filter(({ item }) => item.stage === "BINDER")}
              onAddItem={handleAddItem}
              onUpdateItem={handleItemUpdate}
              onRemoveItem={handleRemoveItem}
            />

            {/* Lubrication */}
            <MfrStageTable
              title="Lubrication (Post-Drying Blending)"
              subtitle="Glidants, lubricants, and anti-adherents."
              stage="LUBRICATION"
              items={items
                .map((item, originalIndex) => ({ item, originalIndex }))
                .filter(({ item }) => item.stage === "LUBRICATION")}
              onAddItem={handleAddItem}
              onUpdateItem={handleItemUpdate}
              onRemoveItem={handleRemoveItem}
            />
          </Panel>
        </TabsContent>

        {/* ── TAB 3: COATING MATERIAL (MODULE 3: Tablet Colour & Coating %) ── */}
        <TabsContent value="coating" className="space-y-4">
          <Panel className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Module 3 : Film / Sugar Coating
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Film forming polymers, plasticizers, and shade formulation.
              </p>
            </div>

            {/* Module 3 Header: Tablet Colour & Coating % */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Tablet Colour :
                </Label>
                <Input
                  value={tabletColour}
                  onChange={(e) => setTabletColour(e.target.value)}
                  placeholder="e.g. Pink, White, Blue, Light Yellow"
                  className="h-8 text-xs font-medium bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Coating Weight Build-up :
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    step="0.1"
                    value={coatingPercentage}
                    onChange={(e) => setCoatingPercentage(Number(e.target.value))}
                    className="h-8 text-xs font-mono font-semibold bg-background w-28"
                    placeholder="3.0"
                  />
                  <span className="text-xs text-muted-foreground font-medium">% theoretical weight build-up</span>
                </div>
              </div>
            </div>

            <MfrStageTable
              title="Coating Material"
              subtitle="Opadry, polymers, opacifiers, and purified solvents."
              stage="COATING"
              items={items
                .map((item, originalIndex) => ({ item, originalIndex }))
                .filter(({ item }) => item.stage === "COATING")}
              onAddItem={handleAddItem}
              onUpdateItem={handleItemUpdate}
              onRemoveItem={handleRemoveItem}
            />
          </Panel>
        </TabsContent>

        {/* ── TAB 4: PRIMARY PACKING (MODULE 4: PVC, Foil, Bottles) ────────── */}
        <TabsContent value="primaryPacking" className="space-y-4">
          <Panel className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Module 4 : Primary Packaging
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Direct container-closure materials: PVC film, aluminum blister foil, HDPE bottles, and desiccants.
              </p>
            </div>

            <MfrStageTable
              title="Primary Packaging Bill of Materials"
              subtitle="e.g. PVC Film, Sealing Foil, HDPE Container, Silica Gel."
              stage="PRIMARY_PACK"
              items={items
                .map((item, originalIndex) => ({ item, originalIndex }))
                .filter(({ item }) => item.stage === "PRIMARY_PACK")}
              onAddItem={handleAddItem}
              onUpdateItem={handleItemUpdate}
              onRemoveItem={handleRemoveItem}
            />
          </Panel>
        </TabsContent>

        {/* ── TAB 5: SECONDARY PACKING (MODULE 5: Cartons, Inserts, Shippers) ─ */}
        <TabsContent value="secondaryPacking" className="space-y-4">
          <Panel className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Module 5 : Secondary Packaging
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cartons, pack inserts / patient information leaflets (PIL), outer shippers, and corrugated boxes.
              </p>
            </div>

            <MfrStageTable
              title="Secondary Packaging Bill of Materials"
              subtitle="e.g. Mono Carton, Pack Insert, Outer Carton, Shipper Box, BOPP Tape."
              stage="SECONDARY_PACK"
              items={items
                .map((item, originalIndex) => ({ item, originalIndex }))
                .filter(({ item }) => item.stage === "SECONDARY_PACK")}
              onAddItem={handleAddItem}
              onUpdateItem={handleItemUpdate}
              onRemoveItem={handleRemoveItem}
            />
          </Panel>
        </TabsContent>

        {/* ── TAB 6: SECTION 1: CHANGE PART DETAILS ────────────────────────── */}
        <TabsContent value="changePart" className="space-y-4">
          <Panel className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sliders className="size-4 text-muted-foreground" /> Section 1 : Change Part Details & CAD Layouts
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tablet punch dimensions, strip layout sizes, carton specs, and tooling compatibility approvals.
                </p>
              </div>

              {/* Is Change Part Available Yes/No */}
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

            {/* Change Part Dimensions Specified in Document */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Tablet Diameter (mm)
                </Label>
                <Input
                  placeholder="e.g. 9 mm"
                  value={changeParts.tabletDiameterMm || ""}
                  onChange={(e) => setChangeParts({ ...changeParts, tabletDiameterMm: e.target.value })}
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Strip Size (mm)
                </Label>
                <Input
                  placeholder="e.g. 78x32"
                  value={changeParts.stripSizeMm || ""}
                  onChange={(e) => setChangeParts({ ...changeParts, stripSizeMm: e.target.value })}
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Mono Carton Size (LxWxH)
                </Label>
                <Input
                  placeholder="e.g. 80x35x40"
                  value={changeParts.monoCartonSize || ""}
                  onChange={(e) => setChangeParts({ ...changeParts, monoCartonSize: e.target.value })}
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Shipper Box Size (LxWxH)
                </Label>
                <Input
                  placeholder="e.g. 400x340x390"
                  value={changeParts.shipperBoxSize || ""}
                  onChange={(e) => setChangeParts({ ...changeParts, shipperBoxSize: e.target.value })}
                  className="h-8 text-xs font-medium"
                />
              </div>
            </div>

            {/* Layout Upload Trigger & Badges */}
            {changeParts.changePartAvailable && (
              <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
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
                  className="h-8 text-xs gap-1"
                  onClick={() => setCpUploadModalOpen(true)}
                >
                  Manage CP Layout Uploads
                </Button>
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      {/* Change Part CAD Layout Upload Modal */}
      <Dialog open={cpUploadModalOpen} onOpenChange={setCpUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Part CAD Layout Upload</DialogTitle>
            <DialogDescription className="text-xs">
              Upload compatible Compression and Strip change part layouts for engineering line validation.
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
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="h-9 text-xs file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadChangePartMutation.mutate({ type: "compression", file });
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
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="h-9 text-xs file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadChangePartMutation.mutate({ type: "strip", file });
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
                toast.success("Change part layouts verified and linked to MFR");
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
