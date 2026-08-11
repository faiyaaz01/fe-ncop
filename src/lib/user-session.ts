export type ModuleRight = {
  name: string;
  label: string;
  visible: boolean;
};

export type AppUser = {
  id?: string | undefined;
  email: string;
  name?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  role?: string | undefined;
  roles?: string[] | undefined;
  userType?: string | undefined;
  avatar?: string | null | undefined;
  token?: string | null | undefined;
  refreshToken?: string | null | undefined;
  expiresIn?: number | null | undefined;
  moduleRights?: ModuleRight[] | undefined;
  lastLoginDate?: string | undefined;
  lastLoginDateUtcDateTimeFormatted?: string | undefined;
  lastLoginDateCurrentTimezoneDateFormatted?: string | undefined;
  rememberMe?: boolean | undefined;
  lastLoginAt?: string | undefined;
  isAuthenticated?: boolean | undefined;
};

type PersistedSession = {
  currentUser: AppUser | null;
  allUsers: AppUser[];
};

type SessionListener = (user: AppUser | null, allUsers: AppUser[]) => void;

const ENCRYPTION_SECRET = "ncop-erp-user-session-v1";
const CURRENT_USER_STORAGE_KEY = "ncop.auth.session";

class UserSessionService {
  private currentUser: AppUser | null = null;
  private allUsers: AppUser[] = [];
  private listeners = new Set<SessionListener>();
  private initialized = false;

  constructor() {
    void this.initialize();
  }

  public subscribe(listener: SessionListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getCurrentUser() {
    return this.currentUser;
  }

  public getAllUsers() {
    return [...this.allUsers];
  }

  public getLoggedInUsers() {
    return this.getAllUsers().filter((user) => user.isAuthenticated !== false);
  }

  public getAuthToken() {
    return this.currentUser?.token ?? null;
  }

  public async initialize() {
    if (this.initialized || typeof window === "undefined") {
      return;
    }

    this.initialized = true;

    const persistedData = await this.readPersistedSession();
    if (persistedData?.currentUser) {
      this.currentUser = persistedData.currentUser;
      this.allUsers = persistedData.allUsers;
    }

    this.emit();
  }

  public async login(user: AppUser, options: { rememberMe?: boolean; token?: string | null; refreshToken?: string | null; expiresIn?: number | null } = {}) {
    const normalizedUser: AppUser = {
      ...user,
      id: user.id ?? user.email,
      name: user.name ?? ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email),
      role: user.role ?? user.roles?.[0] ?? user.userType ?? "User",
      roles: user.roles ?? (user.role ? [user.role] : undefined),
      rememberMe: options.rememberMe ?? false,
      token: options.token ?? user.token ?? null,
      refreshToken: options.refreshToken ?? user.refreshToken ?? null,
      expiresIn: options.expiresIn ?? user.expiresIn ?? null,
      lastLoginAt: user.lastLoginAt ?? user.lastLoginDate ?? new Date().toISOString(),
      isAuthenticated: true,
    };

    this.currentUser = normalizedUser;
    this.allUsers = [normalizedUser, ...this.allUsers.filter((entry) => entry.email !== normalizedUser.email)].slice(0, 10);

    await this.persistSession({ currentUser: normalizedUser, allUsers: this.allUsers }, normalizedUser.rememberMe ?? false);
    this.emit();
    return normalizedUser;
  }

  public async logout() {
    this.currentUser = null;
    this.allUsers = this.allUsers.filter((user) => user.isAuthenticated === false);

    await this.clearPersistedSession();
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.currentUser, this.getAllUsers()));
  }

  private async persistSession(session: PersistedSession, rememberMe: boolean) {
    if (typeof window === "undefined") {
      return;
    }

    const storage = rememberMe ? window.localStorage : window.sessionStorage;
    if (!storage) {
      return;
    }

    const payload = JSON.stringify(session);
    const encryptedPayload = await encryptText(payload);

    storage.setItem(CURRENT_USER_STORAGE_KEY, encryptedPayload);

    if (rememberMe) {
      window.sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    } else {
      window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  }

  private async readPersistedSession(): Promise<PersistedSession | null> {
    if (typeof window === "undefined") {
      return null;
    }

    const localValue = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    const sessionValue = window.sessionStorage.getItem(CURRENT_USER_STORAGE_KEY);

    const encryptedPayload = localValue ?? sessionValue;
    if (!encryptedPayload) {
      return null;
    }

    try {
      const decryptedPayload = await decryptText(encryptedPayload);
      if (!decryptedPayload) {
        return null;
      }

      return JSON.parse(decryptedPayload) as PersistedSession;
    } catch {
      return null;
    }
  }

  private async clearPersistedSession() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    window.sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  }
}

export const userSessionService = new UserSessionService();

async function encryptText(value: string) {
  if (typeof crypto === "undefined" || typeof crypto.subtle === "undefined") {
    return value;
  }

  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", encoder.encode(ENCRYPTION_SECRET)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value));
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

async function decryptText(value: string) {
  if (typeof crypto === "undefined" || typeof crypto.subtle === "undefined") {
    return value;
  }

  try {
    const [ivBase64, cipherBase64] = value.split(".");
    if (!ivBase64 || !cipherBase64) {
      return null;
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const key = await crypto.subtle.importKey(
      "raw",
      await crypto.subtle.digest("SHA-256", encoder.encode(ENCRYPTION_SECRET)),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivBase64) },
      key,
      fromBase64(cipherBase64),
    );

    return decoder.decode(plaintext);
  } catch {
    return null;
  }
}

function toBase64(value: Uint8Array) {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    let binary = "";
    value.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(value).toString("base64");
  }

  return "";
}

function fromBase64(value: string) {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    const binary = window.atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(value, "base64"));
  }

  return new Uint8Array();
}
