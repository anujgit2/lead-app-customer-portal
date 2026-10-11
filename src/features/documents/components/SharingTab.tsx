"use client";

import { useState } from "react";
import { Lock, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/lib/api-error";
import { useRevokeShare, useShares } from "../api/queries";
import type { ShareStatus, ShareSummary } from "../types";
import { ConfirmRevokeDialog } from "./ConfirmRevokeDialog";
import { ShareCard } from "./ShareCard";

interface SharingTabProps {
  documentId: string;
  onShare: () => void;
}

type ShareFilter = "all" | ShareStatus;

const FILTERS: { id: ShareFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "EXPIRED", label: "Expired" },
  { id: "REVOKED", label: "Revoked" },
];

function byNewest(left: ShareSummary, right: ShareSummary): number {
  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();
  return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
}

export function SharingTab({ documentId, onShare }: SharingTabProps) {
  const shares = useShares(documentId);
  const revoke = useRevokeShare(documentId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<ShareSummary | null>(null);
  const [filter, setFilter] = useState<ShareFilter>("all");

  const confirmRevoke = async () => {
    if (!pendingRevoke) return;
    try {
      await revoke.mutateAsync(pendingRevoke.id);
      toast.success("Access revoked");
      setPendingRevoke(null);
    } catch (error) {
      if (parseApiError(error).status !== 401) {
        toast.error("Couldn't revoke access. Please try again.");
      }
    }
  };

  if (shares.isLoading) {
    return (
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm" aria-busy="true" aria-labelledby="sh-h">
        <p className="sr-only">Loading shares</p>
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-full max-w-sm animate-pulse rounded bg-muted" />
          </div>
        </div>
      </section>
    );
  }

  if (shares.isError) {
    return (
      <section className="flex items-start gap-3.5 rounded-lg border border-border bg-card p-5 shadow-sm" aria-labelledby="sh-h">
        <span className="tone-brand grid h-10 w-10 shrink-0 place-items-center rounded-md">
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
          <div>
            <h2 id="sh-h" className="text-base font-semibold leading-6 tracking-tight">
              Sharing
            </h2>
            <p className="mt-0.5 text-[13px] leading-[18px] text-destructive" role="alert">
              Couldn&apos;t load sharing details.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void shares.refetch()}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  const items = shares.data ?? [];
  const activeCount = items.filter((share) => share.status === "ACTIVE").length;
  const summary =
    items.length === 0
      ? "Not shared with anyone. Create a secure link for a lender or advisor and revoke it any time."
      : `Shared with ${items.length} ${items.length === 1 ? "person" : "people"} · ${activeCount} active. Create a secure link for a lender or advisor and revoke it any time.`;
  const visible = items
    .filter((share) => filter === "all" || share.status === filter)
    .sort(byNewest);
  const emptyFilter =
    filter === "all" ? "No shares yet." : `No ${filter.toLowerCase()} shares.`;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" aria-labelledby="sh-h">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="tone-brand grid h-10 w-10 shrink-0 place-items-center rounded-md">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="sh-h" className="text-base font-semibold leading-6 tracking-tight">
              Sharing
            </h2>
            <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">{summary}</p>
          </div>
        </div>
        <Button type="button" size="sm" className="shrink-0" onClick={onShare}>
          <Share2 />
          Share securely
        </Button>
      </div>

      {items.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/50 px-5 py-3">
            <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-md bg-muted p-[3px]" role="group" aria-label="Filter by status">
              {FILTERS.map((item) => {
                const count =
                  item.id === "all" ? items.length : items.filter((share) => share.status === item.id).length;
                const pressed = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={pressed}
                    className={cn(
                      "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm px-3 text-[13px] font-medium text-muted-foreground transition-colors duration-150",
                      pressed && "bg-card text-foreground shadow-sm"
                    )}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                    <span className="num opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[13px] leading-[18px] text-muted-foreground">Newest first</p>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:px-5 sm:py-5">
            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptyFilter}</p>
            ) : (
              visible.map((share) => (
                <ShareCard
                  key={share.id}
                  documentId={documentId}
                  share={share}
                  expanded={expandedId === share.id}
                  onToggle={() => setExpandedId((current) => (current === share.id ? null : share.id))}
                  onRevoke={setPendingRevoke}
                  onShareAgain={onShare}
                />
              ))
            )}
          </div>
        </>
      ) : null}

      <ConfirmRevokeDialog
        open={!!pendingRevoke}
        recipientName={pendingRevoke?.recipientName ?? "This person"}
        pending={revoke.isPending}
        onOpenChange={(open) => {
          if (!open) setPendingRevoke(null);
        }}
        onConfirm={() => {
          void confirmRevoke();
        }}
      />
    </section>
  );
}
