import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionLoader } from "@/components/kit";
import { fetchClient } from "@/lib/client-api";

export const Route = createFileRoute("/_shell/clients_/$clientId")({ component: ClientDetail });

function ClientDetail() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const {
    data: client,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["clients", clientId], queryFn: () => fetchClient(clientId) });
  if (pathname.endsWith("/edit")) return <Outlet />;
  if (isLoading) return <SectionLoader />;
  if (isError || !client)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Button variant="outline" onClick={() => navigate({ to: "/clients" })}>
          <ChevronLeft className="size-4" /> Back to clients
        </Button>
      </div>
    );
  const contact = client.pointOfContacts?.[0];
  const address = client.addresses?.[0];
  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate({ to: "/clients" })}>
        <ChevronLeft className="size-4" /> Back to clients
      </Button>
      <PageHeader
        eyebrow={client.customerCode}
        title={client.companyName}
        description={client.tradeName || "Client dossier"}
      />
      <Panel className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Item label="Client type" value={client.customerType} />
        <Item label="Primary contact" value={contact?.personName || "—"} />
        <Item label="Email" value={contact?.email || "—"} />
        <Item label="Location" value={address ? `${address.city}, ${address.country}` : "—"} />
        <Item label="Annual turnover" value={client.annualTurnover?.toLocaleString() || "—"} />
        <Item label="Documents" value={String(client.documents?.length || 0)} />
      </Panel>
    </div>
  );
}
function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
