"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ShareActivity, ShareEventType } from "../types";
import { activityEventLabel, formatDisplayDateTime, maskContact } from "../utils/format";

function isCompleteEvent(eventType: ShareEventType): boolean {
  return eventType === "SHARED" || eventType === "LINK_SENT" || eventType === "VIEWED" || eventType === "DOWNLOADED";
}

interface ActivityTimelineProps {
  events: ShareActivity[];
  isLoading?: boolean;
  isError?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
}

export function ActivityTimeline({
  events,
  isLoading,
  isError,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onRetry,
}: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <p className="sr-only">Loading activity</p>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive" role="alert">
          Couldn&apos;t load activity.
        </p>
        {onRetry ? (
          <Button type="button" variant="outline" className="h-11" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No activity yet.</p>;
  }

  const ordered = [...events].sort(
    (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
  );

  return (
    <div className="space-y-4">
      <ol className="relative space-y-5 border-l border-success/40 pl-6">
        {ordered.map((event) => {
          const contact = maskContact(event.contactMasked);
          const complete = isCompleteEvent(event.eventType);
          return (
            <li key={event.id} className="relative">
              <span
                className={cn(
                  "absolute -left-[calc(1.5rem+10px)] top-0 grid h-5 w-5 place-items-center rounded-full text-white ring-4 ring-white",
                  complete ? "bg-success" : "bg-danger"
                )}
                aria-hidden
              >
                {complete ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </span>
              <p className="text-sm font-semibold text-slate-900">{activityEventLabel(event)}</p>
              {contact ? <p className="mt-0.5 text-sm font-normal text-slate-500">{contact}</p> : null}
              <p className="mt-0.5 text-xs text-slate-500">{formatDisplayDateTime(event.occurredAt)}</p>
            </li>
          );
        })}
      </ol>
      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="h-11"
          loading={isLoadingMore}
          onClick={onLoadMore}
        >
          Load more
        </Button>
      ) : null}
    </div>
  );
}
