import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Plus, Send, Trash2, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { createInquiry, fetchInquiries, fetchMyInquiries, updateInquiry } from "@/lib/inquiry-api";
import { userSessionService } from "@/lib/user-session";
import { InquiryList } from "@/components/inquiry-list";
import type {
  CustomerInquiry,
  InquiryLineRequestDto,
  InquiryPriority,
  InquirySource,
} from "@/lib/inquiry-types";
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
  const [qaAssigneeId, setQaAssigneeId] = useState("");
  const [qcAssigneeId, setQcAssigneeId] = useState("");
  const [salesAssigneeId, setSalesAssigneeId] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [lineAddingProduct, setLineAddingProduct] = useState<string | null>(null);
  const [editingInquiry, setEditingInquiry] = useState<CustomerInquiry | null>(null);
  const queryClient = useQueryClient();
  const sessionUser = userSessionService.getCurrentUser();
  const sessionRoles = [sessionUser?.role, ...(sessionUser?.roles || [])]
    .filter(Boolean)
    .map((role) => String(role).toUpperCase());
  const isQualityReviewer = sessionRoles.includes("QA") || sessionRoles.includes("QC");
  const isSalesUser = sessionRoles.includes("SALES");
  const isAdminUser = sessionRoles.includes("ADMIN") || sessionRoles.includes("SUPER_ADMIN");
  const showMyInquiries = isQualityReviewer || isSalesUser;

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
    queryKey: ["inquiries", showMyInquiries ? "mine" : "all"],
    queryFn: () => (showMyInquiries ? fetchMyInquiries() : fetchInquiries()),
  });
  const selectedCustomer = clients.find((client) => client.id === customerId);

  const updateLine = (key: string, values: Partial<EditableLine>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...values } : line)),
    );
  };
  const productFor = (line: EditableLine): Product | undefined =>
    products.find((product) => product.id === line.productId);
  const allLinesComplete = useMemo(
    () => lines.every((line) => line.productId && line.sourcing && line.quantityRequired > 0),
    [lines],
  );

  const hasQa = lines.some((l) => l.sourcing === "IN_HOUSE");
  const hasQc = lines.some((l) => l.sourcing === "OUTSOURCED");
  const qaUsers = users.filter(
    (u) => u.effectiveActive && u.roleNames.some((r) => r.toUpperCase() === "QA"),
  );
  const qcUsers = users.filter(
    (u) => u.effectiveActive && u.roleNames.some((r) => r.toUpperCase() === "QC"),
  );
  const salesUsers = users.filter(
    (u) => u.effectiveActive && u.roleNames.some((r) => r.toUpperCase() === "SALES"),
  );

  const submit = async () => {
    if (!customerId || !contactPersonId || !allLinesComplete) {
      toast.error("Select a customer and contact, then complete each product and quantity.");
      return;
    }
    if (hasQa && !qaAssigneeId) {
      toast.error("Please select a QA Reviewer for the in-house products.");
      return;
    }
    if (hasQc && !qcAssigneeId) {
      toast.error("Please select a QC Reviewer for the outsourced products.");
      return;
    }
    if (isAdminUser && !salesAssigneeId) {
      toast.error("Please select the sales representative for this inquiry.");
      return;
    }
    setSubmitting(true);
    try {
      const request = {
        customerId,
        contactPersonId,
        inquirySource,
        priority,
        targetQuoteDate: targetQuoteDate || undefined,
        notes: notes.trim() || undefined,
        qaAssigneeId: hasQa ? qaAssigneeId : undefined,
        qcAssigneeId: hasQc ? qcAssigneeId : undefined,
        salesAssigneeId: isAdminUser ? salesAssigneeId : undefined,
        lines: lines.map(({ key: _key, ...line }) => line as InquiryLineRequestDto),
      };
      const inquiry = editingInquiry
        ? await updateInquiry(editingInquiry.id, request)
        : await createInquiry(request);
      await queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      setView("list");
      toast.success(
        editingInquiry ? `${inquiry.rfqNo} updated` : `${inquiry.rfqNo} submitted for review`,
      );
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
    setQaAssigneeId("");
    setQcAssigneeId("");
    setSalesAssigneeId("");
    setLines([emptyLine()]);
    setEditingInquiry(null);
  };

  const startEdit = (inquiry: CustomerInquiry) => {
    setEditingInquiry(inquiry);
    setCustomerId(inquiry.customerId);
    setContactPersonId(inquiry.contactPersonId);
    setInquirySource(inquiry.inquirySource);
    setPriority(inquiry.priority);
    setTargetQuoteDate(inquiry.targetQuoteDate || defaultTargetQuoteDate());
    setNotes(inquiry.notes || "");
    setQaAssigneeId(inquiry.qaAssigneeId || "");
    setQcAssigneeId(inquiry.qcAssigneeId || "");
    setSalesAssigneeId(inquiry.salesAssigneeId || "");
    setLines(
      inquiry.lines.map(({ productId, sourcing, ...line }) => ({
        key: crypto.randomUUID(),
        productId,
        sourcing,
        quantityRequired: line.quantityRequired,
        shipperPackRequired: line.shipperPackRequired,
        tertiaryPackRequired: line.tertiaryPackRequired,
        secondaryPackRequired: line.secondaryPackRequired,
        monoBoxPackRequired: line.monoBoxPackRequired,
        stripPackRequired: line.stripPackRequired,
        tabletPackRequired: line.tabletPackRequired,
        targetPrice: line.targetPrice,
        packagingNotes: line.packagingNotes,
      })),
    );
    setView("create");
  };

  if (view === "list")
    return (
      <InquiryList
        inquiries={inquiryPage?.content ?? []}
        loading={inquiriesLoading}
        assignedOnly={showMyInquiries}
        canCreate={!isQualityReviewer || isSalesUser}
        canEdit={(inquiry) =>
          isAdminUser ||
          inquiry.raisedByUserId === sessionUser?.id ||
          inquiry.salesAssigneeId === sessionUser?.id
        }
        onEdit={startEdit}
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
        title={editingInquiry ? `Edit ${editingInquiry.rfqNo}` : "Add Customer Inquiry"}
        description="Create or update an RFQ and route each product to the selected QA or QC reviewer."
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between text-left font-normal",
                      !targetQuoteDate && "text-muted-foreground",
                    )}
                  >
                    {targetQuoteDate ? (
                      format(parseISO(targetQuoteDate), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={targetQuoteDate ? parseISO(targetQuoteDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const offset = date.getTimezoneOffset();
                        const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
                        setTargetQuoteDate(adjustedDate.toISOString().split("T")[0]);
                      } else {
                        setTargetQuoteDate("");
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
                        onChange={(value) => updateLine(line.key, { productId: value })}
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
                        product?.ingredients?.map((ingredient) => ingredient.api).join(" + ") || ""
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
                          ?.map((ingredient) => `${ingredient.strength}${ingredient.unit}`)
                          .join(" + ") || ""
                      }
                      readOnly
                    />
                  </Field>
                  <Field label="Pharmacopeia">
                    <Input
                      value={
                        product?.ingredients
                          ?.map((ingredient) => ingredient.pharmacopeia)
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
          {isAdminUser && (
            <div className="mb-5 max-w-md">
              <Field label="Sales representative *">
                <LookupInput
                  value={salesAssigneeId}
                  onChange={setSalesAssigneeId}
                  placeholder="Search and select sales representative"
                  options={salesUsers.map((user) => ({
                    value: user.id,
                    label:
                      user.fullName ||
                      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                      user.email,
                  }))}
                />
              </Field>
            </div>
          )}
          {(hasQa || hasQc) && (
            <div className="mb-5 grid gap-4 md:grid-cols-2">
              {hasQa && (
                <Field label="QA reviewer *">
                  <LookupInput
                    value={qaAssigneeId}
                    onChange={setQaAssigneeId}
                    placeholder="Search and select QA reviewer"
                    options={qaUsers.map((user) => ({
                      value: user.id,
                      label:
                        user.fullName ||
                        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                        user.email,
                    }))}
                  />
                </Field>
              )}
              {hasQc && (
                <Field label="QC reviewer *">
                  <LookupInput
                    value={qcAssigneeId}
                    onChange={setQcAssigneeId}
                    placeholder="Search and select QC reviewer"
                    options={qcUsers.map((user) => ({
                      value: user.id,
                      label:
                        user.fullName ||
                        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                        user.email,
                    }))}
                  />
                </Field>
              )}
            </div>
          )}
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
            {submitting ? "Saving…" : editingInquiry ? "Save changes" : "Submit RFQ"}
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
            updateLine(lineAddingProduct, { productId: product.id });
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

  // Sync term when selected changes or when dropdown closes
  useEffect(() => {
    if (!open || selected) {
      setTerm(selected?.label || "");
    }
  }, [selected?.label, open]);

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(term.toLowerCase()),
  );

  return (
    <div className="relative flex-1">
      <Input
        value={term}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
          if (value) onChange(""); // clear selection when typing
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open && !disabled && (
        <div
          className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          onMouseDown={(e) => e.preventDefault()} // prevent input blur when interacting with dropdown
        >
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">No matches found</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.key || option.value}
                type="button"
                className="w-full rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
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
