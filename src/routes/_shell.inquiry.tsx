import { createFileRoute } from "@tanstack/react-router";
import { InquiryWizard } from "@/components/inquiry-wizard";

export const Route = createFileRoute("/_shell/inquiry")({
  head: () => ({ meta: [{ title: "Customer Inquiry · Nourish Pharmaceutical ERP" }] }),
  component: InquiryWizard,
});
