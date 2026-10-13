"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseApiError } from "@/lib/api-error";
import { useProfiles } from "@/features/profiles/api/queries";
import { profileTypeLabel, showIdentifier } from "@/features/profiles/utils/display";
import type { CustomerProfileSummary } from "@/types";

interface ChooseProfileDialogProps {
  open: boolean;
  applicationLabel: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (profile: CustomerProfileSummary) => void;
  onContinueWithoutProfile: () => void;
}

export function ChooseProfileDialog(props: ChooseProfileDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <ChooseProfileDialogBody {...props} /> : null}
    </Dialog>
  );
}

function profileOptionLabel(profile: CustomerProfileSummary): string {
  const name = profile.displayName || "Untitled profile";
  const pan = showIdentifier(profile.identifiers.pan);
  return `${name} · ${profileTypeLabel(profile.type)} · PAN ${pan}`;
}

function ChooseProfileDialogBody({
  applicationLabel,
  onSelect,
  onContinueWithoutProfile,
}: ChooseProfileDialogProps) {
  const [selectedId, setSelectedId] = useState("");
  const filters = useMemo(() => ({ page: 0, size: 100, status: "ACTIVE" as const }), []);
  const profiles = useProfiles(filters);
  const rows = profiles.data?.content ?? [];
  const selected = rows.find((profile) => profile.id === selectedId);

  return (
    <DialogContent className="w-[min(480px,calc(100vw-32px))] gap-6 p-6 sm:p-8">
      <DialogHeader>
        <DialogTitle className="font-semibold tracking-tight text-slate-900">
          {applicationLabel}
        </DialogTitle>
        <DialogDescription className="text-sm font-normal text-slate-500">
          Select a customer profile, or create the application without one.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="application-profile" className="text-sm font-medium text-slate-900">
          Profile
        </Label>
        <Select value={selectedId || undefined} onValueChange={setSelectedId} disabled={profiles.isLoading}>
          <SelectTrigger
            id="application-profile"
            className="h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <SelectValue
              placeholder={profiles.isLoading ? "Loading profiles…" : "Select a profile"}
            />
          </SelectTrigger>
          <SelectContent className="z-[80]">
            {rows.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profileOptionLabel(profile)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {profiles.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {parseApiError(profiles.error).message}
          </p>
        ) : null}
        {!profiles.isLoading && !profiles.isError && rows.length === 0 ? (
          <p className="text-sm font-normal text-slate-500" role="status">
            No profiles are available.
          </p>
        ) : null}
      </div>
      <DialogFooter className="flex-col items-stretch gap-3 sm:flex-col sm:items-stretch">
        <Button
          type="button"
          size="md"
          className="w-full transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
          disabled={!selected}
          onClick={() => {
            if (selected) onSelect(selected);
          }}
        >
          Create Application With Profile
        </Button>
        <Button
          type="button"
          variant="outline"
          size="md"
          className="w-full transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
          onClick={onContinueWithoutProfile}
        >
          Create Application without profile
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
