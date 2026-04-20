import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-full transition-[background-color,color,box-shadow,border-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-bg hover:bg-ink-muted active:scale-[0.98]",
        accent:
          "bg-accent text-accent-contrast hover:bg-accent-hover active:scale-[0.98]",
        secondary:
          "bg-surface text-ink border border-border hover:border-border-strong hover:bg-subtle",
        outline:
          "bg-transparent text-ink border border-border hover:border-ink hover:bg-subtle",
        ghost:
          "bg-transparent text-ink hover:bg-subtle",
        link:
          "bg-transparent text-accent underline-offset-4 hover:underline h-auto px-0 py-0 rounded-none",
        danger:
          "bg-danger text-white hover:opacity-90 active:scale-[0.98]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-6 text-[0.95rem]",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
