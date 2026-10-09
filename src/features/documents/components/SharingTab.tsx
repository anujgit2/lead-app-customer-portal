"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseApiError } from "@/lib/api-error";
import { useRevokeShare, useShares } from "../api/queries";
import type { ShareSummary } from "../types";
import { ConfirmRevokeDialog } from "./ConfirmRevokeDialog";
import { ShareCard } from "./ShareCard";

interface SharingTabProps {
  documentId: string;
  onShare: () => void;
}

export function SharingTab({ documentId, onShare }: SharingTabProps) {
  const shares = useShares(documentId);
  const revoke = useRevokeShare(documentId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<ShareSummary | null>(null);

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
      <div className="space-y-3" aria-busy="true">
        <p className="sr-only">Loading shares</p>
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (shares.isError) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-100 p-6">
        <p className="text-sm text-destructive" role="alert">
          Couldn&apos;t load sharing details.
        </p>
        <Button type="button" variant="outline" className="h-11" onClick={() => void shares.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const items = shares.data ?? [];

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-base font-semibold tracking-tight text-slate-900">Not shared yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm font-normal text-slate-500">
            Share this document with someone by email or phone. You can turn off access at any time.
          </p>
          <Button type="button" className="mt-6 h-11" onClick={onShare}>
            Share securely
          </Button>
        </div>
      ) : (
        items.map((share) => (
          <ShareCard
            key={share.id}
            documentId={documentId}
            share={share}
            expanded={expandedId === share.id}
            onToggle={() => setExpandedId((current) => (current === share.id ? null : share.id))}
            onRevoke={setPendingRevoke}
          />
        ))
      )}

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
    </div>
  );
}
