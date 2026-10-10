import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold leading-none before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-current before:opacity-90 before:content-['']",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground before:hidden",
        secondary: "bg-neutral-soft text-neutral-strong",
        destructive: "bg-danger-soft text-danger-strong",
        outline:
          "bg-transparent text-foreground shadow-[inset_0_0_0_1px_hsl(var(--input))]",
        success: "bg-success-soft text-success-strong",
        warning: "bg-warning-soft text-warning-strong",
        info: "bg-info-soft text-info-strong",
        draft: "bg-neutral-soft text-neutral-strong",
        brand: "bg-primary-soft text-primary-soft-foreground",
      },
      dot: {
        true: "",
        false: "before:hidden",
      },
    },
    defaultVariants: {
      variant: "default",
      dot: true,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, dot, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, dot }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
