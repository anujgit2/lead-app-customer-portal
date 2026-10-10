"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { ProfileSearchPicker } from "@/features/profiles/components/ProfileSearchPicker";
import { parseApiError } from "@/lib/api-error";
import type { CustomerProfileSummary, DocumentProfileRelation, LinkedDocumentProfile } from "@/types";
import { useLinkDocumentProfile } from "../api/queries";

interface DocumentProfileLinksProps {
  documentId: string;
  linked: LinkedDocumentProfile[];
  linkOpen?: boolean;
  onLinkOpenChange?: (open: boolean) => void;
}

export function DocumentProfileLinks({
  documentId,
  linked,
  linkOpen,
  onLinkOpenChange,
}: DocumentProfileLinksProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = linkOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    onLinkOpenChange?.(next);
    if (linkOpen === undefined) setUncontrolledOpen(next);
  };

  if (!open) return null;

  return (
    <LinkProfileDialog
      documentId={documentId}
      excludeIds={linked.map((item) => item.profileId)}
      onOpenChange={setOpen}
    />
  );
}

function LinkProfileDialog({
  documentId,
  excludeIds,
  onOpenChange,
}: {
  documentId: string;
  excludeIds: string[];
  onOpenChange: (open: boolean) => void;
}) {
  const link = useLinkDocumentProfile();
  const [profile, setProfile] = useState<CustomerProfileSummary | null>(null);
  const [relation, setRelation] = useState<DocumentProfileRelation>("RELATED_TO");

  return (
    <Dialog open onOpenChange={(next) => !link.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tracking-tight text-slate-900">Link a profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-profile-relation">Relation</Label>
            <Select value={relation} onValueChange={(value) => setRelation(value as DocumentProfileRelation)}>
              <SelectTrigger id="document-profile-relation" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RELATED_TO">Related to</SelectItem>
                <SelectItem value="FOR">For</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ProfileSearchPicker excludeIds={excludeIds} selectedId={profile?.id} onSelect={setProfile} />
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11"
            disabled={!profile}
            loading={link.isPending}
            onClick={() => {
              if (!profile) return;
              link.mutate(
                { documentId, profileId: profile.id, relation },
                {
                  onSuccess: () => {
                    toast.success("Profile linked");
                    onOpenChange(false);
                  },
                  onError: (error) => toast.error(parseApiError(error).message),
                }
              );
            }}
          >
            Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
