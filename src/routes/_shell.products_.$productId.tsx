import { createFileRoute, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchProductById,
  deleteProduct,
  uploadProductDocument,
  deleteProductDocument,
  getProductDocumentViewUrl,
  getProductDocumentDownloadUrl,
} from "@/lib/product-api";
import type { Product, ProductDocument, ProductDocumentType } from "@/lib/product-types";
import { toast } from "sonner";
import { PageHeader, StatusChip, Panel } from "@/components/kit";
import { ProductDetailSkeleton } from "@/components/page-skeletons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Pencil,
  Trash2,
  FlaskConical,
  Package,
  FolderOpen,
  FileText,
  Upload,
  ExternalLink,
  Download,
  ArrowLeft,
  ChevronLeft,
  Loader2,
} from "lucide-react";

import { DocumentViewerDialog } from "@/components/document-viewer-dialog";

export const Route = createFileRoute("/_shell/products_/$productId")({
  component: ProductDetail,
});

const DOCUMENT_TYPE_LABELS: Record<ProductDocumentType, string> = {
  ARTWORK: "Packaging Artwork",
  COA: "Certificate of Analysis (COA)",
  STABILITY_DATA: "Stability Study Report",
  REGULATORY_APPROVAL: "Regulatory Approval / Certificate",
  MSDS: "Material Safety Data Sheet (MSDS)",
  OTHER: "Supplementary Dossier Document",
};

function ProductDetail() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const queryClient = useQueryClient();

  const [uploadDocType, setUploadDocType] = useState<ProductDocumentType>("ARTWORK");
  const [isUploading, setIsUploading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<ProductDocument | null>(null);

  // Queries
  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["products", productId],
    queryFn: () => fetchProductById(productId),
    refetchInterval: 3000,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-metrics"] });
      toast.success("Product deleted successfully");
      navigate({ to: "/products" });
    },
    onError: (err: Error) => {
      toast.error("Failed to delete product: " + err.message);
      setDeleteConfirmOpen(false);
    },
  });

  // This route owns the `/edit` child route. Render the child in place rather
  // than the product details whenever the edit URL is active.
  const isEditing = !!matchRoute({
    to: "/products/$productId/edit",
    params: { productId },
    fuzzy: false,
  });

  if (isEditing) return <Outlet />;

  if (isLoading) return <ProductDetailSkeleton />;
  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/products" })}>
          <ArrowLeft className="mr-2 size-4" /> Back to Products
        </Button>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadProductDocument(product.id, file, uploadDocType);
      toast.success(DOCUMENT_TYPE_LABELS[uploadDocType] + " uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
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
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error("Failed to delete document: " + msg);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Button variant="outline" onClick={() => navigate({ to: "/products" })}>
          <ChevronLeft className="size-4" /> Back to products
        </Button>
      </div>

      <PageHeader
        eyebrow={product.productCode}
        title={product.brandName}
        description={`${product.category || "General"} · ${product.therapeuticClass || "Pharmaceutical"}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusChip status={product.status} />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                navigate({
                  to: "/products/$productId/edit",
                  params: { productId: product.id },
                })
              }
            >
              <Pencil className="size-4" /> Edit
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Information) */}
        <div className="lg:col-span-7 space-y-6">
          <Panel>
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Active Formulation & Composition
              </h3>
            </div>
            <div className="rounded-lg bg-secondary/60 p-4 border border-border/40">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Calculated Formula
              </p>
              <p className="text-base font-medium text-foreground mt-1">
                {product.composition || "—"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="surface p-4 rounded-xl border border-border/60 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Dosage Form (Level 1)
                </p>
                <p className="text-sm font-medium text-foreground mt-1">{product.dosageForm}</p>
              </div>
              <div className="surface p-4 rounded-xl border border-border/60 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Dosage Variant (Level 2)
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {product.dosageVariant || "Standard"}
                </p>
              </div>
            </div>

            {/* Ingredients Table */}
            {product.ingredients && product.ingredients.length > 0 && (
              <div className="pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Active Drug Breakdown ({product.ingredients.length})
                </p>
                <div className="space-y-2">
                  {product.ingredients.map((ing, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/40 text-sm shadow-sm"
                    >
                      <span className="font-semibold text-foreground">{ing.api}</span>
                      <span className="text-muted-foreground font-medium">
                        {ing.strength} {ing.unit} ·{" "}
                        <strong className="text-foreground">{ing.pharmacopeia}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 mb-4">
              <Package className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Packaging & Commercial Terms
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="surface p-4 rounded-xl border border-border/60 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Packaging Spec
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {product.packaging || "—"}
                </p>
              </div>

              <div className="surface p-4 rounded-xl border border-border/60 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Minimum Order (MOQ)
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {product.moq ? product.moq.toLocaleString() : "—"}
                </p>
              </div>

              <div className="surface p-4 rounded-xl border border-border/60 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Unit Commercial Price
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {product.unitPrice != null
                    ? (product.currency || "USD") + " " + product.unitPrice.toFixed(2)
                    : "—"}
                </p>
              </div>

              <div className="surface p-4 rounded-xl border border-border/60 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Shelf Life
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {product.shelfLife || "—"}
                </p>
              </div>
            </div>

            {product.storageCondition && (
              <div className="mt-4 rounded-xl bg-secondary/40 border border-border/40 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Storage Conditions
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {product.storageCondition}
                </p>
              </div>
            )}

            {product.description && (
              <div className="mt-4 rounded-xl bg-secondary/40 border border-border/40 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Indications / Description
                </p>
                <p className="text-sm text-foreground mt-1 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}
          </Panel>
        </div>

        {/* Right Column (Documents & Dossier) */}
        <div className="lg:col-span-5 space-y-6">
          <Panel>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FolderOpen className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Regulatory Dossier & Documents
                </h3>
              </div>
              <Badge variant="outline" className="text-xs font-semibold py-0.5">
                {product.documents?.length || 0} Attached
              </Badge>
            </div>

            {/* Document Upload Control */}
            <div className="flex flex-col gap-3 mb-6">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Upload New Document
              </label>
              <div className="flex items-center gap-2">
                <Select
                  value={uploadDocType}
                  onValueChange={(val) => setUploadDocType(val as ProductDocumentType)}
                >
                  <SelectTrigger className="h-10 text-sm flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-sm">
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
                    variant="outline"
                    className="h-10 px-4 text-sm gap-2 pointer-events-none whitespace-nowrap bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </label>
              </div>
            </div>

            {/* Attached Documents List */}
            {product.documents && product.documents.length > 0 ? (
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Attached Files
                </h5>
                {product.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/60 surface shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1 pr-2">
                        <p
                          className="text-sm font-semibold text-foreground truncate"
                          title={DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                        >
                          {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                        </p>
                        <p
                          className="text-xs text-muted-foreground truncate"
                          title={doc.originalFileName || doc.fileName}
                        >
                          {doc.originalFileName || doc.fileName}{" "}
                          <span className="opacity-50 mx-1">•</span>{" "}
                          {(doc.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 bg-secondary/50 rounded-lg p-0.5 border border-border/40">
                      <button
                        type="button"
                        onClick={() => setViewingDoc(doc)}
                        className="inline-flex size-8 items-center justify-center rounded-md hover:bg-background hover:shadow-sm text-muted-foreground hover:text-foreground transition-all"
                        title="View Document inline"
                      >
                        <ExternalLink className="size-4" />
                      </button>
                      <a
                        href={getProductDocumentDownloadUrl(product.id, doc.id)}
                        download
                        className="inline-flex size-8 items-center justify-center rounded-md hover:bg-background hover:shadow-sm text-muted-foreground hover:text-foreground transition-all"
                        title="Download Document"
                      >
                        <Download className="size-4" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        onClick={() => handleDeleteDocument(doc.id)}
                        title="Delete Document"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-border/60 rounded-xl bg-secondary/20">
                <FolderOpen className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">No dossier files attached</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  Select a document type and upload relevant files to build the dossier.
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-xl p-6 shadow-xl w-[90vw] max-w-md border border-border/60">
            <h3 className="text-lg font-bold text-foreground mb-2">Delete Product</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{product.brandName}</strong>? This action
              cannot be undone and will remove all associated dossier documents.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(product.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="size-4 mr-2" />
                )}
                Yes, Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      <DocumentViewerDialog
        open={!!viewingDoc}
        onOpenChange={(o) => !o && setViewingDoc(null)}
        viewUrl={viewingDoc ? getProductDocumentViewUrl(product.id, viewingDoc.id) : undefined}
        downloadUrl={
          viewingDoc ? getProductDocumentDownloadUrl(product.id, viewingDoc.id) : undefined
        }
        document={viewingDoc}
        typeLabel={viewingDoc ? DOCUMENT_TYPE_LABELS[viewingDoc.documentType] : undefined}
      />
    </div>
  );
}
