import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader, StatusChip } from "@/components/kit";
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
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
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
  DosageForm,
  DosageFormRequestDto,
} from "@/lib/product-types";

export const Route = createFileRoute("/_shell/products")({
  head: () => ({
    meta: [
      { title: "Product Master · NCOP ERP" },
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
  dosageForm?: string
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
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [dosageConfigOpen, setDosageConfigOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Queries
  const { data: dosageForms = [] } = useQuery<DosageForm[]>({
    queryKey: ["dosage-forms"],
    queryFn: () => fetchDosageForms(false),
  });

  const { data: metrics } = useQuery({
    queryKey: ["product-metrics"],
    queryFn: fetchProductMetrics,
  });

  const {
    data: productsPage,
    isLoading: productsLoading,
  } = useQuery({
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
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-metrics"] });
      toast.success("Product deleted successfully");
      setDeleteConfirm(null);
      if (detailProduct?.id === deleteConfirm?.id) {
        setDetailProduct(null);
      }
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
        title="Product Master"
        subtitle="Manage pharmaceutical catalog, dosage forms, active pharmaceutical ingredients (APIs), and dossiers."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setDosageConfigOpen(true)}
              className="gap-2"
            >
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
            <p className="text-xs text-muted-foreground font-medium">Dosage Forms (DB)</p>
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

          {(search || categoryFilter !== "all" || dosageFilter !== "all" || statusFilter !== "all") && (
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
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="size-6 animate-spin text-primary" />
          </div>
        ) : productList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="size-12 rounded-full bg-secondary/80 flex items-center justify-center mb-3">
              <Boxes className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">No products found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              No product matches the current search and filter criteria. Try adjusting your filters or add a new product.
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
          <div className="overflow-x-auto min-w-[850px]">
            <table className="w-full border-collapse text-left text-sm">
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
                    onClick={() => setDetailProduct(product)}
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
                      <p className="text-xs font-medium text-foreground line-clamp-2" title={product.composition}>
                        {product.composition || "—"}
                      </p>
                      {product.ingredients && product.ingredients.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {product.ingredients.length} active API{product.ingredients.length > 1 ? "s" : ""}
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
                          onClick={() => setDetailProduct(product)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          title="Edit Product"
                          onClick={() => {
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

      {/* ── Slide-Over Product Detail Drawer ── */}
      <ProductDetailSheet
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onEdit={(p) => {
          setDetailProduct(null);
          setEditingProduct(p);
          setProductModalOpen(true);
        }}
        onDelete={(p) => {
          setDeleteConfirm({ id: p.id, name: p.brandName });
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
              Are you sure you want to delete <strong className="text-foreground">{deleteConfirm?.name}</strong>? This action will permanently remove the product and its attached dossiers from the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
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

function ProductFormDialog({
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
  onSaved: () => void;
}) {
  const [productCode, setProductCode] = useState("");
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
  const [storageCondition, setStorageCondition] = useState("Store below 25°C in a dry place. Protect from light.");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (editingProduct) {
      setProductCode(editingProduct.productCode || "");
      setBrandName(editingProduct.brandName || "");
      setCategory(editingProduct.category || "General");
      setTherapeuticClass(editingProduct.therapeuticClass || "");
      setDosageForm(editingProduct.dosageForm || "");
      setDosageVariant(editingProduct.dosageVariant || "");
      setIngredients(
        editingProduct.ingredients && editingProduct.ingredients.length > 0
          ? editingProduct.ingredients
          : [{ api: "", strength: "", unit: "mg", pharmacopeia: "BP" }]
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
      setProductCode("");
      setBrandName("");
      setCategory("Analgesics & Antipyretics");
      setTherapeuticClass("");
      const firstForm = dosageForms[0]?.name || "Tablet";
      setDosageForm(firstForm);
      const firstVariant = dosageForms[0]?.variants?.[0]?.name || "";
      setDosageVariant(firstVariant);
      setIngredients([{ api: "", strength: "", unit: "mg", pharmacopeia: "BP" }]);
      setCustomComposition("");
      setPackaging("10x10 Alu-Alu Blister");
      setMoq(5000);
      setUnitPrice("");
      setCurrency("USD");
      setShelfLife("24 Months");
      setStorageCondition("Store below 25°C in a dry place. Protect from light.");
      setDescription("");
      setStatus("ACTIVE");
    }
  }, [editingProduct, open, dosageForms]);

  // Selected Dosage Form's Variants from DB
  const currentVariants = useMemo(() => {
    const found = dosageForms.find(
      (df) => df.name.toLowerCase() === dosageForm.toLowerCase()
    );
    return found?.variants ?? [];
  }, [dosageForms, dosageForm]);

  // Live Computed Composition
  const liveComposition = useMemo(() => {
    return computeLiveComposition(ingredients, dosageVariant, dosageForm);
  }, [ingredients, dosageVariant, dosageForm]);

  // Ingredient Helpers
  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { api: "", strength: "", unit: "mg", pharmacopeia: "BP" },
    ]);
  };

  const removeIngredient = (idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateIngredient = (
    idx: number,
    field: keyof ProductIngredient,
    val: string
  ) => {
    setIngredients((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
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
      productCode: productCode.trim() || undefined,
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
        await updateProduct(editingProduct.id, dto);
        toast.success("Product updated successfully");
      } else {
        await createProduct(dto);
        toast.success("Product created successfully");
      }
      onSaved();
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Pill className="size-5 text-primary" />
            {editingProduct ? "Edit Product Specification" : "Create New Product Master"}
          </DialogTitle>
          <DialogDescription>
            Configure product classification, hierarchical dosage forms from database, active ingredients formulation, and commercial terms.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* ── Section 1: Classification & Dosage ── */}
          <div className="space-y-4 rounded-xl border border-border/70 p-4 surface">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Boxes className="size-3.5 text-primary" /> 1. Product Classification & Dosage Hierarchy
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="brandName" className="text-xs">
                  Brand / Trade Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Nourish-Paraxil Extra"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="productCode" className="text-xs">
                  Product Code / SKU (Auto-generated if left blank)
                </Label>
                <Input
                  id="productCode"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="e.g. PROD-000001"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs">
                  Therapeutic Category
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select Category" />
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

              <div className="space-y-1.5">
                <Label htmlFor="therapeuticClass" className="text-xs">
                  Therapeutic Sub-Class / ATC
                </Label>
                <Input
                  id="therapeuticClass"
                  value={therapeuticClass}
                  onChange={(e) => setTherapeuticClass(e.target.value)}
                  placeholder="e.g. NSAID / Antipyretic"
                />
              </div>
            </div>

            {/* Hierarchical DB-driven Dosage Form & Variant */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 border-t border-border/50">
              <div className="space-y-1.5">
                <Label htmlFor="dosageForm" className="text-xs flex items-center justify-between">
                  <span>Dosage Form (Level 1) <span className="text-destructive">*</span></span>
                  <span className="text-[10px] text-muted-foreground">From BE Database</span>
                </Label>
                <Select
                  value={dosageForm}
                  onValueChange={(val) => {
                    setDosageForm(val);
                    const found = dosageForms.find((df) => df.name.toLowerCase() === val.toLowerCase());
                    setDosageVariant(found?.variants?.[0]?.name || "");
                  }}
                >
                  <SelectTrigger id="dosageForm">
                    <SelectValue placeholder="Select Dosage Form" />
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

              <div className="space-y-1.5">
                <Label htmlFor="dosageVariant" className="text-xs flex items-center justify-between">
                  <span>Dosage Variant (Level 2)</span>
                  <span className="text-[10px] text-muted-foreground">Cascaded</span>
                </Label>
                <Select
                  value={dosageVariant}
                  onValueChange={setDosageVariant}
                  disabled={currentVariants.length === 0}
                >
                  <SelectTrigger id="dosageVariant">
                    <SelectValue placeholder={currentVariants.length === 0 ? "No variants available" : "Select Variant"} />
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
          </div>

          {/* ── Section 2: Active API Ingredients & Composition ── */}
          <div className="space-y-4 rounded-xl border border-border/70 p-4 surface">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FlaskConical className="size-3.5 text-primary" /> 2. Active Ingredients (APIs) & Formulation
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIngredient}
                className="h-7 text-xs gap-1"
              >
                <Plus className="size-3.5" /> Add API Ingredient
              </Button>
            </div>

            {/* Interactive Ingredient Table */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider">
                <div className="col-span-4">API (Active Drug Name) *</div>
                <div className="col-span-3">Strength</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-2">Pharmacopeia</div>
                <div className="col-span-1 text-center">Del</div>
              </div>

              {ingredients.map((ing, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Input
                      value={ing.api}
                      onChange={(e) => updateIngredient(idx, "api", e.target.value)}
                      placeholder="e.g. Paracetamol"
                      className="h-8 text-xs"
                      required
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

            {/* Live Auto-Reflected Composition Banner */}
            <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3.5" /> Auto-Generated Composition Formula
                </span>
                <span className="text-[10px] text-muted-foreground">Auto-calculated from Dosage + Ingredients</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {liveComposition || "Enter API ingredients and select dosage form to generate formula"}
              </p>
            </div>
          </div>

          {/* ── Section 3: Commercial Terms & Packaging ── */}
          <div className="space-y-4 rounded-xl border border-border/70 p-4 surface">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Package className="size-3.5 text-primary" /> 3. Packaging & Commercial Terms
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="packaging" className="text-xs">Packaging Presentation</Label>
                <Input
                  id="packaging"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  placeholder="e.g. 10x10 Alu-Alu Blister"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="moq" className="text-xs">Minimum Order Quantity (MOQ)</Label>
                <Input
                  id="moq"
                  type="number"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 5000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shelfLife" className="text-xs">Shelf Life</Label>
                <Input
                  id="shelfLife"
                  value={shelfLife}
                  onChange={(e) => setShelfLife(e.target.value)}
                  placeholder="e.g. 24 Months"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="unitPrice" className="text-xs">Unit Commercial Price</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 1.25"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency" className="text-xs">Currency</Label>
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

              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs">Product Status</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="storageCondition" className="text-xs">Storage Conditions</Label>
              <Input
                id="storageCondition"
                value={storageCondition}
                onChange={(e) => setStorageCondition(e.target.value)}
                placeholder="e.g. Store below 25°C in a dry place. Protect from light."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">Clinical Indications / Notes</Label>
              <Textarea
                id="description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key indications, pharmacology notes, or export compliance criteria..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving…"
                : editingProduct
                ? "Save Changes"
                : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCT DETAIL SLIDE-OVER SHEET
// ══════════════════════════════════════════════════════════════════════════════

function ProductDetailSheet({
  product,
  onClose,
  onEdit,
  onDelete,
}: {
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  const queryClient = useQueryClient();
  const [uploadDocType, setUploadDocType] = useState<ProductDocumentType>("ARTWORK");
  const [isUploading, setIsUploading] = useState(false);

  if (!product) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadProductDocument(product.id, file, uploadDocType);
      toast.success(DOCUMENT_TYPE_LABELS[uploadDocType] + " uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error("Failed to upload document: " + msg);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteProductDocument(product.id, docId);
      toast.success("Document removed from dossier");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error("Failed to delete document: " + msg);
    }
  };

  return (
    <Sheet open={!!product} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="glass w-full overflow-y-auto sm:max-w-xl p-0">
        {/* Header */}
        <div className="border-b border-border/70 p-6 space-y-3 bg-secondary/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="text-xs mb-1">
                {product.productCode}
              </Badge>
              <SheetTitle className="text-xl font-bold">{product.brandName}</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {product.category || "General"} · {product.therapeuticClass || "Pharmaceutical"}
              </p>
            </div>
            <StatusChip status={product.status as any} />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onEdit(product)}
            >
              <Pencil className="size-3.5" /> Edit Product
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(product)}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Composition & Formulation */}
          <div className="surface p-4 rounded-xl border border-border/70 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FlaskConical className="size-4 text-primary" /> Active Formulation & Composition
            </h4>
            <div className="rounded-lg bg-secondary/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Calculated Formula</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{product.composition || "—"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="surface p-2.5 rounded-lg border border-border/60">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dosage Form (Level 1)</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{product.dosageForm}</p>
              </div>
              <div className="surface p-2.5 rounded-lg border border-border/60">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dosage Variant (Level 2)</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{product.dosageVariant || "Standard"}</p>
              </div>
            </div>

            {/* Ingredients Table */}
            {product.ingredients && product.ingredients.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Active Drug Breakdown ({product.ingredients.length})
                </p>
                <div className="space-y-1.5">
                  {product.ingredients.map((ing, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 text-xs"
                    >
                      <span className="font-semibold text-foreground">{ing.api}</span>
                      <span className="text-muted-foreground">
                        {ing.strength} {ing.unit} · <strong className="text-foreground">{ing.pharmacopeia}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Commercial & Packaging */}
          <div className="surface p-4 rounded-xl border border-border/70 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Package className="size-4 text-primary" /> Packaging & Commercial Terms
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="surface p-2.5 rounded-lg border border-border/60">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Packaging Spec</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{product.packaging || "—"}</p>
              </div>

              <div className="surface p-2.5 rounded-lg border border-border/60">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Minimum Order (MOQ)</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">
                  {product.moq ? product.moq.toLocaleString() : "—"}
                </p>
              </div>

              <div className="surface p-2.5 rounded-lg border border-border/60">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Unit Commercial Price</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">
                  {product.unitPrice !== undefined ? (product.currency || "USD") + " " + product.unitPrice.toFixed(2) : "—"}
                </p>
              </div>

              <div className="surface p-2.5 rounded-lg border border-border/60">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Shelf Life</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{product.shelfLife || "—"}</p>
              </div>
            </div>

            {product.storageCondition && (
              <div className="rounded-lg bg-secondary/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Storage Conditions</p>
                <p className="text-xs text-foreground mt-0.5">{product.storageCondition}</p>
              </div>
            )}

            {product.description && (
              <div className="rounded-lg bg-secondary/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Indications / Description</p>
                <p className="text-xs text-foreground mt-0.5">{product.description}</p>
              </div>
            )}
          </div>

          {/* ── Document Dossier & Attachments (GCS) ── */}
          <div className="surface p-4 rounded-xl border border-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FolderOpen className="size-4 text-primary" /> Regulatory Dossier & Documents
              </h4>
              <Badge variant="outline" className="text-[10px]">
                {product.documents?.length || 0} Attached
              </Badge>
            </div>

            {/* Document Upload Control */}
            <div className="flex items-center gap-2 pt-1">
              <Select
                value={uploadDocType}
                onValueChange={(val) => setUploadDocType(val as ProductDocumentType)}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 pointer-events-none"
                  disabled={isUploading}
                >
                  <Upload className="size-3.5" />
                  {isUploading ? "Uploading…" : "Upload"}
                </Button>
              </label>
            </div>

            {/* Attached Documents List */}
            {product.documents && product.documents.length > 0 ? (
              <div className="space-y-2 pt-2">
                {product.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 surface text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="size-4 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">
                          {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {doc.originalFileName || doc.fileName} · {(doc.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex size-7 items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                        title="View Document inline"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                      <a
                        href={"/api/v1/products/" + product.id + "/documents/" + doc.id + "/download"}
                        download
                        className="inline-flex size-7 items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                        title="Download Document"
                      >
                        <Download className="size-3.5" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteDocument(doc.id)}
                        title="Delete Document"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No dossier files attached yet. Select a document type and click Upload.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
      setSelectedForm(dosageForms[0]);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="size-5 text-primary" />
            Database-Configured Dosage Forms & Variants
          </DialogTitle>
          <DialogDescription>
            Configure Level 1 Dosage Forms and Level 2 Variants directly in the backend MongoDB database.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
          {/* Left Column: List of Forms in DB */}
          <div className="md:col-span-5 rounded-xl border border-border/70 surface p-3 flex flex-col h-[380px]">
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
                      : "hover:bg-secondary/60 text-foreground"
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
          <div className="md:col-span-7 rounded-xl border border-border/70 surface p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isCreatingNew ? "New Dosage Form (Level 1)" : "Edit " + (selectedForm?.name || "")}
                </h4>
                {!isCreatingNew && selectedForm && (
                  <Badge variant="outline" className="text-[10px]">
                    ID: {selectedForm.id}
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dfName" className="text-xs">Dosage Form Name (Level 1)</Label>
                <Input
                  id="dfName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Syrup, Injection, Medicated Film"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dfDesc" className="text-xs">Description</Label>
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
                  <span className="text-[10px] text-muted-foreground">{variantsList.length} configured</span>
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
                    <p className="text-[11px] text-muted-foreground p-1">No Level 2 variants added yet.</p>
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

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? "Saving…" : "Save to Database"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
