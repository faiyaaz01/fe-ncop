import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-config";
import type { Client, DocumentType, BankDetail } from "@/lib/client-types";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from "@/lib/client-types";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/register-client/$id")({
  head: () => ({
    meta: [
      { title: "Complete Registration · NCOP" },
      { name: "description", content: "Upload documents and provide bank details to complete your client registration." },
    ],
  }),
  component: ClientRegistration,
});

// ─── API calls (no auth — public endpoints) ─────────────────────────────────

async function fetchClientPublic(id: string): Promise<Client> {
  const res = await fetch(apiUrl(`/api/clients/${id}`));
  if (!res.ok) throw new Error("Client not found");
  return res.json();
}

async function submitBankDetails(id: string, bankDetail: BankDetail): Promise<Client> {
  const res = await fetch(apiUrl(`/api/clients/${id}/register`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bankDetail }),
  });
  if (!res.ok) throw new Error("Failed to submit bank details");
  return res.json();
}

async function uploadDocument(id: string, file: File, documentType: DocumentType): Promise<Client> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentType", documentType);
  const res = await fetch(apiUrl(`/api/clients/${id}/documents`), {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload document");
  return res.json();
}

// ─── Bank Detail Form ────────────────────────────────────────────────────────

interface BankFormValues {
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  swiftCode: string;
}

// ─── Document Upload Layout ──────────────────────────────────────────────────

const DOC_LEFT: DocumentType[] = [
  "DRUG_LICENSE",
  "WHOLESALE_LICENSE",
  "WHO_GMP_COPY",
  "STATE_GMP_GLP_COPY",
  "NEUTRAL_CODE_CERTIFICATE",
  "LIST_OF_INTERNATIONAL_ACCREDITATION",
  "MSME_CERTIFICATE",
  "FIRM_REGISTRATION_CERTIFICATE",
];

const DOC_RIGHT: DocumentType[] = [
  "BANK_CHQ_LEAF",
  "IEC_CODE",
  "GST_RC_COPY",
  "PAN_CARD_COPY",
  "ADDRESS_PROOF_DOCS_COPY",
  "AADHAR_COPY",
  "CIN_COPY",
];

// ─── Main Component ──────────────────────────────────────────────────────────

function ClientRegistration() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const {
    data: client,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["client-registration", id],
    queryFn: () => fetchClientPublic(id),
  });

  const [uploadedDocs, setUploadedDocs] = useState<Set<DocumentType>>(new Set());
  const [uploadingDoc, setUploadingDoc] = useState<DocumentType | null>(null);
  const [bankSubmitted, setBankSubmitted] = useState(false);

  // Pre-populate uploaded docs from existing client data
  const existingDocs = client?.documents?.map((d) => d.documentType) ?? [];
  const allUploaded = new Set([...uploadedDocs, ...existingDocs]);

  const bankForm = useForm<BankFormValues>({
    defaultValues: {
      accountHolderName: client?.bankDetail?.accountHolderName ?? "",
      accountNumber: client?.bankDetail?.accountNumber ?? "",
      bankName: client?.bankDetail?.bankName ?? "",
      branchName: client?.bankDetail?.branchName ?? "",
      ifscCode: client?.bankDetail?.ifscCode ?? "",
      swiftCode: client?.bankDetail?.swiftCode ?? "",
    },
  });

  const bankMutation = useMutation({
    mutationFn: (values: BankFormValues) => submitBankDetails(id, values as BankDetail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-registration", id] });
      setBankSubmitted(true);
      toast.success("Bank details saved successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleDocUpload(docType: DocumentType, file: File) {
    setUploadingDoc(docType);
    try {
      await uploadDocument(id, file, docType);
      setUploadedDocs((prev) => new Set(prev).add(docType));
      queryClient.invalidateQueries({ queryKey: ["client-registration", id] });
      toast.success(`${DOCUMENT_TYPE_LABELS[docType]} uploaded`);
    } catch {
      toast.error(`Failed to upload ${DOCUMENT_TYPE_LABELS[docType]}`);
    } finally {
      setUploadingDoc(null);
    }
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError || !client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-foreground">Client Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The registration link may be invalid or expired. Please contact the sender.
          </p>
        </div>
      </div>
    );
  }

  const hasBankDetail = !!client.bankDetail?.accountNumber || bankSubmitted;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <img src="/NCOP.png" alt="NCOP" className="size-8" />
          <div>
            <h1 className="text-lg font-bold">Client Registration</h1>
            <p className="text-xs text-muted-foreground">
              {client.companyName} · {client.customerCode}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <div>
          <h2 className="text-xl font-bold">
            Complete Your Registration
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Please upload the required documents and provide your bank details below.
          </p>
        </div>

        {/* ── Document Uploads ── */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <FileText className="size-4" /> Attachments
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Left column */}
            <div className="space-y-2">
              {DOC_LEFT.map((docType) => (
                <DocUploadRow
                  key={docType}
                  docType={docType}
                  uploaded={allUploaded.has(docType)}
                  uploading={uploadingDoc === docType}
                  onUpload={(file) => handleDocUpload(docType, file)}
                />
              ))}
            </div>
            {/* Right column */}
            <div className="space-y-2">
              {DOC_RIGHT.map((docType) => (
                <DocUploadRow
                  key={docType}
                  docType={docType}
                  uploaded={allUploaded.has(docType)}
                  uploading={uploadingDoc === docType}
                  onUpload={(file) => handleDocUpload(docType, file)}
                />
              ))}
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Bank Details ── */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Building2 className="size-4" /> Bank Details
          </h3>

          {hasBankDetail ? (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-6">
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle2 className="size-5" />
                <span className="font-semibold">Bank details submitted</span>
              </div>
              {client.bankDetail && (
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Account Holder", client.bankDetail.accountHolderName],
                    ["Account No.", client.bankDetail.accountNumber],
                    ["Bank", client.bankDetail.bankName],
                    ["Branch", client.bankDetail.branchName],
                    ["IFSC", client.bankDetail.ifscCode],
                    ["SWIFT", client.bankDetail.swiftCode],
                  ].filter(([, v]) => v).map(([l, v]) => (
                    <div key={l}>
                      <dt className="text-xs text-muted-foreground">{l}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ) : (
            <form
              onSubmit={bankForm.handleSubmit((values) => bankMutation.mutate(values))}
              className="space-y-4 rounded-xl border p-6"
            >
              <p className="text-xs text-muted-foreground">
                All fields are required, including SWIFT code.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Holder Name *</Label>
                  <Input {...bankForm.register("accountHolderName", { required: true })} placeholder="Full name on account" />
                </div>
                <div className="space-y-2">
                  <Label>Account Number *</Label>
                  <Input {...bankForm.register("accountNumber", { required: true })} placeholder="Account number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name *</Label>
                  <Input {...bankForm.register("bankName", { required: true })} placeholder="e.g. HDFC Bank" />
                </div>
                <div className="space-y-2">
                  <Label>Branch Name *</Label>
                  <Input {...bankForm.register("branchName", { required: true })} placeholder="e.g. Andheri West" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>IFSC Code *</Label>
                  <Input {...bankForm.register("ifscCode", { required: true })} placeholder="e.g. HDFC0001234" />
                </div>
                <div className="space-y-2">
                  <Label>SWIFT Code *</Label>
                  <Input {...bankForm.register("swiftCode", { required: true })} placeholder="e.g. HDFCINCBBXXX" />
                </div>
              </div>
              <Button type="submit" disabled={bankMutation.isPending} className="w-full">
                {bankMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Save Bank Details
              </Button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

// ─── Document Upload Row ─────────────────────────────────────────────────────

function DocUploadRow({
  docType,
  uploaded,
  uploading,
  onUpload,
}: {
  docType: DocumentType;
  uploaded: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    if (!uploaded && !uploading) {
      inputRef.current?.click();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = ""; // reset input
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors",
        uploaded
          ? "border-accent/30 bg-accent/5"
          : "border-border hover:bg-secondary/50",
      )}
    >
      <span className={cn("truncate pr-2 font-medium", uploaded && "text-accent")}>
        {DOCUMENT_TYPE_LABELS[docType]}
      </span>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleFileChange}
      />
      {uploaded ? (
        <span className="flex items-center gap-1 text-xs text-accent">
          <CheckCircle2 className="size-3.5" /> Uploaded
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 text-xs"
          disabled={uploading}
          onClick={handleClick}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          Upload
        </Button>
      )}
    </div>
  );
}
