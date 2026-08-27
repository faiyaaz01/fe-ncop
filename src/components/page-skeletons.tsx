import { Panel } from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton({ actions = 2 }: { actions?: number }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-4 w-52 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: actions }).map((_, index) => (
          <Skeleton key={index} className={index === 0 ? "h-9 w-28" : "h-9 w-20"} />
        ))}
      </div>
    </div>
  );
}

function DetailsGridSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-36" />
        </div>
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="space-y-6 pb-12" aria-busy="true" aria-label="Loading product details">
      <Skeleton className="h-9 w-36" />
      <HeaderSkeleton actions={3} />
      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Panel className="space-y-5 p-5 sm:p-6">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <DetailsGridSkeleton fields={2} />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </Panel>
        <Panel className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </Panel>
      </div>
      <Panel className="max-w-3xl space-y-5 p-5 sm:p-6">
        <Skeleton className="h-6 w-64" />
        <DetailsGridSkeleton fields={4} />
        <Skeleton className="h-20 w-full rounded-xl" />
      </Panel>
    </div>
  );
}

export function ProductFormSkeleton() {
  return <FormWorkspaceSkeleton label="Loading product form" sections={[4, 2, 5, 4]} />;
}

export function InquiryDetailSkeleton() {
  return (
    <div className="space-y-6 pb-10" aria-busy="true" aria-label="Loading RFQ details">
      <Skeleton className="h-9 w-36" />
      <HeaderSkeleton actions={2} />
      <Panel className="p-5">
        <DetailsGridSkeleton fields={7} />
      </Panel>
      <Panel className="space-y-5 p-5">
        <Skeleton className="h-6 w-28" />
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="space-y-4 rounded-xl border border-border/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <DetailsGridSkeleton fields={4} />
          </div>
        ))}
      </Panel>
    </div>
  );
}

export function InquiryFormSkeleton() {
  return <FormWorkspaceSkeleton label="Loading RFQ form" sections={[5, 3, 3]} actionWidth="w-40" />;
}

export function UserFormSkeleton() {
  return <FormWorkspaceSkeleton label="Loading user form" sections={[4, 4, 6]} />;
}

function FormWorkspaceSkeleton({
  label,
  sections,
  actionWidth = "w-32",
}: {
  label: string;
  sections: number[];
  actionWidth?: string;
}) {
  return (
    <div
      className="flex h-[calc(100dvh-9rem)] min-h-0 flex-col gap-6"
      aria-busy="true"
      aria-label={label}
    >
      <HeaderSkeleton actions={1} />
      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="min-h-0 flex-1 space-y-8 overflow-hidden p-6 sm:p-8">
          {sections.map((fields, index) => (
            <div key={index} className="space-y-4 border-b border-border/60 pb-8 last:border-0">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: fields }).map((_, fieldIndex) => (
                  <div key={fieldIndex} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-border/60 bg-card px-6 py-4 sm:px-8">
          <Skeleton className="h-9 w-20" />
          <Skeleton className={`h-9 ${actionWidth}`} />
        </div>
      </Panel>
    </div>
  );
}
