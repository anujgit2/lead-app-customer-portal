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

interface VersionConflictDialogProps {
  open: boolean;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onReload: () => void;
}

export function VersionConflictDialog({
  open,
  pending = false,
  onOpenChange,
  onReload,
}: VersionConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="tracking-tight text-slate-900">A newer version exists</DialogTitle>
          <DialogDescription className="text-sm font-normal text-slate-500">
            Someone saved this profile before you. Your changes were not saved. Reload to see the
            latest version, then edit again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8"
            disabled={pending}
            onClick={() => onOpenChange(false)}
           size="sm">
            Close
          </Button>
          <Button type="button" className="h-8" loading={pending} onClick={onReload} size="sm">
            Reload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
