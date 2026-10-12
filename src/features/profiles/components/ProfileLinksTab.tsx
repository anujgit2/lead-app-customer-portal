"use client";

import { useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseApiError } from "@/lib/api-error";
import type { CustomerProfileDetail, CustomerProfileLinkRole, CustomerProfileSummary } from "@/types";
import { useCreateProfileLink, useDeleteProfileLink } from "../api/queries";
import { profileRoleLabel, profileTypeLabel } from "../utils/display";
import { ProfileSearchPicker } from "./ProfileSearchPicker";

const ROLES: CustomerProfileLinkRole[] = [
  "PROMOTER",
  "DIRECTOR",
  "PARTNER",
  "GUARANTOR",
  "AUTHORISED_SIGNATORY",
];

interface ProfileLinksTabProps {
  profile: CustomerProfileDetail;
}

export function ProfileLinksTab({ profile }: ProfileLinksTabProps) {
  const createLink = useCreateProfileLink(profile.id);
  const deleteLink = useDeleteProfileLink(profile.id);
  const [child, setChild] = useState<CustomerProfileSummary | null>(null);
  const [role, setRole] = useState<CustomerProfileLinkRole>("PROMOTER");
  const [ownership, setOwnership] = useState("");

  const add = () => {
    if (!child) return;
    const ownershipPct = ownership.trim() === "" ? undefined : Number(ownership);
    if (ownershipPct !== undefined && !Number.isFinite(ownershipPct)) {
      toast.error("Ownership must be a number.");
      return;
    }
    createLink.mutate(
      {
        childProfileId: child.id,
        role,
        ...(ownershipPct !== undefined ? { ownershipPct } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Person linked");
          setChild(null);
          setOwnership("");
        },
        onError: (error) => toast.error(parseApiError(error).message),
      }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold leading-6 tracking-[-0.01em]">People</h2>
        <p className="text-[13px] leading-[18px] text-muted-foreground">Individuals linked to this business.</p>
      </div>
      <ul className="space-y-3">
        {profile.links.length === 0 ? (
          <li className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-1)]" role="status">
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="tone-brand mb-3 grid h-12 w-12 place-items-center rounded-lg">
                <Users className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-base font-semibold leading-6">No related people yet</h3>
              <p className="mt-1 max-w-[36ch] text-sm text-muted-foreground">
                Link a person when this business has promoters, directors, or signatories.
              </p>
            </div>
          </li>
        ) : (
          profile.links.map((link) => (
            <li
              key={link.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-1)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/profiles/${link.profile.id}`}
                  className="font-semibold tracking-tight text-slate-900 transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {link.profile.displayName || "Untitled profile"}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profileRoleLabel(link.role)}
                  {" · "}
                  {profileTypeLabel(link.profile.type)}
                  {link.ownershipPct !== null ? ` · ${link.ownershipPct}%` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                loading={deleteLink.isPending && deleteLink.variables === link.id}
                onClick={() => {
                  deleteLink.mutate(link.id, {
                    onSuccess: () => toast.success("Person removed"),
                    onError: (error) => toast.error(parseApiError(error).message),
                  });
                }}
               size="sm">
                Remove
              </Button>
            </li>
          ))
        )}
      </ul>

      <div className="space-y-4 rounded-xl border border-slate-100 bg-card p-6 shadow-sm">
        <h2 className="font-semibold tracking-tight text-slate-900">Add a person</h2>
        <ProfileSearchPicker
          excludeIds={[profile.id, ...profile.links.map((link) => link.profile.id)]}
          selectedId={child?.id}
          onSelect={setChild}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="link-role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as CustomerProfileLinkRole)}>
              <SelectTrigger id="link-role" className="h-11" aria-label="Role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {profileRoleLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-ownership">Ownership %</Label>
            <Input
              id="link-ownership"
              inputMode="decimal"
              value={ownership}
              onChange={(event) => setOwnership(event.target.value)}
              placeholder="Optional"
              className="h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
        <Button type="button" disabled={!child} loading={createLink.isPending} onClick={add} size="sm">
          Add person
        </Button>
      </div>
    </div>
  );
}
