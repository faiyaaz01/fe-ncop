import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchClient, updateClient } from "@/lib/client-api";
import type { ClientRequestDto } from "@/lib/client-types";
import { ClientFormView, formToDto } from "./_shell.clients";
import { SectionLoader } from "@/components/kit";

export const Route = createFileRoute("/_shell/clients_/$clientId/edit")({
  component: ClientEditRoute,
});
function ClientEditRoute() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: client, isLoading } = useQuery({
    queryKey: ["clients", clientId],
    queryFn: () => fetchClient(clientId),
  });
  const save = useMutation({
    mutationFn: (dto: ClientRequestDto) => updateClient(clientId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      navigate({ to: "/clients/$clientId", params: { clientId } });
    },
  });
  if (isLoading || !client) return <SectionLoader />;
  return (
    <ClientFormView
      onClose={() => navigate({ to: "/clients" })}
      editingClient={client}
      isSubmitting={save.isPending}
      onSubmit={(values) => save.mutate(formToDto(values))}
    />
  );
}
