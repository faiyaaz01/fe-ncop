import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative isolate overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ease-out active:scale-[0.975] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:shadow-md dark:hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:shadow-md dark:hover:brightness-110",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent/50 hover:text-accent-foreground hover:border-accent",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent/60 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const rippleColorByVariant: Record<string, string> = {
  default: "bg-black/25 dark:bg-white/25",
  destructive: "bg-black/20 dark:bg-white/20",
  outline: "bg-accent/80 dark:bg-accent/60",
  secondary: "bg-primary/10 dark:bg-white/15",
  ghost: "bg-accent/70 dark:bg-accent/50",
  link: "",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  liquidColor?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      liquidColor,
      children,
      onMouseEnter,
      onMouseLeave,
      disabled,
      ...props
    },
    ref,
  ) => {
    const internalRef = React.useRef<HTMLButtonElement | null>(null);
    const [ripple, setRipple] = React.useState<{ x: number; y: number; size: number } | null>(null);
    const [isHovered, setIsHovered] = React.useState(false);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLButtonElement);

    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    const currentVariant = variant || "default";
    const resolvedRippleColor =
      liquidColor || rippleColorByVariant[currentVariant] || "bg-white/15";

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || currentVariant === "link") {
        onMouseEnter?.(e);
        return;
      }
      const button = internalRef.current;
      if (button) {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate maximum distance to all 4 corners to guarantee complete surface coverage
        const corners = [
          Math.hypot(x, y),
          Math.hypot(rect.width - x, y),
          Math.hypot(x, rect.height - y),
          Math.hypot(rect.width - x, rect.height - y),
        ];
        const maxDistance = Math.max(...corners);
        const rippleSize = maxDistance * 2.3;

        setRipple({ x, y, size: rippleSize });
        setIsHovered(true);
      }
      onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(false);
      onMouseLeave?.(e);
    };

    return (
      <button
        ref={internalRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={disabled}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {/* Direction-aware liquid ripple layer */}
        {resolvedRippleColor && (
          <AnimatePresence>
            {isHovered && ripple && (
              <motion.span
                key="button-liquid-ripple"
                className={cn("pointer-events-none absolute rounded-full", resolvedRippleColor)}
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: ripple.size,
                  height: ripple.size,
                  x: "-50%",
                  y: "-50%",
                }}
                initial={{ scale: 0, opacity: 0.85 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  transition: {
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1], // fluid organic curve
                  },
                }}
                exit={{
                  opacity: 0,
                  scale: 1.05,
                  transition: {
                    duration: 0.3,
                    ease: "easeOut",
                  },
                }}
              />
            )}
          </AnimatePresence>
        )}

        {/* Content layer on top with crisp readability and preserved colors */}
        <span className="relative z-10 inline-flex items-center justify-center gap-2 pointer-events-none">
          {children}
        </span>
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
