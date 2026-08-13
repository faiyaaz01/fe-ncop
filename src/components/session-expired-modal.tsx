import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { userSessionService } from "@/lib/user-session";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export function SessionExpiredModal() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  // @ts-ignore
  useEffect(() => {
    // Check once on mount — covers the case where expiry happened while this
    // component wasn't mounted yet (e.g. app was closed, or redirect already fired).
    const reason = userSessionService.getLastLogoutReason();
    if (reason === "expired" || reason === "invalid") {
      setVisible(true);
    }

    // Also react live if expiry/invalid happens while this component IS mounted.
    const unsub = userSessionService.subscribe((user) => {
      if (!user) {
        const r = userSessionService.getLastLogoutReason();
        if (r === "expired" || r === "invalid") {
          setVisible(true);
        }
      }
    });

    return unsub;
  }, []);

  const handleLogBackIn = () => {
    userSessionService.clearLastLogoutReason();
    setVisible(false);
    navigate({ to: "/index/login" });
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-rose-50">
          <ShieldAlert className="size-6 text-rose-500" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">Your session has expired</h2>
        <p className="mt-2 text-sm text-slate-600">
          For your security, you've been logged out due to inactivity or session timeout.
        </p>
        <Button onClick={handleLogBackIn} className="mt-5 w-full">
          Log back in
        </Button>
      </div>
    </div>
  );
}
