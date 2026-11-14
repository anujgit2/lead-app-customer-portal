"use client";

import { Ban, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ShareActivity, ShareEventType } from "../types";
import { activityEventLabel, formatDisplayDateTime } from "../utils/format";

function dotTone(eventType: ShareEventType): "success" | "danger" {
  return eventType === "REVOKED" || eventType === "ACCESS_DENIED" ? "danger" : "success";
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
          <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
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
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  const ordered = [...events].sort(
    (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
  );

  return (
    <div className="space-y-4">
      <ol className="flex flex-col">
        {ordered.map((event, index) => {
          const tone = dotTone(event.eventType);
          const last = index === ordered.length - 1;
          return (
            <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
              {last ? null : (
                <span className="absolute bottom-1 left-[9px] top-6 w-0.5 rounded-sm bg-border" aria-hidden />
              )}
              <span
                className={cn(
                  "relative z-[1] grid h-5 w-5 shrink-0 place-items-center rounded-full text-card",
                  tone === "danger" ? "bg-danger" : "bg-success"
                )}
                aria-hidden
              >
                {tone === "danger" ? <Ban className="h-3 w-3" /> : <Check className="h-3 w-3" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5">{activityEventLabel(event)}</p>
                <p className="num text-[12.5px] leading-[18px] text-muted-foreground">
                  {formatDisplayDateTime(event.occurredAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {hasMore ? (
        <Button type="button" variant="outline" size="sm" loading={isLoadingMore} onClick={onLoadMore}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}
