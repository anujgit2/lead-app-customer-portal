import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[88px] w-full resize-y rounded-md border-[0.5px] bg-card px-3 py-2.5 text-sm leading-5 text-foreground transition-[border-color,box-shadow] duration-150 placeholder:text-placeholder hover:border-foreground/25 focus-visible:border-ring focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.22)] disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground read-only:border-border read-only:bg-muted",
          error
            ? "border-danger focus-visible:border-danger focus-visible:shadow-[0_0_0_3px_hsl(var(--danger)/0.2)]"
            : "border-border",
          className
        )}
        ref={ref}
        aria-invalid={error || undefined}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
