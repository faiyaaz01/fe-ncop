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

  // @ts-ignore
  useEffect(() => {
    // subscribe to session changes
    const unsub = userSessionService.subscribe((u) => {
      setUser(u);
      setChecked(true);
    });

    // initial check
    setUser(userSessionService.getCurrentUser());
    setChecked(true);

    return unsub;
  }, []);

  // If we've checked and there's no authenticated user, redirect to login
  if (checked && !user) {
    return <Navigate to="/index/login" />;
  }

  // Optionally show nothing while checking
  if (!checked) return null;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}