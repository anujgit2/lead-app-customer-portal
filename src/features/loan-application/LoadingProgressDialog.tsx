"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LoadingProgressDialogProps {
  open: boolean;
  title: string;
  message: string;
}

export function LoadingProgressDialog({ open, title, message }: LoadingProgressDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="w-[min(420px,calc(100vw-32px))] gap-6 p-8 [&>button]:hidden"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-semibold tracking-tight text-slate-900">{title}</DialogTitle>
          <DialogDescription className="text-sm font-normal text-slate-500">{message}</DialogDescription>
        </DialogHeader>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-busy="true"
          aria-valuetext={message}
        >
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="flex items-center gap-2 text-sm font-normal text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Please wait
        </p>
      </DialogContent>
    </Dialog>
  );
}
