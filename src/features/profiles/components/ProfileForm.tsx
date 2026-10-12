"use client";

import { useMemo, useRef, useState } from "react";
import type { FormTemplate } from "@/types";
import { DynamicForm } from "@/components/forms/DynamicForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs } from "@/components/ui/tabs";
import { OverflowTabList } from "./OverflowTabList";
import { Textarea } from "@/components/ui/textarea";
import { mergeTemplateDefaults } from "@/utils/schema-builder";
import { mergeProfileFormValues, profileDataToFormValues } from "../utils/profile-data";

interface ProfileFormProps {
  templates: FormTemplate[];
  data?: Record<string, unknown>;
  /** When set, the parent renders the form tabs and this form follows that selection. */
  activeCode?: string;
  onActiveCodeChange?: (code: string) => void;
  submitLabel: string;
  pending?: boolean;
  /** Floating save bar used on the profile detail page. */
  saveBar?: boolean;
  onCancel?: () => void;
  onSubmit: (input: { data: Record<string, unknown>; changeNote?: string }) => void;
}

interface SubmitCollector {
  pending: Set<string>;
  collected: Record<string, Record<string, unknown>>;
  invalid: string | null;
}

export function ProfileForm({
  templates,
  data,
  activeCode,
  onActiveCodeChange,
  submitLabel,
  pending = false,
  saveBar = false,
  onCancel,
  onSubmit,
}: ProfileFormProps) {
  const [internalCode, setInternalCode] = useState(templates[0]?.code ?? "");
  const [changeNote, setChangeNote] = useState("");
  const [checking, setChecking] = useState(false);
  const formRefs = useRef<Record<string, HTMLFormElement | null>>({});
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        templates.map((template) => [
          template.code,
          mergeTemplateDefaults(template, profileDataToFormValues(template, data ?? {})),
        ])
      ),
    [templates, data]
  );
  const collector = useRef<SubmitCollector | null>(null);
  const controlled = activeCode !== undefined;
  const selected = activeCode ?? internalCode;
  const showTabs = !controlled && templates.length > 0;

  const selectTab = (code: string) => {
    onActiveCodeChange?.(code);
    if (!controlled) setInternalCode(code);
  };

  const finish = (current: SubmitCollector) => {
    if (current.pending.size > 0) return;
    collector.current = null;
    setChecking(false);
    if (current.invalid) {
      selectTab(current.invalid);
      return;
    }
    const note = changeNote.trim();
    onSubmit({
      data: mergeProfileFormValues(templates, current.collected),
      ...(note ? { changeNote: note } : {}),
    });
  };

  const settle = (code: string, values: Record<string, unknown> | null) => {
    const current = collector.current;
    if (!current?.pending.has(code)) return;
    current.pending.delete(code);
    if (values) current.collected[code] = values;
    else if (!current.invalid) current.invalid = code;
    finish(current);
  };

  const submitAll = () => {
    if (checking || pending || templates.length === 0) return;
    const current: SubmitCollector = {
      pending: new Set(templates.map((template) => template.code)),
      collected: {},
      invalid: null,
    };
    collector.current = current;
    setChecking(true);
    for (const template of templates) {
      const form = formRefs.current[template.code];
      if (!form) settle(template.code, null);
      else form.requestSubmit();
    }
  };

  if (templates.length === 0) return null;

  return (
    <div className="space-y-6">
      {showTabs ? (
        <Tabs value={selected} onValueChange={selectTab}>
          <OverflowTabList
            ariaLabel="Profile forms"
            activeValue={selected}
            tabs={templates.map((template) => ({ value: template.code, label: template.title }))}
          />
        </Tabs>
      ) : null}

      {templates.map((template) => (
        <div key={template.code} hidden={template.code !== selected}>
          <DynamicForm
            chrome={saveBar ? "profile" : "default"}
            template={template}
            defaultValues={defaults[template.code]}
            formRef={(node) => {
              formRefs.current[template.code] = node;
            }}
            onSubmit={(values) => settle(template.code, values)}
            onInvalid={() => settle(template.code, null)}
          />
        </div>
      ))}

      <Card className={saveBar ? "shadow-[var(--shadow-1)]" : "border-slate-100 shadow-sm"}>
        <CardContent className={saveBar ? "space-y-1.5 px-5 py-4" : "space-y-2 p-6"}>
          <Label htmlFor="profile-change-note">Change note</Label>
          <Textarea
            id="profile-change-note"
            value={changeNote}
            onChange={(event) => setChangeNote(event.target.value)}
            placeholder="Optional note about this save"
            disabled={pending || checking}
            rows={saveBar ? 2 : 3}
            className="focus:border-ring focus:outline-none focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.22)]"
          />
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            Optional. It is stored with this version.
          </p>
        </CardContent>
      </Card>

      {saveBar ? (
        <div
          role="region"
          aria-label="Unsaved changes"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-[14px] border border-border bg-card py-2.5 pl-4 pr-3 shadow-[var(--shadow-2)]"
        >
          <p className="min-w-0 flex-1 text-[13px] leading-[18px]">
            <b>Editing profile.</b>{" "}
            <span className="text-muted-foreground">Save to create a new version.</span>
          </p>
          {onCancel ? (
            <Button type="button" variant="ghost" size="sm" disabled={pending || checking} onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="button" size="sm" loading={pending || checking} onClick={submitAll}>
            {submitLabel}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
              disabled={pending || checking}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
            loading={pending || checking}
            onClick={submitAll}
          >
            {submitLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
