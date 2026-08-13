import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Boxes,
  ChevronLeft,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  PanelsTopLeft,
  PieChart,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode, useRef, useEffect } from "react";
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
import { useNavigate } from "@tanstack/react-router";
import { userSessionService } from "@/lib/user-session.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const nav = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Client Master", to: "/clients", icon: Users },
  { label: "Product Master", to: "/products", icon: Boxes },
  { label: "Customer Inquiry", to: "/inquiry", icon: ClipboardList },
  { label: "Final Order", to: "/orders", icon: FileText },
  { label: "Reports", to: "/reports", icon: PieChart },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Profile", to: "/profile", icon: UserRound },
] as const;

const mobileNav = nav.slice(0, 5);

function Brand({ collapsed }: { collapsed: boolean }) {

  const navigate = useNavigate();

  const handleOnClickOfBranding = () => {
    // Navigate to the dashboard route
    navigate({ to: "/dashboard" });
  }

  return (
    <div onClick={handleOnClickOfBranding} className="flex items-center gap-2.5 overflow-hidden cursor-pointer" title="NCOP Pharma Dashboard">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <ShieldCheck className="size-[18px]" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-sm font-bold">NCOP</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Pharma ERP
          </p>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const userInfo = userSessionService.getCurrentUser();
  const navigate = useNavigate();

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
        const resp = await fetch("http://localhost:8080/auth/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${refreshToken}`,
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
    console.debug && console.debug("AppShell: initial session check", { currentUser: !!currentUser, initialReason });
    if (!currentUser && (initialReason === "expired" || initialReason === "invalid")) {
      setIsWarningOpen(false);
    }

    const unsub = userSessionService.subscribe((user) => {
      const reason = userSessionService.getLastLogoutReason();
      console.debug && console.debug("AppShell: session change", { user: !!user, reason });
      if (!user && (reason === "expired" || reason === "invalid")) {
        // Ensure the pre-expiry warning isn't visible
        setIsWarningOpen(false);
        navigate({ to: '/index/login' });
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
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border/70 bg-sidebar/70 backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex",
          collapsed ? "w-[76px]" : "w-[260px]",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Brand collapsed={collapsed} />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 h-6 w-[3px] rounded-r-full bg-primary"
                  />
                )}
                <item.icon className="size-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-border/70 p-3">
          <button
            onClick={async () => {
              await userSessionService.logout();
              // navigate to login
              navigate({ to: "/index/login" });
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-[18px] shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((c) => !c)}
            className="w-full justify-start gap-3 px-3 text-muted-foreground"
          >
            <ChevronLeft
              className={cn("size-[18px] transition-transform", collapsed && "rotate-180")}
            />
            {!collapsed && <span>Collapse</span>}
          </Button>
        </div>
      </aside>

      <div
        className={cn(
          "relative transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]",
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/60 px-4 backdrop-blur-xl sm:px-6">
          <div className="lg:hidden">
            <Brand collapsed={false} />
          </div>

          <div className="relative ml-auto hidden w-full max-w-sm md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients, products, RFQs…"
              className="bg-card/70 pl-9 backdrop-blur"
            />
          </div>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <ThemeToggle />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                  <Bell className="size-[18px]" />
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-accent ring-2 ring-background" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="glass w-80 rounded-2xl p-0">
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">4 unread updates</p>
                </div>
                <ul className="divide-y divide-border/50">
                  {notifications.map((n) => (
                    <li key={n.title} className="px-4 py-3 transition-colors hover:bg-secondary/50">
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
                <button className="ml-1 flex items-center gap-2 rounded-full p-0.5 transition-opacity hover:opacity-80">
                  <Avatar className="size-9 border border-border cursor-pointer">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {userInfo?.firstName?.trim().charAt(0).toUpperCase()}
                      {userInfo?.lastName?.trim().charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass w-56 rounded-2xl">
                <DropdownMenuLabel className="space-y-0.5">
                  <p className="text-sm font-semibold">
                    {userInfo?.firstName} {userInfo?.lastName}
                  </p>
                  <p className="text-xs font-normal text-muted-foreground">
                    Administrator · Global Sales
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <UserRound className="size-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="size-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await userSessionService.logout();
                    // navigate to login
                    navigate({ to: "/index/login" });
                  }}
                >
                  <LogOut className="size-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-[1400px] space-y-6 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-12"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Session expiry warning dialog */}
      <Dialog open={isWarningOpen} onOpenChange={(open) => {
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
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session expiring soon</DialogTitle>

            <DialogDescription>Your session will expire in {Math.floor(remainingSecs / 60)}:{String(remainingSecs % 60).padStart(2, '0')}. Refresh to continue your session.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => {
              if (resolveRef.current) {
                resolveRef.current(false);
                resolveRef.current = null;
              }
              setIsWarningOpen(false);
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
              }
            }}>Logout</Button>

            <Button onClick={async () => {
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
            }}>Refresh</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inactivity warning dialog */}
      <Dialog open={isInactivityWarningOpen} onOpenChange={(open) => {
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
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you still there?</DialogTitle>
            <DialogDescription>
              You&apos;ve been inactive. For your security, you&apos;ll be automatically logged out in{" "}
              <span className="font-semibold tabular-nums">
                {Math.floor(inactivityRemainingSecs / 60)}:{String(inactivityRemainingSecs % 60).padStart(2, "0")}
              </span>.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => {
              if (inactivityResolveRef.current) {
                inactivityResolveRef.current(true);
                inactivityResolveRef.current = null;
              }
              setIsInactivityWarningOpen(false);
              if (inactivityCountdownRef.current) {
                clearInterval(inactivityCountdownRef.current);
                inactivityCountdownRef.current = null;
              }
            }}>Stay signed in</Button>
          </div>
        </DialogContent>
      </Dialog>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/80 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="flex items-center justify-between">
          {mobileNav.map((item) => {
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
          <li className="flex-1">
            <Link
              to="/reports"
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground"
            >
              <PanelsTopLeft className="size-[18px]" />
              More
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}