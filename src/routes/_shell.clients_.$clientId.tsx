import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Building2,
  ChevronLeft,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Panel } from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentViewerDialog } from "@/components/document-viewer-dialog";
import {
  deleteClient,
  deleteDocument,
  fetchClient,
  getDocumentDownloadUrl,
  getDocumentViewUrl,
} from "@/lib/client-api";
import type { ClientDocument, DocumentType } from "@/lib/client-types";
import {
  ADDRESS_TYPE_LABELS,
  CLIENT_LEVEL_LABELS,
  CUSTOMER_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
} from "@/lib/client-types";

export const Route = createFileRoute("/_shell/clients_/$clientId")({ component: ClientDetail });

const ALL_DOCUMENTS = "ALL" as const;
type DocumentFilter = DocumentType | typeof ALL_DOCUMENTS;

function ClientDetail() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [documentFilter, setDocumentFilter] = useState<DocumentFilter>(ALL_DOCUMENTS);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<ClientDocument | null>(null);

  const {
    data: client,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["clients", clientId], queryFn: () => fetchClient(clientId) });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "client-count"] });
      toast.success("Client deleted successfully");
      navigate({ to: "/clients" });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete client: ${error.message}`);
      setDeleteConfirmOpen(false);
    },
  });

  if (pathname.endsWith("/edit")) return <Outlet />;
  if (isLoading) return <ClientDetailSkeleton />;
  if (isError || !client) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-12">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/clients" })}>
          <ChevronLeft className="size-4" /> Back to clients
        </Button>
      </div>
    );
  }

  const addresses = client.addresses ?? [];
  const contacts = client.pointOfContacts ?? [];
  const documents = (client.documents ?? []).filter(
    (document): document is ClientDocument & { id: string } => Boolean(document.id),
  );
  const selectedDocuments =
    documentFilter === ALL_DOCUMENTS
      ? documents
      : documents.filter((document) => document.documentType === documentFilter);
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

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteDocument(client.id, documentId);
      toast.success("Document removed from dossier");
      queryClient.invalidateQueries({ queryKey: ["clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (error: unknown) {
      toast.error(`Failed to remove document: ${error instanceof Error ? error.message : "Delete failed"}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Button variant="outline" onClick={() => navigate({ to: "/clients" })}>
          <ChevronLeft className="size-4" /> Back to clients
        </Button>
      </div>

      <PageHeader
        eyebrow={client.customerCode}
        title={client.companyName}
        description={client.tradeName || CUSTOMER_TYPE_LABELS[client.customerType]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="px-2.5 py-1 text-xs font-semibold">
              {CLIENT_LEVEL_LABELS[client.clientLevel]}
            </Badge>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                navigate({ to: "/clients/$clientId/edit", params: { clientId: client.id } })
              }
            >
              <Pencil className="size-4" /> Edit
            </Button>
            <Button variant="destructive" className="gap-2" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Panel>
            <DetailHeading icon={<Building2 className="size-4 text-primary" />} title="Company Information" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DetailTile label="Client type" value={CUSTOMER_TYPE_LABELS[client.customerType]} />
              <DetailTile label="Customer code" value={client.customerCode} />
              <DetailTile label="Client tier" value={CLIENT_LEVEL_LABELS[client.clientLevel]} />
              {client.tradeName && <DetailTile label="Trade name" value={client.tradeName} />}
              <DetailTile
                label="Annual turnover"
                value={client.annualTurnover != null ? client.annualTurnover.toLocaleString("en-IN") : "—"}
              />
            </div>
          </Panel>

          <Panel>
            <DetailHeading icon={<MapPin className="size-4 text-primary" />} title="Registered Addresses" />
            {addresses.length ? (
              <div className="space-y-3">
                {addresses.map((address, index) => (
                  <div key={address.id ?? index} className="rounded-xl border border-border/60 bg-secondary/40 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {ADDRESS_TYPE_LABELS[address.type]} address
                    </p>
                    <p className="mt-2 flex items-start gap-2 text-sm font-medium text-foreground">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{[address.line1, address.line2, address.city, address.state, address.pinCode, address.country].filter(Boolean).join(", ")}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyDossierCopy copy="No registered addresses have been added." />
            )}
          </Panel>

          <Panel>
            <DetailHeading icon={<Users className="size-4 text-primary" />} title="Points of Contact" />
            {contacts.length ? (
              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <div key={contact.id ?? index} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-secondary/40 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{contact.personName}</p>
                        {contact.primary && <Badge className="text-[10px]">Primary</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[contact.designation, contact.department].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground sm:text-right">
                      {contact.email && <p>{contact.email}</p>}
                      {contact.phone && <p className="flex items-center gap-1 sm:justify-end"><Phone className="size-3.5" /> {contact.phone}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyDossierCopy copy="No points of contact have been added." />
            )}
          </Panel>

          {paymentDetails.length > 0 && (
            <Panel>
              <DetailHeading icon={<FileText className="size-4 text-primary" />} title="Payment Terms" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {paymentDetails.map((item) => <DetailTile key={item.label} {...item} />)}
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Panel>
            <div className="mb-6 flex items-center justify-between gap-3">
              <DetailHeading icon={<FolderOpen className="size-4 text-primary" />} title="Client Dossier & Documents" className="mb-0" />
              <Badge variant="outline" className="shrink-0 text-xs font-semibold">
                {selectedDocuments.length} Shown
              </Badge>
            </div>

            <div className="mb-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Filter documents
                </label>
                <Select value={documentFilter} onValueChange={(value) => setDocumentFilter(value as DocumentFilter)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_DOCUMENTS}>All uploaded documents</SelectItem>
                    {DOCUMENT_TYPES.map((type) => <SelectItem key={type} value={type}>{DOCUMENT_TYPE_LABELS[type]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedDocuments.length ? (
              <div className="space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {documentFilter === ALL_DOCUMENTS
                    ? "All uploaded files"
                    : `Attached files · ${DOCUMENT_TYPE_LABELS[documentFilter]}`}
                </h3>
                {selectedDocuments.map((document) => (
                  <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 surface p-3 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="rounded-lg bg-primary/10 p-2 text-primary"><FileText className="size-5" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" title={DOCUMENT_TYPE_LABELS[document.documentType]}>{DOCUMENT_TYPE_LABELS[document.documentType]}</p>
                        <p className="truncate text-xs text-muted-foreground" title={document.originalFileName || document.fileName}>{document.originalFileName || document.fileName || "Document"}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border/40 bg-secondary/50 p-0.5">
                      <button type="button" onClick={() => setViewingDoc(document)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-background hover:text-foreground" title="View document"><ExternalLink className="size-4" /></button>
                      <a href={getDocumentDownloadUrl(client.id, document.id)} download className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-background hover:text-foreground" title="Download document"><Download className="size-4" /></a>
                      <Button variant="ghost" size="icon" className="size-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteDocument(document.id)} title="Delete document"><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-secondary/20 px-4 py-10 text-center">
                <FolderOpen className="mb-3 size-10 text-muted-foreground/30" />
                <p className="text-sm font-medium">
                  {documentFilter === ALL_DOCUMENTS
                    ? "No documents attached"
                    : `No ${DOCUMENT_TYPE_LABELS[documentFilter]} files attached`}
                </p>
                <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                  {documentFilter === ALL_DOCUMENTS
                    ? "Documents can be added from Edit Client."
                    : "Choose a different filter to view its files."}
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border/60 bg-background p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold">Delete Client</h3>
            <p className="mb-6 text-sm text-muted-foreground">Are you sure you want to delete <strong className="text-foreground">{client.companyName}</strong>? Attached dossier documents will also be removed. Clients with existing RFQs cannot be deleted.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteMutation.isPending}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
                Yes, Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <DocumentViewerDialog
        open={!!viewingDoc}
        onOpenChange={(open) => !open && setViewingDoc(null)}
        viewUrl={viewingDoc?.id ? getDocumentViewUrl(client.id, viewingDoc.id) : undefined}
        downloadUrl={viewingDoc?.id ? getDocumentDownloadUrl(client.id, viewingDoc.id) : undefined}
        document={viewingDoc}
        typeLabel={viewingDoc ? DOCUMENT_TYPE_LABELS[viewingDoc.documentType] : undefined}
      />
    </div>
  );
}

function DetailHeading({ icon, title, className = "" }: { icon: React.ReactNode; title: string; className?: string }) {
  return <div className={`mb-4 flex items-center gap-2 ${className}`}><span>{icon}</span><h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h2></div>;
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border/60 surface p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium text-foreground">{value}</p></div>;
}

function EmptyDossierCopy({ copy }: { copy: string }) {
  return <p className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">{copy}</p>;
}

function ClientDetailSkeleton() {
  return <div className="space-y-6 pb-12" aria-busy="true" aria-label="Loading client details"><Skeleton className="h-9 w-36" /><div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="space-y-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-9 w-72 max-w-full" /><Skeleton className="h-4 w-44" /></div><div className="flex gap-2"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-20" /></div></div><div className="grid gap-6 lg:grid-cols-12"><div className="space-y-6 lg:col-span-7"><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /><Skeleton className="h-56 w-full rounded-xl" /></div><Skeleton className="h-[480px] w-full rounded-xl lg:col-span-5" /></div></div>;
}
