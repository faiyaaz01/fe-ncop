import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm [@media(hover:hover)]:hover:-translate-y-px [@media(hover:hover)]:hover:bg-primary/90 [@media(hover:hover)]:hover:shadow-md active:bg-primary/95",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm [@media(hover:hover)]:hover:-translate-y-px [@media(hover:hover)]:hover:bg-destructive/90 [@media(hover:hover)]:hover:shadow-md active:bg-destructive/95",
        outline:
          "border border-border/80 bg-card text-foreground shadow-xs [@media(hover:hover)]:hover:-translate-y-px [@media(hover:hover)]:hover:border-primary/35 [@media(hover:hover)]:hover:bg-secondary [@media(hover:hover)]:hover:shadow-sm dark:bg-card/90 dark:border-white/20 dark:text-foreground [@media(hover:hover)]:dark:hover:bg-secondary/90 [@media(hover:hover)]:dark:hover:border-primary/50 dark:shadow-[0_2px_10px_-2px_rgba(0,0,0,0.5)] active:bg-secondary/70",
        secondary:
          "border border-border/40 bg-secondary text-secondary-foreground shadow-xs [@media(hover:hover)]:hover:-translate-y-px [@media(hover:hover)]:hover:border-border/70 [@media(hover:hover)]:hover:bg-secondary/75 [@media(hover:hover)]:hover:shadow-sm dark:border-white/10 active:bg-secondary/90",
        ghost:
          "bg-transparent text-foreground [@media(hover:hover)]:hover:bg-secondary [@media(hover:hover)]:hover:text-foreground active:bg-secondary/60 dark:active:bg-secondary/60",
        link: "text-primary underline-offset-4 [@media(hover:hover)]:hover:text-primary/80 [@media(hover:hover)]:hover:underline",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
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
      liquidColor: _liquidColor,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    void _liquidColor;

    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        <span className="inline-flex items-center justify-center gap-2 pointer-events-none">
          {children}
        </span>
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
