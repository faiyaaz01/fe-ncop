export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
export type UserType = "ADMIN" | "EMPLOYEE" | "MANAGER" | "CONTRACTOR" | "SUPER_ADMIN";

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
  hasActiveRole: boolean;
  effectiveActive: boolean;
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

export interface CreateUserRequest {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  roleIds: string[];
  moduleRights: string[];
  userStatus?: UserStatus;
  userType?: UserType;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleIds?: string[];
  moduleRights?: string[];
  userStatus?: UserStatus;
  userType?: UserType;
}

export interface RoleResponse {
  roleId: string;
  name: string;
  description?: string;
  active: boolean;
  moduleRights: string[];
  userCount: number;
  createdOn?: string;
  lastUpdatedOn?: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  active?: boolean;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  active?: boolean;
}

export interface ModuleRight {
  id?: string;
  name: string;
  label: string;
  description?: string;
  createdOn?: string;
  lastUpdatedOn?: string;
}

export interface ModuleRightResponse {
  name: string;
  label: string;
  hasRight: boolean;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}
