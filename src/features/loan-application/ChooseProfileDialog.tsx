"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { profileTypeLabel, showIdentifier } from "@/features/profiles/utils/display";
import { programService } from "@/services/program.service";
import {
  offeredSelections,
  parentProfileParams,
  profileOptionsQueryKey,
  profileSlotLabel,
  pruneSlotSelections,
  selectionsFromMap,
  type ProfileOption,
  type ProfileSelection,
  type ProfileSlotOption,
} from "@/features/loan-application/profile-options";

const NONE = "__none__";

interface ChooseProfileDialogProps {
  open: boolean;
  programId: string;
  applicationLabel: string;
  initialProfileId?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selections: ProfileSelection[]) => void;
}

export function ChooseProfileDialog(props: ChooseProfileDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <ChooseProfileDialogBody key={props.programId} {...props} /> : null}
    </Dialog>
  );
}

function sameRecord(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key]);
}

function optionLabel(profile: ProfileOption): string {
  const name = profile.displayName.trim() || "Untitled profile";
  const pan = profile.pan ? `PAN ${showIdentifier(profile.pan)}` : null;
  return [name, profileTypeLabel(profile.type), pan].filter(Boolean).join(" · ");
}

function slotHint(slot: ProfileSlotOption): string {
  const type = profileTypeLabel(slot.profileType).toLowerCase();
  const range =
    slot.max === 1
      ? `One ${type} profile`
      : slot.max == null
        ? `${profileTypeLabel(slot.profileType)} profiles`
        : `Up to ${slot.max} ${type} profiles`;
  return slot.min > 0 ? `${range}. Add them before you submit.` : `${range}. Optional.`;
}

function ChooseProfileDialogBody({
  programId,
  applicationLabel,
  initialProfileId,
  onConfirm,
}: ChooseProfileDialogProps) {
  const [rawSelected, setRawSelected] = useState<Record<string, string[]>>({});
  const [parents, setParents] = useState<Record<string, string>>({});
  const [appliedInitial, setAppliedInitial] = useState(false);
  const options = useQuery({
    queryKey: profileOptionsQueryKey(programId, parents),
    queryFn: () => programService.getProfileOptions(programId, parents),
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const slots = options.data?.slots ?? [];
  const settled = !!options.data && !options.isPlaceholderData;
  const selected = settled ? pruneSlotSelections(slots, rawSelected) : rawSelected;
  if (settled && !!initialProfileId && !appliedInitial) {
    setAppliedInitial(true);
    const slot = slots.find(
      (item) =>
        item.promptOnCreate && item.profiles.some((profile) => profile.id === initialProfileId)
    );
    if (slot && Object.values(rawSelected).every((ids) => ids.length === 0)) {
      setRawSelected({ [slot.slot]: [initialProfileId] });
    }
  }
  const nextParents = parentProfileParams(slots, selectionsFromMap(selected));
  if (!sameRecord(parents, nextParents)) setParents(nextParents);

  const promptSlots = slots.filter((slot) => slot.promptOnCreate);
  const confirming = options.isSuccess && !options.isFetching && !options.isPlaceholderData;
  const accepted = confirming && options.data
    ? offeredSelections(options.data, selectionsFromMap(selected))
    : [];

  const setSlot = (slot: ProfileSlotOption, ids: string[]) => {
    setRawSelected((current) => {
      const next = { ...current, [slot.slot]: ids };
      for (const other of slots) {
        if (other.linkedTo === slot.slot) next[other.slot] = [];
      }
      return next;
    });
  };

  return (
    <DialogContent className="w-[min(520px,calc(100vw-32px))] gap-6 p-6 sm:p-8">
      <DialogHeader>
        <DialogTitle className="font-semibold tracking-tight text-slate-900">
          {applicationLabel}
        </DialogTitle>
        <DialogDescription className="text-sm font-normal text-slate-500">
          Choose profiles for this application. You can leave a slot empty and add it before you submit.
        </DialogDescription>
      </DialogHeader>

      {options.isLoading ? (
        <p className="text-sm font-normal text-slate-500" role="status">
          Loading profiles…
        </p>
      ) : null}

      {options.isError ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            {parseApiError(options.error).message}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
            onClick={() => {
              void options.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {options.data ? (
        <div className="space-y-6">
          {promptSlots.map((slot) => {
            const parentId = slot.linkedTo ? selected[slot.linkedTo]?.[0] : undefined;
            const parentSelected = !slot.linkedTo || !!parentId;
            const settled =
              !slot.linkedTo ||
              (!!parentId &&
                parents[slot.linkedTo] === parentId &&
                !options.isFetching &&
                !options.isPlaceholderData);
            return (
              <SlotField
                key={slot.slot}
                slot={slot}
                profiles={slot.linkedTo && !settled ? [] : slot.profiles}
                selectedIds={selected[slot.slot] ?? []}
                parentSelected={parentSelected}
                settled={settled}
                onChange={(ids) => setSlot(slot, ids)}
              />
            );
          })}
          {options.isFetching && !options.isLoading ? (
            <p className="text-sm font-normal text-slate-500" role="status">
              Updating linked profiles…
            </p>
          ) : null}
        </div>
      ) : null}

      <DialogFooter className="flex-col items-stretch gap-3 sm:flex-col sm:items-stretch">
        <Button
          type="button"
          size="md"
          className="w-full transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
          disabled={!confirming || options.isError}
          onClick={() => onConfirm(accepted)}
        >
          Create application
        </Button>
        {accepted.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
            disabled={!confirming}
            onClick={() => onConfirm([])}
          >
            Create without profiles
          </Button>
        ) : null}
      </DialogFooter>
    </DialogContent>
  );
}

function SlotField({
  slot,
  profiles,
  selectedIds,
  parentSelected,
  settled,
  onChange,
}: {
  slot: ProfileSlotOption;
  profiles: ProfileOption[];
  selectedIds: string[];
  parentSelected: boolean;
  settled: boolean;
  onChange: (ids: string[]) => void;
}) {
  const label = profileSlotLabel(slot.slot);
  const single = slot.max === 1;
  const atMax = slot.max != null && selectedIds.length >= slot.max;

  return (
    <div className="space-y-2">
      <Label
        htmlFor={single ? `profile-slot-${slot.slot}` : undefined}
        className="text-sm font-medium text-slate-900"
      >
        {label}
      </Label>
      <p className="text-sm font-normal text-slate-500">{slotHint(slot)}</p>
      {slot.linkedTo && !parentSelected ? (
        <p className="text-sm font-normal text-slate-500" role="status">
          Select {profileSlotLabel(slot.linkedTo).toLowerCase()} to see linked profiles.
        </p>
      ) : null}
      {settled && profiles.length === 0 && parentSelected ? (
        <p className="text-sm font-normal text-slate-500" role="status">
          {slot.linkedTo ? "No linked profiles are available." : "No profiles are available."}
        </p>
      ) : null}
      {single && profiles.length > 0 ? (
        <Select
          value={selectedIds[0] ?? NONE}
          onValueChange={(value) => onChange(value === NONE ? [] : [value])}
        >
          <SelectTrigger
            id={`profile-slot-${slot.slot}`}
            className="h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <SelectValue placeholder="Select a profile" />
          </SelectTrigger>
          <SelectContent className="z-[80]">
            <SelectItem value={NONE}>Decide later</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {optionLabel(profile)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {!single && profiles.length > 0 ? (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {profiles.map((profile) => {
            const checked = selectedIds.includes(profile.id);
            return (
              <label
                key={profile.id}
                className="flex items-start gap-3 rounded-md border border-slate-100 p-3 transition-all duration-200 ease-out hover:bg-slate-50"
              >
                <Checkbox
                  checked={checked}
                  disabled={!checked && atMax}
                  onCheckedChange={(value) => {
                    if (value === true) {
                      if (atMax || selectedIds.includes(profile.id)) return;
                      onChange([...selectedIds, profile.id]);
                      return;
                    }
                    onChange(selectedIds.filter((id) => id !== profile.id));
                  }}
                  aria-label={optionLabel(profile)}
                />
                <span className="text-sm font-normal text-slate-900">{optionLabel(profile)}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
