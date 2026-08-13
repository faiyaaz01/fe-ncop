import { Outlet, createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { userSessionService } from "@/lib/user-session";
import { AppShell } from "@/components/app-shell";
import { SessionWarningModal } from "@/components/session-warning-modal";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const [user, setUser] = useState(() => userSessionService.getCurrentUser());
  const [checked, setChecked] = useState(false);

  // @ts-ignore
  useEffect(() => {
    const unsub = userSessionService.subscribe((u) => {
      setUser(u);
      setChecked(true);
    });

    setUser(userSessionService.getCurrentUser());
    setChecked(true);

    return unsub;
  }, []);

  if (checked && !user) {
    return <Navigate to="/index/login" />;
  }

  if (!checked) return null;

  return (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      <SessionWarningModal />
    </>
  );
}
