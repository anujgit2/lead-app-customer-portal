import type { CustomerProfileType } from "@/types";

export interface ProfileOption {
  id: string;
  displayName: string;
  type: CustomerProfileType;
  pan: string | null;
}

export interface ProfileSlotOption {
  slot: string;
  profileType: CustomerProfileType;
  min: number;
  max: number | null;
  promptOnCreate: boolean;
  linkedTo: string | null;
  profiles: ProfileOption[];
}

export interface ProfileOptions {
  promptOnCreate: boolean;
  slots: ProfileSlotOption[];
}

export interface ProfileSelection {
  slot: string;
  profileId: string;
}

const SLOT_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,40}$/;
const PROFILE_ID = /^[A-Za-z0-9-]{1,80}$/;

function invalid(detail: string): never {
  throw { message: `Profile options are invalid: ${detail}.`, status: 502 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isProfileType(value: unknown): value is CustomerProfileType {
  return value === "INDIVIDUAL" || value === "BUSINESS";
}

function readCount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) invalid(label);
  return value;
}

function readProfile(value: unknown, profileType: CustomerProfileType): ProfileOption {
  if (!isRecord(value)) invalid("a profile");
  if (typeof value.id !== "string" || !PROFILE_ID.test(value.id)) invalid("profile id");
  if (typeof value.displayName !== "string") invalid("displayName");
  if (!isProfileType(value.type) || value.type !== profileType) invalid("profile type");
  if (value.pan !== null && typeof value.pan !== "string") invalid("pan");
  return {
    id: value.id,
    displayName: value.displayName,
    type: value.type,
    pan: value.pan,
  };
}

function readSlot(value: unknown): ProfileSlotOption {
  if (!isRecord(value)) invalid("a slot");
  if (typeof value.slot !== "string" || !SLOT_NAME.test(value.slot)) invalid("slot");
  if (!isProfileType(value.profileType)) invalid("profileType");
  const min = readCount(value.min, "min");
  const max = value.max == null ? null : readCount(value.max, "max");
  if (max != null && max < min) invalid("max");
  if (typeof value.promptOnCreate !== "boolean") invalid("promptOnCreate");
  const linkedTo =
    value.linkedTo == null
      ? null
      : typeof value.linkedTo === "string" && SLOT_NAME.test(value.linkedTo)
        ? value.linkedTo
        : invalid("linkedTo");
  if (linkedTo === value.slot) invalid("linkedTo");
  if (!Array.isArray(value.profiles)) invalid("profiles");
  const profiles: ProfileOption[] = [];
  const seen = new Set<string>();
  for (const profile of value.profiles) {
    const option = readProfile(profile, value.profileType);
    if (seen.has(option.id)) continue;
    seen.add(option.id);
    profiles.push(option);
  }
  return {
    slot: value.slot,
    profileType: value.profileType,
    min,
    max,
    promptOnCreate: value.promptOnCreate,
    linkedTo,
    profiles,
  };
}

/** Accepts the profile-options payload. A false prompt drops every slot. */
export function parseProfileOptions(value: unknown): ProfileOptions {
  if (!isRecord(value)) invalid("response");
  if (typeof value.promptOnCreate !== "boolean") invalid("promptOnCreate");
  if (!value.promptOnCreate) return { promptOnCreate: false, slots: [] };
  if (!Array.isArray(value.slots)) invalid("slots");
  const slots: ProfileSlotOption[] = [];
  const seen = new Set<string>();
  for (const slot of value.slots) {
    const parsed = readSlot(slot);
    if (seen.has(parsed.slot)) invalid("slot");
    seen.add(parsed.slot);
    slots.push(parsed);
  }
  for (const slot of slots) {
    if (slot.linkedTo && !seen.has(slot.linkedTo)) invalid("linkedTo");
  }
  return { promptOnCreate: true, slots };
}

export function profileOptionsQueryKey(programId: string, parents: Record<string, string>) {
  const parentKey = Object.entries(parents)
    .filter(([, profileId]) => profileId.length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([slot, profileId]) => `${slot}=${profileId}`)
    .join("&");
  return ["profile-options", programId, parentKey] as const;
}

export function profileSlotLabel(slot: string): string {
  const label = slot
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
  return label || "Profile";
}

/** Parent ids to send as `{slot}ProfileId`, and only when that id was offered. */
export function parentProfileParams(
  slots: ProfileSlotOption[],
  selections: ProfileSelection[]
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const slot of slots) {
    if (!slot.linkedTo || params[slot.linkedTo]) continue;
    const parent = slots.find((item) => item.slot === slot.linkedTo);
    if (!parent) continue;
    const chosen = selections.filter((item) => item.slot === parent.slot);
    if (chosen.length !== 1) continue;
    if (!parent.profiles.some((profile) => profile.id === chosen[0].profileId)) continue;
    params[parent.slot] = chosen[0].profileId;
  }
  return params;
}

export function selectionsFromMap(selected: Record<string, string[]>): ProfileSelection[] {
  const items: ProfileSelection[] = [];
  for (const [slot, ids] of Object.entries(selected)) {
    for (const profileId of ids) items.push({ slot, profileId });
  }
  return items;
}

/** Drops ids the latest response did not offer, and trims each slot to its max. */
export function pruneSlotSelections(
  slots: ProfileSlotOption[],
  selected: Record<string, string[]>
): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  let changed = false;
  const known = new Set(slots.map((slot) => slot.slot));
  for (const name of Object.keys(selected)) {
    if (!known.has(name)) changed = true;
  }
  for (const slot of slots) {
    const current = selected[slot.slot] ?? [];
    if (!slot.promptOnCreate) {
      if (current.length > 0) changed = true;
      continue;
    }
    const allowed = new Set(slot.profiles.map((profile) => profile.id));
    const kept: string[] = [];
    for (const id of current) {
      if (!allowed.has(id) || kept.includes(id) || (slot.max != null && kept.length >= slot.max)) {
        changed = true;
        continue;
      }
      kept.push(id);
    }
    if (kept.length !== current.length) changed = true;
    if (kept.length > 0) next[slot.slot] = kept;
  }
  return changed ? next : selected;
}

/**
 * Keeps selections that appear on the matching slot, in an order the API can attach.
 * A linked slot is omitted until its parent slot has an accepted profile.
 */
export function offeredSelections(
  options: ProfileOptions,
  selections: ProfileSelection[]
): ProfileSelection[] {
  if (!options.promptOnCreate) return [];
  const slots = new Map(options.slots.map((slot) => [slot.slot, slot]));
  const counts = new Map<string, number>();
  const used = new Set<string>();
  const accepted: ProfileSelection[] = [];
  for (const item of selections) {
    const slot = slots.get(item.slot);
    if (!slot?.promptOnCreate) continue;
    if (!slot.profiles.some((profile) => profile.id === item.profileId)) continue;
    if (used.has(item.profileId)) continue;
    const count = counts.get(item.slot) ?? 0;
    if (slot.max != null && count >= slot.max) continue;
    counts.set(item.slot, count + 1);
    used.add(item.profileId);
    accepted.push(item);
  }
  return orderAttachments(options.slots, accepted);
}

function orderAttachments(
  slots: ProfileSlotOption[],
  selections: ProfileSelection[]
): ProfileSelection[] {
  const meta = new Map(slots.map((slot) => [slot.slot, slot]));
  const remaining = [...selections];
  const ready = new Set<string>();
  const ordered: ProfileSelection[] = [];
  let moved = true;
  while (remaining.length > 0 && moved) {
    moved = false;
    for (let index = 0; index < remaining.length; ) {
      const item = remaining[index];
      const linkedTo = meta.get(item.slot)?.linkedTo;
      if (linkedTo && !ready.has(linkedTo)) {
        index += 1;
        continue;
      }
      ordered.push(item);
      ready.add(item.slot);
      remaining.splice(index, 1);
      moved = true;
    }
  }
  return ordered;
}

export function encodeProfileSelections(selections: ProfileSelection[]): string {
  return selections.map((item) => `${item.slot}:${item.profileId}`).join(",");
}

export function decodeProfileSelections(value: string): ProfileSelection[] | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const items: ProfileSelection[] = [];
  for (const part of trimmed.split(",")) {
    const index = part.indexOf(":");
    if (index <= 0) return null;
    const slot = part.slice(0, index);
    const profileId = part.slice(index + 1);
    if (!SLOT_NAME.test(slot) || !PROFILE_ID.test(profileId)) return null;
    items.push({ slot, profileId });
  }
  return items;
}
