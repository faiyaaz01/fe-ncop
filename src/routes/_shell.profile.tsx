import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { PageHeader, Panel, Timeline } from "@/components/kit";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/profile")({
  head: () => ({
    meta: [
      { title: "Profile · NCOP ERP" },
      {
        name: "description",
        content: "User profile, assigned markets, permissions and recent activity in the ERP.",
      },
      { property: "og:title", content: "Profile · NCOP ERP" },
      {
        property: "og:description",
        content: "Account details, assigned markets and recent ERP activity.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your account details, assigned markets and recent workspace activity."
        actions={<Button variant="outline" onClick={() => toast("Edit profile opened")}>Edit profile</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16 border border-border">
              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">SL</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">Shayban Saiyed</h2>
              <p className="text-sm text-muted-foreground">Administrator · Global Sales</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Email", "s.Saiyed@NCOP.example", Mail],
              ["Phone", "+41 61 555 2210", Phone],
              ["Location", "Basel, Switzerland", MapPin],
              ["Employee ID", "MDV-0042", Mail],
            ].map(([l, v, Icon]) => {
              const I = Icon as typeof Mail;
              return (
                <div key={l as string} className="surface p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {l as string}
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 text-sm font-medium">
                    <I className="size-3.5 text-muted-foreground" />
                    {v as string}
                  </p>
                </div>
              );
            })}
          </dl>

          <div className="mt-6">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Assigned markets
            </p>
            <div className="flex flex-wrap gap-2">
              {["Switzerland", "Germany", "UAE", "Japan", "Brazil"].map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-4 text-base font-semibold">Recent activity</h3>
          <Timeline
            items={[
              { date: "Today", title: "Quoted RFQ-8841", detail: "Novartis Bio · USD 184,500" },
              { date: "Yesterday", title: "Approved ORD-2284", detail: "Meridian Healthcare" },
              { date: "30 Jul 2026", title: "Updated client dossier", detail: "Apex Pharma Ltd." },
              { date: "27 Jul 2026", title: "Closed RFQ-8879", detail: "Marked as lost · price" },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}