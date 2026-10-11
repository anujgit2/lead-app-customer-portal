"use client";

import { useMemo, useState } from "react";
import type { FormField, FormSection, FormTemplate } from "@/types";
import { DynamicForm } from "@/components/forms/DynamicForm";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { OverflowTabList } from "./OverflowTabList";
import { mergeTemplateDefaults } from "@/utils/schema-builder";
import { profileDataToFormValues } from "../utils/profile-data";

function lockField(field: FormField): FormField {
  return { ...field, readonly: true, disabled: true };
}

function lockSection(section: FormSection): FormSection {
  return { ...section, fields: section.fields.map(lockField) };
}

function lockTemplate(template: FormTemplate): FormTemplate {
  return { ...template, sections: template.sections.map(lockSection) };
}

interface ProfileOverviewProps {
  template?: FormTemplate;
  templates?: FormTemplate[];
  data: Record<string, unknown>;
}

function LockedProfileForm({ template, data }: { template: FormTemplate; data: Record<string, unknown> }) {
  const locked = useMemo(() => lockTemplate(template), [template]);
  const defaults = useMemo(
    () => mergeTemplateDefaults(template, profileDataToFormValues(template, data)),
    [template, data]
  );

  return (
    <div aria-readonly="true">
      <DynamicForm chrome="profile" template={locked} defaultValues={defaults} onSubmit={() => undefined} />
    </div>
  );
}

export function ProfileOverview({ template, templates, data }: ProfileOverviewProps) {
  const list = templates ?? (template ? [template] : []);
  const [active, setActive] = useState(list[0]?.code ?? "");
  if (list.length === 0) return null;
  if (list.length === 1) return <LockedProfileForm template={list[0]} data={data} />;
  const selected = list.some((item) => item.code === active) ? active : list[0].code;

  return (
    <Tabs value={selected} onValueChange={setActive}>
      <OverflowTabList
        ariaLabel="Profile forms"
        activeValue={selected}
        tabs={list.map((item) => ({ value: item.code, label: item.title }))}
      />
      {list.map((item) => (
        <TabsContent key={item.code} value={item.code} className="mt-6">
          <LockedProfileForm template={item} data={data} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
