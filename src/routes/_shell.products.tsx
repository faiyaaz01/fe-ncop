import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
  Upload,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  Pill,
  Layers,
  Sparkles,
  FlaskConical,
  Package,
  ShieldAlert,
  SlidersHorizontal,
  X,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader, StatusChip, SectionLoader } from "@/components/kit";
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  fetchProducts,
  fetchProductMetrics,
  fetchDosageForms,
  createProduct,
  updateProduct,
  deleteProduct,
  createDosageForm,
  updateDosageForm,
  uploadProductDocument,
  deleteProductDocument,
} from "@/lib/product-api";
import type {
  Product,
  ProductRequestDto,
  ProductIngredient,
  ProductDocumentType,
  ProductStatus,
  ProductSourcing,
  DosageForm,
  DosageFormRequestDto,
} from "@/lib/product-types";

export const Route = createFileRoute("/_shell/products")({
  head: () => ({
    meta: [
      { title: "Products · NCOP ERP" },
      {
        name: "description",
        content:
          "Searchable pharmaceutical catalogue with dosage forms, strengths, packaging, MOQ and registration status.",
      },
    ],
  }),
  component: ProductMaster,
});

const DEFAULT_CATEGORIES = [
  "Analgesics & Antipyretics",
  "Antibiotics & Anti-infectives",
  "Cardiovascular",
  "Gastrointestinal",
  "Respiratory",
  "Dermatological",
  "Central Nervous System",
  "Nutraceuticals & Vitamins",
  "Ophthalmic & Otic",
  "Endocrine & Metabolic",
  "Oncology",
  "General",
];

const PHARMACOPEIA_OPTIONS = ["BP", "USP", "IP", "EP", "Ph.Eur", "In-House", "None"];
const UNIT_OPTIONS = ["mg", "mcg", "g", "kg", "IU", "% w/v", "% w/w", "ml", "L", "vial", "ampoule"];
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "INR", "AED", "CAD"];

const DOCUMENT_TYPE_LABELS: Record<ProductDocumentType, string> = {
  ARTWORK: "Packaging Artwork",
  COA: "Certificate of Analysis (COA)",
  STABILITY_DATA: "Stability Study Report",
  REGULATORY_APPROVAL: "Regulatory Approval / Certificate",
  MSDS: "Material Safety Data Sheet (MSDS)",
  OTHER: "Supplementary Dossier Document",
};

function computeLiveComposition(
  ingredients: ProductIngredient[],
  dosageVariant?: string,
  dosageForm?: string,
): string {
  if (!ingredients || ingredients.length === 0) {
    return (dosageVariant || dosageForm || "").trim();
  }

  const parts: string[] = [];
  const pharmacopeias = new Set<string>();

  ingredients.forEach((ing) => {
    if (!ing.api?.trim()) return;
    let part = ing.api.trim();
    if (ing.strength?.trim()) {
      part += " " + ing.strength.trim() + (ing.unit?.trim() || "mg");
    }
    if (ing.pharmacopeia && ing.pharmacopeia !== "None" && ing.pharmacopeia !== "In-House") {
      pharmacopeias.add(ing.pharmacopeia.trim());
    }
    parts.push(part);
  });

  if (parts.length === 0) {
    return (dosageVariant || dosageForm || "").trim();
  }

  let formula = parts.join(" + ");
  if (pharmacopeias.size > 0) {
    formula += " " + Array.from(pharmacopeias).join("/");
  }
  if (dosageVariant?.trim()) {
    formula += " " + dosageVariant.trim();
  } else if (dosageForm?.trim()) {
    formula += " " + dosageForm.trim();
  }

  return formula.trim();
}

function ProductMaster() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dosageFilter, setDosageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawers
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [dosageConfigOpen, setDosageConfigOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Queries
  const { data: dosageForms = [] } = useQuery<DosageForm[]>({
    queryKey: ["dosage-forms"],
    queryFn: () => fetchDosageForms(false),
    refetchInterval: 3000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["product-metrics"],
    queryFn: fetchProductMetrics,
    refetchInterval: 3000,
  });

  const { data: productsPage, isLoading: productsLoading } = useQuery({
    queryKey: ["products", page, pageSize, search, categoryFilter, dosageFilter, statusFilter],
    queryFn: () =>
      fetchProducts({
        page,
        size: pageSize,
        search: search.trim() || undefined,
        category: categoryFilter,
        dosageForm: dosageFilter,
        status: statusFilter,
      }),
    refetchInterval: 3000,
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-metrics"] });
      toast.success("Product deleted successfully");
      setDeleteConfirm(null);
    },
    onError: (err: Error) => {
      toast.error("Failed to delete product: " + err.message);
    },
  });

  const productList = productsPage?.content ?? [];
  const totalElements = productsPage?.totalElements ?? 0;
  const totalPages = productsPage?.totalPages ?? 1;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        title="Products"
        description="Manage pharmaceutical catalog, dosage forms, active pharmaceutical ingredients (APIs), and dossiers."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setDosageConfigOpen(true)} className="gap-2">
              <SlidersHorizontal className="size-4" />
              Dosage Configurations
            </Button>
            <Button
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="size-4" />
              Add Product
            </Button>
          </div>
        }
      />

      {/* ── Metrics Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="surface p-4 rounded-xl border border-border/70 flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Boxes className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{metrics?.total ?? totalElements}</p>
            <p className="text-xs text-muted-foreground font-medium">Total Products</p>
          </div>
        </div>

        <div className="surface p-4 rounded-xl border border-border/70 flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{metrics?.active ?? 0}</p>
            <p className="text-xs text-muted-foreground font-medium">Active SKUs</p>
          </div>
        </div>

        <div className="surface p-4 rounded-xl border border-border/70 flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{metrics?.underDevelopment ?? 0}</p>
            <p className="text-xs text-muted-foreground font-medium">In Development</p>
          </div>
        </div>

        <div className="surface p-4 rounded-xl border border-border/70 flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Layers className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{dosageForms.length}</p>
            <p className="text-xs text-muted-foreground font-medium">Dosage Forms</p>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="surface p-4 rounded-xl border border-border/70 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by brand name, SKU code, API ingredient, or composition..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onValueChange={(val) => {
              setCategoryFilter(val);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {DEFAULT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
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
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Dosage Form" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dosage Forms</SelectItem>
              {dosageForms.map((df) => (
                <SelectItem key={df.id || df.name} value={df.name}>
                  {df.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="UNDER_DEVELOPMENT">In Development</SelectItem>
              <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
            </SelectContent>
          </Select>

          {(search ||
            categoryFilter !== "all" ||
            dosageFilter !== "all" ||
            statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
                setDosageFilter("all");
                setStatusFilter("all");
                setPage(0);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* ── Products Table ── */}
      <div className="surface rounded-xl border border-border/70 overflow-hidden">
        {productsLoading ? (
          <SectionLoader />
        ) : productList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="size-12 rounded-full bg-secondary/80 flex items-center justify-center mb-3">
              <Boxes className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">No products found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              No product matches the current search and filter criteria. Try adjusting your filters
              or add a new product.
            </p>
            <Button
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="mt-4 gap-2"
              size="sm"
            >
              <Plus className="size-4" /> Add Product
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Product / SKU</th>
                  <th className="px-4 py-3">Dosage & Variant</th>
                  <th className="px-4 py-3">Formulation / Composition</th>
                  <th className="px-4 py-3">Packaging & MOQ</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {productList.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => navigate({ to: `/products/${product.id}` })}
                    className="hover:bg-secondary/40 transition-colors cursor-pointer"
                  >
                    {/* Product & SKU */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs mt-0.5">
                          <Pill className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm hover:text-primary transition-colors">
                            {product.brandName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {product.productCode}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {product.category || "General"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Dosage & Variant */}
                    <td className="px-4 py-3.5 align-middle">
                      <div>
                        <span className="font-medium text-foreground text-xs">
                          {product.dosageForm}
                        </span>
                        {product.dosageVariant && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {product.dosageVariant}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Composition */}
                    <td className="px-4 py-3.5 align-middle max-w-[280px]">
                      <p
                        className="text-xs font-medium text-foreground line-clamp-2"
                        title={product.composition}
                      >
                        {product.composition || "—"}
                      </p>
                      {product.ingredients && product.ingredients.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {product.ingredients.length} active API
                          {product.ingredients.length > 1 ? "s" : ""}
                        </p>
                      )}
                    </td>

                    {/* Packaging & MOQ */}
                    <td className="px-4 py-3.5 align-middle">
                      <p className="text-xs text-foreground font-medium">
                        {product.packaging || "Standard"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        MOQ: {product.moq ? product.moq.toLocaleString() : "—"}
                      </p>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3.5 align-middle">
                      {product.unitPrice !== undefined && product.unitPrice !== null ? (
                        <p className="text-sm font-semibold text-foreground tabular-nums">
                          {product.currency || "USD"} {product.unitPrice.toFixed(2)}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 align-middle">
                      <StatusChip status={product.status as any} />
                    </td>

                    {/* Actions */}
                    <td
                      className="px-4 py-3.5 text-right align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          title="View Details & Dossier"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({ to: `/products/${product.id}` });
                          }}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          title="Edit Product"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProduct(product);
                            setProductModalOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10"
                          title="Delete Product"
                          onClick={() =>
                            setDeleteConfirm({
                              id: product.id,
                              name: product.brandName,
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Bar ── */}
        <PaginationBar
          page={page}
          pageSize={pageSize}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
        />
      </div>

      {/* ── Add / Edit Product Dialog ── */}
      <ProductFormDialog
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        editingProduct={editingProduct}
        dosageForms={dosageForms}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
          queryClient.invalidateQueries({ queryKey: ["product-metrics"] });
        }}
      />

      {/* ── Manage Dosage Forms & Variants Modal ── */}
      <DosageConfigDialog
        open={dosageConfigOpen}
        onOpenChange={setDosageConfigOpen}
        dosageForms={dosageForms}
        onChanged={() => {
          queryClient.invalidateQueries({ queryKey: ["dosage-forms"] });
        }}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              Delete Product
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deleteConfirm?.name}</strong>? This action will
              permanently remove the product and its attached dossiers from the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCT FORM DIALOG (Add / Edit)
// ══════════════════════════════════════════════════════════════════════════════

export function ProductFormDialog({
  open,
  onOpenChange,
  editingProduct,
  dosageForms,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: Product | null;
  dosageForms: DosageForm[];
  onSaved: (product?: Product) => void;
}) {
  const [brandName, setBrandName] = useState("");
  const [category, setCategory] = useState("Analgesics & Antipyretics");
  const [therapeuticClass, setTherapeuticClass] = useState("");
  const [dosageForm, setDosageForm] = useState("");
  const [dosageVariant, setDosageVariant] = useState("");
  const [ingredients, setIngredients] = useState<ProductIngredient[]>([
    { api: "", strength: "", unit: "mg", pharmacopeia: "BP" },
  ]);
  const [customComposition, setCustomComposition] = useState("");
  const [packaging, setPackaging] = useState("");
  const [moq, setMoq] = useState<number | "">("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [currency, setCurrency] = useState("USD");
  const [shelfLife, setShelfLife] = useState("24 Months");
  const [storageCondition, setStorageCondition] = useState(
    "Store below 25°C in a dry place. Protect from light.",
  );
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (editingProduct) {
      setBrandName(editingProduct.brandName || "");
      setCategory(editingProduct.category || "General");
      setTherapeuticClass(editingProduct.therapeuticClass || "");
      setDosageForm(editingProduct.dosageForm || "");
      setDosageVariant(editingProduct.dosageVariant || "");
      setIngredients(
        editingProduct.ingredients && editingProduct.ingredients.length > 0
          ? editingProduct.ingredients
          : [{ api: "", strength: "", unit: "mg", pharmacopeia: "BP" }],
      );
      setCustomComposition(editingProduct.composition || "");
      setPackaging(editingProduct.packaging || "");
      setMoq(editingProduct.moq ?? "");
      setUnitPrice(editingProduct.unitPrice ?? "");
      setCurrency(editingProduct.currency || "USD");
      setShelfLife(editingProduct.shelfLife || "24 Months");
      setStorageCondition(editingProduct.storageCondition || "");
      setDescription(editingProduct.description || "");
      setStatus(editingProduct.status || "ACTIVE");
    } else {
      setBrandName("");
      setCategory("");
      setTherapeuticClass("");
      setDosageForm("");
      setDosageVariant("");
      setIngredients([{ api: "", strength: "", unit: "mg", pharmacopeia: "BP" }]);
      setCustomComposition("");
      setPackaging("");
      setMoq("");
      setUnitPrice("");
      setCurrency("USD");
      setShelfLife("");
      setStorageCondition("");
      setDescription("");
      setStatus("ACTIVE");
    }
  }, [editingProduct, open, dosageForms]);

  // Selected Dosage Form's Variants from DB
  const currentVariants = useMemo(() => {
    const found = dosageForms.find((df) => df.name.toLowerCase() === dosageForm.toLowerCase());
    return found?.variants ?? [];
  }, [dosageForms, dosageForm]);

  // Live Computed Composition
  const liveComposition = useMemo(() => {
    return computeLiveComposition(ingredients, dosageVariant, dosageForm);
  }, [ingredients, dosageVariant, dosageForm]);

  // Ingredient Helpers
  const addIngredient = () => {
    setIngredients((prev) => [...prev, { api: "", strength: "", unit: "mg", pharmacopeia: "BP" }]);
  };

  const removeIngredient = (idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateIngredient = (idx: number, field: keyof ProductIngredient, val: string) => {
    setIngredients((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      toast.error("Brand / Trade name is required");
      return;
    }
    if (!dosageForm.trim()) {
      toast.error("Dosage form (Level 1) is required");
      return;
    }

    const validIngredients = ingredients.filter((ing) => ing.api?.trim());

    const dto: ProductRequestDto = {
      brandName: brandName.trim(),
      category: category.trim(),
      therapeuticClass: therapeuticClass.trim() || undefined,
      dosageForm: dosageForm.trim(),
      dosageVariant: dosageVariant.trim() || undefined,
      ingredients: validIngredients,
      customComposition: customComposition.trim() || liveComposition,
      packaging: packaging.trim() || undefined,
      moq: typeof moq === "number" ? moq : undefined,
      unitPrice: typeof unitPrice === "number" ? unitPrice : undefined,
      currency,
      shelfLife: shelfLife.trim() || undefined,
      storageCondition: storageCondition.trim() || undefined,
      description: description.trim() || undefined,
      status,
    };

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        const savedProduct = await updateProduct(editingProduct.id, dto);
        toast.success("Product updated successfully");
        onSaved(savedProduct);
      } else {
        const savedProduct = await createProduct(dto);
        toast.success("Product created successfully");
        onSaved(savedProduct);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast.error("Failed to save product: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0 sm:w-[92vw] sm:max-w-2xl sm:h-[88vh] sm:rounded-2xl flex flex-col p-0 overflow-hidden shadow-2xl">
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 shrink-0 border-b border-border/40 bg-muted/20">
          <DialogTitle className="text-lg font-semibold">
            {editingProduct ? "Edit Product" : "Add New Product"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {editingProduct
              ? `Editing ${editingProduct.brandName} (${editingProduct.productCode})`
              : "Fill in the details below. Product code will be auto-generated."}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            {/* ── Section 1: Product Classification ── */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold">Product Classification</legend>

              <div className="surface flex items-center gap-3 p-3 rounded-lg">
                <span className="text-xs font-medium text-muted-foreground">Product Code</span>
                <span className="text-sm font-semibold font-mono">
                  {editingProduct ? editingProduct.productCode : "—"}
                </span>
                {!editingProduct && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {"Auto-assigned on save"}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand / Trade Name *</Label>
                  <Input
                    id="brandName"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Nourish-Paraxil Extra"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Therapeutic Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="therapeuticClass">Therapeutic Sub-Class / ATC</Label>
                  <Input
                    id="therapeuticClass"
                    value={therapeuticClass}
                    onChange={(e) => setTherapeuticClass(e.target.value)}
                    placeholder="e.g. NSAID / Antipyretic"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Product Status</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as ProductStatus)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="UNDER_DEVELOPMENT">In Development</SelectItem>
                      <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>

            <Separator />

            {/* ── Section 2: Dosage Form ── */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold">Dosage Form *</legend>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dosageForm">Dosage Form (Level 1)</Label>
                  <Select
                    value={dosageForm}
                    onValueChange={(val) => {
                      setDosageForm(val);
                      const found = dosageForms.find(
                        (df) => df.name.toLowerCase() === val.toLowerCase(),
                      );
                      setDosageVariant(found?.variants?.[0]?.name || "");
                    }}
                  >
                    <SelectTrigger id="dosageForm">
                      <SelectValue placeholder="Choose from the drop down" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {dosageForms.map((df) => (
                        <SelectItem key={df.id || df.name} value={df.name}>
                          {df.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosageVariant">Dosage Variant (Level 2)</Label>
                  <Select
                    value={dosageVariant}
                    onValueChange={setDosageVariant}
                    disabled={currentVariants.length === 0}
                  >
                    <SelectTrigger id="dosageVariant">
                      <SelectValue
                        placeholder={
                          currentVariants.length === 0
                            ? "Select dosage form first"
                            : "Choose variant"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {currentVariants.map((v) => (
                        <SelectItem key={v.name} value={v.name}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>

            <Separator />

            {/* ── Section 3: Generic Name / APIs ── */}
            <fieldset className="space-y-4">
              <div className="flex items-center justify-between">
                <legend className="text-sm font-semibold">Generic Name *</legend>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addIngredient}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="size-3.5" /> Add API
                </Button>
              </div>

              {/* Table header */}
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="grid grid-cols-12 gap-0 bg-muted/40 border-b border-border/60 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-4">API (Active Drug Name)</div>
                  <div className="col-span-3">Strength</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-2">Pharmacopeia</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="divide-y divide-border/40">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5">
                      <div className="col-span-4">
                        <Input
                          value={ing.api}
                          onChange={(e) => updateIngredient(idx, "api", e.target.value)}
                          placeholder="e.g. Paracetamol"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          value={ing.strength}
                          onChange={(e) => updateIngredient(idx, "strength", e.target.value)}
                          placeholder="e.g. 500"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={ing.unit || "mg"}
                          onValueChange={(val) => updateIngredient(idx, "unit", val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map((u) => (
                              <SelectItem key={u} value={u} className="text-xs">
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={ing.pharmacopeia || "BP"}
                          onValueChange={(val) => updateIngredient(idx, "pharmacopeia", val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PHARMACOPEIA_OPTIONS.map((p) => (
                              <SelectItem key={p} value={p} className="text-xs">
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          disabled={ingredients.length <= 1}
                          onClick={() => removeIngredient(idx)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-generated Composition */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Composition (if)
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Auto-generated from Dosage Form + Variant + Generic Name
                  </span>
                </Label>
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground min-h-[40px]">
                  {liveComposition || (
                    <span className="text-muted-foreground italic text-xs">
                      Will auto-generate once you select dosage form and enter API ingredients
                    </span>
                  )}
                </div>
              </div>
            </fieldset>

            <Separator />

            {/* ── Section 4: Packaging & Commercial Terms ── */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold">Packaging & Commercial Terms</legend>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="packaging">Packaging Presentation</Label>
                  <Input
                    id="packaging"
                    value={packaging}
                    onChange={(e) => setPackaging(e.target.value)}
                    placeholder="e.g. 10x10 Alu-Alu Blister"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shelfLife">Shelf Life</Label>
                  <Input
                    id="shelfLife"
                    value={shelfLife}
                    onChange={(e) => setShelfLife(e.target.value)}
                    placeholder="e.g. 24 Months"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moq">Minimum Order Qty (MOQ)</Label>
                  <Input
                    id="moq"
                    type="number"
                    value={moq}
                    onChange={(e) => setMoq(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) =>
                      setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="e.g. 1.25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storageCondition">Storage Conditions</Label>
                <Input
                  id="storageCondition"
                  value={storageCondition}
                  onChange={(e) => setStorageCondition(e.target.value)}
                  placeholder="e.g. Store below 25°C in a dry place. Protect from light."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Clinical Indications / Notes</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key indications, pharmacology notes, or export compliance criteria..."
                />
              </div>
            </fieldset>
          </form>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-6 py-4 shrink-0 border-t border-border/40 bg-background flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="product-form"
            disabled={isSubmitting}
            className="w-full sm:w-auto gap-1.5"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? "Saving…" : editingProduct ? "Save Changes" : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DOSAGE FORM & VARIANT DATABASE CONFIGURATION MODAL
// ══════════════════════════════════════════════════════════════════════════════

function DosageConfigDialog({
  open,
  onOpenChange,
  dosageForms,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dosageForms: DosageForm[];
  onChanged: () => void;
}) {
  const [selectedForm, setSelectedForm] = useState<DosageForm | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [variantsList, setVariantsList] = useState<string[]>([]);
  const [newVariantInput, setNewVariantInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    if (dosageForms.length > 0 && !selectedForm && !isCreatingNew) {
      setSelectedForm(dosageForms[0] ?? null);
    }
  }, [dosageForms, selectedForm, isCreatingNew]);

  useEffect(() => {
    if (selectedForm && !isCreatingNew) {
      setFormName(selectedForm.name);
      setFormDesc(selectedForm.description || "");
      setVariantsList(selectedForm.variants?.map((v) => v.name) || []);
    } else if (isCreatingNew) {
      setFormName("");
      setFormDesc("");
      setVariantsList([]);
    }
  }, [selectedForm, isCreatingNew]);

  const handleAddVariant = () => {
    if (!newVariantInput.trim()) return;
    if (!variantsList.includes(newVariantInput.trim())) {
      setVariantsList((prev) => [...prev, newVariantInput.trim()]);
    }
    setNewVariantInput("");
  };

  const handleRemoveVariant = (name: string) => {
    setVariantsList((prev) => prev.filter((v) => v !== name));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Dosage form name is required");
      return;
    }

    const payload: DosageFormRequestDto = {
      name: formName.trim(),
      description: formDesc.trim() || undefined,
      active: true,
      variants: variantsList.map((v) => ({ name: v, active: true })),
      sortOrder: selectedForm ? selectedForm.sortOrder : 0,
    };

    setIsSaving(true);
    try {
      if (isCreatingNew) {
        await createDosageForm(payload);
        toast.success("Dosage form created in database");
        setIsCreatingNew(false);
      } else if (selectedForm) {
        await updateDosageForm(selectedForm.id, payload);
        toast.success("Dosage form and variants updated");
      }
      onChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error("Error saving dosage form: " + msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="size-5 text-primary" />
            Database-Configured Dosage Forms & Variants
          </DialogTitle>
          <DialogDescription>
            Configure Level 1 Dosage Forms and Level 2 Variants directly in the backend MongoDB
            database.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
          {/* Left Column: List of Forms in DB */}
          <div className="md:col-span-5 rounded-xl border border-border/70 surface p-3 flex flex-col h-[260px] md:h-[480px]">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dosage Forms ({dosageForms.length})
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  setIsCreatingNew(true);
                  setSelectedForm(null);
                }}
              >
                <Plus className="size-3" /> Add Form
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pt-2 pr-1">
              {dosageForms.map((df) => (
                <button
                  key={df.id}
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setSelectedForm(df);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between",
                    !isCreatingNew && selectedForm?.id === df.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-secondary/60 text-foreground",
                  )}
                >
                  <span>{df.name}</span>
                  <Badge
                    variant={!isCreatingNew && selectedForm?.id === df.id ? "secondary" : "outline"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {df.variants?.length || 0} variants
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Edit selected form & variants */}
          <div className="md:col-span-7 rounded-xl border border-border/70 surface p-4 flex flex-col justify-between space-y-4 md:h-[480px]">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isCreatingNew
                    ? "New Dosage Form (Level 1)"
                    : "Edit " + (selectedForm?.name || "")}
                </h4>
                {!isCreatingNew && selectedForm && (
                  <Badge variant="outline" className="text-[10px]">
                    ID: {selectedForm.id}
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dfName" className="text-xs">
                  Dosage Form Name (Level 1)
                </Label>
                <Input
                  id="dfName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Syrup, Injection, Medicated Film"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dfDesc" className="text-xs">
                  Description
                </Label>
                <Input
                  id="dfDesc"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Viscous liquid formulation for oral use"
                  className="h-8 text-xs"
                />
              </div>

              {/* Level 2 Variants Builder */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label className="text-xs flex items-center justify-between">
                  <span>Level 2 Dosage Variants</span>
                  <span className="text-[10px] text-muted-foreground">
                    {variantsList.length} configured
                  </span>
                </Label>

                <div className="flex items-center gap-1.5">
                  <Input
                    value={newVariantInput}
                    onChange={(e) => setNewVariantInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddVariant();
                      }
                    }}
                    placeholder="Enter variant name (e.g. Sugar Free Syrup)..."
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={handleAddVariant}
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-lg bg-secondary/30 border border-border/50">
                  {variantsList.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground p-1">
                      No Level 2 variants added yet.
                    </p>
                  ) : (
                    variantsList.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-xs font-medium text-foreground border border-border/60"
                      >
                        {v}
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(v)}
                          className="hover:text-destructive transition-colors ml-0.5"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:gap-3 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="button" size="sm" disabled={isSaving} onClick={handleSave}>
                {isSaving ? "Saving…" : "Save to Database"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
