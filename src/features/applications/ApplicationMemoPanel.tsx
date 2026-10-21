"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseApiError } from "@/lib/api-error";
import { formatDate } from "@/lib/utils";
import { applicationService } from "@/services/application.service";
import type { LoanApplication } from "@/types";

interface ApplicationMemoPanelProps {
  application: LoanApplication;
}

function memoSummary(application: LoanApplication): string {
  if (application.memoStatus === "FAILED") {
    return "The last memo generation failed. Generate it again.";
  }
  if (application.memoStatus === "PENDING") {
    return "The memo is being prepared.";
  }
  if (application.memoGeneratedAt) {
    return `Generated on ${formatDate(application.memoGeneratedAt)}`;
  }
  return "No memo has been generated yet.";
}

/** Popup blockers may reject `window.open` after an await, so fall back to a download. */
function openPdf(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (!opened) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function ApplicationMemoPanel({ application }: ApplicationMemoPanelProps) {
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState(false);
  const hasMemo = Boolean(application.memoFileId) || application.memoStatus === "GENERATED";

  const regenerate = useMutation({
    mutationFn: () => applicationService.regenerateMemo(application.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["application", application.id], updated);
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Memo generated");
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      if (parsed.status !== 401) toast.error(parsed.message);
    },
  });

  const view = async () => {
    setViewing(true);
    try {
      const file = await applicationService.downloadMemo(application.id);
      openPdf(file.blob, file.fileName);
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed.status === 404) {
        toast.error("No memo has been generated yet.");
      } else if (parsed.status !== 401) {
        toast.error(parsed.message);
      }
    } finally {
      setViewing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">Application memo</p>
          <p className="mt-1 text-sm font-normal text-muted-foreground">{memoSummary(application)}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!hasMemo || regenerate.isPending}
          loading={viewing}
          onClick={() => void view()}
        >
          <Eye className="h-4 w-4" />
          View memo
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-2"
          disabled={viewing}
          loading={regenerate.isPending}
          onClick={() => regenerate.mutate()}
        >
          <RefreshCw className="h-4 w-4" />
          {hasMemo ? "Regenerate memo" : "Generate memo"}
        </Button>
      </div>
    </div>
  );
}
