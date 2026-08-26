import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Boxes,
  Check,
  ClipboardList,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  UserCheck,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { notifications } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { pageTransitionVariants } from "@/lib/animations";
import { useNavigate } from "@tanstack/react-router";
import { canAccessRoute, userModuleRightNames, userSessionService } from "@/lib/user-session.ts";
import { apiUrl } from "@/lib/api-config.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Products", to: "/products", icon: Boxes },
  { label: "RFQs", to: "/inquiry", icon: ClipboardList },
  // { label: "Final Order", to: "/orders", icon: FileText },
  // { label: "Reports", to: "/reports", icon: PieChart },
  { label: "User Management", to: "/user-management", icon: UserCog },
  // { label: "Settings", to: "/settings", icon: Settings },
  { label: "Profile", to: "/profile", icon: UserRound },
] as const;

function Brand({
  collapsed,
  showExpandIcon = false,
  onClick,
}: {
  collapsed: boolean;
  showExpandIcon?: boolean;
  onClick?: () => void;
}) {
  const navigate = useNavigate();

  const handleOnClickOfBranding = () => {
    if (onClick) {
      onClick();
      return;
    }

    // Navigate to the dashboard route
    navigate({ to: "/dashboard" });
  };

  return (
    <div
      onClick={handleOnClickOfBranding}
      className="flex items-center gap-2.5 overflow-hidden cursor-pointer"
      title={showExpandIcon ? "Expand sidebar" : "Nourish Pharmaceutical Dashboard"}
    >
      {collapsed ? (
        <div className="grid size-11 shrink-0 place-items-center">
          <AnimatePresence mode="wait" initial={false}>
            {showExpandIcon ? (
              <motion.span
                key="expand"
                className="grid size-full place-items-center"
                initial={{ opacity: 0, scale: 0.72, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.72, rotate: 12 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <PanelLeftOpen className="size-4" />
              </motion.span>
            ) : (
              <motion.span
                key="brand"
                className="grid size-full place-items-center"
                initial={{ opacity: 0, scale: 0.72, rotate: 12 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.72, rotate: -12 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <img
                  src="/nourish-app-icon.png"
                  alt="Nourish Pharmaceutical"
                  className="size-full object-contain"
                />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <img
          src="/nourish-pharmaceutical-logo.png"
          alt="Nourish Pharmaceutical Pvt. Ltd."
          className="h-10 w-auto"
        />
      )}
    </div>
  );
}

function HeaderSearchInput() {
  const fullText = "Search clients, products, RFQs…";
  const [placeholder, setPlaceholder] = useState("");

  useEffect(() => {
    let index = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        index += 1;
        setPlaceholder(fullText.slice(0, index));
        if (index >= fullText.length) {
          clearInterval(interval);
        }
      }, 40);

      return () => clearInterval(interval);
    }, 280);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="relative ml-auto hidden w-full max-w-sm md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="bg-card/70 pl-9 backdrop-blur"
      />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [currentUser, setCurrentUser] = useState(() => userSessionService.getCurrentUser());
  const navigate = useNavigate();

  // @ts-ignore
  useEffect(() => {
    return userSessionService.subscribe((u) => setCurrentUser(u));
  }, []);

  const visibleNav = useMemo(() => {
    if (!currentUser) return nav;
    return nav.filter((item) => canAccessRoute(currentUser, item.to));
  }, [currentUser]);

  const userInfo = currentUser;
  const accountRoles = [userInfo?.role, ...(userInfo?.roles || [])]
    .filter(Boolean)
    .map((role) => String(role))
    .filter((role, index, roles) => roles.indexOf(role) === index);
  const assignedRightCount = userModuleRightNames(currentUser).length;

  // Warning modal state for token refresh
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [remainingSecs, setRemainingSecs] = useState(0);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);
  const countdownRef = useRef<number | null>(null);

  // Inactivity warning modal state
  const [isInactivityWarningOpen, setIsInactivityWarningOpen] = useState(false);
  const [inactivityRemainingSecs, setInactivityRemainingSecs] = useState(0);
  const inactivityResolveRef = useRef<((v: boolean) => void) | null>(null);
  const inactivityCountdownRef = useRef<number | null>(null);

  useEffect(() => {
    // UI handler: shows modal and resolves true/false based on user action
    userSessionService.registerRefreshUiHandler(async ({ expiresAt, remainingMs }) => {
      setRemainingSecs(Math.max(0, Math.ceil(remainingMs / 1000)));
      setIsWarningOpen(true);

      return await new Promise<boolean>((resolve) => {
        resolveRef.current = (v: boolean) => {
          resolve(v);
          resolveRef.current = null;
        };

        // start countdown
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        countdownRef.current = window.setInterval(() => {
          setRemainingSecs((s) => {
            if (s <= 1) {
              // timeout: resolve false
              if (resolveRef.current) {
                resolveRef.current(false);
                resolveRef.current = null;
              }
              setIsWarningOpen(false);
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
              }
              return 0;
            }
            return s - 1;
          });
        }, 1000);
      });
    });

    // Register refresh token function: try real endpoint, fallback to mock for testing
    // @ts-ignore
    userSessionService.registerRefreshTokenFunction(async (refreshToken) => {
      try {
        const resp = await fetch(apiUrl("/api/v1/auth/refresh"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshToken}`,
          },
        });
        if (resp.ok) {
          const json = await resp.json();
          return {
            token: json.token,
            refreshToken: json.refreshToken ?? json.refresh_token,
            expiresIn: json.expiresIn ?? json.expires_in ?? 20,
          };
        }
      } catch (e) {
        // ignore and fallback to mock
        console.log("Failed to refresh token");
        // navigate({ to: "/index/login" });
      }
    });

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      if (inactivityCountdownRef.current) {
        clearInterval(inactivityCountdownRef.current);
        inactivityCountdownRef.current = null;
      }
    };
  }, []);

  // Inactivity UI handler: shows modal and resolves true/false
  // @ts-ignore
  useEffect(() => {
    if (!isWarningOpen) {
      userSessionService.registerInactivityUiHandler(async ({ warningDurationMs }) => {
        const secs = Math.ceil(warningDurationMs / 1000);
        setInactivityRemainingSecs(secs);
        setIsInactivityWarningOpen(true);

        return await new Promise<boolean>((resolve) => {
          inactivityResolveRef.current = (v: boolean) => {
            resolve(v);
            inactivityResolveRef.current = null;
          };

          if (inactivityCountdownRef.current) {
            clearInterval(inactivityCountdownRef.current);
            inactivityCountdownRef.current = null;
          }
          inactivityCountdownRef.current = window.setInterval(() => {
            setInactivityRemainingSecs((s) => {
              if (s <= 1) {
                if (inactivityResolveRef.current) {
                  inactivityResolveRef.current(false);
                  inactivityResolveRef.current = null;
                }
                setIsInactivityWarningOpen(false);
                if (inactivityCountdownRef.current) {
                  clearInterval(inactivityCountdownRef.current);
                  inactivityCountdownRef.current = null;
                }
                return 0;
              }
              return s - 1;
            });
          }, 1000);
        });
      });

      return () => {
        if (inactivityCountdownRef.current) {
          clearInterval(inactivityCountdownRef.current);
          inactivityCountdownRef.current = null;
        }
      };
    }
  }, []);

  // Subscribe to session changes to surface an expired/invalid-session modal.
  // @ts-ignore
  useEffect(() => {
    // Immediate check (covers the case where the service initialized earlier and set a reason)
    const currentUser = userSessionService.getCurrentUser();
    const initialReason = userSessionService.getLastLogoutReason();
    console.debug &&
      console.debug("AppShell: initial session check", {
        currentUser: !!currentUser,
        initialReason,
      });
    if (!currentUser && (initialReason === "expired" || initialReason === "invalid")) {
      setIsWarningOpen(false);
    }

    const unsub = userSessionService.subscribe((user) => {
      const reason = userSessionService.getLastLogoutReason();
      console.debug && console.debug("AppShell: session change", { user: !!user, reason });
      if (!user && (reason === "expired" || reason === "invalid")) {
        // Ensure the pre-expiry warning isn't visible
        setIsWarningOpen(false);
        navigate({ to: "/index/login" });
      }
    });

    return () => unsub();
  }, []);

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-70 [background:radial-gradient(60rem_40rem_at_10%_-10%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent),radial-gradient(50rem_36rem_at_100%_0%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent)]"
      />

      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border/70 bg-sidebar/70 backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex",
          collapsed ? "w-[76px]" : "w-[260px]",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center",
            collapsed ? "justify-center px-1.5" : "justify-between px-4",
          )}
        >
          <Brand
            collapsed={collapsed}
            showExpandIcon={collapsed && isSidebarHovered}
            onClick={collapsed ? () => setCollapsed(false) : undefined}
          />
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground [@media(hover:hover)]:hover:bg-secondary [@media(hover:hover)]:hover:text-foreground"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {visibleNav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center px-2" : "gap-3 px-3",
                  active
                    ? "bg-primary/10 text-primary font-semibold shadow-xs"
                    : "text-muted-foreground [@media(hover:hover)]:hover:bg-secondary/80 [@media(hover:hover)]:hover:text-foreground active:scale-[0.98]",
                )}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 h-6 w-[3px] rounded-r-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon className="size-[18px] shrink-0 transition-transform duration-200 [@media(hover:hover)]:group-hover:scale-110" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div
        className={cn(
          "relative transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]",
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/60 px-4 backdrop-blur-xl sm:px-6">
          <div className="lg:hidden">
            <div className="flex items-center gap-2">
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0 flex flex-col glass">
                  <div className="flex h-16 items-center px-4 border-b border-border/60">
                    <Brand
                      collapsed={false}
                      onClick={() => {
                        setMobileNavOpen(false);
                        navigate({ to: "/dashboard" });
                      }}
                    />
                  </div>

                  <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                    {visibleNav.map((item) => {
                      const active = pathname === item.to;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileNavOpen(false)}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                            active
                              ? "bg-primary/10 text-primary font-semibold shadow-xs"
                              : "text-muted-foreground [@media(hover:hover)]:hover:bg-secondary/80 [@media(hover:hover)]:hover:text-foreground active:scale-[0.98]",
                          )}
                        >
                          {active && (
                            <span className="absolute left-0 h-6 w-[3px] rounded-r-full bg-primary" />
                          )}
                          <item.icon className="size-5 shrink-0 transition-transform duration-200 [@media(hover:hover)]:group-hover:scale-110" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>

                  {userInfo && (
                    <div className="border-t border-border/60 p-3 bg-secondary/20">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-9 border border-border shadow-xs">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {userInfo?.firstName?.trim().charAt(0).toUpperCase()}
                            {userInfo?.lastName?.trim().charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">
                            {userInfo?.firstName} {userInfo?.lastName}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {userInfo?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </SheetContent>
              </Sheet>
              <Brand collapsed={false} />
            </div>
          </div>

          <HeaderSearchInput />

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <ThemeToggle />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                  <Bell className="size-[18px]" />
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-accent ring-2 ring-background animate-pulse-subtle" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                collisionPadding={16}
                className="glass w-[calc(100vw-2rem)] max-w-sm sm:w-80 rounded-2xl p-0"
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">4 unread updates</p>
                </div>
                <ul className="divide-y divide-border/50 max-h-[340px] overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.title} className="px-4 py-3 transition-colors [@media(hover:hover)]:hover:bg-secondary/50">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            n.tone === "success" && "bg-accent",
                            n.tone === "warning" && "bg-chart-4",
                            n.tone === "info" && "bg-primary",
                          )}
                        />
                        <div className="space-y-0.5">
                          <p className="text-[13px] font-medium leading-snug">{n.title}</p>
                          <p className="text-xs text-muted-foreground">{n.detail}</p>
                          <p className="text-[11px] text-muted-foreground/80">{n.time}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>

            {/*User Information Avatar*/}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ml-1 flex items-center gap-2 rounded-full p-0.5 transition-all [@media(hover:hover)]:hover:opacity-85 [@media(hover:hover)]:hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar className="size-9 border border-border cursor-pointer shadow-xs">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {userInfo?.firstName?.trim().charAt(0).toUpperCase()}
                      {userInfo?.lastName?.trim().charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" collisionPadding={16} className="glass w-56 rounded-2xl">
                <DropdownMenuLabel className="space-y-0.5">
                  <p className="text-sm font-semibold">
                    {userInfo?.firstName} {userInfo?.lastName}
                  </p>
                  <p className="text-xs font-normal text-muted-foreground">{userInfo?.email}</p>
                  <p className="pt-1 text-[11px] font-normal text-muted-foreground">
                    {accountRoles.join(" · ") || "User"} · {assignedRightCount} module rights
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {currentUser && canAccessRoute(currentUser, "/profile") && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => navigate({ to: "/profile" })}
                  >
                    <UserRound className="size-4" /> Profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive [@media(hover:hover)]:hover:bg-destructive/15 [@media(hover:hover)]:hover:text-destructive data-[highlighted]:bg-destructive/15 data-[highlighted]:text-destructive transition-colors duration-150 rounded-xl font-medium"
                  onSelect={async () => {
                    await userSessionService.logout();
                    navigate({ to: "/index/login" });
                  }}
                >
                  <LogOut className="size-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1400px] space-y-6 overflow-x-hidden px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-12 animate-in fade-in-50 duration-200">
          {children}
        </main>
      </div>

      {/* Session expiry warning dialog */}
      <Dialog
        open={isWarningOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (resolveRef.current) {
              resolveRef.current(false);
              resolveRef.current = null;
            }
            setIsWarningOpen(false);
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
          }
        }}
      >
        <DialogContent
          className={cn(
            "max-sm:fixed max-sm:inset-auto max-sm:left-1/2 max-sm:top-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2",
            "max-sm:w-[calc(100%-2rem)] max-sm:max-w-md max-sm:h-auto max-sm:rounded-2xl max-sm:border max-sm:p-5 max-sm:shadow-2xl",
            "sm:max-w-md sm:rounded-2xl sm:p-6",
            "bg-card text-card-foreground border-border/80",
          )}
        >
          <div className="flex items-start gap-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
              <Clock className="size-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <DialogTitle className="text-base sm:text-lg font-semibold leading-snug">
                Session Expiring Soon
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Your session is about to expire for security. Refresh now to continue working without losing your progress.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5 border border-border/60">
            <span className="text-xs font-medium text-muted-foreground">Time Remaining</span>
            <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              <span>
                {Math.floor(remainingSecs / 60)}:{String(remainingSecs % 60).padStart(2, "0")}
              </span>
            </div>
          </div>

          <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-9 text-xs sm:text-sm"
              onClick={() => {
                if (resolveRef.current) {
                  resolveRef.current(false);
                  resolveRef.current = null;
                }
                setIsWarningOpen(false);
                if (countdownRef.current) {
                  clearInterval(countdownRef.current);
                  countdownRef.current = null;
                }
              }}
            >
              Logout
            </Button>

            <Button
              type="button"
              className="w-full sm:w-auto h-9 text-xs sm:text-sm gap-1.5"
              onClick={async () => {
                const refreshed = await userSessionService.refreshSession();

                if (resolveRef.current) {
                  resolveRef.current(refreshed);
                  resolveRef.current = null;
                }
                setIsWarningOpen(false);
                if (countdownRef.current) {
                  clearInterval(countdownRef.current);
                  countdownRef.current = null;
                }
              }}
            >
              <RefreshCw className="size-3.5" /> Refresh Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inactivity warning dialog */}
      <Dialog
        open={isInactivityWarningOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Dismissing the dialog = user is still here → stay signed in
            if (inactivityResolveRef.current) {
              inactivityResolveRef.current(true);
              inactivityResolveRef.current = null;
            }
            setIsInactivityWarningOpen(false);
            if (inactivityCountdownRef.current) {
              clearInterval(inactivityCountdownRef.current);
              inactivityCountdownRef.current = null;
            }
          }
        }}
      >
        <DialogContent
          className={cn(
            "max-sm:fixed max-sm:inset-auto max-sm:left-1/2 max-sm:top-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2",
            "max-sm:w-[calc(100%-2rem)] max-sm:max-w-md max-sm:h-auto max-sm:rounded-2xl max-sm:border max-sm:p-5 max-sm:shadow-2xl",
            "sm:max-w-md sm:rounded-2xl sm:p-6",
            "bg-card text-card-foreground border-border/80",
          )}
        >
          <div className="flex items-start gap-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <UserCheck className="size-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <DialogTitle className="text-base sm:text-lg font-semibold leading-snug">
                Are you still there?
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                You&apos;ve been inactive for a while. For your security, you will be automatically logged out unless you confirm you&apos;re still active.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5 border border-border/60">
            <span className="text-xs font-medium text-muted-foreground">Auto logout in</span>
            <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-primary">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span>
                {Math.floor(inactivityRemainingSecs / 60)}:
                {String(inactivityRemainingSecs % 60).padStart(2, "0")}
              </span>
            </div>
          </div>

          <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-9 text-xs sm:text-sm"
              onClick={async () => {
                if (inactivityResolveRef.current) {
                  inactivityResolveRef.current(false);
                  inactivityResolveRef.current = null;
                }
                setIsInactivityWarningOpen(false);
                if (inactivityCountdownRef.current) {
                  clearInterval(inactivityCountdownRef.current);
                  inactivityCountdownRef.current = null;
                }
                await userSessionService.logout();
                navigate({ to: "/index/login" });
              }}
            >
              Logout
            </Button>

            <Button
              type="button"
              className="w-full sm:w-auto h-9 text-xs sm:text-sm gap-1.5"
              onClick={() => {
                if (inactivityResolveRef.current) {
                  inactivityResolveRef.current(true);
                  inactivityResolveRef.current = null;
                }
                setIsInactivityWarningOpen(false);
                if (inactivityCountdownRef.current) {
                  clearInterval(inactivityCountdownRef.current);
                  inactivityCountdownRef.current = null;
                }
              }}
            >
              <Check className="size-3.5" /> Stay signed in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/80 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="flex items-center justify-between">
          {visibleNav.slice(0, 5).map((item) => {
            const active = pathname === item.to;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-[18px]" />
                  {item.label.split(" ")[0]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
