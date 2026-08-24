import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SectionLoader } from "@/components/kit";
import { fetchInquiryById } from "@/lib/inquiry-api";
import { InquiryWizard } from "./_shell.inquiry";

export const Route = createFileRoute("/_shell/inquiry_/$inquiryId/edit")({
  component: EditInquiry,
});

function EditInquiry() {
  const { inquiryId } = Route.useParams();
  const {
    data: inquiry,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["inquiries", inquiryId], queryFn: () => fetchInquiryById(inquiryId) });
  if (isLoading) return <SectionLoader />;
  if (isError || !inquiry)
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Inquiry not found or no longer accessible.
      </p>
    );
  return <InquiryWizard initialInquiry={inquiry} />;
}
