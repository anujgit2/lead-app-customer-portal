"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { profileService } from "@/services/profile.service";
import type { CustomerProfileDetail, FormSection } from "@/types";
import { useProfileVersions, useSaveProfileMemo } from "../api/queries";

interface ProfileMemoDialogProps {
  open: boolean;
  profile: CustomerProfileDetail;
  sections: FormSection[];
  onOpenChange: (open: boolean) => void;
}

export function ProfileMemoDialog(props: ProfileMemoDialogProps) {
  if (!props.open) return null;
  const sectionKey = props.sections.map((section) => section.code).join("\n");
  return <ProfileMemoForm key={`${props.profile.currentVersionNo}:${sectionKey}`} {...props} />;
}

function ProfileMemoForm({ profile, sections, onOpenChange }: ProfileMemoDialogProps) {
  const router = useRouter();
  const versions = useProfileVersions(profile.id);
  const saveMemo = useSaveProfileMemo(profile.id);
  const [versionNo, setVersionNo] = useState(String(profile.currentVersionNo));
  const [selected, setSelected] = useState<string[]>(() => sections.map((section) => section.code));
  const [downloading, setDownloading] = useState(false);

  const selection = {
    versionNo: Number(versionNo),
    ...(selected.length > 0 && selected.length < sections.length ? { sections: selected } : {}),
  };
  const canExport = sections.length === 0 || selected.length > 0;

  const download = async () => {
    setDownloading(true);
    try {
      const file = await profileService.downloadMemo(profile.id, selection);
      const url = URL.createObjectURL(file.blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.fileName;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      if (parseApiError(error).status !== 401) {
        toast.error(parseApiError(error).message);
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !downloading && !saveMemo.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tracking-tight text-slate-900">Credit memo</DialogTitle>
          <DialogDescription className="text-sm font-normal text-slate-500">
            Choose a version and the sections to include.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="memo-version">Version</Label>
            <Select value={versionNo} onValueChange={setVersionNo}>
              <SelectTrigger id="memo-version" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(profile.currentVersionNo)}>
                  Version {profile.currentVersionNo} (current)
                </SelectItem>
                {(versions.data ?? [])
                  .filter((item) => item.versionNo !== profile.currentVersionNo)
                  .map((item) => (
                    <SelectItem key={item.versionNo} value={String(item.versionNo)}>
                      Version {item.versionNo}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Sections</legend>
            {sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">This template has no sections.</p>
            ) : (
              sections.map((section) => {
                const checked = selected.includes(section.code);
                return (
                  <label key={section.code} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setSelected((current) =>
                          value === true
                            ? [...current, section.code]
                            : current.filter((code) => code !== section.code)
                        );
                      }}
                      aria-label={section.title}
                    />
                    {section.title}
                  </label>
                );
              })
            )}
          </fieldset>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={!canExport}
            loading={downloading}
            onClick={() => void download()}
          >
            Download
          </Button>
          <Button
            type="button"
            className="h-11"
            disabled={!canExport}
            loading={saveMemo.isPending}
            onClick={() => {
              saveMemo.mutate(selection, {
                onSuccess: (saved) => {
                  toast.success("Memo saved to documents");
                  onOpenChange(false);
                  router.push(`/documents/${saved.id}`);
                },
                onError: (error) => toast.error(parseApiError(error).message),
              });
            }}
          >
            Save to documents
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
