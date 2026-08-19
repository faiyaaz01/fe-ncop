import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import {
  Users,
  Shield,
  KeyRound,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  Edit2,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Ban,
  Globe,
  Loader2,
  UserCheck,
  UserX
} from "lucide-react";
import { PageHeader, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  fetchModuleRights,
  createModuleRight,
  updateModuleRight,
  deleteModuleRight,
} from "@/lib/auth-api";
import type {
  UserResponse,
  RoleResponse,
  ModuleRight,
  UserStatus,
  UserType,
} from "@/lib/auth-types";
import {
  formatDateTime,
  formatShortDateTime,
  TIMEZONE_OPTIONS,
  type SupportedTimezone,
} from "@/lib/date-utils";

export const Route = createFileRoute("/_shell/user-management")({
  head: () => ({
    meta: [
      { title: "User & Access Management · NCOP ERP" },
      {
        name: "description",
        content: "Manage users, organizational roles, and user-level module access rights.",
      },
    ],
  }),
  component: UserManagementPage,
});

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "rights">("users");
  const [timezone, setTimezone] = useState<SupportedTimezone>("LOCAL");

  // ── Queries ──
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["auth-users"],
    queryFn: fetchUsers,
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["auth-roles"],
    queryFn: fetchRoles,
  });

  const { data: moduleRights = [], isLoading: loadingRights } = useQuery({
    queryKey: ["auth-module-rights"],
    queryFn: fetchModuleRights,
  });

  // ── Modals State ──
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);

  const [rightModalOpen, setRightModalOpen] = useState(false);
  const [editingRight, setEditingRight] = useState<ModuleRight | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "user" | "role" | "right";
    id: string;
    name: string;
  } | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // ── Summary Stats ──
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.effectiveActive).length;
    const inactiveUsers = users.filter((u) => u.userStatus === "INACTIVE").length;
    const suspendedUsers = users.filter((u) => u.userStatus === "SUSPENDED").length;
    const pendingUsers = users.filter((u) => u.userStatus === "PENDING").length;
    const roleInactiveUsers = users.filter((u) => !u.hasActiveRole && u.roleIds.length > 0).length;

    const totalRoles = roles.length;
    const activeRoles = roles.filter((r) => r.active).length;
    const inactiveRoles = roles.filter((r) => !r.active).length;
    const totalRights = moduleRights.length;

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      pendingUsers,
      roleInactiveUsers,
      totalRoles,
      activeRoles,
      inactiveRoles,
      totalRights,
    };
  }, [users, roles, moduleRights]);

  return (
    <div className="space-y-6">
      {/* ── Page Header with Timezone Selector ── */}
      <PageHeader
        eyebrow="Security & Governance"
        title="User & Access Management"
        description="Configure users, organizational roles, and user-level module access rights."
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Timezone Switcher */}
            <div className="flex items-center gap-1.5 surface px-3 py-1.5 rounded-lg border border-border/60 text-xs">
              <Globe className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground hidden sm:inline">Timezone:</span>
              <Select value={timezone} onValueChange={(v) => setTimezone(v as SupportedTimezone)}>
                <SelectTrigger className="h-6 border-0 bg-transparent p-0 text-xs font-semibold focus:ring-0 w-auto gap-1 p-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value} className="text-xs">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action based on active tab */}
            {activeTab === "users" && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingUser(null);
                  setUserModalOpen(true);
                }}
              >
                <Plus className="size-4" /> Add User
              </Button>
            )}
            {activeTab === "roles" && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingRole(null);
                  setRoleModalOpen(true);
                }}
              >
                <Plus className="size-4" /> Add Role
              </Button>
            )}
            {activeTab === "rights" && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingRight(null);
                  setRightModalOpen(true);
                }}
              >
                <Plus className="size-4" /> Add Module Right
              </Button>
            )}
          </div>
        }
      />

      {/* ── User Metric Summary Cards (Informational Overview) ── */}
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {/* Total Users */}
          <div className="surface p-3.5 rounded-xl border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Total Users</p>
              <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.totalUsers}</p>
          </div>

          {/* Active Users */}
          <div className="surface p-3.5 rounded-xl border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Active Users</p>
              <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <UserCheck className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">{stats.activeUsers}</p>
          </div>

          {/* Inactive Users */}
          <div className="surface p-3.5 rounded-xl border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Inactive Users</p>
              <div className="grid size-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
                <UserX className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 text-slate-600 dark:text-slate-400">{stats.inactiveUsers}</p>
          </div>

          {/* Blocked / Suspended */}
          <div className="surface p-3.5 rounded-xl border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Blocked / Suspended</p>
              <div className="grid size-8 place-items-center rounded-lg bg-destructive/10 text-destructive">
                <Ban className="size-4" />
              </div>
            </div>
            <p className={cn("text-2xl font-bold mt-2", stats.suspendedUsers > 0 ? "text-destructive" : "text-muted-foreground")}>
              {stats.suspendedUsers}
            </p>
          </div>

          {/* Pending Approval */}
          <div className="surface p-3.5 rounded-xl border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Pending Approval</p>
              <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="size-4" />
              </div>
            </div>
            <p className={cn("text-2xl font-bold mt-2", stats.pendingUsers > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
              {stats.pendingUsers}
            </p>
          </div>

          {/* Role Inactive Warning */}
          <div className="surface p-3.5 rounded-xl border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">Role Inactive</p>
              <div className="grid size-8 place-items-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <ShieldAlert className="size-4" />
              </div>
            </div>
            <p className={cn("text-2xl font-bold mt-2", stats.roleInactiveUsers > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>
              {stats.roleInactiveUsers}
            </p>
          </div>
        </div>

        {/* ── Role & System Rights Secondary Stats ── */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {/* Total Configured Roles */}
          <div className="surface p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Shield className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Configured Roles</p>
                <p className="text-xl font-bold mt-0.5">{stats.totalRoles}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {stats.activeRoles} Active · {stats.inactiveRoles} Inactive
            </Badge>
          </div>

          {/* Active Roles */}
          <div className="surface p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Operating Roles</p>
                <p className="text-xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{stats.activeRoles}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Allows user login</span>
          </div>

          {/* Inactive Roles */}
          <div className="surface p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <ShieldOff className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Deactivated Roles</p>
                <p className={cn("text-xl font-bold mt-0.5", stats.inactiveRoles > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                  {stats.inactiveRoles}
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Blocks user login</span>
          </div>
        </div>
      </div>

      {/* ── Main Tabbed Content ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-5">
        <div className="overflow-x-auto pb-1"><TabsList className="surface p-1 border border-border/60 h-auto flex w-max sm:w-auto">
          <TabsTrigger value="users" className="gap-2 py-2 px-4 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="size-3.5" /> Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 py-2 px-4 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="size-3.5" /> Roles ({roles.length})
          </TabsTrigger>
          <TabsTrigger value="rights" className="gap-2 py-2 px-4 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <KeyRound className="size-3.5" /> Module Rights ({moduleRights.length})
          </TabsTrigger>
        </TabsList></div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: USERS
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="users">
          <UsersTab
            users={users}
            roles={roles}
            moduleRights={moduleRights}
            timezone={timezone}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            isLoading={loadingUsers}
            onEdit={(u) => {
              setEditingUser(u);
              setUserModalOpen(true);
            }}
            onDelete={(u) => {
              setDeleteConfirm({
                type: "user",
                id: u.id,
                name: u.fullName || u.email,
              });
            }}
          />
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: ROLES
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="roles">
          <RolesTab
            roles={roles}
            timezone={timezone}
            isLoading={loadingRoles}
            onEdit={(r) => {
              setEditingRole(r);
              setRoleModalOpen(true);
            }}
            onDelete={(r) => {
              setDeleteConfirm({
                type: "role",
                id: r.roleId,
                name: r.name,
              });
            }}
          />
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: MODULE RIGHTS
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="rights">
          <ModuleRightsTab
            moduleRights={moduleRights}
            timezone={timezone}
            isLoading={loadingRights}
            onEdit={(mr) => {
              setEditingRight(mr);
              setRightModalOpen(true);
            }}
            onDelete={(mr) => {
              setDeleteConfirm({
                type: "right",
                id: mr.id || mr.name,
                name: mr.label || mr.name,
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* ── User Add/Edit Dialog ── */}
      <UserFormDialog
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
        editingUser={editingUser}
        roles={roles}
        moduleRights={moduleRights}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["auth-users"] })}
      />

      {/* ── Role Add/Edit Dialog ── */}
      <RoleFormDialog
        open={roleModalOpen}
        onOpenChange={setRoleModalOpen}
        editingRole={editingRole}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["auth-roles"] });
          queryClient.invalidateQueries({ queryKey: ["auth-users"] });
        }}
      />

      {/* ── Module Right Add/Edit Dialog ── */}
      <ModuleRightFormDialog
        open={rightModalOpen}
        onOpenChange={setRightModalOpen}
        editingRight={editingRight}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["auth-module-rights"] });
          queryClient.invalidateQueries({ queryKey: ["auth-users"] });
        }}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Delete {deleteConfirm?.type === "user" ? "User" : deleteConfirm?.type === "role" ? "Role" : "Module Right"}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm">
              Are you sure you want to permanently delete <strong className="text-foreground">{deleteConfirm?.name}</strong>?
              {deleteConfirm?.type === "role" && " Users assigned to this role will lose this role assignment."}
              {deleteConfirm?.type === "right" && " This permission will be removed from all users who currently have it."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteConfirm) return;
                try {
                  if (deleteConfirm.type === "user") {
                    await deleteUser(deleteConfirm.id);
                    toast.success("User deleted successfully");
                    queryClient.invalidateQueries({ queryKey: ["auth-users"] });
                  } else if (deleteConfirm.type === "role") {
                    await deleteRole(deleteConfirm.id);
                    toast.success("Role deleted successfully");
                    queryClient.invalidateQueries({ queryKey: ["auth-roles"] });
                    queryClient.invalidateQueries({ queryKey: ["auth-users"] });
                  } else if (deleteConfirm.type === "right") {
                    await deleteModuleRight(deleteConfirm.id);
                    toast.success("Module right deleted successfully");
                    queryClient.invalidateQueries({ queryKey: ["auth-module-rights"] });
                    queryClient.invalidateQueries({ queryKey: ["auth-users"] });
                  }
                  setDeleteConfirm(null);
                } catch (e: any) {
                  toast.error(e.message || "Failed to delete");
                }
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// USERS TAB COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

function UsersTab({
  users,
  roles,
  moduleRights,
  timezone,
  statusFilter,
  onStatusFilterChange,
  isLoading,
  onEdit,
  onDelete,
}: {
  users: UserResponse[];
  roles: RoleResponse[];
  moduleRights: ModuleRight[];
  timezone: SupportedTimezone;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  isLoading: boolean;
  onEdit: (user: UserResponse) => void;
  onDelete: (user: UserResponse) => void;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        search === "" ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.fullName && u.fullName.toLowerCase().includes(search.toLowerCase())) ||
        u.roleNames.some((r) => r.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ROLE_INACTIVE" ? !u.hasActiveRole && u.roleIds.length > 0 : u.userStatus === statusFilter);

      const matchesRole =
        roleFilter === "ALL" || u.roleNames.includes(roleFilter);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  const roleMap = useMemo(() => {
    const map = new Map<string, RoleResponse>();
    roles.forEach((r) => map.set(r.roleId, r));
    return map;
  }, [roles]);

  if (isLoading) {
    return (
      <div className="surface p-12 text-center rounded-xl flex flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading users directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-38 h-10 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ROLE_INACTIVE">Role Inactive ⚠️</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-38 h-10 text-xs">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.roleId} value={r.name}>
                  {r.name} {!r.active && "(Inactive)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Users Table ── */}
      <div className="surface rounded-xl border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Assigned Rights</th>
                <th className="px-4 py-3.5">Last Login</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No users found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const initials =
                    (user.firstName?.[0] || "") + (user.lastName?.[0] || user.email[0] || "U").toUpperCase();

                  return (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      {/* User Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 border border-border shrink-0">
                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate text-sm">
                              {user.fullName || user.email.split("@")[0]}
                            </p>
                            <p className="text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {user.roleNames.length === 0 ? (
                            <span className="text-muted-foreground italic text-xs">No role</span>
                          ) : (
                            user.roleNames.map((roleName) => (
                              <Badge key={roleName} variant="secondary" className="font-medium text-[11px]">
                                {roleName}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {/* Role Inactive Warning */}
                          {!user.hasActiveRole && user.roleIds.length > 0 && (
                            <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold border border-amber-500/30">
                              <AlertTriangle className="size-3" /> Role Inactive
                            </div>
                          )}

                          {/* Account Status Badge */}
                          <div>
                            {user.userStatus === "ACTIVE" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30 font-medium">
                                Active
                              </Badge>
                            ) : user.userStatus === "PENDING" ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-400 font-medium">
                                Pending
                              </Badge>
                            ) : user.userStatus === "SUSPENDED" ? (
                              <Badge variant="destructive" className="font-medium">
                                Suspended
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="font-medium text-muted-foreground">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Direct Module Rights */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                          {user.moduleRights.length === 0 ? (
                            <span className="text-muted-foreground italic">No rights assigned</span>
                          ) : (
                            <>
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[11px] font-semibold">
                                {user.moduleRights.length} module{user.moduleRights.length > 1 ? "s" : ""}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground truncate">
                                {user.moduleRights.slice(0, 2).join(", ")}
                                {user.moduleRights.length > 2 ? ` + ${user.moduleRights.length - 2} more` : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Last Login in Selected Timezone */}
                      <td className="px-4 py-3.5 text-muted-foreground font-mono text-[11px]">
                        {formatShortDateTime(user.lastLoginDate, timezone)}
                      </td>

                      {/* Created in Selected Timezone */}
                      <td className="px-4 py-3.5 text-muted-foreground font-mono text-[11px]">
                        {formatShortDateTime(user.createdOn, timezone)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(user)}>
                              <Edit2 className="size-3.5 mr-2" /> Edit User & Rights
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-3.5 mr-2" /> Delete User
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
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROLES TAB COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

function RolesTab({
  roles,
  timezone,
  isLoading,
  onEdit,
  onDelete,
}: {
  roles: RoleResponse[];
  timezone: SupportedTimezone;
  isLoading: boolean;
  onEdit: (role: RoleResponse) => void;
  onDelete: (role: RoleResponse) => void;
}) {
  const queryClient = useQueryClient();

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ roleId, active }: { roleId: string; active: boolean }) => {
      return updateRole(roleId, { active });
    },
    onSuccess: (updated) => {
      toast.success(`Role "${updated.name}" is now ${updated.active ? "Active" : "Inactive"}`);
      queryClient.invalidateQueries({ queryKey: ["auth-roles"] });
      queryClient.invalidateQueries({ queryKey: ["auth-users"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update role status");
    },
  });

  if (isLoading) {
    return (
      <div className="surface p-12 text-center rounded-xl flex flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface rounded-xl border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Role Name</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5">Assigned Users</th>
                <th className="px-4 py-3.5">Active Status</th>
                <th className="px-4 py-3.5">Last Updated</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No roles created yet.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.roleId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "grid size-8 place-items-center rounded-lg font-bold text-xs shrink-0",
                          role.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <Shield className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{role.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ID: {role.roleId.slice(-6)}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground max-w-sm">
                      {role.description || <span className="italic">No description provided</span>}
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge variant="secondary" className="font-medium text-xs">
                        <Users className="size-3 mr-1 text-muted-foreground" /> {role.userCount} user{role.userCount !== 1 ? "s" : ""}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={role.active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ roleId: role.roleId, active: checked })
                          }
                          disabled={toggleActiveMutation.isPending}
                        />
                        <span className={cn("text-xs font-medium", role.active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                          {role.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground font-mono text-[11px]">
                      {formatShortDateTime(role.lastUpdatedOn || role.createdOn, timezone)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(role)}>
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(role)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE RIGHTS TAB COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

function ModuleRightsTab({
  moduleRights,
  timezone,
  isLoading,
  onEdit,
  onDelete,
}: {
  moduleRights: ModuleRight[];
  timezone: SupportedTimezone;
  isLoading: boolean;
  onEdit: (mr: ModuleRight) => void;
  onDelete: (mr: ModuleRight) => void;
}) {
  if (isLoading) {
    return (
      <div className="surface p-12 text-center rounded-xl flex flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading module rights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface rounded-xl border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Module Right Name</th>
                <th className="px-4 py-3.5">Display Label</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {moduleRights.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No module rights defined yet.
                  </td>
                </tr>
              ) : (
                moduleRights.map((mr) => (
                  <tr key={mr.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <KeyRound className="size-4 text-primary shrink-0" />
                        <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded text-foreground">
                          {mr.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-foreground text-sm">
                      {mr.label || mr.name}
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground max-w-sm">
                      {mr.description || <span className="italic">No description</span>}
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground font-mono text-[11px]">
                      {formatShortDateTime(mr.createdOn, timezone)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(mr)}>
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(mr)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// USER ADD / EDIT DIALOG (With Direct User-Level Module Rights Assignment)
// ══════════════════════════════════════════════════════════════════════════════

function UserFormDialog({
  open,
  onOpenChange,
  editingUser,
  roles,
  moduleRights,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: UserResponse | null;
  roles: RoleResponse[];
  moduleRights: ModuleRight[];
  onSuccess: () => void;
}) {
  const isEdit = !!editingUser;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userStatus, setUserStatus] = useState<UserStatus>("ACTIVE");
  const [userType, setUserType] = useState<UserType>("EMPLOYEE");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedModuleRights, setSelectedModuleRights] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state on open
  useEffect(() => {
    if (open) {
      if (editingUser) {
        setEmail(editingUser.email || "");
        setPassword("");
        setFirstName(editingUser.firstName || "");
        setLastName(editingUser.lastName || "");
        setUserStatus(editingUser.userStatus || "ACTIVE");
        setUserType(editingUser.userType || "EMPLOYEE");
        setSelectedRoleIds(editingUser.roleIds || []);
        setSelectedModuleRights(editingUser.moduleRights || []);
      } else {
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setUserStatus("ACTIVE");
        setUserType("EMPLOYEE");
        const activeRole = roles.find((r) => r.active);
        setSelectedRoleIds(activeRole ? [activeRole.roleId] : []);
        setSelectedModuleRights(["DASHBOARD"]);
      }
    }
  }, [open, editingUser?.id]);

  const toggleRight = (rightName: string) => {
    setSelectedModuleRights((prev) =>
      prev.includes(rightName) ? prev.filter((r) => r !== rightName) : [...prev, rightName]
    );
  };

  const handleSelectAllRights = () => {
    setSelectedModuleRights(moduleRights.map((mr) => mr.name));
  };

  const handleClearAllRights = () => {
    setSelectedModuleRights([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!isEdit && !password.trim()) {
      toast.error("Password is required for new user");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && editingUser) {
        await updateUser(editingUser.id, {
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          roleIds: selectedRoleIds,
          moduleRights: selectedModuleRights,
          userStatus,
          userType,
        });
        toast.success("User updated successfully");
      } else {
        await createUser({
          email: email.trim(),
          password: password.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          roleIds: selectedRoleIds,
          moduleRights: selectedModuleRights,
          userStatus,
          userType,
        });
        toast.success("User created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0 sm:w-[92vw] sm:max-w-3xl lg:max-w-4xl sm:h-[88vh] sm:rounded-2xl flex flex-col p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 shrink-0 border-b border-border/40 bg-muted/20">
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit User & Access Rights" : "Create New User"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEdit
              ? `Modify profile details and direct module permissions for ${editingUser?.email}`
              : "Set up a new system user with direct module permissions and role assignment."}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold">Profile & Credentials</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">First Name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Ramesh" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last Name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Patel" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email Address *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@ncop.com"
                    required
                  />
                </div>
                {!isEdit && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Initial Password *</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                )}
              </div>
            </fieldset>

            {/* Role & Status */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold">Role & Organization Status</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Role Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Assigned Role</Label>
                  <Select
                    value={selectedRoleIds[0] || "none"}
                    onValueChange={(v) => setSelectedRoleIds(v === "none" ? [] : [v])}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Role</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.roleId} value={r.roleId}>
                          {r.name} {!r.active && "(⚠️ Inactive)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Account Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Account Status</Label>
                  <Select value={userStatus} onValueChange={(v) => setUserStatus(v as UserStatus)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* User Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs">User Classification</Label>
                  <Select value={userType} onValueChange={(v) => setUserType(v as UserType)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>

            {/* Direct Module Rights Assignment (User-Level Only) */}
            <fieldset className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <legend className="text-sm font-semibold">User-Level Module Rights</legend>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assign specific ERP modules this user is authorized to access.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectAllRights} className="text-xs h-7">
                    Select All
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleClearAllRights} className="text-xs h-7">
                    Clear All
                  </Button>
                </div>
              </div>

              {moduleRights.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No system module rights configured.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {moduleRights.map((mr) => {
                    const isChecked = selectedModuleRights.includes(mr.name);
                    return (
                      <div
                        key={mr.name}
                        onClick={() => toggleRight(mr.name)}
                        className={cn(
                          "cursor-pointer surface p-3 rounded-xl border transition-all flex items-start gap-3 select-none",
                          isChecked
                            ? "border-primary/50 bg-primary/5 shadow-soft ring-1 ring-primary/20"
                            : "border-border/60 hover:border-border"
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleRight(mr.name)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground leading-tight">
                            {mr.label || mr.name}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
                            {mr.name}
                          </p>
                          {mr.description && (
                            <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2">
                              {mr.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </fieldset>
          </form>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 shrink-0 border-t border-border/40 bg-background flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Update User" : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROLE ADD / EDIT DIALOG
// ══════════════════════════════════════════════════════════════════════════════

function RoleFormDialog({
  open,
  onOpenChange,
  editingRole,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRole: RoleResponse | null;
  onSuccess: () => void;
}) {
  const isEdit = !!editingRole;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingRole) {
        setName(editingRole.name || "");
        setDescription(editingRole.description || "");
        setActive(editingRole.active ?? true);
      } else {
        setName("");
        setDescription("");
        setActive(true);
      }
    }
  }, [open, editingRole?.roleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && editingRole) {
        await updateRole(editingRole.roleId, {
          name: name.trim().toUpperCase(),
          description: description.trim(),
          active,
        });
        toast.success("Role updated successfully");
      } else {
        await createRole({
          name: name.trim().toUpperCase(),
          description: description.trim(),
          active,
        });
        toast.success("Role created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save role");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0 sm:max-w-lg sm:rounded-2xl flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-4 shrink-0 border-b border-border/40 bg-muted/20">
          <DialogTitle>{isEdit ? "Edit Organizational Role" : "Create New Role"}</DialogTitle>
          <DialogDescription className="text-xs">
            Roles categorize team members. Note: Specific module rights are assigned directly per user.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Role Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SALES_MANAGER, QA_LEAD"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Oversees commercial export operations"
            />
          </div>

          <div className="flex items-center justify-between surface p-3.5 rounded-xl border border-border/60">
            <div>
              <Label className="text-xs font-semibold">Active Status</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                If deactivated, users assigned solely to this role will be blocked from logging in.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </form>
        </div>

        <DialogFooter className="px-6 py-4 shrink-0 border-t border-border/40 bg-background flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="role-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Update Role" : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE RIGHT ADD / EDIT DIALOG
// ══════════════════════════════════════════════════════════════════════════════

function ModuleRightFormDialog({
  open,
  onOpenChange,
  editingRight,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRight: ModuleRight | null;
  onSuccess: () => void;
}) {
  const isEdit = !!editingRight;
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingRight) {
        setName(editingRight.name || "");
        setLabel(editingRight.label || "");
        setDescription(editingRight.description || "");
      } else {
        setName("");
        setLabel("");
        setDescription("");
      }
    }
  }, [open, editingRight?.id, editingRight?.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Module right identifier is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && editingRight?.id) {
        await updateModuleRight(editingRight.id, {
          name: name.trim().toUpperCase(),
          label: label.trim(),
          description: description.trim(),
        });
        toast.success("Module right updated successfully");
      } else {
        await createModuleRight({
          name: name.trim().toUpperCase(),
          label: label.trim(),
          description: description.trim(),
        });
        toast.success("Module right created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save module right");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0 sm:max-w-lg sm:rounded-2xl flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-4 shrink-0 border-b border-border/40 bg-muted/20">
          <DialogTitle>{isEdit ? "Edit Module Right" : "Register New Module Right"}</DialogTitle>
          <DialogDescription className="text-xs">
            Module rights represent features or pages that can be directly granted to users.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <form id="right-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">System Identifier (Key) *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. INVENTORY_MANAGEMENT"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Display Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Inventory Management"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Grants access to warehouse inventory tracking"
            />
          </div>
        </form>
        </div>

        <DialogFooter className="px-6 py-4 shrink-0 border-t border-border/40 bg-background flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="right-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Update Right" : "Create Right"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
