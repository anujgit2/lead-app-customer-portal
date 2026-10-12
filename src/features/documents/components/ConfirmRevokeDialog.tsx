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
import { DOCUMENT_DIALOG_CLASS } from "../utils/constants";

interface ConfirmRevokeDialogProps {
  open: boolean;
  recipientName: string;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ConfirmRevokeDialog({
  open,
  recipientName,
  pending,
  onOpenChange,
  onConfirm,
}: ConfirmRevokeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className={DOCUMENT_DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle className="tracking-tight text-foreground">Revoke access</DialogTitle>
          <DialogDescription className="text-sm font-normal text-muted-foreground">
            {recipientName} will lose access immediately.
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
            Revoke access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
