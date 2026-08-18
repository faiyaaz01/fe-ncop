import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Trash2,
  Edit,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  Clock,
  Building2,
  Mail,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { userSessionService, isUserAdmin } from "@/lib/user-session";

import { PageHeader, Panel, Reveal, StatusChip, EmptyState } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import {
  fetchUsers,
  fetchRoles,
  fetchModuleRights,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  type UserResponse,
  type RoleResponse,
  type ModuleRightItem,
  type UserStatus,
  type UserType,
  type CreateUserPayload,
  type UpdateUserPayload,
} from "@/lib/user-api";

export const Route = createFileRoute("/_shell/user-management")({
  head: () => ({
    meta: [
      { title: "User Management · NCOP ERP" },
      {
        name: "description",
        content: "Manage system users, roles, security, and module access permissions.",
      },
    ],
  }),
  component: UserManagementPage,
});

function UserManagementPage() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(() => userSessionService.getCurrentUser());

  useEffect(() => {
    return userSessionService.subscribe((u) => setCurrentUser(u));
  }, []);

  const isAdmin = useMemo(() => isUserAdmin(currentUser), [currentUser]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modal dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserResponse | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserResponse | null>(null);

  // Queries
  const {
    data: users = [],
    isLoading: isUsersLoading,
    isRefetching: isUsersRefetching,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: isAdmin,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    enabled: isAdmin,
  });

  const { data: moduleRights = [] } = useQuery({
    queryKey: ["moduleRights"],
    queryFn: fetchModuleRights,
    enabled: isAdmin,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: (data) => {
      toast.success("User created successfully", {
        description: `User ${data.email} has been added.`,
      });
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to create user", { description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: (data) => {
      toast.success("User updated successfully", {
        description: `Details for ${data.email} have been updated.`,
      });
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to update user", { description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      toast.success("User deleted", {
        description: "The user account was permanently deleted.",
      });
      setDeletingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to delete user", { description: err.message });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, pass }: { id: string; pass: string }) =>
      resetUserPassword(id, pass),
    onSuccess: () => {
      toast.success("Password reset successfully", {
        description: "The user's password has been updated.",
      });
      setResetPasswordUser(null);
    },
    onError: (err: Error) => {
      toast.error("Password reset failed", { description: err.message });
    },
  });

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchSearch =
        !searchTerm ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.roleNames?.some((r) => r.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === "ALL" || user.userStatus === statusFilter;
      const matchRole =
        roleFilter === "ALL" ||
        user.roleNames?.includes(roleFilter) ||
        user.roleIds?.includes(roleFilter);

      return matchSearch && matchStatus && matchRole;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.userStatus === "ACTIVE").length;
    const pending = users.filter((u) => u.userStatus === "PENDING").length;
    const adminCount = users.filter((u) =>
      u.roleNames?.some((r) => r.toUpperCase().includes("ADMIN"))
    ).length;

    return { total, active, pending, adminCount };
  }, [users]);

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center p-6 text-center">
        <Panel className="max-w-md items-center space-y-4 rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-soft">
          <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight">Administrator Access Required</h2>
            <p className="text-sm text-muted-foreground">
              User Management is restricted to system administrators only. If you require access, please contact your organization administrator.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-2">
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <Reveal>
        <PageHeader
          eyebrow="Access Control & Security"
          title="User Management"
          description="Manage team accounts, assign granular role permissions, and control module visibility across NCOP ERP."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchUsers()}
                disabled={isUsersRefetching}
                className="gap-1.5"
              >
                <RefreshCw className={cn("size-3.5", isUsersRefetching && "animate-spin")} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <UserPlus className="size-4" />
                Add New User
              </Button>
            </div>
          }
        />
      </Reveal>

      {/* ── Stats Overview ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Reveal delay={0.03}>
          <Panel className="gap-1.5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Users
              </span>
              <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {isUsersLoading ? <Skeleton className="h-7 w-12" /> : stats.total}
            </p>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel className="gap-1.5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Active
              </span>
              <div className="grid size-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <UserCheck className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {isUsersLoading ? <Skeleton className="h-7 w-12" /> : stats.active}
            </p>
          </Panel>
        </Reveal>

        <Reveal delay={0.09}>
          <Panel className="gap-1.5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pending / Other
              </span>
              <div className="grid size-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {isUsersLoading ? <Skeleton className="h-7 w-12" /> : stats.pending}
            </p>
          </Panel>
        </Reveal>

        <Reveal delay={0.12}>
          <Panel className="gap-1.5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Administrators
              </span>
              <div className="grid size-7 place-items-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ShieldCheck className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">
              {isUsersLoading ? <Skeleton className="h-7 w-12" /> : stats.adminCount}
            </p>
          </Panel>
        </Reveal>
      </div>

      {/* ── Filter Toolbar ───────────────────────────────────────────── */}
      <Reveal delay={0.15}>
        <Panel className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="LOCKED">Locked</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.roleId} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchTerm || statusFilter !== "ALL" || roleFilter !== "ALL") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                    setRoleFilter("ALL");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </Panel>
      </Reveal>

      {/* ── Users Table ──────────────────────────────────────────────── */}
      <Reveal delay={0.18}>
        <Panel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-secondary/40">
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    User Details
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Roles
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Module Access
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Last Login
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isUsersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-9 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-44" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="h-5 w-14 rounded-full" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-3.5 text-right"><Skeleton className="ml-auto size-8 rounded-md" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <EmptyState
                        icon={<Users className="size-6" />}
                        title="No users found"
                        description={
                          searchTerm || statusFilter !== "ALL" || roleFilter !== "ALL"
                            ? "Try adjusting your filters or search criteria."
                            : "Get started by adding your first user account."
                        }
                        action={
                          !searchTerm && statusFilter === "ALL" && roleFilter === "ALL" ? (
                            <Button
                              size="sm"
                              onClick={() => setIsCreateOpen(true)}
                              className="mt-2 gap-1.5"
                            >
                              <UserPlus className="size-4" />
                              Add User
                            </Button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const initials = getInitials(user.fullName, user.email);
                    const isAdmin = user.roleNames?.some((r) => r.toUpperCase().includes("ADMIN"));

                    return (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-secondary/30"
                      >
                        {/* User Identity */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className={cn("size-9 text-xs font-semibold", isAdmin ? "border-2 border-primary/30" : "")}>
                              <AvatarFallback className={isAdmin ? "bg-primary/15 text-primary" : "bg-secondary text-foreground"}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">
                                {user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username}
                              </p>
                              <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                                <Mail className="size-3 shrink-0" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Roles */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {user.roleNames && user.roleNames.length > 0 ? (
                              user.roleNames.map((roleName) => (
                                <Badge
                                  key={roleName}
                                  variant="secondary"
                                  className={cn(
                                    "text-[11px] font-medium tracking-wide",
                                    roleName.toUpperCase().includes("ADMIN")
                                      ? "bg-primary/12 text-primary border-primary/20"
                                      : "bg-secondary text-muted-foreground"
                                  )}
                                >
                                  {roleName}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No roles</span>
                            )}
                          </div>
                        </td>

                        {/* User Type */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-medium capitalize text-muted-foreground">
                            {user.userType?.toLowerCase() || "Employee"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusChip status={user.userStatus || "ACTIVE"} />
                        </td>

                        {/* Module Access Rights */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              <Layers className="size-3 text-primary" />
                              {user.moduleRights?.length ?? 0} modules
                            </span>
                          </div>
                        </td>

                        {/* Last Login */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5 text-xs text-muted-foreground">
                            <p>
                              {user.lastLoginDateCurrentTimezoneDateFormatted ||
                              user.lastLoginDateUtcDateTimeFormatted ||
                              (user.lastLoginDate
                                ? new Date(user.lastLoginDate).toLocaleDateString()
                                : "Never")}
                            </p>
                          </div>
                        </td>

                        {/* Actions Menu */}
                        <td className="px-4 py-3.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                              <DropdownMenuLabel className="text-xs">User Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setEditingUser(user)}
                                className="gap-2 text-xs cursor-pointer"
                              >
                                <Edit className="size-3.5 text-muted-foreground" />
                                Edit Details & Roles
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setResetPasswordUser(user)}
                                className="gap-2 text-xs cursor-pointer"
                              >
                                <KeyRound className="size-3.5 text-muted-foreground" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingUser(user)}
                                className="gap-2 text-xs text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </Reveal>

      {/* ── Create User Dialog ───────────────────────────────────────── */}
      <CreateUserDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        roles={roles}
        moduleRights={moduleRights}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isLoading={createMutation.isPending}
      />

      {/* ── Edit User Dialog ─────────────────────────────────────────── */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          roles={roles}
          moduleRights={moduleRights}
          onSubmit={(payload) =>
            updateMutation.mutate({ id: editingUser.id, payload })
          }
          isLoading={updateMutation.isPending}
        />
      )}

      {/* ── Reset Password Dialog ────────────────────────────────────── */}
      {resetPasswordUser && (
        <ResetPasswordDialog
          user={resetPasswordUser}
          open={!!resetPasswordUser}
          onOpenChange={(open) => !open && setResetPasswordUser(null)}
          onSubmit={(newPass) =>
            resetPasswordMutation.mutate({ id: resetPasswordUser.id, pass: newPass })
          }
          isLoading={resetPasswordMutation.isPending}
        />
      )}

      {/* ── Delete Confirmation Dialog ──────────────────────────────── */}
      {deletingUser && (
        <AlertDialog
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
        >
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  {deletingUser.fullName || deletingUser.email}
                </span>
                ? This action is irreversible and will permanently remove their access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deletingUser.id)}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ─── Sub-Component: Create User Dialog ───────────────────────────────────────

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleResponse[];
  moduleRights: ModuleRightItem[];
  onSubmit: (payload: CreateUserPayload) => void;
  isLoading: boolean;
}

function CreateUserDialog({
  open,
  onOpenChange,
  roles,
  moduleRights,
  onSubmit,
  isLoading,
}: CreateUserDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [userStatus, setUserStatus] = useState<UserStatus>("ACTIVE");
  const [userType, setUserType] = useState<UserType>("EMPLOYEE");
  const [selectedModuleRights, setSelectedModuleRights] = useState<string[]>([]);

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setSelectedRoleIds([]);
      setUserStatus("ACTIVE");
      setUserType("EMPLOYEE");
      // Default to common rights
      setSelectedModuleRights(moduleRights.map((m) => m.name));
    }
    onOpenChange(isOpen);
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleModuleToggle = (moduleName: string) => {
    setSelectedModuleRights((prev) =>
      prev.includes(moduleName)
        ? prev.filter((name) => name !== moduleName)
        : [...prev, moduleName]
    );
  };

  const handleSelectAllModules = () => {
    if (selectedModuleRights.length === moduleRights.length) {
      setSelectedModuleRights([]);
    } else {
      setSelectedModuleRights(moduleRights.map((m) => m.name));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Required fields missing", {
        description: "Email and password are required.",
      });
      return;
    }
    onSubmit({
      email,
      password,
      firstName,
      lastName,
      roleIds: selectedRoleIds,
      moduleRights: selectedModuleRights,
      userStatus,
      userType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="size-5 text-primary" />
            Create New User Account
          </DialogTitle>
          <DialogDescription>
            Add a new user, assign their primary roles, and configure their module visibility.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-semibold">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="e.g. John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-semibold">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="e.g. Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              {/* Email & Password */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="name@ncop.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    Initial Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status & User Type */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">User Type</Label>
                  <Select value={userType} onValueChange={(val: UserType) => setUserType(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Account Status</Label>
                  <Select value={userStatus} onValueChange={(val: UserStatus) => setUserStatus(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PENDING">Pending Approval</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="LOCKED">Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assign Roles */}
              <div className="space-y-2 rounded-xl border border-border/70 p-3.5 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Assigned Roles</Label>
                  <span className="text-[11px] text-muted-foreground">Select one or more</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {roles.map((role) => {
                    const isSelected = selectedRoleIds.includes(role.roleId);
                    return (
                      <button
                        key={role.roleId}
                        type="button"
                        onClick={() => handleRoleToggle(role.roleId)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border/80 bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <Shield className="size-3" />
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Module Access Rights */}
              <div className="space-y-2 rounded-xl border border-border/70 p-3.5 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold">Module Rights & Visibility</Label>
                    <p className="text-[11px] text-muted-foreground">Control which ERP tabs this user can access</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllModules}
                    className="h-7 text-[11px] text-primary hover:bg-primary/10"
                  >
                    {selectedModuleRights.length === moduleRights.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
                  {moduleRights.map((module) => {
                    const isChecked = selectedModuleRights.includes(module.name);
                    return (
                      <label
                        key={module.id || module.name}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-2 text-xs transition-colors cursor-pointer",
                          isChecked
                            ? "border-primary/40 bg-primary/5 text-foreground font-medium"
                            : "border-border/60 bg-background text-muted-foreground hover:bg-secondary/60"
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleModuleToggle(module.name)}
                        />
                        <span className="truncate">{module.label || module.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5">
              {isLoading ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-Component: Edit User Dialog ─────────────────────────────────────────

interface EditUserDialogProps {
  user: UserResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleResponse[];
  moduleRights: ModuleRightItem[];
  onSubmit: (payload: UpdateUserPayload) => void;
  isLoading: boolean;
}

function EditUserDialog({
  user,
  open,
  onOpenChange,
  roles,
  moduleRights,
  onSubmit,
  isLoading,
}: EditUserDialogProps) {
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [email, setEmail] = useState(user.email || "");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(user.roleIds || []);
  const [userStatus, setUserStatus] = useState<UserStatus>(user.userStatus || "ACTIVE");
  const [userType, setUserType] = useState<UserType>(user.userType || "EMPLOYEE");
  const [selectedModuleRights, setSelectedModuleRights] = useState<string[]>(
    user.moduleRights || []
  );

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleModuleToggle = (moduleName: string) => {
    setSelectedModuleRights((prev) =>
      prev.includes(moduleName)
        ? prev.filter((name) => name !== moduleName)
        : [...prev, moduleName]
    );
  };

  const handleSelectAllModules = () => {
    if (selectedModuleRights.length === moduleRights.length) {
      setSelectedModuleRights([]);
    } else {
      setSelectedModuleRights(moduleRights.map((m) => m.name));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email required");
      return;
    }
    onSubmit({
      email,
      firstName,
      lastName,
      roleIds: selectedRoleIds,
      moduleRights: selectedModuleRights,
      userStatus,
      userType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Edit className="size-5 text-primary" />
            Edit User: {user.fullName || user.email}
          </DialogTitle>
          <DialogDescription>
            Update user information, assigned roles, and module access permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-firstName" className="text-xs font-semibold">
                    First Name
                  </Label>
                  <Input
                    id="edit-firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-lastName" className="text-xs font-semibold">
                    Last Name
                  </Label>
                  <Input
                    id="edit-lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Status & User Type */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">User Type</Label>
                  <Select value={userType} onValueChange={(val: UserType) => setUserType(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Account Status</Label>
                  <Select value={userStatus} onValueChange={(val: UserStatus) => setUserStatus(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PENDING">Pending Approval</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="LOCKED">Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assign Roles */}
              <div className="space-y-2 rounded-xl border border-border/70 p-3.5 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Assigned Roles</Label>
                  <span className="text-[11px] text-muted-foreground">Select roles</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {roles.map((role) => {
                    const isSelected = selectedRoleIds.includes(role.roleId);
                    return (
                      <button
                        key={role.roleId}
                        type="button"
                        onClick={() => handleRoleToggle(role.roleId)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border/80 bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <Shield className="size-3" />
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Module Access Rights */}
              <div className="space-y-2 rounded-xl border border-border/70 p-3.5 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold">Module Rights & Visibility</Label>
                    <p className="text-[11px] text-muted-foreground">Control which ERP tabs this user can access</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllModules}
                    className="h-7 text-[11px] text-primary hover:bg-primary/10"
                  >
                    {selectedModuleRights.length === moduleRights.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
                  {moduleRights.map((module) => {
                    const isChecked = selectedModuleRights.includes(module.name);
                    return (
                      <label
                        key={module.id || module.name}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-2 text-xs transition-colors cursor-pointer",
                          isChecked
                            ? "border-primary/40 bg-primary/5 text-foreground font-medium"
                            : "border-border/60 bg-background text-muted-foreground hover:bg-secondary/60"
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleModuleToggle(module.name)}
                        />
                        <span className="truncate">{module.label || module.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-Component: Reset Password Dialog ────────────────────────────────────

interface ResetPasswordDialogProps {
  user: UserResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => void;
  isLoading: boolean;
}

function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password too short", {
        description: "Password must be at least 6 characters.",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match", {
        description: "Please confirm the password again.",
      });
      return;
    }
    onSubmit(password);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="size-5 text-primary" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Set a new secure password for{" "}
            <span className="font-semibold text-foreground">{user.email}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-semibold">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-semibold">
              Confirm Password
            </Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5">
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
