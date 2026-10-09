"use client";

import { Button } from "@/components/ui/button";
import type { ShareActivity } from "../types";
import { activityEventLabel, formatDisplayDateTime, maskContact } from "../utils/format";

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
      <ol className="relative space-y-5 border-l border-slate-100 pl-6">
        {ordered.map((event) => {
          const contact = maskContact(event.contactMasked);
          return (
            <li key={event.id} className="relative">
              <span
                className="absolute -left-[1.7rem] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white"
                aria-hidden
              />
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
