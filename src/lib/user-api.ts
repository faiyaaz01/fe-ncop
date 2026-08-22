import { apiUrl } from "./api-config";
import { userSessionService } from "./user-session";

export type UserStatus = "ACTIVE" | "INACTIVE" | "LOCKED" | "PENDING";
export type UserType = "ADMIN" | "EMPLOYEE" | "CLIENT";

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  roleIds: string[];
  roleNames: string[];
  moduleRights: string[];
  userStatus: UserStatus;
  userType: UserType;
  createdOn?: string;
  createdOnUtcDateTimeFormatted?: string;
  createdOnCurrentTimezoneDateFormatted?: string;
  lastUpdatedOn?: string;
  lastUpdatedOnUtcDateTimeFormatted?: string;
  lastUpdatedOnCurrentTimezoneDateFormatted?: string;
  lastLoginDate?: string;
  lastLoginDateUtcDateTimeFormatted?: string;
  lastLoginDateCurrentTimezoneDateFormatted?: string;
}

export interface RoleResponse {
  roleId: string;
  name: string;
  description?: string;
  active?: boolean;
  moduleRights?: string[];
  userCount?: number;
  createdOn?: string;
  lastUpdatedOn?: string;
}

export interface ModuleRightItem {
  id: string;
  name: string;
  label?: string;
  description?: string;
  createdOn?: string;
  lastUpdatedOn?: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roleIds?: string[];
  moduleRights?: string[];
  userStatus?: UserStatus;
  userType?: UserType;
}

export interface UpdateUserPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleIds?: string[];
  moduleRights?: string[];
  userStatus?: UserStatus;
  userType?: UserType;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  active?: boolean;
  moduleRights?: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  active?: boolean;
  moduleRights?: string[];
}

export interface CreateModuleRightPayload {
  name: string;
  label?: string;
  description?: string;
}

export interface UpdateModuleRightPayload {
  name?: string;
  label?: string;
  description?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const session = userSessionService.getCurrentUser();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `API error ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
      else if (errJson.error) errorMsg = errJson.error;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) errorMsg = text;
    }
    throw new Error(errorMsg);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json() as Promise<T>;
}

// ─── User Management APIs ────────────────────────────────────────────────────

/** GET /api/v1/users — list all users */
export async function fetchUsers(): Promise<UserResponse[]> {
  const res = await fetch(apiUrl("/api/v1/users"), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<UserResponse[]>(res);
}

/** GET /api/v1/users/:id — get user by ID */
export async function fetchUserById(id: string): Promise<UserResponse> {
  const res = await fetch(apiUrl(`/api/v1/users/${id}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<UserResponse>(res);
}

/** POST /api/v1/users — create a new user */
export async function createUser(payload: CreateUserPayload): Promise<UserResponse> {
  const res = await fetch(apiUrl("/api/v1/users"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<UserResponse>(res);
}

/** PUT /api/v1/users/:id — update an existing user */
export async function updateUser(id: string, payload: UpdateUserPayload): Promise<UserResponse> {
  const res = await fetch(apiUrl(`/api/v1/users/${id}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<UserResponse>(res);
}

/** DELETE /api/v1/users/:id — delete a user */
export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/users/${id}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse<void>(res);
}

/** PUT /api/v1/users/:id/password — reset user password */
export async function resetUserPassword(id: string, password: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/users/${id}/password`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ password }),
  });
  return handleResponse<void>(res);
}

// ─── Role Management APIs ────────────────────────────────────────────────────

/** GET /api/v1/roles — fetch all available roles */
export async function fetchRoles(): Promise<RoleResponse[]> {
  const res = await fetch(apiUrl("/api/v1/roles"), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<RoleResponse[]>(res);
}

/** GET /api/v1/roles/:id — fetch single role */
export async function fetchRoleById(id: string): Promise<RoleResponse> {
  const res = await fetch(apiUrl(`/api/v1/roles/${id}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<RoleResponse>(res);
}

/** POST /api/v1/roles — create a new role */
export async function createRole(payload: CreateRolePayload): Promise<RoleResponse> {
  const res = await fetch(apiUrl("/api/v1/roles"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<RoleResponse>(res);
}

/** PUT /api/v1/roles/:id — update role details and module rights */
export async function updateRole(id: string, payload: UpdateRolePayload): Promise<RoleResponse> {
  const res = await fetch(apiUrl(`/api/v1/roles/${id}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<RoleResponse>(res);
}

/** DELETE /api/v1/roles/:id — delete a role */
export async function deleteRole(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/roles/${id}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse<void>(res);
}

// ─── Module Rights Management APIs ───────────────────────────────────────────

/** GET /auth/module-rights — fetch all module rights */
export async function fetchModuleRights(): Promise<ModuleRightItem[]> {
  const res = await fetch(apiUrl("/api/v1/auth/module-rights"), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<ModuleRightItem[]>(res);
}

/** POST /auth/module-rights — create a new module right */
export async function createModuleRight(payload: CreateModuleRightPayload): Promise<ModuleRightItem> {
  const res = await fetch(apiUrl("/api/v1/auth/module-rights"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<ModuleRightItem>(res);
}

/** PUT /auth/module-rights/:id — update a module right */
export async function updateModuleRight(id: string, payload: UpdateModuleRightPayload): Promise<ModuleRightItem> {
  const res = await fetch(apiUrl(`/api/v1/auth/module-rights/${id}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<ModuleRightItem>(res);
}

/** DELETE /auth/module-rights/:id — delete a module right */
export async function deleteModuleRight(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/auth/module-rights/${id}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse<void>(res);
}
