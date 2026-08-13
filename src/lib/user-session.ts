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
};

type SessionListener = (user: AppUser | null, allUsers: AppUser[]) => void;

const ENCRYPTION_SECRET = "ncop-erp-user-session-v1";
const CURRENT_USER_STORAGE_KEY = "ncop.auth.session";

class UserSessionService {
  private currentUser: AppUser | null = null;
  private allUsers: AppUser[] = [];
  private listeners = new Set<SessionListener>();
  private initialized = false;

  // Timers and handlers for refresh flow
  private warningTimerId: number | null = null;
  private expiryTimerId: number | null = null;
  private refreshUiHandler: null | ((opts: { expiresAt: number; remainingMs: number }) => Promise<boolean>) = null;
  private refreshTokenFn: null | ((refreshToken: string | null) => Promise<{ token: string; refreshToken?: string | null; expiresIn?: number | null } | null>) = null;

  // Defaults for testing: show popup 10 seconds (10000ms) before expiry
  private readonly WARNING_MS = 10 * 1000;

  constructor() {
    try { console.debug && console.debug('user-session: constructor'); } catch {}
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
    try { console.debug && console.debug('user-session: initialize start'); } catch {}
    if (this.initialized || typeof window === "undefined") {
      try { console.debug && console.debug('user-session: initialize aborted (initialized or no window)'); } catch {}
      return;
    }

    this.initialized = true;

    const persistedData = await this.readPersistedSession();
    try { console.debug && console.debug('user-session: readPersistedSession', { hasPersisted: !!persistedData }); } catch {}
    if (persistedData?.currentUser) {
      this.currentUser = persistedData.currentUser;
      this.allUsers = persistedData.allUsers;

      // If persisted session contains expiresIn, re-schedule timers from now.
      // If a token expiry was stored as expiresIn (seconds), schedule accordingly.
      this.scheduleRefreshTimers();
    }

    this.emit();
    try { console.debug && console.debug('user-session: initialize done', { currentUserEmail: this.currentUser?.email ?? null }); } catch {}
  }

  public async login(user: AppUser, options: { rememberMe?: boolean; token?: string | null; refreshToken?: string | null; expiresIn?: number | null} = {}) {
    try { console.debug && console.debug('user-session: login called', { email: user.email, options }); } catch {}
    const normalizedUser: AppUser = {
      ...user,
      id: user.id ?? user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role ?? user.roles?.[0] ?? user.userType ?? "User",
      roles: user.roles ?? (user.role ? [user.role] : undefined),
      rememberMe: options.rememberMe ?? false,
      token: options.token ?? user.token ?? null,
      refreshToken: options.refreshToken ?? user.refreshToken ?? user.refresh_token ?? null,
      expiresIn: options.expiresIn ?? user.expiresIn ?? user.expires_in ?? null,
      lastLoginAt: user.lastLoginAt ?? user.lastLoginDate ?? new Date().toISOString(),
      isAuthenticated: true,
      rawLoginResponse: user.rawLoginResponse ?? (user as Record<string, unknown>),
    };

    this.currentUser = normalizedUser;
    this.allUsers = [normalizedUser, ...this.allUsers.filter((entry) => entry.email !== normalizedUser.email)].slice(0, 10);

    await this.persistSession({ currentUser: normalizedUser, allUsers: this.allUsers }, normalizedUser.rememberMe ?? false);

    // Schedule warning and expiry timers based on expiresIn (if provided). If expiresIn missing, default to 20 minutes.
    this.scheduleRefreshTimers();

    this.emit();
    return normalizedUser;
  }

  public async logout() {
    this.clearRefreshTimers();

    this.currentUser = null;
    this.allUsers = this.allUsers.filter((user) => user.isAuthenticated === false);

    await this.clearPersistedSession();
    this.emit();
  }

  /**
   * Register a UI handler that will be invoked when it's time to show the "refresh token" popup.
   * The handler receives { expiresAt, remainingMs } and should return a Promise<boolean>
   * resolving to true if the user clicked "Refresh" and false if declined or dismissed.
   */
  public registerRefreshUiHandler(handler: (opts: { expiresAt: number; remainingMs: number }) => Promise<boolean>) {
    this.refreshUiHandler = handler;
  }

  /**
   * Register the function responsible for performing the refresh token network call.
   * It will be called with the current refreshToken and should return updated tokens and expiresIn (seconds).
   */
  public registerRefreshTokenFunction(fn: (refreshToken: string | null) => Promise<{ token: string; refreshToken?: string | null; expiresIn?: number | null } | null>) {
    this.refreshTokenFn = fn;
  }

  private scheduleRefreshTimers() {
    this.clearRefreshTimers();
    if (!this.currentUser) return;

    // Determine time to expiry in milliseconds. If expiresIn provided, assume seconds.
    const expiresInRaw = this.currentUser.expiresIn ?? null;
    const expiresInMs = typeof expiresInRaw === "number" ? Math.floor(expiresInRaw * 1000) : 20 * 1000; // default 20 seconds

    const expiresAt = Date.now() + expiresInMs;

    const warningAt = expiresAt - this.WARNING_MS;
    const now = Date.now();

    const warningDelay = Math.max(0, warningAt - now);
    const expiryDelay = Math.max(0, expiresAt - now);

    // Debug: log scheduling
    try { console.debug && console.debug('user-session: scheduleRefreshTimers', { expiresInRaw, expiresInMs, warningDelay, expiryDelay, now, expiresAt }); } catch {}

    // Warning timer: show popup 10 seconds before expiry
    this.warningTimerId = window.setTimeout(() => {
      void this.handleWarning(expiresAt);
    }, warningDelay);

    // Expiry timer: logout when token expires
    this.expiryTimerId = window.setTimeout(() => {
      void this.handleExpiry();
    }, expiryDelay);
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
  }

  private async handleWarning(expiresAt: number) {
    if (!this.currentUser) return;

    const remainingMs = Math.max(0, expiresAt - Date.now());

    // Debug: log warning firing
    try { console.debug && console.debug('user-session: handleWarning fired', { expiresAt, remainingMs, email: this.currentUser.email }); } catch {}

    let wantsRefresh = false;

    if (this.refreshUiHandler) {
      try {
        wantsRefresh = await this.refreshUiHandler({ expiresAt, remainingMs });
      } catch {
        wantsRefresh = false;
      }
    } else {
      // Fallback simple confirm popup when no UI handler registered
      try {
        wantsRefresh = window.confirm("Your session will expire soon. Click OK to refresh your session.");
      } catch {
        wantsRefresh = false;
      }
    }

    if (wantsRefresh) {
      await this.performRefresh();
    }
    // If user declines or doesn't respond, do nothing here — expiry timer will logout when time comes
  }

  private async performRefresh() {
    if (!this.currentUser) return null;
    if (!this.refreshTokenFn) {
      return null;
    }

    try {
      try { console.debug && console.debug('user-session: performing token refresh', { email: this.currentUser.email }); } catch {}
      const result = await this.refreshTokenFn(this.currentUser.refreshToken ?? this.currentUser.refresh_token ?? null);
      if (!result) return null;

      // Update user tokens and expiresIn
      this.currentUser = {
        ...this.currentUser,
        token: result.token,
        refreshToken: result.refreshToken ?? this.currentUser.refreshToken ?? this.currentUser.refresh_token ?? null,
        expiresIn: result.expiresIn ?? this.currentUser.expiresIn ?? this.currentUser.expires_in ?? null,
        lastLoginAt: new Date().toISOString(),
      };

      // Persist and reschedule timers
      await this.persistSession({ currentUser: this.currentUser, allUsers: this.allUsers }, this.currentUser.rememberMe ?? false);
      this.scheduleRefreshTimers();
      this.emit();

      return this.currentUser;
    } catch (e) {
      // If refresh failed, let expiry handler logout the user later
      return null;
    }
  }

  private async handleExpiry() {
    // Token expired: force logout
    await this.logout();
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
    try { console.debug && console.debug('user-session: persistSession', { rememberMe, payload }); } catch {}
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
