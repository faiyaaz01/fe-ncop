import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDosageForms, fetchProductById } from "@/lib/product-api";
import { ProductFormDialog } from "./_shell.products";
import { SectionLoader } from "@/components/kit";

export const Route = createFileRoute("/_shell/products_/$productId/edit")({
  component: ProductEditRoute,
});
function ProductEditRoute() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: product, isLoading } = useQuery({
    queryKey: ["products", productId],
    queryFn: () => fetchProductById(productId),
  });
  const { data: dosageForms = [] } = useQuery({
    queryKey: ["dosage-forms"],
    queryFn: () => fetchDosageForms(false),
  });
  if (isLoading || !product) return <SectionLoader />;
  return (
    <ProductFormDialog
      open
      pageMode
      onOpenChange={() => navigate({ to: "/products/$productId", params: { productId } })}
      editingProduct={product}
      dosageForms={dosageForms}
      onSaved={() => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        navigate({ to: "/products/$productId", params: { productId } });
      }}
    />
  );
}
