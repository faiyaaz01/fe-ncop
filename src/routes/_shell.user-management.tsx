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
  Plus,
  Sliders,
  CheckSquare,
  Square,
  Save,
  Check,
  ToggleLeft,
  ToggleRight,
  Info,
  SlidersHorizontal,
  FolderLock,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  createRole,
  updateRole,
  deleteRole,
  createModuleRight,
  updateModuleRight,
  deleteModuleRight,
  type UserResponse,
  type RoleResponse,
  type ModuleRightItem,
  type UserStatus,
  type UserType,
  type CreateUserPayload,
  type UpdateUserPayload,
  type CreateRolePayload,
  type UpdateRolePayload,
  type CreateModuleRightPayload,
  type UpdateModuleRightPayload,
} from "@/lib/user-api";

export const Route = createFileRoute("/_shell/user-management")({
  head: () => ({
    meta: [
      { title: "User & Role Management · NCOP ERP" },
      {
        name: "description",
        content: "Manage system users, roles, security, and granular module access permissions.",
      },
    ],
  }),
  component: UserManagementPage,
});

// Granular actions for permission matrix
const ACTIONS = [
  { key: "VIEW", label: "View", desc: "Read & inspect" },
  { key: "CREATE", label: "Create", desc: "Add new items" },
  { key: "EDIT", label: "Edit", desc: "Modify records" },
  { key: "DELETE", label: "Delete", desc: "Remove items" },
] as const;

function UserManagementPage() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(() => userSessionService.getCurrentUser());

  useEffect(() => {
    return userSessionService.subscribe((u) => setCurrentUser(u));
  }, []);

  const isAdmin = useMemo(() => isUserAdmin(currentUser), [currentUser]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "permissions">("users");

  // Users Tab: Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // User Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserResponse | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserResponse | null>(null);

  // Role Modals
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleResponse | null>(null);

  // Module Right Modals
  const [isCreateModuleOpen, setIsCreateModuleOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleRightItem | null>(null);

  // Permission Matrix State
  const [selectedMatrixRoleId, setSelectedMatrixRoleId] = useState<string>("");
  const [matrixPermissions, setMatrixPermissions] = useState<Set<string>>(new Set());
  const [isMatrixDirty, setIsMatrixDirty] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
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

  const {
    data: roles = [],
    isLoading: isRolesLoading,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    enabled: isAdmin,
  });

  const {
    data: moduleRights = [],
    isLoading: isModulesLoading,
    refetch: refetchModules,
  } = useQuery({
    queryKey: ["moduleRights"],
    queryFn: fetchModuleRights,
    enabled: isAdmin,
  });

  // Sync initial matrix role selection
  useEffect(() => {
    if (roles.length > 0 && !selectedMatrixRoleId) {
      setSelectedMatrixRoleId(roles[0].roleId);
    }
  }, [roles, selectedMatrixRoleId]);

  // Sync matrix permissions when selected role changes
  useEffect(() => {
    if (selectedMatrixRoleId && roles.length > 0) {
      const selectedRole = roles.find((r) => r.roleId === selectedMatrixRoleId);
      if (selectedRole) {
        setMatrixPermissions(new Set(selectedRole.moduleRights || []));
        setIsMatrixDirty(false);
      }
    }
  }, [selectedMatrixRoleId, roles]);

  // ── Mutations: Users ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: (data) => {
      toast.success("User created successfully", {
        description: `User ${data.email} has been added.`,
      });
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
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
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to update user", { description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      toast.success("User deleted", {
        description: "The user account was permanently removed.",
      });
      setDeletingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
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

  // ── Mutations: Roles ───────────────────────────────────────────────────────
  const createRoleMutation = useMutation({
    mutationFn: (payload: CreateRolePayload) => createRole(payload),
    onSuccess: (data) => {
      toast.success("Role created", {
        description: `Role "${data.name}" was successfully created.`,
      });
      setIsCreateRoleOpen(false);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to create role", { description: err.message });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) =>
      updateRole(id, payload),
    onSuccess: (data) => {
      toast.success("Role updated", {
        description: `Role "${data.name}" and all assigned users have been updated.`,
      });
      setEditingRole(null);
      setIsMatrixDirty(false);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to update role", { description: err.message });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      toast.success("Role deleted", {
        description: "The role was removed and unassigned from all users.",
      });
      setDeletingRole(null);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to delete role", { description: err.message });
    },
  });

  // ── Mutations: Module Rights ───────────────────────────────────────────────
  const createModuleMutation = useMutation({
    mutationFn: (payload: CreateModuleRightPayload) => createModuleRight(payload),
    onSuccess: (data) => {
      toast.success("Module right added", {
        description: `Module "${data.name}" was added to the system permissions.`,
      });
      setIsCreateModuleOpen(false);
      queryClient.invalidateQueries({ queryKey: ["moduleRights"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to add module", { description: err.message });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateModuleRightPayload }) =>
      updateModuleRight(id, payload),
    onSuccess: (data) => {
      toast.success("Module right updated", {
        description: `Module "${data.name}" was updated and synchronized across all roles & users.`,
      });
      setEditingModule(null);
      queryClient.invalidateQueries({ queryKey: ["moduleRights"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to update module", { description: err.message });
    },
  });

  // ── Permission Matrix Helpers ──────────────────────────────────────────────
  const toggleMatrixPermission = (permissionKey: string) => {
    setMatrixPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permissionKey)) {
        next.delete(permissionKey);
      } else {
        next.add(permissionKey);
      }
      setIsMatrixDirty(true);
      return next;
    });
  };

  const toggleRowAllPermissions = (moduleName: string) => {
    const rowKeys = [
      moduleName,
      ...ACTIONS.map((a) => `${moduleName}_${a.key}`),
    ];
    const allSelected = rowKeys.every((k) => matrixPermissions.has(k));

    setMatrixPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        rowKeys.forEach((k) => next.delete(k));
      } else {
        rowKeys.forEach((k) => next.add(k));
      }
      setIsMatrixDirty(true);
      return next;
    });
  };

  const handleSelectAllMatrix = () => {
    const allPossibleKeys: string[] = [];
    moduleRights.forEach((m) => {
      allPossibleKeys.push(m.name);
      ACTIONS.forEach((a) => allPossibleKeys.push(`${m.name}_${a.key}`));
    });

    const isAll = allPossibleKeys.every((k) => matrixPermissions.has(k));
    setMatrixPermissions(isAll ? new Set() : new Set(allPossibleKeys));
    setIsMatrixDirty(true);
  };

  const handleSaveMatrix = () => {
    if (!selectedMatrixRoleId) return;
    const currentRole = roles.find((r) => r.roleId === selectedMatrixRoleId);
    if (!currentRole) return;

    updateRoleMutation.mutate({
      id: selectedMatrixRoleId,
      payload: {
        name: currentRole.name,
        description: currentRole.description,
        active: currentRole.active,
        moduleRights: Array.from(matrixPermissions),
      },
    });
  };

  // ── Filtered users list ────────────────────────────────────────────────────
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

  const selectedRoleObj = roles.find((r) => r.roleId === selectedMatrixRoleId);

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <Reveal>
        <PageHeader
          eyebrow="Access Control & Security"
          title="User & Access Management"
          description="Manage team accounts, configure system roles, and assign role-based module permission matrices."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchUsers();
                  refetchRoles();
                  refetchModules();
                }}
                disabled={isUsersRefetching}
                className="gap-1.5"
              >
                <RefreshCw className={cn("size-3.5", isUsersRefetching && "animate-spin")} />
                Refresh
              </Button>

              {activeTab === "users" && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <UserPlus className="size-4" />
                  Add User
                </Button>
              )}

              {activeTab === "roles" && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateRoleOpen(true)}
                  className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Shield className="size-4" />
                  Create Role
                </Button>
              )}

              {activeTab === "permissions" && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateModuleOpen(true)}
                  variant="outline"
                  className="gap-1.5"
                >
                  <Plus className="size-4" />
                  Add Module
                </Button>
              )}
            </div>
          }
        />
      </Reveal>

      {/* ── Navigation Tabs ──────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "users" | "roles" | "permissions")}
        className="space-y-6"
      >
        <div className="border-b border-border/70 pb-px">
          <TabsList className="h-11 rounded-xl bg-secondary/60 p-1 pb-6">
            <TabsTrigger
              value="users"
              className="gap-2 rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Users className="size-4" />
              Users Directory
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-bold">
                {users.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="gap-2 rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <ShieldCheck className="size-4" />
              Roles Management
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-bold">
                {roles.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="gap-2 rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <SlidersHorizontal className="size-4" />
              Module Rights & Permissions Matrix
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: USERS DIRECTORY                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="users" className="space-y-6 focus-visible:outline-none">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
          </div>

          {/* Filter Toolbar */}
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

          {/* Users Table */}
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
                      const isAdminRole = user.roleNames?.some((r) => r.toUpperCase().includes("ADMIN"));

                      return (
                        <tr
                          key={user.id}
                          className="transition-colors hover:bg-secondary/30"
                        >
                          {/* User Identity */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar className={cn("size-9 text-xs font-semibold", isAdminRole ? "border-2 border-primary/30" : "")}>
                                <AvatarFallback className={isAdminRole ? "bg-primary/15 text-primary" : "bg-secondary text-foreground"}>
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
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: ROLES MANAGEMENT                                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="roles" className="space-y-6 focus-visible:outline-none">
          <Panel className="overflow-hidden p-0">
            <div className="border-b border-border/70 bg-secondary/30 px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold">System Roles & Assignment</h3>
                  <p className="text-xs text-muted-foreground">
                    Define system roles, toggle active statuses, and configure assigned permission sets.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsCreateRoleOpen(true)}
                  className="gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="size-4" />
                  Add New Role
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-secondary/40">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Role Name
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Description
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Assigned Users
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Permissions Count
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isRolesLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-5 py-4"><Skeleton className="h-5 w-24" /></td>
                        <td className="px-5 py-4"><Skeleton className="h-4 w-48" /></td>
                        <td className="px-5 py-4"><Skeleton className="h-5 w-16" /></td>
                        <td className="px-5 py-4"><Skeleton className="h-6 w-12 rounded-full" /></td>
                        <td className="px-5 py-4"><Skeleton className="h-5 w-20" /></td>
                        <td className="px-5 py-4 text-right"><Skeleton className="ml-auto size-8" /></td>
                      </tr>
                    ))
                  ) : roles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <EmptyState
                          icon={<Shield className="size-6" />}
                          title="No roles created"
                          description="Add a system role to start grouping access privileges."
                          action={
                            <Button
                              size="sm"
                              onClick={() => setIsCreateRoleOpen(true)}
                              className="mt-2 gap-1.5"
                            >
                              <Plus className="size-4" />
                              Create Role
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    roles.map((role) => (
                      <tr key={role.roleId} className="transition-colors hover:bg-secondary/30">
                        {/* Role Name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                              <Shield className="size-4" />
                            </div>
                            <span className="font-bold text-foreground">{role.name}</span>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="px-5 py-4 text-xs text-muted-foreground">
                          {role.description || "Standard system role."}
                        </td>

                        {/* Assigned Users */}
                        <td className="px-5 py-4">
                          <Badge variant="secondary" className="gap-1 font-semibold tabular-nums">
                            <Users className="size-3" />
                            {role.userCount ?? 0} users
                          </Badge>
                        </td>

                        {/* Status Toggle */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={role.active !== false}
                              onCheckedChange={(checked) =>
                                updateRoleMutation.mutate({
                                  id: role.roleId,
                                  payload: { active: checked },
                                })
                              }
                            />
                            <span className="text-xs font-medium">
                              {role.active !== false ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>

                        {/* Permissions Count */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            <Lock className="size-3 text-primary" />
                            {role.moduleRights?.length ?? 0} permissions
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMatrixRoleId(role.roleId);
                                setActiveTab("permissions");
                              }}
                              className="h-8 text-xs text-primary hover:bg-primary/10"
                            >
                              <Sliders className="mr-1 size-3.5" />
                              Permissions
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingRole(role)}
                              className="size-8 text-muted-foreground hover:text-foreground"
                            >
                              <Edit className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingRole(role)}
                              className="size-8 text-destructive hover:bg-destructive/10"
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
          </Panel>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: MODULE RIGHTS & PERMISSION MATRIX                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="permissions" className="space-y-6 focus-visible:outline-none">
          <Panel className="space-y-5 p-5">
            {/* Matrix Control Toolbar */}
            <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Select Target Role:
                  </Label>
                </div>
                <Select
                  value={selectedMatrixRoleId}
                  onValueChange={setSelectedMatrixRoleId}
                >
                  <SelectTrigger className="w-[200px] font-semibold">
                    <SelectValue placeholder="Choose Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.roleId} value={r.roleId} className="font-medium">
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedRoleObj && (
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                    {selectedRoleObj.userCount ?? 0} assigned users will inherit changes
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllMatrix}
                  className="gap-1.5 text-xs"
                >
                  <CheckSquare className="size-3.5" />
                  Toggle Select All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveMatrix}
                  disabled={updateRoleMutation.isPending || !selectedMatrixRoleId}
                  className={cn(
                    "gap-1.5 transition-all",
                    isMatrixDirty ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30" : ""
                  )}
                >
                  <Save className="size-3.5" />
                  {updateRoleMutation.isPending ? "Saving..." : "Save Permissions"}
                </Button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-hidden rounded-xl border border-border/70">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-secondary/50">
                    <th className="w-1/3 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Module / Resource
                    </th>
                    {ACTIONS.map((action) => (
                      <th
                        key={action.key}
                        className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        <div>{action.label}</div>
                        <div className="text-[10px] font-normal lowercase text-muted-foreground/80">
                          {action.desc}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Row All
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isModulesLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-5 py-4"><Skeleton className="h-5 w-32" /></td>
                        <td className="px-4 py-4 text-center"><Skeleton className="mx-auto size-5 rounded" /></td>
                        <td className="px-4 py-4 text-center"><Skeleton className="mx-auto size-5 rounded" /></td>
                        <td className="px-4 py-4 text-center"><Skeleton className="mx-auto size-5 rounded" /></td>
                        <td className="px-4 py-4 text-center"><Skeleton className="mx-auto size-5 rounded" /></td>
                        <td className="px-4 py-4 text-center"><Skeleton className="mx-auto size-5 rounded" /></td>
                      </tr>
                    ))
                  ) : moduleRights.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <EmptyState
                          icon={<Layers className="size-6" />}
                          title="No modules registered"
                          description="Add your ERP module rights to configure the role permission matrix."
                          action={
                            <Button
                              size="sm"
                              onClick={() => setIsCreateModuleOpen(true)}
                              className="mt-2 gap-1.5"
                            >
                              <Plus className="size-4" />
                              Add Module
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    moduleRights.map((module) => {
                      const baseKey = module.name;
                      const hasBaseOrView =
                        matrixPermissions.has(baseKey) ||
                        matrixPermissions.has(`${baseKey}_VIEW`);
                      const rowKeys = [
                        baseKey,
                        ...ACTIONS.map((a) => `${baseKey}_${a.key}`),
                      ];
                      const rowAllSelected = rowKeys.every((k) => matrixPermissions.has(k));

                      return (
                        <tr
                          key={module.id || module.name}
                          className="transition-colors hover:bg-secondary/30"
                        >
                          {/* Module Identity */}
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                                <Layers className="size-3.5" />
                              </div>
                              <div>
                                <p className="font-bold text-foreground">
                                  {module.label || module.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {module.description || `Controls access to ${module.name} subsystem`}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Granular Action Checkboxes */}
                          {ACTIONS.map((action) => {
                            const permKey = `${baseKey}_${action.key}`;
                            // For VIEW, also consider if baseKey itself is in permissions
                            const isChecked =
                              action.key === "VIEW"
                                ? hasBaseOrView
                                : matrixPermissions.has(permKey);

                            return (
                              <td key={action.key} className="px-4 py-4 text-center">
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => {
                                      if (action.key === "VIEW") {
                                        // Toggle both baseKey and baseKey_VIEW
                                        toggleMatrixPermission(baseKey);
                                        toggleMatrixPermission(`${baseKey}_VIEW`);
                                      } else {
                                        toggleMatrixPermission(permKey);
                                      }
                                    }}
                                    className="size-5 rounded-md transition-transform active:scale-95"
                                  />
                                </div>
                              </td>
                            );
                          })}

                          {/* Row All Toggle */}
                          <td className="px-4 py-4 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowAllPermissions(baseKey)}
                              className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground"
                            >
                              {rowAllSelected ? "Clear" : "All"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom notification banner */}
            <div className="flex items-center gap-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
              <Info className="size-4 shrink-0 text-primary" />
              <span>
                Changes saved to a role are automatically synchronized to all users currently assigned that role.
              </span>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs: User Management ──────────────────────────────────── */}
      <CreateUserDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        roles={roles}
        moduleRights={moduleRights}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isLoading={createMutation.isPending}
      />

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
            <AlertDialogFooter className="gap-3">
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

      {/* ── Dialogs: Role Management ──────────────────────────────────── */}
      <CreateRoleDialog
        open={isCreateRoleOpen}
        onOpenChange={setIsCreateRoleOpen}
        moduleRights={moduleRights}
        onSubmit={(payload) => createRoleMutation.mutate(payload)}
        isLoading={createRoleMutation.isPending}
      />

      {editingRole && (
        <EditRoleDialog
          role={editingRole}
          open={!!editingRole}
          onOpenChange={(open) => !open && setEditingRole(null)}
          onSubmit={(payload) =>
            updateRoleMutation.mutate({ id: editingRole.roleId, payload })
          }
          isLoading={updateRoleMutation.isPending}
        />
      )}

      {deletingRole && (
        <AlertDialog
          open={!!deletingRole}
          onOpenChange={(open) => !open && setDeletingRole(null)}
        >
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete System Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the role{" "}
                <span className="font-semibold text-foreground">
                  {deletingRole.name}
                </span>
                ? Any users assigned to this role will automatically have it unassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel disabled={deleteRoleMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteRoleMutation.mutate(deletingRole.roleId)}
                disabled={deleteRoleMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteRoleMutation.isPending ? "Deleting..." : "Delete Role"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── Dialogs: Module Right Creation ─────────────────────────────── */}
      <CreateModuleRightDialog
        open={isCreateModuleOpen}
        onOpenChange={setIsCreateModuleOpen}
        onSubmit={(payload) => createModuleMutation.mutate(payload)}
        isLoading={createModuleMutation.isPending}
      />
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
      <DialogContent className="max-w-2xl rounded-2xl p-6 shadow-xl">
        <DialogHeader className="space-y-1.5 border-b border-border/60 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="size-5 text-primary" />
            Create New User Account
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Fill in the details below to add a new team member and configure their permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <ScrollArea className="max-h-[58vh] pr-4">
            <div className="space-y-4 py-1">
              {/* Name Fields Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-semibold">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="e.g. John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-9 text-sm"
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
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Email & Password Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    className="h-9 text-sm"
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
                      className="h-9 pr-10 text-sm"
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">User Type</Label>
                  <Select value={userType} onValueChange={(val: UserType) => setUserType(val)}>
                    <SelectTrigger className="h-9 text-xs font-medium">
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
                    <SelectTrigger className="h-9 text-xs font-medium">
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
              <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/20 p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Assigned Roles
                  </Label>
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
              <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Module Rights & Visibility
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Configure specific system tabs visible to this user
                    </p>
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
                            ? "border-primary/40 bg-primary/10 text-foreground font-semibold"
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

          {/* Dialog Footer with explicit spacing */}
          <DialogFooter className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="px-4"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5 px-5">
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
      <DialogContent className="max-w-2xl rounded-2xl p-6 shadow-xl">
        <DialogHeader className="space-y-1.5 border-b border-border/60 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Edit className="size-5 text-primary" />
            Edit User: {user.fullName || user.email}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update user information, assigned roles, and module access permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <ScrollArea className="max-h-[58vh] pr-4">
            <div className="space-y-4 py-1">
              {/* Name Fields Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-firstName" className="text-xs font-semibold">
                    First Name
                  </Label>
                  <Input
                    id="edit-firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-9 text-sm"
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
                    className="h-9 text-sm"
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
                  className="h-9 text-sm"
                />
              </div>

              {/* Status & User Type */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">User Type</Label>
                  <Select value={userType} onValueChange={(val: UserType) => setUserType(val)}>
                    <SelectTrigger className="h-9 text-xs font-medium">
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
                    <SelectTrigger className="h-9 text-xs font-medium">
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
              <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/20 p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Assigned Roles
                  </Label>
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
              <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Module Rights & Visibility
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Configure specific system tabs visible to this user
                    </p>
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
                            ? "border-primary/40 bg-primary/10 text-foreground font-semibold"
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

          {/* Dialog Footer with explicit spacing */}
          <DialogFooter className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="px-4"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5 px-5">
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
      <DialogContent className="max-w-md rounded-2xl p-6 shadow-xl">
        <DialogHeader className="space-y-1.5 border-b border-border/60 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <KeyRound className="size-5 text-primary" />
            Reset Password
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Set a new secure password for{" "}
            <span className="font-semibold text-foreground">{user.email}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-semibold">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter new password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 pr-10 text-sm"
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
              className="h-9 text-sm"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="px-4"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5 px-5">
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-Component: Create Role Dialog ───────────────────────────────────────

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleRights: ModuleRightItem[];
  onSubmit: (payload: CreateRolePayload) => void;
  isLoading: boolean;
}

function CreateRoleDialog({
  open,
  onOpenChange,
  moduleRights,
  onSubmit,
  isLoading,
}: CreateRoleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [selectedRights, setSelectedRights] = useState<string[]>([]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName("");
      setDescription("");
      setActive(true);
      setSelectedRights([]);
    }
    onOpenChange(isOpen);
  };

  const handleRightToggle = (rightKey: string) => {
    setSelectedRights((prev) =>
      prev.includes(rightKey)
        ? prev.filter((r) => r !== rightKey)
        : [...prev, rightKey]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }
    onSubmit({
      name: name.trim().toUpperCase(),
      description: description.trim(),
      active,
      moduleRights: selectedRights,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-6 shadow-xl">
        <DialogHeader className="space-y-1.5 border-b border-border/60 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Shield className="size-5 text-primary" />
            Create New Role
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Define a new system role and assign initial module permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="role-name" className="text-xs font-semibold">
              Role Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role-name"
              required
              placeholder="e.g. WAREHOUSE_MANAGER, REGULATORY"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 font-medium uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-desc" className="text-xs font-semibold">
              Description
            </Label>
            <Input
              id="role-desc"
              placeholder="e.g. Manages warehouse shipments and logistics"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 p-3 bg-secondary/20">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold">Role Status</Label>
              <p className="text-[11px] text-muted-foreground">Active roles can be assigned to users</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <div className="space-y-2 rounded-xl border border-border/70 p-3 bg-secondary/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Initial Module Access
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedRights.length === moduleRights.length) {
                    setSelectedRights([]);
                  } else {
                    setSelectedRights(moduleRights.map((m) => m.name));
                  }
                }}
                className="h-6 text-[10px] text-primary"
              >
                {selectedRights.length === moduleRights.length ? "Deselect" : "All"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {moduleRights.map((m) => (
                <label
                  key={m.id || m.name}
                  className="flex items-center gap-2 rounded-lg border p-1.5 text-xs bg-background cursor-pointer"
                >
                  <Checkbox
                    checked={selectedRights.includes(m.name)}
                    onCheckedChange={() => handleRightToggle(m.name)}
                  />
                  <span className="truncate">{m.label || m.name}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="px-4"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5 px-5">
              {isLoading ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-Component: Edit Role Dialog ─────────────────────────────────────────

interface EditRoleDialogProps {
  role: RoleResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: UpdateRolePayload) => void;
  isLoading: boolean;
}

function EditRoleDialog({
  role,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: EditRoleDialogProps) {
  const [name, setName] = useState(role.name || "");
  const [description, setDescription] = useState(role.description || "");
  const [active, setActive] = useState(role.active !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }
    onSubmit({
      name: name.trim().toUpperCase(),
      description: description.trim(),
      active,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 shadow-xl">
        <DialogHeader className="space-y-1.5 border-b border-border/60 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Edit className="size-5 text-primary" />
            Edit Role: {role.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update role name, description, and status. Assigned users will automatically update.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-role-name" className="text-xs font-semibold">
              Role Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-role-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 font-medium uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-role-desc" className="text-xs font-semibold">
              Description
            </Label>
            <Input
              id="edit-role-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 p-3 bg-secondary/20">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold">Role Status</Label>
              <p className="text-[11px] text-muted-foreground">Active roles can be assigned to users</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <DialogFooter className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="px-4"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5 px-5">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-Component: Create Module Right Dialog ───────────────────────────────

interface CreateModuleRightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateModuleRightPayload) => void;
  isLoading: boolean;
}

function CreateModuleRightDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateModuleRightDialogProps) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName("");
      setLabel("");
      setDescription("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Module key name is required");
      return;
    }
    onSubmit({
      name: name.trim().toUpperCase(),
      label: label.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 shadow-xl">
        <DialogHeader className="space-y-1.5 border-b border-border/60 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Layers className="size-5 text-primary" />
            Add New System Module
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Register a new subsystem module key for permission matrix mapping.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="mod-name" className="text-xs font-semibold">
              Module Key Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mod-name"
              required
              placeholder="e.g. INVENTORY_MANAGEMENT"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 font-mono text-sm uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mod-label" className="text-xs font-semibold">
              Display Label
            </Label>
            <Input
              id="mod-label"
              placeholder="e.g. Inventory Management"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mod-desc" className="text-xs font-semibold">
              Description
            </Label>
            <Input
              id="mod-desc"
              placeholder="e.g. Manages warehouse stock and batches"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="px-4"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5 px-5">
              {isLoading ? "Adding..." : "Add Module"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
