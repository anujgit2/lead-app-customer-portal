"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ApplicationProperty } from "@/types";
import { leadService, type RequestedDocument } from "@/services/lead.service";
import { parseApiError } from "@/lib/api-error";

/** The same types the portal accepts for uploads elsewhere. */
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.docx";

const STATUS_TEXT: Record<RequestedDocument["status"], string> = {
  REQUESTED: "Please upload",
  UPLOADED: "Uploaded. Your partner is checking it.",
  ACCEPTED: "Accepted",
};

/**
 * Documents the partner asked for after you submitted. Upload each one here. If the partner refuses a file, the
 * reason is shown and you can upload again.
 */
export function RequestedDocumentsChecklist({
  leadId,
  rows,
  properties,
  onChanged,
}: {
  leadId: string;
  rows: RequestedDocument[];
  properties: ApplicationProperty[];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const open = rows.filter((row) => row.status !== "ACCEPTED");
  if (open.length === 0) return null;

  async function upload(row: RequestedDocument, file: File) {
    setBusyId(row.id);
    try {
      await leadService.attachRequestedDocument(leadId, row.documentCode, file, properties);
      toast.success("Uploaded. Thank you.");
      onChanged();
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-label="Documents your partner asked for" className="mx-auto mt-4 max-w-3xl rounded border p-4">
      <h2 className="text-base font-semibold">Documents your partner asked for</h2>
      <ul className="mt-3 grid gap-3">
        {rows.map((row) => (
          <li key={row.id} className="grid gap-1 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{row.label}</span>
              <span className="text-muted-foreground">{STATUS_TEXT[row.status]}</span>
            </div>
            {row.status === "REQUESTED" && row.rejectReason && (
              <p role="alert" className="text-amber-800">
                Not accepted: {row.rejectReason}
              </p>
            )}
            {row.status === "REQUESTED" && (
              <input
                type="file"
                accept={ACCEPT}
                aria-label={`Upload ${row.label}`}
                disabled={busyId === row.id}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void upload(row, file);
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
