import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Nourish Pharmaceutical ERP" },
      {
        name: "description",
        content:
          "Organisation profile, notification routing, compliance controls and integration preferences.",
      },
      { property: "og:title", content: "Settings · Nourish Pharmaceutical ERP" },
      {
        property: "og:description",
        content: "Configure organisation, notifications and compliance controls.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Organisation, notification and compliance preferences for the Nourish Pharmaceutical workspace."
        actions={<Button onClick={() => toast.success("Preferences saved")}>Save changes</Button>}
      />

      <Tabs defaultValue="organisation">
        <TabsList>
          <TabsTrigger value="organisation">Organisation</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="organisation" className="mt-5">
          <Panel className="max-w-2xl space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Legal entity", "Nourish Pharmaceutical Pvt. Ltd."],
                ["Registration no.", "CHE-114.882.901"],
                ["Head office", "Basel, Switzerland"],
                ["Default currency", "USD"],
              ].map(([l, v]) => (
                <div key={l} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{l}</Label>
                  <Input defaultValue={v} />
                </div>
              ))}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="notifications" className="mt-5">
          <Panel className="max-w-2xl divide-y divide-border">
            {[
              ["New inquiry received", "Notify the pricing desk immediately", true],
              ["QA release pending", "Escalate 24 h before vessel cut-off", true],
              ["Document expiry", "Alert 60 days before GMP certificate expiry", true],
              ["Weekly digest", "Email a Monday summary of pipeline movement", false],
            ].map(([title, desc, on]) => (
              <div
                key={title as string}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">{title as string}</p>
                  <p className="text-xs text-muted-foreground">{desc as string}</p>
                </div>
                <Switch defaultChecked={on as boolean} />
              </div>
            ))}
          </Panel>
        </TabsContent>

        <TabsContent value="compliance" className="mt-5">
          <Panel className="max-w-2xl space-y-4">
            <div>
              <p className="text-sm font-semibold">Audit trail</p>
              <p className="text-xs text-muted-foreground">
                All record changes are captured with user, timestamp and reason for change (21 CFR
                Part 11 aligned).
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Require e-signature on quotations</p>
                <p className="text-xs text-muted-foreground">Applies to values above USD 100,000</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Block unregistered SKUs</p>
                <p className="text-xs text-muted-foreground">
                  Prevents quoting products without valid market authorisation
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
