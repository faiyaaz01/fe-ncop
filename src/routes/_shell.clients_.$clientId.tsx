import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ChevronLeft, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchClient } from "@/lib/client-api";
import { ADDRESS_TYPE_LABELS, CUSTOMER_TYPE_LABELS } from "@/lib/client-types";

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
  if (isLoading) return <ClientDetailSkeleton />;
  if (isError || !client)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Button variant="outline" onClick={() => navigate({ to: "/clients" })}>
          <ChevronLeft className="size-4" /> Back to clients
        </Button>
      </div>
    );
  const addresses = client.addresses ?? [];
  const contacts = client.pointOfContacts ?? [];
  const paymentDetails = [
    client.paymentTerms?.advancePercent != null
      ? { label: "Advance", value: `${client.paymentTerms.advancePercent}%` }
      : null,
    client.paymentTerms?.beforeDispatchPercent != null
      ? { label: "Before dispatch", value: `${client.paymentTerms.beforeDispatchPercent}%` }
      : null,
    client.paymentTerms?.afterDispatchDays != null && client.paymentTerms.afterDispatchDays > 0
      ? { label: "After dispatch days", value: client.paymentTerms.afterDispatchDays.toString() }
      : null,
    client.paymentTerms?.afterDispatchPercent != null
      ? { label: "After dispatch", value: `${client.paymentTerms.afterDispatchPercent}%` }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={client.customerCode}
        title={client.companyName}
        description={client.tradeName}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/clients" })}>
              <ChevronLeft className="size-4" /> Back to clients
            </Button>
            <Button
              onClick={() =>
                navigate({ to: "/clients/$clientId/edit", params: { clientId: client.id } })
              }
            >
              <Pencil className="size-4" /> Edit
            </Button>
          </div>
        }
      />

      <Panel className="justify-start space-y-5 p-5 sm:p-6">
        <SectionHeading title="Company information" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Item label="Client type" value={CUSTOMER_TYPE_LABELS[client.customerType]} />
          <Item label="Customer code" value={client.customerCode} />
          {client.tradeName && <Item label="Trade name" value={client.tradeName} />}
          {client.annualTurnover != null && (
            <Item label="Annual turnover" value={client.annualTurnover.toLocaleString()} />
          )}
        </div>
      </Panel>

      {(addresses.length > 0 || contacts.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {addresses.length > 0 && (
            <Panel className="justify-start space-y-5 p-5 sm:p-6">
              <SectionHeading title="Addresses" />
              <div className="space-y-3">
                {addresses.map((address, index) => (
                  <div
                    key={address.id ?? index}
                    className="rounded-xl border border-border/70 bg-muted/20 p-4"
                  >
                    <p className="text-sm font-semibold">
                      {ADDRESS_TYPE_LABELS[address.type]} address
                    </p>
                    <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        {[
                          address.line1,
                          address.line2,
                          address.city,
                          address.state,
                          address.pinCode,
                          address.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {contacts.length > 0 && (
            <Panel className="justify-start space-y-5 p-5 sm:p-6">
              <SectionHeading title="Points of contact" />
              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <div
                    key={contact.id ?? index}
                    className="rounded-xl border border-border/70 bg-muted/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{contact.personName}</p>
                        {(contact.designation || contact.department) && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {[contact.designation, contact.department].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      {contact.primary && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      {contact.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="size-4" />
                          {contact.email}
                        </p>
                      )}
                      {contact.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="size-4" />
                          {contact.phone}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}

      {paymentDetails.length > 0 && (
        <Panel className="justify-start space-y-5 p-5 sm:p-6">
          <SectionHeading title="Payment terms" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {paymentDetails.map((item) => (
              <Item key={item.label} {...item} />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function SectionHeading({ title, icon }: { title: string; icon?: ReactNode }) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h2>
    </div>
  );
}

function ClientDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading client details">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      <Panel className="space-y-5 p-5 sm:p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-36" />
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailPanelSkeleton rows={3} />
        <DetailPanelSkeleton rows={2} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <DetailPanelSkeleton rows={2} compact />
        <DetailPanelSkeleton rows={3} compact />
      </div>

      <Panel className="space-y-5 p-5 sm:p-6">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-3 rounded-xl border border-border/70 p-4">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function DetailPanelSkeleton({ rows, compact = false }: { rows: number; compact?: boolean }) {
  return (
    <Panel className="space-y-5 p-5 sm:p-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-64 max-w-full" />
      <div className={compact ? "grid gap-4 sm:grid-cols-2" : "space-y-3"}>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className={compact ? "space-y-2" : "rounded-xl border border-border/70 p-4 space-y-2"}
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </Panel>
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
