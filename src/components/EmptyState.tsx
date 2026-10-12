import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1 px-6 py-10 text-center", className)} role="status">
      <span className="tone-brand mb-3 grid h-12 w-12 place-items-center rounded-lg">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="text-base font-semibold leading-6 tracking-tight text-foreground">{title}</h3>
      {description ? <p className="max-w-[36ch] text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
