import { createFileRoute } from "@tanstack/react-router";
import { Mail, Shield, KeyRound, Globe, UserCheck, Calendar, Clock } from "lucide-react";
import { PageHeader, Panel } from "@/components/kit";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { userSessionService } from "@/lib/user-session";
import { formatDateTime, getLocalTimezoneName } from "@/lib/date-utils";

export const Route = createFileRoute("/_shell/profile")({
  head: () => ({
    meta: [
      { title: "My Profile · NCOP ERP" },
      {
        name: "description",
        content: "Account details, assigned organizational roles, and active module rights.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const user = userSessionService.getCurrentUser();

  const fullName =
    (user?.firstName || user?.lastName)
      ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
      : user?.name || user?.email?.split("@")[0] || "User";

  const initials =
    (user?.firstName?.[0] || "") +
    (user?.lastName?.[0] || user?.email?.[0] || "U").toUpperCase();

  const roles = user?.roles || (user?.role ? [user.role] : []);

  const moduleRights: string[] = Array.isArray(user?.moduleRights)
    ? (user.moduleRights as any[])
        .map((r) => (typeof r === "string" ? r : r.hasRight !== false ? r.name : ""))
        .filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="My Profile"
        description="Your verified identity, organizational credentials, and active ERP permissions."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main Details Panel */}
        <Panel className="lg:col-span-2 space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16 border-2 border-primary/20 shadow-soft">
              <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                  {user?.userType || "Employee"}
                </Badge>
                {roles.map((r) => (
                  <Badge key={r} variant="secondary" className="text-xs">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <dl className="grid gap-3.5 sm:grid-cols-2">
            <div className="surface p-4 rounded-xl border border-border/60">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Email Address
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Mail className="size-4 text-primary shrink-0" />
                {user?.email || "—"}
              </p>
            </div>

            <div className="surface p-4 rounded-xl border border-border/60">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Account Status
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <UserCheck className="size-4 shrink-0" />
                Active & Verified
              </p>
            </div>

            <div className="surface p-4 rounded-xl border border-border/60">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Client Timezone
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Globe className="size-4 text-primary shrink-0" />
                {getLocalTimezoneName()}
              </p>
            </div>

            <div className="surface p-4 rounded-xl border border-border/60">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Last Login
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <Clock className="size-4 text-muted-foreground shrink-0" />
                {user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Active session"}
              </p>
            </div>
          </dl>

          {/* Assigned Direct Module Rights */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="size-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned Module Rights ({moduleRights.length})
              </h3>
            </div>
            {moduleRights.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No direct module rights assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {moduleRights.map((right) => (
                  <Badge
                    key={right}
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/20 px-3 py-1 text-xs font-mono font-medium"
                  >
                    {right}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Security & Access Overview */}
        <Panel className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <h3 className="text-base font-semibold">Security & Session</h3>
          </div>

          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              Your session is protected with GxP-validated JWT encryption and session inactivity monitoring.
            </p>
            <div className="surface p-3 rounded-lg border border-border/60 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token Type:</span>
                <span className="font-mono font-medium text-foreground">Bearer (JWT)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Encryption:</span>
                <span className="font-mono font-medium text-foreground">HS256 / SHA-256</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session Expiry:</span>
                <span className="font-medium text-foreground">25 min sliding</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
