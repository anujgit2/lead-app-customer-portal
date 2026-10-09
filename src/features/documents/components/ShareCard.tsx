"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useShareActivity } from "../api/queries";
import type { ShareSummary } from "../types";
import { formatDisplayDate, formatShareCounts, formatVersionLabel } from "../utils/format";
import { ActivityTimeline } from "./ActivityTimeline";
import { StatusPill } from "./StatusPill";

interface ShareCardProps {
  documentId: string;
  share: ShareSummary;
  expanded: boolean;
  onToggle: () => void;
  onRevoke: (share: ShareSummary) => void;
}

export function ShareCard({ documentId, share, expanded, onToggle, onRevoke }: ShareCardProps) {
  const activity = useShareActivity(documentId, share.id, expanded);
  const events = activity.data?.pages.flatMap((page) => page.items) ?? [];
  const contacts = [share.email, share.phone].filter(Boolean).join(" · ");

  return (
    <article className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-start gap-4 p-5 text-left transition-all duration-200 ease-out hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/20 active:scale-[0.99]"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900">{share.recipientName}</h3>
            <StatusPill status={share.status} />
            {share.linkOnly ? (
              <span className="text-xs font-medium text-slate-500">Link only</span>
            ) : null}
          </div>
          {contacts ? <p className="text-sm font-normal text-slate-500">{contacts}</p> : null}
          <p className="text-sm font-normal text-slate-500">
            {share.version ? formatVersionLabel(share.version) : "Latest version"}
            {share.expiresAt ? ` · Expires ${formatDisplayDate(share.expiresAt)}` : ""}
          </p>
          <p className="text-sm font-normal text-slate-500">{formatShareCounts(share)}</p>
        </div>
        <ChevronDown
          className={cn("mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", expanded && "rotate-180")}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="space-y-5 border-t border-slate-100 px-5 py-5">
          <ActivityTimeline
            events={events}
            isLoading={activity.isLoading}
            isError={activity.isError}
            hasMore={activity.hasNextPage}
            isLoadingMore={activity.isFetchingNextPage}
            onLoadMore={() => {
              void activity.fetchNextPage();
            }}
            onRetry={() => {
              void activity.refetch();
            }}
          />
          {share.status === "ACTIVE" ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 text-destructive hover:text-destructive"
                onClick={() => onRevoke(share)}
              >
                Revoke access
              </Button>
              <p className="text-sm font-normal text-slate-500">This person will lose access immediately.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
