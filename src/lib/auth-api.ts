import { apiUrl } from "@/lib/api-config";
import { userSessionService } from "@/lib/user-session";
import type {
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  RoleResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  ModuleRight,
  PageResponse,
} from "@/lib/auth-types";

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const session = userSessionService.getCurrentUser();
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message = errorData?.message || errorData?.detail || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

// ─── Users API ──────────────────────────────────────────────────────────────

export async function fetchUsers(params: {
  page?: number | undefined;
  size?: number | undefined;
  search?: string | undefined;
  status?: string | undefined;
  role?: string | undefined;
} = {}): Promise<PageResponse<UserResponse>> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 10));
  if (params.search) query.set("search", params.search);
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.role && params.role !== "ALL") query.set("role", params.role);

  const res = await fetch(apiUrl(`/api/v1/users?${query.toString()}`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<PageResponse<UserResponse>>(res);
}

export async function fetchAllUsers(): Promise<UserResponse[]> {
  const res = await fetch(apiUrl("/api/v1/users/all"), {
    headers: getAuthHeaders(),
  });
  return handleResponse<UserResponse[]>(res);
}

export async function fetchUserById(id: string): Promise<UserResponse> {
  const res = await fetch(apiUrl(`/api/v1/users/${id}`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<UserResponse>(res);
}

export async function createUser(data: CreateUserRequest): Promise<UserResponse> {
  const res = await fetch(apiUrl("/api/v1/users"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<UserResponse>(res);
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<UserResponse> {
  const res = await fetch(apiUrl(`/api/v1/users/${id}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<UserResponse>(res);
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/users/${id}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse<void>(res);
}

// ─── Roles API ──────────────────────────────────────────────────────────────

export async function fetchRoles(params: {
  page?: number | undefined;
  size?: number | undefined;
  search?: string | undefined;
} = {}): Promise<PageResponse<RoleResponse>> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 10));
  if (params.search) query.set("search", params.search);

  const res = await fetch(apiUrl(`/api/v1/roles?${query.toString()}`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<PageResponse<RoleResponse>>(res);
}

export async function fetchAllRoles(): Promise<RoleResponse[]> {
  const res = await fetch(apiUrl("/api/v1/roles/all"), {
    headers: getAuthHeaders(),
  });
  return handleResponse<RoleResponse[]>(res);
}

export async function fetchRoleById(id: string): Promise<RoleResponse> {
  const res = await fetch(apiUrl(`/api/v1/roles/${id}`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<RoleResponse>(res);
}

export async function createRole(data: CreateRoleRequest): Promise<RoleResponse> {
  const res = await fetch(apiUrl("/api/v1/roles"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<RoleResponse>(res);
}

export async function updateRole(id: string, data: UpdateRoleRequest): Promise<RoleResponse> {
  const res = await fetch(apiUrl(`/api/v1/roles/${id}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<RoleResponse>(res);
}

export async function deleteRole(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/roles/${id}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse<void>(res);
}

// ─── Module Rights API ──────────────────────────────────────────────────────

export async function fetchModuleRights(params: {
  page?: number | undefined;
  size?: number | undefined;
  search?: string | undefined;
} = {}): Promise<PageResponse<ModuleRight>> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 10));
  if (params.search) query.set("search", params.search);

  const res = await fetch(apiUrl(`/auth/module-rights?${query.toString()}`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<PageResponse<ModuleRight>>(res);
}

export async function fetchAllModuleRights(): Promise<ModuleRight[]> {
  const res = await fetch(apiUrl("/auth/module-rights/all"), {
    headers: getAuthHeaders(),
  });
  return handleResponse<ModuleRight[]>(res);
}

export async function createModuleRight(data: { name: string; label?: string | undefined; description?: string | undefined }): Promise<ModuleRight> {
  const res = await fetch(apiUrl("/auth/module-rights"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<ModuleRight>(res);
}

export async function updateModuleRight(id: string, data: { name?: string | undefined; label?: string | undefined; description?: string | undefined }): Promise<ModuleRight> {
  const res = await fetch(apiUrl(`/auth/module-rights/${id}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<ModuleRight>(res);
}

export async function deleteModuleRight(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/auth/module-rights/${id}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse<void>(res);
}
