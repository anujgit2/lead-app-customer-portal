"use client";

import { useMemo, useRef, useState } from "react";
import type { FormTemplate } from "@/types";
import { DynamicForm } from "@/components/forms/DynamicForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mergeTemplateDefaults } from "@/utils/schema-builder";
import { formValuesToProfileData, profileDataToFormValues } from "../utils/profile-data";

interface ProfileFormProps {
  template: FormTemplate;
  data?: Record<string, unknown>;
  submitLabel: string;
  pending?: boolean;
  onCancel?: () => void;
  onSubmit: (input: { data: Record<string, unknown>; changeNote?: string }) => void;
}

export function ProfileForm({
  template,
  data,
  submitLabel,
  pending = false,
  onCancel,
  onSubmit,
}: ProfileFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [changeNote, setChangeNote] = useState("");
  const defaults = useMemo(
    () => mergeTemplateDefaults(template, profileDataToFormValues(template, data ?? {})),
    [template, data]
  );

  return (
    <div className="space-y-6">
      <DynamicForm
        template={template}
        defaultValues={defaults}
        formRef={formRef}
        onSubmit={(values) => {
          const note = changeNote.trim();
          onSubmit({
            data: formValuesToProfileData(template, values),
            ...(note ? { changeNote: note } : {}),
          });
        }}
      />

      <Card className="border-slate-100 shadow-sm">
        <CardContent className="space-y-2 p-6">
          <Label htmlFor="profile-change-note">Change note</Label>
          <Textarea
            id="profile-change-note"
            value={changeNote}
            onChange={(event) => setChangeNote(event.target.value)}
            placeholder="Optional note about this save"
            disabled={pending}
            rows={3}
            className="focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <p className="text-sm font-normal text-muted-foreground">
            Optional. It is stored with this version.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 hover:-translate-y-0.5"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          className="h-11 hover:-translate-y-0.5"
          loading={pending}
          onClick={() => formRef.current?.requestSubmit()}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
