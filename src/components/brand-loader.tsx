import { motion } from "motion/react";

type BrandLoaderProps = {
  label?: string;
  overlay?: boolean;
  lightMark?: boolean;
};

export function BrandLoader({
  label = "Loading your workspace…",
  overlay = false,
  lightMark = false,
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
          className={`size-20 object-contain sm:size-24 ${lightMark ? "brightness-0 invert" : ""}`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <p
          className={
            overlay
              ? "text-sm font-medium text-white/80"
              : "text-sm font-medium text-muted-foreground"
          }
        >
          {label}
        </p>
      </div>
    </div>
  );
}
