"use client";

import { ChevronDown, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useShareActivity } from "../api/queries";
import type { ShareSummary } from "../types";
import { formatDisplayDate } from "../utils/format";
import { ActivityTimeline } from "./ActivityTimeline";
import { StatusPill } from "./StatusPill";

interface ShareCardProps {
  documentId: string;
  share: ShareSummary;
  expanded: boolean;
  onToggle: () => void;
  onRevoke: (share: ShareSummary) => void;
  onShareAgain: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function shareSubtitle(share: ShareSummary): string {
  const contact = share.email || share.phone || (share.linkOnly ? "Link only" : "");
  const version = share.version ? `v${share.version} only` : "Latest version";
  let expiry = "";
  if (share.status === "REVOKED") expiry = "Access removed";
  else if (share.status === "EXPIRED") {
    expiry = share.expiresAt ? `Expired ${formatDisplayDate(share.expiresAt)}` : "Expired";
  } else if (share.expiresAt) {
    expiry = `Expires ${formatDisplayDate(share.expiresAt)}`;
  }
  return [contact, version, expiry].filter(Boolean).join(" · ");
}

function countWord(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function Stat({ count, singular, plural }: { count: number; singular: string; plural: string }) {
  return (
    <span>
      <b className="num font-semibold text-foreground">{count}</b> {countWord(count, singular, plural)}
    </span>
  );
}

export function ShareCard({ documentId, share, expanded, onToggle, onRevoke, onShareAgain }: ShareCardProps) {
  const activity = useShareActivity(documentId, share.id, expanded);
  const events = activity.data?.pages.flatMap((page) => page.items) ?? [];
  const inactive = share.status !== "ACTIVE";
  const panelId = `share-${share.id}`;

  const copyLink = async () => {
    if (!share.url) return;
    try {
      await navigator.clipboard.writeText(share.url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left hover:bg-muted/50 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-3.5 sm:px-4 sm:py-3.5"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-foreground",
            inactive && "opacity-65 grayscale"
          )}
          aria-hidden
        >
          {initials(share.recipientName)}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <b className="font-semibold">{share.recipientName}</b>
            <StatusPill status={share.status} />
          </span>
          <span className="mt-0.5 block break-words text-[13px] leading-[18px] text-muted-foreground">
            {shareSubtitle(share)}
          </span>
        </span>
        <span className="hidden gap-4 whitespace-nowrap text-[13px] text-muted-foreground sm:flex">
          <Stat count={share.viewCount} singular="view" plural="views" />
          <Stat count={share.downloadCount} singular="download" plural="downloads" />
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150", expanded && "rotate-180")}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div id={panelId} className="flex flex-col gap-4 border-t border-border p-4">
          <div className="flex gap-4 text-[13px] text-muted-foreground sm:hidden">
            <Stat count={share.viewCount} singular="view" plural="views" />
            <Stat count={share.downloadCount} singular="download" plural="downloads" />
          </div>
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
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-border pt-3.5">
            {share.status === "ACTIVE" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-danger/50 text-danger-strong hover:bg-danger-soft"
                onClick={() => onRevoke(share)}
              >
                Revoke access
              </Button>
            ) : null}
            {share.status === "EXPIRED" ? (
              <Button type="button" variant="outline" size="sm" onClick={onShareAgain}>
                <RefreshCw />
                Share again
              </Button>
            ) : null}
            {share.status === "ACTIVE" && share.url ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => void copyLink()}>
                <Copy />
                Copy link
              </Button>
            ) : null}
            <p className="text-[13px] leading-[18px] text-muted-foreground">
              {share.status === "ACTIVE"
                ? "This person will lose access immediately."
                : share.status === "EXPIRED"
                  ? "The link is no longer valid."
                  : "Access was revoked. The link no longer works."}
            </p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
