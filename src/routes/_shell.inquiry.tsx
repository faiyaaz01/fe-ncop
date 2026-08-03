import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CloudUpload, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatusChip } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clients, currencies, incoterms, products } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/inquiry")({
  head: () => ({
    meta: [
      { title: "Customer Inquiry · Medivance CRM" },
      {
        name: "description",
        content:
          "Guided RFQ intake: general info, product details, commercial terms, attachments and review before submission.",
      },
      { property: "og:title", content: "Customer Inquiry · Medivance CRM" },
      {
        property: "og:description",
        content: "Multi-step pharmaceutical RFQ intake wizard with review and submission.",
      },
    ],
  }),
  component: InquiryWizard,
});

const steps = [
  { id: 1, label: "General Info" },
  { id: 2, label: "Product Details" },
  { id: 3, label: "Commercial Info" },
  { id: 4, label: "Attachments" },
  { id: 5, label: "Review" },
];

function InquiryWizard() {
  const [step, setStep] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([
    { name: "Target_Specification.pdf", size: "1.1 MB" },
    { name: "Tender_Reference_Q3.xlsx", size: "480 KB" },
  ]);
  const [form, setForm] = useState({
    client: "Novartis Bio",
    reference: "RFQ-8892",
    market: "Switzerland",
    priority: "High",
    product: "Amoxicillin 500mg Capsule",
    quantity: "4,000,000",
    packaging: "10 x 10 Blister / Carton",
    currency: "USD",
    incoterm: "CIF",
    port: "Rotterdam",
    payment: "LC at sight",
    validity: "30 days",
    notes:
      "Client requires EU-GMP batch documentation and artwork in DE/FR. Shipment consolidated with ORD-2291.",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submitted = step === 6;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Customer Inquiry"
        description="Capture a request for quotation in five guided steps. All fields are pre-filled with demo data."
        actions={<StatusChip status={submitted ? "Submitted" : "Draft"} />}
      />

      <Panel className="overflow-hidden">
        <ol className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {steps.map((s, i) => {
            const done = step > s.id;
            const current = step === s.id;
            return (
              <li key={s.id} className="flex flex-1 items-center gap-3">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border text-xs font-bold transition-colors",
                    done
                      ? "border-accent bg-accent text-accent-foreground"
                      : current
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-4" /> : s.id}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    current ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <span className="hidden h-px flex-1 bg-border sm:block" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel className="min-h-[420px] p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">General information</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Client">
                    <Select value={form.client} onValueChange={(v) => set("client", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Inquiry reference">
                    <Input value={form.reference} onChange={(e) => set("reference", e.target.value)} />
                  </Field>
                  <Field label="Destination market">
                    <Input value={form.market} onChange={(e) => set("market", e.target.value)} />
                  </Field>
                  <Field label="Priority">
                    <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Low", "Medium", "High", "Critical"].map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Product details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Product" hint="Only registered SKUs are selectable">
                    <Select value={form.product} onValueChange={(v) => set("product", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Quantity">
                    <Input value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
                  </Field>
                  <Field label="Packaging requirement">
                    <Input value={form.packaging} onChange={(e) => set("packaging", e.target.value)} />
                  </Field>
                  <Field label="Technical notes">
                    <Input placeholder="e.g. Alu-Alu, child-resistant closure" />
                  </Field>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Commercial information</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Currency">
                    <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Incoterm">
                    <Select value={form.incoterm} onValueChange={(v) => set("incoterm", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {incoterms.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Port of discharge">
                    <Input value={form.port} onChange={(e) => set("port", e.target.value)} />
                  </Field>
                  <Field label="Payment terms">
                    <Input value={form.payment} onChange={(e) => set("payment", e.target.value)} />
                  </Field>
                  <Field label="Quotation validity">
                    <Input value={form.validity} onChange={(e) => set("validity", e.target.value)} />
                  </Field>
                  <Field label="Internal notes" className="sm:col-span-2">
                    <Textarea
                      rows={4}
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Attachments</h2>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    setFiles((f) => [...f, { name: "Dropped_Attachment.pdf", size: "720 KB" }]);
                    toast.success("Attachment added");
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
                    dragging ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <CloudUpload className="size-5" />
                  </span>
                  <p className="text-sm font-semibold">Drag & drop specification files</p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOCX or XLSX up to 25 MB per file
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setFiles((f) => [...f, { name: "Browsed_Document.pdf", size: "1.4 MB" }]);
                      toast.success("Attachment added");
                    }}
                  >
                    Browse files
                  </Button>
                </div>

                <ul className="space-y-2.5">
                  {files.map((f) => (
                    <li key={f.name} className="surface flex items-center gap-3 p-3.5">
                      <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground">
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.size} · uploaded</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove"
                        onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Review & submit</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(form).map(([k, v]) => (
                    <div key={k} className="surface p-3.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {k.replace(/([A-Z])/g, " $1")}
                      </p>
                      <p className="mt-1 text-sm font-medium">{v}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {files.length} attachments · Submitting notifies the pricing desk and regulatory
                  reviewer.
                </p>
              </div>
            )}

            {submitted && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14 }}
                  className="grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent"
                >
                  <Check className="size-6" />
                </motion.span>
                <h2 className="text-lg font-semibold">Inquiry {form.reference} submitted</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Routed to the pricing desk. An indicative quotation is expected within 48 hours.
                </p>
                <Button variant="outline" className="mt-2" onClick={() => setStep(1)}>
                  Create another inquiry
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {!submitted && (
          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            <Button
              variant="ghost"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            <p className="text-xs text-muted-foreground">
              Step {step} of {steps.length}
            </p>
            <Button
              onClick={() => {
                if (step === steps.length) {
                  setStep(6);
                  toast.success(`${form.reference} submitted for quotation`);
                } else {
                  setStep((s) => s + 1);
                }
              }}
            >
              {step === steps.length ? "Submit inquiry" : "Continue"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}