import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  error?: boolean;
}

const fieldClass =
  "flex h-10 w-full rounded-md border bg-card px-3 text-sm text-foreground transition-[border-color,box-shadow] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-placeholder hover:border-foreground/55 focus-visible:border-ring focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.22)] disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground read-only:border-border read-only:bg-muted";

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startAdornment, endAdornment, error, ...props }, ref) => {
    const input = (
      <input
        type={type}
        className={cn(
          fieldClass,
          startAdornment && "pl-9",
          endAdornment && "pr-10",
          error
            ? "border-danger focus-visible:border-danger focus-visible:shadow-[0_0_0_3px_hsl(var(--danger)/0.2)]"
            : "border-input",
          className
        )}
        ref={ref}
        aria-invalid={error || undefined}
        {...props}
      />
    );

    if (!startAdornment && !endAdornment) return input;

    return (
      <div className="relative flex items-center">
        {startAdornment && (
          <div className="pointer-events-none absolute left-3 flex items-center text-sm font-medium text-primary">
            {startAdornment}
          </div>
        )}
        {input}
        {endAdornment && (
          <div className="absolute right-1 flex items-center text-primary">{endAdornment}</div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
