import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Shield, KeyRound, Globe, UserCheck, Clock, Pencil, LockKeyhole } from "lucide-react";
import { PageHeader, Panel } from "@/components/kit";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type AppUser, userSessionService } from "@/lib/user-session";
import { resetUserPassword, updateUser } from "@/lib/user-api";
import { formatDateTime, getLocalTimezoneName } from "@/lib/date-utils";

export const Route = createFileRoute("/_shell/profile")({
  head: () => ({
    meta: [
      { title: "My Profile · Nourish Pharmaceutical ERP" },
      {
        name: "description",
        content: "Account details, assigned organizational roles, and active module rights.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [user, setUser] = useState(() => userSessionService.getCurrentUser());
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => userSessionService.subscribe((currentUser) => setUser(currentUser)), []);

  const fullName =
    user?.firstName || user?.lastName
      ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
      : user?.name || user?.email?.split("@")[0] || "User";

  const initials =
    (user?.firstName?.[0] || "") + (user?.lastName?.[0] || user?.email?.[0] || "U").toUpperCase();

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
        actions={
          <Button onClick={() => setIsEditorOpen(true)}>
            <Pencil className="size-4" /> Edit profile
          </Button>
        }
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
                <Badge
                  variant="outline"
                  className="bg-primary/5 text-primary border-primary/20 text-xs"
                >
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
              <p className="text-xs text-muted-foreground italic">
                No direct module rights assigned.
              </p>
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
              Your session is protected with GxP-validated JWT encryption and session inactivity
              monitoring.
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

      <EditProfileDialog open={isEditorOpen} onOpenChange={setIsEditorOpen} user={user} />
    </div>
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setNewPassword("");
    setConfirmPassword("");
  }, [open, user?.id, user?.firstName, user?.lastName]);

  const userId = user?.id;

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      toast.error("Your profile could not be identified. Please sign in again.");
      return;
    }
    if (!firstName.trim() && !lastName.trim()) {
      toast.error("Enter at least a first name or last name.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await updateUser(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      await userSessionService.updateCurrentUser({
        firstName: updated.firstName ?? firstName.trim(),
        lastName: updated.lastName ?? lastName.trim(),
      });
      toast.success("Profile details updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const resetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      toast.error("Your profile could not be identified. Please sign in again.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Your new password must contain at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      await resetUserPassword(userId, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update your password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your display name or choose a new password for your account.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={saveProfile}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Pencil className="size-4 text-primary" /> Profile details
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-first-name">First name</Label>
              <Input
                id="profile-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-last-name">Last name</Label>
              <Input
                id="profile-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Your email address and account access are managed by an administrator.
          </p>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? "Saving…" : "Save name"}
            </Button>
          </div>
        </form>

        <Separator />

        <form className="space-y-4" onSubmit={resetPassword}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <LockKeyhole className="size-4 text-primary" /> Reset password
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-new-password">New password</Label>
              <Input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-confirm-password">Confirm new password</Label>
              <Input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use at least 6 characters. You will use this password the next time you sign in.
          </p>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSavingPassword}>
              {isSavingPassword ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
