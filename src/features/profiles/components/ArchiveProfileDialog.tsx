"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ArchiveProfileDialogProps {
  open: boolean;
  name: string;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ArchiveProfileDialog({
  open,
  name,
  pending = false,
  onOpenChange,
  onConfirm,
}: ArchiveProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="tracking-tight text-slate-900">Archive profile</DialogTitle>
          <DialogDescription className="text-sm font-normal text-slate-500">
            {name ? `${name} will be marked archived.` : "This profile will be marked archived."} You
            can still open it from the archived filter.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
           size="sm">
            Cancel
          </Button>
          <Button type="button" variant="destructive" loading={pending} onClick={onConfirm} size="sm">
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
