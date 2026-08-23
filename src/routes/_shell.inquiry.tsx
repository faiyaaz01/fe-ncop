import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/kit";
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
import { cn } from "@/lib/utils";
import { fetchAllClients } from "@/lib/client-api";
import { fetchAllProducts, fetchDosageForms } from "@/lib/product-api";
import { fetchAllUsers } from "@/lib/auth-api";
import { createInquiry, fetchInquiries } from "@/lib/inquiry-api";
import { InquiryList } from "@/components/inquiry-list";
import type { InquiryLineRequestDto, InquiryPriority, InquirySource } from "@/lib/inquiry-types";
import type { Product } from "@/lib/product-types";
import type { DosageForm, ProductSourcing } from "@/lib/product-types";
import { ProductFormDialog } from "./_shell.products";

export const Route = createFileRoute("/_shell/inquiry")({
  head: () => ({ meta: [{ title: "Customer Inquiry · NCOP ERP" }] }),
  component: InquiryWizard,
});

const sources: Array<[InquirySource, string]> = [
  ["WEBSITE", "Website"],
  ["EMAIL", "Email"],
  ["PHONE_CALL", "Phone Call"],
  ["WHATSAPP", "WhatsApp"],
  ["EXISTING_CUSTOMER", "Existing Customer"],
  ["REFERRAL", "Referral"],
  ["EXHIBITION", "Exhibition"],
  ["DIGITAL_PLATFORM", "Digital Platform"],
  ["SALES_VISIT", "Sales Visit"],
  ["OTHER", "Other"],
];
const priorities: InquiryPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const packFields: Array<[keyof InquiryLineRequestDto, string]> = [
  ["shipperPackRequired", "Shipper"],
  ["tertiaryPackRequired", "Tertiary"],
  ["secondaryPackRequired", "Secondary"],
  ["monoBoxPackRequired", "Mono Box"],
  ["stripPackRequired", "Strip"],
  ["tabletPackRequired", "Tablet"],
];

type EditableLine = Omit<InquiryLineRequestDto, "sourcing"> & {
  key: string;
  sourcing: ProductSourcing | "";
};
const emptyLine = (): EditableLine => ({
  key: crypto.randomUUID(),
  productId: "",
  qualityAssigneeId: "",
  quantityRequired: 0,
  sourcing: "",
});

const defaultTargetQuoteDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

function InquiryWizard() {
  const [view, setView] = useState<"list" | "create">("list");
  const [customerId, setCustomerId] = useState("");
  const [contactPersonId, setContactPersonId] = useState("");
  const [inquirySource, setInquirySource] = useState<InquirySource>("EMAIL");
  const [priority, setPriority] = useState<InquiryPriority>("MEDIUM");
  const [targetQuoteDate, setTargetQuoteDate] = useState(defaultTargetQuoteDate);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [lineAddingProduct, setLineAddingProduct] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "all"],
    queryFn: fetchAllClients,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: fetchAllProducts,
  });
  const { data: dosageForms = [] } = useQuery<DosageForm[]>({
    queryKey: ["dosage-forms"],
    queryFn: () => fetchDosageForms(true),
  });
  const { data: users = [] } = useQuery({ queryKey: ["users", "all"], queryFn: fetchAllUsers });
  const { data: inquiryPage, isLoading: inquiriesLoading } = useQuery({
    queryKey: ["inquiries"],
    queryFn: () => fetchInquiries(),
  });
  const selectedCustomer = clients.find((client) => client.id === customerId);

  const updateLine = (key: string, values: Partial<EditableLine>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...values } : line)),
    );
  };
  const productFor = (line: EditableLine): Product | undefined =>
    products.find((product) => product.id === line.productId);
  const qualityUsers = (sourcing: ProductSourcing | "") => {
    const requiredRole = sourcing === "OUTSOURCED" ? "QC" : "QA";
    return users.filter(
      (user) =>
        user.effectiveActive && user.roleNames.some((role) => role.toUpperCase() === requiredRole),
    );
  };
  const allLinesComplete = useMemo(
    () =>
      lines.every(
        (line) =>
          line.productId && line.sourcing && line.qualityAssigneeId && line.quantityRequired > 0,
      ),
    [lines],
  );

  const submit = async () => {
    if (!customerId || !contactPersonId || !allLinesComplete) {
      toast.error(
        "Select a customer and contact, then complete each product, quantity and QA/QC assignee.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const inquiry = await createInquiry({
        customerId,
        contactPersonId,
        inquirySource,
        priority,
        targetQuoteDate: targetQuoteDate || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map(({ key: _key, ...line }) => line as InquiryLineRequestDto),
      });
      await queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      setView("list");
      toast.success(`${inquiry.rfqNo} submitted for review`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerId("");
    setContactPersonId("");
    setInquirySource("EMAIL");
    setPriority("MEDIUM");
    setTargetQuoteDate(defaultTargetQuoteDate());
    setNotes("");
    setLines([emptyLine()]);
  };

  if (view === "list")
    return (
      <InquiryList
        inquiries={inquiryPage?.content ?? []}
        loading={inquiriesLoading}
        onAdd={() => {
          resetForm();
          setView("create");
        }}
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Add Customer Inquiry"
        description="Create an RFQ and route each product to the selected QA or QC reviewer."
        actions={
          <Button variant="outline" onClick={() => setView("list")}>
            <ChevronLeft className="size-4" /> Back to inquiries
          </Button>
        }
      />
      <Panel className="space-y-8 p-6 sm:p-8">
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">General information</h2>
            <p className="text-sm text-muted-foreground">
              RFQ number and inquiry date are generated when you submit.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Customer *">
              <LookupInput
                value={customerId}
                onChange={(value) => {
                  setCustomerId(value);
                  setContactPersonId("");
                }}
                placeholder="Search and select customer"
                options={clients.map((client) => ({ value: client.id, label: client.companyName }))}
              />
            </Field>
            <Field label="Contact person *">
              <LookupInput
                value={contactPersonId}
                onChange={setContactPersonId}
                disabled={!selectedCustomer}
                placeholder="Search and select contact"
                options={(selectedCustomer?.pointOfContacts || []).map((contact, index) => ({
                  value: contact.id || contact.email || contact.personName,
                  label: `${contact.personName}${contact.email ? ` · ${contact.email}` : ""}`,
                  key: contact.id || contact.email || String(index),
                }))}
              />
            </Field>
            <Field label="Inquiry source *">
              <Select
                value={inquirySource}
                onValueChange={(value) => setInquirySource(value as InquirySource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sources.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority *">
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as InquiryPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value[0] + value.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Target quote date">
              <Input
                type="date"
                value={targetQuoteDate}
                onChange={(event) => setTargetQuoteDate(event.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Product requirements</h2>
              <p className="text-sm text-muted-foreground">
                Product specifications are copied from the Product Master.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((current) => [...current, emptyLine()])}
            >
              <Plus className="size-4" /> Add product
            </Button>
          </div>
          {lines.map((line, index) => {
            const product = productFor(line);
            const reviewers = qualityUsers(line.sourcing);
            const isOutsourced = line.sourcing === "OUTSOURCED";
            return (
              <div
                key={line.key}
                className="space-y-4 rounded-xl border border-border bg-muted/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Product {index + 1}</h3>
                  {lines.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() =>
                        setLines((current) => current.filter((item) => item.key !== line.key))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="Product *">
                    <div className="flex gap-2">
                      <LookupInput
                        value={line.productId}
                        onChange={(value) =>
                          updateLine(line.key, { productId: value, qualityAssigneeId: "" })
                        }
                        placeholder="Search and select product"
                        options={products.map((item) => ({
                          value: item.id,
                          label: `${item.brandName}${item.composition ? ` · ${item.composition}` : ""}`,
                        }))}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLineAddingProduct(line.key);
                          setProductDialogOpen(true);
                        }}
                      >
                        New
                      </Button>
                    </div>
                  </Field>
                  <Field label="Generic name">
                    <Input
                      value={
                        product?.ingredients.map((ingredient) => ingredient.api).join(" + ") || ""
                      }
                      readOnly
                    />
                  </Field>
                  <Field label="Dosage form / variant">
                    <Input
                      value={
                        product
                          ? `${product.dosageForm}${product.dosageVariant ? ` / ${product.dosageVariant}` : ""}`
                          : ""
                      }
                      readOnly
                    />
                  </Field>
                  <Field label="Strength">
                    <Input
                      value={
                        product?.ingredients
                          .map((ingredient) => `${ingredient.strength}${ingredient.unit}`)
                          .join(" + ") || ""
                      }
                      readOnly
                    />
                  </Field>
                  <Field label="Pharmacopeia">
                    <Input
                      value={
                        product?.ingredients
                          .map((ingredient) => ingredient.pharmacopeia)
                          .filter(Boolean)
                          .join(" / ") || ""
                      }
                      readOnly
                    />
                  </Field>
                  <Field label="Source *">
                    <Select
                      value={line.sourcing}
                      onValueChange={(value) =>
                        updateLine(line.key, {
                          sourcing: value as ProductSourcing,
                          qualityAssigneeId: "",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose in-house or outsourced" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN_HOUSE">In-house</SelectItem>
                        <SelectItem value="OUTSOURCED">Outsourced</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    label={
                      line.sourcing
                        ? `Assigned ${isOutsourced ? "QC" : "QA"} reviewer *`
                        : "QA/QC reviewer *"
                    }
                  >
                    <Select
                      value={line.qualityAssigneeId}
                      onValueChange={(value) => updateLine(line.key, { qualityAssigneeId: value })}
                      disabled={!product || !line.sourcing}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            product && line.sourcing
                              ? `Select ${isOutsourced ? "QC" : "QA"} user`
                              : "Select a product first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {reviewers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName ||
                              `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                              user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {line.sourcing && (
                      <p
                        className={cn(
                          "text-[11px]",
                          isOutsourced ? "text-orange-600" : "text-emerald-600",
                        )}
                      >
                        {isOutsourced
                          ? "Outsourced product: routed to QC"
                          : "In-house product: routed to QA"}
                      </p>
                    )}
                  </Field>
                  <Field label="Quantity required *">
                    <Input
                      type="number"
                      min="1"
                      value={line.quantityRequired || ""}
                      onChange={(event) =>
                        updateLine(line.key, { quantityRequired: Number(event.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Target price (if available)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.targetPrice ?? ""}
                      onChange={(event) =>
                        updateLine(line.key, {
                          targetPrice: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                    />
                  </Field>
                  <Field label="Packaging notes">
                    <Input
                      value={line.packagingNotes || ""}
                      onChange={(event) =>
                        updateLine(line.key, { packagingNotes: event.target.value })
                      }
                      placeholder="e.g. alu-alu blister"
                    />
                  </Field>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Packing requirement</Label>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {packFields.map(([field, label]) => (
                      <Field key={field} label={label}>
                        <Input
                          type="number"
                          min="0"
                          value={line[field] ?? ""}
                          onChange={(event) =>
                            updateLine(line.key, {
                              [field]: event.target.value ? Number(event.target.value) : undefined,
                            })
                          }
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
        <section className="border-t border-border pt-7">
          <Field label="Internal notes">
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Additional commercial, technical or regulatory notes"
            />
          </Field>
        </section>
        <div className="flex justify-end border-t border-border pt-6">
          <Button disabled={submitting || !allLinesComplete} onClick={submit}>
            {submitting ? "Submitting…" : "Submit RFQ"}
            <Send className="size-4" />
          </Button>
        </div>
      </Panel>
      <ProductFormDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        editingProduct={null}
        dosageForms={dosageForms}
        onSaved={(product) => {
          queryClient.invalidateQueries({ queryKey: ["products", "all"] });
          if (product && lineAddingProduct) {
            updateLine(lineAddingProduct, { productId: product.id, qualityAssigneeId: "" });
          }
          setLineAddingProduct(null);
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function LookupInput({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; key?: string }>;
  placeholder: string;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.value === value);
  const [term, setTerm] = useState(selected?.label || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selected) setTerm(selected.label);
  }, [selected?.label]);

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(term.toLowerCase()),
  );
  return (
    <div className="relative">
      <Input
        value={term}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">No matches found</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.key || option.value}
                type="button"
                className="w-full rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={() => {
                  onChange(option.value);
                  setTerm(option.label);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
