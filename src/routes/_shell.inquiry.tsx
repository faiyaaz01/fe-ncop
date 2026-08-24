import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Plus, Send, Trash2, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  OrderQuantityUnit,
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
  ["tertiaryPackRequired", "Tertiary"],
  ["secondaryPackRequired", "Secondary"],
  ["monoBoxPackRequired", "Mono Box"],
  ["stripPackRequired", "Strip"],
];
const packagingNotes = ["Pvc-Alu", "Alu-Alu", "Strip", "HDPE bottle", "PET bottle", "Jar", "Drum"];
const packUnitByField: Record<string, OrderQuantityUnit> = {
  tertiaryPackRequired: "TERTIARY",
  secondaryPackRequired: "SECONDARY",
  monoBoxPackRequired: "MONO_BOX",
  stripPackRequired: "STRIP",
};
const quantityUnits: Array<[OrderQuantityUnit, string]> = [
  ["TERTIARY", "Tertiary"],
  ["SECONDARY", "Secondary"],
  ["MONO_BOX", "Mono Box"],
  ["STRIP", "Strip"],
  ["TABLET", "Tablet"],
];

type EditableLine = Omit<InquiryLineRequestDto, "sourcing"> & {
  key: string;
  sourcing: ProductSourcing | "";
  orderQuantityUnit: OrderQuantityUnit | "";
};
const emptyLine = (): EditableLine => ({
  key: crypto.randomUUID(),
  productId: "",
  quantityRequired: 0,
  orderQuantityUnit: "",
  sourcing: "",
});

const defaultTargetQuoteDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

function tabletCalculation(line: EditableLine) {
  const quantity = line.quantityRequired || 0;
  if (!quantity || !line.orderQuantityUnit)
    return { total: 0, formula: "Enter the required quantity" };
  if (line.orderQuantityUnit === "TABLET")
    return { total: quantity, formula: `${quantity.toLocaleString()} tablets` };
  if (line.orderQuantityUnit === "JAR") {
    const perJar = line.tabletPackRequired || 0;
    return {
      total: quantity * perJar,
      formula: perJar
        ? `${quantity.toLocaleString()} jars × ${perJar.toLocaleString()} tablets`
        : "Enter tablets per jar",
    };
  }
  const selectedIndex = packFields.findIndex(
    ([field]) => packUnitByField[String(field)] === line.orderQuantityUnit,
  );
  const factors = packFields
    .slice(Math.max(0, selectedIndex))
    .map(([field]) => line[field] || 0)
    .filter((value) => value > 0);
  return {
    total: factors.reduce((result, factor) => result * factor, quantity),
    formula: factors.length
      ? `${[quantity, ...factors].map((value) => value.toLocaleString()).join(" × ")} tablets`
      : "Enter the packing quantities",
  };
}

function inferOrderQuantityUnit(line: Partial<InquiryLineRequestDto>): OrderQuantityUnit | "" {
  if (line.orderQuantityUnit) return line.orderQuantityUnit;
  const quantity = Number(line.quantityRequired);
  const total = Number(line.calculatedTabletQuantity);
  if (!Number.isFinite(quantity) || !Number.isFinite(total) || quantity < 1) return "";
  if (total === quantity) return "TABLET";
  for (const [unit, fields] of [
    [
      "TERTIARY",
      [
        line.tertiaryPackRequired,
        line.secondaryPackRequired,
        line.monoBoxPackRequired,
        line.stripPackRequired,
      ],
    ],
    ["SECONDARY", [line.secondaryPackRequired, line.monoBoxPackRequired, line.stripPackRequired]],
    ["MONO_BOX", [line.monoBoxPackRequired, line.stripPackRequired]],
    ["STRIP", [line.stripPackRequired]],
  ] as const) {
    const factors = fields.map(Number);
    if (
      factors.every((factor) => Number.isFinite(factor) && factor > 0) &&
      factors.reduce((result, factor) => result * factor, quantity) === total
    )
      return unit;
  }
  if (line.tabletPackRequired && quantity * line.tabletPackRequired === total) return "JAR";
  return "";
}

export function InquiryWizard({ initialInquiry }: { initialInquiry?: CustomerInquiry } = {}) {
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
  const [previewingInquiry, setPreviewingInquiry] = useState<CustomerInquiry | null>(null);
  const [previewingDraft, setPreviewingDraft] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
  const selectedContact = selectedCustomer?.pointOfContacts?.find(
    (contact) => contact.id === contactPersonId || contact.email === contactPersonId,
  );
  const draftPreview = useMemo<CustomerInquiry>(
    () => ({
      id: "draft-preview",
      rfqNo: editingInquiry?.rfqNo || "Draft RFQ",
      inquiryDate: new Date().toISOString().slice(0, 10),
      customerId,
      customerName: selectedCustomer?.companyName || "Not selected",
      contactPersonId,
      contactPersonName: selectedContact?.personName || "Not selected",
      inquirySource,
      priority,
      targetQuoteDate,
      notes,
      qaAssigneeId,
      qcAssigneeId,
      salesAssigneeId,
      status: editingInquiry?.status || "DRAFT PREVIEW",
      qaAssigneeName: users.find((user) => user.id === qaAssigneeId)?.fullName,
      qcAssigneeName: users.find((user) => user.id === qcAssigneeId)?.fullName,
      salesAssigneeName: users.find((user) => user.id === salesAssigneeId)?.fullName,
      lines: lines.map((line) => ({
        ...line,
        sourcing: line.sourcing || "IN_HOUSE",
        productName:
          products.find((product) => product.id === line.productId)?.brandName ||
          "Product not selected",
        genericName:
          products
            .find((product) => product.id === line.productId)
            ?.ingredients?.map((ingredient) => ingredient.api)
            .join(" + ") || "",
        dosageForm: products.find((product) => product.id === line.productId)?.dosageForm || "",
        dosageVariant: products.find((product) => product.id === line.productId)?.dosageVariant,
        calculatedTabletQuantity: tabletCalculation(line).total,
      })),
    }),
    [
      customerId,
      contactPersonId,
      editingInquiry,
      inquirySource,
      lines,
      notes,
      priority,
      products,
      qaAssigneeId,
      qcAssigneeId,
      salesAssigneeId,
      selectedContact?.personName,
      selectedCustomer?.companyName,
      targetQuoteDate,
      users,
    ],
  );

  const updateLine = (key: string, values: Partial<EditableLine>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...values } : line)),
    );
  };
  const productFor = (line: EditableLine): Product | undefined =>
    products.find((product) => product.id === line.productId);
  const allLinesComplete = useMemo(
    () =>
      lines.every(
        (line) =>
          line.productId && line.sourcing && line.quantityRequired > 0 && line.orderQuantityUnit,
      ),
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
        lines: lines.map(
          ({ key: _key, ...line }) =>
            ({
              ...line,
              calculatedTabletQuantity: tabletCalculation(line).total,
            }) as InquiryLineRequestDto,
        ),
      };
      const inquiry = editingInquiry
        ? await updateInquiry(editingInquiry.id, request)
        : await createInquiry(request);
      await queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      setPreviewingDraft(false);
      toast.success(
        editingInquiry ? `${inquiry.rfqNo} updated` : `${inquiry.rfqNo} submitted for review`,
      );
      navigate({ to: "/inquiry/$inquiryId", params: { inquiryId: inquiry.id } });
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
    setPreviewingDraft(false);
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
        orderQuantityUnit: inferOrderQuantityUnit(line),
        calculatedTabletQuantity: line.calculatedTabletQuantity,
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
    setPreviewingDraft(false);
  };

  useEffect(() => {
    if (initialInquiry && editingInquiry?.id !== initialInquiry.id) startEdit(initialInquiry);
  }, [initialInquiry, editingInquiry?.id]);

  if (previewingDraft)
    return (
      <DraftInquiryPreview
        inquiry={draftPreview}
        editing={Boolean(editingInquiry)}
        submitting={submitting}
        onBack={() => setPreviewingDraft(false)}
        onConfirm={submit}
      />
    );

  if (view === "list")
    return (
      <>
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
          onEdit={(inquiry) =>
            navigate({ to: "/inquiry/$inquiryId/edit", params: { inquiryId: inquiry.id } })
          }
          onView={(inquiry) =>
            navigate({ to: "/inquiry/$inquiryId", params: { inquiryId: inquiry.id } })
          }
          onAdd={() => {
            resetForm();
            setView("create");
          }}
        />
      </>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title={editingInquiry ? `Edit ${editingInquiry.rfqNo}` : "Add Customer Inquiry"}
        description="Create or update an RFQ and route each product to the selected QA or QC reviewer."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewingDraft(true)}>
              Preview inquiry
            </Button>
            <Button variant="outline" onClick={() => setView("list")}>
              <ChevronLeft className="size-4" /> Back to inquiries
            </Button>
          </div>
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
                        setTargetQuoteDate(adjustedDate.toISOString().slice(0, 10));
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
                  <Field label="Packaging notes">
                    <Select
                      value={line.packagingNotes || ""}
                      onValueChange={(value) => updateLine(line.key, { packagingNotes: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select packing type" />
                      </SelectTrigger>
                      <SelectContent>
                        {packagingNotes.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Packing requirement</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter the pack configuration in the first row and the order quantity at the pack
                    level being ordered in the second row.
                  </p>
                  {line.packagingNotes === "Jar" ? (
                    <div className="mt-3 grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-3">
                      <Field label="Tablets per jar *">
                        <Input
                          type="number"
                          min="1"
                          value={line.tabletPackRequired ?? ""}
                          onChange={(event) =>
                            updateLine(line.key, {
                              tabletPackRequired: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            })
                          }
                        />
                      </Field>
                      <Field label="Quantity required (jars) *">
                        <Input
                          type="number"
                          min="1"
                          value={
                            line.orderQuantityUnit === "JAR" ? line.quantityRequired || "" : ""
                          }
                          onChange={(event) =>
                            updateLine(line.key, {
                              quantityRequired: Number(event.target.value),
                              orderQuantityUnit: "JAR",
                            })
                          }
                        />
                      </Field>
                      <CalculationResult calculation={tabletCalculation(line)} />
                    </div>
                  ) : (
                    <div className="mt-3 overflow-x-auto rounded-lg border bg-background">
                      <div className="min-w-[720px] divide-y text-sm">
                        <div className="grid grid-cols-[130px_repeat(5,minmax(86px,1fr))] bg-muted/40 font-medium">
                          <div className="p-2" />
                          {packFields.map(([, label]) => (
                            <div key={label} className="border-l p-2">
                              {label}
                            </div>
                          ))}
                          <div className="border-l p-2">Tablet</div>
                        </div>
                        <div className="grid grid-cols-[130px_repeat(5,minmax(86px,1fr))]">
                          <div className="bg-muted/20 p-2 font-medium">Pack required</div>
                          {packFields.map(([field]) => (
                            <div key={field} className="border-l p-1.5">
                              <Input
                                type="number"
                                min="0"
                                className="h-8"
                                value={line[field] ?? ""}
                                onChange={(event) =>
                                  updateLine(line.key, {
                                    [field]: event.target.value
                                      ? Number(event.target.value)
                                      : undefined,
                                  })
                                }
                              />
                            </div>
                          ))}
                          <div className="border-l p-2 text-xs text-muted-foreground">
                            {tabletCalculation(line).formula}
                          </div>
                        </div>
                        <div className="grid grid-cols-[130px_repeat(5,minmax(86px,1fr))]">
                          <div className="bg-muted/20 p-2 font-medium">Quantity required *</div>
                          {quantityUnits.map(([unit, label]) => (
                            <div key={unit} className="border-l p-1.5">
                              <Input
                                aria-label={`Quantity required in ${label}`}
                                type="number"
                                min="1"
                                className="h-8"
                                value={
                                  line.orderQuantityUnit === unit ? line.quantityRequired || "" : ""
                                }
                                placeholder={
                                  line.orderQuantityUnit && line.orderQuantityUnit !== unit
                                    ? "—"
                                    : "Qty"
                                }
                                onFocus={() => updateLine(line.key, { orderQuantityUnit: unit })}
                                onChange={(event) =>
                                  updateLine(line.key, {
                                    orderQuantityUnit: unit,
                                    quantityRequired: Number(event.target.value),
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {line.packagingNotes !== "Jar" && (
                    <CalculationResult calculation={tabletCalculation(line)} />
                  )}
                  <div className="mt-3 max-w-xs">
                    <Field label="Target price (if available)">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.targetPrice ?? ""}
                        onChange={(event) =>
                          updateLine(line.key, {
                            targetPrice: event.target.value
                              ? Number(event.target.value)
                              : undefined,
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
        <section className="border-t border-border pt-7">
          {isAdminUser && (
            <div className="mb-5 max-w-md">
              <Field label="Sales representative (optional)">
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
          <Button
            disabled={submitting || !allLinesComplete}
            onClick={() => setPreviewingDraft(true)}
          >
            {editingInquiry ? "Preview changes" : "Preview & submit RFQ"}
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

function CalculationResult({ calculation }: { calculation: { total: number; formula: string } }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
      <span className="font-medium">Total tablets:</span>
      <span className="font-semibold text-primary">{calculation.total.toLocaleString()}</span>
      <span className="text-muted-foreground">({calculation.formula})</span>
    </div>
  );
}

function DraftInquiryPreview({
  inquiry,
  editing,
  submitting,
  onBack,
  onConfirm,
}: {
  inquiry: CustomerInquiry;
  editing: boolean;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Customer inquiry"
        title={editing ? `Review changes — ${inquiry.rfqNo}` : "Review inquiry before submission"}
        description="Confirm the details below before saving this RFQ."
        actions={
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="size-4" /> Back to edit
          </Button>
        }
      />
      <Panel className="grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <PreviewItem label="Customer" value={inquiry.customerName || "—"} />
        <PreviewItem label="Contact person" value={inquiry.contactPersonName || "—"} />
        <PreviewItem
          label="Source"
          value={String(inquiry.inquirySource || "—").replaceAll("_", " ")}
        />
        <PreviewItem label="Priority" value={String(inquiry.priority || "—")} />
        <PreviewItem label="Target quote date" value={inquiry.targetQuoteDate || "—"} />
        <PreviewItem label="QA reviewer" value={inquiry.qaAssigneeName || "—"} />
        <PreviewItem label="QC reviewer" value={inquiry.qcAssigneeName || "—"} />
        <PreviewItem
          label="Sales owner"
          value={inquiry.salesAssigneeName || inquiry.raisedByUserName || "Current user"}
        />
      </Panel>
      <Panel className="space-y-3 p-5">
        <h2 className="text-lg font-semibold">Products</h2>
        {(inquiry.lines || []).map((line, index) => (
          <div key={`${line.productId}-${index}`} className="rounded-xl border p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-medium">{line.productName || "Product"}</p>
                <p className="text-sm text-muted-foreground">{line.genericName || "—"}</p>
              </div>
              <Badge variant="outline">
                {line.sourcing === "OUTSOURCED" ? "Outsourced" : "In-house"}
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <PreviewItem label="Packing" value={line.packagingNotes || "—"} />
              <PreviewItem
                label="Order quantity"
                value={`${Number(line.quantityRequired || 0).toLocaleString()} ${String(line.orderQuantityUnit || "").replaceAll("_", " ")}`}
              />
              <PreviewItem
                label="Total tablets"
                value={Number(
                  line.calculatedTabletQuantity ?? line.quantityRequired ?? 0,
                ).toLocaleString()}
              />
              <PreviewItem
                label="Target price"
                value={line.targetPrice == null ? "—" : String(line.targetPrice)}
              />
            </div>
          </div>
        ))}
      </Panel>
      {inquiry.notes && (
        <Panel className="p-5">
          <h2 className="mb-2 text-lg font-semibold">Internal notes</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{inquiry.notes}</p>
        </Panel>
      )}
      <div className="flex flex-wrap justify-end gap-3 border-t pt-6">
        <Button variant="outline" onClick={onBack}>
          Back to edit
        </Button>
        <Button disabled={submitting} onClick={onConfirm}>
          {submitting ? "Saving…" : editing ? "Confirm & save changes" : "Confirm & submit RFQ"}
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function InquiryPreviewDialog({
  inquiry,
  onOpenChange,
  onConfirm,
  submitting = false,
}: {
  inquiry: CustomerInquiry | null;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
  submitting?: boolean;
}) {
  const labelFor = (value: unknown) => String(value ?? "—").replaceAll("_", " ");
  const numberFor = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString() : "—";
  };
  const lines = Array.isArray(inquiry?.lines) ? inquiry.lines : [];
  return (
    <Dialog open={Boolean(inquiry)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {inquiry && (
          <>
            <DialogHeader>
              <DialogTitle>{inquiry.rfqNo} — Inquiry preview</DialogTitle>
              <DialogDescription>
                Review the customer, product, packing and routing details before submission.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 rounded-lg border bg-muted/25 p-4 text-sm sm:grid-cols-2">
              <PreviewItem label="Customer" value={String(inquiry.customerName || "—")} />
              <PreviewItem
                label="Contact person"
                value={String(inquiry.contactPersonName || "—")}
              />
              <PreviewItem label="Source" value={labelFor(inquiry.inquirySource)} />
              <PreviewItem label="Priority" value={labelFor(inquiry.priority)} />
              <PreviewItem label="Target quote date" value={inquiry.targetQuoteDate || "—"} />
              <PreviewItem label="Status" value={labelFor(inquiry.status)} />
              <PreviewItem label="QA reviewer" value={inquiry.qaAssigneeName || "—"} />
              <PreviewItem label="QC reviewer" value={inquiry.qcAssigneeName || "—"} />
              <PreviewItem
                label="Sales owner"
                value={inquiry.salesAssigneeName || inquiry.raisedByUserName || "Current user"}
              />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">Products</h3>
              {lines.map((line, index) => (
                <div key={`${line.productId}-${index}`} className="rounded-lg border p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{line.productName || "Product"}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.genericName} {line.dosageForm ? `· ${line.dosageForm}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {line.sourcing === "OUTSOURCED" ? "Outsourced" : "In-house"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <PreviewItem label="Packing" value={line.packagingNotes || "—"} />
                    <PreviewItem
                      label="Order quantity"
                      value={`${numberFor(line.quantityRequired)} ${labelFor(line.orderQuantityUnit)}`}
                    />
                    <PreviewItem
                      label="Total tablets"
                      value={numberFor(line.calculatedTabletQuantity ?? line.quantityRequired)}
                    />
                    <PreviewItem
                      label="Target price"
                      value={line.targetPrice != null ? String(line.targetPrice) : "—"}
                    />
                  </div>
                </div>
              ))}
            </div>
            {inquiry.notes && (
              <div className="rounded-lg border p-4 text-sm">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Internal notes
                </p>
                {inquiry.notes}
              </div>
            )}
            {onConfirm && (
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Back to edit
                </Button>
                <Button disabled={submitting} onClick={onConfirm}>
                  {submitting ? "Submitting…" : "Confirm & submit"}
                  <Send className="size-4" />
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
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
