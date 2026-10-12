import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const WIDTHS = {
  list: "max-w-[1200px]",
  detail: "max-w-[1120px]",
  narrow: "max-w-3xl",
} as const;

interface PageShellProps {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
}

/** Content column for pages inside `AppLayout`: one width scale and padding for every page. */
export function PageShell({ children, width = "list", className }: PageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-7 px-4 py-5 sm:px-8 sm:py-9",
        WIDTHS[width],
        className
      )}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-8 tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
