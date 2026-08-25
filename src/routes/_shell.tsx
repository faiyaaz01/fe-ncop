import { Outlet, createFileRoute, Navigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { canAccessRoute, userSessionService } from "@/lib/user-session";
import { AppShell } from "@/components/app-shell";
import { BrandLoader } from "@/components/brand-loader";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const [user, setUser] = useState(() => userSessionService.getCurrentUser());
  const [checked, setChecked] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // @ts-ignore
  useEffect(() => {
    let mounted = true;
    const syncSession = () => {
      if (!mounted) return;
      setUser(userSessionService.getCurrentUser());
      setChecked(true);
    };
    const unsub = userSessionService.subscribe((u) => {
      if (!mounted) return;
      setUser(u);
      setChecked(true);

      // When user becomes null due to expiry/invalid, don't redirect —
      // let AppShell show the expired-session dialog instead.
      if (!u) {
        const reason = userSessionService.getLastLogoutReason();
        if (reason === "expired" || reason === "invalid") {
          setSessionExpired(true);
        }
      } else {
        setSessionExpired(false);
      }
    });

    void userSessionService.whenReady().then(syncSession);

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Only redirect to login for user-initiated logout or no-session-on-load.
  // When expired/invalid, AppShell stays mounted and shows the expired dialog.
  const isAuthenticated = Boolean(user && user.isAuthenticated !== false);

  if (checked && !isAuthenticated && !sessionExpired) {
    return <Navigate to="/index/login" />;
  }

  if (!checked) return <BrandLoader />;

  if (isAuthenticated && !canAccessRoute(user, pathname)) {
    return (
      <AppShell>
        <div className="grid min-h-[50vh] place-items-center p-6 text-center">
          <div>
            <h1 className="text-xl font-semibold">Access denied</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account does not have the module right required for this page.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
