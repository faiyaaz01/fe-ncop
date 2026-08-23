export type ModuleRight = {
  name: string;
  label: string;
  visible: boolean;
};

const ROUTE_MODULE_RIGHTS: Array<{ prefix: string; rights: string[] }> = [
  { prefix: "/dashboard", rights: ["DASHBOARD"] },
  { prefix: "/clients", rights: ["CLIENT_MASTER"] },
  { prefix: "/products", rights: ["PRODUCT_MASTER"] },
  { prefix: "/inquiry", rights: ["SALES", "QA", "QC"] },
  { prefix: "/orders", rights: ["SALES"] },
  { prefix: "/reports", rights: ["REPORTS"] },
  {
    prefix: "/user-management",
    rights: ["USER_MANAGEMENT", "ROLE_MANAGEMENT", "MODULE_RIGHT_MANAGEMENT"],
  },
];

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

export function isUserAdmin(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  const role = String(user.role || "").toUpperCase();
  const userType = String(user.userType || "").toUpperCase();
  const roles = (user.roles || []).map((r) => String(r).toUpperCase());
  if (
    role === "ADMIN" ||
    role.includes("ADMIN") ||
    userType === "ADMIN" ||
    roles.includes("ADMIN") ||
    roles.some((r) => r.includes("ADMIN"))
  ) {
    return true;
  }
  if (user.moduleRights && Array.isArray(user.moduleRights)) {
    return user.moduleRights.some((mr: any) => {
      if (typeof mr === "string") {
        const key = mr.toUpperCase();
        return key === "USER_MANAGEMENT" || key === "USER-MANAGEMENT";
      }
      const name = String(mr.name || "").toLowerCase();
      return (name === "user-management" || name === "user_management") && mr.visible !== false;
    });
  }
  return false;
}

export function userModuleRightNames(user: AppUser | null | undefined): string[] {
  if (!user || !Array.isArray(user.moduleRights)) return [];
  return user.moduleRights
    .map((right) => {
      if (typeof right === "string") return right.toUpperCase();
      return right.visible !== false ? String(right.name || "").toUpperCase() : "";
    })
    .filter(Boolean);
}

export function canAccessRoute(user: AppUser | null | undefined, pathname: string): boolean {
  const route = ROUTE_MODULE_RIGHTS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!route) return true;
  const rights = userModuleRightNames(user);
  return route.rights.some((right) => rights.includes(right));
}

type PersistedSession = {
  currentUser: AppUser | null;
  allUsers: AppUser[];
  expiresAt: number | null;
};

type SessionListener = (user: AppUser | null, allUsers: AppUser[]) => void;

const ENCRYPTION_SECRET = "ncop-erp-user-session-v1";
const CURRENT_USER_STORAGE_KEY = "ncop.auth.session";

// 🔧 Tune these two values.
const SESSION_DURATION_MS = 25 * 60 * 1000; // total session length (25 min default)
const WARNING_MS = 5 * 60 * 1000; // show popup 5 minutes before expiry

// 🔧 Inactivity-based auto-logout
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // show popup after 2 min of inactivity
const INACTIVITY_WARNING_DURATION_MS = 3 * 60 * 1000; // auto-logout 3 min after popup

class UserSessionService {
  private currentUser: AppUser | null = null;
  private allUsers: AppUser[] = [];
  private listeners = new Set<SessionListener>();
  private initialized = false;

  private warningTimerId: number | null = null;
  private expiryTimerId: number | null = null;
  private refreshUiHandler:
    null | ((opts: { expiresAt: number; remainingMs: number }) => Promise<boolean>) = null;
  private refreshTokenFn:
    | null
    | ((
        refreshToken: string | null,
      ) => Promise<{
        token: string;
        refreshToken?: string | null;
        expiresIn?: number | null;
      } | null>) = null;

  // Absolute timestamp (ms since epoch) when the session expires.
  // Storing this instead of a duration is what makes expiry survive page reloads correctly.
  private expiresAt: number | null = null;

  // ID for a periodic background check (to survive timer throttling).
  private periodicCheckId: number | null = null;

  // Inactivity tracking
  private inactivityTimerId: number | null = null;
  private inactivityUiHandler: null | ((opts: { warningDurationMs: number }) => Promise<boolean>) =
    null;
  private boundActivityHandler: (() => void) | null = null;
  private inactivityPaused = false;

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
    fn: (
      refreshToken: string | null,
    ) => Promise<{ token: string; refreshToken?: string | null; expiresIn?: number | null } | null>,
  ) {
    this.refreshTokenFn = fn;
  }
  public registerInactivityUiHandler(
    handler: (opts: { warningDurationMs: number }) => Promise<boolean>,
  ) {
    this.inactivityUiHandler = handler;
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
        this.startInactivityTracking();
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
    this.startInactivityTracking();

    return normalizedUser;
  }

  public async logout(reason: "user" | "expired" | "invalid" | null = "user") {
    // mark reason for callers/UI to react to
    this.lastLogoutReason = reason;

    console.debug && console.debug("user-session: logout called", { reason });

    this.clearRefreshTimers();
    this.stopInactivityTracking();

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
    this.startInactivityTracking();
  }

  public async refreshSession() {
    if (!this.currentUser || !this.refreshTokenFn) {
      return false;
    }

    const refreshed = await this.refreshTokenFn(
      this.currentUser.refreshToken ?? this.currentUser.refresh_token ?? null,
    );

    if (!refreshed) {
      return false;
    }

    const nextUser: AppUser = {
      ...this.currentUser,
      token: refreshed.token ?? this.currentUser.token ?? null,
      refreshToken:
        refreshed.refreshToken ??
        refreshed.refreshToken ??
        this.currentUser.refreshToken ??
        this.currentUser.refresh_token ??
        null,
      refresh_token:
        refreshed.refreshToken ??
        refreshed.refreshToken ??
        this.currentUser.refreshToken ??
        this.currentUser.refresh_token ??
        null,
      expiresIn:
        typeof refreshed.expiresIn === "number"
          ? refreshed.expiresIn
          : (this.currentUser.expiresIn ?? null),
      isAuthenticated: true,
      lastLoginAt: this.currentUser.lastLoginAt ?? new Date().toISOString(),
    };

    this.currentUser = nextUser;
    this.allUsers = [
      nextUser,
      ...this.allUsers.filter((user) => user.email !== nextUser.email),
    ].slice(0, 10);

    const durationMs =
      typeof refreshed.expiresIn === "number" && refreshed.expiresIn > 0
        ? refreshed.expiresIn * 1000
        : SESSION_DURATION_MS;
    this.expiresAt = Date.now() + durationMs;

    await this.persistSession(this.currentUser.rememberMe ?? false);
    this.scheduleTimersFromExpiresAt();
    this.emit();
    this.startInactivityTracking();

    return true;
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

    try {
      console.debug && console.debug("user-session: starting periodic expiry check (15s)");
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
      } catch (e) {
        wantsToStay = false;
        console.debug && console.debug("user-session: refreshUiHandler threw", e);
      }
    } else {
      // No UI handler registered — do not show a blocking native confirm dialog.
      // Default to not extending the session; UI consumers should register refreshUiHandler
      // if they want to prompt the user.
      console.debug &&
        console.debug(
          "user-session: no refreshUiHandler registered; skipping native confirm fallback",
        );
      wantsToStay = false;
    }

    if (wantsToStay) {
      console.debug && console.debug("user-session: user chose to extend session from warning");
      await this.extendSession();
    } else {
      console.debug && console.debug("user-session: user did not extend session from warning");
    }
    // If declined or no response, do nothing — the expiry timer will log out on schedule.
  }

  private async handleExpiry() {
    // mark as expired so UI can surface the expired-session modal
    await this.logout("expired");
  }

  // ── Inactivity tracking ────────────────────────────────────────────

  private startInactivityTracking() {
    if (typeof window === "undefined" || !this.currentUser) return;
    this.stopInactivityTracking();
    this.inactivityPaused = false;

    let debounceTimer: number | null = null;
    this.boundActivityHandler = () => {
      if (this.inactivityPaused) return;
      if (debounceTimer) return;
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
      }, 1000);
      this.resetInactivityTimer();
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((evt) =>
      window.addEventListener(evt, this.boundActivityHandler!, { passive: true }),
    );

    this.resetInactivityTimer();
  }

  private stopInactivityTracking() {
    if (typeof window === "undefined") return;

    if (this.inactivityTimerId != null) {
      clearTimeout(this.inactivityTimerId);
      this.inactivityTimerId = null;
    }

    if (this.boundActivityHandler) {
      const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
      events.forEach((evt) => window.removeEventListener(evt, this.boundActivityHandler!));
      this.boundActivityHandler = null;
    }

    this.inactivityPaused = false;
  }

  private resetInactivityTimer() {
    if (this.inactivityTimerId != null) {
      clearTimeout(this.inactivityTimerId);
    }

    this.inactivityTimerId = window.setTimeout(() => {
      void this.handleInactivity();
    }, INACTIVITY_TIMEOUT_MS);
  }

  private async handleInactivity() {
    if (!this.currentUser) return;

    // Pause activity listeners so mouse moves while the popup is open don't reset the timer
    this.inactivityPaused = true;

    let wantsToStay = false;

    if (this.inactivityUiHandler) {
      try {
        wantsToStay = await this.inactivityUiHandler({
          warningDurationMs: INACTIVITY_WARNING_DURATION_MS,
        });
      } catch {
        wantsToStay = false;
      }
    }

    if (wantsToStay) {
      // extendSession() also restarts inactivity tracking
      await this.extendSession();
    } else {
      await this.logout("expired");
    }
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
