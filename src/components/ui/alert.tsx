import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-3.5 text-sm leading-5 [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:size-5 [&>svg~*]:pl-8",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-foreground",
        destructive: "border-danger/30 bg-danger-soft text-danger-strong [&>svg]:text-danger-strong",
        warning: "border-warning/35 bg-warning-soft text-warning-strong [&>svg]:text-warning-strong",
        success: "border-success/30 bg-success-soft text-success-strong [&>svg]:text-success-strong",
        info: "border-info/30 bg-info-soft text-info-strong [&>svg]:text-info-strong",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-0.5 font-semibold leading-5", className)} {...props} />
  )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm leading-5 opacity-[0.92] [&_p]:leading-5", className)} {...props} />
  )
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
