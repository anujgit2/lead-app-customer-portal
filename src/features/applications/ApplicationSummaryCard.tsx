"use client";

import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/types";

export const APPLICATION_STEPS = ["Draft", "Submitted", "In review", "Approved"] as const;

export function applicationStepIndex(status: ApplicationStatus): number {
  if (status === "draft") return 0;
  if (status === "submitted") return 1;
  if (status === "under_review" || status === "rejected") return 2;
  return 3;
}

/** Four-step progress bar for an application's status. Used on the dashboard and the application view. */
export function ApplicationProgress({ status }: { status: ApplicationStatus }) {
  const current = applicationStepIndex(status);
  const rejected = status === "rejected";
  const label = rejected ? "Rejected" : APPLICATION_STEPS[current];
  return (
    <div className="grid grid-cols-4 gap-1.5" aria-label={`Progress: ${label}`}>
      {APPLICATION_STEPS.map((step, index) => {
        const lastRejected = index === 3 && rejected;
        const reached = index <= current;
        const active = index === current;
        return (
          <div key={step}>
            <span
              className={cn(
                "block h-1 rounded-full bg-muted",
                reached && "bg-primary",
                lastRejected && "bg-danger"
              )}
            />
            <span
              className={cn(
                "mt-1.5 block text-[11.5px] leading-4 text-muted-foreground",
                active && "font-semibold text-foreground"
              )}
            >
              {lastRejected ? "Rejected" : step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
