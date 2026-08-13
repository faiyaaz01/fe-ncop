import { useEffect, useState } from "react";
import { userSessionService } from "@/lib/user-session";
import { Button } from "@/components/ui/button";

export function SessionWarningModal() {
  const [visible, setVisible] = useState(false);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    userSessionService.registerRefreshUiHandler(({ remainingMs }) => {
      return new Promise<boolean>((resolve) => {
        setSecondsLeft(Math.ceil(remainingMs / 1000));
        setVisible(true);
        setResolver(() => resolve);
      });
    });
  }, []);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  const handleChoice = (stay: boolean) => {
    resolver?.(stay);
    setVisible(false);
    setResolver(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Session expiring soon</h2>
        <p className="mt-2 text-sm text-slate-600">
          You'll be signed out in <span className="font-semibold">{secondsLeft}s</span>. Stay signed
          in?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleChoice(false)}>
            Log out now
          </Button>
          <Button onClick={() => handleChoice(true)}>Stay signed in</Button>
        </div>
      </div>
    </div>
  );
}
