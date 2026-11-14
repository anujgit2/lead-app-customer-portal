import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full text-xs font-semibold leading-none before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-current before:opacity-90 before:content-['']",
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
      size: {
        default: "h-6 px-2.5",
        sm: "h-[22px] px-2",
        xs: "h-5 px-1.5 text-[10px]",
      },
      dot: {
        true: "",
        false: "before:hidden",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      dot: true,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, dot, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size, dot }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
