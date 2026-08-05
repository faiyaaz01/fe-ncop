import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Daytime window: 6:00 AM - 6:00 PM -> light. Outside that -> dark.
function getTimeBasedTheme(): "light" | "dark" {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}


export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // "auto" means follow real clock time; a stored "light"/"dark" means the
    // user manually overrode it via the toggle button.
    const stored = localStorage.getItem("pharma-theme") as "light" | "dark" | "auto" | null;
    const initial = stored && stored !== "auto" ? stored : getTimeBasedTheme();
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");

    // If following the clock (no manual override), re-check periodically so
    // the theme flips automatically when day turns to night (and vice versa)
    // without needing a page refresh.
    if (!stored || stored === "auto") {
      const interval = setInterval(() => {
        const next = getTimeBasedTheme();
        setTheme((prev) => {
          if (prev === next) return prev;
          document.documentElement.classList.toggle("dark", next === "dark");
          return next;
        });
      }, 60 * 1000);
      return () => clearInterval(interval);
    }

    return undefined;
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    // Manual toggle always sets an explicit override.
    localStorage.setItem("pharma-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return { theme, toggle };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggle}
      className={className}
    >
      {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </Button>
  );
}