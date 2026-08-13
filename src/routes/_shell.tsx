import { Outlet, createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { userSessionService } from "@/lib/user-session";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const [user, setUser] = useState(() => userSessionService.getCurrentUser());
  const [checked, setChecked] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // @ts-ignore
  useEffect(() => {
    const unsub = userSessionService.subscribe((u) => {
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

    setUser(userSessionService.getCurrentUser());
    setChecked(true);

    return unsub;
  }, []);

  // Only redirect to login for user-initiated logout or no-session-on-load.
  // When expired/invalid, AppShell stays mounted and shows the expired dialog.
  if (checked && !user && !sessionExpired) {
    return <Navigate to="/index/login" />;
  }

  if (!checked) return null;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
