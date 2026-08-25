import { motion } from "motion/react";

type BrandLoaderProps = {
  label?: string;
  overlay?: boolean;
  lightMark?: boolean;
  quote?: string;
};

export function BrandLoader({
  label = "Loading your workspace…",
  overlay = false,
  lightMark = false,
  quote = "“Science with purpose. Care without compromise.”",
}: BrandLoaderProps) {
  return (
    <div
      className={
        overlay
          ? "fixed inset-0 z-50 grid place-items-center bg-slate-950/90 px-6 backdrop-blur-sm"
          : "grid min-h-screen place-items-center bg-background px-6"
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <motion.img
          src="/nourish-app-icon.png"
          alt=""
          className={`size-20 object-contain sm:size-24`}
          animate={{
            scale: [0.92, 1.05, 0.96, 1.02, 0.92],
            opacity: [0.78, 1, 0.86, 1, 0.78],
          }}
          transition={{
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        <div className="space-y-1.5">
          <p
            className={
              overlay
                ? "text-sm font-medium text-white/80"
                : "text-sm font-medium text-muted-foreground"
            }
          >
            {label}
          </p>
          <p
            className={
              overlay ? "text-xs italic text-white/55" : "text-xs italic text-muted-foreground/80"
            }
          >
            {quote}
          </p>
        </div>
      </div>
    </div>
  );
}
