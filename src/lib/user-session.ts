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
  refresh_token?: string | null | undefined;
  expiresIn?: number | null | undefined;
  expires_in?: number | null | undefined;
  moduleRights?: ModuleRight[] | undefined;
  lastLoginDate?: string | undefined;
  lastLoginDateUtcDateTimeFormatted?: string | undefined;
  lastLoginDateCurrentTimezoneDateFormatted?: string | undefined;
  rememberMe?: boolean | undefined;
  lastLoginAt?: string | undefined;
  isAuthenticated?: boolean | undefined;
  rawLoginResponse?: Record<string, unknown>;
  [key: string]: unknown;
};

type PersistedSession = {
  currentUser: AppUser | null;
  allUsers: AppUser[];
  expiresAt: number | null;
};

type SessionListener = (user: AppUser | null, allUsers: AppUser[]) => void;

const ENCRYPTION_SECRET = "ncop-erp-user-session-v1";
const CURRENT_USER_STORAGE_KEY = "ncop.auth.session";

// 🔧 Tune these two values. Currently set to short test values.
const SESSION_DURATION_MS = 30 * 60 * 1000; // total session length (test value: 20s)
const WARNING_MS = 3 * 60 * 1000; // show popup this long before expiry

class UserSessionService {
  private currentUser: AppUser | null = null;
  private allUsers: AppUser[] = [];
  private listeners = new Set<SessionListener>();
  private initialized = false;

  private warningTimerId: number | null = null;
  private expiryTimerId: number | null = null;
  private refreshUiHandler:
    null | ((opts: { expiresAt: number; remainingMs: number }) => Promise<boolean>) = null;

  // Absolute timestamp (ms since epoch) when the session expires.
  // Storing this instead of a duration is what makes expiry survive page reloads correctly.
  private expiresAt: number | null = null;

  // ID for a periodic background check (to survive timer throttling).
  private periodicCheckId: number | null = null;

  // lastLogoutReason is set when logout happens programmatically so UI can surface
  // an "expired session" modal instead of silently redirecting the user.
  // Possible values: 'user' | 'expired' | 'invalid' | null
  private lastLogoutReason: string | null = null;

  constructor() {
    try {
      console.debug && console.debug("user-session: constructor");
    } catch {}
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

  public registerRefreshUiHandler(
    handler: (opts: { expiresAt: number; remainingMs: number }) => Promise<boolean>,
  ) {
    this.refreshUiHandler = handler;
  }
  public registerRefreshTokenFunction(
    _fn: (
      refreshToken: string | null,
    ) => Promise<{ token: string; refreshToken?: string | null; expiresIn?: number | null } | null>,
  ) {
    // intentionally does nothing
  }
  public async initialize() {
    try {
      console.debug && console.debug("user-session: initialize start");
    } catch {}

    if (this.initialized || typeof window === "undefined") {
      return;
    }
    this.initialized = true;

    const persistedData = await this.readPersistedSession();

    if (persistedData?.currentUser) {
      this.currentUser = persistedData.currentUser;
      this.allUsers = persistedData.allUsers;

      const storedExpiry = persistedData.expiresAt;

      if (typeof storedExpiry === "number" && storedExpiry > Date.now()) {
        this.expiresAt = storedExpiry;
        this.scheduleTimersFromExpiresAt();
      } else {
        // Session already expired while the app was closed -> log out immediately
        // and mark reason so UI can present the expired-session modal.
        await this.logout("expired");
      }
    }

    this.emit();
    try {
      console.debug &&
        console.debug("user-session: initialize done", {
          currentUserEmail: this.currentUser?.email ?? null,
        });
    } catch {}
  }

  public async login(
    user: AppUser,
    options: { rememberMe?: boolean; token?: string | null; expiresIn?: number | null } = {},
  ) {
    try {
      console.debug && console.debug("user-session: login called", { email: user.email });
    } catch {}

    const normalizedUser: AppUser = {
      ...user,
      id: user.id ?? user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role ?? user.roles?.[0] ?? user.userType ?? "User",
      roles: user.roles ?? (user.role ? [user.role] : undefined),
      rememberMe: options.rememberMe ?? false,
      token: options.token ?? user.token ?? null,
      lastLoginAt: user.lastLoginAt ?? user.lastLoginDate ?? new Date().toISOString(),
      isAuthenticated: true,
      rawLoginResponse: user.rawLoginResponse ?? (user as Record<string, unknown>),
    };

    this.currentUser = normalizedUser;
    this.allUsers = [
      normalizedUser,
      ...this.allUsers.filter((entry) => entry.email !== normalizedUser.email),
    ].slice(0, 10);

    // Use the REAL backend expiry (seconds) when provided, else fall back to the local default.
    const durationMs =
      typeof options.expiresIn === "number" && options.expiresIn > 0
        ? options.expiresIn * 1000
        : SESSION_DURATION_MS;

    this.expiresAt = Date.now() + durationMs;

    await this.persistSession(normalizedUser.rememberMe ?? false);
    this.scheduleTimersFromExpiresAt();
    this.emit();

    return normalizedUser;
  }

  public async logout(reason: "user" | "expired" | "invalid" | null = "user") {
    // mark reason for callers/UI to react to
    this.lastLogoutReason = reason;

    this.clearRefreshTimers();

    this.currentUser = null;
    this.expiresAt = null;
    this.allUsers = this.allUsers.filter((user) => user.isAuthenticated === false);

    await this.clearPersistedSession();
    this.emit();
  }

  public getLastLogoutReason() {
    return this.lastLogoutReason;
  }

  public clearLastLogoutReason() {
    this.lastLogoutReason = null;
  }

  /**
   * Called when the user chooses "stay signed in" in the warning popup.
   * Extends the session locally — no backend call involved.
   */
  public async extendSession() {
    if (!this.currentUser) return;

    this.expiresAt = Date.now() + SESSION_DURATION_MS;
    await this.persistSession(this.currentUser.rememberMe ?? false);
    this.scheduleTimersFromExpiresAt();
    this.emit();
  }

  private scheduleTimersFromExpiresAt() {
    this.clearRefreshTimers();
    if (!this.expiresAt) return;

    const now = Date.now();
    const warningAt = this.expiresAt - WARNING_MS;

    const warningDelay = Math.max(0, warningAt - now);
    const expiryDelay = Math.max(0, this.expiresAt - now);

    try {
      console.debug &&
        console.debug("user-session: scheduleTimersFromExpiresAt", {
          warningDelay,
          expiryDelay,
          expiresAt: this.expiresAt,
        });
    } catch {}

    this.warningTimerId = window.setTimeout(() => {
      void this.handleWarning();
    }, warningDelay);

    this.expiryTimerId = window.setTimeout(() => {
      void this.handleExpiry();
    }, expiryDelay);

    // Add a periodic check to guard against browser timer throttling (e.g., when tab is backgrounded).
    // Runs every 15 seconds and compares Date.now() against the absolute expiresAt.
    this.periodicCheckId = window.setInterval(() => {
      try {
        if (this.expiresAt && Date.now() >= this.expiresAt) {
          void this.handleExpiry();
        }
      } catch {}
    }, 15_000);
  }

  private clearRefreshTimers() {
    if (this.warningTimerId != null) {
      clearTimeout(this.warningTimerId);
      this.warningTimerId = null;
    }
    if (this.expiryTimerId != null) {
      clearTimeout(this.expiryTimerId);
      this.expiryTimerId = null;
    }
    if (this.periodicCheckId != null) {
      clearInterval(this.periodicCheckId);
      this.periodicCheckId = null;
    }
  }

  private async handleWarning() {
    if (!this.currentUser || !this.expiresAt) return;

    const remainingMs = Math.max(0, this.expiresAt - Date.now());

    try {
      console.debug &&
        console.debug("user-session: handleWarning fired", {
          remainingMs,
          email: this.currentUser.email,
        });
    } catch {}

    let wantsToStay = false;

    if (this.refreshUiHandler) {
      try {
        wantsToStay = await this.refreshUiHandler({ expiresAt: this.expiresAt, remainingMs });
      } catch {
        wantsToStay = false;
      }
    } else {
      try {
        wantsToStay = window.confirm("Your session will expire soon. Click OK to stay signed in.");
      } catch {
        wantsToStay = false;
      }
    }

    if (wantsToStay) {
      await this.extendSession();
    }
    // If declined or no response, do nothing — the expiry timer will log out on schedule.
  }

  private async handleExpiry() {
    // mark as expired so UI can surface the expired-session modal
    await this.logout("expired");
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.currentUser, this.getAllUsers()));
  }

  private async persistSession(rememberMe: boolean) {
    if (typeof window === "undefined") return;

    const storage = rememberMe ? window.localStorage : window.sessionStorage;
    if (!storage) return;

    const session: PersistedSession = {
      currentUser: this.currentUser,
      allUsers: this.allUsers,
      expiresAt: this.expiresAt,
    };

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
    if (typeof window === "undefined") return null;

    const localValue = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    const sessionValue = window.sessionStorage.getItem(CURRENT_USER_STORAGE_KEY);

    const encryptedPayload = localValue ?? sessionValue;
    if (!encryptedPayload) return null;

    try {
      const decryptedPayload = await decryptText(encryptedPayload);
      if (!decryptedPayload) return null;
      return JSON.parse(decryptedPayload) as PersistedSession;
    } catch {
      return null;
    }
  }

  private async clearPersistedSession() {
    if (typeof window === "undefined") return;
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

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(value),
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

async function decryptText(value: string) {
  if (typeof crypto === "undefined" || typeof crypto.subtle === "undefined") {
    return value;
  }

  try {
    const [ivBase64, cipherBase64] = value.split(".");
    if (!ivBase64 || !cipherBase64) return null;

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
// /**
//  * Call this from any authenticated fetch/API wrapper when a request comes back 401.
//  * Treats the token as invalid immediately, regardless of the local expiry timer.
//  */
// public async handleUnauthorizedResponse() {
//   if (!this.currentUser) return;
//   await this.logout("invalid");
// }
