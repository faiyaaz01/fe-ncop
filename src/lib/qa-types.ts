// ─── Enums & Constants ─────────────────────────────────────────────────────────

export const QA_RFQ_STATUSES = [
  "FORMULA_PENDING",
  "SPECIFICATION_PENDING",
  "DRAFT_SAVED",
  "COMPLETED",
  "QUERY_RAISED",
] as const;
export type QaRfqStatus = (typeof QA_RFQ_STATUSES)[number];

export const QA_RFQ_STATUS_LABELS: Record<QaRfqStatus, string> = {
  FORMULA_PENDING: "Formula Pending",
  SPECIFICATION_PENDING: "Spec Pending",
  DRAFT_SAVED: "Draft Saved",
  COMPLETED: "Completed",
  QUERY_RAISED: "Query Raised",
};

export const QA_RFQ_STATUS_COLORS: Record<QaRfqStatus, { bg: string; text: string; border: string }> = {
  FORMULA_PENDING: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/30" },
  SPECIFICATION_PENDING: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/30" },
  DRAFT_SAVED: { bg: "bg-indigo-500/10 dark:bg-indigo-500/20", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-500/30" },
  COMPLETED: { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/30" },
  QUERY_RAISED: { bg: "bg-rose-500/10 dark:bg-rose-500/20", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/30" },
};

export const QA_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;
export type QaPriority = (typeof QA_PRIORITIES)[number];

export const QA_PRIORITY_LABELS: Record<QaPriority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const QA_PRIORITY_COLORS: Record<QaPriority, { bg: string; text: string }> = {
  URGENT: { bg: "bg-rose-500/15 text-rose-700 dark:text-rose-400", text: "text-rose-600" },
  HIGH: { bg: "bg-orange-500/15 text-orange-700 dark:text-orange-400", text: "text-orange-600" },
  MEDIUM: { bg: "bg-sky-500/15 text-sky-700 dark:text-sky-400", text: "text-sky-600" },
  LOW: { bg: "bg-slate-500/15 text-slate-700 dark:text-slate-400", text: "text-slate-600" },
};

export const QA_MFR_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as const;
export type QaMfrStatus = (typeof QA_MFR_STATUSES)[number];

export const QA_MFR_STATUS_LABELS: Record<QaMfrStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const QA_STAGES = [
  "ACTIVE",
  "GRANULATION",
  "BINDER",
  "LUBRICATION",
  "COATING",
  "PRIMARY_PACK",
  "SECONDARY_PACK",
] as const;
export type QaStage = (typeof QA_STAGES)[number];

export const QA_STAGE_LABELS: Record<QaStage, string> = {
  ACTIVE: "Active Pharmaceutical Ingredients (API)",
  GRANULATION: "Granulation / Dry Mixing",
  BINDER: "Binder Solution / Fluid",
  LUBRICATION: "Lubrication & Blending",
  COATING: "Coating Suspension",
  PRIMARY_PACK: "Primary Packaging Materials",
  SECONDARY_PACK: "Secondary Packaging Materials",
};

export const DOSAGE_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup / Liquid Oral",
  "Suspension",
  "Injection",
  "Ointment / Cream",
  "Eye/Ear Drops",
  "Dry Syrup",
  "Inhaler / Respule",
] as const;

export const PHARMACOPEIAS = ["IP", "BP", "USP", "EP", "Ph.Eur", "In-House", "None"] as const;
export const STRENGTH_UNITS = ["mg", "mcg", "g", "kg", "ml", "L", "Nos"] as const;
export const BATCH_UNITS = ["Tablets", "Capsules", "Litres", "Bottles", "Kg", "Vials", "Ampoules"] as const;

// ─── Sub-Entities ────────────────────────────────────────────────────────────

export interface QaCompositionLine {
  api: string;
  labelClaim: number;
  claimUnit: string;
  overagePercent: number;
  overagedQty: number;
  reasonForOverage?: string;
  pharmacopeia: string;
  functionCategory?: string;
}

export interface QaChangeParts {
  dosageForm?: string;
  toolingType?: string;
  punchShape?: string;
  punchSize?: string;
  embossingUpper?: string;
  embossingLower?: string;
  capsuleSize?: string;
  capsuleType?: string;
  blisterFormat?: string;
  blisterPvcThickness?: string;
  blisterAluFoilGsm?: string;
  bottleMaterial?: string;
  bottleVolume?: string;
  capType?: string;
  measuringCup?: string;
  tubeMaterial?: string;
  tubeSize?: string;
  nozzleType?: string;
  // Section 1: Dimensions & Layouts
  tabletDiameterMm?: string;
  stripSizeMm?: string;
  monoCartonSize?: string;
  shipperBoxSize?: string;
  changePartAvailable?: boolean;
  compressionCpFileName?: string;
  compressionCpFileUrl?: string;
  stripCpFileName?: string;
  stripCpFileUrl?: string;
  notes?: string;
}

export interface QaMfrItem {
  stage: QaStage;
  itemCode?: string;
  materialName: string;
  grade?: string;
  labelClaim?: number;
  claimUnit?: string;
  overagePercent?: number;
  overagedQtyPerUnit?: number;
  qtyPerBatch?: number;
  batchUnit?: string;
  functionCategory?: string;
  notes?: string;
}

// ─── Main Entities ───────────────────────────────────────────────────────────

export interface QaRfq {
  id: string;
  rfqNo: string;
  inquiryId?: string;
  sourceRfqNo?: string;
  sourceProductId?: string;
  customerId?: string;
  customerName?: string;
  customerCode?: string;
  customerType?: string;
  productName: string;
  brandName?: string;
  dosageForm: string;
  dosageVariant?: string;
  category?: string;
  pharmacopeia?: string;
  standard?: string;
  status: QaRfqStatus;
  priority: QaPriority;
  assignedToId?: string;
  assignedToName?: string;
  assignedBy?: string;
  dueDate?: string;
  createdDate?: string;
  compositionLines: QaCompositionLine[];
  products?: QaRfqProduct[];
  changeParts?: QaChangeParts;
  packagingSpec?: string;
  orderQty?: number;
  packingSpecs?: string;
  totalTablets?: number;
  targetBatchSize?: number;
  batchUnit?: string;
  remarks?: string;
  createdOn?: string;
  lastUpdatedOn?: string;
}

export interface QaRfqProduct {
  id?: string;
  productName: string;
  dosageForm?: string;
  standard?: string;
  compositionLines: QaCompositionLine[];
  orderQty?: number;
  packingSpecs?: string;
  totalTablets?: number;
  technicalQueryRaised?: boolean;
}

export interface QaMfr {
  id: string;
  mfrNo: string;
  rfqId?: string;
  rfqNo?: string;
  rfqProductId?: string;
  productName: string;
  dosageForm: string;
  dosageVariant?: string;
  standard?: string;
  batchSize: number;
  batchUnit: string;
  theoreticalYield?: number;
  proposedShelfLifeYears?: number;
  tabletColour?: string;
  coatingPercentage?: number;
  uncoatedAvgWeightMg?: number;
  coatedAvgWeightMg?: number;
  status: QaMfrStatus;
  items: QaMfrItem[];
  changeParts?: QaChangeParts;
  remarks?: string;
  createdBy?: string;
  approvedBy?: string;
  nextDepartment?: string;
  nextApprover?: string;
  createdOn?: string;
  lastUpdatedOn?: string;
}

export interface QaQuery {
  id: string;
  queryNo: string;
  rfqId?: string;
  rfqNo?: string;
  mfrId?: string;
  rfqProductId?: string;
  raisedBy?: string;
  raisedTo?: string;
  subject?: string;
  queryText: string;
  responseText?: string;
  status: "OPEN" | "RESOLVED";
  createdOn?: string;
  resolvedOn?: string;
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface QaRfqRequestDto {
  inquiryId?: string;
  customerId?: string;
  customerName?: string;
  customerCode?: string;
  customerType?: string;
  productName: string;
  brandName?: string;
  dosageForm: string;
  dosageVariant?: string;
  category?: string;
  pharmacopeia?: string;
  standard?: string;
  status?: QaRfqStatus;
  priority?: QaPriority;
  assignedToId?: string;
  assignedToName?: string;
  assignedBy?: string;
  dueDate?: string;
  createdDate?: string;
  compositionLines?: QaCompositionLine[];
  products?: QaRfqProduct[];
  changeParts?: QaChangeParts;
  packagingSpec?: string;
  orderQty?: number;
  packingSpecs?: string;
  totalTablets?: number;
  targetBatchSize?: number;
  batchUnit?: string;
  remarks?: string;
}

export interface QaMfrRequestDto {
  rfqId?: string;
  rfqNo?: string;
  rfqProductId?: string;
  productName?: string;
  dosageForm?: string;
  dosageVariant?: string;
  standard?: string;
  batchSize?: number;
  batchUnit?: string;
  theoreticalYield?: number;
  proposedShelfLifeYears?: number;
  tabletColour?: string;
  coatingPercentage?: number;
  uncoatedAvgWeightMg?: number;
  coatedAvgWeightMg?: number;
  status?: QaMfrStatus;
  items?: QaMfrItem[];
  changeParts?: QaChangeParts;
  remarks?: string;
  createdBy?: string;
  approvedBy?: string;
  nextDepartment?: string;
  nextApprover?: string;
}

export interface QaQueryRequestDto {
  rfqId?: string;
  rfqNo?: string;
  mfrId?: string;
  rfqProductId?: string;
  raisedBy?: string;
  raisedTo?: string;
  subject?: string;
  queryText: string;
  responseText?: string;
}

export interface MfrMatchResult {
  targetType: "PRODUCT" | "MFR";
  targetId: string;
  targetCode: string;
  targetName: string;
  dosageForm: string;
  dosageVariant?: string;
  composition?: string;
  batchSize?: number;
  batchUnit?: string;
  status?: string;
  totalScore: number;
  productNameScore: number;
  compositionScore: number;
  strengthScore: number;
  dosageFormScore: number;
  standardScore: number;
  statusScore: number;
  batchSizeScore?: number;
  matchedIngredients: string[];
}

export interface QaKpis {
  pendingFormulaCount: number;
  specPendingCount: number;
  draftSavedCount: number;
  completedCount: number;
  queryRaisedCount: number;
  totalRfqs: number;
  completedTodayCount?: number;
  myPendingTasksCount?: number;
  overdueTasksCount?: number;
  openQueriesCount: number;
  approvedMfrCount: number;
  totalMfrs: number;
}
